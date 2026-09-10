-- Migration 045: Split User Management and Role Permissions sub-menus

-- 1. Update 00000000-0000-0000-0000-000000000081 to strictly represent User Management
UPDATE public.menu_items
SET
    title = 'គ្រប់គ្រងអ្នកប្រើប្រាស់',
    title_en = 'User Management',
    sub_module = 'users',
    feature_key = 'users',
    path = '/settings/users',
    icon = 'LuUsers',
    sort_order = 1,
    is_active = true,
    is_visible = true,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000081';

-- 2. Insert or update 00000000-0000-0000-0000-000000000091 for Role Permissions
INSERT INTO public.menu_items (
    id,
    parent_id,
    title,
    title_en,
    module_key,
    sub_module,
    feature_key,
    path,
    icon,
    sort_order,
    is_active,
    is_visible,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000091',
    '00000000-0000-0000-0000-000000000008',
    'សិទ្ធិតួនាទី',
    'Role Permissions',
    'settings',
    'role_permissions',
    'users',
    '/settings/role-permissions',
    'LuShield',
    2,
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    module_key = EXCLUDED.module_key,
    sub_module = EXCLUDED.sub_module,
    feature_key = EXCLUDED.feature_key,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    is_visible = EXCLUDED.is_visible,
    updated_at = NOW();

-- 3. Adjust sort orders for subsequent settings child items
UPDATE public.menu_items SET sort_order = 3, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000082';
UPDATE public.menu_items SET sort_order = 4, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000083';
UPDATE public.menu_items SET sort_order = 5, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000085';
UPDATE public.menu_items SET sort_order = 6, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000086';
UPDATE public.menu_items SET sort_order = 7, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000087';
UPDATE public.menu_items SET sort_order = 8, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000088';
UPDATE public.menu_items SET sort_order = 9, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000089';
