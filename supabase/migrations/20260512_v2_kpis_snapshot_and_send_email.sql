-- =============================================================
-- Snapshot KPIs ano fechado + RPCs CTAs Faturas/Bancos
-- =============================================================
-- Decisão Mário: dados até 31 Dez 2025 são FROZEN (snapshot),
-- 2026 ao vivo com saldo_inicial = saldo_final 2025.
-- =============================================================

CREATE TABLE IF NOT EXISTS v2_condominios.kpis_ano_fechado (
  ano                       integer PRIMARY KEY,
  saldo_bancario_inicial    numeric NOT NULL,
  receitas                  numeric NOT NULL,
  despesas                  numeric NOT NULL,
  saldo_bancario_final      numeric NOT NULL,
  resultado_periodo         numeric GENERATED ALWAYS AS (receitas - despesas) STORED,
  mora_total                numeric DEFAULT 0,
  fracoes_em_mora           integer DEFAULT 0,
  dividas_fornecedores      numeric DEFAULT 0,
  valores_em_analise        numeric DEFAULT 0,
  valores_a_devolver        numeric DEFAULT 0,
  fundo_comum_reserva       numeric DEFAULT 0,
  saldo_financeiro          numeric DEFAULT 0,
  notas                     text,
  congelado_em              timestamptz NOT NULL DEFAULT now(),
  congelado_por             text DEFAULT 'mario'
);

ALTER TABLE v2_condominios.kpis_ano_fechado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kpis_read_staff ON v2_condominios.kpis_ano_fechado;
CREATE POLICY kpis_read_staff ON v2_condominios.kpis_ano_fechado FOR SELECT TO authenticated USING (public.is_staff());

-- Seed 2024 + 2025 (legacy screenshots Prata Lote 2A)
INSERT INTO v2_condominios.kpis_ano_fechado (
  ano, saldo_bancario_inicial, receitas, despesas, saldo_bancario_final,
  mora_total, dividas_fornecedores, valores_em_analise, valores_a_devolver,
  fundo_comum_reserva, saldo_financeiro, notas
) VALUES
  (2024, 0,         83278.73, 52252.45, 31026.28,
   1767.07, 1872.45, 23573.38, 1611.16, 6551.05, 52883.12,
   'Seed — legacy V2 prataowners.pt Prata Lote 2A 2024 (31 Dez 2024)'),
  (2025, 31026.28,  85242.91, 39024.04, 77245.15,
   8138.82, 1549.80, 13770.09, 6175.58, 6526.32, 91428.68,
   'Seed — legacy V2 prataowners.pt Prata Lote 2A 2025 (31 Dez 2025)')
ON CONFLICT (ano) DO NOTHING;

-- RPC actualizado (snapshot para anos fechados, live para resto)
-- Ver migração separada 20260512_v2_dashboard_kpis_use_snapshot.

-- RPCs CTAs Faturas + Bancos
CREATE OR REPLACE FUNCTION v2_condominios.marcar_fatura_paga(
  p_fatura_id uuid, p_data_pagamento date DEFAULT CURRENT_DATE, p_observacoes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = v2_condominios, public AS $$
DECLARE v_row record;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'unauthorized: requires staff role'; END IF;
  UPDATE v2_condominios.faturas_pendentes
  SET estado = 'paga', pago_em = COALESCE(p_data_pagamento::timestamptz, now()), updated_at = now()
  WHERE id = p_fatura_id
  RETURNING id, fornecedor_nome, valor, iva, vencimento, estado, pago_em INTO v_row;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'fatura_not_found'); END IF;
  PERFORM v2_condominios.log_activity('fatura_paga',
    format('%s - %s', v_row.fornecedor_nome, COALESCE(v_row.valor::text, '0')),
    'ok', 'staff', jsonb_build_object('fatura_id', v_row.id, 'observacoes', p_observacoes));
  RETURN jsonb_build_object('ok', true, 'fatura_id', v_row.id, 'fornecedor', v_row.fornecedor_nome,
    'valor_total', COALESCE(v_row.valor,0) + COALESCE(v_row.iva,0), 'pago_em', v_row.pago_em);
END; $$;
REVOKE ALL ON FUNCTION v2_condominios.marcar_fatura_paga(uuid, date, text) FROM public;
GRANT EXECUTE ON FUNCTION v2_condominios.marcar_fatura_paga(uuid, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION v2_condominios.reconciliar_extrato(
  p_movimento_id uuid, p_recebimento_id uuid DEFAULT NULL,
  p_fracao_id uuid DEFAULT NULL, p_observacoes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = v2_condominios, public AS $$
DECLARE v_row record;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'unauthorized: requires staff role'; END IF;
  UPDATE v2_condominios.extrato_bancario
  SET reconciliado = true,
      recebimento_id = COALESCE(p_recebimento_id, recebimento_id),
      fracao_id = COALESCE(p_fracao_id, fracao_id),
      updated_at = now()
  WHERE id = p_movimento_id
  RETURNING id, data_movimento, descricao, valor, reconciliado, recebimento_id, fracao_id INTO v_row;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'movimento_not_found'); END IF;
  PERFORM v2_condominios.log_activity('extrato_reconciliado',
    format('%s - %s', v_row.descricao, v_row.valor),
    'ok', 'staff', jsonb_build_object('movimento_id', v_row.id, 'recebimento_id', p_recebimento_id, 'observacoes', p_observacoes));
  RETURN jsonb_build_object('ok', true, 'movimento_id', v_row.id, 'data_movimento', v_row.data_movimento,
    'valor', v_row.valor, 'recebimento_id', v_row.recebimento_id);
END; $$;
REVOKE ALL ON FUNCTION v2_condominios.reconciliar_extrato(uuid, uuid, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION v2_condominios.reconciliar_extrato(uuid, uuid, uuid, text) TO authenticated;
