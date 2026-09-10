-- Add can_edit column to workflow_steps and workflow_approvals
ALTER TABLE public.workflow_steps
ADD COLUMN IF NOT EXISTS can_edit boolean DEFAULT false;

ALTER TABLE public.workflow_approvals
ADD COLUMN IF NOT EXISTS can_edit boolean DEFAULT false;
