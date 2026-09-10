-- ==============================================================================
-- Migration: Remove default 'ទូទៅ' from section_group in sponsorship_records
-- ==============================================================================

ALTER TABLE public.sponsorship_records ALTER COLUMN section_group DROP DEFAULT;
ALTER TABLE public.sponsorship_records ALTER COLUMN section_group SET DEFAULT '';

-- Clean up existing records that defaulted to 'ទូទៅ'
UPDATE public.sponsorship_records SET section_group = '' WHERE section_group = 'ទូទៅ';
