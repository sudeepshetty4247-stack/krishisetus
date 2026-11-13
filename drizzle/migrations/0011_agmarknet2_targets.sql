CREATE OR REPLACE FUNCTION public.agmarknet2_targets(p_offset integer, p_limit integer)
 RETURNS TABLE(state text, district text, market text, commodity text, total bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' SET statement_timeout TO '20s'
AS $function$
 WITH t AS (
  SELECT DISTINCT r.state, r.district, r.market, r.commodity
  FROM agri_reports r
  WHERE r.official AND r.date >= current_date - 45
 )
 SELECT t.state, t.district, t.market, t.commodity, count(*) OVER () AS total
 FROM t
 ORDER BY (t.district = 'Dharwad') DESC, (t.state = 'Karnataka') DESC, t.state, t.market, t.commodity
 OFFSET GREATEST(p_offset,0) LIMIT LEAST(GREATEST(p_limit,1),200);
$function$;
REVOKE ALL ON FUNCTION public.agmarknet2_targets(integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agmarknet2_targets(integer,integer) TO service_role;