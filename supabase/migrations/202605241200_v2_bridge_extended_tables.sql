-- =============================================================================
-- Migration: 202605241200_v2_bridge_extended_tables.sql
-- Bridge V2 produção → V1 espelho — ALTER/CREATE tabelas para receber replicação completa
--
-- Contexto: cron v2-legacy-bridge-cron v9 só replicava `condominos → core.pessoas`.
-- v10 vai estender para extrato_bancario + utilizadores_portal + pagamentos + outros.
-- Esta migration prepara o V1 espelho.
--
-- Princípio canónico (memory project-v2-migration-canonical):
--   - extrato_bancario é source-of-truth para todos os cálculos
--   - replicar TUDO V2 → V1; nunca duplicar trabalho com importações ad-hoc
--   - V2 produção INTOCÁVEL (só SELECT; toda escrita em V1)
--
-- Refs: docs/v2-migration/V2-MIGRATION-PLAN.md, memory project-v2-data-state-2026-05-24
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CREATE TABLE v2_condominios.utilizadores_portal (64 rows V2 — atualmente MISSING em V1)
-- =============================================================================
CREATE TABLE IF NOT EXISTS v2_condominios.utilizadores_portal (
  id              uuid PRIMARY KEY,
  email           text NOT NULL,
  nome            text NOT NULL,
  role            text NOT NULL,
  ativo           boolean DEFAULT true,
  permissoes      jsonb,
  criado_por      uuid,
  criado_em       timestamptz,
  ultimo_login    timestamptz,
  fracao          text,
  updated_at      timestamptz,
  password_hash   text,
  username        text,
  -- Bridge metadata
  imported_at     timestamptz DEFAULT now(),
  source          text DEFAULT 'v2_legacy_bridge'
);

CREATE INDEX IF NOT EXISTS idx_utilizadores_portal_email
  ON v2_condominios.utilizadores_portal (email);
