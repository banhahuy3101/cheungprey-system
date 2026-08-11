-- Migration 027: Report Templates & Report Template Keys tables
-- Run this in Supabase Dashboard → SQL Editor

-- ===========================
-- 1. REPORT TEMPLATES TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS public.report_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT '',
  format       TEXT NOT NULL DEFAULT 'docx',   -- 'docx' | 'html'
  file_name    TEXT NOT NULL DEFAULT '',
  file_size    BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL DEFAULT '',
  keys         TEXT[] NOT NULL DEFAULT '{}',
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON public.report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_report_templates_category   ON public.report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_at ON public.report_templates(created_at DESC);

-- ===========================
-- 2. REPORT TEMPLATE KEYS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS public.report_template_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  key_name      TEXT NOT NULL,
  display_label TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'general',
  field_type    TEXT NOT NULL DEFAULT 'text',   -- 'text' | 'number' | 'date' | 'textarea'
  default_value TEXT NOT NULL DEFAULT '',
  is_required   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_report_template_keys_tmpl_key UNIQUE (template_id, key_name)
);

CREATE INDEX IF NOT EXISTS idx_report_template_keys_template_id ON public.report_template_keys(template_id);

-- ===========================
-- 3. RLS POLICIES
-- ===========================

-- Enable RLS
ALTER TABLE public.report_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_template_keys ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all templates
CREATE POLICY "templates_select_authenticated"
  ON public.report_templates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/managers can insert/update/delete templates
CREATE POLICY "templates_insert_admin"
  ON public.report_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "templates_update_admin"
  ON public.report_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "templates_delete_admin"
  ON public.report_templates FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Keys follow template access
CREATE POLICY "template_keys_select_authenticated"
  ON public.report_template_keys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "template_keys_insert_authenticated"
  ON public.report_template_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "template_keys_update_authenticated"
  ON public.report_template_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "template_keys_delete_authenticated"
  ON public.report_template_keys FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ===========================
-- 4. STORAGE BUCKET (run manually in Supabase Dashboard if needed)
-- ===========================
-- Bucket name: report-templates (private)
-- Bucket name: report-documents (private)
-- These are created programmatically by the backend on startup.

NOTIFY pgrst, 'reload schema';
