-- Sprint A Fase A4 — Bia daily roundup cron (07h30 Lisbon)
--
-- Componentes:
--   1. vault.secrets entry para guardar service_role_key (placeholder — Mário insere o valor real)
--   2. system.fn_invoke_bia_daily_roundup() — RPC que faz net.http_post para bia-chat
--   3. cron.schedule('bia-daily-roundup', '30 6 * * *', ...) — 06:30 UTC = 07:30 Lisbon (DST-naive; ajustar manual se necessário)
--
-- IMPORTANTE — antes de activar o cron:
--   INSERT INTO vault.secrets (name, secret)
--   VALUES ('proptech_service_role_key', '<SERVICE_ROLE_JWT>')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
--
-- Depois activar:
--   UPDATE cron.job SET active = true WHERE jobname = 'bia-daily-roundup';
--
-- Verificar execução:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'bia-daily-roundup')
--   ORDER BY start_time DESC LIMIT 5;

-- 1. RPC invoker (SECURITY DEFINER — corre como postgres, lê do vault)
CREATE OR REPLACE FUNCTION system.fn_invoke_bia_daily_roundup()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_key text;
  v_function_url text := 'https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/bia-chat';
  v_request_id bigint;
BEGIN
  -- Buscar service_role key do vault
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'proptech_service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL OR length(v_service_key) < 100 THEN
    RAISE EXCEPTION 'vault secret "proptech_service_role_key" ausente ou inválida — inserir antes de activar o cron';
  END IF;

  -- net.http_post devolve request_id (assíncrono)
  SELECT net.http_post(
    url     := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object(
      'task_type', 'daily_roundup',
      'payload', jsonb_build_object()
    )
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION system.fn_invoke_bia_daily_roundup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.fn_invoke_bia_daily_roundup() TO postgres;

COMMENT ON FUNCTION system.fn_invoke_bia_daily_roundup() IS
  'Sprint 1E — invocada pelo cron 07h30 Lisbon. Requer vault.secrets "proptech_service_role_key" configurada.';

-- 2. Cron schedule INACTIVO até vault secret estar configurado
-- Schedule: 06:30 UTC todos os dias = 07:30 Lisbon Inverno / 07:30 Lisbon Verão (Portugal usa WEST=UTC+1 em verão)
-- TODO: confirmar fuso quando primeiro Daylight Saving acontecer.
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- cron.schedule retorna jobid se criar, ou se já existe faz UPDATE (com 'unschedule' antes)
  PERFORM cron.unschedule('bia-daily-roundup')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bia-daily-roundup');

  SELECT cron.schedule(
    'bia-daily-roundup',
    '30 6 * * *',
    $cmd$SELECT system.fn_invoke_bia_daily_roundup()$cmd$
  ) INTO v_jobid;

  -- Desactivar até secret existir
  UPDATE cron.job SET active = false WHERE jobid = v_jobid;
END $$;
