-- Simple report fields (create flow: title, description, content)
ALTER TABLE public.report_documents ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.report_documents ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.report_documents ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_report_documents_title ON public.report_documents (title);
