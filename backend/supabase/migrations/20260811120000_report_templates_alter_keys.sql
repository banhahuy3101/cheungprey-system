BEGIN;

UPDATE public.report_templates
SET keys = '[]'::jsonb
WHERE keys IS NULL OR keys = 'null'::jsonb;

ALTER TABLE public.report_templates ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'report_templates'
    AND column_name = 'keys'
    AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE public.report_templates ADD COLUMN keys_new TEXT[] DEFAULT '{}';

    UPDATE public.report_templates
    SET keys_new = ARRAY(SELECT jsonb_array_elements_text(keys));

    ALTER TABLE public.report_templates DROP COLUMN keys;
    ALTER TABLE public.report_templates RENAME COLUMN keys_new TO keys;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_report_templates_category ON public.report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_at ON public.report_templates(created_at DESC);

COMMIT;
