-- =============================================================
-- Fix² condo_dashboard_kpis: remove cast a enum inexistente
-- =============================================================
-- O enum chama-se v2_condominios.estado_fatura (não _enum).
-- A versão anterior tinha cast 'pendente'::v2_condominios.estado_fatura_enum
-- no OR-fallback, mas o parser PG avalia ao compilar e rebenta com
-- "type does not exist". Substitui por estado::text = 'pendente' puro.
-- =============================================================

CREATE OR REPLACE FUNCTION v2_condominios.condo_dashboard_kpis(
  p_ano integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer
) RETURNS jsonb
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
  v_dividas_fornecedores numeric;
  v_fundo_reserva numeric;
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
  v_saldo_inicial := COALESCE(v_saldo_inicial, 0);

  WITH movs AS (
    SELECT
      saldo_apos,
      LAG(saldo_apos, 1, v_saldo_inicial) OVER (ORDER BY data_movimento, id) as saldo_ant
    FROM v2_condominios.extrato_bancario
    WHERE data_movimento BETWEEN v_data_inicio AND v_data_fim
  )
  SELECT
    ROUND(COALESCE(SUM(saldo_apos - saldo_ant) FILTER (WHERE saldo_apos > saldo_ant), 0), 2),
    ROUND(COALESCE(SUM(saldo_ant - saldo_apos) FILTER (WHERE saldo_apos < saldo_ant), 0), 2)
  INTO v_receitas, v_despesas
  FROM movs;

  SELECT COALESCE(saldo_apos, v_saldo_inicial + v_receitas - v_despesas)
  INTO v_saldo_final
  FROM v2_condominios.extrato_bancario
  WHERE data_movimento <= v_data_fim
  ORDER BY data_movimento DESC, id DESC LIMIT 1;

  SELECT COALESCE(SUM(valor_emitido - valor_pago), 0),
         COUNT(DISTINCT fracao_id) FILTER (WHERE valor_emitido > valor_pago)
  INTO v_mora_total, v_fracoes_mora
  FROM v2_condominios.recebimentos
  WHERE estado::text IN ('pendente', 'mora', 'acordo');

  SELECT COALESCE(SUM(COALESCE(valor, 0) + COALESCE(iva, 0)), 0)
  INTO v_dividas_fornecedores
  FROM v2_condominios.faturas_pendentes
  WHERE estado::text = 'pendente';

  v_fundo_reserva := ROUND(v_receitas * 0.10, 2);

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
    'fracoes_em_mora',        v_fracoes_mora,
    'dividas_fornecedores',   v_dividas_fornecedores,
    'fundo_comum_reserva',    v_fundo_reserva,
    'saldo_financeiro',       v_saldo_final + v_mora_total - v_dividas_fornecedores
  );
END;
$$;
