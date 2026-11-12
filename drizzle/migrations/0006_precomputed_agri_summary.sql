CREATE TABLE public.agri_summary(key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.agri_summary TO anon, authenticated;
GRANT ALL ON public.agri_summary TO service_role;
ALTER TABLE public.agri_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY agri_summary_public_read ON public.agri_summary FOR SELECT TO anon, authenticated USING (true);
CREATE OR REPLACE FUNCTION public.refresh_agri_summary() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' SET statement_timeout TO '180s'
AS $function$ BEGIN
 INSERT INTO agri_summary(key,value,updated_at) VALUES
  ('catalog', public.agri_catalog('{}'::jsonb), now()),
  ('coverage', public.agri_coverage('{}'::jsonb), now()),
  ('ticker', public.agri_ticker(20), now())
 ON CONFLICT (key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;
END $function$;
REVOKE ALL ON FUNCTION public.refresh_agri_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_agri_summary() TO service_role;