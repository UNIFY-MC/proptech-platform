-- =============================================================
-- Fase B parcial — Views Prestação de Contas + extrato_upsert RPC
-- =============================================================
-- 4 views adaptadas ao V1 schema (não 1:1 com V2; o V1 é mais
-- normalizado: documentos é só ficheiros, fracoes não tem nome
-- de condómino, recebimentos tem valor_emitido+valor_pago, etc).
-- 1 RPC: extrato_upsert (refactor auth p_password → is_staff()).
-- =============================================================

-- ─────────────────────────────────────────────────────────
-- View 1: extrato_com_docs
-- Equivalente V2: JOIN extrato + faturas_pendentes/documentos_drive
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v2_condominios.extrato_com_docs AS
SELECT
  eb.id,
  eb.edificio_id,
  eb.data_movimento,
  eb.descricao,
  eb.valor,
  eb.saldo_apos,
  eb.referencia_banco,
  eb.reconciliado,
  (dd.drive_url IS NOT NULL) AS tem_documento,
  dd.drive_url,
  dd.drive_file_id,
  eb.created_at
FROM v2_condominios.extrato_bancario eb
LEFT JOIN v2_condominios.faturas_pendentes fp ON fp.id = eb.recebimento_id
LEFT JOIN v2_condominios.documentos_drive dd ON dd.documento_id = fp.documento_id
ORDER BY eb.data_movimento DESC, eb.referencia_banco;

-- ─────────────────────────────────────────────────────────
-- View 2: mapa_dividas_fornecedores
-- Equivalente V2: agregação por fornecedor com totais pendente/pago
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v2_condominios.mapa_dividas_fornecedores AS
SELECT
  COALESCE(fp.fornecedor_id::text, fp.fornecedor_nome) AS fornecedor_key,
  fp.fornecedor_nome AS fornecedor,
  fp.fornecedor_nif AS nif,
  COUNT(*) AS total_faturas,
  COUNT(*) FILTER (WHERE fp.estado = 'pendente') AS faturas_pendentes,
  COUNT(*) FILTER (WHERE fp.estado = 'paga') AS faturas_pagas,
  COALESCE(SUM(fp.valor + fp.iva), 0) AS total_valor,
  COALESCE(SUM(fp.valor + fp.iva) FILTER (WHERE fp.estado = 'pendente'), 0) AS total_pendente,
  COALESCE(SUM(fp.valor + fp.iva) FILTER (WHERE fp.estado = 'paga'), 0) AS total_pago,
  MAX(fp.vencimento) AS ultima_fatura,
  MAX(fp.pago_em) AS ultimo_pagamento
FROM v2_condominios.faturas_pendentes fp
GROUP BY COALESCE(fp.fornecedor_id::text, fp.fornecedor_nome), fp.fornecedor_nome, fp.fornecedor_nif
ORDER BY total_pendente DESC;

-- ─────────────────────────────────────────────────────────
-- View 3: v_faturas_sem_ocr
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v2_condominios.v_faturas_sem_ocr AS
SELECT
  fp.id,
  fp.created_at,
  fp.fornecedor_nome AS fornecedor,
  fp.fornecedor_nif AS nif,
  fp.vencimento AS data_fatura,
  fp.numero_fatura,
  fp.valor + fp.iva AS valor_total,
  fp.descricao AS rubrica,
  fp.documento_id,
  CASE WHEN fp.pago_em IS NOT NULL THEN 'pago' ELSE 'sem_ocr' END AS estado
FROM v2_condominios.faturas_pendentes fp
WHERE NOT EXISTS (
  SELECT 1 FROM v2_condominios.faturas_ocr fo WHERE fo.documento_id = fp.documento_id
);

-- ─────────────────────────────────────────────────────────
-- View 4: v_ocr_historico
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v2_condominios.v_ocr_historico AS
SELECT
  fo.id,
  fo.created_at,
  d.filename_original AS ficheiro_nome,
  dd.drive_url AS pdf_url,
  fo.fornecedor_nome AS fornecedor,
  fo.fornecedor_nif AS nif_fornecedor,
  fo.data_fatura AS data_emissao,
  fo.numero_fatura,
  fo.valor_total AS valor_ocr,
  d.estado_ocr::text AS estado,
  fp.id AS fp_id,
  fp.descricao AS rubrica,
  fp.valor + fp.iva AS fp_valor_total,
  fp.pago_em
FROM v2_condominios.faturas_ocr fo
JOIN v2_condominios.documentos d ON d.id = fo.documento_id
LEFT JOIN v2_condominios.documentos_drive dd ON dd.documento_id = d.id
LEFT JOIN v2_condominios.faturas_pendentes fp ON fp.documento_id = d.id
ORDER BY fo.created_at DESC;

