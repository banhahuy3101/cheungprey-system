-- Add email to profiles (missing from the timestamped migration set, which caused
-- PGRST204 "Could not find the 'email' column of 'profiles'" on user creation).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users for existing profiles.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
