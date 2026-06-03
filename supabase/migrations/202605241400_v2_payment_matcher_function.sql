-- =============================================================================
-- Migration: 202605241400_v2_payment_matcher_function.sql
-- Função SQL fn_match_pagamentos_v1 para popular v2_condominios.pagamentos.fracao_id
-- a partir de descricao_banco (TRF SEPA+ INST <N> DE <NOME>) ou nome_condomino.
--
-- Workflow:
--   1. Para cada pagamento sem fracao_id:
--   2. Extrair nome via regex em descricao_banco (ou usar nome_condomino se preenchido)
--   3. Fuzzy match (pg_trgm similarity) em core.pessoas.nome com threshold
--   4. Lookup fração via v2_condominios.condominos JOIN (pessoa_id → fracao_id)
--   5. Se match único → UPDATE pagamentos.fracao_id + fracao_codigo + nota auditoria
--   6. Se ambíguo (pessoa com várias fracções) → UPDATE com 1ª + flag em notas
--   7. Se sem match → contar no_match (não bloqueia)
--
-- Smoke test 2026-05-24:
--   threshold 0.55 → 45 unique + 1 ambiguous (69 input)
--   threshold 0.35 → +14 unique + 4 ambiguous (23 restantes)
--   TOTAL: 64/69 = 93% matched
--
-- Usage:
--   SELECT * FROM v2_condominios.fn_match_pagamentos_v1();                    -- todos
--   SELECT * FROM v2_condominios.fn_match_pagamentos_v1('2026-01-01', 0.55);  -- só 2026, threshold strict
--
-- Refs: memory project-v2-payment-fraction-matching
-- =============================================================================

