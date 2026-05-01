-- Migration 03: RPC pública para resolver info do magic link
-- Sprint 1D Day 3 — Receipt Trojan Horse Alpha
-- Status: NÃO APLICADA — aguarda autorização de Mário
--
-- Propósito: permitir que a ReceiptLandingScreen (prestador anónimo) mostre
--   info do recibo (tipo_servico, valor, data, owner_nome) antes do submit.
--   Sem esta RPC, a landing screen mostra placeholders genéricos ("—").
--
-- Segurança:
--   - SECURITY DEFINER (não expõe tabelas directamente)
--   - Só retorna primeiro nome do owner (split_part)
--   - GRANT TO anon + authenticated (não TO public)
--   - Valida token_hash (64 hex) antes de qualquer SELECT
--   - Não retorna owner_pessoa_id, magic_link_id nem quaisquer IDs internos
--
-- Dependências: tabela v5_manutencao.magic_links (Day 1) + core.pessoas
--   (ver migration 01-magic-links-recibos.sql)
--
-- Para aplicar:
--   Supabase Dashboard → SQL Editor → colar e executar
--   OU: supabase db push (se config.toml configurado)

CREATE OR REPLACE FUNCTION v5_manutencao.get_magic_link_public_info(
  p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v5_manutencao, core, public
STABLE
AS $$
DECLARE
  v_link  RECORD;
  v_nome  TEXT;
BEGIN
  -- Validar formato do token_hash antes de qualquer acesso à BD
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  SELECT
    ml.tipo_servico,
    ml.valor_eur,
    ml.data_servico,
    ml.expires_at,
    ml.used_at,
    p.primeiro_nome AS owner_primeiro_nome
  INTO v_link
  FROM v5_manutencao.magic_links ml
  JOIN core.pessoas p ON p.id = ml.owner_pessoa_id
  WHERE ml.token = p_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_link.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'used');
  END IF;

  IF v_link.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  -- Retorna apenas info de display — sem IDs internos, sem dados sensíveis
  RETURN jsonb_build_object(
    'tipo_servico',  v_link.tipo_servico,
    'valor_eur',     v_link.valor_eur,
    'data_servico',  v_link.data_servico,
    'owner_nome',    COALESCE(v_link.owner_primeiro_nome, 'O proprietário')
  );
END;
$$;

-- Segurança: revogar de PUBLIC, conceder apenas a anon + authenticated
REVOKE EXECUTE ON FUNCTION v5_manutencao.get_magic_link_public_info(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION v5_manutencao.get_magic_link_public_info(TEXT) TO anon;
GRANT  EXECUTE ON FUNCTION v5_manutencao.get_magic_link_public_info(TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION v5_manutencao.get_magic_link_public_info(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ── Verificação pós-apply ────────────────────────────────────────────────
-- SELECT v5_manutencao.get_magic_link_public_info('a' || repeat('0', 63)); -- → {"error":"not_found"}
-- SELECT v5_manutencao.get_magic_link_public_info(NULL);                   -- → {"error":"invalid_token"}
-- SELECT v5_manutencao.get_magic_link_public_info('zz_invalid');           -- → {"error":"invalid_token"}
