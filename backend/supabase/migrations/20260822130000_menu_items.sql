-- Migration: Create menu_items table to manage dynamic navigation hierarchy, modules, sub-modules, features, and child menu items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id     UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    title_en      TEXT DEFAULT '',
    module_key    TEXT DEFAULT '',
    sub_module    TEXT DEFAULT '',
    feature_key   TEXT DEFAULT '',
    path          TEXT DEFAULT '',
    icon          TEXT DEFAULT '',
    sort_order    INT NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    is_visible    BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_parent ON public.menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_module ON public.menu_items(module_key);
CREATE INDEX IF NOT EXISTS idx_menu_items_sub_module ON public.menu_items(sub_module);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON public.menu_items(sort_order ASC);
