ALTER TABLE public.agri_reports ADD COLUMN IF NOT EXISTS grade text NOT NULL DEFAULT '';
ALTER TABLE public.agri_reports ADD COLUMN IF NOT EXISTS source_dataset text;
DROP INDEX IF EXISTS public.agri_official_identity;
CREATE UNIQUE INDEX agri_official_identity ON public.agri_reports(state,district,market,commodity,variety,grade,date,source_name) WHERE official;
CREATE INDEX IF NOT EXISTS agri_report_official_date ON public.agri_reports(date DESC) WHERE official;
CREATE INDEX IF NOT EXISTS agri_report_commodity_date ON public.agri_reports(commodity,date DESC);

CREATE OR REPLACE FUNCTION public.publish_agmarknet_batch(records jsonb, expected_offset integer, next_offset integer, finished boolean)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE current_offset integer; count_rows integer; BEGIN INSERT INTO agri_sync_state(source) VALUES('agmarknet') ON CONFLICT DO NOTHING; SELECT s.next_offset INTO current_offset FROM agri_sync_state s WHERE source='agmarknet' FOR UPDATE; IF current_offset<>expected_offset THEN RAISE EXCEPTION 'Sync cursor changed; retry with current cursor'; END IF; INSERT INTO agri_reports(official,state,district,market,commodity,variety,grade,date,min_price,max_price,modal_price,price_unit,arrivals,arrival_unit,source_name,source_url,retrieved_at,suspicious) SELECT true,r.state,r.district,r.market,r.commodity,r.variety,COALESCE(r.grade,''),r.date,r.min_price,r.max_price,r.modal_price,r.price_unit,r.arrivals,r.arrival_unit,'AGMARKNET','https://agmarknet.gov.in',r.retrieved_at,r.suspicious FROM jsonb_to_recordset(records) AS r(state text,district text,market text,commodity text,variety text,grade text,date date,min_price numeric,max_price numeric,modal_price numeric,price_unit text,arrivals numeric,arrival_unit text,retrieved_at timestamptz,suspicious boolean) ON CONFLICT(state,district,market,commodity,variety,grade,date,source_name) WHERE official DO UPDATE SET min_price=excluded.min_price,max_price=excluded.max_price,modal_price=excluded.modal_price,arrivals=excluded.arrivals,arrival_unit=excluded.arrival_unit,retrieved_at=excluded.retrieved_at,suspicious=excluded.suspicious; GET DIAGNOSTICS count_rows=ROW_COUNT; UPDATE agri_sync_state SET next_offset=CASE WHEN finished THEN 0 ELSE publish_agmarknet_batch.next_offset END,status=CASE WHEN finished THEN 'snapshot_complete' ELSE 'partial' END,last_success=now(),updated_at=now(),message=count_rows||' source-verified reports published in last batch' WHERE source='agmarknet'; RETURN count_rows; END $function$;

