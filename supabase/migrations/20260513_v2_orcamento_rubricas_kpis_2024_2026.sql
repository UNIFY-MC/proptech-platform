-- =============================================================
-- Orçamentos detalhados + KPIs detalhe 2024 + 2026
-- =============================================================
-- Migração do Excel PRATA2A data 2026.05 (apps/v2-condominios/docs):
--   * Orçamentos 2024 / 2025 / 2026 (83 rúbricas: 72 despesas + 8 receitas + 3 FCR)
--   * kpis_detalhe 2024-12-31 (58 rows) + 2026-03-26 (28 rows)
--   * orcamentos table com totais inseridos
-- =============================================================

CREATE TABLE IF NOT EXISTS v2_condominios.orcamento_rubricas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano           integer NOT NULL,
  codigo        text NOT NULL,
  rubrica       text NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('despesa', 'receita', 'fcr')),
  valor_mensal  numeric,
  valor_total   numeric NOT NULL,
  ordem         integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ano, codigo, tipo)
);
CREATE INDEX IF NOT EXISTS idx_orc_rubricas_ano ON v2_condominios.orcamento_rubricas(ano);

ALTER TABLE v2_condominios.orcamento_rubricas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS or_read_staff ON v2_condominios.orcamento_rubricas;
CREATE POLICY or_read_staff ON v2_condominios.orcamento_rubricas FOR SELECT TO authenticated USING (public.is_staff());

GRANT SELECT ON v2_condominios.orcamento_rubricas TO authenticated;
GRANT ALL    ON v2_condominios.orcamento_rubricas TO service_role;

-- Dados migrados via REST cross-project a partir do Excel docs/PRATA2A data 2026.05.xlsx
-- Totais validados:
--   2024: 24 despesas (75.778) + 1 FCR (6.684) + 3 receitas (82.461) [balanceado]
--   2025: igual a 2024
--   2026: 24 despesas (76.000) + 1 FCR (7.600) + 2 receitas (83.600)
