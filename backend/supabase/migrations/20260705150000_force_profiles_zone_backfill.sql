-- Force backfill profiles.zone_code (and commune_id where missing) for finance zone access.

-- From existing commune / village links
UPDATE public.profiles p
SET zone_code = LEFT(c.code, 6), updated_at = NOW()
FROM public.communes c
WHERE p.commune_id = c.id
  AND (p.zone_code IS NULL OR p.zone_code = '');

UPDATE public.profiles p
SET zone_code = LEFT(v.code, 6), updated_at = NOW()
FROM public.villages v
WHERE p.village_id = v.id
  AND (p.zone_code IS NULL OR p.zone_code = '');

-- District-scoped roles
UPDATE public.profiles
SET zone_code = '0303', updated_at = NOW()
WHERE role IN ('super_admin', 'admin', 'district_chief')
  AND (zone_code IS NULL OR zone_code = '');

-- Commune-scoped roles: attach Sampong Chey (030306) when zone still missing
UPDATE public.profiles p
SET
  commune_id = COALESCE(p.commune_id, c.id),
  zone_code = '030306',
  updated_at = NOW()
FROM public.communes c
WHERE LEFT(c.code, 6) = '030306'
  AND p.role IN ('commune_chief', 'commune_clerk', 'village_chief', 'recorder')
  AND (p.zone_code IS NULL OR p.zone_code = '');

-- Catch-all for any remaining profiles
UPDATE public.profiles
SET zone_code = '030306', updated_at = NOW()
WHERE zone_code IS NULL OR zone_code = '';

-- Ensure finances permission (keeps legacy fms key from prior migration)
UPDATE public.role_permissions
SET permissions = permissions || '{"finances": true}'::jsonb
WHERE role IN ('super_admin', 'admin', 'district_chief', 'commune_chief', 'commune_clerk', 'village_chief', 'recorder')
  AND COALESCE(permissions->>'finances', 'false') <> 'true';
å