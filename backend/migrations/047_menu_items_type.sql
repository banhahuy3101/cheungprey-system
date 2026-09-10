-- Migration 047: Add type column to menu_items (module, menu, tab, option)
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'menu';

-- Set top-level items (parent_id IS NULL) to 'module'
UPDATE public.menu_items
SET type = 'module'
WHERE parent_id IS NULL;

-- Set child items to 'menu'
UPDATE public.menu_items
SET type = 'menu'
WHERE parent_id IS NOT NULL AND (type IS NULL OR type = '' OR type = 'menu');

NOTIFY pgrst, 'reload schema';
