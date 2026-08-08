-- Add signature column to report_reviews table
ALTER TABLE public.report_reviews ADD COLUMN IF NOT EXISTS signature TEXT;
