-- Add custom step_label column to workflow_steps table
ALTER TABLE public.workflow_steps
ADD COLUMN IF NOT EXISTS step_label text DEFAULT '';
