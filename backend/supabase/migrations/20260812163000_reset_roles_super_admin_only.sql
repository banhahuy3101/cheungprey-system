-- Migration: Reset roles to super_admin only, assign all users to super_admin with full permissions, remove other roles.

BEGIN;

-- 1. Ensure super_admin role exists in roles table
INSERT INTO public.roles (role, label, is_system)
VALUES ('super_admin', 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់', true)
ON CONFLICT (role) DO UPDATE SET label = 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់', is_system = true;

-- 2. Grant ALL permissions to super_admin in role_permissions table
INSERT INTO public.role_permissions (role, permissions)
VALUES ('super_admin', '{
  "dashboard": true,
  "members": true,
  "membership_write": true,
  "membership_dues": true,
  "membership_admin": true,
  "membership_cards": true,
  "membership_delete": true,
  "voters": true,
  "files": true,
  "records": true,
  "reports": true,
  "performance": true,
  "performance_admin": true,
  "finances": true,
  "settings": true,
  "users": true,
  "technical": true
}'::jsonb)
ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions;

-- 3. Delete all roles from role_permissions EXCEPT super_admin
DELETE FROM public.role_permissions WHERE role != 'super_admin';

-- 4. Delete all roles from roles table EXCEPT super_admin
DELETE FROM public.roles WHERE role != 'super_admin';

-- 5. Update all users in profiles table to role = 'super_admin'
UPDATE public.profiles
SET role = 'super_admin';

-- 6. Reset user_roles table and assign all existing users to super_admin
DELETE FROM public.user_roles;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::text
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