CREATE OR REPLACE FUNCTION v2_condominios.fn_match_pagamentos_v1(
  only_after_date date DEFAULT NULL,
  min_similarity numeric DEFAULT 0.55
)
RETURNS TABLE (
  total_unmatched_before bigint,
  matched_unique bigint,
  matched_ambiguous bigint,
  no_match bigint,
  total_unmatched_after bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, v2_condominios, extensions
AS $$
DECLARE
  v_pagamento RECORD;
  v_nome_extraido text;
  v_pessoa_match RECORD;
  v_fracao_id uuid;
  v_fracao_codigo text;
  v_matched_count bigint := 0;
  v_ambiguous_count bigint := 0;
  v_no_match_count bigint := 0;
  v_total_before bigint;
  v_total_after bigint;
  v_num_fracoes integer;
BEGIN
  SELECT COUNT(*) INTO v_total_before
  FROM v2_condominios.pagamentos
  WHERE fracao_id IS NULL
    AND (only_after_date IS NULL OR data_pagamento >= only_after_date);

  FOR v_pagamento IN
    SELECT id, descricao_banco, valor, data_pagamento, referencia_banco, nome_condomino
    FROM v2_condominios.pagamentos
    WHERE fracao_id IS NULL
      AND (only_after_date IS NULL OR data_pagamento >= only_after_date)
  LOOP
    -- 1. Tentar nome_condomino se já preenchido
    IF v_pagamento.nome_condomino IS NOT NULL AND length(trim(v_pagamento.nome_condomino)) > 3 THEN
      v_nome_extraido := trim(v_pagamento.nome_condomino);
    ELSE
      -- 2. Parse descricao_banco
      v_nome_extraido := NULL;
      IF v_pagamento.descricao_banco IS NOT NULL THEN
        -- Padrão 1: "DE <NOME>"
        v_nome_extraido := substring(v_pagamento.descricao_banco FROM ' DE (.+?)$');
        -- Padrão 2 (fallback): limpar prefixes bancários comuns
        IF v_nome_extraido IS NULL THEN
          v_nome_extraido := regexp_replace(v_pagamento.descricao_banco,
            '^(TRF|TRANSF|TRANSFERENCIA|MB|PAGAMENTO)\s*(CR|DB)?\s*(SEPA\+?|INST)?\s*\d*\s*(DE)?\s*', '', 'i');
          v_nome_extraido := trim(v_nome_extraido);
        END IF;
      END IF;
    END IF;

    IF v_nome_extraido IS NULL OR length(trim(v_nome_extraido)) < 3 THEN
      v_no_match_count := v_no_match_count + 1;
      CONTINUE;
    END IF;
    v_nome_extraido := trim(v_nome_extraido);

    -- 3. Fuzzy match em core.pessoas
    SELECT p.id AS pessoa_id, p.nome,
           similarity(upper(unaccent(p.nome)), upper(unaccent(v_nome_extraido))) AS sim
    INTO v_pessoa_match
    FROM core.pessoas p
    WHERE p.nome IS NOT NULL
      AND similarity(upper(unaccent(p.nome)), upper(unaccent(v_nome_extraido))) > min_similarity
    ORDER BY similarity(upper(unaccent(p.nome)), upper(unaccent(v_nome_extraido))) DESC
    LIMIT 1;

    IF v_pessoa_match.pessoa_id IS NULL THEN
      v_no_match_count := v_no_match_count + 1;
      CONTINUE;
    END IF;

    -- 4. Lookup fração via v2_condominios.condominos
    SELECT c.fracao_id, f.codigo
    INTO v_fracao_id, v_fracao_codigo
    FROM v2_condominios.condominos c
    LEFT JOIN v2_condominios.fracoes f ON f.id = c.fracao_id
    WHERE c.pessoa_id = v_pessoa_match.pessoa_id
      AND c.activo = true
      AND c.fracao_id IS NOT NULL
    ORDER BY c.is_administrador DESC NULLS LAST, c.data_inicio DESC NULLS LAST
    LIMIT 1;

    IF v_fracao_id IS NULL THEN
      v_no_match_count := v_no_match_count + 1;
      CONTINUE;
    END IF;

    -- 5. Detectar ambiguidade
    SELECT count(*) INTO v_num_fracoes
    FROM v2_condominios.condominos c
    WHERE c.pessoa_id = v_pessoa_match.pessoa_id
      AND c.activo = true
      AND c.fracao_id IS NOT NULL;

    IF v_num_fracoes > 1 THEN
      v_ambiguous_count := v_ambiguous_count + 1;
      UPDATE v2_condominios.pagamentos
      SET fracao_id = v_fracao_id,
          fracao_codigo = v_fracao_codigo,
          notas = COALESCE(notas, '') || ' [matched ambiguous: pessoa tem ' || v_num_fracoes || ' fracções]',
          atualizado_em = now()
      WHERE id = v_pagamento.id;
      CONTINUE;
    END IF;

    -- 6. Match único
    UPDATE v2_condominios.pagamentos
    SET fracao_id = v_fracao_id,
        fracao_codigo = v_fracao_codigo,
        notas = COALESCE(notas, '') || ' [auto-matched via ' ||
                CASE WHEN v_pagamento.nome_condomino IS NOT NULL THEN 'nome_condomino' ELSE 'descricao_banco' END ||
                ' sim=' || ROUND(v_pessoa_match.sim::numeric, 2) || ']',
        atualizado_em = now()
    WHERE id = v_pagamento.id;

    v_matched_count := v_matched_count + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_total_after
  FROM v2_condominios.pagamentos
  WHERE fracao_id IS NULL
    AND (only_after_date IS NULL OR data_pagamento >= only_after_date);

  RETURN QUERY SELECT v_total_before, v_matched_count, v_ambiguous_count, v_no_match_count, v_total_after;
END;
$$;

COMMENT ON FUNCTION v2_condominios.fn_match_pagamentos_v1 IS
  'Matcher pagamento→fração. Para cada pagamento sem fracao_id, extrai nome de descricao_banco/nome_condomino, fuzzy match (pg_trgm) em core.pessoas, lookup fração via v2_condominios.condominos. Ver memory project-v2-payment-fraction-matching.';

GRANT EXECUTE ON FUNCTION v2_condominios.fn_match_pagamentos_v1 TO service_role;
