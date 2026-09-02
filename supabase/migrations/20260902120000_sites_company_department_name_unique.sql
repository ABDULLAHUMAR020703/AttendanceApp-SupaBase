-- Fix mobile department geofencing UPSERT.
--
-- Root cause: set_department_geofence used `ON CONFLICT (department_id)`, but
-- migration 20260709140000_employee_workflow_schema.sql intentionally dropped the
-- `sites_one_per_department` unique index so a department can own multiple named
-- sites. With no unique/exclusion constraint on `sites.department_id`, Postgres
-- raised: "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification".
--
-- Fix: keep multi-site support, but make the department's primary office geofence
-- the site named `Office` and back it with UNIQUE(company_id, department_id, name).
-- The department-geofence RPCs are re-pointed at that constraint.
--
-- This migration is idempotent and non-destructive: it never deletes rows. If
-- pre-existing duplicates on (company_id, department_id, name) are found it fails
-- with an explicit list so an operator can resolve them deliberately.

-- ---------------------------------------------------------------------------
-- 1. Guard: refuse to create the constraint while duplicates exist.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_dupes text;
BEGIN
  SELECT string_agg(
           format('company_id=%s department_id=%s name=%L count=%s',
                  company_id, department_id, name, cnt),
           E'\n')
    INTO v_dupes
  FROM (
    SELECT company_id, department_id, name, count(*) AS cnt
    FROM public.sites
    GROUP BY company_id, department_id, name
    HAVING count(*) > 1
  ) d;

  IF v_dupes IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot add UNIQUE(company_id, department_id, name) on public.sites: duplicate rows exist. Resolve these manually (merge/rename), then re-run:%s%s',
      E'\n', v_dupes;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Final uniqueness rule: multiple named sites per department, but no two
--    sites with the same (company_id, department_id, name).
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS sites_company_department_name_key
  ON public.sites (company_id, department_id, name);

-- ---------------------------------------------------------------------------
-- 3. Legacy company fallback: one office per company (re-assert idempotently).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT company_id
    FROM public.company_offices
    GROUP BY company_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one company office per company: duplicate company_offices rows exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS company_offices_one_per_company
  ON public.company_offices (company_id);

-- ---------------------------------------------------------------------------
-- 4. Read RPC: prefer the department's `Office` site, keep other sites working.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_department_geofence(p_department_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  department_id uuid,
  department_name text,
  site_name text,
  latitude double precision,
  longitude double precision,
  radius_meters integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
  v_caller_department_id uuid;
  v_target_department_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_company_id := public.rls_caller_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User is not bound to a company.';
  END IF;

  SELECT u.role, u.department_id
  INTO v_role, v_caller_department_id
  FROM public.users u
  WHERE u.uid = auth.uid()::text
    AND COALESCE(u.is_active, false)
  LIMIT 1;

  v_target_department_id := COALESCE(
    p_department_id,
    v_caller_department_id,
    (
      SELECT d.id
      FROM public.departments d
      JOIN public.users u ON u.uid = auth.uid()::text
      WHERE d.company_id = v_company_id
        AND (
          lower(d.normalized_name) = lower(trim(COALESCE(u.department, '')))
          OR lower(d.name) = lower(trim(COALESCE(u.department, '')))
        )
      LIMIT 1
    )
  );

  IF v_target_department_id IS NULL THEN
    RETURN;
  END IF;

  IF v_role = 'super_admin' THEN
    NULL;
  ELSIF v_role IN ('manager', 'employee') THEN
    IF NOT (
      v_caller_department_id = v_target_department_id
      OR EXISTS (
        SELECT 1
        FROM public.departments d
        JOIN public.users u ON u.uid = auth.uid()::text
        WHERE d.id = v_target_department_id
          AND d.company_id = v_company_id
          AND (
            lower(d.normalized_name) = lower(trim(COALESCE(u.department, '')))
            OR lower(d.name) = lower(trim(COALESCE(u.department, '')))
          )
      )
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to view this department geofence.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions.';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.department_id,
    d.name::text AS department_name,
    s.name::text AS site_name,
    s.latitude,
    s.longitude,
    s.radius AS radius_meters,
    s.created_at AS updated_at
  FROM public.sites s
  JOIN public.departments d ON d.id = s.department_id
  WHERE s.department_id = v_target_department_id
    AND s.company_id = v_company_id
  ORDER BY (lower(trim(s.name)) = 'office') DESC, s.created_at DESC
  LIMIT 1;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Upsert RPC: conflict target now matches UNIQUE(company_id, department_id, name).
--    The primary office geofence is always the normalized site name `Office`.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_department_geofence(
  p_department_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer DEFAULT 1000,
  p_site_name text DEFAULT 'Office'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
  v_caller_department_id uuid;
  v_site_id uuid;
  v_site_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_department_id IS NULL THEN
    RAISE EXCEPTION 'Department is required.';
  END IF;

  v_company_id := public.rls_caller_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User is not bound to a company.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.departments d
    WHERE d.id = p_department_id AND d.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Department not found in your company.';
  END IF;

  SELECT u.role, u.department_id
  INTO v_role, v_caller_department_id
  FROM public.users u
  WHERE u.uid = auth.uid()::text
    AND COALESCE(u.is_active, false)
  LIMIT 1;

  IF v_role = 'super_admin' THEN
    NULL;
  ELSIF v_role = 'manager' THEN
    IF NOT (
      v_caller_department_id = p_department_id
      OR EXISTS (
        SELECT 1
        FROM public.departments d
        JOIN public.users u ON u.uid = auth.uid()::text
        WHERE d.id = p_department_id
          AND d.company_id = v_company_id
          AND (
            lower(d.normalized_name) = lower(trim(COALESCE(u.department, '')))
            OR lower(d.name) = lower(trim(COALESCE(u.department, '')))
          )
      )
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions. Managers can only update their own department geofence.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions.';
  END IF;

  IF p_latitude < -90 OR p_latitude > 90 THEN
    RAISE EXCEPTION 'Latitude must be between -90 and 90';
  END IF;
  IF p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Longitude must be between -180 and 180';
  END IF;
  IF p_radius_meters IS NULL OR p_radius_meters <= 0 THEN
    RAISE EXCEPTION 'Radius must be greater than 0';
  END IF;
  IF abs(p_latitude) < 0.0001 AND abs(p_longitude) < 0.0001 THEN
    RAISE EXCEPTION 'Invalid coordinates (0, 0) are not accepted.';
  END IF;

  v_site_name := COALESCE(NULLIF(trim(p_site_name), ''), 'Office');

  INSERT INTO public.sites (
    company_id,
    department_id,
    name,
    latitude,
    longitude,
    radius
  )
  VALUES (
    v_company_id,
    p_department_id,
    v_site_name,
    p_latitude,
    p_longitude,
    p_radius_meters
  )
  ON CONFLICT (company_id, department_id, name) DO UPDATE
  SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    radius = EXCLUDED.radius
  RETURNING id INTO v_site_id;

  RETURN v_site_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_department_geofence(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_department_geofence(uuid, double precision, double precision, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_department_geofence(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_department_geofence(uuid, double precision, double precision, integer, text) TO authenticated;
