-- Server-authoritative geofence enforcement for employee check-ins.
--
-- Before this migration the mobile app validated the geofence client-side and
-- then did a plain INSERT into attendance_records; the self-insert RLS policy
-- only checked user_uid + company_id. A crafted client could record attendance
-- from anywhere.
--
-- This migration:
--   1. Restricts the employee self-insert policy to NON-manual rows. Manager /
--      super_admin manual entry keeps working through the separate
--      "Managers and admins create manual attendance own company" policy
--      (20260514210002), and the admin web path uses the service role.
--   2. Adds a BEFORE INSERT trigger that, for a NON-manual `checkin`, mirrors the
--      mobile `getOfficeLocation()` contract exactly:
--        - only `in_office` employees are geofenced (semi_remote / fully_remote
--          and any other value check in from anywhere — unchanged);
--        - the applicable geofence is the department site named 'Office'
--          (case-insensitive), else the most recent department site, else the
--          company_offices row — the SAME resolution order as
--          get_department_geofence() then get_office_location();
--        - if no geofence is configured the check-in is allowed (matches the
--          app's "no office geofence configured — check-in allowed" behaviour);
--        - otherwise the submitted coordinates must be present, in range, not
--          (0,0), and within COALESCE(radius, 1000) metres (Haversine,
--          R = 6371000, inclusive) — identical to mobile
--          features/geofencing/utils/distance.js.
--
-- Mobile is unchanged. Check-outs and manual records are never geofenced here.

-- ---------------------------------------------------------------------------
-- 1. Employees may only self-insert non-manual rows.
-- ---------------------------------------------------------------------------
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create own attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Users create own company attendance" ON public.attendance_records;
CREATE POLICY "Users create own company attendance"
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK (
  user_uid = auth.uid()
  AND company_id = public.rls_caller_company_id()
  AND COALESCE(is_manual, false) = false
);

-- ---------------------------------------------------------------------------
-- 2. Geofence guard trigger — mirrors mobile getOfficeLocation() for in_office.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attendance_geofence_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user       public.users%ROWTYPE;
  v_dept_id    uuid;
  v_lat        double precision;
  v_lng        double precision;
  v_geo_lat    double precision;
  v_geo_lng    double precision;
  v_radius     double precision;
  v_found      boolean := false;
  v_dist       double precision;
BEGIN
  -- Only guard real (non-manual) employee check-ins.
  IF lower(COALESCE(NEW.type, '')) <> 'checkin' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.is_manual, false) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE uid = NEW.user_uid::text
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW; -- cannot resolve employee — do not block
  END IF;

  -- Only in_office employees are geofenced (semi_remote / fully_remote / other
  -- may check in from anywhere — matches validateCheckInLocation()).
  IF COALESCE(v_user.work_mode, 'in_office') <> 'in_office' THEN
    RETURN NEW;
  END IF;

  -- Resolve the employee's department UUID (id, then normalized name).
  v_dept_id := v_user.department_id;
  IF v_dept_id IS NULL AND COALESCE(trim(v_user.department), '') <> '' THEN
    SELECT d.id INTO v_dept_id
    FROM public.departments d
    WHERE d.company_id = v_user.company_id
      AND (
        lower(d.normalized_name) = lower(trim(v_user.department))
        OR lower(d.name) = lower(trim(v_user.department))
      )
    LIMIT 1;
  END IF;

  -- Applicable geofence: department 'Office' site, else newest department site
  -- (same order as get_department_geofence).
  IF v_dept_id IS NOT NULL THEN
    SELECT s.latitude, s.longitude, s.radius
    INTO v_geo_lat, v_geo_lng, v_radius
    FROM public.sites s
    WHERE s.company_id = v_user.company_id
      AND s.department_id = v_dept_id
    ORDER BY (lower(trim(s.name)) = 'office') DESC, s.created_at DESC
    LIMIT 1;
    IF FOUND THEN
      v_found := true;
    END IF;
  END IF;

  -- Company office fallback (same order as get_office_location).
  IF NOT v_found THEN
    SELECT co.latitude, co.longitude, co.radius_meters
    INTO v_geo_lat, v_geo_lng, v_radius
    FROM public.company_offices co
    WHERE co.company_id = v_user.company_id
    ORDER BY co.updated_at DESC NULLS LAST, co.created_at DESC NULLS LAST
    LIMIT 1;
    IF FOUND THEN
      v_found := true;
    END IF;
  END IF;

  -- No geofence configured — allow (matches the app warning path).
  IF NOT v_found OR v_geo_lat IS NULL OR v_geo_lng IS NULL THEN
    RETURN NEW;
  END IF;

  v_radius := COALESCE(v_radius, 1000);

  -- Parse submitted coordinates from the mobile location payload
  -- ({ latitude, longitude, ... } at the JSON top level).
  BEGIN
    v_lat := NULLIF(NEW.location->>'latitude', '')::double precision;
    v_lng := NULLIF(NEW.location->>'longitude', '')::double precision;
  EXCEPTION WHEN others THEN
    v_lat := NULL;
    v_lng := NULL;
  END;

  IF v_lat IS NULL OR v_lng IS NULL
     OR v_lat < -90 OR v_lat > 90 OR v_lng < -180 OR v_lng > 180
     OR (abs(v_lat) < 0.0001 AND abs(v_lng) < 0.0001) THEN
    RAISE EXCEPTION
      'Check-in requires a valid GPS location. Enable location services and try again.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Haversine, metres. R = 6371000, inclusive boundary — identical to mobile.
  v_dist := 2 * 6371000 * asin(sqrt(
    power(sin(radians(v_geo_lat - v_lat) / 2), 2)
    + cos(radians(v_lat)) * cos(radians(v_geo_lat))
      * power(sin(radians(v_geo_lng - v_lng) / 2), 2)
  ));

  IF v_dist > v_radius THEN
    RAISE EXCEPTION
      'You must be within % m of your office to check in (you are % m away).',
      round(v_radius), round(v_dist)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_geofence_guard ON public.attendance_records;
CREATE TRIGGER trg_attendance_geofence_guard
  BEFORE INSERT ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.attendance_geofence_guard();