CREATE INDEX IF NOT EXISTS idx_utilizadores_portal_username
  ON v2_condominios.utilizadores_portal (username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_utilizadores_portal_ativo
  ON v2_condominios.utilizadores_portal (ativo) WHERE ativo = true;

COMMENT ON TABLE v2_condominios.utilizadores_portal IS
  'Espelho de V2.public.utilizadores_portal. 64 portal users + staff (incl. BOSSMC). Atualizado via cron v2-legacy-bridge-cron v10.';


-- =============================================================================
-- 2. CREATE TABLE v2_condominios.pagamentos
--    Nova tabela limpa (NÃO mexer em v2_condominios.recebimentos que está poluída
--    com 1254 rows mixed-semantic dos 4 importadores ad-hoc de 2026-05-16).
--    Esta tabela espelha exactamente V2.public.recebimentos = PAGAMENTOS EFECTUADOS.
-- =============================================================================
CREATE TABLE IF NOT EXISTS v2_condominios.pagamentos (
  id                uuid PRIMARY KEY,
  fracao_id         uuid,
  fracao_codigo     text,
  condomino_id      uuid,
  nome_condomino    text,
  valor             numeric NOT NULL,
  data_pagamento    date NOT NULL,
  metodo            text,            -- USER-DEFINED em V2 (multibanco/transferencia/etc), mantemos text
  referencia_banco  text,
  descricao_banco   text,
  periodo           text,            -- formato livre (e.g. "2026-01")
  aviso_id          uuid,
  recibo_id         uuid,
  recibo_gerado     boolean,
  recibo_enviado    boolean,
  notas             text,
  grupo_ref         text,
  condomino_ref     integer,
  criado_em         timestamptz,
  atualizado_em     timestamptz,
  -- Bridge metadata
  imported_at       timestamptz DEFAULT now(),
  source            text DEFAULT 'v2_legacy_bridge'
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_fracao_id
  ON v2_condominios.pagamentos (fracao_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_fracao_codigo
  ON v2_condominios.pagamentos (fracao_codigo);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data
  ON v2_condominios.pagamentos (data_pagamento DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_condomino
  ON v2_condominios.pagamentos (condomino_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_periodo
  ON v2_condominios.pagamentos (periodo);

COMMENT ON TABLE v2_condominios.pagamentos IS
  'Espelho 1:1 de V2.public.recebimentos = pagamentos efectuados (NÃO confundir com v2_condominios.recebimentos que mistura quotas + pagamentos + dividas dos imports de 2026-05-16). Source-of-truth para cálculos derivados.';


-- =============================================================================
-- 3. ALTER v2_condominios.extrato_bancario — adicionar colunas missing vs V2
--    V2 produção tem: alocacao jsonb, sem_fatura, sem_fatura_nota, is_devolucao, drive_file_id
--    V1 atual tem versão híbrida (combina cols antigas + algumas novas). Aditivo.
-- =============================================================================
ALTER TABLE v2_condominios.extrato_bancario
  ADD COLUMN IF NOT EXISTS alocacao        jsonb,
  ADD COLUMN IF NOT EXISTS sem_fatura      boolean,
  ADD COLUMN IF NOT EXISTS sem_fatura_nota text,
  ADD COLUMN IF NOT EXISTS is_devolucao    boolean,
  ADD COLUMN IF NOT EXISTS drive_file_id   text,
  ADD COLUMN IF NOT EXISTS source          text DEFAULT 'v2_legacy_bridge',
  ADD COLUMN IF NOT EXISTS imported_at     timestamptz;

COMMENT ON COLUMN v2_condominios.extrato_bancario.alocacao IS
  'JSONB com alocação por fracção. Espelho de V2.public.extrato_bancario.alocacao.';


-- =============================================================================
-- 4. ALTER v2_condominios.orcamento_por_fracao — adicionar fracao_id (V2 tem-na, V1 não)
-- =============================================================================
ALTER TABLE v2_condominios.orcamento_por_fracao
  ADD COLUMN IF NOT EXISTS fracao_id       uuid,
  ADD COLUMN IF NOT EXISTS source          text DEFAULT 'v2_legacy_bridge',
  ADD COLUMN IF NOT EXISTS imported_at     timestamptz;

CREATE INDEX IF NOT EXISTS idx_orcamento_por_fracao_fracao_id
  ON v2_condominios.orcamento_por_fracao (fracao_id) WHERE fracao_id IS NOT NULL;

-- Unique constraint para UPSERT no cron (ano + fracao_codigo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_orcamento_por_fracao_ano_codigo
  ON v2_condominios.orcamento_por_fracao (ano, fracao_codigo);


-- =============================================================================
-- 5. View calculada: v_mora_actual (substitui filtro defeituoso de Mora.jsx)
--    Calcula mora correctamente: quotas esperadas - pagamentos efectuados, por fracção+periodo
-- =============================================================================
DROP VIEW IF EXISTS v2_condominios.v_mora_actual;

CREATE OR REPLACE VIEW v2_condominios.v_mora_actual AS
WITH meses_emitidos AS (
  -- Quotas emitidas: para cada fracção, gerar 1 row por mês desde Janeiro 2026 até mês actual
  SELECT
    o.fracao_codigo,
    o.fracao_id,
    gs.periodo,
    o.total_mensal AS valor_quota,
    (date_trunc('month', gs.periodo) + interval '1 month' - interval '1 day')::date AS vencimento
  FROM v2_condominios.orcamento_por_fracao o
  CROSS JOIN LATERAL (
    SELECT generate_series(
      make_date(o.ano, 1, 1),
      LEAST(make_date(o.ano, 12, 1), date_trunc('month', CURRENT_DATE)::date),
      interval '1 month'
    )::date AS periodo
  ) gs
  WHERE o.ano = 2026
    AND o.total_mensal > 0
),
pagamentos_por_fracao_periodo AS (
  -- Pagamentos efectuados agrupados por fracção + mês
  SELECT
    p.fracao_id,
    p.fracao_codigo,
    date_trunc('month', p.data_pagamento)::date AS periodo,
    SUM(p.valor) AS total_pago
  FROM v2_condominios.pagamentos p
  WHERE p.data_pagamento IS NOT NULL
  GROUP BY p.fracao_id, p.fracao_codigo, date_trunc('month', p.data_pagamento)
)
SELECT
  m.fracao_codigo,
  m.fracao_id,
  m.periodo,
  m.vencimento,
  m.valor_quota AS valor_emitido,
  COALESCE(p.total_pago, 0) AS valor_pago,
  (m.valor_quota - COALESCE(p.total_pago, 0)) AS divida,
  (CURRENT_DATE - m.vencimento) AS dias_atraso,
  CASE
    WHEN (CURRENT_DATE - m.vencimento) < 0   THEN 'a_vencer'
    WHEN (CURRENT_DATE - m.vencimento) < 7   THEN 'recente'
    WHEN (CURRENT_DATE - m.vencimento) < 30  THEN 'aviso_1'
    WHEN (CURRENT_DATE - m.vencimento) < 60  THEN 'aviso_2'
    WHEN (CURRENT_DATE - m.vencimento) < 90  THEN 'compliance'
    ELSE 'legal'
  END AS nivel_mora
FROM meses_emitidos m
LEFT JOIN pagamentos_por_fracao_periodo p
  ON (m.fracao_id IS NOT NULL AND p.fracao_id = m.fracao_id AND p.periodo = m.periodo)
  OR (m.fracao_id IS NULL AND p.fracao_codigo = m.fracao_codigo AND p.periodo = m.periodo)
WHERE (m.valor_quota - COALESCE(p.total_pago, 0)) > 0.01
ORDER BY m.fracao_codigo, m.periodo;

COMMENT ON VIEW v2_condominios.v_mora_actual IS
  'Mora real calculada: orcamento_por_fracao 2026 (quotas esperadas mensais) - pagamentos efectuados agrupados por fracção+mês. Substitui filtro defeituoso de Mora.jsx (que assume v2_condominios.recebimentos.estado, poluído com 638 rows mal-labeladas).';

GRANT SELECT ON v2_condominios.v_mora_actual TO anon, authenticated, service_role;


-- =============================================================================
-- 6. Grants básicos para anon/authenticated (read) + service_role (full)
-- =============================================================================
GRANT SELECT ON v2_condominios.utilizadores_portal TO anon, authenticated;
GRANT ALL    ON v2_condominios.utilizadores_portal TO service_role;

GRANT SELECT ON v2_condominios.pagamentos TO anon, authenticated;
GRANT ALL    ON v2_condominios.pagamentos TO service_role;


COMMIT;

-- =============================================================================
-- POST-CHECK (executar separadamente para validar)
-- =============================================================================
-- SELECT 'utilizadores_portal' AS t, count(*) FROM v2_condominios.utilizadores_portal
-- UNION ALL SELECT 'pagamentos', count(*) FROM v2_condominios.pagamentos
-- UNION ALL SELECT 'extrato_bancario_cols', count(*) FROM information_schema.columns
--   WHERE table_schema='v2_condominios' AND table_name='extrato_bancario' AND column_name='alocacao'
-- UNION ALL SELECT 'orcamento_por_fracao_fracao_id', count(*) FROM information_schema.columns
--   WHERE table_schema='v2_condominios' AND table_name='orcamento_por_fracao' AND column_name='fracao_id'
-- UNION ALL SELECT 'v_mora_actual', count(*) FROM information_schema.views
--   WHERE table_schema='v2_condominios' AND table_name='v_mora_actual';
-- =============================================================================
