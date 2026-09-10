-- Migration: Seed sponsorships navigation item into public.menu_items
INSERT INTO public.menu_items (id, parent_id, title, title_en, module_key, sub_module, feature_key, path, icon, sort_order, is_active, is_visible)
VALUES
    ('00000000-0000-0000-0000-000000000045', NULL, 'តារាងឧបសម្ព័ន្ធ ថវិកា សម្ភារ', 'Sponsorships & Materials', 'sponsorships', '', 'sponsorships', '/sponsorships', 'LuScrollText', 5, true, true)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    module_key = EXCLUDED.module_key,
    feature_key = EXCLUDED.feature_key,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    is_visible = EXCLUDED.is_visible;
