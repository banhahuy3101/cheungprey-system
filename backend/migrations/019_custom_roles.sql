-- Allow custom roles: roles catalog + text role keys in permissions/assignments

CREATE TABLE IF NOT EXISTS public.roles (
  role text PRIMARY KEY,
  label text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.roles (role, label, is_system) VALUES
  ('super_admin', 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់', true),
  ('admin', 'អ្នកគ្រប់គ្រង', true),
  ('district_chief', 'ប្រធានស្រុក', true),
  ('commune_chief', 'ប្រធានឃុំ', true),
  ('commune_clerk', 'ស្មៀនឃុំ', true),
  ('village_chief', 'ប្រធានភូមិ', true),
  ('recorder', 'អ្នកកត់ត្រា', true),
  ('regular_user', 'អ្នកប្រើប្រាស់ធម្មតា', true)
ON CONFLICT (role) DO NOTHING;

ALTER TABLE public.role_permissions
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read roles" ON public.roles;
CREATE POLICY "Anyone authenticated can read roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can manage roles" ON public.roles;
CREATE POLICY "Admin can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin','admin')
    )
  );
