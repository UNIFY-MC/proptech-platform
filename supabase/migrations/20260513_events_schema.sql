-- ============================================================
-- system.events — Sprint δ
-- Data: 2026-05-13
-- ============================================================
-- Calendário unificado:
--   - eventos manuais (criados pelo user)
--   - tasks com due_at (sync via view)
--   - approvals com SLA
--   - agent cron schedules (de agent_policies — futuro)
--   - eventos externos (Google Calendar futuro)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS system;

CREATE TABLE IF NOT EXISTS system.events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  all_day      boolean NOT NULL DEFAULT false,
  kind         text NOT NULL DEFAULT 'manual'
                CHECK (kind IN ('manual','task','approval','cron','meeting','external')),
  source_kind  text,
  source_id    uuid,
  owner_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_agent_id text,
  vertical     text,
  color        text,
  location     text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_starts_at_idx      ON system.events(starts_at);
CREATE INDEX IF NOT EXISTS events_kind_idx           ON system.events(kind);
CREATE INDEX IF NOT EXISTS events_owner_agent_idx    ON system.events(owner_agent_id) WHERE owner_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_owner_user_idx     ON system.events(owner_user_id)  WHERE owner_user_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_source_idx         ON system.events(source_kind, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_vertical_idx       ON system.events(vertical);

-- updated_at trigger
CREATE OR REPLACE FUNCTION system.events_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS events_set_updated_at ON system.events;
CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON system.events
  FOR EACH ROW EXECUTE FUNCTION system.events_updated_at();

-- ============================================================
-- View calendar_events — UNION de events manuais + tasks com due_at
-- (RLS open internal — alinha com tasks/inbox)
-- ============================================================
CREATE OR REPLACE VIEW public.calendar_events AS
  -- Events manuais / cron / meeting / external
  SELECT
    e.id,
    e.title,
    e.description,
    e.starts_at,
    e.ends_at,
    e.all_day,
    e.kind,
    e.owner_agent_id,
    e.owner_user_id,
    e.vertical,
    e.color,
    e.location,
    e.payload,
    e.created_at
  FROM system.events e
  UNION ALL
  -- Tasks com due_at sync automático (read-only)
  SELECT
    t.id,
    t.title,
    t.description_md   AS description,
    t.due_at           AS starts_at,
    NULL::timestamptz  AS ends_at,
    true               AS all_day,
    'task'             AS kind,
    t.owner_agent_id,
    t.owner_user_id,
    t.vertical,
    CASE
      WHEN t.priority = 'urgent' THEN '#ef4444'
      WHEN t.priority = 'high'   THEN '#f59e0b'
      ELSE '#3b82f6'
    END               AS color,
    NULL              AS location,
    jsonb_build_object('task_status', t.status, 'priority', t.priority) AS payload,
    t.created_at
  FROM system.tasks t
  WHERE t.due_at IS NOT NULL
    AND t.status IN ('open','in_progress','blocked');

GRANT SELECT ON public.calendar_events TO anon, authenticated, service_role;

-- ============================================================
-- RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION system.event_create(
  p_title        text,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz DEFAULT NULL,
  p_all_day      boolean DEFAULT false,
  p_description  text DEFAULT NULL,
  p_kind         text DEFAULT 'manual',
  p_owner_agent_id text DEFAULT NULL,
  p_vertical     text DEFAULT NULL,
  p_color        text DEFAULT NULL,
  p_location     text DEFAULT NULL,
  p_payload      jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public, auth
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO system.events
    (title, description, starts_at, ends_at, all_day, kind,
     owner_user_id, owner_agent_id, vertical, color, location, payload)
  VALUES
    (p_title, p_description, p_starts_at, p_ends_at, p_all_day, p_kind,
     auth.uid(), p_owner_agent_id, p_vertical, p_color, p_location, p_payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION system.event_create(text, timestamptz, timestamptz, boolean, text, text, text, text, text, text, jsonb)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION system.event_delete(p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public
AS $$
BEGIN
  DELETE FROM system.events WHERE id = p_event_id;
END $$;

GRANT EXECUTE ON FUNCTION system.event_delete(uuid) TO authenticated, service_role;

-- ============================================================
-- RLS open internal
-- ============================================================
ALTER TABLE system.events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.events TO authenticated, service_role;

DROP POLICY IF EXISTS events_open_read  ON system.events;
DROP POLICY IF EXISTS events_open_write ON system.events;
CREATE POLICY events_open_read  ON system.events FOR SELECT USING (true);
CREATE POLICY events_open_write ON system.events FOR ALL    USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
