-- Allow custom roles: roles catalog + text role keys in permissions/assignments

CREATE TABLE IF NOT EXISTS public.roles (
  role text PRIMARY KEY,
  label text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.roles (role, label, is_system) VALUES
  ('super_admin', 'Super Admin', true),
  ('admin', 'Admin', true),
  ('district_chief', 'District Chief', true),
  ('commune_chief', 'Commune Chief', true),
  ('commune_clerk', 'Commune Clerk', true),
  ('village_chief', 'Village Chief', true),
  ('recorder', 'Recorder', true),
  ('regular_user', 'Regular User', true)
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
