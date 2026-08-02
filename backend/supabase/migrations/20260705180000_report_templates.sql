-- Report templates for DOCX/HTML template uploads
CREATE TABLE IF NOT EXISTS public.report_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  format          TEXT NOT NULL CHECK (format IN ('docx', 'html')),
  file_name       TEXT NOT NULL DEFAULT '',
  file_size       BIGINT NOT NULL DEFAULT 0,
  storage_path    TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL DEFAULT '',
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  keys            JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_report_templates_format ON public.report_templates (format);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON public.report_templates (created_by);
