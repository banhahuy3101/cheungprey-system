-- Migration 049: Add zone_code and created_by to sponsorship_items for zone-level item isolation
-- Description: Enables users in specific zones (e.g. Village, Commune) to add and view only their own zone's items within shared donor records.

-- 1. Add zone_code and created_by to sponsorship_items
ALTER TABLE public.sponsorship_items
ADD COLUMN IF NOT EXISTS zone_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sponsorship_items_zone_code ON public.sponsorship_items(zone_code);
CREATE INDEX IF NOT EXISTS idx_sponsorship_items_created_by ON public.sponsorship_items(created_by);

-- 3. Backfill existing items with record creator and profile zone code (defaulting to Cheung Prey district '0303')
UPDATE public.sponsorship_items si
SET 
    created_by = sr.created_by,
    zone_code = COALESCE(prof.zone_code, '0303')
FROM public.sponsorship_records sr
LEFT JOIN public.profiles prof ON sr.created_by = prof.id
WHERE si.record_id = sr.id
  AND (si.zone_code IS NULL OR si.zone_code = '');

-- Default any remaining orphan items to '0303' (District level)
UPDATE public.sponsorship_items
SET zone_code = '0303'
WHERE zone_code IS NULL OR zone_code = '';
