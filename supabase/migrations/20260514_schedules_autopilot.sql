-- Sprint B: system.schedules — "Run on Autopilot"
-- Workflows recorrentes via cron. Cada schedule corre uma recipe ou prompt directo.

CREATE TABLE IF NOT EXISTS system.schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  recipe_id       uuid REFERENCES system.recipes(id) ON DELETE SET NULL,
  prompt          text,
  bot_id          text NOT NULL,
  cron_expr       text NOT NULL,
  cron_label      text,
  connectors      text[] NOT NULL DEFAULT '{}',
  permissions     jsonb NOT NULL DEFAULT '{"writes_allowed": true, "requires_approval": false}'::jsonb,
  verticals       text[] NOT NULL DEFAULT '{*}',
  active          boolean NOT NULL DEFAULT true,
  last_run_at     timestamptz,
  next_run_at     timestamptz,
  run_count       integer NOT NULL DEFAULT 0,
  last_task_id    uuid REFERENCES system.tasks(id) ON DELETE SET NULL,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schedules_next_run_idx  ON system.schedules (next_run_at) WHERE active = true;
CREATE INDEX IF NOT EXISTS schedules_bot_idx       ON system.schedules (bot_id);
CREATE INDEX IF NOT EXISTS schedules_verticals_idx ON system.schedules USING GIN (verticals);

DROP VIEW IF EXISTS public.system_schedules;
CREATE VIEW public.system_schedules AS
SELECT s.*, r.name AS recipe_name, r.category AS recipe_category
FROM system.schedules s
LEFT JOIN system.recipes r ON r.id = s.recipe_id
ORDER BY active DESC, next_run_at NULLS LAST, name;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_schedules TO authenticated;
GRANT SELECT ON public.system_schedules TO anon;
GRANT ALL ON system.schedules TO authenticated, service_role;

-- Trigger: set next_run_at on INSERT/UPDATE
CREATE OR REPLACE FUNCTION system.schedules_set_next_run()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.active AND (NEW.next_run_at IS NULL OR OLD.cron_expr IS DISTINCT FROM NEW.cron_expr) THEN
    NEW.next_run_at := COALESCE(NEW.next_run_at, now() + interval '1 minute');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_schedules_set_next_run ON system.schedules;
CREATE TRIGGER trg_schedules_set_next_run
  BEFORE INSERT OR UPDATE ON system.schedules
  FOR EACH ROW EXECUTE FUNCTION system.schedules_set_next_run();

-- pg_cron: dispara schedule-run a cada 5 minutos
SELECT cron.unschedule('schedule-run-every-5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'schedule-run-every-5min');

SELECT cron.schedule(
  'schedule-run-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/schedule-run',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

NOTIFY pgrst, 'reload schema';
