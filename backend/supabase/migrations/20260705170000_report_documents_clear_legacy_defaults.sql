-- Remove legacy party / structured defaults from report_documents
ALTER TABLE public.report_documents ALTER COLUMN party_name SET DEFAULT '';
ALTER TABLE public.report_documents ALTER COLUMN property_damage_desc SET DEFAULT '';
