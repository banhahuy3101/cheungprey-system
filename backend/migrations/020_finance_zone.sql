-- Finance transactions scoped to geographic / organizational zones
ALTER TABLE public.party_finances
  ADD COLUMN IF NOT EXISTS zone_code VARCHAR(8) REFERENCES public.geographic_zones(zone_code),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

UPDATE public.party_finances
SET zone_code = '0303'
WHERE zone_code IS NULL;

ALTER TABLE public.party_finances
  ALTER COLUMN zone_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_zone ON public.party_finances(zone_code);
CREATE INDEX IF NOT EXISTS idx_finance_created_by ON public.party_finances(created_by);
