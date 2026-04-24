-- ═══════════════════════════════════════════════════════════════
-- 02_v5_casa_schema.sql
-- V5 Casa — Schema completo Módulo Casa (Fase 3.1)
-- Projecto: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- Section 1a: ALTER v5_manutencao.localizacoes
-- A tabela já existe com 1 row — organization_id adicionado como
-- NULLABLE para não bloquear. TODO(mario): tornar NOT NULL após
-- atribuir organization_id às rows existentes.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.localizacoes
  ADD COLUMN IF NOT EXISTS organization_id     UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS score_cobertura     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_limpeza       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assessment_completo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assessment_data     DATE;

-- ─────────────────────────────────────────────────────────────
-- Section 1b: ALTER v5_manutencao.equipamentos
-- organization_id NULLABLE — mesmo motivo que localizacoes.
-- Expande CHECK de categoria para incluir 'eletrodomestico' e
-- 'seguranca' (mantendo 'elevador' e 'gerador' da definição anterior).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.equipamentos
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE;

ALTER TABLE v5_manutencao.equipamentos
  DROP CONSTRAINT IF EXISTS equipamentos_categoria_check;
ALTER TABLE v5_manutencao.equipamentos
  ADD CONSTRAINT equipamentos_categoria_check CHECK (
    categoria IN (
      'aquecimento','climatizacao','aguas_quentes','canalizacao','eletrica',
      'cobertura','estrutura','piscina','solar','elevador','gerador',
      'eletrodomestico','seguranca','outros'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Section 1c: ALTER v5_manutencao.documentos
-- ─────────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.documentos
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE;
-- TODO(mario): tornar NOT NULL após atribuir organization_id às rows existentes

-- ─────────────────────────────────────────────────────────────
-- Section 1d: ALTER v5_manutencao.prestadores
-- ─────────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.prestadores
  ADD COLUMN IF NOT EXISTS prestador_modo        TEXT DEFAULT 'basico'
    CHECK (prestador_modo IN ('basico','pro')),
  ADD COLUMN IF NOT EXISTS founding_professional BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- Section 1e: ALTER v5_manutencao.ordens_trabalho
-- ─────────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.ordens_trabalho
  ADD COLUMN IF NOT EXISTS origem     TEXT DEFAULT 'v5'
    CHECK (origem IN ('v5','v2_condo','api_externa')),
  ADD COLUMN IF NOT EXISTS origem_ref UUID;

-- ─────────────────────────────────────────────────────────────
-- Section 1f: ALTER tabelas opcionais (guard IF EXISTS)
-- listas_cliente, cliente_moradas, perfis_fiscais ainda não existem
-- — serão criadas nas fases respectivas com organization_id desde
-- o dia 1. Este bloco é um no-op seguro por agora.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='v5_manutencao' AND table_name='listas_cliente') THEN
    ALTER TABLE v5_manutencao.listas_cliente
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='v5_manutencao' AND table_name='cliente_moradas') THEN
    ALTER TABLE v5_manutencao.cliente_moradas
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='v5_manutencao' AND table_name='perfis_fiscais') THEN
    ALTER TABLE v5_manutencao.perfis_fiscais
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- Section 2: Create new tables (8)
-- ─────────────────────────────────────────────────────────────

-- Pedidos de Orçamento (RFQ)
CREATE TABLE IF NOT EXISTS v5_manutencao.pedidos_orcamento (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id              UUID NOT NULL REFERENCES core.pessoas(id),
  organization_id        UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  localizacao_id         UUID REFERENCES v5_manutencao.localizacoes(id),
  areas                  TEXT[] NOT NULL,
  descricao              TEXT NOT NULL,
  fotos_urls             TEXT[] DEFAULT '{}',
  video_url              TEXT,
  orcamento_anterior_url TEXT,
  formatos               TEXT[] NOT NULL,
  estado                 TEXT DEFAULT 'aberto'
    CHECK (estado IN ('aberto','em_cotacao','cotado','aceite','cancelado','expirado')),
  n_orcamentos_esperados INT,
  contacto_preferido     TEXT DEFAULT 'app',
  data_limite            TIMESTAMPTZ DEFAULT (now() + interval '72 hours'),
  created_at             TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT areas_max_3 CHECK (array_length(areas, 1) <= 3)
);

CREATE TABLE IF NOT EXISTS v5_manutencao.orcamentos_recebidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID NOT NULL REFERENCES v5_manutencao.pedidos_orcamento(id) ON DELETE CASCADE,
  prestador_id    UUID NOT NULL REFERENCES v5_manutencao.prestadores(id),
  formato         TEXT NOT NULL,
  valor           NUMERIC(10,2),
  descricao       TEXT,
  anexo_pdf_url   TEXT,
  data_disponivel DATE,
  validade_dias   INT DEFAULT 30,
  estado          TEXT DEFAULT 'enviado'
    CHECK (estado IN ('enviado','visto','aceite','rejeitado')),
  enviado_em      TIMESTAMPTZ DEFAULT now()
);

