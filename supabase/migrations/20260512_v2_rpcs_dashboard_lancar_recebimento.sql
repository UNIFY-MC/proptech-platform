-- =============================================================
-- Fase B parcial — RPCs Prestação de Contas + lancar_recebimento
-- =============================================================
-- 3 RPCs core para a UI funcionar:
--   - condo_dashboard_kpis()        substitui get_cc_2026 + get_receitas_resumo
--   - lancar_recebimento(...)       substitui V2 lancar_recebimento
--   - condo_dashboard_summary()     substitui parcialmente portal_admin_get_all
-- Todas com auth via is_staff() (sem p_password).
-- =============================================================

-- ─────────────────────────────────────────────────────────
-- RPC 1: condo_dashboard_kpis()
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION v2_condominios.condo_dashboard_kpis(
  p_ano int DEFAULT EXTRACT(year FROM CURRENT_DATE)::int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
DECLARE
  v_data_inicio date;
  v_data_fim date;
  v_saldo_inicial numeric;
  v_receitas numeric;
  v_despesas numeric;
  v_saldo_final numeric;
  v_mora_total numeric;
  v_fracoes_mora int;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires staff role';
  END IF;

  v_data_inicio := make_date(p_ano, 1, 1);
  v_data_fim   := make_date(p_ano, 12, 31);

  SELECT COALESCE(saldo_apos, 0) INTO v_saldo_inicial
  FROM v2_condominios.extrato_bancario
  WHERE data_movimento < v_data_inicio
  ORDER BY data_movimento DESC, id DESC LIMIT 1;

  SELECT COALESCE(SUM(valor_pago), 0) INTO v_receitas
  FROM v2_condominios.recebimentos
  WHERE data_pagamento BETWEEN v_data_inicio AND v_data_fim;

  SELECT COALESCE(SUM(ABS(valor)), 0) INTO v_despesas
  FROM v2_condominios.extrato_bancario
  WHERE data_movimento BETWEEN v_data_inicio AND v_data_fim AND valor < 0;

  SELECT COALESCE(saldo_apos, v_saldo_inicial + v_receitas - v_despesas) INTO v_saldo_final
  FROM v2_condominios.extrato_bancario
  WHERE data_movimento <= v_data_fim
  ORDER BY data_movimento DESC, id DESC LIMIT 1;

  SELECT COALESCE(SUM(valor_emitido - valor_pago), 0),
         COUNT(DISTINCT fracao_id) FILTER (WHERE valor_emitido > valor_pago)
  INTO v_mora_total, v_fracoes_mora
  FROM v2_condominios.recebimentos
  WHERE estado IN ('pendente', 'mora', 'acordo');

  RETURN jsonb_build_object(
    'ano', p_ano,
    'periodo_inicio', v_data_inicio,
    'periodo_fim',    v_data_fim,
    'saldo_bancario_inicial', v_saldo_inicial,
    'receitas',               v_receitas,
    'despesas',               v_despesas,
    'saldo_bancario_final',   v_saldo_final,
    'resultado_periodo',      v_receitas - v_despesas,
    'mora_total',             v_mora_total,
    'fracoes_em_mora',        v_fracoes_mora
  );
END;
$$;

GRANT EXECUTE ON FUNCTION v2_condominios.condo_dashboard_kpis(int) TO authenticated;
REVOKE EXECUTE ON FUNCTION v2_condominios.condo_dashboard_kpis(int) FROM anon, PUBLIC;

-- ─────────────────────────────────────────────────────────
-- RPC 2: lancar_recebimento
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION v2_condominios.lancar_recebimento(
  p_fracao_codigo text,
  p_valor numeric,
  p_data date DEFAULT CURRENT_DATE,
  p_referencia text DEFAULT NULL,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
DECLARE
  v_fracao_id uuid;
  v_condomino_id uuid;
  v_recebimento_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires staff role';
  END IF;

  SELECT id INTO v_fracao_id
  FROM v2_condominios.fracoes WHERE codigo = p_fracao_codigo LIMIT 1;

  IF v_fracao_id IS NULL THEN
    RAISE EXCEPTION 'fracao não encontrada: %', p_fracao_codigo;
  END IF;

  SELECT id INTO v_condomino_id
  FROM v2_condominios.condominos
  WHERE fracao_id = v_fracao_id AND activo = true
  ORDER BY created_at DESC LIMIT 1;

  INSERT INTO v2_condominios.recebimentos
  (fracao_id, condomino_id, periodo, valor_emitido, valor_pago, vencimento,
   data_pagamento, estado, referencia_mb, observacoes, gerado_por)
  VALUES (
    v_fracao_id,
    v_condomino_id,
    date_trunc('month', p_data)::date,
    p_valor,
    p_valor,
    p_data,
    p_data,
    'pago'::v2_condominios.estado_recebimento,
    p_referencia,
    p_observacoes,
    'manual-' || COALESCE((SELECT email FROM core.pessoas WHERE auth_user_id = auth.uid() LIMIT 1), 'staff')
  )
  RETURNING id INTO v_recebimento_id;

  RETURN jsonb_build_object(
    'success', true,
    'recebimento_id', v_recebimento_id,
    'fracao_id', v_fracao_id,
    'condomino_id', v_condomino_id,
    'valor', p_valor,
    'data', p_data
  );
END;
$$;

GRANT EXECUTE ON FUNCTION v2_condominios.lancar_recebimento(text, numeric, date, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION v2_condominios.lancar_recebimento(text, numeric, date, text, text) FROM anon, PUBLIC;

-- ─────────────────────────────────────────────────────────
-- RPC 3: condo_dashboard_summary()
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION v2_condominios.condo_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = v2_condominios, public
AS $$
DECLARE
  v_kpis jsonb;
  v_top_devedores jsonb;
  v_recebimentos_recentes jsonb;
  v_faturas_pendentes jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires staff role';
  END IF;

  v_kpis := v2_condominios.condo_dashboard_kpis();

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fracao', cc.fracao,
    'condomino', cc.condomino_atual,
    'divida', cc.divida_pendente,
    'ultimo_pagamento', cc.ultimo_pagamento
  ) ORDER BY cc.divida_pendente DESC), '[]'::jsonb)
  INTO v_top_devedores
  FROM (
    SELECT * FROM v2_condominios.conta_corrente
    WHERE divida_pendente > 0
    ORDER BY divida_pendente DESC LIMIT 10
  ) cc;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'data', r.data_pagamento,
    'valor', r.valor_pago,
    'fracao_codigo', f.codigo,
    'referencia', r.referencia_mb
  ) ORDER BY r.data_pagamento DESC), '[]'::jsonb)
  INTO v_recebimentos_recentes
  FROM (
    SELECT * FROM v2_condominios.recebimentos
    WHERE data_pagamento IS NOT NULL
    ORDER BY data_pagamento DESC LIMIT 10
  ) r
  JOIN v2_condominios.fracoes f ON f.id = r.fracao_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fornecedor', fp.fornecedor_nome,
    'numero', fp.numero_fatura,
    'valor', fp.valor + fp.iva,
    'vencimento', fp.vencimento
  ) ORDER BY fp.vencimento ASC), '[]'::jsonb)
  INTO v_faturas_pendentes
  FROM (
    SELECT * FROM v2_condominios.faturas_pendentes
    WHERE estado = 'pendente'
    ORDER BY vencimento ASC LIMIT 10
  ) fp;

  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'top_devedores', v_top_devedores,
    'recebimentos_recentes', v_recebimentos_recentes,
    'faturas_pendentes', v_faturas_pendentes,
    'generated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION v2_condominios.condo_dashboard_summary() TO authenticated;
REVOKE EXECUTE ON FUNCTION v2_condominios.condo_dashboard_summary() FROM anon, PUBLIC;

COMMENT ON FUNCTION v2_condominios.condo_dashboard_kpis(int) IS
  'KPIs Prestação de Contas. Substitui V2 get_cc_2026 + get_receitas_resumo. Auth via is_staff().';
COMMENT ON FUNCTION v2_condominios.lancar_recebimento(text, numeric, date, text, text) IS
  'Lançamento manual de recebimento. Substitui V2 lancar_recebimento. Auth via is_staff().';
COMMENT ON FUNCTION v2_condominios.condo_dashboard_summary() IS
  'Resumo dashboard principal: KPIs + top devedores + recebimentos recentes + faturas pendentes. Substitui parcialmente V2 portal_admin_get_all.';
