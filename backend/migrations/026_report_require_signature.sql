-- Add require_signature column to report_documents table
ALTER TABLE public.report_documents ADD COLUMN IF NOT EXISTS require_signature BOOLEAN DEFAULT true;
