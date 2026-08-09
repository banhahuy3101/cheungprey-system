-- Migration: Create report_template_keys table for dynamic information key labels, categories, and field types
CREATE TABLE IF NOT EXISTS public.report_template_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  key_name        TEXT NOT NULL,
  display_label   TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT 'general',
  field_type      TEXT NOT NULL DEFAULT 'text',
  default_value   TEXT NOT NULL DEFAULT '',
  is_required     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_report_template_keys_tmpl_key UNIQUE (template_id, key_name)
);

-- Index for fast query by template_id
CREATE INDEX IF NOT EXISTS idx_report_template_keys_tmpl ON public.report_template_keys (template_id);
