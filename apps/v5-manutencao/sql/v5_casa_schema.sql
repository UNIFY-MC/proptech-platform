-- ═══════════════════════════════════════════════════════════════
-- V5 CASA — Módulo de gestão de equipamentos (Fase 3.1)
-- Schema: v5_manutencao (existente)
-- ═══════════════════════════════════════════════════════════════

-- ── LOCALIZAÇÕES ──
CREATE TABLE IF NOT EXISTS v5_manutencao.localizacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       UUID REFERENCES core.pessoas(id) ON DELETE CASCADE,
  imovel_id       UUID REFERENCES core.imoveis(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'habitacao'
    CHECK (tipo IN ('habitacao','condominio','empresa','segunda_habitacao')),
  morada          TEXT,
  localidade      TEXT,
  concelho        TEXT,
  codigo_postal   TEXT,
  ano_construcao  INT,
  tipologia       TEXT,
  area_m2         NUMERIC(8,2),
  notas           TEXT,
  home_score      INT DEFAULT 0 CHECK (home_score BETWEEN 0 AND 100),
  score_avac      INT DEFAULT 0,
  score_canaliz   INT DEFAULT 0,
  score_eletrica  INT DEFAULT 0,
  score_estrutura INT DEFAULT 0,
  score_agua      INT DEFAULT 0,
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_localizacoes_pessoa ON v5_manutencao.localizacoes(pessoa_id);

-- ── EQUIPAMENTOS ──
CREATE TABLE IF NOT EXISTS v5_manutencao.equipamentos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  localizacao_id       UUID NOT NULL REFERENCES v5_manutencao.localizacoes(id) ON DELETE CASCADE,
  categoria            TEXT NOT NULL CHECK (categoria IN (
    'aquecimento','climatizacao','aguas_quentes','canalizacao','eletrica',
    'cobertura','estrutura','piscina','solar','elevador','gerador','outros'
  )),
  nome                 TEXT NOT NULL,
  marca                TEXT,
  modelo               TEXT,
  numero_serie         TEXT,
  localizacao_imovel   TEXT,
  data_instalacao      DATE,
  data_garantia_fim    DATE,
  data_ultima_revisao  DATE,
  data_proxima_revisao DATE,
  tecnico_habitual_id  UUID REFERENCES v5_manutencao.prestadores(id) ON DELETE SET NULL,
  classe_energetica    TEXT CHECK (classe_energetica IN ('A+++','A++','A+','A','B','C','D','E','F','G') OR classe_energetica IS NULL),
  potencia_kw          NUMERIC(6,2),
  consumo_estimado_kwh_mes NUMERIC(8,2),
  eficiencia_estimada  NUMERIC(5,2),
  health_score         INT DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  estado               TEXT DEFAULT 'ativo' CHECK (estado IN ('ativo','abatido','apagado')),
  notas                TEXT,
  manual_url           TEXT,
  dados_ia             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipamentos_loc    ON v5_manutencao.equipamentos(localizacao_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_cat    ON v5_manutencao.equipamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_equipamentos_estado ON v5_manutencao.equipamentos(estado);

-- ── INTERVENÇÕES ──
CREATE TABLE IF NOT EXISTS v5_manutencao.intervencoes_equipamento (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id    UUID NOT NULL REFERENCES v5_manutencao.equipamentos(id) ON DELETE CASCADE,
  ordem_id          UUID REFERENCES v5_manutencao.ordens_trabalho(id) ON DELETE SET NULL,
  prestador_id      UUID REFERENCES v5_manutencao.prestadores(id) ON DELETE SET NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('revisao','reparacao','substituicao','inspecao','instalacao')),
  descricao         TEXT NOT NULL,
  data              DATE NOT NULL,
  duracao_min       INT,
  custo_total       NUMERIC(10,2),
  pecas_usadas      JSONB DEFAULT '[]'::jsonb,
  fotos_urls        TEXT[],
  notas_tecnico     TEXT,
  relatorio_pdf_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interv_eq ON v5_manutencao.intervencoes_equipamento(equipamento_id, data DESC);

-- ── DOCUMENTOS ──
CREATE TABLE IF NOT EXISTS v5_manutencao.documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  localizacao_id  UUID REFERENCES v5_manutencao.localizacoes(id) ON DELETE CASCADE,
  equipamento_id  UUID REFERENCES v5_manutencao.equipamentos(id) ON DELETE SET NULL,
  intervencao_id  UUID REFERENCES v5_manutencao.intervencoes_equipamento(id) ON DELETE SET NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN (
    'fatura','garantia','contrato','relatorio','manual','foto','planta','outro'
  )),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  url             TEXT NOT NULL,
  storage_path    TEXT,
  mime_type       TEXT,
  tamanho_bytes   BIGINT,
  valido_ate      DATE,
  valor_euros     NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT doc_parent_check CHECK (
    localizacao_id IS NOT NULL OR equipamento_id IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_docs_eq  ON v5_manutencao.documentos(equipamento_id);
CREATE INDEX IF NOT EXISTS idx_docs_loc ON v5_manutencao.documentos(localizacao_id);

-- ── CONSUMOS ENERGÉTICOS ──
CREATE TABLE IF NOT EXISTS v5_manutencao.consumos_energia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id  UUID NOT NULL REFERENCES v5_manutencao.equipamentos(id) ON DELETE CASCADE,
  ano             INT NOT NULL,
  mes             INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  kwh             NUMERIC(10,2) NOT NULL,
  custo_estimado  NUMERIC(10,2),
  fonte           TEXT DEFAULT 'estimado' CHECK (fonte IN ('estimado','manual','ocr_fatura','smart_meter')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (equipamento_id, ano, mes)
);
CREATE INDEX IF NOT EXISTS idx_consumos_eq ON v5_manutencao.consumos_energia(equipamento_id, ano DESC, mes DESC);

-- ── ALERTAS METEO ──
CREATE TABLE IF NOT EXISTS v5_manutencao.alertas_meteo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concelho        TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  nivel           TEXT CHECK (nivel IN ('amarelo','laranja','vermelho')),
  valor           NUMERIC,
  data_inicio     TIMESTAMPTZ NOT NULL,
  data_fim        TIMESTAMPTZ NOT NULL,
  descricao       TEXT,
  fetched_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meteo_concelho ON v5_manutencao.alertas_meteo(concelho, data_inicio DESC);

-- ── PERMISSÕES (DEV: RLS disabled, conforme plano) ──
GRANT USAGE ON SCHEMA v5_manutencao TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA v5_manutencao TO anon, authenticated;

ALTER TABLE v5_manutencao.localizacoes             DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.equipamentos             DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.intervencoes_equipamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.documentos               DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.consumos_energia         DISABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.alertas_meteo            DISABLE ROW LEVEL SECURITY;

-- ── SEED DEMO ──
INSERT INTO v5_manutencao.localizacoes
  (nome, tipo, morada, localidade, concelho, ano_construcao, tipologia, area_m2, home_score,
   score_avac, score_canaliz, score_eletrica, score_estrutura, score_agua)
VALUES
  ('Casa Principal', 'habitacao', 'R. da Saudade, 12', 'Coimbra', 'Coimbra',
   2005, 'T3', 120, 74, 82, 91, 70, 60, 88)
ON CONFLICT DO NOTHING;

WITH loc AS (SELECT id FROM v5_manutencao.localizacoes WHERE nome='Casa Principal' LIMIT 1)
INSERT INTO v5_manutencao.equipamentos
  (localizacao_id, categoria, nome, marca, modelo, localizacao_imovel,
   data_instalacao, data_garantia_fim, data_ultima_revisao, classe_energetica,
   potencia_kw, consumo_estimado_kwh_mes, eficiencia_estimada, health_score)
SELECT loc.id, 'aquecimento', 'Caldeira Junkers ZWC 24', 'Junkers', 'ZWC 24-2 DH', 'Rés-do-chão',
       DATE '2016-03-15', DATE '2021-06-15', DATE '2023-11-14', 'B', 24, 213, 82, 52 FROM loc
UNION ALL
SELECT loc.id, 'climatizacao', 'AC Daikin FTXC25', 'Daikin', 'FTXC25', 'Sala',
       DATE '2022-06-20', DATE '2027-06-20', DATE '2023-08-10', 'A++', 2.5, 26, 94, 88 FROM loc
UNION ALL
SELECT loc.id, 'aguas_quentes', 'Esquentador Vulcano 14L', 'Vulcano', 'ClickTronic 14', 'Cozinha',
       DATE '2019-04-10', DATE '2024-04-10', NULL::date, 'A', 23, 40, 88, 80 FROM loc
UNION ALL
SELECT loc.id, 'cobertura', 'Telhado / Impermeabilização', NULL, NULL, 'Cobertura exterior',
       NULL::date, NULL::date, NULL::date, NULL, NULL, 0, NULL, 38 FROM loc
ON CONFLICT DO NOTHING;
