-- =============================================================
-- Fase I.2 — RPC para a vista /automacoes listar pg_cron jobs
-- =============================================================
-- cron.job não é acessível por authenticated por defeito.
-- Wrapper SECURITY DEFINER + is_staff() check para staff ver
-- todos os cron jobs no Dashboard de Automações.
-- =============================================================

CREATE OR REPLACE FUNCTION v2_condominios.list_cron_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v2_condominios, public, cron
AS $$
DECLARE v_jobs jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires staff role';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'jobid', jobid,
    'schedule', schedule,
    'command', command,
    'active', active,
    'jobname', jobname,
    'database', database
  ) ORDER BY jobid), '[]'::jsonb)
  INTO v_jobs
  FROM cron.job;
  RETURN v_jobs;
END; $$;

REVOKE ALL ON FUNCTION v2_condominios.list_cron_jobs() FROM public;
GRANT EXECUTE ON FUNCTION v2_condominios.list_cron_jobs() TO authenticated;
