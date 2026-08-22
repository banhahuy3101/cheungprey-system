-- 20260822210000_get_zones_rpc.sql
-- Create an RPC function to fetch zones without PostgREST row limit (default 1000)

CREATE OR REPLACE FUNCTION public.get_zones_filtered(p_zone_type text DEFAULT NULL, p_parent_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.zone_code), '[]'::jsonb)
  FROM (
    SELECT
      zone_code,
      name_kh,
      name_en,
      zone_type,
      parent_code
    FROM public.geographic_zones
    WHERE (p_zone_type IS NULL OR zone_type = p_zone_type)
      AND (p_parent_code IS NULL OR parent_code = p_parent_code)
  ) t;
$$;
