-- =============================================================
-- MIGRATION: v4_energia schema — Enzo (energia-condo)
-- Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
-- Data: 2026-05-05
-- Autor: supabase-designer
-- Aprovação: Mário Carvalho (aprovação explícita sessão 2026-05-05)
-- =============================================================
-- Tabelas: comercializadores, contratos, tarifas, simulacoes,
--          alertas_consumo, certificados_energeticos
-- Dependências: core.imoveis, v2_condominios.documentos
-- RLS: staff ALL, condómino SELECT limitado, anon NEGADO
-- =============================================================

CREATE SCHEMA IF NOT EXISTS v4_energia;

-- --------------------------------------------------------
-- FUNÇÃO HELPER UPDATED_AT (local ao schema)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION v4_energia.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------
-- 1. COMERCIALIZADORES
-- Catálogo de comercializadores de energia eléctrica.
-- Mantido por Enzo. Sem FK para entidades externas.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v4_energia.comercializadores (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text          NOT NULL,
  nif             text,
  contacto_email  text,
  telefone        text,
  activo          boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v4_energia.comercializadores IS
  'Catálogo de comercializadores de energia. Enzo (energia-condo) mantém actualizado para simulações tarifárias.';

CREATE TRIGGER trg_comercializadores_updated_at
  BEFORE UPDATE ON v4_energia.comercializadores
  FOR EACH ROW EXECUTE FUNCTION v4_energia.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_comercializadores_activo
  ON v4_energia.comercializadores(activo) WHERE activo = true;

ALTER TABLE v4_energia.comercializadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comercializadores_staff_all ON v4_energia.comercializadores;
CREATE POLICY comercializadores_staff_all ON v4_energia.comercializadores
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- anon: negado


-- --------------------------------------------------------
-- 2. CONTRATOS
-- Contratos de energia por edifício.
-- CUPS: Código Único do Ponto de Fornecimento (identificador ERSE).
-- FK para core.imoveis (RESTRICT): edifício não apaga com contrato activo.
-- FK para comercializadores (RESTRICT): comercializador não apaga com contratos.
-- FK para v2_condominios.documentos (SET NULL): contrato mantém-se sem doc.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v4_energia.contratos (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id           uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  comercializador_id    uuid
    REFERENCES v4_energia.comercializadores(id) ON DELETE RESTRICT,
  numero_contrato       text,
  cups                  text,                              -- Código Único Ponto de Fornecimento (ERSE)
  potencia_contratada   numeric(8,2),                     -- kVA
  tarifa_nome           text,                              -- nome do plano tarifário
  preco_kwh             numeric(8,6),                     -- €/kWh (6 casas decimais — tarifas ERSE)
  preco_potencia_dia    numeric(8,6),                     -- €/kVA/dia
  data_inicio           date          NOT NULL,
  data_fim              date,                              -- NULL = contrato sem prazo fixo
  renovacao_automatica  boolean       NOT NULL DEFAULT true,
  activo                boolean       NOT NULL DEFAULT true,
  penalidade_saida      numeric(10,2) NOT NULL DEFAULT 0, -- penalidade por saída antecipada
  documento_id          uuid
    REFERENCES v2_condominios.documentos(id) ON DELETE SET NULL,
  gerido_por            text          NOT NULL DEFAULT 'energia-condo',
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v4_energia.contratos IS
  'Contratos de energia por edifício. CUPS é o identificador ERSE único do ponto de consumo. Enzo alerta 90/60/30 dias antes de data_fim.';
COMMENT ON COLUMN v4_energia.contratos.cups IS
  'Código Único do Ponto de Fornecimento — identifica o contador ERSE. Formato: PT0002XXXXXXXXXXXXXXXXXX.';
COMMENT ON COLUMN v4_energia.contratos.preco_kwh IS
  '6 casas decimais porque as tarifas ERSE têm precisão elevada (ex: 0.162400 €/kWh).';
COMMENT ON COLUMN v4_energia.contratos.penalidade_saida IS
  'Custo de saída antecipada. RESTRICT na FK do comercializador — análogo a fornecedor com contrato em aberto.';

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON v4_energia.contratos
  FOR EACH ROW EXECUTE FUNCTION v4_energia.set_updated_at();

-- Índices críticos
CREATE INDEX IF NOT EXISTS idx_contratos_edificio ON v4_energia.contratos(edificio_id);
CREATE INDEX IF NOT EXISTS idx_contratos_comercializador ON v4_energia.contratos(comercializador_id);
CREATE INDEX IF NOT EXISTS idx_contratos_activo ON v4_energia.contratos(activo) WHERE activo = true;
-- Enzo: alertas de renovação 90/60/30 dias
CREATE INDEX IF NOT EXISTS idx_contratos_data_fim ON v4_energia.contratos(data_fim)
  WHERE activo = true AND data_fim IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_cups ON v4_energia.contratos(cups)
  WHERE cups IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_documento ON v4_energia.contratos(documento_id);

ALTER TABLE v4_energia.contratos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contratos_staff_all ON v4_energia.contratos;
CREATE POLICY contratos_staff_all ON v4_energia.contratos
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- Condómino vê contratos do seu edifício
DROP POLICY IF EXISTS contratos_condomino_select ON v4_energia.contratos;
CREATE POLICY contratos_condomino_select ON v4_energia.contratos
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND edificio_id = ANY(v2_condominios.get_my_edificios())
  );
-- anon: negado


-- --------------------------------------------------------
-- 3. TARIFAS
-- Histórico de tarifas de mercado para comparação.
-- Enzo actualiza quando há mudanças de preços nos comercializadores.
-- FK para comercializadores (RESTRICT): comercializador não apaga enquanto tem tarifas.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v4_energia.tarifas (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  comercializador_id    uuid          NOT NULL
    REFERENCES v4_energia.comercializadores(id) ON DELETE RESTRICT,
  nome_plano            text          NOT NULL,
  preco_kwh             numeric(8,6)  NOT NULL,             -- €/kWh
  preco_potencia_dia    numeric(8,6),                       -- €/kVA/dia (opcional)
  potencias_disponiveis numeric[]     DEFAULT '{}',         -- kVAs disponíveis neste plano
  valida_desde          date          NOT NULL,
  valida_ate            date,                               -- NULL = ainda activa
  activa                boolean       NOT NULL DEFAULT true,
  notas                 text,
  created_at            timestamptz   NOT NULL DEFAULT now()
  -- Sem updated_at: tarifa é imutável após criação (histórico de mercado)
);

COMMENT ON TABLE v4_energia.tarifas IS
  'Histórico de tarifas dos comercializadores. Imutável após criação — é um registo de mercado. Enzo usa para simulações de comparação.';
COMMENT ON COLUMN v4_energia.tarifas.potencias_disponiveis IS
  'Array de kVAs disponíveis neste plano: {3.45, 6.9, 10.35, 13.8, 20.7, 27.6, 34.5}.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_tarifas_comercializador ON v4_energia.tarifas(comercializador_id);
CREATE INDEX IF NOT EXISTS idx_tarifas_activa ON v4_energia.tarifas(activa) WHERE activa = true;
CREATE INDEX IF NOT EXISTS idx_tarifas_validade
  ON v4_energia.tarifas(valida_desde, valida_ate);

ALTER TABLE v4_energia.tarifas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tarifas_staff_all ON v4_energia.tarifas;
CREATE POLICY tarifas_staff_all ON v4_energia.tarifas
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- anon: negado (dados comerciais)


-- --------------------------------------------------------
-- 4. SIMULACOES
-- Simulações tarifárias por edifício.
-- Compara custo actual vs proposta.
-- poupanca_anual = custo_actual_anual - custo_proposto_anual (trigger)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v4_energia.simulacoes (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id           uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  contrato_actual_id    uuid
    REFERENCES v4_energia.contratos(id) ON DELETE SET NULL,
  tarifa_proposta_id    uuid
    REFERENCES v4_energia.tarifas(id) ON DELETE SET NULL,
  kwh_referencia        numeric(10,2),                     -- consumo anual de referência (kWh)
  custo_actual_anual    numeric(10,2),                     -- custo com contrato actual
  custo_proposto_anual  numeric(10,2),                     -- custo com tarifa proposta
  poupanca_anual        numeric(10,2),                     -- calculado: actual - proposto
  data_simulacao        timestamptz   NOT NULL DEFAULT now(),
  valida_ate            date,                              -- até quando a proposta é válida
  aceite                boolean       NOT NULL DEFAULT false,
  aprovado_por          text,
  approval_item_id      uuid,
  simulado_por          text          NOT NULL DEFAULT 'energia-condo',
  created_at            timestamptz   NOT NULL DEFAULT now()
  -- Sem updated_at: simulação é imutável
);

COMMENT ON TABLE v4_energia.simulacoes IS
  'Simulações tarifárias. Enzo calcula e propõe ao Mário para aprovação. poupanca_anual = custo_actual_anual - custo_proposto_anual.';
COMMENT ON COLUMN v4_energia.simulacoes.kwh_referencia IS
  'Consumo anual de referência em kWh — base de cálculo para comparar tarifas.';
COMMENT ON COLUMN v4_energia.simulacoes.poupanca_anual IS
  'Poupança estimada. Positivo = poupança. Calculado por Enzo antes de inserir.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_sim_energia_edificio ON v4_energia.simulacoes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_sim_energia_contrato ON v4_energia.simulacoes(contrato_actual_id);
CREATE INDEX IF NOT EXISTS idx_sim_energia_tarifa ON v4_energia.simulacoes(tarifa_proposta_id);
CREATE INDEX IF NOT EXISTS idx_sim_energia_aceite ON v4_energia.simulacoes(aceite) WHERE aceite = false;
CREATE INDEX IF NOT EXISTS idx_sim_energia_data ON v4_energia.simulacoes(data_simulacao DESC);

ALTER TABLE v4_energia.simulacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS simulacoes_staff_all ON v4_energia.simulacoes;
CREATE POLICY simulacoes_staff_all ON v4_energia.simulacoes
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- anon e condóminos: negado (dados comerciais)


-- --------------------------------------------------------
-- 5. ALERTAS_CONSUMO
-- Alertas de consumo anormal por edifício.
-- Enzo compara consumo mensal com média dos últimos 12 meses.
-- mes_referencia: sempre dia 1 do mês (ex: 2026-05-01).
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v4_energia.alertas_consumo (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  contrato_id       uuid
    REFERENCES v4_energia.contratos(id) ON DELETE SET NULL,
  mes_referencia    date          NOT NULL,                -- sempre dia 1 do mês
  kwh_actual        numeric(10,2) NOT NULL,               -- consumo do mês
  kwh_media_12m     numeric(10,2),                        -- média dos últimos 12 meses
  variacao_pct      numeric(6,2),                         -- % de variação vs média
  tipo_alerta       text          NOT NULL                 -- 'consumo_alto', 'consumo_baixo', 'dado_em_falta'
    CHECK (tipo_alerta IN ('consumo_alto', 'consumo_baixo', 'dado_em_falta')),
  resolvido         boolean       NOT NULL DEFAULT false,
  inbox_item_id     uuid,                                 -- ref para system.inbox_items
  gerado_por        text          NOT NULL DEFAULT 'energia-condo',
  created_at        timestamptz   NOT NULL DEFAULT now()
  -- Sem updated_at: alerta é imutável — usa resolvido=true para fechar
);

COMMENT ON TABLE v4_energia.alertas_consumo IS
  'Alertas de consumo anormal gerados por Enzo. mes_referencia sempre dia 1. Fechar com resolvido=true (não se apagam — auditoria).';
COMMENT ON COLUMN v4_energia.alertas_consumo.variacao_pct IS
  'Variação percentual vs média 12 meses. >20% → consumo_alto; <-20% → consumo_baixo (Enzo Standard).';
COMMENT ON COLUMN v4_energia.alertas_consumo.mes_referencia IS
  'Sempre o dia 1 do mês. Permite UNIQUE por edifício+mês+tipo se necessário.';

-- Índices críticos
CREATE INDEX IF NOT EXISTS idx_alertas_consumo_edificio ON v4_energia.alertas_consumo(edificio_id);
CREATE INDEX IF NOT EXISTS idx_alertas_consumo_contrato ON v4_energia.alertas_consumo(contrato_id);
CREATE INDEX IF NOT EXISTS idx_alertas_consumo_resolvido
  ON v4_energia.alertas_consumo(resolvido, edificio_id) WHERE resolvido = false;
CREATE INDEX IF NOT EXISTS idx_alertas_consumo_mes ON v4_energia.alertas_consumo(mes_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_consumo_tipo ON v4_energia.alertas_consumo(tipo_alerta);

ALTER TABLE v4_energia.alertas_consumo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alertas_consumo_staff_all ON v4_energia.alertas_consumo;
CREATE POLICY alertas_consumo_staff_all ON v4_energia.alertas_consumo
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- Condómino vê alertas do seu edifício
DROP POLICY IF EXISTS alertas_consumo_condomino_select ON v4_energia.alertas_consumo;
CREATE POLICY alertas_consumo_condomino_select ON v4_energia.alertas_consumo
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND edificio_id = ANY(v2_condominios.get_my_edificios())
  );
-- anon: negado


-- --------------------------------------------------------
-- 6. CERTIFICADOS_ENERGETICOS
-- Certificados SCE dos edifícios (Sistema de Certificação Energética).
-- Validade: 10 anos. Enzo alerta antes da expiração.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v4_energia.certificados_energeticos (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id         uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  numero_certificado  text,                               -- número SCE
  classe_energetica   text                                -- 'A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F'
    CHECK (classe_energetica IS NULL OR classe_energetica IN ('A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F')),
  data_emissao        date          NOT NULL,
  data_validade       date          NOT NULL,             -- tipicamente data_emissao + 10 anos
  documento_id        uuid
    REFERENCES v2_condominios.documentos(id) ON DELETE SET NULL, -- PDF do certificado
  observacoes         text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v4_energia.certificados_energeticos IS
  'Certificados SCE dos edifícios. Validade 10 anos. Enzo alerta 180/90/30 dias antes de data_validade.';
COMMENT ON COLUMN v4_energia.certificados_energeticos.numero_certificado IS
  'Número do certificado SCE emitido pela ADENE. Formato: SCE-XXXXXXXXXX.';
COMMENT ON COLUMN v4_energia.certificados_energeticos.classe_energetica IS
  'Classe A+ (melhor) a F (pior). Usado para relatórios de sustentabilidade.';

CREATE TRIGGER trg_certificados_updated_at
  BEFORE UPDATE ON v4_energia.certificados_energeticos
  FOR EACH ROW EXECUTE FUNCTION v4_energia.set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_cert_energia_edificio ON v4_energia.certificados_energeticos(edificio_id);
-- Enzo: alertas de expiração 180/90/30 dias antes
CREATE INDEX IF NOT EXISTS idx_cert_energia_validade ON v4_energia.certificados_energeticos(data_validade);
CREATE INDEX IF NOT EXISTS idx_cert_energia_classe ON v4_energia.certificados_energeticos(classe_energetica);
CREATE INDEX IF NOT EXISTS idx_cert_energia_documento ON v4_energia.certificados_energeticos(documento_id);

ALTER TABLE v4_energia.certificados_energeticos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cert_energia_staff_all ON v4_energia.certificados_energeticos;
CREATE POLICY cert_energia_staff_all ON v4_energia.certificados_energeticos
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- anon: negado (condómino pode consultar via staff — não necessita acesso directo)


-- --------------------------------------------------------
-- GRANTS
-- --------------------------------------------------------

GRANT USAGE ON SCHEMA v4_energia TO authenticated;
GRANT USAGE ON SCHEMA v4_energia TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA v4_energia TO authenticated;

NOTIFY pgrst, 'reload schema';
