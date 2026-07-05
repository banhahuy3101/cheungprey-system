-- Multi-role assignment + per-feature permissions (allow/none).

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role user_role PRIMARY KEY,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default permissions per built-in role
INSERT INTO public.role_permissions (role, permissions) VALUES
('super_admin', '{"dashboard":true,"members":true,"voters":true,"finances":true,"files":true,"records":true,"reports":true,"performance":true,"performance_admin":true,"settings":true,"users":true,"technical":true}'::jsonb),
('admin', '{"dashboard":true,"members":true,"voters":true,"finances":true,"files":true,"records":true,"reports":true,"performance":true,"performance_admin":true,"settings":true,"users":true,"technical":true}'::jsonb),
('district_chief', '{"dashboard":true,"members":true,"voters":true,"finances":true,"files":true,"records":true,"reports":true,"performance":true,"performance_admin":false,"settings":true,"users":false,"technical":false}'::jsonb),
('commune_chief', '{"dashboard":true,"members":true,"voters":true,"finances":true,"files":true,"records":true,"reports":true,"performance":true,"performance_admin":false,"settings":true,"users":false,"technical":false}'::jsonb),
('commune_clerk', '{"dashboard":true,"members":true,"voters":true,"finances":true,"files":true,"records":true,"reports":true,"performance":true,"performance_admin":false,"settings":true,"users":false,"technical":false}'::jsonb),
('village_chief', '{"dashboard":true,"members":true,"voters":true,"finances":true,"files":true,"records":true,"reports":true,"performance":true,"performance_admin":false,"settings":true,"users":false,"technical":false}'::jsonb),
('recorder', '{"dashboard":true,"members":true,"voters":true,"finances":true,"files":true,"records":true,"reports":true,"performance":true,"performance_admin":false,"settings":true,"users":false,"technical":false}'::jsonb),
('regular_user', '{"dashboard":true,"members":false,"voters":false,"finances":false,"files":false,"records":false,"reports":false,"performance":false,"performance_admin":false,"settings":true,"users":false,"technical":false}'::jsonb)
ON CONFLICT (role) DO NOTHING;

-- Migrate existing single profile.role into user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage user_roles"
    ON public.user_roles FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can read role_permissions"
    ON public.role_permissions FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can update role_permissions"
    ON public.role_permissions FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'));
