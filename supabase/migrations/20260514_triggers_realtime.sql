-- Sprint C: system.triggers — "React in Real Time"
-- Event-driven workflows: quando X acontece (inbox, task, apify, webhook),
-- dispara recipe ou prompt. Mode basic (deterministic) ou agentic (bot reasons).

CREATE TABLE IF NOT EXISTS system.triggers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  bot_id          text NOT NULL,
  event_kind      text NOT NULL CHECK (event_kind IN (
    'inbox_item_added', 'task_status_changed', 'apify_run_done',
    'integration_event', 'webhook', 'manual'
  )),
  event_filter    jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipe_id       uuid REFERENCES system.recipes(id) ON DELETE SET NULL,
  prompt          text,
  mode            text NOT NULL DEFAULT 'agentic' CHECK (mode IN ('basic', 'agentic')),
  connectors      text[] NOT NULL DEFAULT '{}',
  permissions     jsonb NOT NULL DEFAULT '{"writes_allowed": true, "requires_approval": false}'::jsonb,
  verticals       text[] NOT NULL DEFAULT '{*}',
  active          boolean NOT NULL DEFAULT true,
  last_fired_at   timestamptz,
  fire_count      integer NOT NULL DEFAULT 0,
  last_task_id    uuid REFERENCES system.tasks(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS triggers_event_kind_idx ON system.triggers (event_kind) WHERE active = true;
CREATE INDEX IF NOT EXISTS triggers_bot_idx        ON system.triggers (bot_id);
CREATE INDEX IF NOT EXISTS triggers_verticals_idx  ON system.triggers USING GIN (verticals);

DROP VIEW IF EXISTS public.system_triggers;
CREATE VIEW public.system_triggers AS
SELECT t.*, r.name AS recipe_name, r.category AS recipe_category
FROM system.triggers t
LEFT JOIN system.recipes r ON r.id = t.recipe_id
ORDER BY active DESC, last_fired_at DESC NULLS LAST, name;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_triggers TO authenticated;
GRANT SELECT ON public.system_triggers TO anon;
GRANT ALL ON system.triggers TO authenticated, service_role;

-- DB trigger: ao inserir em inbox_items, fire matching triggers via pg_net
CREATE OR REPLACE FUNCTION system.fire_triggers_on_inbox()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_trigger record;
BEGIN
  FOR v_trigger IN
    SELECT id FROM system.triggers
    WHERE active = true AND event_kind = 'inbox_item_added'
      AND (
        event_filter = '{}'::jsonb
        OR (event_filter ? 'kind' AND event_filter->>'kind' = NEW.kind)
        OR (event_filter ? 'vertical' AND event_filter->>'vertical' = NEW.vertical)
      )
  LOOP
    PERFORM net.http_post(
      url := 'https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/trigger-fire',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'trigger_id', v_trigger.id,
        'event_kind', 'inbox_item_added',
        'event_data', row_to_json(NEW)::jsonb
      )
    );
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fire_on_inbox_added ON system.inbox_items;
CREATE TRIGGER trg_fire_on_inbox_added
  AFTER INSERT ON system.inbox_items
  FOR EACH ROW EXECUTE FUNCTION system.fire_triggers_on_inbox();

-- DB trigger: ao mudar status duma task, fire matching triggers
CREATE OR REPLACE FUNCTION system.fire_triggers_on_task_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_trigger record;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    FOR v_trigger IN
      SELECT id FROM system.triggers
      WHERE active = true AND event_kind = 'task_status_changed'
        AND (
          event_filter = '{}'::jsonb
          OR (event_filter ? 'to_status' AND event_filter->>'to_status' = NEW.status)
          OR (event_filter ? 'vertical' AND event_filter->>'vertical' = NEW.vertical)
        )
    LOOP
      PERFORM net.http_post(
        url := 'https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/trigger-fire',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object(
          'trigger_id', v_trigger.id,
          'event_kind', 'task_status_changed',
          'event_data', jsonb_build_object(
            'task_id', NEW.id, 'from', OLD.status, 'to', NEW.status,
            'title', NEW.title, 'vertical', NEW.vertical
          )
        )
      );
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fire_on_task_status ON system.tasks;
CREATE TRIGGER trg_fire_on_task_status
  AFTER UPDATE ON system.tasks
  FOR EACH ROW EXECUTE FUNCTION system.fire_triggers_on_task_status();

NOTIFY pgrst, 'reload schema';
