BEGIN;

-- Assign a specific person (approver) to each workflow step.
-- approver_role stays as a fallback/legacy label; approver_id is the person.

ALTER TABLE public.workflow_steps
    ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES public.profiles(id);

-- Each approval record also carries the assigned person so the queue can be
-- routed by the person directly.
ALTER TABLE public.workflow_approvals
    ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_wf_approvals_approver
    ON workflow_approvals(approver_id, status);

COMMIT;
