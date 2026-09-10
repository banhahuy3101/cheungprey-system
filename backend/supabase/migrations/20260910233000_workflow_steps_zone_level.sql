-- Migration: Add zone_level to workflow_steps
ALTER TABLE public.workflow_steps
ADD COLUMN IF NOT EXISTS zone_level text;
