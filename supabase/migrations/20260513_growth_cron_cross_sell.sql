-- =============================================================
-- ADR-015 Sprint C.3 — Cron job diário: growth.executar_cross_sell_rules()
-- =============================================================
-- Corre todos os dias às 09:00 UTC (10:00 PT).
-- Percorre cross_sell_rules activas, cria oportunidades para pessoas elegíveis.
-- Logs em iam.activity_logs com vertical='growth'.
--
-- Wrapper SECURITY DEFINER para correr com privilégios do owner em vez do
-- chamador (pg_cron corre como `supabase_admin` que não passa is_staff()).
-- =============================================================

-- Wrapper que corre as regras sem check is_staff() (para cron internal)
CREATE OR REPLACE FUNCTION growth._cron_executar_cross_sell()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = growth, public, pg_temp
AS $$
DECLARE v_rule record; v_count_total int := 0; v_count_per_rule int; v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_rule IN SELECT * FROM growth.cross_sell_rules WHERE active = true ORDER BY priority LOOP
    v_count_per_rule := 0;

    INSERT INTO growth.oportunidades (pessoa_id, vertical, origem, cross_sell_rule_id, valor_estimado, probabilidade, estado)
    SELECT
      sa.pessoa_id,
      v_rule.vertical_alvo,
      'cross_sell',
      v_rule.id,
      COALESCE((v_rule.then_clause->'create_oportunidade'->>'valor_estimado')::numeric, 0),
      COALESCE((v_rule.then_clause->'create_oportunidade'->>'probabilidade')::int, 20),
      'qualificado'
    FROM core.servicos_ativos sa
    WHERE sa.vertical = v_rule.vertical_origem
      AND sa.estado = 'activo'
      AND NOT EXISTS (
        SELECT 1 FROM core.servicos_ativos s2
        WHERE s2.pessoa_id = sa.pessoa_id AND s2.vertical = v_rule.vertical_alvo AND s2.estado = 'activo'
      )
      AND NOT EXISTS (
        SELECT 1 FROM growth.oportunidades op
        WHERE op.pessoa_id = sa.pessoa_id
          AND op.vertical = v_rule.vertical_alvo
          AND op.cross_sell_rule_id = v_rule.id
          AND op.estado NOT IN ('perdida')
      )
      AND (CASE
        WHEN v_rule.if_clause ? 'months_since_signup'
        THEN sa.data_inicio <= CURRENT_DATE - ((v_rule.if_clause->'months_since_signup'->>'>=')::int || ' months')::interval
        ELSE TRUE END);

    GET DIAGNOSTICS v_count_per_rule = ROW_COUNT;

    UPDATE growth.cross_sell_rules
    SET total_disparos = total_disparos + v_count_per_rule,
        ultima_execucao = now()
    WHERE id = v_rule.id;

    v_results := v_results || jsonb_build_object('rule', v_rule.nome, 'novas_oportunidades', v_count_per_rule);
    v_count_total := v_count_total + v_count_per_rule;
  END LOOP;

  INSERT INTO iam.activity_logs (origem, tipo, detalhe, resultado, vertical, extra_data)
  VALUES ('system', 'cron_cross_sell',
          format('%s oportunidades criadas em %s regras', v_count_total, jsonb_array_length(v_results)),
          'ok', 'growth',
          jsonb_build_object('total', v_count_total, 'breakdown', v_results));

  RETURN jsonb_build_object('total_oportunidades', v_count_total, 'breakdown', v_results, 'executed_at', now());
END;
$$;

REVOKE ALL ON FUNCTION growth._cron_executar_cross_sell() FROM public;
GRANT EXECUTE ON FUNCTION growth._cron_executar_cross_sell() TO postgres, service_role;

-- Schedule via pg_cron (já habilitado no V1)
DO $$
BEGIN
  -- Remove job anterior se existir
  PERFORM cron.unschedule('growth_cross_sell_daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'growth_cross_sell_daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'growth_cross_sell_daily',
  '0 9 * * *',  -- todos os dias às 09:00 UTC = 10:00 PT (inverno) / 09:00 PT (verão)
  $$SELECT growth._cron_executar_cross_sell()$$
);
