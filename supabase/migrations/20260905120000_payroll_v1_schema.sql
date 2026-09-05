-- ============================================
-- 20260905120000_payroll_v1_schema.sql
-- Payroll V1: salary profiles, payroll periods, payroll records,
-- earnings/deductions (also used for manual adjustments), and a
-- dedicated payroll audit log.
--
-- Design notes:
--   * Follows the existing tenant-isolation convention: every table carries
--     company_id uuid REFERENCES companies(id), indexed.
--   * Employee references follow the SAME convention already used by
--     attendance_records.user_uid / leave_requests.employee_uid: a bare
--     `uuid` column with NO foreign key to public.users (users.uid is
--     `text`, not `uuid`, so no FK is possible without a type mismatch —
--     this mirrors the existing schema exactly rather than inventing a new
--     join style).
--   * RLS: payroll is highly sensitive compensation data. Per product spec,
--     only super_admin has payroll access in V1 (managers do not get payroll
--     access merely because they can manage attendance/leave). Policies use
--     the existing SECURITY DEFINER helpers (public.rls_caller_role() etc.)
--     from 20260515090000_users_rls_no_recursion.sql to avoid recursion.
--   * The auth-service backend uses the service-role client (bypasses RLS)
--     for all payroll routes and enforces super_admin in application code;
--     RLS here is the defense-in-depth backstop for any other access path.
--   * Manual adjustments (bonus/allowance/deduction/etc. added during review)
--     are NOT a separate table. They are ordinary rows in payroll_earnings /
--     payroll_deductions with is_manual = true, reason stored in
--     `description`, and created_by/created_at populated — this satisfies
--     "every manual adjustment must contain type, amount, reason, created_by,
--     created_at" (spec §11) without introducing a parallel, redundant model.
-- ============================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- 1. employee_payroll_profiles — effective-dated salary configuration
-- ============================================

CREATE TABLE IF NOT EXISTS public.employee_payroll_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uid uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id),

  salary_type text NOT NULL DEFAULT 'monthly'
    CHECK (salary_type = ANY (ARRAY['monthly'::text, 'hourly'::text])),
  basic_salary numeric NOT NULL CHECK (basic_salary >= 0),
  currency text NOT NULL DEFAULT 'PKR',

  overtime_enabled boolean NOT NULL DEFAULT false,
  overtime_rate numeric CHECK (overtime_rate IS NULL OR overtime_rate >= 0),

  standard_working_days integer NOT NULL DEFAULT 22 CHECK (standard_working_days > 0),
  standard_working_hours numeric NOT NULL DEFAULT 8 CHECK (standard_working_hours > 0),

  -- No country-specific tax engine (spec §18). Tax is off by default; when
  -- enabled it is either a flat amount per period or a percentage of gross.
  tax_enabled boolean NOT NULL DEFAULT false,
  tax_type text CHECK (tax_type IS NULL OR tax_type = ANY (ARRAY['fixed'::text, 'percentage'::text])),
  tax_value numeric CHECK (tax_value IS NULL OR tax_value >= 0),

  effective_from date NOT NULL,
  effective_to date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,

  CONSTRAINT employee_payroll_profiles_date_order
    CHECK (effective_to IS NULL OR effective_from < effective_to),
  CONSTRAINT employee_payroll_profiles_tax_config
    CHECK (tax_enabled = false OR (tax_type IS NOT NULL AND tax_value IS NOT NULL)),
  CONSTRAINT employee_payroll_profiles_overtime_config
    CHECK (overtime_enabled = false OR overtime_rate IS NOT NULL),

  -- One employee cannot have two overlapping active salary profiles.
  CONSTRAINT employee_payroll_profiles_no_overlap
    EXCLUDE USING gist (
      employee_uid WITH =,
      daterange(effective_from, effective_to, '[]') WITH &&
    )
);

CREATE INDEX IF NOT EXISTS employee_payroll_profiles_employee_idx
  ON public.employee_payroll_profiles(employee_uid);
CREATE INDEX IF NOT EXISTS employee_payroll_profiles_company_idx
  ON public.employee_payroll_profiles(company_id);
CREATE INDEX IF NOT EXISTS employee_payroll_profiles_effective_idx
  ON public.employee_payroll_profiles(effective_from, effective_to);

-- ============================================
-- 2. payroll_periods
-- ============================================

CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),

  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date,
  notes text,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status = ANY (ARRAY['draft'::text, 'calculated'::text, 'reviewed'::text, 'approved'::text, 'locked'::text])),

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  calculated_at timestamptz,
  calculated_by text,
  reviewed_at timestamptz,
  reviewed_by text,
  approved_at timestamptz,
  approved_by text,
  locked_at timestamptz,
  locked_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payroll_periods_date_order CHECK (period_start < period_end),

  -- A payroll period cannot overlap another period for the same company —
  -- overlapping payroll runs for the same employees would double-count pay.
  CONSTRAINT payroll_periods_no_overlap
    EXCLUDE USING gist (
      company_id WITH =,
      daterange(period_start, period_end, '[]') WITH &&
    )
);

CREATE INDEX IF NOT EXISTS payroll_periods_company_idx ON public.payroll_periods(company_id);
CREATE INDEX IF NOT EXISTS payroll_periods_status_idx ON public.payroll_periods(status);
CREATE INDEX IF NOT EXISTS payroll_periods_dates_idx ON public.payroll_periods(period_start, period_end);

-- ============================================
-- 3. payroll_records — one employee's payroll result for one period
-- ============================================

CREATE TABLE IF NOT EXISTS public.payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_uid uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  department_id uuid REFERENCES public.departments(id),
  payroll_profile_id uuid REFERENCES public.employee_payroll_profiles(id),

  basic_salary numeric NOT NULL,
  salary_type text NOT NULL,
  currency text NOT NULL,

  working_days numeric NOT NULL DEFAULT 0,
  worked_days numeric NOT NULL DEFAULT 0,
  absent_days numeric NOT NULL DEFAULT 0,
  paid_leave_days numeric NOT NULL DEFAULT 0,
  unpaid_leave_days numeric NOT NULL DEFAULT 0,

  regular_hours numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  overtime_amount numeric NOT NULL DEFAULT 0,

  allowances_amount numeric NOT NULL DEFAULT 0,
  bonus_amount numeric NOT NULL DEFAULT 0,

  gross_salary numeric NOT NULL DEFAULT 0,
  deductions_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,

  -- Immutable audit trail of the exact inputs used to compute this record
  -- (spec §8 / §56) — survives later changes to the employee's salary,
  -- department, attendance or leave.
  calculation_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculation_version integer NOT NULL DEFAULT 1,

  status text NOT NULL DEFAULT 'calculated'
    CHECK (status = ANY (ARRAY['calculated'::text, 'reviewed'::text, 'approved'::text, 'locked'::text])),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payroll_records_unique_employee_per_period UNIQUE (payroll_period_id, employee_uid)
);

CREATE INDEX IF NOT EXISTS payroll_records_period_idx ON public.payroll_records(payroll_period_id);
CREATE INDEX IF NOT EXISTS payroll_records_employee_idx ON public.payroll_records(employee_uid);
CREATE INDEX IF NOT EXISTS payroll_records_company_idx ON public.payroll_records(company_id);
CREATE INDEX IF NOT EXISTS payroll_records_department_idx ON public.payroll_records(department_id);
CREATE INDEX IF NOT EXISTS payroll_records_status_idx ON public.payroll_records(status);

-- ============================================
-- 4. payroll_earnings — normalized earnings lines (basic/allowance/bonus/
--    overtime/other). Manual entries (is_manual = true) are the "adjustment"
--    UI's earnings side and always carry a reason in `description`.
-- ============================================

CREATE TABLE IF NOT EXISTS public.payroll_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id uuid NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),

  type text NOT NULL CHECK (type = ANY (ARRAY['basic_salary'::text, 'allowance'::text, 'bonus'::text, 'overtime'::text, 'other'::text])),
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  description text,

  is_manual boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payroll_earnings_manual_requires_reason
    CHECK (is_manual = false OR (description IS NOT NULL AND length(trim(description)) > 0))
);

CREATE INDEX IF NOT EXISTS payroll_earnings_record_idx ON public.payroll_earnings(payroll_record_id);
CREATE INDEX IF NOT EXISTS payroll_earnings_company_idx ON public.payroll_earnings(company_id);

-- ============================================
-- 5. payroll_deductions — normalized deduction lines (tax/absence/loan/
--    advance/other). Manual entries are the adjustment UI's deduction side.
-- ============================================

CREATE TABLE IF NOT EXISTS public.payroll_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id uuid NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),

  type text NOT NULL CHECK (type = ANY (ARRAY['tax'::text, 'absence'::text, 'loan'::text, 'advance'::text, 'other'::text])),
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  description text,

  is_manual boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payroll_deductions_manual_requires_reason
    CHECK (is_manual = false OR (description IS NOT NULL AND length(trim(description)) > 0))
);

