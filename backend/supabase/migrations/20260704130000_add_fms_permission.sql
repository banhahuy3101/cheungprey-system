-- Add fms feature to existing role_permissions
UPDATE public.role_permissions
SET permissions = permissions || '{"fms": true}'::jsonb
WHERE role IN ('super_admin', 'admin', 'district_chief', 'commune_chief', 'commune_clerk', 'village_chief', 'recorder');

UPDATE public.role_permissions
SET permissions = permissions || '{"fms": false}'::jsonb
WHERE role = 'regular_user';
