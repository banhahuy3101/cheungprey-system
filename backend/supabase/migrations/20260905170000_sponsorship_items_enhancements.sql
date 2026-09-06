-- ==============================================================================
-- Migration: Add usage_description and remarks columns to sponsorship_items
-- ==============================================================================

ALTER TABLE public.sponsorship_items
ADD COLUMN IF NOT EXISTS usage_description TEXT,
ADD COLUMN IF NOT EXISTS remarks TEXT;
