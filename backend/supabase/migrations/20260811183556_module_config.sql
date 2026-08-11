BEGIN;

CREATE TABLE IF NOT EXISTS module_configs (
    module_key    TEXT PRIMARY KEY,
    enabled       BOOLEAN NOT NULL DEFAULT true,
    need_approval BOOLEAN NOT NULL DEFAULT false,
    settings      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key    TEXT NOT NULL REFERENCES module_configs(module_key) ON DELETE CASCADE,
    step_order    INT NOT NULL,
    approver_role TEXT NOT NULL,
    can_reject    BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, step_order)
);

CREATE TABLE IF NOT EXISTS workflow_approvals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key    TEXT NOT NULL,
    item_id       UUID NOT NULL,
    step_order    INT NOT NULL DEFAULT 1,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by   UUID REFERENCES profiles(id),
    approved_at   TIMESTAMPTZ,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, item_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_wf_approvals_queue
    ON workflow_approvals(module_key, step_order, status);

CREATE INDEX IF NOT EXISTS idx_wf_approvals_item
    ON workflow_approvals(module_key, item_id);

INSERT INTO module_configs (module_key, enabled, need_approval) VALUES
    ('dashboard',   true,  false),
    ('settings',    true,  false),
    ('membership',  true,  true),
    ('voters',      true,  false),
    ('finances',    false, true),
    ('files',       true,  false),
    ('records',     true,  false),
    ('reports',     true,  true),
    ('performance', true,  false)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO workflow_steps (module_key, step_order, approver_role, can_reject) VALUES
    ('membership', 1, 'commune_chief', true),
    ('membership', 2, 'district_chief', true),
    ('reports',    1, 'district_chief', true)
ON CONFLICT (module_key, step_order) DO NOTHING;

COMMIT;
