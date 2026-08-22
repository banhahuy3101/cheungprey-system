-- Migration: Add date_of_birth and roles array to profiles, backfill from members
-- Timestamp: 20260822220000

BEGIN;

-- 1. Add date_of_birth column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 2. Add roles JSONB array column (multi-role support)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;

-- 3. Backfill roles array from single role field (for all existing users)
UPDATE public.profiles
SET roles = COALESCE(
  CASE
    WHEN roles IS NULL OR roles = '[]'::jsonb THEN
      CASE
        WHEN role IS NOT NULL AND role != '' THEN jsonb_build_array(role)
        ELSE '[]'::jsonb
      END
    ELSE roles
  END,
  '[]'::jsonb
)
WHERE roles IS NULL OR roles = '[]'::jsonb;

-- 4. Backfill date_of_birth from members table (match by email)
UPDATE public.profiles p
SET date_of_birth = m.date_of_birth::date
FROM public.members m
WHERE LOWER(p.email) = LOWER(m.email)
  AND m.date_of_birth IS NOT NULL
  AND (p.date_of_birth IS NULL);

-- 5. Backfill zone_code from members.registered_village_code (match by email, only if profile zone is null)
UPDATE public.profiles p
SET zone_code = m.registered_village_code
FROM public.members m
WHERE LOWER(p.email) = LOWER(m.email)
  AND m.registered_village_code IS NOT NULL
  AND m.registered_village_code != ''
  AND (p.zone_code IS NULL OR p.zone_code = '');

-- 6. Backfill date_of_birth from members by matching phone_number (for users without email match)
UPDATE public.profiles p
SET date_of_birth = m.date_of_birth::date
FROM public.members m
WHERE p.phone_number IS NOT NULL
  AND p.phone_number != ''
  AND REPLACE(REPLACE(REPLACE(p.phone_number, ' ', ''), '-', ''), '+', '') =
      REPLACE(REPLACE(REPLACE(m.phone_number, ' ', ''), '-', ''), '+', '')
  AND m.date_of_birth IS NOT NULL
  AND p.date_of_birth IS NULL;

-- 7. Backfill zone_code from members by matching phone_number
UPDATE public.profiles p
SET zone_code = m.registered_village_code
FROM public.members m
WHERE p.phone_number IS NOT NULL
  AND p.phone_number != ''
  AND REPLACE(REPLACE(REPLACE(p.phone_number, ' ', ''), '-', ''), '+', '') =
      REPLACE(REPLACE(REPLACE(m.phone_number, ' ', ''), '-', ''), '+', '')
  AND m.registered_village_code IS NOT NULL
  AND m.registered_village_code != ''
  AND (p.zone_code IS NULL OR p.zone_code = '');

COMMIT;
