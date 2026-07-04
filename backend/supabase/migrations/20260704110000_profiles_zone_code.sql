-- Add zone_code to profiles and backfill from commune hierarchy
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zone_code VARCHAR(8) REFERENCES public.geographic_zones(zone_code);

UPDATE public.profiles p
SET zone_code = LEFT(c.code, 6)
FROM public.communes c
WHERE p.commune_id = c.id
  AND (p.zone_code IS NULL OR p.zone_code = '');

UPDATE public.profiles p
SET zone_code = LEFT(v.code, 6)
FROM public.villages v
WHERE p.village_id = v.id
  AND (p.zone_code IS NULL OR p.zone_code = '');

CREATE INDEX IF NOT EXISTS idx_profiles_zone_code ON public.profiles(zone_code);
