-- =============================================================================
-- Migration: sync_uat_to_production.sql
-- Description: Consolidated migration to sync missing tables and columns from UAT to Production.
-- Includes:
--   1. 042: workflow_steps.can_edit, workflow_approvals.can_edit
--   2. 044: workflow_steps.zone_level
--   3. 046: menu_items.description
--   4. 047: menu_items.type
--   5. 048: permission_modules table, indexes, seeds & RLS
--   6. 049: sponsorship_items.zone_code & created_by
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Workflow Can Edit (042)
-- -----------------------------------------------------------------------------
ALTER TABLE public.workflow_steps
ADD COLUMN IF NOT EXISTS can_edit boolean DEFAULT false;

ALTER TABLE public.workflow_approvals
ADD COLUMN IF NOT EXISTS can_edit boolean DEFAULT false;

-- -----------------------------------------------------------------------------
-- 2. Workflow Steps Zone Level (044)
-- -----------------------------------------------------------------------------
ALTER TABLE public.workflow_steps
ADD COLUMN IF NOT EXISTS zone_level text;

-- -----------------------------------------------------------------------------
-- 3. Menu Items Description (046)
-- -----------------------------------------------------------------------------
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

UPDATE public.menu_items
SET description = 'គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ កំណត់តួនាទី និងពាក្យសម្ងាត់ប្រព័ន្ធ (User Management)'
WHERE id = '00000000-0000-0000-0000-000000000081';

UPDATE public.menu_items
SET description = 'កំណត់សិទ្ធិលម្អិតតាមតួនាទី និងម៉ូឌុល (Role & Permission Matrix)'
WHERE id = '00000000-0000-0000-0000-000000000091';

UPDATE public.menu_items
SET description = 'បើក/បិទការអនុម័ត និងកំណត់ជំហានអនុម័តតាមម៉ូឌុល'
WHERE id = '00000000-0000-0000-0000-000000000082';

UPDATE public.menu_items
SET description = 'រៀបចំ ម៉ូឌុល ម៉ូឌុលរង លក្ខណៈពិសេស និងម៉ឺនុយកូនតាមឋានានុក្រម'
WHERE id = '00000000-0000-0000-0000-000000000083';

UPDATE public.menu_items
SET description = 'បញ្ចូល និងគ្រប់គ្រងគំរូ .docx / .html សម្រាប់របាយការណ៍'
WHERE id = '00000000-0000-0000-0000-000000000085';

UPDATE public.menu_items
SET description = 'System settings — ពាក្យសម្ងាត់ដើម និងការកំណត់ប្រព័ន្ធ'
WHERE id = '00000000-0000-0000-0000-000000000086';

UPDATE public.menu_items
SET description = 'ចាត់តាំងប្រធានខេត្ត ស្រុក ឃុំ ភូមិ'
WHERE id = '00000000-0000-0000-0000-000000000087';

UPDATE public.menu_items
SET description = 'គ្រប់គ្រងដែន ចំណុចរង សូចនាករ និងរយៈពេល'
WHERE id = '00000000-0000-0000-0000-000000000088';

UPDATE public.menu_items
SET description = 'ពិនិត្យស្ថានភាព Cron nightly, ដំណើរការថែទាំ Supabase និងកំណត់ហេតុ'
WHERE id = '00000000-0000-0000-0000-000000000089';

-- -----------------------------------------------------------------------------
-- 4. Menu Items Type (047)
-- -----------------------------------------------------------------------------
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'menu';

UPDATE public.menu_items
SET type = 'module'
WHERE parent_id IS NULL;

UPDATE public.menu_items
SET type = 'menu'
WHERE parent_id IS NOT NULL AND (type IS NULL OR type = '' OR type = 'menu');

