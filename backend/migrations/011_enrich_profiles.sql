-- Enrich profiles with email, zone_code, phone, and fix missing timestamps.
-- Also create profiles for auth users that have no profile row.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS zone_code VARCHAR(8) REFERENCES public.geographic_zones(zone_code);

-- Backfill email + timestamps from auth.users
UPDATE public.profiles p
SET
  email = COALESCE(NULLIF(p.email, ''), u.email),
  created_at = CASE
    WHEN p.created_at IS NULL OR p.created_at < TIMESTAMPTZ '2000-01-01'
      THEN u.created_at
    ELSE p.created_at
  END,
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id;

-- Enrich existing profiles (Cheung Prey district = 0303)
UPDATE public.profiles
SET
  full_name = 'Administrator',
  phone_number = COALESCE(phone_number, '012888001'),
  zone_code = COALESCE(zone_code, '0303'),
  updated_at = NOW()
WHERE id = 'b32e53bd-dff6-4665-952f-1265221a1a0b';

UPDATE public.profiles
SET
  full_name = 'Test User',
  phone_number = COALESCE(phone_number, '012888002'),
  zone_code = COALESCE(zone_code, '030306'),
  updated_at = NOW()
WHERE id = '54bb0d11-503d-4fad-ac7e-7d12a4b723fa';

UPDATE public.profiles
SET
  full_name = 'Ban Ha Huy',
  phone_number = COALESCE(phone_number, '012888003'),
  zone_code = COALESCE(zone_code, '030306'),
  updated_at = NOW()
WHERE id = 'df2208f5-54db-4cfc-a381-7648402bd2be';

-- Create profiles for auth users missing a profile row
INSERT INTO public.profiles (id, full_name, email, phone_number, zone_code, role, created_at, updated_at)
SELECT
  u.id,
  INITCAP(REPLACE(SPLIT_PART(u.email, '@', 1), '.', ' ')),
  u.email,
  '01288800' || (ROW_NUMBER() OVER (ORDER BY u.created_at))::TEXT,
  '030306',
  'recorder'::user_role,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_zone_code ON public.profiles(zone_code);
