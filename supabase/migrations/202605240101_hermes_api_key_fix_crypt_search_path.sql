-- =============================================================================
-- Migration: 202605240101_hermes_api_key_fix_crypt_search_path.sql
-- Fix: pgcrypto.crypt() está no schema 'extensions' (não 'public').
-- A RPC iam.api_key_can() falha com "function crypt does not exist"
-- porque o search_path não incluía 'extensions'.
-- Solução: adicionar 'extensions' ao search_path da função.
-- Forward-only — corrige 202605240100_hermes_api_key sem rollback.
--
-- Aplicada em V1 Core Hub (hkmvszkpxjbxmnixzqbl) em 2026-05-24 01:56 UTC
-- por supabase-designer (sessão ede1fb47) — este ficheiro é o mirror local
-- para evitar DB-003 (215 migrations remotas sem ficheiro local).
-- =============================================================================

CREATE OR REPLACE FUNCTION iam.api_key_can(
    p_api_key  text,
    p_section  text,
    p_action   text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iam, system, extensions, public
AS $$
DECLARE
    v_group_code  text;
    v_can_do      boolean := false;
BEGIN
    -- Passo 1: encontrar api_key activa cujo hash corresponde ao plaintext recebido
    -- pgcrypto crypt() faz o match contra o hash bcrypt armazenado
    -- '$PENDING$' nunca faz match (bcrypt rejeita o formato)
    SELECT ak.permission_group_code
    INTO   v_group_code
    FROM   system.api_keys ak
    WHERE  ak.active = true
      AND  ak.api_key_hash != '$PENDING$'
      AND  extensions.crypt(p_api_key, ak.api_key_hash) = ak.api_key_hash
    LIMIT  1;

    IF v_group_code IS NULL THEN
        RETURN false;
    END IF;

    -- Passo 2: verificar permissão no grupo para a secção+acção pedida
    SELECT CASE p_action
               WHEN 'view'   THEN pg.can_view
               WHEN 'edit'   THEN pg.can_edit
               WHEN 'create' THEN pg.can_create
               WHEN 'delete' THEN pg.can_delete
               ELSE false
           END
    INTO   v_can_do
    FROM   iam.permission_grants pg
    WHERE  pg.group_code   = v_group_code
      AND  pg.section_code = p_section;

    -- Actualizar last_used_at e usage_count (best-effort)
    UPDATE system.api_keys
    SET    last_used_at = now(),
           usage_count  = usage_count + 1
    WHERE  active = true
      AND  api_key_hash != '$PENDING$'
      AND  extensions.crypt(p_api_key, api_key_hash) = api_key_hash;

    RETURN COALESCE(v_can_do, false);
END;
$$;

COMMENT ON FUNCTION iam.api_key_can(text, text, text) IS
    'Valida se a api_key (plaintext) tem permissão para section+action. '
    'Usa bcrypt via pgcrypto (extensions.crypt). Actualiza last_used_at/usage_count. '
    'SECURITY DEFINER — só invocar via service_role (Edge Functions). ADR-018. '
    'Fix: search_path inclui extensions para pgcrypto.crypt() (v202605240101).';

-- Manter grants — REVOKE + GRANT para garantir estado correcto
REVOKE ALL ON FUNCTION iam.api_key_can(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION iam.api_key_can(text, text, text) FROM anon;
REVOKE ALL ON FUNCTION iam.api_key_can(text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION iam.api_key_can(text, text, text) TO service_role;
