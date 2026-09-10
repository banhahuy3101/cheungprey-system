-- Migration: Create permission_modules table and seed all permission matrix modules, items, labels, icons, and action keys
CREATE TABLE IF NOT EXISTS public.permission_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_key TEXT NOT NULL,
    group_label TEXT NOT NULL,
    group_icon TEXT NOT NULL DEFAULT 'LuFolder',
    item_key TEXT NOT NULL,
    item_label TEXT NOT NULL,
    access_key TEXT DEFAULT '',
    actions JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permission_modules_item UNIQUE (group_key, item_key)
);

CREATE INDEX IF NOT EXISTS idx_permission_modules_active ON public.permission_modules(is_active, sort_order);

-- Seed Matrix Definitions
INSERT INTO public.permission_modules (group_key, group_label, group_icon, item_key, item_label, access_key, actions, sort_order, is_active)
VALUES
    -- 1. Members
    (
        'members',
        'គ្រប់គ្រងសមាជិក (Members Management)',
        'LuUsers',
        'members',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'members',
        '{"read": {"key": "members_read", "label": "មើលសមាជិក"}, "create": {"key": "members_create", "label": "បង្កើតសមាជិក"}, "update": {"key": "members_update", "label": "កែប្រែសមាជិក"}, "delete": {"key": "members_delete", "label": "លុបសមាជិក"}}'::jsonb,
        10,
        true
    ),
    (
        'members',
        'គ្រប់គ្រងសមាជិក (Members Management)',
        'LuUsers',
        'membership_sub',
        'សិទ្ធិសមាជិកភាព (Membership Features)',
        '',
        '{"read": {"key": "membership_dues", "label": "តារាងភាគទាន (Dues)"}, "create": {"key": "membership_cards", "label": "បោះពុម្ពប័ណ្ណ (Cards)"}, "update": {"key": "membership_write", "label": "សរសេរសមាជិក (Write)"}, "delete": {"key": "membership_delete", "label": "លុបសមាជិកភាព"}}'::jsonb,
        20,
        true
    ),
    (
        'members',
        'គ្រប់គ្រងសមាជិក (Members Management)',
        'LuUsers',
        'membership_admin_row',
        'រដ្ឋបាលសមាជិក (Membership Admin)',
        '',
        '{"update": {"key": "membership_admin", "label": "គ្រប់គ្រងសមាជិក"}}'::jsonb,
        30,
        true
    ),

    -- 2. Voters
    (
        'voters',
        'គ្រប់គ្រងអ្នកបោះឆ្នោត (Voters Management)',
        'LuUsers',
        'voters',
        'សិទ្ធិអ្នកបោះឆ្នោត',
        'voters',
        '{"read": {"key": "voters_read", "label": "មើលអ្នកបោះឆ្នោត"}, "create": {"key": "voters_create", "label": "បង្កើតអ្នកបោះឆ្នោត"}, "update": {"key": "voters_update", "label": "កែប្រែអ្នកបោះឆ្នោត"}, "delete": {"key": "voters_delete", "label": "លុបអ្នកបោះឆ្នោត"}}'::jsonb,
        40,
        true
    ),

    -- 3. Files
    (
        'files',
        'គ្រប់គ្រងឯកសារ (Files & Documents)',
        'LuFolderOpen',
        'files',
        'សិទ្ធិឯកសារ',
        'files',
        '{"read": {"key": "files_read", "label": "មើលឯកសារ"}, "create": {"key": "files_create", "label": "បង្កើតឯកសារ"}, "update": {"key": "files_update", "label": "កែប្រែឯកសារ"}, "delete": {"key": "files_delete", "label": "លុបឯកសារ"}}'::jsonb,
        50,
        true
    ),

    -- 4. Records
    (
        'records',
        'លិខិតស្នាម និងកំណត់ហេតុ (Records Log)',
        'LuBookOpen',
        'records',
        'សិទ្ធិកំណត់ត្រា',
        'records',
        '{"read": {"key": "records_read", "label": "មើលកំណត់ត្រា"}, "create": {"key": "records_create", "label": "បង្កើតកំណត់ត្រា"}, "update": {"key": "records_update", "label": "កែប្រែកំណត់ត្រា"}, "delete": {"key": "records_delete", "label": "លុបកំណត់ត្រា"}}'::jsonb,
        60,
        true
    ),

    -- 5. Reports
    (
        'reports',
        'គ្រប់គ្រងរបាយការណ៍ (Reports Management)',
        'LuScrollText',
        'reports',
        'សិទ្ធិរបាយការណ៍',
        'reports',
        '{"read": {"key": "reports_read", "label": "មើលរបាយការណ៍"}, "create": {"key": "reports_create", "label": "បង្កើតរបាយការណ៍"}, "update": {"key": "reports_update", "label": "កែប្រែរបាយការណ៍"}, "delete": {"key": "reports_delete", "label": "លុបរបាយការណ៍"}}'::jsonb,
        70,
        true
    ),

    -- 6. Performance
    (
        'performance',
        'លទ្ធផលការងារ (Performance Management)',
        'LuTrendingUp',
        'performance',
        'សិទ្ធិ Performance',
        'performance',
        '{"read": {"key": "performance_read", "label": "មើល Performance"}, "create": {"key": "performance_create", "label": "បង្កើត Performance"}, "update": {"key": "performance_update", "label": "កែប្រែ Performance"}, "delete": {"key": "performance_delete", "label": "លុប Performance"}}'::jsonb,
        80,
        true
    ),
    (
        'performance',
        'លទ្ធផលការងារ (Performance Management)',
        'LuTrendingUp',
        'performance_admin_row',
        'គ្រប់គ្រង Performance (Admin)',
        '',
        '{"update": {"key": "performance_admin", "label": "គ្រប់គ្រង Performance"}}'::jsonb,
        90,
        true
    ),

    -- 7. Sponsorships
    (
        'sponsorships',
        'ឧបត្ថម្ភ និងឧបសម្ព័ន្ធ (Sponsorships)',
        'LuHeartHandshake',
        'sponsorships',
        'សិទ្ធិឧបត្ថម្ភ (Sponsorships CRUD)',
        'sponsorships',
        '{"read": {"key": "sponsorships_read", "label": "មើលឧបត្ថម្ភ"}, "create": {"key": "sponsorships_create", "label": "បង្កើតឧបត្ថម្ភ"}, "update": {"key": "sponsorships_update", "label": "កែប្រែឧបត្ថម្ភ"}, "delete": {"key": "sponsorships_delete", "label": "លុបឧបត្ថម្ភ"}}'::jsonb,
        100,
        true
    ),

    -- 8. Users
    (
        'users',
        'គ្រប់គ្រងអ្នកប្រើប្រាស់ (Users Management)',
        'LuUserCheck',
        'users',
        'សិទ្ធិអ្នកប្រើប្រាស់',
        'users',
        '{"read": {"key": "users_read", "label": "មើលអ្នកប្រើប្រាស់"}, "create": {"key": "users_create", "label": "បង្កើតអ្នកប្រើប្រាស់"}, "update": {"key": "users_update", "label": "កែប្រែអ្នកប្រើប្រាស់"}, "delete": {"key": "users_delete", "label": "លុបអ្នកប្រើប្រាស់"}}'::jsonb,
        110,
        true
    ),

    -- 9. System Modules
    (
        'system',
        'ម៉ូឌុលប្រព័ន្ធ (System Modules)',
        'LuSettings',
        'dashboard',
        'ទំព័រដើម (Dashboard)',
        'dashboard',
        '{"read": {"key": "dashboard", "label": "ទំព័រដើម"}}'::jsonb,
        120,
        true
    ),
    (
        'system',
        'ម៉ូឌុលប្រព័ន្ធ (System Modules)',
        'LuSettings',
        'settings',
        'ការកំណត់ប្រព័ន្ធ (Settings)',
        'settings',
        '{"read": {"key": "settings", "label": "ការកំណត់"}}'::jsonb,
        130,
        true
    ),
    (
        'system',
        'ម៉ូឌុលប្រព័ន្ធ (System Modules)',
        'LuSettings',
        'technical',
        'ជំនួយបច្ចេកទេស (Technical)',
        'technical',
        '{"read": {"key": "technical", "label": "Technical"}}'::jsonb,
        140,
        true
    )
ON CONFLICT (group_key, item_key) DO UPDATE SET
    group_label = EXCLUDED.group_label,
    group_icon = EXCLUDED.group_icon,
    item_label = EXCLUDED.item_label,
    access_key = EXCLUDED.access_key,
    actions = EXCLUDED.actions,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

ALTER TABLE public.permission_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read permission_modules" ON public.permission_modules;
CREATE POLICY "Anyone authenticated can read permission_modules"
    ON public.permission_modules FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin can manage permission_modules" ON public.permission_modules;
CREATE POLICY "Admin can manage permission_modules"
    ON public.permission_modules FOR ALL
    USING (true);

NOTIFY pgrst, 'reload schema';
