-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_user_commune()
RETURNS UUID AS $$
    SELECT commune_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_user_village()
RETURNS UUID AS $$
    SELECT village_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Super admin and admin can view all profiles"
    ON public.profiles FOR SELECT
    USING (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Super admin and admin can update profiles"
    ON public.profiles FOR UPDATE
    USING (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Records policies
CREATE POLICY "Super admin can do everything"
    ON public.records FOR ALL
    USING (get_user_role() = 'super_admin');

CREATE POLICY "Admin can manage all records"
    ON public.records FOR ALL
    USING (get_user_role() = 'admin');

CREATE POLICY "District chief can view records in district"
    ON public.records FOR SELECT
    USING (
        get_user_role() = 'district_chief'
        AND commune_id IN (
            SELECT id FROM public.communes
            WHERE district_id IN (
                SELECT district_id FROM public.communes
                WHERE id = get_user_commune()
            )
        )
    );

CREATE POLICY "Commune chief can manage commune records"
    ON public.records FOR ALL
    USING (
        get_user_role() = 'commune_chief'
        AND commune_id = get_user_commune()
    );

CREATE POLICY "Village chief can manage village records"
    ON public.records FOR ALL
    USING (
        get_user_role() = 'village_chief'
        AND village_id = get_user_village()
    );

CREATE POLICY "Recorder can create records"
    ON public.records FOR INSERT
    WITH CHECK (get_user_role() = 'recorder');

CREATE POLICY "Recorder can view own records"
    ON public.records FOR SELECT
    USING (created_by = auth.uid());
