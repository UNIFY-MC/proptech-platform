-- 24_v5_3_4d_rpc_guards.sql
-- Sprint 3.4D Task D+E: REVOKE anon · fn_anonymize_account · deleted_at em memberships
-- Aplicar: 2026-04-26

-- ─── Task E: REVOKE anon + PUBLIC de fn_complete_onboarding ───────────────
-- Descoberto: tinha GRANT PUBLIC + anon (inseguro — permite signup não autenticado)

REVOKE EXECUTE ON FUNCTION core.fn_complete_onboarding(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION core.fn_complete_onboarding(jsonb) FROM anon;
-- GRANT authenticated mantém-se (necessário para o onboarding wizard)

-- ─── Task D: deleted_at em memberships (para soft-delete na anonimização) ─

ALTER TABLE core.memberships
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_memberships_deleted_at
  ON core.memberships(deleted_at) WHERE deleted_at IS NULL;

-- ─── Task D: RPC de anonimização (chamada pela Edge Function com service_role) ──
-- NUNCA expor a authenticated nem anon — risco destrutivo
-- A Edge Function usa supaService (service_role) para invocar esta função

CREATE OR REPLACE FUNCTION core.fn_anonymize_account(p_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, v5_manutencao, public
AS $$
DECLARE
  v_pessoa_id  uuid;
  v_anon_email text := 'deleted+' || replace(p_auth_user_id::text, '-', '') || '@v5casa.pt';
BEGIN
  SELECT id INTO v_pessoa_id
  FROM core.pessoas
  WHERE auth_user_id = p_auth_user_id;

  IF v_pessoa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pessoa_not_found');
  END IF;

  -- Anonimizar PII da pessoa
  UPDATE core.pessoas SET
    nome          = 'Conta eliminada',
    primeiro_nome = NULL,
    apelidos      = NULL,
    email         = v_anon_email,
    telemovel     = NULL,
    nif           = NULL,
    foto_url      = NULL,
    metadata      = jsonb_build_object('deleted', true, 'deleted_at', now()::text),
    updated_at    = now()
  WHERE id = v_pessoa_id;

  -- Soft-delete memberships (preserva referências nas ordens)
  UPDATE core.memberships SET
    deleted_at = now()
  WHERE pessoa_id  = v_pessoa_id
    AND deleted_at IS NULL;

  -- Anonimizar PII fiscal (NIF, IBAN, morada)
  UPDATE v5_manutencao.perfis_fiscais SET
    nome              = 'Conta eliminada',
    nome_facturacao   = 'Conta eliminada',
    nif               = NULL,
    morada_facturacao = NULL,
    iban              = NULL
  WHERE pessoa_id = v_pessoa_id;

  -- ordens_trabalho: manter intactas (obrigação fiscal AT 10 anos)
  -- tickets_suporte: manter para auditoria interna

  RETURN jsonb_build_object('ok', true, 'pessoa_id', v_pessoa_id::text);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PERMISSÕES de core.fn_anonymize_account
-- Apenas service_role · chamada exclusivamente pelo Edge Function delete-account
-- NUNCA chamável por authenticated/anon.
--
-- Bug fix de smoke test G da Fase 3.4D:
-- SECURITY DEFINER sem GRANT EXECUTE = erro 42501 silencioso.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION core.fn_anonymize_account(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION core.fn_anonymize_account(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION core.fn_anonymize_account(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION core.fn_anonymize_account(uuid) FROM anon;

NOTIFY pgrst, 'reload schema';
