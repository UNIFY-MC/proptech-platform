-- =============================================================
-- orcamento_por_fracao: tabela mensal por fracção (Excel detalhado)
-- =============================================================
-- Source: sheets `(YYYY) Orçamento (porfra/cção)` do Excel
-- apps/v2-condominios/docs/PRATA2A data (2026.05).xlsx
-- 294 rows = 98 fracções × 3 anos (2024, 2025, 2026)
-- =============================================================

CREATE TABLE IF NOT EXISTS v2_condominios.orcamento_por_fracao (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano              integer NOT NULL,
  fracao_codigo    text NOT NULL,
  permilagem       numeric,
  valor_mensal     numeric,
  valor_mensal_fcr numeric,
  total_mensal     numeric,
  ordem            integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ano, fracao_codigo)
);
CREATE INDEX IF NOT EXISTS idx_opf_ano ON v2_condominios.orcamento_por_fracao(ano);

ALTER TABLE v2_condominios.orcamento_por_fracao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opf_read_staff ON v2_condominios.orcamento_por_fracao;
CREATE POLICY opf_read_staff ON v2_condominios.orcamento_por_fracao FOR SELECT TO authenticated USING (public.is_staff());

GRANT SELECT ON v2_condominios.orcamento_por_fracao TO authenticated;
GRANT ALL    ON v2_condominios.orcamento_por_fracao TO service_role;
