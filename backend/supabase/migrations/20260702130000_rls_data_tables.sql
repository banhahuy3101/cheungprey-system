-- Extend RLS to operational data tables (mirrors app-level RBAC).

ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage report documents"
    ON public.report_documents FOR ALL
    USING (get_user_role() IN (
        'super_admin', 'admin', 'district_chief', 'commune_chief',
        'commune_clerk', 'village_chief', 'recorder'
    ));

CREATE POLICY "Staff can read report templates"
    ON public.report_templates FOR SELECT
    USING (get_user_role() IN (
        'super_admin', 'admin', 'district_chief', 'commune_chief',
        'commune_clerk', 'village_chief', 'recorder'
    ));

CREATE POLICY "Admin can manage report templates"
    ON public.report_templates FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'));

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
