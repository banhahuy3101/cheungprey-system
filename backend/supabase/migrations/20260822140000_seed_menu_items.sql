-- Migration: Seed existing system navigation modules, sub-modules, features, and child items into public.menu_items
INSERT INTO public.menu_items (id, parent_id, title, title_en, module_key, sub_module, feature_key, path, icon, sort_order, is_active, is_visible)
VALUES
    -- 1. Dashboard
    ('00000000-0000-0000-0000-000000000001', NULL, 'ផ្ទាំងបញ្ជា', 'Dashboard', 'dashboard', '', '', '/', 'LuLayoutDashboard', 1, true, true),

    -- 2. Membership Module (Parent)
    ('00000000-0000-0000-0000-000000000002', NULL, 'គ្រប់គ្រងសមាជិក', 'Membership Management', 'membership', '', 'members', '/membership', 'LuUsers', 2, true, true),

    -- 3. Voters Module
    ('00000000-0000-0000-0000-000000000003', NULL, 'បញ្ជីឈ្មោះអ្នកបោះឆ្នោត', 'Voters List', 'voters', '', 'voters', '/voters', 'LuVote', 3, true, true),

    -- 4. Files Module
    ('00000000-0000-0000-0000-000000000004', NULL, 'ឯកសារ និងប្រព័ន្ធតម្កល់', 'Files & Storage', 'files', '', 'files', '/files', 'LuFolder', 4, true, true),

    -- 5. Records Module
    ('00000000-0000-0000-0000-000000000005', NULL, 'លិខិតស្នាម និងកំណត់ហេតុ', 'Records & Minutes', 'records', '', 'records', '/records', 'LuBookOpen', 5, true, true),

    -- 6. Reports Module
    ('00000000-0000-0000-0000-000000000006', NULL, 'របាយការណ៍', 'Reports', 'reports', '', 'reports', '/reports', 'LuFileText', 6, true, true),

    -- 7. Performance Module
    ('00000000-0000-0000-0000-000000000007', NULL, 'សូចនាករសមិទ្ធកម្ម', 'Performance Indicators', 'performance', '', 'performance', '/performance', 'LuTarget', 7, true, true),

    -- 8. Settings Module (Parent)
    ('00000000-0000-0000-0000-000000000008', NULL, 'ការកំណត់ប្រព័ន្ធ', 'System Settings', 'settings', '', 'settings', '/settings', 'LuSettings', 8, true, true)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    module_key = EXCLUDED.module_key,
    feature_key = EXCLUDED.feature_key,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Child items for Membership Module
INSERT INTO public.menu_items (id, parent_id, title, title_en, module_key, sub_module, feature_key, path, icon, sort_order, is_active, is_visible)
VALUES
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'បញ្ជីសមាជិក', 'Members List', 'membership', 'list', 'members', '/membership', 'LuUsers', 1, true, true),
    ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000002', 'បញ្ជីផ្ទៀងផ្ទាត់ពាក្យសុំ', 'Registration Queue', 'membership', 'queue', 'members', '/membership/registrations', 'LuClipboardCheck', 3, true, true)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    feature_key = EXCLUDED.feature_key,
    path = EXCLUDED.path;

-- Child items for Settings Module
INSERT INTO public.menu_items (id, parent_id, title, title_en, module_key, sub_module, feature_key, path, icon, sort_order, is_active, is_visible)
VALUES
    ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000008', 'គ្រប់គ្រងអ្នកប្រើប្រាស់ និងសិទ្ធិតួនាទី', 'Users & Role Permissions', 'settings', 'users', 'users', '/settings/users', 'LuUsers', 1, true, true),
    ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000008', 'អ្នកអនុម័ត', 'Module Workflow Approvers', 'settings', 'workflow', 'technical', '/settings/modules/workflow', 'LuSettings2', 2, true, true),
    ('00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000008', 'គ្រប់គ្រងម៉ឺនុយប្រព័ន្ធ', 'Menu Items Management', 'settings', 'menu_items', 'technical', '/settings/menu-items', 'LuLayers', 3, true, true),
    ('00000000-0000-0000-0000-000000000084', '00000000-0000-0000-0000-000000000008', 'កាលភាគសមិទ្ធកម្ម', 'Performance Periods', 'settings', 'performance_period', 'performance_admin', '/settings/performance_period', 'LuCalendar', 4, true, true),
    ('00000000-0000-0000-0000-000000000085', '00000000-0000-0000-0000-000000000008', 'ទម្រង់របាយការណ៍', 'Report Templates', 'settings', 'report_templates', 'reports', '/settings/report-templates', 'LuFileSpreadsheet', 5, true, true),
    ('00000000-0000-0000-0000-000000000086', '00000000-0000-0000-0000-000000000008', 'ការកំណត់បច្ចេកទេស', 'Technical Settings', 'settings', 'technical', 'technical', '/settings/technical', 'LuWrench', 6, true, true),
    ('00000000-0000-0000-0000-000000000087', '00000000-0000-0000-0000-000000000008', 'កំណត់ប្រធានភូមិសាស្ត្រ', 'Zone Chiefs Assignment', 'settings', 'zone_chiefs', 'users', '/settings/zone-chiefs', 'LuMapPin', 7, true, true),
    ('00000000-0000-0000-0000-000000000088', '00000000-0000-0000-0000-000000000008', 'គ្រប់គ្រង Performance', 'Performance Config', 'settings', 'performance', 'performance_admin', '/settings/performance', 'LuTarget', 8, true, true),
    ('00000000-0000-0000-0000-000000000089', '00000000-0000-0000-0000-000000000008', 'ការងារ Cron & ថែទាំប្រព័ន្ធ', 'Cron & System Maintenance', 'settings', 'cron', 'technical', '/settings/cron', 'LuClock', 9, true, true),
    ('00000000-0000-0000-0000-000000000090', '00000000-0000-0000-0000-000000000086', 'ការកំណត់ប្រព័ន្ធ', 'System Technical Config', 'settings', 'technical_system', 'technical', '/settings/technical/system', 'LuSliders', 1, true, true)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    feature_key = EXCLUDED.feature_key,
    path = EXCLUDED.path;