-- -----------------------------------------------------------------------------
-- 5. Permission Modules Table & Matrix (048)
-- -----------------------------------------------------------------------------
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
        '{"export": {"key": "members_export", "label": "ទាញយកទិន្នន័យ (Export)"}, "import": {"key": "members_import", "label": "បញ្ចូលទិន្នន័យ (Import)"}, "print": {"key": "members_print", "label": "បោះពុម្ពប័ណ្ណសមាជិក (Print Card)"}, "stats": {"key": "members_stats", "label": "មើលស្ថិតិសមាជិក (View Stats)"}}'::jsonb,
        20,
        true
    ),
    -- 2. Voters
    (
        'voters',
        'គ្រប់គ្រងអ្នកបោះឆ្នោត (Voters Management)',
        'LuVote',
        'voters',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'voters',
        '{"read": {"key": "voters_read", "label": "មើលបញ្ជីអ្នកបោះឆ្នោត"}, "create": {"key": "voters_create", "label": "បង្កើតអ្នកបោះឆ្នោត"}, "update": {"key": "voters_update", "label": "កែប្រែអ្នកបោះឆ្នោត"}, "delete": {"key": "voters_delete", "label": "លុបអ្នកបោះឆ្នោត"}}'::jsonb,
        30,
        true
    ),
    (
        'voters',
        'គ្រប់គ្រងអ្នកបោះឆ្នោត (Voters Management)',
        'LuVote',
        'voters_sub',
        'សិទ្ធិអ្នកបោះឆ្នោត (Voter Features)',
        '',
        '{"export": {"key": "voters_export", "label": "ទាញយកទិន្នន័យ (Export)"}, "import": {"key": "voters_import", "label": "បញ្ចូលទិន្នន័យ (Import)"}, "stats": {"key": "voters_stats", "label": "មើលស្ថិតិអ្នកបោះឆ្នោត"}}'::jsonb,
        40,
        true
    ),
    -- 3. Finances
    (
        'finances',
        'គ្រប់គ្រងហិរញ្ញវត្ថុ (Finances Management)',
        'LuDollarSign',
        'finances',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'finances',
        '{"read": {"key": "finances_read", "label": "មើលហិរញ្ញវត្ថុ"}, "create": {"key": "finances_create", "label": "បង្កើតប្រតិបត្តិការ"}, "update": {"key": "finances_update", "label": "កែប្រែប្រតិបត្តិការ"}, "delete": {"key": "finances_delete", "label": "លុបប្រតិបត្តិការ"}}'::jsonb,
        50,
        true
    ),
    (
        'finances',
        'គ្រប់គ្រងហិរញ្ញវត្ថុ (Finances Management)',
        'LuDollarSign',
        'finances_sub',
        'សិទ្ធិហិរញ្ញវត្ថុ (Finance Features)',
        '',
        '{"export": {"key": "finances_export", "label": "ទាញយករបាយការណ៍"}, "approve": {"key": "finances_approve", "label": "អនុម័តប្រតិបត្តិការ"}, "reports": {"key": "finances_reports", "label": "មើលរបាយការណ៍ហិរញ្ញវត្ថុ"}}'::jsonb,
        60,
        true
    ),
    -- 4. Files
    (
        'files',
        'គ្រប់គ្រងឯកសារ (Files Management)',
        'LuFileText',
        'files',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'files',
        '{"read": {"key": "files_read", "label": "មើលឯកសារ"}, "upload": {"key": "files_upload", "label": "បញ្ចូលឯកសារ (Upload)"}, "download": {"key": "files_download", "label": "ទាញយកឯកសារ (Download)"}, "delete": {"key": "files_delete", "label": "លុបឯកសារ"}}'::jsonb,
        70,
        true
    ),
    -- 5. Records / Sponsorships
    (
        'records',
        'គ្រប់គ្រងកំណត់ត្រា និងការឧបត្ថម្ភ (Records & Sponsorships)',
        'LuGift',
        'records',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'records',
        '{"read": {"key": "records_read", "label": "មើលកំណត់ត្រា"}, "create": {"key": "records_create", "label": "បង្កើតកំណត់ត្រា"}, "update": {"key": "records_update", "label": "កែប្រែកំណត់ត្រា"}, "delete": {"key": "records_delete", "label": "លុបកំណត់ត្រា"}}'::jsonb,
        80,
        true
    ),
    (
        'records',
        'គ្រប់គ្រងកំណត់ត្រា និងការឧបត្ថម្ភ (Records & Sponsorships)',
        'LuGift',
        'sponsorships',
        'សិទ្ធិការឧបត្ថម្ភ (Sponsorships Module)',
        'sponsorships',
        '{"read": {"key": "sponsorships_read", "label": "មើលការឧបត្ថម្ភ"}, "create": {"key": "sponsorships_create", "label": "បង្កើតការឧបត្ថម្ភ"}, "update": {"key": "sponsorships_update", "label": "កែប្រែការឧបត្ថម្ភ"}, "delete": {"key": "sponsorships_delete", "label": "លុបការឧបត្ថម្ភ"}, "review": {"key": "sponsorships_review", "label": "ពិនិត្យការឧបត្ថម្ភ"}, "approve": {"key": "sponsorships_approve", "label": "អនុម័តការឧបត្ថម្ភ"}, "export": {"key": "sponsorships_export", "label": "ទាញយករបាយការណ៍"}}'::jsonb,
        90,
        true
    ),
    -- 6. Reports
    (
        'reports',
        'របាយការណ៍ (Reports)',
        'LuFileSpreadsheet',
        'reports',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'reports',
        '{"read": {"key": "reports_read", "label": "មើលរបាយការណ៍"}, "create": {"key": "reports_create", "label": "បង្កើតរបាយការណ៍"}, "export": {"key": "reports_export", "label": "ទាញយករបាយការណ៍"}}'::jsonb,
        100,
        true
    ),
    -- 7. Performance
    (
        'performance',
        'ការវាយតម្លៃការងារ (Performance)',
        'LuTrendingUp',
        'performance',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'performance',
        '{"read": {"key": "performance_read", "label": "មើលការវាយតម្លៃ"}, "submit": {"key": "performance_submit", "label": "ដាក់ស្នើការវាយតម្លៃ"}, "approve": {"key": "performance_approve", "label": "អនុម័តការវាយតម្លៃ"}, "admin": {"key": "performance_admin", "label": "គ្រប់គ្រងប្រព័ន្ធវាយតម្លៃ"}}'::jsonb,
        110,
        true
    ),
    -- 8. Users
    (
        'users',
        'អ្នកប្រើប្រាស់ និងសិទ្ធិ (Users & Permissions)',
        'LuShieldCheck',
        'users',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'users',
        '{"read": {"key": "users_read", "label": "មើលអ្នកប្រើប្រាស់"}, "create": {"key": "users_create", "label": "បង្កើតអ្នកប្រើប្រាស់"}, "update": {"key": "users_update", "label": "កែប្រែអ្នកប្រើប្រាស់"}, "delete": {"key": "users_delete", "label": "លុបអ្នកប្រើប្រាស់"}}'::jsonb,
        120,
        true
    ),
    (
        'users',
        'អ្នកប្រើប្រាស់ និងសិទ្ធិ (Users & Permissions)',
        'LuShieldCheck',
        'roles_matrix',
        'ម៉ាទ្រីសសិទ្ធិ (Permission Matrix)',
        'settings',
        '{"read": {"key": "roles_read", "label": "មើលតួនាទី និងសិទ្ធិ"}, "update": {"key": "roles_update", "label": "កែប្រែសិទ្ធិតួនាទី"}}'::jsonb,
        130,
        true
    ),
    -- 9. Settings
    (
        'settings',
        'ការកំណត់ប្រព័ន្ធ (System Settings)',
        'LuSettings',
        'settings',
        'សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)',
        'settings',
        '{"read": {"key": "settings_read", "label": "មើលការកំណត់"}, "update": {"key": "settings_update", "label": "កែប្រែការកំណត់"}}'::jsonb,
        140,
        true
    ),
    (
        'settings',
        'ការកំណត់ប្រព័ន្ធ (System Settings)',
        'LuSettings',
        'settings_features',
        'លក្ខណៈពិសេសកម្រិតខ្ពស់ (Advanced Features)',
        '',
        '{"modules": {"key": "settings_modules", "label": "កំណត់ម៉ូឌុល"}, "templates": {"key": "settings_templates", "label": "កំណត់ទម្រង់"}, "technical": {"key": "technical", "label": "ការកំណត់បច្ចេកទេស"}}'::jsonb,
        150,
        true
    )
