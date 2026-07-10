ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS app_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
