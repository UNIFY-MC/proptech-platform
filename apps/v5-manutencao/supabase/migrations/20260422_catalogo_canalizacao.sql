-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Migration: Catálogo de serviços + Serviço personalizado             ║
-- ║  v5-manutencao · V1 Core Hub (hkmvszkpxjbxmnixzqbl) · 22 Abr 2026    ║
-- ║                                                                      ║
-- ║  VERSÃO ADAPTADA ao schema existente:                                ║
-- ║  · servicos.id é UUID (não TEXT) — adicionamos `slug UNIQUE TEXT`    ║
-- ║    como chave natural. Frontend faz lookup slug→UUID antes de gravar ║
-- ║    ordens.                                                            ║
-- ║  · ordens já tem: horas_reais, inicio_servico, fim_servico,          ║
-- ║    descricao_personalizada (~descricao_cliente), fotos_urls          ║
-- ║    (~fotos_cliente), notas (~notas_cliente). Reaproveitadas.         ║
-- ║  · Variações e extras usam FK UUID (não TEXT) para servicos.id.      ║
-- ║                                                                      ║
-- ║  Aditiva e idempotente: pode correr múltiplas vezes sem partir.      ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────
-- 1. CATEGORIAS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  icon       TEXT,
  ordem      INT DEFAULT 0,
  activo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. SUBCATEGORIAS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcategorias (
  id           TEXT PRIMARY KEY,
  categoria_id TEXT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  icon         TEXT,
  ordem        INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- 3. SERVICOS — expandir (preservar UUID id, adicionar slug + metadados)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS slug             TEXT UNIQUE;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS categoria_id     TEXT REFERENCES categorias(id);
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS subcategoria_id  TEXT REFERENCES subcategorias(id) ON DELETE SET NULL;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS descricao_curta  TEXT;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS tagline          TEXT;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS preco_original   NUMERIC(8,2);
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS tipo             TEXT DEFAULT 'fixo';
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS duracao_tipica   TEXT;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS garantia_dias    INT DEFAULT 90;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS icon             TEXT;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS popular          BOOLEAN DEFAULT FALSE;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS eco              BOOLEAN DEFAULT FALSE;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS urgent           BOOLEAN DEFAULT FALSE;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS inclui           JSONB DEFAULT '[]'::jsonb;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS nao_inclui       JSONB DEFAULT '[]'::jsonb;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS faq              JSONB DEFAULT '[]'::jsonb;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS ordem            INT DEFAULT 0;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────
-- 4. VARIAÇÕES (referencia UUID de servicos)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servico_variacoes (
  id          TEXT PRIMARY KEY,
  servico_id  UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  preco       NUMERIC(8,2) NOT NULL,
  duracao     TEXT,
  popular     BOOLEAN DEFAULT FALSE,
  ordem       INT DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────────────
-- 5. EXTRAS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servico_extras (
  id                TEXT PRIMARY KEY,
  servico_id        UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  preco             NUMERIC(8,2) NOT NULL,
  duracao_extra_min INT DEFAULT 0,
  ordem             INT DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────────────
-- 6. EXPANSÃO DE ORDENS — aditivo, reaproveita existentes
--    Já existem: horas_reais, inicio_servico, fim_servico,
--                descricao_personalizada, fotos_urls, notas
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS variacao_id          TEXT REFERENCES servico_variacoes(id);
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS extras_ids           JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS is_personalizado     BOOLEAN DEFAULT FALSE;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS horas_estimadas      NUMERIC(3,1);
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS slots_flexiveis      JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS schedule_mode        TEXT;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS travel_fee           NUMERIC(6,2) DEFAULT 5.90;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS schedule_surcharge   NUMERIC(6,2) DEFAULT 0;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS metodo_pagamento     TEXT;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS promo_code           TEXT;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS promo_desconto       NUMERIC(6,2) DEFAULT 0;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS faturacao_nome       TEXT;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS faturacao_nif        VARCHAR(9);
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS faturacao_morada     TEXT;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS faturacao_cp         VARCHAR(8);
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS faturacao_localidade TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- 7. ÍNDICES
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_servicos_categoria_id    ON servicos(categoria_id) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_servicos_subcategoria_id ON servicos(subcategoria_id) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_servicos_slug            ON servicos(slug);
CREATE INDEX IF NOT EXISTS idx_subcategorias_categoria  ON subcategorias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico           ON ordens(servico_id);
CREATE INDEX IF NOT EXISTS idx_servico_variacoes_srv    ON servico_variacoes(servico_id);
CREATE INDEX IF NOT EXISTS idx_servico_extras_srv       ON servico_extras(servico_id);

-- ─────────────────────────────────────────────────────────────────────
-- 8. RLS — read público (authenticated + anon), write só via service role
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE categorias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategorias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico_variacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico_extras    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categorias_read             ON categorias;
DROP POLICY IF EXISTS categorias_anon_read        ON categorias;
DROP POLICY IF EXISTS subcategorias_read          ON subcategorias;
DROP POLICY IF EXISTS subcategorias_anon_read     ON subcategorias;
DROP POLICY IF EXISTS servico_variacoes_read      ON servico_variacoes;
DROP POLICY IF EXISTS servico_variacoes_anon_read ON servico_variacoes;
DROP POLICY IF EXISTS servico_extras_read         ON servico_extras;
DROP POLICY IF EXISTS servico_extras_anon_read    ON servico_extras;
DROP POLICY IF EXISTS servicos_read               ON servicos;
DROP POLICY IF EXISTS servicos_anon_read          ON servicos;

CREATE POLICY categorias_read             ON categorias        FOR SELECT TO authenticated USING (activo = TRUE);
CREATE POLICY categorias_anon_read        ON categorias        FOR SELECT TO anon          USING (activo = TRUE);
CREATE POLICY subcategorias_read          ON subcategorias     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY subcategorias_anon_read     ON subcategorias     FOR SELECT TO anon          USING (TRUE);
CREATE POLICY servico_variacoes_read      ON servico_variacoes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY servico_variacoes_anon_read ON servico_variacoes FOR SELECT TO anon          USING (TRUE);
CREATE POLICY servico_extras_read         ON servico_extras    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY servico_extras_anon_read    ON servico_extras    FOR SELECT TO anon          USING (TRUE);
CREATE POLICY servicos_read               ON servicos          FOR SELECT TO authenticated USING (ativo = TRUE);
CREATE POLICY servicos_anon_read          ON servicos          FOR SELECT TO anon          USING (ativo = TRUE);

-- ─────────────────────────────────────────────────────────────────────
-- 9. SEED — Categoria Canalização
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO categorias (id, nome, slug, icon, ordem, activo) VALUES
  ('canalizacao', 'Canalização', 'canalizacao', '🚿', 7, TRUE)
ON CONFLICT (id) DO UPDATE SET
  nome  = EXCLUDED.nome,
  icon  = EXCLUDED.icon,
  ordem = EXCLUDED.ordem;

-- ─────────────────────────────────────────────────────────────────────
-- 10. SEED — Subcategorias
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO subcategorias (id, categoria_id, nome, icon, ordem) VALUES
  ('autoclismo',       'canalizacao', 'Autoclismo e sanita',    '🚽', 1),
  ('torneiras',        'canalizacao', 'Torneiras',              '🚰', 2),
  ('fugas',            'canalizacao', 'Fugas e diagnósticos',   '💧', 3),
  ('desentupimentos',  'canalizacao', 'Desentupimentos',        '🌊', 4),
  ('lavatorio',        'canalizacao', 'Lavatório',              '🪞', 5),
  ('duche',            'canalizacao', 'Duche e banheira',       '🚿', 6),
  ('manutencao_can',   'canalizacao', 'Manutenção',             '🧱', 7)
ON CONFLICT (id) DO UPDATE SET
  nome  = EXCLUDED.nome,
  icon  = EXCLUDED.icon,
  ordem = EXCLUDED.ordem;

-- ─────────────────────────────────────────────────────────────────────
-- 11. SEED — 30 serviços. ON CONFLICT via slug (id UUID auto).
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO servicos (slug, categoria, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem, ativo) VALUES
  ('personalizado',    'canalizacao', 'canalizacao', NULL,               'Serviço personalizado',                                           44.91,   49.90, 'personalizado', FALSE, FALSE,  0, TRUE),
  ('auto-repair',      'canalizacao', 'canalizacao', 'autoclismo',       'Reparação de autoclismo',                                         36.46,   42.90, 'fixo',          TRUE,  FALSE,  1, TRUE),
  ('auto-install',     'canalizacao', 'canalizacao', 'autoclismo',       'Instalação de autoclismo',                                        30.43,   32.90, 'fixo',          FALSE, FALSE,  2, TRUE),
  ('seat-repair',      'canalizacao', 'canalizacao', 'autoclismo',       'Reparar tampo de sanita',                                         27.65,   29.90, 'fixo',          FALSE, FALSE,  3, TRUE),
  ('seat-replace',     'canalizacao', 'canalizacao', 'autoclismo',       'Substituir tampo de sanita',                                      29.25,   32.50, 'fixo',          FALSE, FALSE,  4, TRUE),
  ('toilet-replace',   'canalizacao', 'canalizacao', 'autoclismo',       'Substituir sanita',                                               79.11,   87.90, 'fixo',          FALSE, FALSE,  5, TRUE),
  ('toilet-install',   'canalizacao', 'canalizacao', 'autoclismo',       'Instalar sanita',                                                 57.15,   63.50, 'fixo',          FALSE, FALSE,  6, TRUE),
  ('toilet-remove',    'canalizacao', 'canalizacao', 'autoclismo',       'Remover sanita',                                                  57.15,   63.50, 'fixo',          FALSE, FALSE,  7, TRUE),
  ('toilet-unclog',    'canalizacao', 'canalizacao', 'autoclismo',       'Desentupir sanita',                                               105.75,  117.50,'fixo',          FALSE, FALSE,  8, TRUE),
  ('bath-tap-repair',  'canalizacao', 'canalizacao', 'torneiras',        'Reparar torneira de casa de banho',                               35.55,   39.50, 'fixo',          FALSE, FALSE,  9, TRUE),
  ('sink-tap-repair',  'canalizacao', 'canalizacao', 'torneiras',        'Reparar torneira de lava-loiça',                                  35.55,   39.50, 'fixo',          FALSE, FALSE, 10, TRUE),
  ('sink-tap-replace', 'canalizacao', 'canalizacao', 'torneiras',        'Substituir torneira de lavatório',                                29.61,   32.90, 'fixo',          FALSE, FALSE, 11, TRUE),
  ('kitchen-tap-eff',  'canalizacao', 'canalizacao', 'torneiras',        'Substituir torneira de lava-loiça (Eficiência energética)',       39.15,   43.50, 'fixo',          FALSE, TRUE,  12, TRUE),
  ('bath-tap-eff',     'canalizacao', 'canalizacao', 'torneiras',        'Substituir torneira de casa de banho (Eficiência energética)',    35.55,   39.50, 'fixo',          FALSE, TRUE,  13, TRUE),
  ('safety-tap',       'canalizacao', 'canalizacao', 'torneiras',        'Substituir torneira de segurança',                                18.40,   19.90, 'fixo',          FALSE, FALSE, 14, TRUE),
  ('bath-tap-install', 'canalizacao', 'canalizacao', 'torneiras',        'Instalar torneira de banheira',                                   35.55,   39.50, 'fixo',          FALSE, FALSE, 15, TRUE),
  ('leak-diagnosis',   'canalizacao', 'canalizacao', 'fugas',            'Diagnóstico de fuga de água',                                     35.55,   39.50, 'fixo',          FALSE, FALSE, 16, TRUE),
  ('kitchen-leak',     'canalizacao', 'canalizacao', 'fugas',            'Fuga de água no lava-loiça',                                      42.21,   46.90, 'fixo',          TRUE,  FALSE, 17, TRUE),
  ('sink-leak',        'canalizacao', 'canalizacao', 'fugas',            'Fuga de água no lavatório',                                       40.37,   42.50, 'fixo',          FALSE, FALSE, 18, TRUE),
  ('shower-leak',      'canalizacao', 'canalizacao', 'fugas',            'Reparar cabine de duche (Fuga de água)',                          207.18,  212.50,'fixo',          FALSE, FALSE, 19, TRUE),
  ('kitchen-unclog',   'canalizacao', 'canalizacao', 'desentupimentos',  'Desentupir lava-loiça',                                           70.97,   83.50, 'fixo',          FALSE, FALSE, 20, TRUE),
  ('bathroom-unclog',  'canalizacao', 'canalizacao', 'desentupimentos',  'Desentupir casa de banho',                                        83.25,   92.50, 'fixo',          FALSE, FALSE, 21, TRUE),
  ('valve-replace',    'canalizacao', 'canalizacao', 'lavatorio',        'Substituir válvula de lavatório',                                 33.15,   34.90, 'fixo',          FALSE, FALSE, 22, TRUE),
  ('vanity-replace',   'canalizacao', 'canalizacao', 'lavatorio',        'Substituir móvel de lavatório',                                   82.35,   91.50, 'fixo',          FALSE, FALSE, 23, TRUE),
  ('vanity-install',   'canalizacao', 'canalizacao', 'lavatorio',        'Instalar móvel de lavatório',                                     53.01,   58.90, 'fixo',          FALSE, FALSE, 24, TRUE),
  ('shower-column',    'canalizacao', 'canalizacao', 'duche',            'Substituir coluna de duche',                                      43.11,   47.90, 'fixo',          FALSE, FALSE, 25, TRUE),
  ('shower-head-eff',  'canalizacao', 'canalizacao', 'duche',            'Substituir chuveiro (Eficiência energética)',                     35.01,   38.90, 'fixo',          FALSE, TRUE,  26, TRUE),
  ('shower-cabin',     'canalizacao', 'canalizacao', 'duche',            'Substituir cabine de duche',                                      227.66,  233.50,'fixo',          FALSE, FALSE, 27, TRUE),
  ('tub-to-shower',    'canalizacao', 'canalizacao', 'duche',            'Substituir banheira por duche',                                   2084.50, NULL,  'fixo',          FALSE, FALSE, 28, TRUE),
  ('grout-replace',    'canalizacao', 'canalizacao', 'manutencao_can',   'Substituir juntas de azulejos',                                   35.64,   41.93, 'fixo',          FALSE, FALSE, 29, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  nome            = EXCLUDED.nome,
  categoria       = EXCLUDED.categoria,
  categoria_id    = EXCLUDED.categoria_id,
  subcategoria_id = EXCLUDED.subcategoria_id,
  preco           = EXCLUDED.preco,
  preco_original  = EXCLUDED.preco_original,
  tipo            = EXCLUDED.tipo,
  popular         = EXCLUDED.popular,
  eco             = EXCLUDED.eco,
  ordem           = EXCLUDED.ordem,
  ativo           = EXCLUDED.ativo,
  updated_at      = NOW();

-- ─────────────────────────────────────────────────────────────────────
-- 12. VERIFICAÇÃO
-- Expected: total=30, populares=2, eco=3, personalizados=1
-- ─────────────────────────────────────────────────────────────────────
-- SELECT
--   COUNT(*)                                          AS total,
--   COUNT(*) FILTER (WHERE popular = TRUE)            AS populares,
--   COUNT(*) FILTER (WHERE eco = TRUE)                AS eco,
--   COUNT(*) FILTER (WHERE tipo = 'personalizado')    AS personalizados
-- FROM servicos
-- WHERE categoria_id = 'canalizacao';