-- ─────────────────────────────────────────────────────────
-- View 5: conta_corrente — versão simples sem snapshots V2
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v2_condominios.conta_corrente AS
SELECT
  f.id,
  f.codigo AS fracao,
  f.permilagem,
  f.quota_base,
  c.pessoa_id AS condomino_id,
  p.nome AS condomino_atual,
  p.email,
  p.telemovel AS telefone,
  COALESCE((
    SELECT SUM(r.valor_emitido - r.valor_pago)
    FROM v2_condominios.recebimentos r
    WHERE r.fracao_id = f.id AND r.estado IN ('pendente','mora','acordo')
  ), 0) AS divida_pendente,
  COALESCE((
    SELECT SUM(r.valor_pago)
    FROM v2_condominios.recebimentos r
    WHERE r.fracao_id = f.id
  ), 0) AS total_recebido,
  (SELECT MAX(r.data_pagamento) FROM v2_condominios.recebimentos r WHERE r.fracao_id = f.id) AS ultimo_pagamento
FROM v2_condominios.fracoes f
LEFT JOIN v2_condominios.condominos c ON c.fracao_id = f.id AND c.activo = true
LEFT JOIN core.pessoas p ON p.id = c.pessoa_id
WHERE f.estado = 'activa'
ORDER BY f.codigo;

-- ─────────────────────────────────────────────────────────
-- GRANTs
-- ─────────────────────────────────────────────────────────
GRANT SELECT ON v2_condominios.extrato_com_docs           TO authenticated, anon;
GRANT SELECT ON v2_condominios.mapa_dividas_fornecedores  TO authenticated, anon;
GRANT SELECT ON v2_condominios.v_faturas_sem_ocr          TO authenticated, anon;
GRANT SELECT ON v2_condominios.v_ocr_historico            TO authenticated, anon;
GRANT SELECT ON v2_condominios.conta_corrente             TO authenticated, anon;

-- ═════════════════════════════════════════════════════════
-- RPC: extrato_upsert (substitui V2 portal_extrato_upsert)
--   - SEM parâmetro p_password
--   - Auth via is_staff() (refactor canónico — ADR-V2-003 D1)
--   - Conflict resolution em referencia_banco (UNIQUE idx existe)
-- ═════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION v2_condominios.extrato_upsert(p_records jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
DECLARE
  v_edificio_id uuid;
  v_inserted int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  r jsonb;
  result_action text;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires staff role';
  END IF;

  SELECT id INTO v_edificio_id FROM core.imoveis
  WHERE condominio_ref = 'Prata Lote 2A' AND tipo = 'gestao' LIMIT 1;

  IF v_edificio_id IS NULL THEN
    RAISE EXCEPTION 'edificio não encontrado em core.imoveis';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_records) LOOP
    IF (r->>'data') IS NULL OR (r->>'numero_doc') IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO v2_condominios.extrato_bancario
    (edificio_id, data_movimento, descricao, valor, saldo_apos,
     referencia_banco, reconciliado, importado_em)
    VALUES (
      v_edificio_id,
      NULLIF(r->>'data', 'null')::date,
      COALESCE(NULLIF(r->>'descricao', 'null'), NULLIF(r->>'codigo', 'null'), 'sem descrição'),
      COALESCE(NULLIF(r->>'credito', 'null')::numeric, 0)
        - COALESCE(NULLIF(r->>'debito', 'null')::numeric, 0),
      NULLIF(r->>'saldo', 'null')::numeric,
      r->>'numero_doc',
      false,
      now()
    )
    ON CONFLICT (referencia_banco) WHERE referencia_banco IS NOT NULL
    DO UPDATE SET
      data_movimento = EXCLUDED.data_movimento,
      descricao      = EXCLUDED.descricao,
      valor          = EXCLUDED.valor,
      saldo_apos     = EXCLUDED.saldo_apos,
      updated_at     = now()
    RETURNING (CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END) INTO result_action;

    IF result_action = 'inserted' THEN
      v_inserted := v_inserted + 1;
    ELSE
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated',  v_updated,
    'skipped',  v_skipped,
    'total',    v_inserted + v_updated + v_skipped
  );
END;
$$;

GRANT EXECUTE ON FUNCTION v2_condominios.extrato_upsert(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION v2_condominios.extrato_upsert(jsonb) FROM anon, PUBLIC;

COMMENT ON FUNCTION v2_condominios.extrato_upsert(jsonb) IS
  'Substitui V2 portal_extrato_upsert. Refactor auth: usa is_staff() (sem p_password). Idempotente via UNIQUE idx em referencia_banco.';