-- Alertas inteligentes
CREATE TABLE IF NOT EXISTS v5_manutencao.alertas_inteligentes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  pessoa_id       UUID NOT NULL REFERENCES core.pessoas(id),
  localizacao_id  UUID REFERENCES v5_manutencao.localizacoes(id),
  equipamento_id  UUID REFERENCES v5_manutencao.equipamentos(id),
  tipo            TEXT CHECK (tipo IN ('meteo','equipamento','eficiencia','manutencao','deteccao_ia')),
  nivel           TEXT CHECK (nivel IN ('urgente','atencao','info','boas_noticias')),
  titulo          TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  dados_tecnicos  JSONB DEFAULT '{}'::jsonb,
  acoes           JSONB DEFAULT '[]'::jsonb,
  estado          TEXT DEFAULT 'ativo'
    CHECK (estado IN ('ativo','arquivado','resolvido')),
  gerado_por      TEXT DEFAULT 'regra',
  expira_em       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Subscrições
CREATE TABLE IF NOT EXISTS v5_manutencao.subscricoes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id              UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id        UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  plano                  TEXT NOT NULL
    CHECK (plano IN ('gratis','home_plus','home_pro','prestador_basico','prestador_pro')),
  preco_mensal           NUMERIC(6,2) NOT NULL,
  estado                 TEXT DEFAULT 'ativo'
    CHECK (estado IN ('ativo','pausado','cancelado','trial')),
  trial_ate              DATE,
  data_inicio            DATE NOT NULL DEFAULT CURRENT_DATE,
  data_renovacao         DATE,
  stripe_subscription_id TEXT,
  pontos_total           INT DEFAULT 0,
  streak_dias            INT DEFAULT 0,
  streak_recorde         INT DEFAULT 0,
  nivel                  TEXT DEFAULT 'bronze'
    CHECK (nivel IN ('bronze','silver','gold','platinum','diamond')),
  created_at             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v5_manutencao.creditos_mensais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscricao_id   UUID NOT NULL REFERENCES v5_manutencao.subscricoes(id) ON DELETE CASCADE,
  ano             INT NOT NULL,
  mes             INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  gasto_servicos  NUMERIC(10,2) DEFAULT 0,
  credito_ganho   NUMERIC(10,2) DEFAULT 0,
  percent_credito NUMERIC(4,2) DEFAULT 10.00,
  subscricao_paga NUMERIC(10,2),
  UNIQUE (subscricao_id, ano, mes)
);

-- Gamificação
CREATE TABLE IF NOT EXISTS v5_manutencao.pontos_historico (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  pontos    INT NOT NULL,
  motivo    TEXT NOT NULL,
  ref_tipo  TEXT,
  ref_id    UUID,
  data      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v5_manutencao.missoes_utilizador (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id   UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  pontos      INT NOT NULL,
  urgente     BOOLEAN DEFAULT false,
  estado      TEXT DEFAULT 'aberta'
    CHECK (estado IN ('aberta','concluida','expirada')),
  data_limite DATE,
  gerada_por  TEXT DEFAULT 'seed',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Categorias para landing pages de serviços
CREATE TABLE IF NOT EXISTS v5_manutencao.categorias_landing (
  categoria              TEXT PRIMARY KEY,
  titulo                 TEXT,
  subtitulo              TEXT,
  descricao_longa        TEXT,
  cor_hex                TEXT,
  icon_emoji             TEXT,
  faqs                   JSONB DEFAULT '[]'::jsonb,
  servicos_populares_ids UUID[]
);

-- ─────────────────────────────────────────────────────────────
-- Section 3: Indexes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_equipamentos_org   ON v5_manutencao.equipamentos(organization_id);
CREATE INDEX IF NOT EXISTS idx_localizacoes_org   ON v5_manutencao.localizacoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_documentos_org     ON v5_manutencao.documentos(organization_id);
CREATE INDEX IF NOT EXISTS idx_alertas_int_org    ON v5_manutencao.alertas_inteligentes(organization_id);
CREATE INDEX IF NOT EXISTS idx_alertas_int_pessoa ON v5_manutencao.alertas_inteligentes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_subscricoes_pessoa ON v5_manutencao.subscricoes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pontos_pessoa      ON v5_manutencao.pontos_historico(pessoa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_missoes_pessoa     ON v5_manutencao.missoes_utilizador(pessoa_id, estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_org        ON v5_manutencao.pedidos_orcamento(organization_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_pessoa     ON v5_manutencao.pedidos_orcamento(pessoa_id);

-- ─────────────────────────────────────────────────────────────
-- Section 4: Permissions + Disable RLS (dev)
-- ─────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA v5_manutencao TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA v5_manutencao TO anon, authenticated;

DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'v5_manutencao' LOOP
    EXECUTE format('ALTER TABLE v5_manutencao.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
