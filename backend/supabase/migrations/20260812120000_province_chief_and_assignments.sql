-- 20260812120000_province_chief_and_assignments.sql
-- Add province_chief role + zone chief assignments configuration table

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'province_chief'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'province_chief';
    END IF;
END $$;

INSERT INTO public.roles (role, label, is_system) VALUES
    ('province_chief', 'Province Chief', true)
ON CONFLICT (role) DO NOTHING;

INSERT INTO public.role_permissions (role, permissions) VALUES
    ('province_chief', '{"dashboard":true,"members":true,"voters":true,"finances":true,"files":true,"records":true,"reports":true,"performance":true,"performance_admin":false,"settings":true,"users":false,"technical":false,"membership_write":true,"membership_dues":true,"membership_admin":true,"membership_cards":true,"membership_delete":true}'::jsonb)
ON CONFLICT (role) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.zone_chief_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_code VARCHAR(8) NOT NULL REFERENCES public.geographic_zones(zone_code) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (zone_code)
);

CREATE INDEX IF NOT EXISTS idx_zone_chief_assignments_user ON public.zone_chief_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_chief_assignments_zone ON public.zone_chief_assignments(zone_code);

ALTER TABLE public.zone_chief_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read zone_chief_assignments"
    ON public.zone_chief_assignments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage zone_chief_assignments"
    ON public.zone_chief_assignments FOR ALL
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
