BEGIN;

INSERT INTO workflow_steps (module_key, step_order, approver_role, can_reject) VALUES
    ('finances', 1, 'commune_chief', true)
ON CONFLICT (module_key, step_order) DO NOTHING;

COMMIT;