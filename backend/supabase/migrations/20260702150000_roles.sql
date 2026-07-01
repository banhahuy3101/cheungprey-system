-- 018_roles.sql
-- Custom roles management (separate from built-in roles)

CREATE TABLE IF NOT EXISTS public.roles (
  role text PRIMARY KEY,
  label text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed built-in roles as system roles
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

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

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

-- Ensure role_permissions.role FK reference (soft, text only)
