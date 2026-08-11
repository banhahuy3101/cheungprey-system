-- 20260812130000_zone_counts_rpc.sql
-- Create an RPC function for accurate zone counts (bypasses PostgREST row limit)

CREATE OR REPLACE FUNCTION public.get_zone_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_object_agg(zone_type, cnt)
  FROM (
    SELECT zone_type, count(*) AS cnt
    FROM public.geographic_zones
    GROUP BY zone_type
  ) t;
$$;
