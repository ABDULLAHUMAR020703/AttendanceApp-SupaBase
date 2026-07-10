-- Reporting: schedule settings, recipient emails, audit logs

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS report_email text;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS report_schedule_day integer DEFAULT 1 CHECK (report_schedule_day >= 1 AND report_schedule_day <= 28),
  ADD COLUMN IF NOT EXISTS report_auto_send boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS report_frequency text DEFAULT 'monthly' CHECK (report_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
  ADD COLUMN IF NOT EXISTS report_recipient_emails jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS report_schedule_last_execution timestamptz,
  ADD COLUMN IF NOT EXISTS report_schedule_last_status text;

CREATE TABLE IF NOT EXISTS public.report_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  report_period text,
  recipients jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'unknown',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_audit_logs_company_created
  ON public.report_audit_logs (company_id, created_at DESC);
