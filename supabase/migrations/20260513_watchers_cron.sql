-- ============================================================
-- pg_cron schedule — Sprint ζ
-- Data: 2026-05-13
-- ============================================================
-- Agenda os watchers + daily-roundup via pg_cron.
-- Requer extensões pg_cron + pg_net activas no projecto Supabase.
--
-- Crons:
--   daily-roundup       08:00 Lisboa (07:00 UTC inverno / 06:00 UTC verão)
--   watcher-news        a cada hora (15min após hora)
--   watcher-instagram   a cada 30min
--   watcher-x           a cada 30min (offset 5min para não bater em IG)
--   watcher-competitor  a cada 2 horas
--
-- Cada job invoca edge function via pg_net.http_post com Authorization
-- Bearer da service_role key (lida do GUC custom).
--
-- IMPORTANTE: para isto funcionar tens de:
-- 1. Activar extensões em Supabase Dashboard → Database → Extensions:
--    pg_cron, pg_net
-- 2. Configurar GUC com URL base + service key (via Dashboard SQL):
--      ALTER DATABASE postgres SET app.settings.supabase_url    = 'https://hkmvszkpxjbxmnixzqbl.supabase.co';
--      ALTER DATABASE postgres SET app.settings.service_role_key = '<SERVICE_ROLE_KEY>';
--    Reconnect a sessão para o setting ficar visível.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper para chamar edge function por nome (puxa URL + key do GUC)
CREATE OR REPLACE FUNCTION system.invoke_edge_fn(p_fn_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public, net
AS $$
DECLARE
  v_url text;
  v_key text;
  v_req_id bigint;
BEGIN
  v_url := current_setting('app.settings.supabase_url', true);
  v_key := current_setting('app.settings.service_role_key', true);

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_edge_fn: GUC app.settings.supabase_url ou service_role_key não definido — skip';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url || '/functions/v1/' || p_fn_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO v_req_id;

  RETURN v_req_id;
END $$;

GRANT EXECUTE ON FUNCTION system.invoke_edge_fn(text) TO postgres, service_role;

-- ============================================================
-- Limpa jobs anteriores (idempotente)
-- ============================================================
DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname IN (
    'daily_roundup_08h',
    'watcher_news_hourly',
    'watcher_instagram_30min',
    'watcher_x_30min',
    'watcher_competitor_2h'
  ) LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;

-- ============================================================
-- Schedule novos jobs
-- ============================================================

-- Daily roundup às 08:00 Lisboa
-- Inverno (CET) = UTC+1 → 07:00 UTC
-- Verão (CEST) = UTC+2 → 06:00 UTC
-- Workaround: corre 2x (06:00 e 07:00 UTC) — daily-roundup é idempotente por dia
SELECT cron.schedule(
  'daily_roundup_08h',
  '0 6,7 * * *',
  $$ SELECT system.invoke_edge_fn('daily-roundup'); $$
);

-- Watchers
SELECT cron.schedule(
  'watcher_news_hourly',
  '15 * * * *',
  $$ SELECT system.invoke_edge_fn('watcher-news'); $$
);

SELECT cron.schedule(
  'watcher_instagram_30min',
  '*/30 * * * *',
  $$ SELECT system.invoke_edge_fn('watcher-instagram'); $$
);

SELECT cron.schedule(
  'watcher_x_30min',
  '5,35 * * * *',
  $$ SELECT system.invoke_edge_fn('watcher-x'); $$
);

SELECT cron.schedule(
  'watcher_competitor_2h',
  '20 */2 * * *',
  $$ SELECT system.invoke_edge_fn('watcher-competitor'); $$
);

-- ============================================================
-- View de monitorização — ver últimas runs de cada job
-- ============================================================
CREATE OR REPLACE VIEW public.cron_jobs_status AS
  SELECT
    j.jobname,
    j.schedule,
    j.active,
    (SELECT MAX(start_time) FROM cron.job_run_details d WHERE d.jobid = j.jobid) AS last_run_at,
    (SELECT status FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY start_time DESC LIMIT 1) AS last_status,
    (SELECT return_message FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY start_time DESC LIMIT 1) AS last_message
  FROM cron.job j
  WHERE j.jobname LIKE 'daily_roundup_%'
     OR j.jobname LIKE 'watcher_%';

GRANT SELECT ON public.cron_jobs_status TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
