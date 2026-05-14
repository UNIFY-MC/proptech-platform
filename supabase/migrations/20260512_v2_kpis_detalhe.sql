-- =============================================================
-- kpis_detalhe — detalhe das rúbricas do Resumo Financeiro
-- =============================================================
-- Espelho da tabela `financeiro_snapshot` do V2 legacy.
-- Permite drill-down no UI PrestacaoContas: click em "Dívidas Condóminos"
-- abre lista de fracções com valores individuais.
-- V2 legacy só tem 2025-12-31 (29 rows). 2024 fica sem detalhe.
-- =============================================================

CREATE TABLE IF NOT EXISTS v2_condominios.kpis_detalhe (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_referencia date NOT NULL,
  rubrica         text NOT NULL,
  fracao_codigo   text,
  nome_descricao  text,
  valor           numeric NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kpis_detalhe_data_rubrica
  ON v2_condominios.kpis_detalhe(data_referencia, rubrica);

ALTER TABLE v2_condominios.kpis_detalhe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kd_read_staff ON v2_condominios.kpis_detalhe;
CREATE POLICY kd_read_staff ON v2_condominios.kpis_detalhe FOR SELECT TO authenticated USING (public.is_staff());

GRANT SELECT ON v2_condominios.kpis_detalhe TO authenticated;
GRANT USAGE  ON SCHEMA v2_condominios TO service_role;
GRANT INSERT, UPDATE, DELETE ON v2_condominios.kpis_detalhe TO service_role;

-- Dados migrados via REST cross-project do V2 legacy financeiro_snapshot
-- (29 rows · 2025-12-31). Ver script proptech-state ou re-correr import.
