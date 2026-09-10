-- ==============================================================================
-- Migration: Drop item expense label from sponsorship_items table
-- ==============================================================================

ALTER TABLE public.sponsorship_items DROP COLUMN IF EXISTS is_expense_label;
ALTER TABLE public.sponsorship_items DROP COLUMN IF EXISTS expense_label;
