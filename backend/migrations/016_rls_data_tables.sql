-- Extend RLS to operational data tables (mirrors app-level RBAC).
-- Note: Go API uses service role and enforces permissions in handlers.

ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;

-- Staff (recorder+) can read/write report documents
CREATE POLICY "Staff can manage report documents"
    ON public.report_documents FOR ALL
    USING (get_user_role() IN (
        'super_admin', 'admin', 'district_chief', 'commune_chief',
        'commune_clerk', 'village_chief', 'recorder'
    ));

-- Commune clerk read access for records (align with app service)
CREATE POLICY "Commune clerk can view commune records"
    ON public.records FOR SELECT
    USING (
        get_user_role() = 'commune_clerk'
        AND commune_id = get_user_commune()
    );

CREATE POLICY "Commune clerk can manage commune records"
    ON public.records FOR ALL
    USING (
        get_user_role() = 'commune_clerk'
        AND commune_id = get_user_commune()
    );
