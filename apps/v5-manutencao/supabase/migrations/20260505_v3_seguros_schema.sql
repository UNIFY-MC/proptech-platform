-- =============================================================
-- MIGRATION: v3_seguros schema — Sofia (seguros-condo)
-- Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
-- Data: 2026-05-05
-- Autor: supabase-designer
-- Aprovação: Mário Carvalho (aprovação explícita sessão 2026-05-05)
-- =============================================================
-- Tabelas: seguradoras, apolices, sinistros, simulacoes
-- Dependências: core.imoveis, v2_condominios.fracoes, v2_condominios.documentos
-- RLS: staff ALL, condómino SELECT (edificio_id via get_my_edificios()), anon NEGADO
-- =============================================================

CREATE SCHEMA IF NOT EXISTS v3_seguros;

-- --------------------------------------------------------
-- ENUM: estado de sinistro
-- --------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE v3_seguros.estado_sinistro AS ENUM (
    'a_participar', 'participado', 'em_analise',
    'aceite', 'rejeitado', 'pago', 'encerrado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------
-- FUNÇÃO HELPER UPDATED_AT (local ao schema)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION v3_seguros.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------
-- 1. SEGURADORAS
-- Catálogo de seguradoras. Dados de contacto e rating.
-- Sem FK para entidades externas — é um catálogo autónomo.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v3_seguros.seguradoras (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text          NOT NULL,
  nif             text,
  telefone        text,
  email_sinistros text,                           -- email específico para participações
  rating          numeric(2,1)                    -- 1.0 a 5.0 (avaliação interna)
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  activa          boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v3_seguros.seguradoras IS
  'Catálogo de seguradoras. Sofia (seguros-condo) mantém. rating 1-5 baseado em experiência de sinistros.';
COMMENT ON COLUMN v3_seguros.seguradoras.email_sinistros IS
  'Email directo para participações de sinistro — diferente do contacto comercial.';

CREATE TRIGGER trg_seguradoras_updated_at
  BEFORE UPDATE ON v3_seguros.seguradoras
  FOR EACH ROW EXECUTE FUNCTION v3_seguros.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_seguradoras_activa ON v3_seguros.seguradoras(activa) WHERE activa = true;

ALTER TABLE v3_seguros.seguradoras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS seguradoras_staff_all ON v3_seguros.seguradoras;
CREATE POLICY seguradoras_staff_all ON v3_seguros.seguradoras
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- anon: negado


-- --------------------------------------------------------
-- 2. APOLICES
-- Apólices de seguro dos condomínios (edificio como um todo).
-- Diferente de v2_condominios.seguro_fracoes (seguros individuais de fracção).
-- FK para core.imoveis (RESTRICT): edifício não se apaga enquanto tiver apólice.
-- FK para v2_condominios.documentos (SET NULL): apólice mantém-se mesmo sem doc digitalizado.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v3_seguros.apolices (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,    -- edifício não apaga com apólice viva
  seguradora_id     uuid
    REFERENCES v3_seguros.seguradoras(id) ON DELETE RESTRICT, -- seguradora não apaga enquanto tem apólices
  numero_apolice    text          NOT NULL,
  tipo_cobertura    text[]        NOT NULL DEFAULT '{}', -- ex: ['incendio_rc', 'multirriscos', 'rc_condominio']
  capital_seguro    numeric(12,2),                     -- capital total segurado em euros
  premio_anual      numeric(10,2),                     -- prémio anual em euros
  data_inicio       date          NOT NULL,
  data_fim          date          NOT NULL,
  data_renovacao    date,                              -- data de renovação (pode diferir de data_fim)
  activa            boolean       NOT NULL DEFAULT true,
  documento_id      uuid
    REFERENCES v2_condominios.documentos(id) ON DELETE SET NULL, -- apólice digitalizada
  observacoes       text,
  gerida_por        text          NOT NULL DEFAULT 'seguros-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v3_seguros.apolices IS
  'Apólices de seguro dos edifícios (condomínio como um todo). Sofia gere alertas 90/60/30 dias antes de data_fim.';
COMMENT ON COLUMN v3_seguros.apolices.tipo_cobertura IS
  'Array de coberturas: incendio_rc, multirriscos, rc_condominio, obras, elevadores, etc.';
COMMENT ON COLUMN v3_seguros.apolices.seguradora_id IS
  'RESTRICT: não se pode apagar seguradora com apólices activas. Análogo a fornecedor com facturas em aberto.';

CREATE TRIGGER trg_apolices_updated_at
  BEFORE UPDATE ON v3_seguros.apolices
  FOR EACH ROW EXECUTE FUNCTION v3_seguros.set_updated_at();

-- Índices críticos para alertas de renovação e gestão
CREATE INDEX IF NOT EXISTS idx_apolices_edificio ON v3_seguros.apolices(edificio_id);
CREATE INDEX IF NOT EXISTS idx_apolices_seguradora ON v3_seguros.apolices(seguradora_id);
CREATE INDEX IF NOT EXISTS idx_apolices_activa ON v3_seguros.apolices(activa) WHERE activa = true;
-- Sofia: alertas de renovação 90/60/30 dias antes de data_fim
CREATE INDEX IF NOT EXISTS idx_apolices_data_fim ON v3_seguros.apolices(data_fim)
  WHERE activa = true;
CREATE INDEX IF NOT EXISTS idx_apolices_documento ON v3_seguros.apolices(documento_id);

ALTER TABLE v3_seguros.apolices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS apolices_staff_all ON v3_seguros.apolices;
CREATE POLICY apolices_staff_all ON v3_seguros.apolices
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- Condómino vê apólices do seu edifício
DROP POLICY IF EXISTS apolices_condomino_select ON v3_seguros.apolices;
CREATE POLICY apolices_condomino_select ON v3_seguros.apolices
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND edificio_id = ANY(v2_condominios.get_my_edificios())
  );
-- anon: negado


-- --------------------------------------------------------
-- 3. SINISTROS
-- Participações de sinistro. Prazo legal: 8 dias após ocorrência.
-- prazo_participacao = data_ocorrencia + 8 dias (calculado por trigger ou aplicação).
-- FK para v2_condominios.fracoes (SET NULL): sinistro mantém-se mesmo se fracção apagada.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v3_seguros.sinistros (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  apolice_id        uuid          NOT NULL
    REFERENCES v3_seguros.apolices(id) ON DELETE RESTRICT,  -- apólice não apaga com sinistros
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  fracao_id         uuid
    REFERENCES v2_condominios.fracoes(id) ON DELETE SET NULL, -- sinistro pode ser nas partes comuns
  descricao         text          NOT NULL,
  data_ocorrencia   date          NOT NULL,
  data_participacao date,                                    -- NULL = ainda não participado
  prazo_participacao date                                    -- data_ocorrencia + 8 dias (prazo legal)
    GENERATED ALWAYS AS (data_ocorrencia + INTERVAL '8 days') STORED,
  valor_estimado    numeric(10,2),
  valor_indemnizado numeric(10,2),
  estado            v3_seguros.estado_sinistro NOT NULL DEFAULT 'a_participar',
  numero_processo   text,                                    -- número da seguradora
  aprovado_por      text,                                    -- agente/pessoa que aprovou
  approval_item_id  uuid,                                    -- ref para system.approvals_queue
  gerido_por        text          NOT NULL DEFAULT 'seguros-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v3_seguros.sinistros IS
  'Participações de sinistro. Prazo legal 8 dias (prazo_participacao = data_ocorrencia + 8d, coluna gerada). Sofia alerta quando data_participacao IS NULL e prazo se aproxima.';
COMMENT ON COLUMN v3_seguros.sinistros.prazo_participacao IS
  'Calculado automaticamente: data_ocorrencia + 8 dias. Não editar directamente.';
COMMENT ON COLUMN v3_seguros.sinistros.fracao_id IS
  'SET NULL: sinistro pode ser nas partes comuns (fracao_id NULL) ou associado a fracção específica.';

CREATE TRIGGER trg_sinistros_updated_at
  BEFORE UPDATE ON v3_seguros.sinistros
  FOR EACH ROW EXECUTE FUNCTION v3_seguros.set_updated_at();

-- Índices críticos
CREATE INDEX IF NOT EXISTS idx_sinistros_apolice ON v3_seguros.sinistros(apolice_id);
CREATE INDEX IF NOT EXISTS idx_sinistros_edificio ON v3_seguros.sinistros(edificio_id);
CREATE INDEX IF NOT EXISTS idx_sinistros_fracao ON v3_seguros.sinistros(fracao_id);
CREATE INDEX IF NOT EXISTS idx_sinistros_estado ON v3_seguros.sinistros(estado);
-- Sofia: alerta de prazo de participação vencendo
CREATE INDEX IF NOT EXISTS idx_sinistros_prazo
  ON v3_seguros.sinistros(prazo_participacao, estado)
  WHERE estado = 'a_participar';
CREATE INDEX IF NOT EXISTS idx_sinistros_data_participacao ON v3_seguros.sinistros(data_participacao);

ALTER TABLE v3_seguros.sinistros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sinistros_staff_all ON v3_seguros.sinistros;
CREATE POLICY sinistros_staff_all ON v3_seguros.sinistros
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- Condómino vê sinistros do seu edifício
DROP POLICY IF EXISTS sinistros_condomino_select ON v3_seguros.sinistros;
CREATE POLICY sinistros_condomino_select ON v3_seguros.sinistros
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND edificio_id = ANY(v2_condominios.get_my_edificios())
  );
-- anon: negado


-- --------------------------------------------------------
-- 4. SIMULACOES
-- Simulações de mercado para renovação de apólice.
-- Compara custo actual vs proposta de outra seguradora.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v3_seguros.simulacoes (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id           uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  seguradora_proposta_id uuid
    REFERENCES v3_seguros.seguradoras(id) ON DELETE SET NULL, -- seguradora proposta pode ser eliminada
  apolice_actual_id     uuid
    REFERENCES v3_seguros.apolices(id) ON DELETE SET NULL,   -- apólice actual pode mudar
  premio_proposto       numeric(10,2),                        -- prémio anual da proposta
  poupanca_anual        numeric(10,2),                        -- diferença vs apólice actual
  data_simulacao        timestamptz   NOT NULL DEFAULT now(),
  valida_ate            date,                                  -- proposta válida até (prazo da seguradora)
  aceite                boolean       NOT NULL DEFAULT false,
  notas                 text,
  simulado_por          text          NOT NULL DEFAULT 'seguros-condo',
  created_at            timestamptz   NOT NULL DEFAULT now()
  -- Sem updated_at: simulação é imutável após criação
);

COMMENT ON TABLE v3_seguros.simulacoes IS
  'Simulações de mercado para renovação. Sofia compara e propõe ao Mário para aprovação. Sem updated_at — simulação não se altera após criação.';
COMMENT ON COLUMN v3_seguros.simulacoes.poupanca_anual IS
  'Diferença entre prémio actual e prémio proposto. Positivo = poupança. Calculado pela Sofia com base em apólice actual.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_simulacoes_edificio ON v3_seguros.simulacoes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_simulacoes_seguradora ON v3_seguros.simulacoes(seguradora_proposta_id);
CREATE INDEX IF NOT EXISTS idx_simulacoes_apolice ON v3_seguros.simulacoes(apolice_actual_id);
CREATE INDEX IF NOT EXISTS idx_simulacoes_aceite ON v3_seguros.simulacoes(aceite) WHERE aceite = false;
CREATE INDEX IF NOT EXISTS idx_simulacoes_data ON v3_seguros.simulacoes(data_simulacao DESC);

ALTER TABLE v3_seguros.simulacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS simulacoes_staff_all ON v3_seguros.simulacoes;
CREATE POLICY simulacoes_staff_all ON v3_seguros.simulacoes
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- anon e condóminos: negado (dados comerciais sensíveis)


-- --------------------------------------------------------
-- GRANTS
-- --------------------------------------------------------

GRANT USAGE ON SCHEMA v3_seguros TO authenticated;
GRANT USAGE ON SCHEMA v3_seguros TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA v3_seguros TO authenticated;

NOTIFY pgrst, 'reload schema';
