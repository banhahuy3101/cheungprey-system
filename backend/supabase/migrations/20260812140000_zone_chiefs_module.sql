-- Add zone_chiefs module to module_configs

INSERT INTO module_configs (module_key, enabled, need_approval) VALUES
    ('zone_chiefs', true, false)
ON CONFLICT (module_key) DO NOTHING;
