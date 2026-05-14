-- Sprint N: Google Calendar / ICS sync
-- Suporta read via ICS URL (sem OAuth) + futuro write via OAuth scope calendar

CREATE TABLE IF NOT EXISTS system.calendar_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ics', 'gcal', 'task', 'schedule')),
  external_id     text,
  calendar_id     text,
  title           text NOT NULL,
  description     text,
  location        text,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  all_day         boolean NOT NULL DEFAULT false,
  attendees       jsonb NOT NULL DEFAULT '[]'::jsonb,
  task_id         uuid REFERENCES system.tasks(id) ON DELETE CASCADE,
  schedule_id     uuid REFERENCES system.schedules(id) ON DELETE CASCADE,
  vertical        text,
  client_id       uuid REFERENCES system.clients(id) ON DELETE SET NULL,
  raw_payload     jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_external_uniq
  ON system.calendar_events (source, calendar_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS calendar_events_start_idx ON system.calendar_events (start_at);

DROP VIEW IF EXISTS public.system_calendar_events;
CREATE VIEW public.system_calendar_events AS
SELECT e.*, t.title AS task_title, s.name AS schedule_name, c.company_name AS client_name
FROM system.calendar_events e
LEFT JOIN system.tasks t       ON t.id = e.task_id
LEFT JOIN system.schedules s   ON s.id = e.schedule_id
LEFT JOIN system.clients c     ON c.id = e.client_id
ORDER BY e.start_at;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_calendar_events TO authenticated;
GRANT SELECT ON public.system_calendar_events TO anon;
GRANT ALL ON system.calendar_events TO authenticated, service_role;

-- Sources config (ICS URL ou OAuth refresh token)
CREATE TABLE IF NOT EXISTS system.calendar_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  source_type     text NOT NULL CHECK (source_type IN ('ics', 'gcal_oauth')),
  ics_url         text,
  gcal_calendar_id text,
  gcal_refresh_token text,
  vertical        text,
  active          boolean NOT NULL DEFAULT true,
  last_sync_at    timestamptz,
  event_count     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP VIEW IF EXISTS public.system_calendar_sources;
CREATE VIEW public.system_calendar_sources AS SELECT * FROM system.calendar_sources ORDER BY name;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_calendar_sources TO authenticated;
GRANT ALL ON system.calendar_sources TO authenticated, service_role;

-- Trigger: ao criar task com due_at, criar calendar_event automático
CREATE OR REPLACE FUNCTION system.sync_task_to_calendar()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.due_at IS NOT NULL THEN
    INSERT INTO system.calendar_events (source, title, description, start_at, end_at, task_id, vertical)
    VALUES ('task', NEW.title, COALESCE(NEW.description_md, ''), NEW.due_at, NEW.due_at + interval '30 minutes', NEW.id, NEW.vertical)
    ON CONFLICT (source, calendar_id, external_id) WHERE external_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_task_calendar ON system.tasks;
CREATE TRIGGER trg_sync_task_calendar
  AFTER INSERT OR UPDATE OF due_at ON system.tasks
  FOR EACH ROW EXECUTE FUNCTION system.sync_task_to_calendar();

-- Unifica view public.calendar_events (legacy events + system.calendar_events + tasks)
CREATE OR REPLACE VIEW public.calendar_events AS
SELECT e.id, e.title, e.description, e.starts_at, e.ends_at, e.all_day, e.kind,
       e.owner_agent_id, e.owner_user_id, e.vertical, e.color, e.location, e.payload, e.created_at
FROM system.events e
UNION ALL
SELECT ce.id, ce.title, ce.description, ce.start_at AS starts_at, ce.end_at AS ends_at, ce.all_day,
       ce.source::text AS kind, NULL AS owner_agent_id, NULL::uuid AS owner_user_id,
       ce.vertical,
       CASE ce.source
         WHEN 'ics'  THEN '#0ea5e9'
         WHEN 'gcal' THEN '#4285F4'
         WHEN 'manual' THEN '#6b4fa0'
         ELSE '#6b7280'
       END AS color,
       ce.location,
       jsonb_build_object('source', ce.source, 'external_id', ce.external_id, 'calendar_id', ce.calendar_id) AS payload,
       ce.created_at
FROM system.calendar_events ce
WHERE ce.task_id IS NULL
UNION ALL
SELECT t.id, t.title, t.description_md AS description, t.due_at AS starts_at,
       NULL::timestamptz AS ends_at, true AS all_day, 'task'::text AS kind,
       t.owner_agent_id, t.owner_user_id, t.vertical,
       CASE
         WHEN t.priority = 'urgent' THEN '#ef4444'
         WHEN t.priority = 'high'   THEN '#f59e0b'
         ELSE '#3b82f6'
       END AS color,
       NULL::text AS location,
       jsonb_build_object('task_status', t.status, 'priority', t.priority) AS payload,
       t.created_at
FROM system.tasks t
WHERE t.due_at IS NOT NULL AND t.status IN ('open', 'in_progress', 'blocked');

GRANT SELECT ON public.calendar_events TO anon, authenticated;

-- pg_cron sync hourly minuto 5
SELECT cron.unschedule('gcal-sync-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gcal-sync-hourly');
SELECT cron.schedule('gcal-sync-hourly', '5 * * * *',
  $$SELECT net.http_post(
    url := 'https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/gcal-sync',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );$$
);

NOTIFY pgrst, 'reload schema';
