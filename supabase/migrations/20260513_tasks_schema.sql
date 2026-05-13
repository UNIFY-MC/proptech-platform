-- ============================================================
-- system.tasks — Sprint β
-- Data: 2026-05-13
-- ============================================================
-- Tasks são unidade de trabalho do owner/staff/agents:
--  - "idea" → criada do Inbox, sem owner, scoped a vertical
--  - "employee" → atribuída a um agent/staff específico
--  - "scheduled" → tem due_at no calendar
-- Origem possível: inbox_item, chat message, manual, agent
-- Estados: open → in_progress → done | cancelled
-- ============================================================

CREATE SCHEMA IF NOT EXISTS system;

CREATE TABLE IF NOT EXISTS system.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description_md  text,
  status          text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','done','cancelled','blocked')),
  priority        text NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','high','urgent')),
  kind            text NOT NULL DEFAULT 'task'
                  CHECK (kind IN ('task','idea','followup','reminder')),
  vertical        text,                     -- v2, v4, v5, etc (opcional)
  owner_agent_id  text,                     -- id de .claude/employees/<id>.meta.json (ex: 'bia')
  owner_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at          timestamptz,
  source_kind     text,                     -- 'inbox_item' | 'chat' | 'manual' | 'agent' | 'approval'
  source_id       uuid,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags            text[] NOT NULL DEFAULT '{}',
  done_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_status_idx       ON system.tasks(status) WHERE status IN ('open','in_progress');
CREATE INDEX IF NOT EXISTS tasks_vertical_idx     ON system.tasks(vertical);
CREATE INDEX IF NOT EXISTS tasks_owner_agent_idx  ON system.tasks(owner_agent_id);
CREATE INDEX IF NOT EXISTS tasks_owner_user_idx   ON system.tasks(owner_user_id);
CREATE INDEX IF NOT EXISTS tasks_due_at_idx       ON system.tasks(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_source_idx       ON system.tasks(source_kind, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_created_at_idx   ON system.tasks(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION system.tasks_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON system.tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON system.tasks
  FOR EACH ROW EXECUTE FUNCTION system.tasks_updated_at();

-- ============================================================
-- RPCs (SECURITY DEFINER + GRANT)
-- ============================================================

-- create_task
CREATE OR REPLACE FUNCTION system.task_create(
  p_title          text,
  p_description_md text DEFAULT NULL,
  p_kind           text DEFAULT 'task',
  p_priority       text DEFAULT 'normal',
  p_vertical       text DEFAULT NULL,
  p_owner_agent_id text DEFAULT NULL,
  p_owner_user_id  uuid DEFAULT NULL,
  p_due_at         timestamptz DEFAULT NULL,
  p_source_kind    text DEFAULT 'manual',
  p_source_id      uuid DEFAULT NULL,
  p_payload        jsonb DEFAULT '{}'::jsonb,
  p_tags           text[] DEFAULT '{}'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public, auth
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO system.tasks
    (title, description_md, kind, priority, vertical,
     owner_agent_id, owner_user_id, created_by,
     due_at, source_kind, source_id, payload, tags)
  VALUES
    (p_title, p_description_md, p_kind, p_priority, p_vertical,
     p_owner_agent_id, p_owner_user_id, auth.uid(),
     p_due_at, p_source_kind, p_source_id, p_payload, p_tags)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION system.task_create(text, text, text, text, text, text, uuid, timestamptz, text, uuid, jsonb, text[])
  TO authenticated, service_role;

-- task_update_status
CREATE OR REPLACE FUNCTION system.task_update_status(
  p_task_id uuid,
  p_status  text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public
AS $$
BEGIN
  UPDATE system.tasks
     SET status = p_status,
         done_at = CASE WHEN p_status = 'done' THEN now() ELSE done_at END
   WHERE id = p_task_id;
END $$;

GRANT EXECUTE ON FUNCTION system.task_update_status(uuid, text) TO authenticated, service_role;

-- task_assign
CREATE OR REPLACE FUNCTION system.task_assign(
  p_task_id        uuid,
  p_owner_agent_id text DEFAULT NULL,
  p_owner_user_id  uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public
AS $$
BEGIN
  UPDATE system.tasks
     SET owner_agent_id = p_owner_agent_id,
         owner_user_id  = p_owner_user_id
   WHERE id = p_task_id;
END $$;

GRANT EXECUTE ON FUNCTION system.task_assign(uuid, text, uuid) TO authenticated, service_role;

-- ============================================================
-- RLS — open internal por agora (alinha com inbox_items pattern)
-- ============================================================
ALTER TABLE system.tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON system.tasks TO authenticated, service_role;

DROP POLICY IF EXISTS tasks_open_read  ON system.tasks;
DROP POLICY IF EXISTS tasks_open_write ON system.tasks;
CREATE POLICY tasks_open_read  ON system.tasks FOR SELECT USING (true);
CREATE POLICY tasks_open_write ON system.tasks FOR ALL    USING (true) WITH CHECK (true);

-- View public para PostgREST
CREATE OR REPLACE VIEW public.system_tasks AS
  SELECT id, title, description_md, status, priority, kind, vertical,
         owner_agent_id, owner_user_id, created_by,
         due_at, source_kind, source_id, payload, tags,
         done_at, created_at, updated_at
  FROM system.tasks;

GRANT SELECT ON public.system_tasks TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
