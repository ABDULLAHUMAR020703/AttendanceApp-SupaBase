-- Harden work_mode_requests for employee self-service + admin approval
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS patterns).

-- One pending request per employee
CREATE UNIQUE INDEX IF NOT EXISTS work_mode_requests_one_pending_per_employee
  ON public.work_mode_requests (employee_uid)
  WHERE status = 'pending';

-- Ensure PostgREST roles can use the table (RLS still enforces row access)
GRANT SELECT, INSERT, UPDATE ON public.work_mode_requests TO authenticated;
GRANT SELECT ON public.work_mode_requests TO anon;
GRANT ALL ON public.work_mode_requests TO service_role;

GRANT SELECT ON public.approval_workflows TO authenticated;
GRANT SELECT ON public.approval_workflow_steps TO authenticated;
GRANT SELECT ON public.approval_request_actions TO authenticated;
GRANT ALL ON public.approval_workflows TO service_role;
GRANT ALL ON public.approval_workflow_steps TO service_role;
GRANT ALL ON public.approval_request_actions TO service_role;
GRANT ALL ON public.approval_audit_logs TO service_role;

-- Employees already have FOR ALL on own rows; keep admin SELECT/UPDATE policies intact.
-- Reload schema cache so PostgREST sees grants/indexes immediately when applied via SQL editor.
NOTIFY pgrst, 'reload schema';
