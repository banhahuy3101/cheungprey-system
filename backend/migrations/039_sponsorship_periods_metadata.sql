-- ==============================================================================
-- Migration: Add Materials Summary to Sponsorship Periods
-- ==============================================================================

ALTER TABLE public.sponsorship_periods ADD COLUMN IF NOT EXISTS materials_summary TEXT;
