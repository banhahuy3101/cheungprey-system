-- Add snapshot metadata columns to workflow_approvals table so created items are 100% immutable
ALTER TABLE public.workflow_approvals
ADD COLUMN IF NOT EXISTS step_label text DEFAULT '',
ADD COLUMN IF NOT EXISTS approver_role text DEFAULT '',
ADD COLUMN IF NOT EXISTS can_reject boolean DEFAULT true;