CREATE OR REPLACE FUNCTION public.publish_official_reports(records jsonb, p_source text, p_url text, p_dataset text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE n integer; BEGIN
 INSERT INTO agri_reports(official,state,district,market,commodity,variety,grade,date,min_price,max_price,modal_price,price_unit,source_name,source_url,source_dataset,retrieved_at,suspicious)
 SELECT DISTINCT ON (r.state,r.district,r.market,r.commodity,r.variety,COALESCE(r.grade,''),r.date) true,r.state,r.district,r.market,r.commodity,r.variety,COALESCE(r.grade,''),r.date,r.min_price,r.max_price,r.modal_price,'INR/quintal',p_source,p_url,p_dataset,COALESCE(r.retrieved_at,now()),COALESCE(r.suspicious,false)
 FROM jsonb_to_recordset(records) AS r(state text,district text,market text,commodity text,variety text,grade text,date date,min_price numeric,max_price numeric,modal_price numeric,retrieved_at timestamptz,suspicious boolean)
 WHERE r.modal_price>0 AND r.modal_price<1000000000 AND (r.min_price IS NULL OR r.min_price<=r.modal_price) AND (r.max_price IS NULL OR r.max_price>=r.modal_price) AND r.state<>'' AND r.market<>'' AND r.commodity<>'' AND r.date IS NOT NULL
 ORDER BY r.state,r.district,r.market,r.commodity,r.variety,COALESCE(r.grade,''),r.date,r.retrieved_at DESC
 ON CONFLICT(state,district,market,commodity,variety,grade,date,source_name) WHERE official DO UPDATE SET min_price=excluded.min_price,max_price=excluded.max_price,modal_price=excluded.modal_price,retrieved_at=excluded.retrieved_at,suspicious=excluded.suspicious,source_dataset=excluded.source_dataset;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n; END $function$;
REVOKE ALL ON FUNCTION public.publish_official_reports(jsonb,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_official_reports(jsonb,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.prune_official_reports(p_source text, p_keep_days integer)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE n integer; BEGIN DELETE FROM agri_reports WHERE official AND source_name=p_source AND date < (SELECT max(date) FROM agri_reports WHERE official AND source_name=p_source) - p_keep_days; GET DIAGNOSTICS n=ROW_COUNT; RETURN n; END $function$;
REVOKE ALL ON FUNCTION public.prune_official_reports(text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_official_reports(text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.agri_ticker(p_limit integer DEFAULT 16)
 RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
WITH latest AS (SELECT max(date) d FROM agri_reports WHERE official AND NOT suspicious),
recent AS (SELECT * FROM agri_reports WHERE official AND NOT suspicious AND date >= (SELECT d FROM latest) - 21),
ranked AS (SELECT r.*, row_number() OVER (PARTITION BY state,district,market,commodity,variety,grade,source_name ORDER BY date DESC) rn FROM recent r),
pairs AS (SELECT a.state,a.district,a.market,a.commodity,a.variety,a.grade,a.source_name,a.date,a.modal_price,a.retrieved_at,b.date prev_date,b.modal_price prev_price,(a.modal_price-b.modal_price) change,round((a.modal_price-b.modal_price)/b.modal_price*100,2) pct
 FROM ranked a JOIN ranked b ON a.rn=1 AND b.rn=2 AND a.state=b.state AND a.district=b.district AND a.market=b.market AND a.commodity=b.commodity AND a.variety=b.variety AND a.grade=b.grade AND a.source_name=b.source_name
 WHERE a.date >= (SELECT d FROM latest) - 7 AND a.date-b.date <= 14)
SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY abs(p.pct) DESC, p.date DESC),'[]'::jsonb) FROM (SELECT * FROM pairs WHERE pct IS NOT NULL AND abs(pct) < 60 ORDER BY abs(pct) DESC, date DESC LIMIT LEAST(GREATEST(p_limit,1),40)) p;
$function$;
GRANT EXECUTE ON FUNCTION public.agri_ticker(integer) TO anon, authenticated;

GRANT ALL ON public.agri_sync_state TO service_role;
GRANT ALL ON public.agri_source_checks TO service_role;

CREATE TABLE public.agri_source_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source text NOT NULL,
 report_date date,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 status text NOT NULL,
 requested integer NOT NULL DEFAULT 0,
 received integer NOT NULL DEFAULT 0,
 stored integer NOT NULL DEFAULT 0,
 rejected integer NOT NULL DEFAULT 0,
 message text,
 errors jsonb NOT NULL DEFAULT '[]'::jsonb);
GRANT SELECT ON public.agri_source_runs TO anon, authenticated;
GRANT ALL ON public.agri_source_runs TO service_role;
ALTER TABLE public.agri_source_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY source_runs_public_read ON public.agri_source_runs FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX agri_source_runs_recent ON public.agri_source_runs(source, started_at DESC);

CREATE TABLE public.ml_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 run_version text NOT NULL,
 dataset_version text NOT NULL,
 source_name text NOT NULL,
 state text NOT NULL, district text NOT NULL, market text NOT NULL,
 commodity text NOT NULL, variety text NOT NULL, grade text NOT NULL DEFAULT '',
 frequency text NOT NULL,
 observations integer NOT NULL,
 period_start date NOT NULL, period_end date NOT NULL,
 status text NOT NULL,
 artifact_path text,
 report jsonb NOT NULL);
GRANT SELECT ON public.ml_runs TO anon, authenticated;
GRANT ALL ON public.ml_runs TO service_role;
ALTER TABLE public.ml_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ml_runs_public_read ON public.ml_runs FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX ml_runs_group ON public.ml_runs(commodity, state, district, market, created_at DESC);

CREATE TABLE public.market_locations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 state text NOT NULL, district text NOT NULL, market text NOT NULL,
 latitude double precision NOT NULL, longitude double precision NOT NULL,
 place_id text, formatted_address text, location_type text,
 provider text NOT NULL, query text NOT NULL,
 match_quality text NOT NULL,
 geocoded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(state, district, market));
GRANT SELECT ON public.market_locations TO anon, authenticated;
GRANT ALL ON public.market_locations TO service_role;
ALTER TABLE public.market_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY market_locations_public_read ON public.market_locations FOR SELECT TO anon, authenticated USING (true);