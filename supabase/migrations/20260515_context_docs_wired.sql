-- Sprint Q1 — Centralized Context wired to agents
--
-- State check (2026-05-14): system.context_docs already has all file-management
-- columns (organization_id, folder_path, is_folder, file_name, mime_type,
-- size_bytes, storage_provider, storage_ref, ocr_status, ocr_text), the view
-- public.cookai_context_docs already exists with security_invoker=on, indexes
-- exist (incl. FTS gin), and current_organization_ids() RPC exists.
--
-- The ONLY missing piece for the Q1 sprint is the RPC that aggregates SOPs/ICPs/
-- never-rules into a string suitable for injection into the agent system prompt.
-- This migration adds that RPC (and a public-schema shim for supabase.rpc()).
--
-- Affects: V1 Core Hub (hkmvszkpxjbxmnixzqbl). Idempotent.

BEGIN;

-- ───────── system.get_agent_context(agent_id, max_chars) ─────────
-- Aggregates context docs (sop/icp/never_rule/legal/procedure) into a single
-- text block ordered by relevance type then recency. Used by task-execute and
-- agent-chat edge fns to auto-load global + agent-scoped context.

CREATE OR REPLACE FUNCTION system.get_agent_context(
  p_agent_id text,
  p_max_chars int DEFAULT 8000
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = system, public
AS $$
DECLARE
  v_buf   text := '';
  v_row   record;
  v_chunk text;
BEGIN
  IF p_agent_id IS NULL OR p_agent_id = '' THEN
    RETURN '';
  END IF;

  FOR v_row IN
    SELECT title, type, content, source_url, updated_at
    FROM system.context_docs
    WHERE (employee_id IS NULL OR employee_id = p_agent_id)
      AND type IN ('sop','icp','never_rule','legal','procedure')
      AND coalesce(is_folder, false) = false
      AND content IS NOT NULL
      AND length(content) > 0
    ORDER BY
      CASE type
        WHEN 'never_rule' THEN 1   -- hard constraints primeiro
        WHEN 'legal'      THEN 2
        WHEN 'sop'        THEN 3
        WHEN 'procedure'  THEN 4
        WHEN 'icp'        THEN 5
        ELSE 6
      END,
      updated_at DESC
  LOOP
    v_chunk := format(
      E'\n### [%s] %s\n%s\n',
      upper(v_row.type),
      v_row.title,
      left(v_row.content, 3000)
    );

    IF length(v_buf) + length(v_chunk) > p_max_chars THEN
      EXIT;
    END IF;

    v_buf := v_buf || v_chunk;
  END LOOP;

  RETURN v_buf;
END;
$$;

GRANT EXECUTE ON FUNCTION system.get_agent_context(text, int) TO authenticated, service_role;

COMMENT ON FUNCTION system.get_agent_context(text, int) IS
  'Sprint Q1: agrega SOPs/ICPs/never-rules/legal/procedure do agent (e globais) para injecção em system prompt.';

-- ───────── public.get_agent_context (shim para supabase.rpc()) ─────────
CREATE OR REPLACE FUNCTION public.get_agent_context(p_agent_id text, p_max_chars int DEFAULT 8000)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = system, public
AS $$
  SELECT system.get_agent_context(p_agent_id, p_max_chars);
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_context(text, int) TO authenticated, service_role;

COMMIT;
