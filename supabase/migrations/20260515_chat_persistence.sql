-- Sprint Q1.5 — Chat persistence (threads + messages + auto-archive)
--
-- Goals:
-- 1. system.chat_threads — uma conversação por agent (Bia, Diretor MKT, etc.)
-- 2. system.chat_messages — mensagens user+assistant+tool dentro de cada thread
-- 3. RPC chat_thread_open(agent_id) — devolve thread "current" (auto-cria se faltar)
-- 4. RPC chat_message_add — UPSERT-like com last_message_at update
-- 5. View public.system_chat_threads — lista com preview da última mensagem
-- 6. Auto-archive de threads com >14 dias sem mensagens

BEGIN;

-- ───────── 1. chat_threads ─────────
CREATE TABLE IF NOT EXISTS system.chat_threads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       text NOT NULL,           -- 'bia', 'diretor-marketing', ...
  title             text,                    -- gerado da 1ª mensagem (~60 chars)
  user_id           uuid,                    -- futuro: ligar a IAM v1 user
  started_at        timestamptz NOT NULL DEFAULT now(),
  last_message_at   timestamptz NOT NULL DEFAULT now(),
  archived_at       timestamptz,             -- NULL = activa
  message_count     int NOT NULL DEFAULT 0,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_employee_active
  ON system.chat_threads (employee_id, last_message_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_threads_archived
  ON system.chat_threads (archived_at DESC) WHERE archived_at IS NOT NULL;

-- ───────── 2. chat_messages ─────────
CREATE TABLE IF NOT EXISTS system.chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid NOT NULL REFERENCES system.chat_threads(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('user','assistant','tool')),
  content      text NOT NULL DEFAULT '',
  tool_calls   jsonb,                          -- tool_use/tool_result do Anthropic
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread
  ON system.chat_messages (thread_id, created_at ASC);

-- ───────── 3. RPC chat_thread_open ─────────
-- Devolve thread "current" do agent. Se não existe (ou todas archived),
-- cria nova.
CREATE OR REPLACE FUNCTION system.chat_thread_open(
  p_employee_id text,
  p_force_new boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_employee_id IS NULL OR p_employee_id = '' THEN
    RAISE EXCEPTION 'employee_id obrigatório';
  END IF;

  IF NOT p_force_new THEN
    SELECT id INTO v_id
    FROM system.chat_threads
    WHERE employee_id = p_employee_id
      AND archived_at IS NULL
      AND last_message_at > NOW() - INTERVAL '6 hours'  -- thread fica "viva" 6h
    ORDER BY last_message_at DESC
    LIMIT 1;
    IF FOUND THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO system.chat_threads(employee_id) VALUES (p_employee_id) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION system.chat_thread_open(text, boolean) TO authenticated, service_role;

-- ───────── 4. RPC chat_message_add ─────────
CREATE OR REPLACE FUNCTION system.chat_message_add(
  p_thread_id uuid,
  p_role text,
  p_content text,
  p_tool_calls jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO system.chat_messages(thread_id, role, content, tool_calls, metadata)
  VALUES (p_thread_id, p_role, p_content, p_tool_calls, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  UPDATE system.chat_threads
  SET last_message_at = NOW(),
      message_count   = message_count + 1,
      updated_at      = NOW(),
      -- auto-title: usa primeira user message como título (até 60 chars)
      title = CASE
                WHEN title IS NULL AND p_role = 'user' THEN left(p_content, 60)
                ELSE title
              END
  WHERE id = p_thread_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION system.chat_message_add(uuid, text, text, jsonb, jsonb) TO authenticated, service_role;

-- ───────── 5. RPC chat_thread_archive ─────────
CREATE OR REPLACE FUNCTION system.chat_thread_archive(p_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public
AS $$
BEGIN
  UPDATE system.chat_threads SET archived_at = NOW() WHERE id = p_thread_id AND archived_at IS NULL;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION system.chat_thread_archive(uuid) TO authenticated, service_role;

-- ───────── 6. View pública para o dashboard ─────────
DROP VIEW IF EXISTS public.system_chat_threads;
CREATE VIEW public.system_chat_threads
  WITH (security_invoker = on)
AS
SELECT
  t.id,
  t.employee_id,
  t.title,
  t.started_at,
  t.last_message_at,
  t.archived_at,
  t.message_count,
  -- buckets para UI: today / yesterday / this_week / older
  CASE
    WHEN t.last_message_at >= CURRENT_DATE THEN 'today'
    WHEN t.last_message_at >= CURRENT_DATE - 1 THEN 'yesterday'
    WHEN t.last_message_at >= CURRENT_DATE - 7 THEN 'this_week'
    WHEN t.last_message_at >= CURRENT_DATE - 30 THEN 'this_month'
    ELSE 'older'
  END AS bucket,
  -- preview da última mensagem (não é tão crítico — UI pode load lazy)
  (
    SELECT left(m.content, 100)
    FROM system.chat_messages m
    WHERE m.thread_id = t.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_preview
FROM system.chat_threads t;

GRANT SELECT ON public.system_chat_threads TO authenticated, service_role;

DROP VIEW IF EXISTS public.system_chat_messages;
CREATE VIEW public.system_chat_messages
  WITH (security_invoker = on)
AS
SELECT
  id, thread_id, role, content, tool_calls, metadata, created_at
FROM system.chat_messages;

GRANT SELECT ON public.system_chat_messages TO authenticated, service_role;

-- ───────── 7. RLS ─────────
ALTER TABLE system.chat_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON system.chat_threads, system.chat_messages TO authenticated;
GRANT ALL ON system.chat_threads, system.chat_messages TO service_role;

DROP POLICY IF EXISTS "chat_threads_staff" ON system.chat_threads;
CREATE POLICY "chat_threads_staff" ON system.chat_threads
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "chat_messages_staff" ON system.chat_messages;
CREATE POLICY "chat_messages_staff" ON system.chat_messages
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ───────── 8. updated_at trigger em threads ─────────
DROP TRIGGER IF EXISTS trg_chat_threads_updated_at ON system.chat_threads;
CREATE TRIGGER trg_chat_threads_updated_at
  BEFORE UPDATE ON system.chat_threads
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

COMMIT;