CREATE INDEX IF NOT EXISTS payroll_deductions_record_idx ON public.payroll_deductions(payroll_record_id);
CREATE INDEX IF NOT EXISTS payroll_deductions_company_idx ON public.payroll_deductions(company_id);

-- ============================================
-- 6. payroll_audit_logs — dedicated audit trail.
--
-- public.audit_logs (actor_uid, target_uid, action, timestamp) already exists
-- but has no entity/entity_id/metadata columns, which payroll needs to
-- reconstruct "who did what to which period/record and with what inputs"
-- (spec §12/§56). Rather than force payroll events into a shape that cannot
-- hold that context, this adds a payroll-specific table that keeps the same
-- actor/action/timestamp naming convention as the existing audit_logs table.
-- ============================================

CREATE TABLE IF NOT EXISTS public.payroll_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  actor_uid text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payroll_audit_logs_company_idx ON public.payroll_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS payroll_audit_logs_entity_idx ON public.payroll_audit_logs(entity, entity_id);

-- ============================================
-- 7. Row Level Security — super_admin only, tenant-scoped.
--
-- Employees have no payroll UI in V1 (spec §14/§21). Managers do not get
-- payroll access merely because they manage attendance/leave. Uses the
-- existing SECURITY DEFINER helpers to avoid the 42P17 recursion class of
-- bug already fixed once on `users` (20260515090000).
-- ============================================

ALTER TABLE public.employee_payroll_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage payroll profiles" ON public.employee_payroll_profiles;
CREATE POLICY "Super admins manage payroll profiles"
ON public.employee_payroll_profiles FOR ALL TO authenticated
USING (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
)
WITH CHECK (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
);

DROP POLICY IF EXISTS "Super admins manage payroll periods" ON public.payroll_periods;
CREATE POLICY "Super admins manage payroll periods"
ON public.payroll_periods FOR ALL TO authenticated
USING (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
)
WITH CHECK (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
);

DROP POLICY IF EXISTS "Super admins manage payroll records" ON public.payroll_records;
CREATE POLICY "Super admins manage payroll records"
ON public.payroll_records FOR ALL TO authenticated
USING (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
)
WITH CHECK (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
);

DROP POLICY IF EXISTS "Super admins manage payroll earnings" ON public.payroll_earnings;
CREATE POLICY "Super admins manage payroll earnings"
ON public.payroll_earnings FOR ALL TO authenticated
USING (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
)
WITH CHECK (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
);

DROP POLICY IF EXISTS "Super admins manage payroll deductions" ON public.payroll_deductions;
CREATE POLICY "Super admins manage payroll deductions"
ON public.payroll_deductions FOR ALL TO authenticated
USING (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
)
WITH CHECK (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
);

DROP POLICY IF EXISTS "Super admins read payroll audit logs" ON public.payroll_audit_logs;
CREATE POLICY "Super admins read payroll audit logs"
ON public.payroll_audit_logs FOR SELECT TO authenticated
USING (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
);

DROP POLICY IF EXISTS "Super admins insert payroll audit logs" ON public.payroll_audit_logs;
CREATE POLICY "Super admins insert payroll audit logs"
ON public.payroll_audit_logs FOR INSERT TO authenticated
WITH CHECK (
  public.rls_caller_role() = 'super_admin'
  AND public.rls_caller_is_active()
  AND company_id = public.rls_caller_company_id()
);

COMMENT ON TABLE public.employee_payroll_profiles IS
  'Effective-dated salary configuration per employee. Overlapping ranges for the same employee_uid are rejected by a gist exclusion constraint.';
COMMENT ON TABLE public.payroll_periods IS
  'A payroll run for a date range. Lifecycle: draft -> calculated -> reviewed -> approved -> locked.';
COMMENT ON TABLE public.payroll_records IS
  'One employee''s payroll result for one payroll_periods row. calculation_snapshot freezes the inputs used so historical payroll never silently changes.';
COMMENT ON TABLE public.payroll_earnings IS
  'Earnings lines for a payroll record. is_manual=true rows are admin-added adjustments and require a reason in description.';
COMMENT ON TABLE public.payroll_deductions IS
  'Deduction lines for a payroll record. is_manual=true rows are admin-added adjustments and require a reason in description.';
COMMENT ON TABLE public.payroll_audit_logs IS
  'Dedicated payroll audit trail (actor/action/entity/entity_id/metadata) — separate from public.audit_logs because payroll needs metadata/entity_id that table does not carry.';

COMMIT;
