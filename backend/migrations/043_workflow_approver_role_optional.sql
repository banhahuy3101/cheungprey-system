-- Make approver_role optional / default 'custom'
-- Approvals are strictly by assignment (zone chief) or by custom profile (approver_id), NOT by system role.
ALTER TABLE public.workflow_steps ALTER COLUMN approver_role DROP NOT NULL;
ALTER TABLE public.workflow_steps ALTER COLUMN approver_role SET DEFAULT 'custom';

ALTER TABLE public.workflow_approvals ALTER COLUMN approver_role DROP NOT NULL;
ALTER TABLE public.workflow_approvals ALTER COLUMN approver_role SET DEFAULT 'custom';
