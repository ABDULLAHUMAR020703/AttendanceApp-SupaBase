-- Employee workflow: approval chains, work mode requests, multi-site geofencing

-- Extend manager permission keys
ALTER TABLE public.manager_permissions DROP CONSTRAINT IF EXISTS manager_permissions_known_key;
ALTER TABLE public.manager_permissions ADD CONSTRAINT manager_permissions_known_key CHECK (
  permission_key = ANY (ARRAY[
    'create_user', 'edit_user', 'delete_user', 'activate_user', 'deactivate_user',
    'change_user_role', 'view_employees', 'manual_attendance', 'view_attendance',
    'export_attendance', 'attendance_analytics', 'view_leave_requests', 'approve_leave',
    'reject_leave', 'edit_leave_balance', 'view_work_mode_requests', 'approve_work_mode',
    'reject_work_mode', 'view_tickets', 'manage_tickets', 'assign_tickets', 'close_tickets',
    'manage_geofencing', 'update_office_location', 'update_attendance_radius',
    'view_hr_dashboard', 'view_analytics', 'export_reports', 'create_events', 'edit_events',
    'delete_events', 'manage_notifications', 'approve_signup_requests', 'manage_departments',
    'manage_approval_workflows', 'access_system_settings'
  ])
);

-- Allow multiple sites per department
DROP INDEX IF EXISTS public.sites_one_per_department;

-- Approval workflow configuration
CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approval_workflows_request_type_check CHECK (
    request_type = ANY (ARRAY['annual_leave'::text, 'sick_leave'::text, 'casual_leave'::text, 'remote_work'::text])
  ),
  CONSTRAINT approval_workflows_unique_type UNIQUE (company_id, request_type)
);

CREATE TABLE IF NOT EXISTS public.approval_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  step_order integer NOT NULL CHECK (step_order >= 1),
  step_label text NOT NULL,
  approver_role text NOT NULL CHECK (
    approver_role = ANY (ARRAY['department_manager'::text, 'hr'::text, 'super_admin'::text])
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approval_workflow_steps_unique_order UNIQUE (workflow_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_company ON public.approval_workflows(company_id);

-- Per-request approval progress
CREATE TABLE IF NOT EXISTS public.approval_request_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  request_id uuid NOT NULL,
  step_order integer NOT NULL,
  step_label text,
  approver_role text,
  approver_uid text,
  approver_username text,
  action text NOT NULL DEFAULT 'pending' CHECK (action = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  notes text,
  acted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON public.approval_request_actions(request_type, request_id);

-- Work mode / remote work requests
CREATE TABLE IF NOT EXISTS public.work_mode_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_uid text NOT NULL,
  current_work_mode text,
  requested_work_mode text NOT NULL CHECK (
    requested_work_mode = ANY (ARRAY['in_office'::text, 'semi_remote'::text, 'fully_remote'::text])
  ),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  current_step integer NOT NULL DEFAULT 1,
  workflow_id uuid REFERENCES public.approval_workflows(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_mode_requests_company_status ON public.work_mode_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_work_mode_requests_employee ON public.work_mode_requests(employee_uid);

-- Leave multi-step tracking
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES public.approval_workflows(id) ON DELETE SET NULL;

-- Approval audit (separate from permission audit_logs)
CREATE TABLE IF NOT EXISTS public.approval_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  request_id uuid NOT NULL,
  actor_uid text,
  actor_username text,
  action text NOT NULL,
  step_order integer,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_audit_company ON public.approval_audit_logs(company_id, created_at DESC);

-- Employee sites: unique assignment + employee self-read
CREATE UNIQUE INDEX IF NOT EXISTS employee_sites_unique_assignment
  ON public.employee_sites (employee_uid, site_id);

ALTER TABLE public.employee_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees read own site assignments" ON public.employee_sites;
CREATE POLICY "Employees read own site assignments"
ON public.employee_sites FOR SELECT TO authenticated
USING (employee_uid::text = auth.uid()::text);

DROP POLICY IF EXISTS "Super admins manage employee sites" ON public.employee_sites;
CREATE POLICY "Super admins manage employee sites"
ON public.employee_sites FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text AND u.role = 'super_admin' AND u.is_active = true
  )
);

DROP POLICY IF EXISTS "Managers manage department employee sites" ON public.employee_sites;
CREATE POLICY "Managers manage department employee sites"
ON public.employee_sites FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users mgr
    JOIN public.users emp ON emp.uid = employee_sites.employee_uid::text
    WHERE mgr.uid = auth.uid()::text
      AND mgr.role = 'manager'
      AND mgr.is_active = true
      AND mgr.company_id = emp.company_id
      AND mgr.department = emp.department
  )
);

-- RLS for work_mode_requests
ALTER TABLE public.work_mode_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees manage own work mode requests" ON public.work_mode_requests;
CREATE POLICY "Employees manage own work mode requests"
ON public.work_mode_requests FOR ALL TO authenticated
USING (employee_uid = auth.uid()::text)
WITH CHECK (employee_uid = auth.uid()::text);

DROP POLICY IF EXISTS "Admins view company work mode requests" ON public.work_mode_requests;
CREATE POLICY "Admins view company work mode requests"
ON public.work_mode_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text
      AND u.is_active = true
      AND u.company_id = work_mode_requests.company_id
      AND u.role IN ('manager', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins update company work mode requests" ON public.work_mode_requests;
CREATE POLICY "Admins update company work mode requests"
ON public.work_mode_requests FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text
      AND u.is_active = true
      AND u.company_id = work_mode_requests.company_id
      AND u.role IN ('manager', 'super_admin')
  )
);
