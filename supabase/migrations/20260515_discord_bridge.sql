-- Sprint Q2 — Discord bridge
--
-- Capabilities:
-- 1. system.agent_channels — mapping agent -> webhook URL Discord
-- 2. tasks.kind adicionar 'discord_mention'
-- 3. cron job daily_discord_brief_07h invoca discord-morning-brief
-- 4. RLS staff-only

BEGIN;

-- ───────── 1. agent_channels ─────────
CREATE TABLE IF NOT EXISTS system.agent_channels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        text NOT NULL,             -- 'bia', 'compliance-condo', ...
  channel_type    text NOT NULL CHECK (channel_type IN ('discord','slack','telegram')),
  webhook_url     text,                       -- inbound de Property007 → Discord
  channel_id      text,                       -- ID nativo do channel Discord
  dm_user_ids     text[] NOT NULL DEFAULT '{}',  -- Discord user IDs autorizados a DMar este agent
  active          boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_agent_channels_active
  ON system.agent_channels (channel_type, active)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_agent_channels_agent
  ON system.agent_channels (agent_id);

-- ───────── 2. tasks.kind alargar para 'discord_mention' + 'discord_dm' ─────────
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname='system' AND t.relname='tasks' AND c.contype='c' AND c.conname='tasks_kind_check';

  IF v_def IS NOT NULL AND v_def NOT LIKE '%discord_mention%' THEN
    ALTER TABLE system.tasks DROP CONSTRAINT IF EXISTS tasks_kind_check;
    ALTER TABLE system.tasks
      ADD CONSTRAINT tasks_kind_check
      CHECK (kind = ANY (ARRAY[
        'task','idea','followup','reminder',
        'email_reply','calendar_event',
        'discord_mention','discord_dm'
      ]));
  END IF;
END$$;

-- ───────── 3. RLS + grants ─────────
ALTER TABLE system.agent_channels ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON system.agent_channels TO authenticated;
GRANT ALL ON system.agent_channels TO service_role;

DROP POLICY IF EXISTS "agent_channels_staff" ON system.agent_channels;
CREATE POLICY "agent_channels_staff" ON system.agent_channels
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_agent_channels_updated_at ON system.agent_channels;
CREATE TRIGGER trg_agent_channels_updated_at
  BEFORE UPDATE ON system.agent_channels
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

-- ───────── 4. View pública ─────────
DROP VIEW IF EXISTS public.system_agent_channels;
CREATE VIEW public.system_agent_channels
  WITH (security_invoker = on)
AS
SELECT id, agent_id, channel_type, webhook_url, channel_id, dm_user_ids, active, notes, created_at, updated_at
FROM system.agent_channels;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_agent_channels TO authenticated;

-- ───────── 5. cron job 7am Lisboa ─────────
-- 06:00 UTC = 07:00 Lisboa (winter); 06:00 UTC = 07:00 BST hour offset varies
-- Pragmático: 07:00 UTC = 08:00 Lisboa winter, 09:00 summer. Vamos com 06:00 UTC.
SELECT cron.unschedule('discord_morning_brief_07h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'discord_morning_brief_07h');

SELECT cron.schedule(
  'discord_morning_brief_07h',
  '0 6 * * *',
  $$ SELECT system.invoke_edge_fn('discord-morning-brief'); $$
);

COMMIT;
