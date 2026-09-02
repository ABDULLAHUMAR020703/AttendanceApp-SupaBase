-- Company- and department-scoped RLS for public.sites.
--
-- The canonical migration timeline never (re-)established RLS on `sites` after
-- the early tenant-isolation overhaul; only supabase/legacy_migrations/022 did,
-- and those policies are not company-scoped. The mobile app reads `sites` and
-- `employee_sites` directly with the anon key, so RLS is the tenant boundary
-- for that path. The web admin API is unaffected: auth-service uses the
-- service-role client, which bypasses RLS, and enforces tenant/role checks in
-- application code.
--
-- Idempotent: safe to run whether or not legacy 022 was ever applied.

-- ---------------------------------------------------------------------------
-- Caller helper: authoritative department UUID (STABLE, SECURITY DEFINER).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rls_caller_department_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id
  FROM public.users
  WHERE uid = auth.uid()::text
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.rls_caller_department_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_caller_department_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS and drop every prior policy (legacy 022 + any earlier names).
-- ---------------------------------------------------------------------------
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sites_super_admin_select" ON public.sites;
DROP POLICY IF EXISTS "sites_manager_select_own_department" ON public.sites;
DROP POLICY IF EXISTS "sites_super_admin_insert" ON public.sites;
DROP POLICY IF EXISTS "sites_manager_insert_own_department" ON public.sites;
DROP POLICY IF EXISTS "sites_super_admin_update" ON public.sites;
DROP POLICY IF EXISTS "sites_manager_update_own_department" ON public.sites;
DROP POLICY IF EXISTS "sites_super_admin_delete" ON public.sites;
DROP POLICY IF EXISTS "sites_manager_delete_own_department" ON public.sites;
DROP POLICY IF EXISTS "sites select same company" ON public.sites;
DROP POLICY IF EXISTS "sites write privileged same company" ON public.sites;
DROP POLICY IF EXISTS "sites insert privileged same company" ON public.sites;
DROP POLICY IF EXISTS "sites update privileged same company" ON public.sites;
DROP POLICY IF EXISTS "sites delete privileged same company" ON public.sites;

-- Helper predicate reused below: caller is an active manager of the row's dept.
--   department_id match, OR (legacy) department name match for managers whose
--   users.department_id was never backfilled.
-- Expressed inline per policy because Postgres RLS has no shared predicate.

-- ---------------------------------------------------------------------------
-- SELECT: any active member of the owning company may read its sites.
-- (Employees need their department office + assigned sites for check-in; site
--  coordinates are not sensitive within a tenant.)
-- ---------------------------------------------------------------------------
-- Company match is the tenant boundary. No is_active gate here: an employee
-- must be able to READ their department geofence to check in on mobile, and
-- reading a geofence they cannot edit is harmless.
CREATE POLICY "sites select same company"
ON public.sites
FOR SELECT
TO authenticated
USING (
  company_id = public.rls_caller_company_id()
);

-- ---------------------------------------------------------------------------
-- INSERT: super_admin of the company, or a manager of the target department.
-- ---------------------------------------------------------------------------
CREATE POLICY "sites insert privileged same company"
ON public.sites
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.rls_caller_company_id()
  AND public.rls_caller_is_active()
  AND (
    public.rls_caller_role() = 'super_admin'
    OR (
      public.rls_caller_role() = 'manager'
      AND (
        department_id = public.rls_caller_department_id()
        OR EXISTS (
          SELECT 1 FROM public.departments d
          WHERE d.id = sites.department_id
            AND d.company_id = public.rls_caller_company_id()
            AND lower(d.normalized_name) = lower(trim(COALESCE(public.rls_caller_department(), '')))
        )
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- UPDATE: same rule, checked on both the existing row and the new row so a
-- manager cannot move a site into another department or company.
-- ---------------------------------------------------------------------------
CREATE POLICY "sites update privileged same company"
ON public.sites
FOR UPDATE
TO authenticated
USING (
  company_id = public.rls_caller_company_id()
  AND public.rls_caller_is_active()
  AND (
    public.rls_caller_role() = 'super_admin'
    OR (
      public.rls_caller_role() = 'manager'
      AND (
        department_id = public.rls_caller_department_id()
        OR EXISTS (
          SELECT 1 FROM public.departments d
          WHERE d.id = sites.department_id
            AND d.company_id = public.rls_caller_company_id()
            AND lower(d.normalized_name) = lower(trim(COALESCE(public.rls_caller_department(), '')))
        )
      )
    )
  )
)
WITH CHECK (
  company_id = public.rls_caller_company_id()
  AND (
    public.rls_caller_role() = 'super_admin'
    OR (
      public.rls_caller_role() = 'manager'
      AND (
        department_id = public.rls_caller_department_id()
        OR EXISTS (
          SELECT 1 FROM public.departments d
          WHERE d.id = sites.department_id
            AND d.company_id = public.rls_caller_company_id()
            AND lower(d.normalized_name) = lower(trim(COALESCE(public.rls_caller_department(), '')))
        )
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- DELETE: super_admin of the company, or manager of the owning department.
-- ---------------------------------------------------------------------------
CREATE POLICY "sites delete privileged same company"
ON public.sites
FOR DELETE
TO authenticated
USING (
  company_id = public.rls_caller_company_id()
  AND public.rls_caller_is_active()
  AND (
    public.rls_caller_role() = 'super_admin'
    OR (
      public.rls_caller_role() = 'manager'
      AND (
        department_id = public.rls_caller_department_id()
        OR EXISTS (
          SELECT 1 FROM public.departments d
          WHERE d.id = sites.department_id
            AND d.company_id = public.rls_caller_company_id()
            AND lower(d.normalized_name) = lower(trim(COALESCE(public.rls_caller_department(), '')))
        )
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- employee_sites already has RLS (20260709140000). Re-assert company scoping on
-- the manager policy via department_id where available (kept name-compatible).
-- ---------------------------------------------------------------------------
-- (No change required here — 20260709140000 policies already restrict employees
--  to their own rows and managers to same-company same-department employees.)