ON CONFLICT (group_key, item_key) DO UPDATE
SET group_label = EXCLUDED.group_label,
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
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin can manage permission_modules" ON public.permission_modules;
CREATE POLICY "Admin can manage permission_modules"
    ON public.permission_modules FOR ALL
    TO authenticated
    USING (public.get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (public.get_user_role() IN ('super_admin', 'admin'));

-- -----------------------------------------------------------------------------
-- 6. Sponsorship Items Zone Code (049)
-- -----------------------------------------------------------------------------
ALTER TABLE public.sponsorship_items
ADD COLUMN IF NOT EXISTS zone_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sponsorship_items_zone_code ON public.sponsorship_items(zone_code);
CREATE INDEX IF NOT EXISTS idx_sponsorship_items_created_by ON public.sponsorship_items(created_by);

UPDATE public.sponsorship_items si
SET 
    created_by = sr.created_by,
    zone_code = COALESCE(prof.zone_code, '0303')
FROM public.sponsorship_records sr
LEFT JOIN public.profiles prof ON sr.created_by = prof.id
WHERE si.record_id = sr.id
  AND (si.zone_code IS NULL OR si.zone_code = '');

UPDATE public.sponsorship_items
SET zone_code = '0303'
WHERE zone_code IS NULL OR zone_code = '';

-- -----------------------------------------------------------------------------
-- Refresh PostgREST Schema Cache
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
