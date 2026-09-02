-- Read-only geofence / sites data audit.
-- Runs in the Supabase SQL editor or psql (no \meta-commands). NOTHING here
-- mutates data. Review the output before applying:
--   20260902120000_sites_company_department_name_unique.sql
--   20260902130000_sites_rls_tenant_isolation.sql
--   20260902140000_attendance_geofence_enforcement.sql
--
-- Each query is labelled with a `check` column so results are identifiable when
-- run together.

-- 1. Duplicate (company_id, department_id, name) in sites
--    (BLOCKS 20260902120000 — the migration aborts if any row is returned here)
SELECT '1. duplicate sites (company,department,name)' AS check,
       company_id, department_id, lower(trim(name)) AS name_key, count(*) AS n
FROM public.sites
GROUP BY company_id, department_id, lower(trim(name))
HAVING count(*) > 1;

-- 2. Sites with invalid coordinates / radius
SELECT '2. invalid site coordinates or radius' AS check,
       id, company_id, department_id, name, latitude, longitude, radius
FROM public.sites
WHERE latitude IS NULL OR longitude IS NULL
   OR latitude < -90 OR latitude > 90
   OR longitude < -180 OR longitude > 180
   OR (abs(latitude) < 0.0001 AND abs(longitude) < 0.0001)
   OR radius IS NULL OR radius <= 0 OR radius > 100000;

-- 3. Sites with NULL company_id (should be none)
SELECT '3. sites with null company_id' AS check, id, name, department_id
FROM public.sites
WHERE company_id IS NULL;

-- 4. Sites whose department belongs to a different company (tenant leak)
SELECT '4. site/department company mismatch' AS check,
       s.id, s.name, s.company_id AS site_company, d.company_id AS dept_company
FROM public.sites s
JOIN public.departments d ON d.id = s.department_id
WHERE s.company_id IS DISTINCT FROM d.company_id;

-- 5. Orphaned sites (department_id not in departments)
SELECT '5. orphaned sites (bad department_id)' AS check, s.id, s.name, s.department_id
FROM public.sites s
LEFT JOIN public.departments d ON d.id = s.department_id
WHERE d.id IS NULL;

-- 6. Orphaned employee_sites (site or employee missing)
SELECT '6. orphaned employee_sites' AS check, es.id, es.employee_uid, es.site_id
FROM public.employee_sites es
LEFT JOIN public.sites s ON s.id = es.site_id
LEFT JOIN public.users u ON u.uid = es.employee_uid::text
WHERE s.id IS NULL OR u.uid IS NULL;

-- 7. Cross-company employee_sites (employee and site in different companies)
SELECT '7. cross-company employee_sites' AS check,
       es.id, u.company_id AS employee_company, s.company_id AS site_company
FROM public.employee_sites es
JOIN public.users u ON u.uid = es.employee_uid::text
JOIN public.sites s ON s.id = es.site_id
WHERE u.company_id IS DISTINCT FROM s.company_id;

-- 8. company_offices with more than one row per company
SELECT '8. duplicate company_offices' AS check, company_id, count(*) AS n
FROM public.company_offices
GROUP BY company_id
HAVING count(*) > 1;

-- 9. in_office employees with NO applicable geofence
--    (these check in from anywhere — trigger fails open, matching current app)
SELECT '9. in_office employees without a geofence' AS check,
       u.uid, u.username, u.company_id, u.department, u.department_id
FROM public.users u
WHERE COALESCE(u.work_mode, 'in_office') = 'in_office'
  AND COALESCE(u.is_active, false)
  AND NOT EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.company_id = u.company_id
      AND (s.department_id = u.department_id
           OR s.id IN (SELECT site_id FROM public.employee_sites es
                       WHERE es.employee_uid::text = u.uid))
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.company_offices co WHERE co.company_id = u.company_id
  );
