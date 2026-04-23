-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Migration: Catálogo COMPLETO — 8 categorias + ~155 serviços         ║
-- ║  v5-manutencao · 22 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Conteúdo:                                                           ║
-- ║   • Tabelas: categorias, subcategorias, servicos,                    ║
-- ║     servico_variacoes, servico_extras                                ║
-- ║   • Expansão da tabela 'ordens' (aditivo)                            ║
-- ║   • 8 categorias: Limpeza, Manutenção, Jardim, Piscina, Pintura,     ║
-- ║     Elétrica, Canalização, Pós-Obra                                  ║
-- ║   • ~30 subcategorias                                                ║
-- ║   • 8 serviços personalizados (um por categoria)                     ║
-- ║   • ~147 serviços fixos                                              ║
-- ║   • Seed de detalhe rico em 8 serviços P1 (inclui/não-inclui/FAQ)    ║
-- ║                                                                      ║
-- ║  Idempotente: ON CONFLICT DO UPDATE em todos os INSERTs.             ║
-- ║  Não faz DROP/TRUNCATE de tabelas existentes.                        ║
-- ║  Todos os serviços: garantia 90 dias, taxa deslocação €5,90.         ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═════════════════════════════════════════════════════════════════════
-- 0. SCHEMA — TABELAS DO CATÁLOGO + EXPANSÃO DA 'ordens'
-- ═════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS categorias (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  icon       TEXT,
  tagline    TEXT,
  ordem      INT DEFAULT 0,
  activo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategorias (
  id           TEXT PRIMARY KEY,
  categoria_id TEXT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  icon         TEXT,
  ordem        INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos (
  id               TEXT PRIMARY KEY,
  categoria_id     TEXT REFERENCES categorias(id) ON DELETE CASCADE,
  subcategoria_id  TEXT REFERENCES subcategorias(id) ON DELETE SET NULL,
  nome             TEXT NOT NULL,
  descricao_curta  TEXT,
  tagline          TEXT,
  preco            NUMERIC(8,2) NOT NULL,
  preco_original   NUMERIC(8,2),
  tipo             TEXT NOT NULL DEFAULT 'fixo',  -- 'fixo' | 'hora' | 'personalizado'
  unidade          TEXT,
  duracao_tipica   TEXT,
  garantia_dias    INT DEFAULT 90,
  icon             TEXT,
  popular          BOOLEAN DEFAULT FALSE,
  eco              BOOLEAN DEFAULT FALSE,
  urgent           BOOLEAN DEFAULT FALSE,
  inclui           JSONB DEFAULT '[]'::jsonb,
  nao_inclui       JSONB DEFAULT '[]'::jsonb,
  faq              JSONB DEFAULT '[]'::jsonb,
  activo           BOOLEAN DEFAULT TRUE,
  ordem            INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servico_variacoes (
  id          TEXT PRIMARY KEY,
  servico_id  TEXT NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  preco       NUMERIC(8,2) NOT NULL,
  duracao     TEXT,
  popular     BOOLEAN DEFAULT FALSE,
  ordem       INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS servico_extras (
  id                TEXT PRIMARY KEY,
  servico_id        TEXT NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  preco             NUMERIC(8,2) NOT NULL,
  duracao_extra_min INT DEFAULT 0,
  ordem             INT DEFAULT 0
);

-- Expansão da tabela 'ordens' (aditivo, não-destrutivo)
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS servico_id           TEXT REFERENCES servicos(id);
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS variacao_id          TEXT REFERENCES servico_variacoes(id);
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS extras_ids           JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS is_personalizado     BOOLEAN DEFAULT FALSE;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS horas_estimadas      NUMERIC(3,1);
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS horas_reais          NUMERIC(3,1);
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS inicio_servico       TIMESTAMPTZ;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS fim_servico          TIMESTAMPTZ;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS descricao_cliente    TEXT;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS notas_cliente        TEXT;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS fotos_cliente        JSONB DEFAULT '[]'::jsonb;
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_servicos_categoria       ON servicos(categoria_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_servicos_subcategoria    ON servicos(subcategoria_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_servicos_popular         ON servicos(popular) WHERE activo = TRUE AND popular = TRUE;
CREATE INDEX IF NOT EXISTS idx_subcategorias_categoria  ON subcategorias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico           ON ordens(servico_id);
CREATE INDEX IF NOT EXISTS idx_servico_variacoes_srv    ON servico_variacoes(servico_id);
CREATE INDEX IF NOT EXISTS idx_servico_extras_srv       ON servico_extras(servico_id);

-- RLS — read público, write só admin (ajustar policy de admin ao schema real)
ALTER TABLE categorias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategorias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico_variacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico_extras    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categorias_read        ON categorias;
DROP POLICY IF EXISTS subcategorias_read     ON subcategorias;
DROP POLICY IF EXISTS servicos_read          ON servicos;
DROP POLICY IF EXISTS servico_variacoes_read ON servico_variacoes;
DROP POLICY IF EXISTS servico_extras_read    ON servico_extras;

CREATE POLICY categorias_read        ON categorias        FOR SELECT TO authenticated USING (activo = TRUE);
CREATE POLICY subcategorias_read     ON subcategorias     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY servicos_read          ON servicos          FOR SELECT TO authenticated USING (activo = TRUE);
CREATE POLICY servico_variacoes_read ON servico_variacoes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY servico_extras_read    ON servico_extras    FOR SELECT TO authenticated USING (TRUE);

-- ═════════════════════════════════════════════════════════════════════
-- 1. CATEGORIAS (8)
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO categorias (id, nome, slug, icon, ordem, activo) VALUES
  ('limpeza',     'Limpeza',     'limpeza',     '🧹', 1, TRUE),
  ('manutencao',  'Manutenção',  'manutencao',  '🔧', 2, TRUE),
  ('jardim',      'Jardim',      'jardim',      '🌿', 3, TRUE),
  ('piscina',     'Piscina',     'piscina',     '🏊', 4, TRUE),
  ('pintura',     'Pintura',     'pintura',     '🎨', 5, TRUE),
  ('eletrica',    'Elétrica',    'eletrica',    '⚡', 6, TRUE),
  ('canalizacao', 'Canalização', 'canalizacao', '🚿', 7, TRUE),
  ('pos_obra',    'Pós-Obra',    'pos-obra',    '🧱', 8, TRUE)
ON CONFLICT (id) DO UPDATE SET
  nome  = EXCLUDED.nome,
  icon  = EXCLUDED.icon,
  ordem = EXCLUDED.ordem;

-- ═════════════════════════════════════════════════════════════════════
-- 2. SUBCATEGORIAS
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO subcategorias (id, categoria_id, nome, icon, ordem) VALUES
  -- Limpeza
  ('cln_regular',    'limpeza',    'Limpeza regular',       '🧽', 1),
  ('cln_profunda',   'limpeza',    'Limpeza profunda',      '✨', 2),
  ('cln_texteis',    'limpeza',    'Têxteis',               '🛋️', 3),
  ('cln_superficies','limpeza',    'Superfícies',           '🪟', 4),
  ('cln_pos_obra',   'limpeza',    'Pós-obra',              '🧱', 5),
  -- Manutenção
  ('mnt_montagem',   'manutencao', 'Montagem e instalação', '🔩', 1),
  ('mnt_reparacao',  'manutencao', 'Reparação',             '🔨', 2),
  ('mnt_ajustes',    'manutencao', 'Ajustes e regulações',  '⚙️', 3),
  ('mnt_fixacao',    'manutencao', 'Fixação e suporte',     '📌', 4),
  -- Jardim
  ('jar_corte',      'jardim',     'Corte e manutenção',    '✂️', 1),
  ('jar_poda',       'jardim',     'Poda e limpeza',        '🌳', 2),
  ('jar_plantacao',  'jardim',     'Plantação e design',    '🌱', 3),
  ('jar_rega',       'jardim',     'Rega e equipamentos',   '💦', 4),
  -- Piscina
  ('pol_quimico',    'piscina',    'Tratamento químico',    '🧪', 1),
  ('pol_manutencao', 'piscina',    'Manutenção',            '🏊', 2),
  ('pol_reparacao',  'piscina',    'Reparação',             '🔧', 3),
  ('pol_epoca',      'piscina',    'Abertura e fecho',      '☀️', 4),
  -- Pintura
  ('pnt_interior',   'pintura',    'Interior',              '🏠', 1),
  ('pnt_exterior',   'pintura',    'Exterior',              '🏢', 2),
  ('pnt_preparacao', 'pintura',    'Preparação',            '🪣', 3),
  ('pnt_especial',   'pintura',    'Especial',              '🎨', 4),
  -- Elétrica
  ('elc_pontos',     'eletrica',   'Tomadas e interruptores', '🔌', 1),
  ('elc_iluminacao', 'eletrica',   'Iluminação',            '💡', 2),
  ('elc_quadro',     'eletrica',   'Quadro elétrico',       '🔋', 3),
  ('elc_diag',       'eletrica',   'Diagnóstico',           '🔍', 4),
  -- Canalização
  ('can_autoclismo',     'canalizacao', 'Autoclismo e sanita',   '🚽', 1),
  ('can_torneiras',      'canalizacao', 'Torneiras',             '🚰', 2),
  ('can_fugas',          'canalizacao', 'Fugas e diagnósticos',  '💧', 3),
  ('can_desentupimentos','canalizacao', 'Desentupimentos',       '🌊', 4),
  ('can_lavatorio',      'canalizacao', 'Lavatório',             '🪞', 5),
  ('can_duche',          'canalizacao', 'Duche e banheira',      '🚿', 6),
  ('can_manutencao',     'canalizacao', 'Manutenção',            '🧱', 7),
  -- Pós-Obra
  ('pos_limpeza',    'pos_obra',   'Limpeza de obra',       '✨', 1),
  ('pos_entulho',    'pos_obra',   'Remoção de entulho',    '🚛', 2),
  ('pos_acabamento', 'pos_obra',   'Remates e acabamentos', '🖌️', 3)
ON CONFLICT (id) DO UPDATE SET
  nome  = EXCLUDED.nome,
  icon  = EXCLUDED.icon,
  ordem = EXCLUDED.ordem;

-- ═════════════════════════════════════════════════════════════════════
-- 3. SERVIÇOS PERSONALIZADOS (um por categoria — 8 total)
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  ('personalizado-cln', 'limpeza',     NULL, 'Serviço personalizado', 44.91, 49.90, 'personalizado', FALSE, FALSE, 0),
  ('personalizado-mnt', 'manutencao',  NULL, 'Serviço personalizado', 44.91, 49.90, 'personalizado', FALSE, FALSE, 0),
  ('personalizado-jar', 'jardim',      NULL, 'Serviço personalizado', 44.91, 49.90, 'personalizado', FALSE, FALSE, 0),
  ('personalizado-pol', 'piscina',     NULL, 'Serviço personalizado', 44.91, 49.90, 'personalizado', FALSE, FALSE, 0),
  ('personalizado-pnt', 'pintura',     NULL, 'Serviço personalizado', 49.90, 54.90, 'personalizado', FALSE, FALSE, 0),
  ('personalizado-elc', 'eletrica',    NULL, 'Serviço personalizado', 49.90, 54.90, 'personalizado', FALSE, FALSE, 0),
  ('personalizado-can', 'canalizacao', NULL, 'Serviço personalizado', 44.91, 49.90, 'personalizado', FALSE, FALSE, 0),
  ('personalizado-pos', 'pos_obra',    NULL, 'Serviço personalizado', 49.90, 54.90, 'personalizado', FALSE, FALSE, 0)
ON CONFLICT (id) DO UPDATE SET
  preco          = EXCLUDED.preco,
  preco_original = EXCLUDED.preco_original,
  updated_at     = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- 4. LIMPEZA — 24 serviços
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  -- Regular
  ('cln-home-t1',       'limpeza', 'cln_regular',    'Limpeza doméstica T0/T1',            35.91,  39.90,  'fixo', TRUE,  FALSE, 1),
  ('cln-home-t2',       'limpeza', 'cln_regular',    'Limpeza doméstica T2',               44.91,  49.90,  'fixo', TRUE,  FALSE, 2),
  ('cln-home-t3',       'limpeza', 'cln_regular',    'Limpeza doméstica T3',               62.91,  69.90,  'fixo', FALSE, FALSE, 3),
  ('cln-home-t4',       'limpeza', 'cln_regular',    'Limpeza doméstica T4+',              89.91,  99.90,  'fixo', FALSE, FALSE, 4),
  ('cln-office-small',  'limpeza', 'cln_regular',    'Limpeza de escritório pequeno',      44.91,  49.90,  'fixo', FALSE, FALSE, 5),
  ('cln-monthly',       'limpeza', 'cln_regular',    'Limpeza mensal (T2) — subscrição',   8.99,   11.99,  'hora', FALSE, FALSE, 6),
  -- Profunda
  ('cln-deep-t1',       'limpeza', 'cln_profunda',   'Limpeza profunda T0/T1',             62.91,  69.90,  'fixo', FALSE, FALSE, 7),
  ('cln-deep-t2',       'limpeza', 'cln_profunda',   'Limpeza profunda T2',                89.91,  99.90,  'fixo', TRUE,  FALSE, 8),
  ('cln-deep-t3',       'limpeza', 'cln_profunda',   'Limpeza profunda T3',                134.91, 149.90, 'fixo', FALSE, FALSE, 9),
  ('cln-deep-t4',       'limpeza', 'cln_profunda',   'Limpeza profunda T4+',               179.91, 199.90, 'fixo', FALSE, FALSE, 10),
  -- Têxteis
  ('cln-sofa-2',        'limpeza', 'cln_texteis',    'Limpeza de sofá 2 lugares',          49.41,  54.90,  'fixo', FALSE, FALSE, 11),
  ('cln-sofa-3',        'limpeza', 'cln_texteis',    'Limpeza de sofá 3 lugares',          62.91,  69.90,  'fixo', FALSE, FALSE, 12),
  ('cln-sofa-L',        'limpeza', 'cln_texteis',    'Limpeza de sofá em L/chaise',        89.91,  99.90,  'fixo', FALSE, FALSE, 13),
  ('cln-mattress-s',    'limpeza', 'cln_texteis',    'Higienização de colchão solteiro',   26.91,  29.90,  'fixo', FALSE, FALSE, 14),
  ('cln-mattress-d',    'limpeza', 'cln_texteis',    'Higienização de colchão casal',      35.91,  39.90,  'fixo', FALSE, FALSE, 15),
  ('cln-carpet',        'limpeza', 'cln_texteis',    'Limpeza de tapete (por m²)',         8.91,   9.90,   'fixo', FALSE, FALSE, 16),
  ('cln-curtains',      'limpeza', 'cln_texteis',    'Limpeza de cortinados',              31.41,  34.90,  'fixo', FALSE, FALSE, 17),
  -- Superfícies
  ('cln-windows',       'limpeza', 'cln_superficies','Limpeza de vidros e janelas',        35.91,  39.90,  'fixo', FALSE, FALSE, 18),
  ('cln-oven',          'limpeza', 'cln_superficies','Limpeza profunda de forno',          26.91,  29.90,  'fixo', FALSE, FALSE, 19),
  ('cln-fridge',        'limpeza', 'cln_superficies','Limpeza profunda de frigorífico',    22.41,  24.90,  'fixo', FALSE, FALSE, 20),
  ('cln-tiles',         'limpeza', 'cln_superficies','Limpeza de azulejos e juntas',       40.41,  44.90,  'fixo', FALSE, FALSE, 21),
  ('cln-bathroom-deep', 'limpeza', 'cln_superficies','Higienização profunda de casa de banho', 29.61, 32.90, 'fixo', FALSE, TRUE, 22),
  -- Pós-obra (Limpeza contém esta subcategoria para limpeza pós-renovação ligeira)
  ('cln-post-work-t1',  'limpeza', 'cln_pos_obra',   'Limpeza pós-obra T0/T1 (ligeira)',   134.91, 149.90, 'fixo', FALSE, FALSE, 23),
  ('cln-post-work-t2',  'limpeza', 'cln_pos_obra',   'Limpeza pós-obra T2 (ligeira)',      179.91, 199.90, 'fixo', FALSE, FALSE, 24)
ON CONFLICT (id) DO UPDATE SET
  nome           = EXCLUDED.nome,
  preco          = EXCLUDED.preco,
  preco_original = EXCLUDED.preco_original,
  popular        = EXCLUDED.popular,
  eco            = EXCLUDED.eco,
  ordem          = EXCLUDED.ordem,
  updated_at     = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- 5. MANUTENÇÃO — 20 serviços
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, urgent, ordem) VALUES
  -- Montagem
  ('mnt-furniture',     'manutencao', 'mnt_montagem',  'Montagem de mobiliário (1 peça)',       35.91,  39.90, 'fixo', TRUE,  FALSE, FALSE, 1),
  ('mnt-bed',           'manutencao', 'mnt_montagem',  'Montagem de cama',                      44.91,  49.90, 'fixo', FALSE, FALSE, FALSE, 2),
  ('mnt-wardrobe',      'manutencao', 'mnt_montagem',  'Montagem de guarda-roupa',              62.91,  69.90, 'fixo', FALSE, FALSE, FALSE, 3),
  ('mnt-table-chairs',  'manutencao', 'mnt_montagem',  'Montagem de mesa e cadeiras',           26.91,  29.90, 'fixo', FALSE, FALSE, FALSE, 4),
  -- Fixação
  ('mnt-tv-55',         'manutencao', 'mnt_fixacao',   'Fixar TV na parede (até 55")',          44.91,  49.90, 'fixo', TRUE,  FALSE, FALSE, 5),
  ('mnt-tv-big',        'manutencao', 'mnt_fixacao',   'Fixar TV na parede (55"+)',             62.91,  69.90, 'fixo', FALSE, FALSE, FALSE, 6),
  ('mnt-shelf',         'manutencao', 'mnt_fixacao',   'Furar parede e fixar prateleira',       22.41,  24.90, 'fixo', FALSE, FALSE, FALSE, 7),
  ('mnt-frames',        'manutencao', 'mnt_fixacao',   'Pendurar quadros ou espelhos',          17.91,  19.90, 'fixo', FALSE, FALSE, FALSE, 8),
  ('mnt-curtains',      'manutencao', 'mnt_fixacao',   'Instalar cortinados e varões',          31.41,  34.90, 'fixo', FALSE, FALSE, FALSE, 9),
  ('mnt-blinds-mount',  'manutencao', 'mnt_fixacao',   'Montar estores ou persianas',           44.91,  49.90, 'fixo', FALSE, FALSE, FALSE, 10),
  -- Reparação
  ('mnt-blinds-manual', 'manutencao', 'mnt_reparacao', 'Reparar estores manuais',               35.55,  39.50, 'fixo', FALSE, FALSE, FALSE, 11),
  ('mnt-blinds-elec',   'manutencao', 'mnt_reparacao', 'Reparar estores elétricos',             53.91,  59.90, 'fixo', FALSE, FALSE, FALSE, 12),
  ('mnt-lock-replace',  'manutencao', 'mnt_reparacao', 'Substituir fechadura',                  44.91,  49.90, 'fixo', FALSE, FALSE, FALSE, 13),
  ('mnt-lock-urgent',   'manutencao', 'mnt_reparacao', 'Abertura de fechadura (urgência)',      80.91,  89.90, 'fixo', FALSE, FALSE, TRUE,  14),
  ('mnt-window',        'manutencao', 'mnt_reparacao', 'Reparar janela (vidro ou caixilho)',    49.41,  54.90, 'fixo', FALSE, FALSE, FALSE, 15),
  ('mnt-drawer',        'manutencao', 'mnt_reparacao', 'Reparar gaveta ou corrediças',          26.91,  29.90, 'fixo', FALSE, FALSE, FALSE, 16),
  -- Ajustes
  ('mnt-door-adjust',   'manutencao', 'mnt_ajustes',   'Ajustar porta (encosto e alinhamento)', 22.41,  24.90, 'fixo', FALSE, FALSE, FALSE, 17),
  ('mnt-hinges',        'manutencao', 'mnt_ajustes',   'Ajustar ou substituir dobradiças',      17.91,  19.90, 'fixo', FALSE, FALSE, FALSE, 18),
  ('mnt-silicone',      'manutencao', 'mnt_ajustes',   'Aplicar silicone (cozinha ou WC)',      31.41,  34.90, 'fixo', FALSE, FALSE, FALSE, 19),
  ('mnt-sink-seal',     'manutencao', 'mnt_ajustes',   'Selar pia ou lavatório',                22.41,  24.90, 'fixo', FALSE, FALSE, FALSE, 20)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, eco = EXCLUDED.eco, urgent = EXCLUDED.urgent,
  ordem = EXCLUDED.ordem, updated_at = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- 6. JARDIM — 16 serviços
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  -- Corte e manutenção
  ('jar-mow-s',         'jardim', 'jar_corte',      'Corte de relva até 100m²',           26.91,  29.90,  'fixo', TRUE,  FALSE, 1),
  ('jar-mow-m',         'jardim', 'jar_corte',      'Corte de relva 100-300m²',           44.91,  49.90,  'fixo', FALSE, FALSE, 2),
  ('jar-mow-l',         'jardim', 'jar_corte',      'Corte de relva 300m²+',              71.91,  79.90,  'fixo', FALSE, FALSE, 3),
  ('jar-maint-s',       'jardim', 'jar_corte',      'Manutenção mensal jardim pequeno',   53.91,  59.90,  'fixo', FALSE, FALSE, 4),
  ('jar-maint-m',       'jardim', 'jar_corte',      'Manutenção mensal jardim médio',     80.91,  89.90,  'fixo', TRUE,  FALSE, 5),
  ('jar-maint-l',       'jardim', 'jar_corte',      'Manutenção mensal jardim grande',    125.91, 139.90, 'fixo', FALSE, FALSE, 6),
  ('jar-scarify',       'jardim', 'jar_corte',      'Escarificação de relva',             53.91,  59.90,  'fixo', FALSE, FALSE, 7),
  -- Poda
  ('jar-prune-s',       'jardim', 'jar_poda',       'Poda de árvore pequena (até 3m)',    35.91,  39.90,  'fixo', FALSE, FALSE, 8),
  ('jar-prune-m',       'jardim', 'jar_poda',       'Poda de árvore média (3-6m)',        80.91,  89.90,  'fixo', FALSE, FALSE, 9),
  ('jar-hedge-prune',   'jardim', 'jar_poda',       'Poda de sebe (por metro linear)',    8.01,   8.90,   'fixo', FALSE, FALSE, 10),
  ('jar-weed',          'jardim', 'jar_poda',       'Arranque de ervas daninhas',         31.41,  34.90,  'fixo', FALSE, FALSE, 11),
  -- Plantação
  ('jar-hedge-plant',   'jardim', 'jar_plantacao',  'Plantação de sebes (por metro)',     13.41,  14.90,  'fixo', FALSE, FALSE, 12),
  ('jar-lawn-new',      'jardim', 'jar_plantacao',  'Plantação de relva nova (por m²)',   7.11,   7.90,   'fixo', FALSE, FALSE, 13),
  ('jar-autumn',        'jardim', 'jar_plantacao',  'Preparação de outono (limpeza e fertilização)', 71.91, 79.90, 'fixo', FALSE, TRUE, 14),
  -- Rega
  ('jar-irrig-install', 'jardim', 'jar_rega',       'Instalar rega automática',           224.91, 249.90, 'fixo', FALSE, TRUE,  15),
  ('jar-irrig-repair',  'jardim', 'jar_rega',       'Reparação de sistema de rega',       40.41,  44.90,  'fixo', FALSE, FALSE, 16)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, eco = EXCLUDED.eco, ordem = EXCLUDED.ordem, updated_at = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- 7. PISCINA — 13 serviços
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  -- Químico
  ('pol-chem-basic',    'piscina', 'pol_quimico',    'Tratamento químico básico',           35.91,  39.90,  'fixo', FALSE, FALSE, 1),
  ('pol-chem-full',     'piscina', 'pol_quimico',    'Tratamento químico completo',         53.91,  59.90,  'fixo', FALSE, FALSE, 2),
  -- Manutenção
  ('pol-maint-s',       'piscina', 'pol_manutencao', 'Manutenção mensal piscina pequena',   62.91,  69.90,  'fixo', FALSE, FALSE, 3),
  ('pol-maint-m',       'piscina', 'pol_manutencao', 'Manutenção mensal piscina média',     80.91,  89.90,  'fixo', TRUE,  FALSE, 4),
  ('pol-maint-l',       'piscina', 'pol_manutencao', 'Manutenção mensal piscina grande',    107.91, 119.90, 'fixo', FALSE, FALSE, 5),
  ('pol-filter-clean',  'piscina', 'pol_manutencao', 'Limpeza de filtros',                  31.41,  34.90,  'fixo', FALSE, FALSE, 6),
  ('pol-vacuum',        'piscina', 'pol_manutencao', 'Aspiração completa',                  40.41,  44.90,  'fixo', FALSE, FALSE, 7),
  -- Reparação
  ('pol-leak-repair',   'piscina', 'pol_reparacao',  'Reparação de fuga',                   80.91,  89.90,  'fixo', FALSE, FALSE, 8),
  ('pol-pump-replace',  'piscina', 'pol_reparacao',  'Substituição de bomba',               134.91, 149.90, 'fixo', FALSE, FALSE, 9),
  ('pol-filter-replace','piscina', 'pol_reparacao',  'Substituição de filtro',              71.91,  79.90,  'fixo', FALSE, FALSE, 10),
  -- Época
  ('pol-open',          'piscina', 'pol_epoca',      'Abertura de época',                   116.91, 129.90, 'fixo', TRUE,  FALSE, 11),
  ('pol-close',         'piscina', 'pol_epoca',      'Fecho de época (inverno)',            80.91,  89.90,  'fixo', FALSE, FALSE, 12),
  ('pol-cover',         'piscina', 'pol_epoca',      'Instalação de cobertura',             53.91,  59.90,  'fixo', FALSE, FALSE, 13)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, eco = EXCLUDED.eco, ordem = EXCLUDED.ordem, updated_at = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- 8. PINTURA — 15 serviços
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  -- Interior
  ('pnt-room-s',        'pintura', 'pnt_interior',   'Pintura de quarto pequeno (até 12m²)', 116.91, 129.90, 'fixo', FALSE, FALSE, 1),
  ('pnt-room-m',        'pintura', 'pnt_interior',   'Pintura de quarto médio (12-20m²)',    152.91, 169.90, 'fixo', FALSE, FALSE, 2),
  ('pnt-living-s',      'pintura', 'pnt_interior',   'Pintura de sala (até 20m²)',           161.91, 179.90, 'fixo', FALSE, FALSE, 3),
  ('pnt-living-l',      'pintura', 'pnt_interior',   'Pintura de sala (20-35m²)',            224.91, 249.90, 'fixo', FALSE, FALSE, 4),
  ('pnt-apt-t1',        'pintura', 'pnt_interior',   'Pintura completa T1',                  494.91, 549.90, 'fixo', FALSE, FALSE, 5),
  ('pnt-apt-t2',        'pintura', 'pnt_interior',   'Pintura completa T2',                  674.91, 749.90, 'fixo', TRUE,  FALSE, 6),
  ('pnt-apt-t3',        'pintura', 'pnt_interior',   'Pintura completa T3',                  854.91, 949.90, 'fixo', FALSE, FALSE, 7),
  -- Exterior
  ('pnt-facade-m2',     'pintura', 'pnt_exterior',   'Pintura de fachada (por m²)',          11.61,  12.90,  'fixo', FALSE, FALSE, 8),
  ('pnt-door',          'pintura', 'pnt_exterior',   'Pintura de porta',                     44.91,  49.90,  'fixo', FALSE, FALSE, 9),
  ('pnt-window',        'pintura', 'pnt_exterior',   'Pintura de janela (caixilho)',         35.91,  39.90,  'fixo', FALSE, FALSE, 10),
  -- Preparação
  ('pnt-cracks',        'pintura', 'pnt_preparacao', 'Reparação de fissuras (até 2m)',       40.41,  44.90,  'fixo', FALSE, FALSE, 11),
  ('pnt-radiator',      'pintura', 'pnt_preparacao', 'Pintura de radiador',                  26.91,  29.90,  'fixo', FALSE, FALSE, 12),
  -- Especial
  ('pnt-varnish',       'pintura', 'pnt_especial',   'Verniz de móveis',                     62.91,  69.90,  'fixo', FALSE, FALSE, 13),
  ('pnt-stucco-m2',     'pintura', 'pnt_especial',   'Estuque decorativo (por m²)',          17.01,  18.90,  'fixo', FALSE, FALSE, 14),
  ('pnt-anti-damp',     'pintura', 'pnt_especial',   'Tinta anti-humidade (por m²)',         13.41,  14.90,  'fixo', FALSE, TRUE,  15)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, eco = EXCLUDED.eco, ordem = EXCLUDED.ordem, updated_at = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- 9. ELÉTRICA — 16 serviços
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, urgent, ordem) VALUES
  -- Pontos
  ('elc-outlet-replace','eletrica', 'elc_pontos',     'Substituir tomada',                   22.41,  24.90,  'fixo', FALSE, FALSE, FALSE, 1),
  ('elc-switch-replace','eletrica', 'elc_pontos',     'Substituir interruptor',              22.41,  24.90,  'fixo', FALSE, FALSE, FALSE, 2),
  ('elc-outlet-new',    'eletrica', 'elc_pontos',     'Instalar nova tomada (c/ roço)',      49.41,  54.90,  'fixo', FALSE, FALSE, FALSE, 3),
  -- Iluminação
  ('elc-light-point',   'eletrica', 'elc_iluminacao', 'Instalar ponto de luz',               40.41,  44.90,  'fixo', FALSE, FALSE, FALSE, 4),
  ('elc-ceiling-light', 'eletrica', 'elc_iluminacao', 'Instalar candeeiro ou lustre',        31.41,  34.90,  'fixo', FALSE, FALSE, FALSE, 5),
  ('elc-spots',         'eletrica', 'elc_iluminacao', 'Instalar spots embutidos (cada)',     22.41,  24.90,  'fixo', FALSE, FALSE, FALSE, 6),
  ('elc-fan-ceiling',   'eletrica', 'elc_iluminacao', 'Instalar ventoinha de teto',          62.91,  69.90,  'fixo', FALSE, FALSE, FALSE, 7),
  ('elc-outdoor-light', 'eletrica', 'elc_iluminacao', 'Instalação de luz exterior',          58.41,  64.90,  'fixo', FALSE, FALSE, FALSE, 8),
  ('elc-led-retrofit',  'eletrica', 'elc_iluminacao', 'Substituir halogéneos por LED',       29.90,  35.90,  'fixo', FALSE, TRUE,  FALSE, 9),
  -- Quadro
  ('elc-board-new',     'eletrica', 'elc_quadro',     'Substituir quadro elétrico',          224.91, 249.90, 'fixo', FALSE, FALSE, FALSE, 10),
  ('elc-board-repair',  'eletrica', 'elc_quadro',     'Reparação de quadro elétrico',        57.15,  63.50,  'fixo', TRUE,  FALSE, FALSE, 11),
  -- Diagnóstico
  ('elc-diag',          'eletrica', 'elc_diag',       'Diagnóstico de falha elétrica',       44.91,  49.90,  'fixo', FALSE, FALSE, FALSE, 12),
  ('elc-extractor',     'eletrica', 'elc_diag',       'Instalar extrator de casa de banho',  49.41,  54.90,  'fixo', FALSE, FALSE, FALSE, 13),
  ('elc-bell',          'eletrica', 'elc_diag',       'Instalar campainha',                  35.91,  39.90,  'fixo', FALSE, FALSE, FALSE, 14),
  ('elc-appliance',     'eletrica', 'elc_diag',       'Ligação de eletrodoméstico',          40.41,  44.90,  'fixo', FALSE, FALSE, FALSE, 15),
  ('elc-certificate',   'eletrica', 'elc_diag',       'Certificado elétrico (para venda)',   89.91,  99.90,  'fixo', FALSE, FALSE, FALSE, 16)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, eco = EXCLUDED.eco, urgent = EXCLUDED.urgent,
  ordem = EXCLUDED.ordem, updated_at = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- 10. PÓS-OBRA — 11 serviços
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  -- Limpeza
  ('pos-clean-t1',     'pos_obra', 'pos_limpeza',    'Limpeza pós-obra T0/T1',              134.91, 149.90, 'fixo', FALSE, FALSE, 1),
  ('pos-clean-t2',     'pos_obra', 'pos_limpeza',    'Limpeza pós-obra T2',                 179.91, 199.90, 'fixo', TRUE,  FALSE, 2),
  ('pos-clean-t3',     'pos_obra', 'pos_limpeza',    'Limpeza pós-obra T3',                 233.91, 259.90, 'fixo', FALSE, FALSE, 3),
  ('pos-clean-t4',     'pos_obra', 'pos_limpeza',    'Limpeza pós-obra T4+',                296.91, 329.90, 'fixo', FALSE, FALSE, 4),
  ('pos-clean-comm',   'pos_obra', 'pos_limpeza',    'Limpeza pós-obra comercial (m²)',     4.41,   4.90,   'fixo', FALSE, FALSE, 5),
  ('pos-windows',      'pos_obra', 'pos_limpeza',    'Limpeza de vidros pós-obra',          53.91,  59.90,  'fixo', FALSE, FALSE, 6),
  -- Entulho
  ('pos-debris-s',     'pos_obra', 'pos_entulho',    'Remoção de entulho pequeno (< 1m³)',  80.91,  89.90,  'fixo', FALSE, FALSE, 7),
  ('pos-debris-m',     'pos_obra', 'pos_entulho',    'Remoção de entulho médio (1-3m³)',    134.91, 149.90, 'fixo', FALSE, FALSE, 8),
  -- Acabamentos
  ('pos-protect-floor','pos_obra', 'pos_acabamento', 'Proteção de pavimento (por m²)',      3.51,   3.90,   'fixo', FALSE, FALSE, 9),
  ('pos-paint-touch',  'pos_obra', 'pos_acabamento', 'Retoques de pintura pós-obra',        80.91,  89.90,  'fixo', FALSE, FALSE, 10),
  ('pos-silicone',     'pos_obra', 'pos_acabamento', 'Acabamento de silicones e vedantes',  40.41,  44.90,  'fixo', FALSE, FALSE, 11)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, eco = EXCLUDED.eco, ordem = EXCLUDED.ordem, updated_at = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- ═════════════════════════════════════════════════════════════════════
-- 11. CANALIZAÇÃO — 30 serviços (IDs originais estilo OSCAR)
-- ═════════════════════════════════════════════════════════════════════
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  -- Autoclismo e sanita
  ('auto-repair',      'canalizacao', 'can_autoclismo',      'Reparação de autoclismo',              36.46,   42.90, 'fixo', TRUE,  FALSE,  1),
  ('auto-install',     'canalizacao', 'can_autoclismo',      'Instalação de autoclismo',             30.43,   32.90, 'fixo', FALSE, FALSE,  2),
  ('seat-repair',      'canalizacao', 'can_autoclismo',      'Reparar tampo de sanita',              27.65,   29.90, 'fixo', FALSE, FALSE,  3),
  ('seat-replace',     'canalizacao', 'can_autoclismo',      'Substituir tampo de sanita',           29.25,   32.50, 'fixo', FALSE, FALSE,  4),
  ('toilet-replace',   'canalizacao', 'can_autoclismo',      'Substituir sanita',                    79.11,   87.90, 'fixo', FALSE, FALSE,  5),
  ('toilet-install',   'canalizacao', 'can_autoclismo',      'Instalar sanita',                      57.15,   63.50, 'fixo', FALSE, FALSE,  6),
  ('toilet-remove',    'canalizacao', 'can_autoclismo',      'Remover sanita',                       57.15,   63.50, 'fixo', FALSE, FALSE,  7),
  ('toilet-unclog',    'canalizacao', 'can_autoclismo',      'Desentupir sanita',                   105.75,  117.50, 'fixo', FALSE, FALSE,  8),
  -- Torneiras
  ('bath-tap-repair',  'canalizacao', 'can_torneiras',       'Reparar torneira de casa de banho',    35.55,   39.50, 'fixo', FALSE, FALSE,  9),
  ('sink-tap-repair',  'canalizacao', 'can_torneiras',       'Reparar torneira de lava-loiça',       35.55,   39.50, 'fixo', FALSE, FALSE, 10),
  ('sink-tap-replace', 'canalizacao', 'can_torneiras',       'Substituir torneira de lavatório',     29.61,   32.90, 'fixo', FALSE, FALSE, 11),
  ('kitchen-tap-eff',  'canalizacao', 'can_torneiras',       'Substituir torneira de lava-loiça (Eficiência energética)',  39.15,   43.50, 'fixo', FALSE, TRUE,  12),
  ('bath-tap-eff',     'canalizacao', 'can_torneiras',       'Substituir torneira de casa de banho (Eficiência energética)',35.55,   39.50, 'fixo', FALSE, TRUE,  13),
  ('safety-tap',       'canalizacao', 'can_torneiras',       'Substituir torneira de segurança',     18.40,   19.90, 'fixo', FALSE, FALSE, 14),
  ('bath-tap-install', 'canalizacao', 'can_torneiras',       'Instalar torneira de banheira',        35.55,   39.50, 'fixo', FALSE, FALSE, 15),
  -- Fugas
  ('leak-diagnosis',   'canalizacao', 'can_fugas',           'Diagnóstico de fuga de água',          35.55,   39.50, 'fixo', FALSE, FALSE, 16),
  ('kitchen-leak',     'canalizacao', 'can_fugas',           'Fuga de água no lava-loiça',           42.21,   46.90, 'fixo', TRUE,  FALSE, 17),
  ('sink-leak',        'canalizacao', 'can_fugas',           'Fuga de água no lavatório',            40.37,   42.50, 'fixo', FALSE, FALSE, 18),
  ('shower-leak',      'canalizacao', 'can_fugas',           'Reparar cabine de duche (Fuga de água)',207.18, 212.50, 'fixo', FALSE, FALSE, 19),
  -- Desentupimentos
  ('kitchen-unclog',   'canalizacao', 'can_desentupimentos', 'Desentupir lava-loiça',                70.97,   83.50, 'fixo', FALSE, FALSE, 20),
  ('bathroom-unclog',  'canalizacao', 'can_desentupimentos', 'Desentupir casa de banho',             83.25,   92.50, 'fixo', FALSE, FALSE, 21),
  -- Lavatório
  ('valve-replace',    'canalizacao', 'can_lavatorio',       'Substituir válvula de lavatório',      33.15,   34.90, 'fixo', FALSE, FALSE, 22),
  ('vanity-replace',   'canalizacao', 'can_lavatorio',       'Substituir móvel de lavatório',        82.35,   91.50, 'fixo', FALSE, FALSE, 23),
  ('vanity-install',   'canalizacao', 'can_lavatorio',       'Instalar móvel de lavatório',          53.01,   58.90, 'fixo', FALSE, FALSE, 24),
  -- Duche e banheira
  ('shower-column',    'canalizacao', 'can_duche',           'Substituir coluna de duche',           43.11,   47.90, 'fixo', FALSE, FALSE, 25),
  ('shower-head-eff',  'canalizacao', 'can_duche',           'Substituir chuveiro (Eficiência energética)', 35.01, 38.90, 'fixo', FALSE, TRUE,  26),
  ('shower-cabin',     'canalizacao', 'can_duche',           'Substituir cabine de duche',          227.66,  233.50, 'fixo', FALSE, FALSE, 27),
  ('tub-to-shower',    'canalizacao', 'can_duche',           'Substituir banheira por duche',      2084.50,    NULL, 'fixo', FALSE, FALSE, 28),
  -- Manutenção
  ('grout-replace',    'canalizacao', 'can_manutencao',      'Substituir juntas de azulejos',        35.64,   41.93, 'fixo', FALSE, FALSE, 29)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, eco = EXCLUDED.eco, ordem = EXCLUDED.ordem, updated_at = NOW();

-- ═════════════════════════════════════════════════════════════════════
-- 12. SEED DE DETALHE RICO (tagline, inclui, não inclui, FAQ, duração)
-- Para 8 serviços P1 — um por categoria. Os restantes podem ser
-- enriquecidos depois pelo admin ou em próximas migrações.
-- ═════════════════════════════════════════════════════════════════════

-- Limpeza P1 — Limpeza doméstica T2
UPDATE servicos SET
  tagline    = 'Limpeza regular completa da sua casa, pelo seu técnico de confiança.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Limpeza e aspiração de pavimentos", "Desinfeção de superfícies e sanitários", "Remoção do pó em todas as divisões", "Troca de camas e sacos de lixo", "Limpeza exterior de mobiliário", "Garantia de qualidade — se não ficar satisfeito, voltamos sem custo"]'::jsonb,
  nao_inclui = '["Lavar loiça", "Engomadoria e roupa", "Limpeza de vidros (ver serviço dedicado)", "Limpeza de sofás (ver serviço dedicado)", "Limpeza de forno ou frigorífico (serviços separados)"]'::jsonb,
  faq        = '[{"q":"Tenho de fornecer produtos de limpeza?","a":"Não — o técnico traz todos os produtos e materiais necessários."},{"q":"Posso agendar limpeza mensal?","a":"Sim — tem uma subscrição mensal com desconto e o mesmo técnico sempre."},{"q":"E se algo partir durante a limpeza?","a":"Todos os serviços estão segurados. Reportamos e reembolsamos, sem burocracia."}]'::jsonb
WHERE id = 'cln-home-t2';

-- Manutenção P1 — Montagem de mobiliário
UPDATE servicos SET
  tagline    = 'Montagem profissional de mobiliário IKEA, Conforama, ou outra — o seu mobiliário pronto em horas.',
  duracao_tipica = '45 min - 1h30',
  inclui     = '["Desembalagem e verificação de peças", "Montagem completa conforme manual", "Fixação à parede se aplicável (seguro anti-tombo)", "Limpeza e remoção do cartão", "Teste de estabilidade e funcionamento", "Garantia de 90 dias sobre a montagem"]'::jsonb,
  nao_inclui = '["Levar os móveis para o andar (ver serviço de mudanças)", "Furar paredes fora do indicado no manual", "Transformações ou adaptações à medida", "Remoção de mobiliário antigo"]'::jsonb,
  faq        = '[{"q":"Preciso de ter as ferramentas?","a":"Não — o técnico traz todas as ferramentas necessárias."},{"q":"E se faltar uma peça?","a":"Reportamos imediatamente e ajudamos no contacto com a loja. Se for rápido, fazemos segunda visita sem custo da mão-de-obra."},{"q":"Montam mobiliário de qualquer marca?","a":"Sim, qualquer marca ou modelo desde que venha com manual e peças completas."}]'::jsonb
WHERE id = 'mnt-furniture';

-- Jardim P1 — Corte de relva pequena
UPDATE servicos SET
  tagline    = 'Corte de relva rápido e profissional, com máquina profissional e remoção do material cortado.',
  duracao_tipica = '30 min - 1h',
  inclui     = '["Corte uniforme de relva com máquina profissional", "Aparar cantos e bordas", "Remoção do material cortado (saco ou montão)", "Limpeza da zona no fim", "Combustível e equipamento incluídos"]'::jsonb,
  nao_inclui = '["Escarificação (ver serviço separado)", "Remoção de ervas daninhas profundas", "Poda de árvores ou sebes", "Tratamento químico anti-musgo"]'::jsonb,
  faq        = '[{"q":"O técnico traz a máquina?","a":"Sim. Traz máquina, combustível, aparador de cantos e ferramenta completa."},{"q":"Que frequência é recomendada?","a":"Na primavera/verão, a cada 10-15 dias. No outono/inverno, a cada 3-4 semanas."},{"q":"E se chover?","a":"Reagendamos automaticamente sem custo. Relva molhada corta-se mal e danifica a máquina."}]'::jsonb
WHERE id = 'jar-mow-s';

-- Piscina P1 — Manutenção mensal média
UPDATE servicos SET
  tagline    = 'Manutenção mensal completa para a sua piscina estar sempre pronta para mergulhar.',
  duracao_tipica = '1h - 1h30 por visita',
  inclui     = '["4 visitas por mês", "Análise e correção química (pH, cloro, alcalinidade)", "Aspiração do fundo", "Limpeza da linha de água e cestos", "Retrolavagem do filtro", "Verificação de bomba e equipamentos", "Produtos químicos básicos incluídos"]'::jsonb,
  nao_inclui = '["Reparações de equipamento avariado (orçamento separado)", "Substituição de peças (cobertas por garantia se aplicável)", "Tratamento de choque após festa ou tempestade (custo adicional)"]'::jsonb,
  faq        = '[{"q":"Se houver tempestade, vêm limpar extra?","a":"Sim. Emergências climáticas têm visita de recuperação com desconto."},{"q":"Preciso de estar em casa?","a":"Não necessariamente — combinamos acesso ao exterior e trabalhamos com autonomia."},{"q":"Posso mudar de técnico?","a":"Sim. Queremos sempre o mesmo técnico para conhecer a sua piscina, mas respeitamos o seu pedido."}]'::jsonb
WHERE id = 'pol-maint-m';

-- Pintura P1 — Apartamento T2 completo
UPDATE servicos SET
  tagline    = 'Pintura completa de apartamento T2 com preparação, 2 demãos e acabamento profissional.',
  duracao_tipica = '3 a 5 dias úteis',
  inclui     = '["Proteção de móveis, pavimentos e rodapés", "Lixagem e preparação de paredes", "Betumagem de buracos pequenos e fissuras ligeiras", "Primário e 2 demãos de tinta branca ou cor clara standard", "Limpeza completa no fim", "Garantia de 90 dias sobre a mão-de-obra"]'::jsonb,
  nao_inclui = '["Tinta de cor especial, velatura ou efeitos (orçamento separado)", "Reparação de fissuras estruturais maiores que 2mm", "Pintura de tectos com barrotes à vista", "Remoção de papel de parede ou azulejos"]'::jsonb,
  faq        = '[{"q":"Que cor está incluída?","a":"Branco ou cor clara standard. Cores específicas ou marcas premium ficam orçamentadas antes."},{"q":"Preciso de sair de casa?","a":"Não — trabalhamos divisão a divisão e combinamos os quartos usados com o residente."},{"q":"A tinta tem certificação ambiental?","a":"Usamos tintas de baixo VOC de marcas reconhecidas. Sob pedido, podemos usar tintas 100% biológicas (custo adicional)."}]'::jsonb
WHERE id = 'pnt-apt-t2';

-- Elétrica P1 — Reparação de quadro
UPDATE servicos SET
  tagline    = 'Reparação de avarias no quadro elétrico por técnico certificado, com teste e relatório.',
  duracao_tipica = '45 min - 1h30',
  inclui     = '["Diagnóstico completo do quadro", "Substituição de disjuntor ou diferencial avariado", "Verificação de ligações e apertos", "Teste de continuidade e isolamento", "Relatório fotográfico do estado", "Garantia de 90 dias sobre a intervenção"]'::jsonb,
  nao_inclui = '["Substituição total do quadro (ver serviço dedicado)", "Certificado elétrico para venda (serviço separado)", "Reparação de instalação escondida na parede", "Ligação de contadores EDP"]'::jsonb,
  faq        = '[{"q":"Cortam a eletricidade durante o serviço?","a":"Sim, por segurança — normalmente por 20-40 minutos. Avisamos antes para desligar equipamentos sensíveis."},{"q":"O técnico é certificado?","a":"Sim. Todos os nossos electricistas têm carteira profissional CTI válida."},{"q":"Emitem fatura para deduzir?","a":"Sim, faturamos com NIF e os serviços de eletricidade são dedutíveis no IRS (dentro dos limites)."}]'::jsonb
WHERE id = 'elc-board-repair';

-- Canalização P1 — Reparação de autoclismo
UPDATE servicos SET
  tagline    = 'Solução rápida e definitiva para autoclismos que correm, não enchem ou não descarregam bem.',
  duracao_tipica = '30 min - 1h',
  inclui     = '["Diagnóstico do problema", "Substituição de boia, torneira de enchimento ou válvula de descarga", "Ajuste do mecanismo completo", "Teste de funcionamento (cheio e descarga)", "Garantia de 90 dias sobre a peça substituída e a mão-de-obra"]'::jsonb,
  nao_inclui = '["Substituição integral do autoclismo (ver Instalação de autoclismo)", "Reparação de fissuras na cerâmica da sanita", "Obras na parede ou tubagem escondida (diagnóstico separado)"]'::jsonb,
  faq        = '[{"q":"Que peças incluem?","a":"As peças comuns (boia, torneira de enchimento, válvula) estão incluídas no preço fixo. Peças específicas de marcas premium podem ter custo adicional, sempre confirmado antes."},{"q":"Trazem a peça ou tenho de comprar?","a":"O técnico traz o kit universal que resolve >90% dos casos. Se precisar de peça específica da sua marca, combinamos segunda visita sem custo adicional de deslocação."},{"q":"O autoclismo é muito antigo, vale a pena reparar?","a":"O técnico avalia. Se a reparação for cara ou pouco duradoura, recomenda substituição com orçamento claro antes de avançar."}]'::jsonb
WHERE id = 'auto-repair';

-- Pós-Obra P1 — Limpeza T2
UPDATE servicos SET
  tagline    = 'Limpeza profunda pós-obra de apartamento T2 — removemos poeiras, cimento e resíduos finos.',
  duracao_tipica = '4h - 6h',
  inclui     = '["Aspiração profunda de pavimentos, rodapés e cantos", "Remoção de restos de cimento, tinta e silicone", "Limpeza de vidros, caixilhos e estores", "Desinfeção profunda de casas de banho e cozinha", "Limpeza de interiores de armários", "Produtos industriais adequados a pós-obra incluídos"]'::jsonb,
  nao_inclui = '["Remoção de entulho pesado (ver serviço dedicado)", "Reparação de acabamentos (ver pintura ou canalização)", "Retoques de pintura (ver Retoques pós-obra)"]'::jsonb,
  faq        = '[{"q":"Quantos técnicos vêm?","a":"Para T2 vêm 2 técnicos simultaneamente para acelerar o processo."},{"q":"Precisam de água corrente e electricidade?","a":"Sim. Confirme que está tudo ligado antes da visita."},{"q":"E se faltar limpar algum sítio?","a":"Garantia — reportamos retificação grátis até 48h depois."}]'::jsonb
WHERE id = 'pos-clean-t2';

-- ═════════════════════════════════════════════════════════════════════
-- 13. VERIFICAÇÃO FINAL (correr depois de aplicar)
-- ═════════════════════════════════════════════════════════════════════
-- Expected totals por categoria:
--   limpeza      = 25  (1 personalizado + 24 fixos)
--   manutencao   = 21  (1 personalizado + 20 fixos)
--   jardim       = 17  (1 personalizado + 16 fixos)
--   piscina      = 14  (1 personalizado + 13 fixos)
--   pintura      = 16  (1 personalizado + 15 fixos)
--   eletrica     = 17  (1 personalizado + 16 fixos)
--   canalizacao  = 31  (1 personalizado + 30 fixos)
--   pos_obra     = 12  (1 personalizado + 11 fixos)
--   TOTAL        = 153 serviços (8 personalizados + 145 fixos)
--
-- SELECT
--   c.nome                                              AS categoria,
--   COUNT(s.id)                                         AS total,
--   COUNT(*) FILTER (WHERE s.tipo = 'personalizado')    AS personalizados,
--   COUNT(*) FILTER (WHERE s.popular = TRUE)            AS populares,
--   COUNT(*) FILTER (WHERE s.eco = TRUE)                AS eco,
--   COUNT(*) FILTER (WHERE s.tagline IS NOT NULL)       AS com_detalhe,
--   MIN(s.preco)                                        AS preco_min,
--   MAX(s.preco)                                        AS preco_max
-- FROM categorias c
-- LEFT JOIN servicos s ON s.categoria_id = c.id AND s.activo = TRUE
-- WHERE c.activo = TRUE
-- GROUP BY c.id, c.nome, c.ordem
-- ORDER BY c.ordem;

-- ═════════════════════════════════════════════════════════════════════
-- 14. DETALHE RICO COMPLETO — 153 serviços
-- Cada serviço tem: tagline + duracao_tipica + inclui + nao_inclui + faq
-- Este bloco é idempotente — reexecutar sobreescreve valores existentes.
-- ═════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════
-- DETALHE RICO — LIMPEZA (25 serviços, 24 fixos + 1 personalizado)
-- ═════════════════════════════════════════════════════════════════════

-- Personalizado
UPDATE servicos SET
  tagline    = 'Precisa de uma limpeza que não está no catálogo? Combine connosco.',
  duracao_tipica = 'A combinar (mínimo 1h)',
  inclui     = '["Técnico equipado com todos os produtos e utensílios profissionais","Limpeza exactamente como pedir, adaptada à sua casa","Possibilidade de combinar várias tarefas numa só visita","Facturação ao tempo real trabalhado","Garantia de qualidade — se não ficar satisfeito, voltamos sem custo"]'::jsonb,
  nao_inclui = '["Trabalhos fora do âmbito de limpeza (ver outras categorias)","Produtos especiais que requeiram compra prévia (combinamos antes)"]'::jsonb,
  faq        = '[{"q":"Como funciona o preço por hora?","a":"Paga apenas o tempo real trabalhado. Se terminar mais cedo, paga menos — se precisar de mais, combinamos antes."},{"q":"Posso descrever a tarefa na altura?","a":"Pode, mas recomendamos descrever no formulário com detalhe para enviarmos o técnico certo e os produtos adequados."}]'::jsonb
WHERE id = 'personalizado-cln';

-- cln-home-t1 (T0/T1 regular — P2)
UPDATE servicos SET
  tagline    = 'Limpeza regular completa para apartamento estúdio ou T1, feita em 2-2h30.',
  duracao_tipica = '2h - 2h30',
  inclui     = '["Aspiração e lavagem de pavimentos","Limpeza de pó em todas as superfícies","Desinfeção de casa de banho (sanita, duche/banheira, lavatório)","Limpeza da cozinha (bancada, exterior de electrodomésticos, lava-loiça)","Troca de sacos do lixo e mudança de roupa de cama se preparada"]'::jsonb,
  nao_inclui = '["Lavagem de loiça","Engomadoria","Limpeza de vidros (ver serviço dedicado)","Limpeza de forno, frigorífico ou sofás (serviços separados)"]'::jsonb,
  faq        = '[{"q":"Tenho de fornecer produtos?","a":"Não — o técnico traz tudo o que precisa."},{"q":"Posso tornar recorrente?","a":"Sim — há desconto em packs mensais (ver Limpeza mensal)."}]'::jsonb
WHERE id = 'cln-home-t1';

-- cln-home-t3
UPDATE servicos SET
  tagline    = 'Limpeza regular completa para apartamento T3 com 2-3 casas de banho.',
  duracao_tipica = '3h30 - 4h',
  inclui     = '["Aspiração e lavagem de pavimentos em todas as divisões","Desinfeção completa de até 3 casas de banho","Limpeza de cozinha completa (bancada, exteriores, lava-loiça, micro-ondas por fora)","Remoção de pó em superfícies, mobiliário e rodapés","Troca de sacos e cama se preparada"]'::jsonb,
  nao_inclui = '["Lavagem de loiça","Engomadoria","Limpeza profunda de electrodomésticos","Limpeza de vidros, sofás, estofos (serviços dedicados)"]'::jsonb,
  faq        = '[{"q":"Quantos técnicos vêm?","a":"Normalmente 1 técnico. Para T3 grande com várias casas de banho podemos enviar 2 (custo igual, só mais rápido)."},{"q":"E se tiver animais?","a":"Sem problema — avise no formulário para o técnico trazer produtos adequados."}]'::jsonb
WHERE id = 'cln-home-t3';

-- cln-home-t4
UPDATE servicos SET
  tagline    = 'Limpeza regular para moradia ou apartamento T4+ com equipa rápida e eficiente.',
  duracao_tipica = '4h30 - 5h30',
  inclui     = '["2 técnicos em simultâneo","Aspiração e lavagem de todas as divisões","Desinfeção de até 4 casas de banho","Limpeza completa de cozinha","Remoção de pó em toda a casa","Troca de roupa de cama preparada e sacos do lixo"]'::jsonb,
  nao_inclui = '["Lavagem de loiça e engomadoria","Limpeza de áreas exteriores (terraço, garagem — serviços separados)","Limpezas profundas pontuais (forno, frigorífico)"]'::jsonb,
  faq        = '[{"q":"Quanto tempo demora?","a":"Entre 4h30 e 5h30 com 2 técnicos — combinamos horário de chegada e duração prevista antes."},{"q":"E se tiver mais de 4 casas de banho?","a":"Avise no formulário — pode ser necessário acréscimo pequeno ou 3º técnico."}]'::jsonb
WHERE id = 'cln-home-t4';

-- cln-monthly
UPDATE servicos SET
  tagline    = 'Pack de 4 limpezas mensais T2 com o mesmo técnico — poupa e ganha consistência.',
  duracao_tipica = '4 visitas de 2h30 - 3h',
  inclui     = '["4 visitas de limpeza regular T2 (uma por semana ou quinzenal)","Mesmo técnico em todas as visitas (sempre que possível)","Produtos e utensílios profissionais","10% de desconto face ao preço avulso","Reagendamento flexível até 24h antes"]'::jsonb,
  nao_inclui = '["Limpezas profundas ou de eventos pontuais","Limpeza de vidros, sofás, electrodomésticos (serviços separados)"]'::jsonb,
  faq        = '[{"q":"E se precisar de cancelar uma visita?","a":"Pode reagendar até 24h antes sem custo. Cancelamentos em cima da hora podem ter custo."},{"q":"Posso mudar de técnico se não gostar?","a":"Claro. Basta reportar-nos que ajustamos já na próxima visita."}]'::jsonb
WHERE id = 'cln-monthly';

-- cln-bathroom-deep
UPDATE servicos SET
  tagline    = 'Limpeza profunda de casa de banho — azulejos, juntas, sanita, chuveiro, espelhos.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Desengorduramento e descalcificação de azulejos e juntas","Limpeza profunda de sanita (incluindo difícil acesso)","Limpeza e desinfecção de chuveiro/banheira","Polimento de espelhos e torneiras","Desinfecção final com produto profissional"]'::jsonb,
  nao_inclui = '["Reparação de juntas danificadas (ver Substituir juntas de azulejos)","Aplicação de silicones (ver Acabamento de silicones)","Desentupimentos (ver secção Canalização)"]'::jsonb,
  faq        = '[{"q":"Qual a diferença para a limpeza regular?","a":"Esta é mais profunda, usa produtos específicos para calcário e mofo, e inclui desengorduramento de juntas — recomendada 2-4x/ano."},{"q":"Remove mofo preto?","a":"Sim, nos casos superficiais. Em humidade estrutural recomendamos também o tratamento anti-humidade."}]'::jsonb
WHERE id = 'cln-bathroom-deep';

-- cln-deep-t1
UPDATE servicos SET
  tagline    = 'Limpeza profunda completa para T0/T1 — ideal para mudanças ou renovação.',
  duracao_tipica = '4h - 5h',
  inclui     = '["Tudo da limpeza regular + extras","Interior de armários de cozinha e quartos","Limpeza de azulejos e juntas","Descalcificação de torneiras e chuveiros","Limpeza de estores, rodapés e caixilhos","Interior do micro-ondas e exterior do forno"]'::jsonb,
  nao_inclui = '["Interior do forno ou frigorífico a fundo (serviços separados)","Limpeza de vidros exteriores em altura","Lavagem de estofos e colchões"]'::jsonb,
  faq        = '[{"q":"Com que frequência é necessária?","a":"Recomendada 1-2x por ano, em mudanças, pós-obras ou renovação total."},{"q":"Posso estar em casa durante?","a":"Pode, mas é mais eficaz se a casa estiver livre para o técnico trabalhar sem interrupções."}]'::jsonb
WHERE id = 'cln-deep-t1';

-- cln-deep-t2 (P2 — pedido para detalhe maior)
UPDATE servicos SET
  tagline    = 'Limpeza profunda completa para apartamento T2 — renovação total num só dia.',
  duracao_tipica = '5h - 6h (com 2 técnicos)',
  inclui     = '["2 técnicos em simultâneo para ser rápido","Aspiração e lavagem profunda de pavimentos","Interior de todos os armários (cozinha e roupeiros)","Desengorduramento de fogão, exaustor exterior, bancadas","Limpeza profunda de 2 casas de banho com descalcificação","Azulejos, rodapés, caixilhos, estores e portas","Desinfecção final com produto profissional","Garantia: se ficar algo por limpar, voltamos em 48h"]'::jsonb,
  nao_inclui = '["Interior de forno a fundo e frigorífico (serviços separados)","Lavagem de sofás, colchões, tapetes (ver Têxteis)","Limpeza de vidros exteriores em altura","Paredes pintadas (só limpeza ligeira, não lixagem)"]'::jsonb,
  faq        = '[{"q":"Quando é ideal agendar?","a":"Antes de mudanças, após receber casa nova, antes de receber convidados ou 1-2x/ano para manutenção profunda."},{"q":"Preciso de deixar a casa vazia?","a":"Não obrigatório, mas o trabalho fica melhor com poucos obstáculos — especialmente nos armários."},{"q":"E se descobrir algo por limpar?","a":"Reporte nas primeiras 48h e voltamos gratuitamente para corrigir."}]'::jsonb
WHERE id = 'cln-deep-t2';

-- cln-deep-t3
UPDATE servicos SET
  tagline    = 'Limpeza profunda completa para T3 com 3 casas de banho, dia inteiro de trabalho.',
  duracao_tipica = '6h - 8h (com 2 técnicos)',
  inclui     = '["2-3 técnicos conforme dimensão","Limpeza profunda de todas as divisões","Interior de armários e roupeiros","Desengorduramento de cozinha completa","3 casas de banho com descalcificação","Azulejos, juntas, caixilhos, estores","Desinfecção final profissional"]'::jsonb,
  nao_inclui = '["Forno e frigorífico em profundidade (serviços separados)","Lavagem de estofos e tapetes","Vidros exteriores em altura","Terraços e áreas exteriores"]'::jsonb,
  faq        = '[{"q":"Em quanto tempo fica pronto?","a":"6-8h com equipa de 2-3 técnicos. Podemos dividir em meio-dia se preferir."},{"q":"Ficam produtos no ar depois?","a":"Usamos produtos profissionais com baixo odor. Abrimos janelas no fim e deixamos a casa pronta a habitar."}]'::jsonb
WHERE id = 'cln-deep-t3';

-- cln-deep-t4
UPDATE servicos SET
  tagline    = 'Limpeza profunda completa para moradia ou T4+ — equipa reforçada, dia cheio.',
  duracao_tipica = '8h+ (com 3 técnicos)',
  inclui     = '["3 técnicos em simultâneo","Limpeza profunda de todas as divisões interiores","Interior completo de armários e roupeiros","Cozinha completa com desengorduramento profundo","Até 4 casas de banho com descalcificação","Todas as superfícies (azulejos, caixilhos, estores, rodapés)","Desinfecção final profissional"]'::jsonb,
  nao_inclui = '["Forno e frigorífico a fundo (separados)","Áreas exteriores (terraço, jardim, piscina)","Lavagem de estofos e tapetes","Vidros exteriores em altura (se >2º andar)"]'::jsonb,
  faq        = '[{"q":"Em quantos dias?","a":"Normalmente 1 dia completo com 3 técnicos. Em casos extremos, 2 dias."},{"q":"Antes ou depois da mudança?","a":"Recomendamos depois de retirar os móveis (limpeza pré-entrada) ou antes de mobilar a casa nova."}]'::jsonb
WHERE id = 'cln-deep-t4';

-- cln-sofa-2
UPDATE servicos SET
  tagline    = 'Higienização profunda de sofá de 2 lugares — remove ácaros, odores e manchas.',
  duracao_tipica = '1h',
  inclui     = '["Aspiração profunda de tecido","Aplicação de produto higienizante profissional","Extracção com máquina de injecção-extracção","Tratamento anti-ácaros","Secagem acelerada (2-4h após intervenção)"]'::jsonb,
  nao_inclui = '["Remoção de manchas antigas muito impregnadas (sem garantia total)","Reparação de tecido danificado ou descosido","Sofás em pele (requer tratamento específico)"]'::jsonb,
  faq        = '[{"q":"Quanto tempo até poder usar?","a":"2-4h após a intervenção. Ficar sem uso durante a noite é ideal."},{"q":"Funciona em qualquer tecido?","a":"Funciona em tecidos standard. Para pele ou alcântara, usamos tratamento específico (custo adicional)."}]'::jsonb
WHERE id = 'cln-sofa-2';

-- cln-sofa-L (chaise longue)
UPDATE servicos SET
  tagline    = 'Higienização profunda de sofá com chaise longue — até 4 lugares + apoio.',
  duracao_tipica = '1h30 - 2h',
  inclui     = '["Aspiração profunda do tecido completo","Tratamento higienizante e anti-ácaros","Máquina de injecção-extracção em toda a superfície","Braços, encosto e almofadas removíveis","Secagem acelerada"]'::jsonb,
  nao_inclui = '["Sofás em pele (tratamento específico separado)","Manchas antigas muito impregnadas","Reparação de tecido"]'::jsonb,
  faq        = '[{"q":"Limpam as almofadas por dentro?","a":"Sim, todas as almofadas amovíveis são tratadas separadamente."},{"q":"Ficará cheiro químico?","a":"Usamos produtos com baixo odor. Ventile 1-2h e o cheiro desaparece."}]'::jsonb
WHERE id = 'cln-sofa-L';

-- cln-mattress-s
UPDATE servicos SET
  tagline    = 'Higienização de colchão solteiro — elimina ácaros, suor e odores.',
  duracao_tipica = '45 min',
  inclui     = '["Aspiração profunda anti-ácaros","Tratamento higienizante profissional","Extracção de humidade residual","Tratamento UV opcional"]'::jsonb,
  nao_inclui = '["Remoção de manchas orgânicas antigas (sem garantia total)","Reparação de colchão"]'::jsonb,
  faq        = '[{"q":"Com que frequência?","a":"Recomendada 1x/ano para uso regular, 2x/ano se alergias ou crianças."}]'::jsonb
WHERE id = 'cln-mattress-s';

-- cln-mattress-d
UPDATE servicos SET
  tagline    = 'Higienização de colchão casal — remove alérgenos acumulados ao longo do tempo.',
  duracao_tipica = '1h',
  inclui     = '["Aspiração profunda dos dois lados","Tratamento higienizante e anti-ácaros","Extracção com máquina profissional","Tratamento UV opcional"]'::jsonb,
  nao_inclui = '["Manchas orgânicas antigas (sem garantia total)","Colchões muito danificados"]'::jsonb,
  faq        = '[{"q":"E se tiver memória de forma?","a":"Usamos método adequado para colchões viscoelásticos sem os danificar."}]'::jsonb
WHERE id = 'cln-mattress-d';

-- cln-carpet
UPDATE servicos SET
  tagline    = 'Higienização de tapetes ao m² — ideal para tapetes grandes de sala ou persa.',
  duracao_tipica = '30-45min por m²',
  inclui     = '["Aspiração profunda","Tratamento de manchas localizadas","Injecção-extracção com produto profissional","Secagem acelerada"]'::jsonb,
  nao_inclui = '["Tapetes 100% seda ou materiais delicados","Restauro de franjas","Manchas antigas muito impregnadas"]'::jsonb,
  faq        = '[{"q":"Demora quanto a secar?","a":"4-6h. Idealmente deixe secar durante a noite."}]'::jsonb
WHERE id = 'cln-carpet';

-- cln-curtains
UPDATE servicos SET
  tagline    = 'Limpeza de cortinados in situ — sem desmontar, sem levar para lavandaria.',
  duracao_tipica = '1h',
  inclui     = '["Aspiração completa dos cortinados","Tratamento higienizante profissional","Máquina de vapor profissional","Tratamento de manchas localizadas"]'::jsonb,
  nao_inclui = '["Cortinados que requeiram lavagem a seco (só em lavandaria)","Desmontagem e remontagem de calhas","Cortinados de seda ou materiais delicados"]'::jsonb,
  faq        = '[{"q":"Precisam de os tirar da calha?","a":"Não — fazemos tudo in situ com máquina de vapor."}]'::jsonb
WHERE id = 'cln-curtains';

-- cln-windows
UPDATE servicos SET
  tagline    = 'Limpeza profissional de vidros interior e exterior — por divisão.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Vidros interiores e exteriores","Caixilhos e fechaduras","Estores e parapeitos","Material e produtos incluídos"]'::jsonb,
  nao_inclui = '["Vidros em altura (>2º andar sem varanda) — ver serviço especializado","Reparação de vidros rachados","Limpeza de persianas desmontadas"]'::jsonb,
  faq        = '[{"q":"Fazem em prédios altos?","a":"Até 2º andar sem equipamento especial. Acima disso requer técnico habilitado (consulte)."}]'::jsonb
WHERE id = 'cln-windows';

-- cln-oven
UPDATE servicos SET
  tagline    = 'Limpeza profunda de forno — remove gordura queimada e resíduos antigos.',
  duracao_tipica = '1h',
  inclui     = '["Desmontagem de grelhas e tabuleiros","Desengorduramento profundo (produto profissional)","Limpeza de paredes interiores e porta de vidro","Remontagem e teste de funcionamento"]'::jsonb,
  nao_inclui = '["Reparação de resistência ou avaria eléctrica","Substituição de vidro partido","Fornos pirolíticos (usam sistema próprio)"]'::jsonb,
  faq        = '[{"q":"Remove gordura muito queimada?","a":"Sim, com produto profissional. Casos extremos podem exigir 2 aplicações."}]'::jsonb
WHERE id = 'cln-oven';

-- cln-fridge
UPDATE servicos SET
  tagline    = 'Limpeza profunda de frigorífico — interior higienizado sem odores.',
  duracao_tipica = '45 min',
  inclui     = '["Esvaziamento e arrumação de conteúdo","Limpeza de todas as prateleiras e gavetas","Desinfecção do interior com produto específico","Limpeza de borrachas de vedação","Arrumação final"]'::jsonb,
  nao_inclui = '["Descongelamento profundo de congelador (serviço separado)","Reparação de avaria","Substituição de borrachas"]'::jsonb,
  faq        = '[{"q":"Tenho de esvaziar antes?","a":"Pode esvaziar antes para poupar tempo, ou deixar que fazemos isso."}]'::jsonb
WHERE id = 'cln-fridge';

-- cln-tiles
UPDATE servicos SET
  tagline    = 'Limpeza profunda de azulejos ao m² — remove calcário e mofo das juntas.',
  duracao_tipica = '20-30 min por m²',
  inclui     = '["Aplicação de produto desencrustante","Escovagem mecânica de juntas","Remoção de calcário e mofo superficial","Enxaguamento e polimento"]'::jsonb,
  nao_inclui = '["Substituição de juntas danificadas (ver serviço Substituir juntas)","Reparação de azulejos partidos","Tratamento de humidade estrutural"]'::jsonb,
  faq        = '[{"q":"Funciona para manchas antigas?","a":"Sim na maioria dos casos. Juntas muito velhas podem precisar de substituição."}]'::jsonb
WHERE id = 'cln-tiles';

-- cln-post-work-t1
UPDATE servicos SET
  tagline    = 'Limpeza pós-obra ligeira T1 — quando já retirou pó maior e quer acabamento fino.',
  duracao_tipica = '3h - 4h',
  inclui     = '["Aspiração fina de pavimentos e rodapés","Limpeza de vidros, caixilhos e estores","Remoção de resíduos em azulejos","Desinfecção de casas de banho e cozinha","Produtos adequados a resíduos de obra"]'::jsonb,
  nao_inclui = '["Remoção de entulho (serviço separado)","Resíduos pesados de cimento ou argamassa (ver Limpeza pós-obra completa na categoria Pós-Obra)","Retoques de pintura"]'::jsonb,
  faq        = '[{"q":"Qual a diferença para a Pós-Obra da outra categoria?","a":"Esta é ligeira — para casos onde a obra foi pequena e o grosso já foi retirado. Para obras grandes, ver categoria Pós-Obra."}]'::jsonb
WHERE id = 'cln-post-work-t1';

-- cln-post-work-t2
UPDATE servicos SET
  tagline    = 'Limpeza pós-obra ligeira T2 — para acabamento fino após pequenas obras.',
  duracao_tipica = '4h - 5h',
  inclui     = '["2 técnicos para ser rápido","Aspiração fina de toda a casa","Vidros, caixilhos, estores","Remoção de resíduos em azulejos e rodapés","Desinfecção de casas de banho e cozinha"]'::jsonb,
  nao_inclui = '["Remoção de entulho","Cimento queimado ou argamassa pesada (ver Pós-Obra completa)","Retoques de pintura (ver Pós-Obra)"]'::jsonb,
  faq        = '[{"q":"E se houver muito pó fino?","a":"Usamos aspiradores profissionais com filtro HEPA — apropriado para pó de obra."}]'::jsonb
WHERE id = 'cln-post-work-t2';

-- cln-office-small
UPDATE servicos SET
  tagline    = 'Limpeza de escritório pequeno (até 50m²) — pode ser recorrente ou pontual.',
  duracao_tipica = '1h30 - 2h',
  inclui     = '["Aspiração de pavimentos e tapetes","Limpeza de secretárias e superfícies","Desinfecção de casa de banho","Limpeza da copa/kitchenette","Esvaziamento de sacos do lixo"]'::jsonb,
  nao_inclui = '["Limpeza de equipamento informático por dentro","Limpeza de janelas em altura","Lavagem de estofos de cadeiras"]'::jsonb,
  faq        = '[{"q":"Posso agendar fora de horário?","a":"Sim — noite ou fim-de-semana com acréscimo pequeno."},{"q":"Têm contrato para recorrente?","a":"Sim — descontos significativos em packs mensais ou semanais."}]'::jsonb
WHERE id = 'cln-office-small';


-- ═════════════════════════════════════════════════════════════════════
-- DETALHE RICO — MANUTENÇÃO (21 serviços, 20 fixos + 1 personalizado)
-- ═════════════════════════════════════════════════════════════════════

-- Personalizado
UPDATE servicos SET
  tagline    = 'Várias reparações numa só visita — a forma mais eficiente de pôr a casa a funcionar.',
  duracao_tipica = 'A combinar (mínimo 1h)',
  inclui     = '["Técnico multifunções com ferramenta completa","Combinação de várias tarefas pequenas numa só visita","Diagnóstico e execução no mesmo dia","Facturação ao tempo real trabalhado","Garantia de 90 dias sobre a mão-de-obra"]'::jsonb,
  nao_inclui = '["Peças ou materiais especiais (combinamos antes)","Obra estrutural ou trabalhos que requeiram licenças","Intervenções eléctricas ou canalização complexas (ver categorias)"]'::jsonb,
  faq        = '[{"q":"Posso juntar tarefas de várias áreas?","a":"Sim se forem todas de manutenção ligeira. Para elétrica ou canalização complexa pedimos o especialista certo."},{"q":"Trazem as peças?","a":"Trazemos ferramenta e materiais comuns. Peças específicas ou puxadores/dobradiças de marca avisamos antes para comprar."}]'::jsonb
WHERE id = 'personalizado-mnt';

-- mnt-tv-55 (P2 popular)
UPDATE servicos SET
  tagline    = 'Montagem profissional de TV até 55" na parede com suporte e cabos arrumados.',
  duracao_tipica = '45 min - 1h15',
  inclui     = '["Fixação do suporte à parede (alvenaria ou tijolo)","Montagem da TV no suporte","Gestão e ocultação de cabos à vista (calha até 1,5m)","Teste de funcionamento e ajuste de inclinação","Garantia de 90 dias sobre a fixação"]'::jsonb,
  nao_inclui = '["Fornecimento do suporte (cliente traz — dizemos qual)","Paredes de pladur sem reforço estrutural (consulte antes)","Passagem de cabos dentro da parede","Ligação a sistema de som ou soundbar (pode ser adicional)"]'::jsonb,
  faq        = '[{"q":"Que tipo de suporte preciso?","a":"Basta indicar-nos o modelo da TV. Se não souber qual comprar, recomendamos o universal VESA 400x400 compatível com 99% das TVs até 55\""},{"q":"Funciona em pladur?","a":"Sim se tiver reforço estrutural. Sem reforço, apenas para TVs leves ou com âncoras especiais (consulte antes)."}]'::jsonb
WHERE id = 'mnt-tv-55';

-- mnt-tv-big (>55")
UPDATE servicos SET
  tagline    = 'Montagem de TV de grande formato (>55") — requer 2 técnicos e suporte reforçado.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["2 técnicos para manuseamento seguro","Fixação de suporte reforçado à parede","Montagem e teste","Ocultação de cabos até 1,5m","Garantia de 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento do suporte (cliente traz — VESA conforme modelo)","Passagem de cabos dentro da parede (obra)","Paredes de pladur sem reforço (consulte antes)"]'::jsonb,
  faq        = '[{"q":"TV muito pesada, funciona em qualquer parede?","a":"Em alvenaria ou tijolo, sim. Em pladur, apenas com reforço estrutural — avaliamos no local se necessário."}]'::jsonb
WHERE id = 'mnt-tv-big';

-- mnt-blinds-manual
UPDATE servicos SET
  tagline    = 'Instalação de estore manual de enrolar — janela ou porta de varanda.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Fixação de caixa e guias","Instalação do estore e fita","Teste de funcionamento","Material de fixação standard"]'::jsonb,
  nao_inclui = '["Fornecimento do estore (cliente compra)","Obra na caixa estrutural","Substituição de motor eléctrico (ver Estore eléctrico)"]'::jsonb,
  faq        = '[{"q":"Servem para qualquer janela?","a":"Sim, desde que as medidas estejam correctas. Medimos in situ se tiver dúvida."}]'::jsonb
WHERE id = 'mnt-blinds-manual';

-- mnt-blinds-elec
UPDATE servicos SET
  tagline    = 'Instalação de estore eléctrico com motor — conforto e automação.',
  duracao_tipica = '1h30 - 2h',
  inclui     = '["Fixação da caixa e guias","Montagem do motor e sensor","Ligação eléctrica (até tomada existente)","Programação e teste","Garantia 90 dias sobre mão-de-obra"]'::jsonb,
  nao_inclui = '["Fornecimento do estore e motor (cliente compra)","Tomada eléctrica nova (ver Elétrica)","Integração com sistema domótico complexo"]'::jsonb,
  faq        = '[{"q":"Posso controlar por telemóvel?","a":"Se o motor tiver módulo WiFi/RF, sim — configuramos a app no momento."}]'::jsonb
WHERE id = 'mnt-blinds-elec';

-- mnt-blinds-mount (fita/correia)
UPDATE servicos SET
  tagline    = 'Substituição de fita ou correia de estore partida — solução rápida para o estore voltar a subir.',
  duracao_tipica = '30-45 min',
  inclui     = '["Diagnóstico","Substituição da fita ou correia","Lubrificação do mecanismo","Teste de funcionamento","Fita/correia standard incluída"]'::jsonb,
  nao_inclui = '["Substituição do estore completo","Motor novo (ver Estore eléctrico)","Caixa ou guias danificadas (orçamento separado)"]'::jsonb,
  faq        = '[{"q":"Que fita usam?","a":"Fita standard resistente. Para estores grandes, fita reforçada (sem custo adicional)."}]'::jsonb
WHERE id = 'mnt-blinds-mount';

-- mnt-wardrobe (roupeiro)
UPDATE servicos SET
  tagline    = 'Montagem de roupeiro novo — IKEA, Conforama, Leroy ou outro.',
  duracao_tipica = '2h - 3h30',
  inclui     = '["Desembalagem e verificação de peças","Montagem completa segundo manual","Fixação à parede (seguro anti-tombo)","Ajuste de portas e gavetas","Remoção de cartão e limpeza da área"]'::jsonb,
  nao_inclui = '["Levar ao andar (ver Mudanças se necessário)","Desmontagem do roupeiro antigo (serviço separado)","Alterações à medida"]'::jsonb,
  faq        = '[{"q":"Se faltar peça?","a":"Contactamos a loja consigo e voltamos sem custo de deslocação para terminar."},{"q":"Fixam à parede?","a":"Sempre que possível, por segurança — principalmente em casas com crianças."}]'::jsonb
WHERE id = 'mnt-wardrobe';

-- mnt-bed
UPDATE servicos SET
  tagline    = 'Montagem de cama nova — estrutura, estrado e ajustes.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Desembalagem e verificação","Montagem da estrutura","Colocação do estrado","Teste de estabilidade","Remoção de embalagens"]'::jsonb,
  nao_inclui = '["Desmontagem da cama antiga (serviço separado)","Subida ao andar (serviço separado)","Colocação do colchão (já o faz o cliente)"]'::jsonb,
  faq        = '[{"q":"Cama com gavetas ou arrumação?","a":"Sim, fazemos qualquer tipo — incluindo camas articuladas."}]'::jsonb
WHERE id = 'mnt-bed';

-- mnt-table-chairs
UPDATE servicos SET
  tagline    = 'Montagem de mesa de sala e cadeiras — mobiliário pronto a usar.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Desembalagem e verificação","Montagem de mesa","Montagem de até 6 cadeiras","Teste de estabilidade","Remoção de embalagens"]'::jsonb,
  nao_inclui = '["Subida ao andar (ver Mudanças)","Modificações à medida","Estofagem de cadeiras"]'::jsonb,
  faq        = '[{"q":"E se forem mais de 6 cadeiras?","a":"Sem problema — cadeiras extra são cobradas a €5/cadeira."}]'::jsonb
WHERE id = 'mnt-table-chairs';

-- mnt-lock-replace (P2 popular)
UPDATE servicos SET
  tagline    = 'Substituição de fechadura com chaves novas — segurança renovada em 1h.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Remoção da fechadura antiga","Instalação de fechadura nova standard","3 chaves novas","Teste e ajuste","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fechadura de alta segurança ou biométrica (orçamento separado)","Reparação de porta danificada","Mudar canhão só (ver Trocar cilindro)"]'::jsonb,
  faq        = '[{"q":"Que fechadura usam?","a":"Fechadura standard de qualidade, certificada EN 1303. Para alta segurança, orçamos à parte."},{"q":"E se a porta estiver empenada?","a":"Avaliamos no local. Pequenos ajustes estão incluídos; reparações grandes são orçamentadas."}]'::jsonb
WHERE id = 'mnt-lock-replace';

-- mnt-lock-urgent (abertura porta)
UPDATE servicos SET
  tagline    = 'Abertura de porta urgente sem chave — técnico chega em 30-40 min.',
  duracao_tipica = '30 min - 1h',
  inclui     = '["Técnico de urgência (chegada 30-40 min)","Tentativa de abertura sem danos","Ferramenta profissional de abertura","Fechadura nova se for necessário arrombar (incluída)","3 chaves novas"]'::jsonb,
  nao_inclui = '["Reparação de porta ou batente danificado","Fechaduras de segurança electrónicas (consulte)","Documentação para seguro (emitimos relatório sob pedido)"]'::jsonb,
  faq        = '[{"q":"Abrem sem danificar?","a":"Em 80% dos casos sim. Em fechaduras bloqueadas ou de segurança, pode ser necessário substituir — nesse caso, a nova está incluída."},{"q":"24h?","a":"Sim, 24/7 mas com acréscimo de €25 fora do horário 8h-20h."}]'::jsonb
WHERE id = 'mnt-lock-urgent';

-- mnt-door-adjust
UPDATE servicos SET
  tagline    = 'Ajuste de porta que range, não fecha bem ou roça no chão.',
  duracao_tipica = '30 min - 1h',
  inclui     = '["Diagnóstico do problema","Ajuste de dobradiças e fecho","Lubrificação de mecanismos","Alinhamento com o batente","Teste final"]'::jsonb,
  nao_inclui = '["Substituição completa de porta","Pintura ou envernizamento (ver Pintura)","Substituição de fechadura (serviço separado)"]'::jsonb,
  faq        = '[{"q":"Porta empenada, resolvem?","a":"Pequeno empenamento sim. Empenos graves podem requerer substituição da porta."}]'::jsonb
WHERE id = 'mnt-door-adjust';

-- mnt-window (reparação de janela)
UPDATE servicos SET
  tagline    = 'Reparação de janela que não fecha, abre mal ou tem fuga de ar.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Diagnóstico do mecanismo","Ajuste de dobradiças e fecho","Substituição de borrachas de vedação","Lubrificação","Teste de vedação"]'::jsonb,
  nao_inclui = '["Substituição de vidro partido (serviço especializado)","Substituição de toda a caixilharia","Reparação de persianas (ver Estores)"]'::jsonb,
  faq        = '[{"q":"Janelas de PVC e alumínio, ambas?","a":"Sim, trabalhamos com PVC, alumínio e madeira."}]'::jsonb
WHERE id = 'mnt-window';

-- mnt-drawer (gaveta ou porta armário)
UPDATE servicos SET
  tagline    = 'Reparação de gaveta ou porta de armário — corrediças, dobradiças e ajustes.',
  duracao_tipica = '30 min',
  inclui     = '["Diagnóstico","Substituição de corrediça ou dobradiça","Ajuste e alinhamento","Ferragens standard incluídas"]'::jsonb,
  nao_inclui = '["Substituição de porta ou gaveta completa","Reparação de estrutura do móvel"]'::jsonb,
  faq        = '[{"q":"Funciona em móveis IKEA?","a":"Sim, temos peças compatíveis com as marcas mais comuns."}]'::jsonb
WHERE id = 'mnt-drawer';

-- mnt-hinges (dobradiças e puxadores)
UPDATE servicos SET
  tagline    = 'Substituição de dobradiças ou puxadores — até 5 peças num única visita.',
  duracao_tipica = '30 min',
  inclui     = '["Remoção das peças antigas","Instalação das novas","Ajuste e teste","Até 5 peças no preço base"]'::jsonb,
  nao_inclui = '["Fornecimento das peças (cliente compra — ajudamos a escolher)","Reparação da madeira ou estrutura"]'::jsonb,
  faq        = '[{"q":"Peças iguais às antigas, preciso procurar?","a":"Não — medimos e indicamos qual comprar, ou trazemos modelos standard."}]'::jsonb
WHERE id = 'mnt-hinges';

-- mnt-curtains (varão de cortinas)
UPDATE servicos SET
  tagline    = 'Instalação de varão de cortinas — perfurar, fixar e alinhar.',
  duracao_tipica = '30-45 min',
  inclui     = '["Perfuração na parede","Instalação de suportes e varão","Alinhamento e nível","Limpeza da zona"]'::jsonb,
  nao_inclui = '["Fornecimento do varão (cliente compra)","Perfuração em tecto de gesso cartonado sem reforço (avaliar no local)"]'::jsonb,
  faq        = '[{"q":"E em pladur?","a":"Sim, com âncoras apropriadas — sem problema para cortinas standard."}]'::jsonb
WHERE id = 'mnt-curtains';

-- mnt-sink-seal (silicone de banca/lava-loiça)
UPDATE servicos SET
  tagline    = 'Substituição de silicone de banca ou lava-loiça — vedação nova em 45 min.',
  duracao_tipica = '45 min (+ 24h secagem)',
  inclui     = '["Remoção do silicone antigo","Limpeza e desengorduramento","Aplicação de silicone sanitário anti-fungos","Acabamento profissional"]'::jsonb,
  nao_inclui = '["Substituição da banca ou lava-loiça","Reparação de torneira (ver Canalização)","Tratamento de bolor estrutural"]'::jsonb,
  faq        = '[{"q":"Quanto tempo sem usar a banca?","a":"24h ideal. Com uso ligeiro de água, 6-8h chega."}]'::jsonb
WHERE id = 'mnt-sink-seal';

-- mnt-silicone (por metro)
UPDATE servicos SET
  tagline    = 'Aplicação de silicone em juntas de chuveiro, banheira ou azulejos — por metro linear.',
  duracao_tipica = '15-20 min por metro',
  inclui     = '["Remoção de silicone antigo","Limpeza e desengorduramento","Silicone sanitário anti-fungos","Acabamento profissional"]'::jsonb,
  nao_inclui = '["Reparação de fissuras estruturais","Substituição de azulejos"]'::jsonb,
  faq        = '[{"q":"Mínimo de metros?","a":"Mínimo de 2 metros para deslocação fazer sentido — se menor, combine com outra tarefa."}]'::jsonb
WHERE id = 'mnt-silicone';

-- mnt-shelf (prateleira)
UPDATE servicos SET
  tagline    = 'Fixação de prateleira — nível certo, suportes seguros.',
  duracao_tipica = '20-30 min',
  inclui     = '["Marcação e nível","Perfuração","Instalação de suportes","Colocação da prateleira e teste"]'::jsonb,
  nao_inclui = '["Fornecimento da prateleira e suportes","Prateleiras com peso superior a 15kg (avaliar)"]'::jsonb,
  faq        = '[{"q":"Quantas prateleiras?","a":"Preço é por prateleira. 2+ com desconto."}]'::jsonb
WHERE id = 'mnt-shelf';

-- mnt-frames (quadros/espelhos)
UPDATE servicos SET
  tagline    = 'Fixação de quadros ou espelhos — até 3 peças no preço base.',
  duracao_tipica = '30 min',
  inclui     = '["Marcação e nível","Perfuração","Fixação com suportes adequados ao peso","Até 3 peças"]'::jsonb,
  nao_inclui = '["Fornecimento de fixações especiais para espelho pesado (orçamento)","Espelho de casa de banho grande (ver instalação específica)"]'::jsonb,
  faq        = '[{"q":"Espelho grande de casa de banho?","a":"Sim mas avalie peso — acima de 15kg recomendamos fixações específicas."}]'::jsonb
WHERE id = 'mnt-frames';


-- ═════════════════════════════════════════════════════════════════════
-- DETALHE RICO — JARDIM (17 serviços, 16 fixos + 1 personalizado)
-- ═════════════════════════════════════════════════════════════════════

UPDATE servicos SET
  tagline    = 'Jardim à medida — combine corte, poda, plantação ou qualquer tarefa específica.',
  duracao_tipica = 'A combinar',
  inclui     = '["Jardineiro equipado com ferramenta completa","Máquinas profissionais de corte e poda","Possibilidade de combinar várias tarefas","Remoção do material cortado","Facturação ao tempo real"]'::jsonb,
  nao_inclui = '["Plantas ou materiais de plantação (cliente compra ou combinamos)","Máquinas pesadas (retroescavadora, chipper — orçamento separado)"]'::jsonb,
  faq        = '[{"q":"Trazem todas as ferramentas?","a":"Sim — corte, poda, sopradores, aparadores. Para equipamento pesado avisamos antes."},{"q":"Levam os resíduos?","a":"Até 2m³ incluído. Volumes maiores têm custo pequeno de remoção."}]'::jsonb
WHERE id = 'personalizado-jar';

-- jar-mow-m
UPDATE servicos SET
  tagline    = 'Corte de relva média (100-300m²) — ideal para moradias com jardim regular.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Corte uniforme com máquina profissional","Aparo de cantos e bordas","Remoção do material cortado (até 1m³)","Limpeza da zona","Combustível incluído"]'::jsonb,
  nao_inclui = '["Escarificação (ver serviço separado)","Tratamento fertilizante (orçamento separado)","Remoção de grandes volumes >1m³"]'::jsonb,
  faq        = '[{"q":"Recorrente?","a":"Sim — plano quinzenal com desconto de 15%."}]'::jsonb
WHERE id = 'jar-mow-m';

-- jar-mow-l
UPDATE servicos SET
  tagline    = 'Corte de relva grande (>300m²) — equipamento profissional, equipa rápida.',
  duracao_tipica = '2h - 3h30',
  inclui     = '["2 técnicos com máquinas profissionais","Corte uniforme de toda a área","Aparo de cantos e árvores isoladas","Remoção do material cortado","Combustível incluído"]'::jsonb,
  nao_inclui = '["Escarificação","Tratamento fertilizante","Poda de árvores (ver serviço separado)"]'::jsonb,
  faq        = '[{"q":"Plano mensal?","a":"Sim — recomendamos plano para áreas grandes, com desconto significativo."}]'::jsonb
WHERE id = 'jar-mow-l';

-- jar-maint-s (manutenção pequena)
UPDATE servicos SET
  tagline    = 'Manutenção mensal de jardim pequeno (<100m²) — tudo cuidado sem se preocupar.',
  duracao_tipica = '2h - 2h30',
  inclui     = '["Corte de relva","Poda ligeira de arbustos","Limpeza de ervas daninhas","Remoção de folhas e resíduos","Rega de emergência se necessário"]'::jsonb,
  nao_inclui = '["Plantação de novas espécies","Tratamentos fitossanitários","Sistemas de rega (ver Rega)"]'::jsonb,
  faq        = '[{"q":"Frequência ideal?","a":"1x/mês na primavera-verão, 1x/mês a cada 2 meses no outono-inverno."}]'::jsonb
WHERE id = 'jar-maint-s';

-- jar-maint-m (P2 - manutenção média)
UPDATE servicos SET
  tagline    = 'Manutenção mensal de jardim médio (100-300m²) — rotina completa mensal.',
  duracao_tipica = '3h - 4h',
  inclui     = '["Corte de relva","Poda de arbustos e sebes pequenas","Limpeza de canteiros","Remoção de ervas daninhas","Limpeza geral e recolha de resíduos","Inspecção de regador e plantas"]'::jsonb,
  nao_inclui = '["Poda de árvores grandes (serviço separado)","Plantação nova","Tratamentos fitossanitários especializados"]'::jsonb,
  faq        = '[{"q":"Contrato fixo?","a":"Plano mensal com desconto ou avulso. Sempre o mesmo jardineiro, sempre que possível."},{"q":"E se faltar num mês?","a":"Reagendamos sem custo — o jardim mantém-se cuidado."}]'::jsonb
WHERE id = 'jar-maint-m';

-- jar-maint-l
UPDATE servicos SET
  tagline    = 'Manutenção mensal de jardim grande (>300m²) — equipa dedicada, trabalho rigoroso.',
  duracao_tipica = '4h - 6h',
  inclui     = '["2 jardineiros em simultâneo","Corte de relva completo","Poda de arbustos e sebes","Limpeza de canteiros e ervas daninhas","Limpeza geral de jardim e recolha"]'::jsonb,
  nao_inclui = '["Poda de árvores grandes","Sistemas de rega (ver Rega)","Plantação ou design novo"]'::jsonb,
  faq        = '[{"q":"Quanto custa por ano?","a":"Em plano mensal, 12 visitas com desconto — consulte orçamento anual."}]'::jsonb
WHERE id = 'jar-maint-l';

-- jar-hedge-prune
UPDATE servicos SET
  tagline    = 'Poda de sebes — alinhamento profissional com máquina de corte.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Poda com máquina profissional","Alinhamento e corte uniforme","Remoção de material cortado","Limpeza final da zona"]'::jsonb,
  nao_inclui = '["Plantação de sebe nova (ver Plantação de sebe)","Tratamentos fitossanitários","Sebes com altura superior a 3m (equipamento especial)"]'::jsonb,
  faq        = '[{"q":"Quantas vezes por ano?","a":"1-2x por ano para sebe regular. Mais se quer aspecto muito controlado."}]'::jsonb
WHERE id = 'jar-hedge-prune';

-- jar-prune-s (árvore pequena)
UPDATE servicos SET
  tagline    = 'Poda de árvore pequena (até 3m) — formativa ou de manutenção.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Poda formativa ou de manutenção","Remoção de ramos secos e danificados","Corte de material cortado em peças pequenas","Remoção do material (até 0,5m³)"]'::jsonb,
  nao_inclui = '["Abate de árvore (serviço separado)","Árvores com mais de 3m (ver árvore média)","Equipamento de altura"]'::jsonb,
  faq        = '[{"q":"Posso ficar com a lenha?","a":"Sim — avise no formulário e deixamos em pilha organizada."}]'::jsonb
WHERE id = 'jar-prune-s';

-- jar-prune-m (árvore média)
UPDATE servicos SET
  tagline    = 'Poda de árvore média (3-7m) — técnico certificado com equipamento de altura.',
  duracao_tipica = '2h - 3h30',
  inclui     = '["Técnico certificado para trabalhos em altura","Poda formativa, de segurança ou de redução","Corte de ramos secos e danificados","Remoção e trituração parcial do material","Seguro de trabalho incluído"]'::jsonb,
  nao_inclui = '["Abate completo da árvore","Árvores >7m (orçamento especial)","Remoção total de raízes"]'::jsonb,
  faq        = '[{"q":"Melhor altura do ano?","a":"Inverno para maioria das espécies. Fazer em fase correcta é essencial para a saúde da árvore."}]'::jsonb
WHERE id = 'jar-prune-m';

-- jar-weed (ervas daninhas)
UPDATE servicos SET
  tagline    = 'Remoção manual de ervas daninhas em canteiros e zonas pavimentadas.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Remoção manual com ferramenta apropriada","Limpeza de canteiros e calçada","Remoção de material"]'::jsonb,
  nao_inclui = '["Herbicidas químicos (orçamento separado se pretendido)","Substituição de terra ou mulch"]'::jsonb,
  faq        = '[{"q":"Voltam a crescer?","a":"Sem prevenção, em 2-4 semanas. Oferecemos tratamento preventivo como extra."}]'::jsonb
WHERE id = 'jar-weed';

-- jar-autumn (limpeza de folhas)
UPDATE servicos SET
  tagline    = 'Limpeza de folhas de outono — aspiração e remoção profissional.',
  duracao_tipica = '1h30 - 2h',
  inclui     = '["Aspiração com soprador profissional","Recolha e ensacamento","Limpeza de relva, canteiros e calçada","Remoção do material (até 1m³)"]'::jsonb,
  nao_inclui = '["Poda (serviço separado)","Limpeza de caleiras e telhados (consulte)"]'::jsonb,
  faq        = '[{"q":"Frequência no outono?","a":"Semanal ou quinzenal a partir de Outubro. Plano específico com desconto."}]'::jsonb
WHERE id = 'jar-autumn';

-- jar-scarify (escarificação)
UPDATE servicos SET
  tagline    = 'Escarificação de relva — remove musgo e feltro, devolve vigor.',
  duracao_tipica = '1h30 - 2h',
  inclui     = '["Escarificação mecânica profissional","Corte antes da escarificação","Remoção do material extraído","Recomendações pós-tratamento"]'::jsonb,
  nao_inclui = '["Ressementeira ou adubo (orçamento separado)","Tratamento anti-musgo químico"]'::jsonb,
  faq        = '[{"q":"Quando fazer?","a":"Primavera (Abril-Maio) ou outono (Setembro-Outubro) para melhor resultado."}]'::jsonb
WHERE id = 'jar-scarify';

-- jar-lawn-new (relva nova)
UPDATE servicos SET
  tagline    = 'Instalação de relva nova por m² — preparação do solo, sementeira ou tapete.',
  duracao_tipica = 'Consulte segundo área',
  inclui     = '["Preparação do solo (lavra ligeira)","Nivelamento","Sementeira ou aplicação de tapete (cliente escolhe tipo)","Rega inicial"]'::jsonb,
  nao_inclui = '["Fornecimento da relva (cliente compra — recomendamos tipo)","Sistema de rega (ver Rega)","Remoção de relva antiga muito extensa (orçamento)"]'::jsonb,
  faq        = '[{"q":"Relva em tapete ou semente?","a":"Tapete é mais rápido mas mais caro. Semente é económica mas demora 4-8 semanas a estabelecer."}]'::jsonb
WHERE id = 'jar-lawn-new';

-- jar-hedge-plant (plantação de sebe)
UPDATE servicos SET
  tagline    = 'Plantação de sebe por metro linear — crescimento rápido para privacidade.',
  duracao_tipica = 'Consulte segundo comprimento',
  inclui     = '["Abertura de valeta","Plantação com espaçamento correcto","Adubação inicial","Rega inicial","Recomendações de cuidados"]'::jsonb,
  nao_inclui = '["Fornecimento das plantas (cliente compra — recomendamos espécie)","Sistema de rega automática","Tutores para crescimento guiado"]'::jsonb,
  faq        = '[{"q":"Que espécie recomendam?","a":"Depende do clima e altura desejada. Aconselhamos no orçamento."}]'::jsonb
WHERE id = 'jar-hedge-plant';

-- jar-irrig-install (sistema rega)
UPDATE servicos SET
  tagline    = 'Instalação de sistema de rega automática — poupa água e tempo.',
  duracao_tipica = '4h - 6h',
  inclui     = '["Planeamento do sistema no local","Abertura de valetas para tubagem","Instalação de aspersores e gotejadores","Programador automático","Teste de pressão e cobertura"]'::jsonb,
  nao_inclui = '["Ligação a contador de água (se for necessário contador próprio)","Electricidade para o programador se não existir ponto próximo","Reparação de pavimento se for necessário partir calçada"]'::jsonb,
  faq        = '[{"q":"Poupa mesmo água?","a":"Sim — até 40% vs rega manual, ao regar só quando necessário e em horas óptimas."}]'::jsonb
WHERE id = 'jar-irrig-install';

-- jar-irrig-repair
UPDATE servicos SET
  tagline    = 'Reparação de sistema de rega — fugas, aspersores partidos, programador.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Diagnóstico do problema","Substituição de aspersores ou gotejadores","Reparação de tubagem até 2m","Teste final de funcionamento"]'::jsonb,
  nao_inclui = '["Reparação de tubagens enterradas muito extensas","Substituição completa de programador (orçamento)","Obra para acesso a tubagem profunda"]'::jsonb,
  faq        = '[{"q":"E se o programador não ligar?","a":"Diagnosticamos e reparamos se possível. Se for avaria irreparável, orçamento de substituição."}]'::jsonb
WHERE id = 'jar-irrig-repair';


-- ═════════════════════════════════════════════════════════════════════
-- DETALHE RICO — PISCINA (14 serviços, 13 fixos + 1 personalizado)
-- ═════════════════════════════════════════════════════════════════════

UPDATE servicos SET
  tagline    = 'Serviço de piscina à medida — problema específico, combinação de tarefas, emergência.',
  duracao_tipica = 'A combinar',
  inclui     = '["Técnico especializado em piscinas","Equipamento de análise e limpeza profissional","Diagnóstico e execução no mesmo dia sempre que possível","Facturação ao tempo real trabalhado"]'::jsonb,
  nao_inclui = '["Peças grandes de substituição (bomba, filtro — orçamento)","Obra civil na piscina","Produtos químicos em grandes quantidades (orçamento)"]'::jsonb,
  faq        = '[{"q":"Diagnóstico é grátis?","a":"Pago à hora como qualquer tempo de técnico. Se avançar com reparação, descontamos o tempo de diagnóstico."}]'::jsonb
WHERE id = 'personalizado-pol';

-- pol-chem-basic
UPDATE servicos SET
  tagline    = 'Análise e correção química básica — pH e cloro em equilíbrio numa visita.',
  duracao_tipica = '45 min',
  inclui     = '["Análise completa (pH, cloro, alcalinidade)","Correção de pH","Ajuste de cloro","Relatório com valores antes/depois","Produtos básicos incluídos"]'::jsonb,
  nao_inclui = '["Choque de cloro para algas (ver serviço separado)","Tratamento de algas (ver serviço separado)","Aspiração ou limpeza mecânica"]'::jsonb,
  faq        = '[{"q":"Frequência recomendada?","a":"Semanal no verão, quinzenal na época intermédia."}]'::jsonb
WHERE id = 'pol-chem-basic';

-- pol-chem-full (tratamento completo)
UPDATE servicos SET
  tagline    = 'Tratamento químico completo — análise, correção e anti-algas preventivo.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Análise completa (pH, cloro, alcalinidade, dureza)","Correção de todos os parâmetros","Tratamento anti-algas preventivo","Estabilizador de cloro","Relatório técnico"]'::jsonb,
  nao_inclui = '["Tratamento de algas já instaladas (ver serviço separado)","Aspiração ou limpeza","Produtos em grandes quantidades (fornecemos acordo mensal)"]'::jsonb,
  faq        = '[{"q":"Funciona se piscina já estiver verde?","a":"Não — nesse caso faça primeiro o tratamento de algas."}]'::jsonb
WHERE id = 'pol-chem-full';

-- pol-maint-s (manutenção pequena)
UPDATE servicos SET
  tagline    = 'Manutenção mensal de piscina pequena (<30m³) — pack completo.',
  duracao_tipica = '4 visitas de 1h por mês',
  inclui     = '["4 visitas mensais","Análise e correção química","Aspiração e limpeza do fundo","Limpeza da linha de água","Retrolavagem do filtro","Produtos básicos incluídos"]'::jsonb,
  nao_inclui = '["Reparações de equipamento (orçamento)","Tratamentos especiais (algas severas)","Abertura/fecho de época (serviços separados)"]'::jsonb,
  faq        = '[{"q":"Plano anual?","a":"12 meses com desconto adicional — consulte."}]'::jsonb
WHERE id = 'pol-maint-s';

-- pol-maint-l (manutenção grande)
UPDATE servicos SET
  tagline    = 'Manutenção mensal de piscina grande (>60m³) — equipa dedicada.',
  duracao_tipica = '4 visitas de 2h por mês',
  inclui     = '["4 visitas mensais","Análise e correção química completa","Aspiração robotizada do fundo","Limpeza da linha de água e skimmers","Retrolavagem de filtro","Verificação de equipamento","Produtos básicos incluídos"]'::jsonb,
  nao_inclui = '["Reparações de equipamento","Abertura/fecho de época","Choque anti-algas (se necessário, orçamento)"]'::jsonb,
  faq        = '[{"q":"Quanto por ano?","a":"12 meses com desconto significativo para piscinas grandes. Consulte."}]'::jsonb
WHERE id = 'pol-maint-l';

-- pol-vacuum (aspiração avulso)
UPDATE servicos SET
  tagline    = 'Aspiração de piscina avulsa — quando precisa de limpeza entre manutenções.',
  duracao_tipica = '1h',
  inclui     = '["Aspiração completa do fundo","Limpeza de skimmers","Retrolavagem do filtro","Verificação visual da água"]'::jsonb,
  nao_inclui = '["Tratamento químico (serviço separado)","Limpeza de paredes","Tratamento de algas"]'::jsonb,
  faq        = '[{"q":"Funciona para todas as piscinas?","a":"Sim, com aspirador manual ou robot — escolhemos o adequado."}]'::jsonb
WHERE id = 'pol-vacuum';

-- pol-filter-clean
UPDATE servicos SET
  tagline    = 'Limpeza profunda de filtro — retrolavagem não chega, precisa de abrir.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Abertura do filtro","Limpeza profunda do elemento filtrante","Verificação de anéis e juntas","Remontagem e teste de pressão"]'::jsonb,
  nao_inclui = '["Substituição do filtro completo (ver serviço separado)","Substituição de areia ou vidro (orçamento)","Reparação de bomba"]'::jsonb,
  faq        = '[{"q":"Frequência?","a":"1x por época (início ou fim) para a maioria das piscinas."}]'::jsonb
WHERE id = 'pol-filter-clean';

-- pol-filter-replace
UPDATE servicos SET
  tagline    = 'Substituição completa de filtro de piscina — novo e mais eficiente.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Remoção do filtro antigo","Instalação do filtro novo","Substituição de anéis e juntas","Areia ou vidro filtrante novo incluído para filtros standard","Teste de pressão"]'::jsonb,
  nao_inclui = '["Filtros especiais ou de grande dimensão (orçamento)","Modificação da tubagem"]'::jsonb,
  faq        = '[{"q":"Que filtros?","a":"Substituímos qualquer modelo. Para marcas premium, pode haver custo adicional."}]'::jsonb
WHERE id = 'pol-filter-replace';

-- pol-pump-replace
UPDATE servicos SET
  tagline    = 'Substituição de bomba de piscina — avaria ou upgrade para mais eficiente.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Remoção da bomba antiga","Instalação da nova bomba","Ligações hidráulicas e eléctricas","Teste de funcionamento e ajuste de caudal","Garantia da peça + 90 dias sobre mão-de-obra"]'::jsonb,
  nao_inclui = '["Fornecimento da bomba (cliente compra — recomendamos modelo)","Obra eléctrica nova","Reparação de tubagem danificada"]'::jsonb,
  faq        = '[{"q":"Recomendam modelo?","a":"Sim — vemos a piscina e sugerimos 2-3 modelos conforme orçamento."}]'::jsonb
WHERE id = 'pol-pump-replace';

-- pol-leak-repair
UPDATE servicos SET
  tagline    = 'Reparação de fuga na piscina — diagnóstico e reparação superficial.',
  duracao_tipica = '1h30 - 3h',
  inclui     = '["Diagnóstico da fuga","Reparação superficial na tela ou revestimento","Selagem de juntas","Teste após reparação"]'::jsonb,
  nao_inclui = '["Fugas estruturais profundas (orçamento especial)","Substituição completa de tela","Obra civil"]'::jsonb,
  faq        = '[{"q":"E se a fuga for grande?","a":"Diagnosticamos primeiro. Se exceder âmbito, orçamentamos trabalho especializado."}]'::jsonb
WHERE id = 'pol-leak-repair';

-- pol-open (abertura época — popular)
UPDATE servicos SET
  tagline    = 'Abertura de época — piscina pronta para o primeiro mergulho em 1 dia.',
  duracao_tipica = '3h - 4h',
  inclui     = '["Remoção da cobertura de inverno","Enchimento até nível óptimo","Limpeza profunda (fundo, paredes, skimmers)","Análise e correção química inicial","Arranque e verificação de equipamento","Tratamento anti-algas preventivo"]'::jsonb,
  nao_inclui = '["Reparações de equipamento detectadas (orçamento)","Manutenção mensal (plano separado)","Substituição de cobertura"]'::jsonb,
  faq        = '[{"q":"Quando agendar?","a":"Idealmente 2-3 semanas antes de começar a usar. Primavera é alta procura — agende cedo."}]'::jsonb
WHERE id = 'pol-open';

-- pol-close (fecho época)
UPDATE servicos SET
  tagline    = 'Fecho de época (invernagem) — protege piscina durante o inverno.',
  duracao_tipica = '2h30 - 3h30',
  inclui     = '["Limpeza profunda antes do fecho","Tratamento químico de invernagem","Baixar nível de água","Drenagem de equipamentos (protecção contra gelo)","Colocação da cobertura existente"]'::jsonb,
  nao_inclui = '["Fornecimento de cobertura nova (ver serviço separado)","Reparações pendentes (orçamento)","Retirada de tapete de fundo"]'::jsonb,
  faq        = '[{"q":"Quando fechar?","a":"Outubro-Novembro, antes das primeiras geadas. Depende da região."}]'::jsonb
WHERE id = 'pol-close';

-- pol-cover
UPDATE servicos SET
  tagline    = 'Instalação ou substituição de cobertura de piscina — segurança e preservação.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Remoção de cobertura antiga se aplicável","Medição e ajuste da nova","Instalação de fixações","Teste de ancoragem"]'::jsonb,
  nao_inclui = '["Fornecimento da cobertura (cliente compra — recomendamos modelo)","Cobertura automática com motor (orçamento especializado)"]'::jsonb,
  faq        = '[{"q":"Que cobertura recomendam?","a":"Térmica para aquecer, de segurança se tiver crianças, ou inverno para proteger. Aconselhamos caso a caso."}]'::jsonb
WHERE id = 'pol-cover';


-- ═════════════════════════════════════════════════════════════════════
-- DETALHE RICO — PINTURA (16 serviços, 15 fixos + 1 personalizado)
-- ═════════════════════════════════════════════════════════════════════

UPDATE servicos SET
  tagline    = 'Pintura à medida — retoques, pequenos trabalhos ou acabamentos especiais.',
  duracao_tipica = 'A combinar (mínimo 2h)',
  inclui     = '["Pintor profissional com ferramenta","Protecção de móveis e pavimentos","Aplicação com técnica adequada","Limpeza no fim","Facturação ao tempo real trabalhado"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (cliente compra — recomendamos marca e cor)","Reparação de fissuras grandes","Obra estrutural"]'::jsonb,
  faq        = '[{"q":"Trazem a tinta?","a":"Trazemos utensílios e fitas. Tinta deve ser comprada — aconselhamos ml e marca."}]'::jsonb
WHERE id = 'personalizado-pnt';

-- pnt-room-s (quarto pequeno)
UPDATE servicos SET
  tagline    = 'Pintar quarto pequeno (até 10m²) — 2 demãos, cor à escolha.',
  duracao_tipica = '1 dia',
  inclui     = '["Protecção de móveis e pavimento","Lixagem ligeira","Betumagem de pequenos buracos","Primário se necessário","2 demãos de tinta","Limpeza final"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (cliente compra ~5-8L)","Reparação de fissuras grandes ou humidade","Pintar tecto (serviço separado)"]'::jsonb,
  faq        = '[{"q":"Pintam tecto também?","a":"Não está incluído. Adicionar Pintar tecto ao serviço."}]'::jsonb
WHERE id = 'pnt-room-s';

-- pnt-room-m (quarto médio)
UPDATE servicos SET
  tagline    = 'Pintar quarto médio (10-15m²) — trabalho completo em 1 dia.',
  duracao_tipica = '1 dia',
  inclui     = '["Protecção de móveis e pavimento","Lixagem e betumagem de pequenos defeitos","Primário se necessário","2 demãos de tinta","Limpeza final"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (cliente compra ~8-12L)","Fissuras estruturais ou humidade","Tecto (serviço separado)"]'::jsonb,
  faq        = '[{"q":"Cor escura, 3 demãos?","a":"Cores escuras ou muito saturadas podem exigir 3 demãos — custo adicional de ~€40."}]'::jsonb
WHERE id = 'pnt-room-m';

-- pnt-living-s (sala pequena P2)
UPDATE servicos SET
  tagline    = 'Pintar sala pequena (até 20m²) — revitaliza o espaço principal em 1-2 dias.',
  duracao_tipica = '1-2 dias',
  inclui     = '["Protecção completa de móveis e pavimento","Lixagem e betumagem","Primário","2 demãos de tinta","Acabamento de rodapés e cantos","Limpeza final"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (cliente compra ~10-15L)","Pintura de tecto (separado)","Mobiliário pesado que precisa de mudar de sala","Fissuras grandes"]'::jsonb,
  faq        = '[{"q":"Cor escura, mais demãos?","a":"Sim — 3ª demão custo adicional de €50."},{"q":"Tiram móveis?","a":"Mudamos pequenos. Sofás grandes, mudamos para o centro da sala e cobrimos."}]'::jsonb
WHERE id = 'pnt-living-s';

-- pnt-living-l (sala grande)
UPDATE servicos SET
  tagline    = 'Pintar sala grande (>20m²) — equipa rápida, acabamento profissional.',
  duracao_tipica = '2 dias',
  inclui     = '["2 pintores em simultâneo","Protecção completa","Lixagem, betumagem, primário","2 demãos de tinta","Rodapés e cantos","Limpeza final"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (15-20L)","Tecto (separado)","Paredes com muitas fissuras (orçamento)"]'::jsonb,
  faq        = '[{"q":"Posso ficar a viver durante?","a":"Sim — protegemos tudo e as salas são pintadas em sequência."}]'::jsonb
WHERE id = 'pnt-living-l';

-- pnt-apt-t1 (apartamento T1 completo)
UPDATE servicos SET
  tagline    = 'Pintar apartamento T1 completo — paredes de todas as divisões em 2-3 dias.',
  duracao_tipica = '2-3 dias',
  inclui     = '["Protecção completa","Lixagem e betumagem de todas as paredes","Primário onde necessário","2 demãos de tinta branca ou cor clara","Rodapés, caixilhos e cantos","Limpeza completa final","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (20-30L)","Pintar tectos","Paredes de cozinha/casa de banho (orçamento)","Pintar portas (serviço separado)"]'::jsonb,
  faq        = '[{"q":"Cores diferentes por divisão?","a":"Sim, sem custo adicional desde que sejam cores standard (tinta standard). Para cores premium, orçamento."}]'::jsonb
WHERE id = 'pnt-apt-t1';

-- pnt-apt-t3
UPDATE servicos SET
  tagline    = 'Pintar apartamento T3 completo — equipa reforçada, 4-6 dias para tudo pronto.',
  duracao_tipica = '4-6 dias',
  inclui     = '["2-3 pintores em simultâneo","Protecção completa da casa","Lixagem e betumagem de todas as paredes","Primário onde necessário","2 demãos de tinta standard","Rodapés, caixilhos e cantos","Limpeza final","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (40-60L)","Pintar tectos (separado)","Pintar portas (separado)","Obra de reparação estrutural"]'::jsonb,
  faq        = '[{"q":"Posso morar na casa durante?","a":"Sim — trabalhamos divisão a divisão e combinamos horário dos quartos que estiver a usar."}]'::jsonb
WHERE id = 'pnt-apt-t3';

-- pnt-facade-m2 (fachada por m²)
UPDATE servicos SET
  tagline    = 'Pintura de fachada por m² — tinta exterior de qualidade, cobertura total.',
  duracao_tipica = 'Consulte segundo área',
  inclui     = '["Limpeza inicial da fachada","Selagem de pequenas fissuras","Primário exterior","2 demãos de tinta exterior","Plataforma ou andaime até 3m"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (cliente compra com nossa recomendação)","Andaime ou elevador para >3m (orçamento)","Reparação estrutural (fissuras grandes, humidade)"]'::jsonb,
  faq        = '[{"q":"Cor igual à existente?","a":"Fazemos igualação de cor ou escolha nova. Para cores especiais, amostra antes."},{"q":"Mínimo de m²?","a":"Mínimo de 20m² para deslocação fazer sentido."}]'::jsonb
WHERE id = 'pnt-facade-m2';

-- pnt-cracks (reparação fissuras)
UPDATE servicos SET
  tagline    = 'Reparação de fissuras por ponto — betumagem profissional antes de pintar.',
  duracao_tipica = '30 min por ponto',
  inclui     = '["Abertura e preparação da fissura","Aplicação de massa de betumagem","Lixagem","Pronto para pintar"]'::jsonb,
  nao_inclui = '["Fissuras estruturais profundas (consulte engenheiro)","Pintura posterior (serviço separado)","Reparação de azulejos"]'::jsonb,
  faq        = '[{"q":"Funciona em qualquer parede?","a":"Sim em alvenaria e pladur. Fissuras estruturais requerem análise primeiro."}]'::jsonb
WHERE id = 'pnt-cracks';

-- pnt-stucco-m2 (estuque)
UPDATE servicos SET
  tagline    = 'Aplicação de estuque por m² — parede lisa e pronta para pintar.',
  duracao_tipica = 'Consulte segundo área',
  inclui     = '["Preparação da base","Aplicação de estuque","Lixagem","Acabamento liso pronto a pintar"]'::jsonb,
  nao_inclui = '["Pintura posterior (serviço separado)","Estuque veneziano ou técnicas especiais","Obra de reparação profunda"]'::jsonb,
  faq        = '[{"q":"Mínimo de m²?","a":"Mínimo de 5m² para deslocação."}]'::jsonb
WHERE id = 'pnt-stucco-m2';

-- pnt-anti-damp (tratamento anti-humidade)
UPDATE servicos SET
  tagline    = 'Tratamento anti-humidade — identifica a origem e sela a parede para pintar.',
  duracao_tipica = '3h - 4h',
  inclui     = '["Diagnóstico da humidade","Preparação da parede (lixagem profunda, remoção de tinta solta)","Tratamento anti-fungos","Aplicação de primário hidrófugo","2 demãos de tinta anti-humidade","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Resolução de humidade estrutural externa (requer obra)","Tratamento de infiltrações de origem exterior","Substituição de telhado ou impermeabilização"]'::jsonb,
  faq        = '[{"q":"Resolve definitivamente?","a":"Para humidade de condensação ou superficial, sim. Para humidade estrutural, é paliativo — recomendamos também resolver causa externa."}]'::jsonb
WHERE id = 'pnt-anti-damp';

-- pnt-door (pintura porta interior)
UPDATE servicos SET
  tagline    = 'Pintura de porta interior — inclui limpeza, lixagem e 2 demãos.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Remoção de ferragens","Lixagem e preparação","Primário","2 demãos de tinta acetinada","Recolocação de ferragens"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (1-2L por porta)","Reparação estrutural da porta","Envernizamento (serviço separado)"]'::jsonb,
  faq        = '[{"q":"Tiram a porta?","a":"Quando faz sentido pintam no local; senão desmontamos para pintar melhor."}]'::jsonb
WHERE id = 'pnt-door';

-- pnt-window (pintura janela madeira)
UPDATE servicos SET
  tagline    = 'Pintura de janela de madeira — proteção contra o tempo e estética renovada.',
  duracao_tipica = '3h - 4h',
  inclui     = '["Protecção de vidro","Lixagem e remoção de tinta solta","Primário para madeira exterior","2 demãos de tinta para exterior","Acabamento cuidadoso"]'::jsonb,
  nao_inclui = '["Substituição de madeira apodrecida","Reparação de vidros","Fornecimento de tinta (2-3L)"]'::jsonb,
  faq        = '[{"q":"Madeira muito velha?","a":"Avaliamos — se estiver a apodrecer, primeiro consolidamos, orçamento."}]'::jsonb
WHERE id = 'pnt-window';

-- pnt-radiator (pintura radiador)
UPDATE servicos SET
  tagline    = 'Pintura de radiador — tinta específica para calor, acabamento duradouro.',
  duracao_tipica = '2h',
  inclui     = '["Protecção da zona","Lixagem","Primário para metal","2 demãos de tinta resistente a calor","Acabamento cuidadoso"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta especial (cliente compra)","Reparação de fugas (ver Canalização)","Desmontagem do radiador"]'::jsonb,
  faq        = '[{"q":"Tinta especial, qual?","a":"Tinta de radiador resistente a 120°C. Indicamos marca."}]'::jsonb
WHERE id = 'pnt-radiator';

-- pnt-varnish (envernizamento)
UPDATE servicos SET
  tagline    = 'Envernizamento de madeira (pavimento, móvel, deck) — por m².',
  duracao_tipica = 'Consulte segundo área',
  inclui     = '["Lixagem","Limpeza profunda","Aplicação de 2 demãos de verniz","Acabamento de qualidade"]'::jsonb,
  nao_inclui = '["Fornecimento de verniz (cliente compra — recomendamos)","Reparação de madeira danificada","Substituição de peças"]'::jsonb,
  faq        = '[{"q":"Que verniz?","a":"Varia com uso — pavimento requer verniz resistente, móvel decorativo pode ser mais fino. Aconselhamos."}]'::jsonb
WHERE id = 'pnt-varnish';


-- ═════════════════════════════════════════════════════════════════════
-- DETALHE RICO — ELÉTRICA (17 serviços, 16 fixos + 1 personalizado)
-- ═════════════════════════════════════════════════════════════════════

UPDATE servicos SET
  tagline    = 'Intervenção eléctrica à medida — técnico certificado, segurança garantida.',
  duracao_tipica = 'A combinar (mínimo 1h)',
  inclui     = '["Electricista certificado (carteira CTI)","Ferramenta profissional","Várias tarefas numa visita se possível","Relatório com trabalhos realizados","Garantia 90 dias sobre a mão-de-obra"]'::jsonb,
  nao_inclui = '["Certificação eléctrica (CERTIEL — serviço separado)","Peças especiais (combinamos antes)","Obra civil (abrir/fechar paredes)"]'::jsonb,
  faq        = '[{"q":"Técnico é certificado?","a":"Sim, todos com carteira profissional CTI válida — obrigatório por lei para intervenções eléctricas."}]'::jsonb
WHERE id = 'personalizado-elc';

-- elc-outlet-replace (substituir tomada — popular)
UPDATE servicos SET
  tagline    = 'Substituição de tomada — a tarefa eléctrica mais comum, resolvida em 15-20 min.',
  duracao_tipica = '15-30 min',
  inclui     = '["Corte de corrente no quadro","Remoção da tomada antiga","Instalação da nova (fornecida pelo cliente)","Teste de funcionamento","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento da tomada (cliente compra — standard ou design)","Instalação de tomada nova (ver serviço separado)","Reparação de cablagem danificada"]'::jsonb,
  faq        = '[{"q":"Qualquer tomada?","a":"Sim — standard, Schuko, USB, design. Se for tomada inteligente, confirme compatibilidade."}]'::jsonb
WHERE id = 'elc-outlet-replace';

-- elc-outlet-new (tomada nova)
UPDATE servicos SET
  tagline    = 'Instalação de tomada nova — inclui passagem de cabo até 3m da mais próxima.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Marcação e abertura de caixa","Passagem de cabo até 3m","Ligação ao circuito existente","Instalação da tomada","Teste de funcionamento"]'::jsonb,
  nao_inclui = '["Fornecimento da tomada","Passagem de cabo >3m (custo adicional por metro)","Abertura de roços profundos em alvenaria (orçamento)","Novo circuito do quadro (ver serviço separado)"]'::jsonb,
  faq        = '[{"q":"Requer obra?","a":"Pequena abertura superficial. Para >3m ou passagem complexa, avaliamos no local."}]'::jsonb
WHERE id = 'elc-outlet-new';

-- elc-switch-replace
UPDATE servicos SET
  tagline    = 'Substituição de interruptor — simples, duplo ou cruzamento.',
  duracao_tipica = '15-30 min',
  inclui     = '["Corte de corrente","Remoção e substituição","Teste de funcionamento","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento do interruptor (cliente compra)","Instalação nova (ver serviço)","Interruptores inteligentes de marca específica (consulte)"]'::jsonb,
  faq        = '[{"q":"Interruptor de cruzamento?","a":"Sim, sem custo adicional."}]'::jsonb
WHERE id = 'elc-switch-replace';

-- elc-ceiling-light (candeeiro tecto — popular)
UPDATE servicos SET
  tagline    = 'Instalação de candeeiro de tecto — ligação, fixação, teste.',
  duracao_tipica = '30-45 min',
  inclui     = '["Corte de corrente","Desmontagem do candeeiro antigo (se existir)","Ligação e instalação do novo","Teste de funcionamento","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento do candeeiro","Fixação em tecto falso ou pladur muito delicado (consulte)","Obra para passar cablagem nova"]'::jsonb,
  faq        = '[{"q":"Pesado?","a":"Candeeiros até 10kg sem problema. Acima disso verificamos fixação do tecto."}]'::jsonb
WHERE id = 'elc-ceiling-light';

-- elc-light-point (novo ponto luz)
UPDATE servicos SET
  tagline    = 'Criação de novo ponto de luz — passagem de cabo e interruptor.',
  duracao_tipica = '1h30 - 2h30',
  inclui     = '["Planeamento e marcação","Passagem de cabo até 5m","Instalação de caixa e interruptor","Ligação ao circuito","Teste de funcionamento"]'::jsonb,
  nao_inclui = '["Fornecimento de candeeiro ou lâmpada","Abertura de roços profundos em alvenaria (orçamento)","Cabo >5m (custo adicional)"]'::jsonb,
  faq        = '[{"q":"Requer abrir parede?","a":"Abertura superficial para caixa e cabo. Em tectos falsos é mais fácil."}]'::jsonb
WHERE id = 'elc-light-point';

-- elc-spots (focos embutidos)
UPDATE servicos SET
  tagline    = 'Instalação de focos embutidos LED — até 4 focos no preço base.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Marcação e abertura de furos","Instalação de até 4 focos LED","Ligação ao circuito","Teste de funcionamento","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento dos focos","Focos dimmable ou inteligentes (configuração adicional)","Tecto falso novo (orçamento)"]'::jsonb,
  faq        = '[{"q":"Focos extra?","a":"Até 4 no preço base. Cada adicional €12."}]'::jsonb
WHERE id = 'elc-spots';

-- elc-led-retrofit (eco)
UPDATE servicos SET
  tagline    = 'Substituição de iluminação para LED — poupa até 80% de energia.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Substituição até 10 lâmpadas e/ou candeeiros","Verificação de drivers e compatibilidade","Teste final","Cálculo de poupança estimada"]'::jsonb,
  nao_inclui = '["Fornecimento dos LEDs (cliente compra — aconselhamos)","Alteração de instalação se requerer novos circuitos"]'::jsonb,
  faq        = '[{"q":"Mesmas ligações?","a":"Sim na maioria dos casos. Em fluorescentes, pode ser necessário retirar balastro — incluído."}]'::jsonb
WHERE id = 'elc-led-retrofit';

-- elc-outdoor-light (iluminação exterior)
UPDATE servicos SET
  tagline    = 'Instalação de iluminação exterior — muro, jardim, entrada.',
  duracao_tipica = '1h30 - 2h30',
  inclui     = '["Instalação de 1-2 pontos de luz","Ligação a circuito existente","Material estanque apropriado (IP65+)","Teste final"]'::jsonb,
  nao_inclui = '["Fornecimento dos candeeiros","Passagem de cabo enterrada longa (orçamento)","Sensores de movimento se não incluídos no candeeiro"]'::jsonb,
  faq        = '[{"q":"Com sensor de movimento?","a":"Se o candeeiro tiver integrado, sim. Senão adicionamos sensor externo (custo adicional)."}]'::jsonb
WHERE id = 'elc-outdoor-light';

-- elc-board-new (quadro novo)
UPDATE servicos SET
  tagline    = 'Instalação de quadro eléctrico novo — modernização completa.',
  duracao_tipica = '4h - 6h',
  inclui     = '["Remoção do quadro antigo","Instalação do quadro novo","Diferenciais e disjuntores adequados","Identificação e teste de todos os circuitos","Relatório técnico","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento do quadro e disjuntores (cliente compra — dimensionamos)","Certificação CERTIEL (se pretender, serviço separado)","Passagem de novos circuitos"]'::jsonb,
  faq        = '[{"q":"Corte de corrente quanto tempo?","a":"2-4h típico. Para a maioria das casas, meio-dia é suficiente."}]'::jsonb
WHERE id = 'elc-board-new';

-- elc-certificate (popular)
UPDATE servicos SET
  tagline    = 'Certificação eléctrica (CERTIEL) — obrigatória para compra/venda e escrituras.',
  duracao_tipica = '2h - 3h (+ 2-3 dias emissão)',
  inclui     = '["Inspecção completa à instalação","Testes de segurança e isolamento","Correcção de anomalias simples","Emissão do certificado CERTIEL","Relatório técnico"]'::jsonb,
  nao_inclui = '["Correcção de anomalias graves (orçamento — informamos antes)","Substituição de quadro eléctrico (ver serviço separado)","Taxas CERTIEL (incluídas no preço)"]'::jsonb,
  faq        = '[{"q":"Quanto tempo até receber o certificado?","a":"2-3 dias úteis após inspecção sem anomalias."},{"q":"E se tiver anomalias?","a":"Informamos imediatamente, orçamentamos e, após correcção, emitimos certificado."}]'::jsonb
WHERE id = 'elc-certificate';

-- elc-diag (diagnóstico)
UPDATE servicos SET
  tagline    = 'Diagnóstico de avaria eléctrica — encontramos a causa da falha.',
  duracao_tipica = '45 min - 1h30',
  inclui     = '["Análise da avaria","Testes no quadro e circuitos","Identificação da causa","Relatório com solução recomendada"]'::jsonb,
  nao_inclui = '["Reparação (orçamento após diagnóstico)","Substituição de peças"]'::jsonb,
  faq        = '[{"q":"Depois cobram outra vez se repararem?","a":"Diagnóstico conta como 1ª hora da reparação — não pagam 2x."}]'::jsonb
WHERE id = 'elc-diag';

-- elc-fan-ceiling
UPDATE servicos SET
  tagline    = 'Instalação de ventoinha de tecto — conforto de verão poupando ar condicionado.',
  duracao_tipica = '1h30 - 2h',
  inclui     = '["Desmontagem do candeeiro existente (se aplicável)","Verificação de fixação ao tecto","Instalação da ventoinha","Ligação a interruptor ou controlo remoto","Teste e balanceamento"]'::jsonb,
  nao_inclui = '["Fornecimento da ventoinha","Reforço estrutural do tecto (se necessário, orçamento)","Cablagem nova se não existir ligação"]'::jsonb,
  faq        = '[{"q":"Posso usar ligação do candeeiro existente?","a":"Sim, se a fixação aguentar o peso e vibração. Avaliamos no local."}]'::jsonb
WHERE id = 'elc-fan-ceiling';

-- elc-extractor (extractor WC)
UPDATE servicos SET
  tagline    = 'Instalação de extractor de casa de banho — elimina humidade e odores.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Abertura ou preparação de passagem para conduta","Instalação do extractor","Ligação eléctrica (ligada ao interruptor de luz por defeito)","Teste"]'::jsonb,
  nao_inclui = '["Fornecimento do extractor","Furação externa grande (se necessário, orçamento)","Conduta longa para tecto"]'::jsonb,
  faq        = '[{"q":"Com sensor de humidade?","a":"Se o extractor tiver, configuramos. Se não, podemos adicionar sensor externo (custo adicional)."}]'::jsonb
WHERE id = 'elc-extractor';

-- elc-bell (campainha)
UPDATE servicos SET
  tagline    = 'Substituição de campainha de porta — analógica, digital ou wireless.',
  duracao_tipica = '30-45 min',
  inclui     = '["Remoção da campainha antiga","Instalação da nova (fornecida pelo cliente)","Ligação ao botão exterior","Teste de funcionamento"]'::jsonb,
  nao_inclui = '["Fornecimento da campainha","Substituição de botão exterior (se necessário, avisamos)","Ligação a sistema de videoporteiro (serviço separado)"]'::jsonb,
  faq        = '[{"q":"Wireless mais fácil?","a":"Sim — quando a cablagem da campainha antiga está em mau estado, wireless é a melhor escolha."}]'::jsonb
WHERE id = 'elc-bell';

-- elc-appliance (ligação electrodoméstico fixo)
UPDATE servicos SET
  tagline    = 'Ligação de electrodoméstico fixo (placa, forno, esquentador eléctrico) com segurança.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Verificação do circuito existente","Ligação do electrodoméstico","Verificação de proteções","Teste de funcionamento","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento do electrodoméstico","Instalação de novo circuito (se o existente não tiver capacidade, orçamento)","Obra civil"]'::jsonb,
  faq        = '[{"q":"Placa de indução nova?","a":"Requer circuito dedicado de 32A tipicamente. Verificamos primeiro."}]'::jsonb
WHERE id = 'elc-appliance';


-- ═════════════════════════════════════════════════════════════════════
-- DETALHE RICO — CANALIZAÇÃO (31 serviços, 30 fixos + 1 personalizado)
-- ═════════════════════════════════════════════════════════════════════

UPDATE servicos SET
  tagline    = 'Canalização à medida — várias pequenas tarefas ou problema difícil de classificar.',
  duracao_tipica = 'A combinar (mínimo 1h)',
  inclui     = '["Canalizador profissional com ferramenta completa","Diagnóstico e execução no mesmo dia","Combinação de várias tarefas numa só visita","Facturação ao tempo real trabalhado","Garantia 90 dias sobre mão-de-obra"]'::jsonb,
  nao_inclui = '["Peças grandes de substituição (avisamos antes de comprar)","Obra civil (abrir/fechar paredes com azulejos)","Intervenções na rede pública"]'::jsonb,
  faq        = '[{"q":"Como funciona o preço?","a":"Por hora, com mínimo de 1h. Se a tarefa for rápida, combinamos outras para aproveitar a visita."}]'::jsonb
WHERE id = 'personalizado-can';

-- auto-install
UPDATE servicos SET
  tagline    = 'Instalação de autoclismo novo — montagem, ligação e teste.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Instalação do autoclismo (fornecido pelo cliente)","Ligação à rede de água","Teste de enchimento e descarga","Ajuste de nível","Garantia 90 dias sobre mão-de-obra"]'::jsonb,
  nao_inclui = '["Fornecimento do autoclismo","Remoção do antigo (ver Remover autoclismo se necessário)","Obra em parede (sistema encastrado orçamento)"]'::jsonb,
  faq        = '[{"q":"Autoclismo embutido na parede?","a":"Serviço diferente — orçamento especial devido à complexidade."}]'::jsonb
WHERE id = 'auto-install';

-- seat-repair
UPDATE servicos SET
  tagline    = 'Reparar tampo de sanita — dobradiças, fixação ou amortecedor soft-close.',
  duracao_tipica = '30 min',
  inclui     = '["Diagnóstico","Substituição de dobradiças ou parafusos","Ajuste de amortecedor soft-close se aplicável","Teste final"]'::jsonb,
  nao_inclui = '["Substituição do tampo completo (ver Substituir tampo)","Tampos de marca específica com peças indisponíveis"]'::jsonb,
  faq        = '[{"q":"E se for tampo antigo?","a":"Tentamos reparar. Se peças não existirem, recomendamos substituir."}]'::jsonb
WHERE id = 'seat-repair';

-- seat-replace
UPDATE servicos SET
  tagline    = 'Substituir tampo de sanita — modelo novo, fixação segura.',
  duracao_tipica = '30 min',
  inclui     = '["Remoção do tampo antigo","Instalação do novo (fornecido pelo cliente)","Ajuste e fixação","Teste"]'::jsonb,
  nao_inclui = '["Fornecimento do tampo","Reparação de sanita partida","Tampo de medida especial (consulte)"]'::jsonb,
  faq        = '[{"q":"Tampo universal?","a":"Na maioria das sanitas, sim. Para modelos específicos, medimos antes de comprar."}]'::jsonb
WHERE id = 'seat-replace';

-- toilet-replace
UPDATE servicos SET
  tagline    = 'Substituir sanita — remove antiga, instala nova, selagem profissional.',
  duracao_tipica = '2h',
  inclui     = '["Remoção da sanita antiga","Instalação da sanita nova","Ligação à rede (água e esgoto)","Selagem profissional com silicone","Teste completo de funcionamento","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento da sanita","Retirada da sanita antiga para depósito (com custo adicional)","Alteração de tubagem (orçamento)"]'::jsonb,
  faq        = '[{"q":"Sanita suspensa?","a":"Se tiver estrutura embutida, sim. Se requer obra, orçamento especial."}]'::jsonb
WHERE id = 'toilet-replace';

-- toilet-install
UPDATE servicos SET
  tagline    = 'Instalar sanita nova — ligações hidráulicas e selagem.',
  duracao_tipica = '1h30',
  inclui     = '["Instalação da sanita (fornecida pelo cliente)","Ligação à rede de água e esgoto","Selagem","Teste completo"]'::jsonb,
  nao_inclui = '["Fornecimento da sanita","Remoção da antiga","Obra em pavimento ou azulejos"]'::jsonb,
  faq        = '[{"q":"Necessito de preparação?","a":"Tubagem disponível e acesso limpo. Vemos no formulário se precisa de algo mais."}]'::jsonb
WHERE id = 'toilet-install';

-- toilet-remove
UPDATE servicos SET
  tagline    = 'Remover sanita — para substituição ou renovação do espaço.',
  duracao_tipica = '1h',
  inclui     = '["Desligamento de água","Remoção da sanita","Selagem temporária da saída de esgoto","Limpeza da zona"]'::jsonb,
  nao_inclui = '["Retirada da sanita para depósito (custo adicional por volume)","Remoção de azulejos ou pavimento"]'::jsonb,
  faq        = '[{"q":"Levam a sanita antiga?","a":"Podemos levar, com pequeno custo adicional. Se preferir, deixamos para reciclagem na zona indicada."}]'::jsonb
WHERE id = 'toilet-remove';

-- toilet-unclog
UPDATE servicos SET
  tagline    = 'Desentupir sanita — solução profissional para os casos difíceis.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Diagnóstico","Tentativa de desentupimento por pressão","Uso de varinha ou sonda se necessário","Teste final","Desinfecção"]'::jsonb,
  nao_inclui = '["Desentupimento da rede pública (responsabilidade da câmara)","Substituição de sanita ou tubagem danificada","Abertura de parede ou pavimento"]'::jsonb,
  faq        = '[{"q":"E se for obstrução profunda?","a":"Usamos varinha até 10m. Para redes maiores, pode ser necessário técnico especializado (orçamento)."}]'::jsonb
WHERE id = 'toilet-unclog';

-- bath-tap-repair
UPDATE servicos SET
  tagline    = 'Reparar torneira de casa de banho — pinga, não abre bem ou faz ruído.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Diagnóstico","Substituição de cartucho ou vedantes","Limpeza de mecanismos","Teste final","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Substituição da torneira completa","Obra na parede ou tubagem","Torneiras termostáticas de marca rara (consulte)"]'::jsonb,
  faq        = '[{"q":"Vale a pena reparar?","a":"Para torneiras de qualidade, sim. Se for muito antiga ou de baixa qualidade, recomendamos substituir."}]'::jsonb
WHERE id = 'bath-tap-repair';

-- sink-tap-repair
UPDATE servicos SET
  tagline    = 'Reparar torneira de lava-loiça — solução rápida sem obra.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Diagnóstico","Substituição de cartucho ou vedantes","Limpeza e lubrificação","Teste","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Substituição da torneira completa","Torneiras com função especial (extensível, termostática — consulte)"]'::jsonb,
  faq        = '[{"q":"E se não conseguirem reparar?","a":"Reportamos imediatamente e orçamentamos substituição — descontamos o diagnóstico."}]'::jsonb
WHERE id = 'sink-tap-repair';

-- sink-tap-replace (lavatório)
UPDATE servicos SET
  tagline    = 'Substituir torneira de lavatório — instalação profissional em 45 min.',
  duracao_tipica = '45 min',
  inclui     = '["Remoção da torneira antiga","Instalação da nova (fornecida pelo cliente)","Ligação a flexíveis","Teste de fugas","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento da torneira","Substituição de flexíveis em mau estado (custo pequeno adicional)","Obra em bancada ou lavatório"]'::jsonb,
  faq        = '[{"q":"Recomendam modelo?","a":"Sim — aconselhamos marca e tipo conforme uso e orçamento."}]'::jsonb
WHERE id = 'sink-tap-replace';

-- kitchen-tap-eff (eco)
UPDATE servicos SET
  tagline    = 'Substituir torneira de lava-loiça por modelo eficiente — poupa água e energia.',
  duracao_tipica = '45 min',
  inclui     = '["Instalação de torneira com arejador eficiente","Ligação e teste","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento da torneira (cliente compra — recomendamos)","Substituição de flexíveis antigos (pequeno acréscimo se necessário)"]'::jsonb,
  faq        = '[{"q":"Quanto poupa?","a":"Até 40% de água quente — factura pode baixar €8-15/mês em famílias médias."}]'::jsonb
WHERE id = 'kitchen-tap-eff';

-- bath-tap-eff (eco)
UPDATE servicos SET
  tagline    = 'Substituir torneira de casa de banho por eficiente — poupa sem perder conforto.',
  duracao_tipica = '45 min',
  inclui     = '["Instalação de torneira eficiente","Arejador poupa-água","Teste","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento da torneira","Obra em lavatório"]'::jsonb,
  faq        = '[{"q":"Pressão é igual?","a":"Sim — sente-se igual graças ao arejador, mas usa 40% menos água."}]'::jsonb
WHERE id = 'bath-tap-eff';

-- safety-tap (torneira segurança)
UPDATE servicos SET
  tagline    = 'Substituir torneira de segurança (corte geral) — 20 min, paz de espírito.',
  duracao_tipica = '20-30 min',
  inclui     = '["Corte de água na rede","Substituição da torneira de segurança","Teste"]'::jsonb,
  nao_inclui = '["Fornecimento da torneira","Substituição de tubagem"]'::jsonb,
  faq        = '[{"q":"Quando substituir?","a":"Se não fechar bem, pingar, ou se não souberem a última vez que funcionou bem — é peça crítica."}]'::jsonb
WHERE id = 'safety-tap';

-- bath-tap-install (torneira banheira)
UPDATE servicos SET
  tagline    = 'Instalar torneira de banheira — para renovar o banho completo.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Remoção da torneira antiga","Instalação da nova","Ligação a sistema de chuveiro se aplicável","Teste"]'::jsonb,
  nao_inclui = '["Fornecimento da torneira","Obra em azulejos","Substituição de cabine ou banheira"]'::jsonb,
  faq        = '[{"q":"Com coluna de duche?","a":"Adicionamos se pretender — custo adicional depende do modelo."}]'::jsonb
WHERE id = 'bath-tap-install';

-- leak-diagnosis
UPDATE servicos SET
  tagline    = 'Diagnóstico de fuga de água — identifica origem sem partir paredes.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Inspecção visual detalhada","Teste de pressão na tubagem","Detecção por método não destrutivo","Relatório com origem e recomendação"]'::jsonb,
  nao_inclui = '["Reparação (orçamento após diagnóstico — descontamos diagnóstico se avançar)","Detecção com equipamento profundo (termografia) em casos difíceis"]'::jsonb,
  faq        = '[{"q":"Funciona mesmo sem partir parede?","a":"Em 80% dos casos sim. Para detecção profunda avaliamos se precisamos de técnico especial."}]'::jsonb
WHERE id = 'leak-diagnosis';

-- sink-leak (lavatório)
UPDATE servicos SET
  tagline    = 'Fuga de água no lavatório — sifão, flexível ou válvula.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Diagnóstico","Reparação ou substituição de sifão/flexível/válvula","Selagem profissional","Teste","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Substituição completa do lavatório","Obra em parede para tubagem escondida"]'::jsonb,
  faq        = '[{"q":"E se for no rebordo do lavatório?","a":"Se for selagem de silicone, incluído. Se for rachadura, orçamento de substituição."}]'::jsonb
WHERE id = 'sink-leak';

-- shower-leak
UPDATE servicos SET
  tagline    = 'Reparar fuga de água em cabine de duche — selagem, vedantes, portas.',
  duracao_tipica = '3h - 4h',
  inclui     = '["Diagnóstico da origem","Substituição de vedantes","Selagem profissional com silicone sanitário","Reparação de ferragens se necessário","Teste"]'::jsonb,
  nao_inclui = '["Substituição completa da cabine (ver Substituir cabine)","Obra em azulejos","Substituição de vidro partido"]'::jsonb,
  faq        = '[{"q":"Fuga para a casa de banho ou para o vizinho?","a":"Avaliamos. Se for para o vizinho, documentamos com fotos para seguro."}]'::jsonb
WHERE id = 'shower-leak';

-- kitchen-unclog
UPDATE servicos SET
  tagline    = 'Desentupir lava-loiça — remove gorduras e restos acumulados.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Diagnóstico","Desentupimento com ventosa ou varinha","Limpeza do sifão","Teste com enchimento","Desinfecção"]'::jsonb,
  nao_inclui = '["Desentupimento da rede pública","Substituição de tubagem em mau estado (orçamento)","Remoção de acessórios embutidos"]'::jsonb,
  faq        = '[{"q":"Evita voltar a entupir?","a":"Damos conselhos sobre o que evitar deitar. Obstruções profundas podem requerer limpeza preventiva anual."}]'::jsonb
WHERE id = 'kitchen-unclog';

-- bathroom-unclog
UPDATE servicos SET
  tagline    = 'Desentupir casa de banho — lavatório, chuveiro ou ralo de chão.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Diagnóstico da obstrução","Desentupimento por pressão ou varinha","Limpeza do sifão ou ralo","Teste final","Desinfecção"]'::jsonb,
  nao_inclui = '["Rede pública (câmara)","Substituição de tubagem ou ralo","Desentupimento de sanita (ver Desentupir sanita)"]'::jsonb,
  faq        = '[{"q":"Também sanita?","a":"Não — para sanita ver o serviço Desentupir sanita."}]'::jsonb
WHERE id = 'bathroom-unclog';

-- valve-replace (válvula lavatório)
UPDATE servicos SET
  tagline    = 'Substituir válvula de lavatório — válvula click-clack ou standard.',
  duracao_tipica = '30 min',
  inclui     = '["Remoção da válvula antiga","Instalação da nova","Selagem","Teste"]'::jsonb,
  nao_inclui = '["Fornecimento da válvula","Reparação de lavatório rachado"]'::jsonb,
  faq        = '[{"q":"Válvula click-clack ou com cadeia?","a":"Qualquer uma — indique o modelo quando pedir para comprarmos ou traga-a."}]'::jsonb
WHERE id = 'valve-replace';

-- vanity-replace (móvel lavatório)
UPDATE servicos SET
  tagline    = 'Substituir móvel de lavatório — remoção e instalação completas.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Remoção do móvel antigo","Instalação do novo (fornecido pelo cliente)","Ligações hidráulicas (lavatório + torneira)","Selagem","Teste"]'::jsonb,
  nao_inclui = '["Fornecimento do móvel","Obra civil (azulejos, parede)","Remoção de móvel antigo para depósito"]'::jsonb,
  faq        = '[{"q":"Com torneira nova?","a":"Se fornecer, instalamos sem custo adicional no mesmo serviço."}]'::jsonb
WHERE id = 'vanity-replace';

-- vanity-install
UPDATE servicos SET
  tagline    = 'Instalar móvel de lavatório novo — do desempacotar ao teste.',
  duracao_tipica = '1h30 - 2h',
  inclui     = '["Desempacotagem","Montagem do móvel","Instalação no local","Ligações hidráulicas","Selagem","Teste"]'::jsonb,
  nao_inclui = '["Fornecimento","Remoção de móvel existente (ver serviço separado)"]'::jsonb,
  faq        = '[{"q":"Já tenho lavatório — só falta móvel?","a":"Sem problema — adaptamos as ligações."}]'::jsonb
WHERE id = 'vanity-install';

-- shower-column
UPDATE servicos SET
  tagline    = 'Substituir coluna de duche — upgrade do chuveiro com novo modelo.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Remoção da coluna antiga","Instalação da nova (fornecida pelo cliente)","Ligação e teste","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento da coluna","Obra em azulejos","Alteração de ligação à torneira se incompatível (pequeno acréscimo)"]'::jsonb,
  faq        = '[{"q":"Com termostática?","a":"Se incluída, instalamos e calibramos."}]'::jsonb
WHERE id = 'shower-column';

-- shower-cabin
UPDATE servicos SET
  tagline    = 'Substituir cabine de duche — remoção e instalação completas.',
  duracao_tipica = '5h - 7h',
  inclui     = '["Remoção da cabine antiga","Preparação da base","Instalação da cabine nova (fornecida pelo cliente)","Ligações hidráulicas","Selagem profissional","Teste completo","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento da cabine","Obra em azulejos ou pavimento","Alteração de tubagem (orçamento)","Remoção de entulho (ver Pós-Obra)"]'::jsonb,
  faq        = '[{"q":"Base de duche também?","a":"Incluída se na mesma intervenção. Em casos complexos com obra, orçamento."}]'::jsonb
WHERE id = 'shower-cabin';

-- tub-to-shower (banheira→duche)
UPDATE servicos SET
  tagline    = 'Substituir banheira por duche — renovação completa de casa de banho em 1 dia.',
  duracao_tipica = '1-2 dias',
  inclui     = '["Remoção da banheira","Preparação do espaço (ajustes de tubagem, esgoto)","Instalação de base de duche","Instalação de cabine ou painéis (cliente fornece)","Azulejos padrão de reparação","Selagem completa","Teste","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento de base e cabine","Renovação completa de azulejos da casa de banho (orçamento)","Alteração estrutural grande","Remoção de entulho pesado (pode ser necessário contentor)"]'::jsonb,
  faq        = '[{"q":"Preço pode variar?","a":"Sim — depende muito do estado da tubagem, azulejos adjacentes e complexidade. Este preço é para casos standard. Visita técnica antes recomendada."}]'::jsonb
WHERE id = 'tub-to-shower';

-- shower-head-eff (eco)
UPDATE servicos SET
  tagline    = 'Substituir chuveiro por modelo eficiente — mesmo conforto, metade da água.',
  duracao_tipica = '30 min',
  inclui     = '["Remoção do chuveiro antigo","Instalação do novo eficiente","Teste","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento do chuveiro (cliente compra — recomendamos)","Substituição completa de coluna (ver serviço separado)"]'::jsonb,
  faq        = '[{"q":"Poupo mesmo?","a":"Sim — até 50% de água. Família média poupa €50-100/ano só em água quente."}]'::jsonb
WHERE id = 'shower-head-eff';

-- grout-replace (substituir juntas)
UPDATE servicos SET
  tagline    = 'Substituir juntas de azulejos — elimina mofo, impede infiltrações.',
  duracao_tipica = '2h - 3h por 5m²',
  inclui     = '["Remoção de juntas antigas","Limpeza da ranhura","Aplicação de junta nova anti-fungos","Limpeza final","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Substituição de azulejos partidos","Obra estrutural","Tratamento de humidade estrutural (ver Anti-humidade)"]'::jsonb,
  faq        = '[{"q":"Mínimo para fazer sentido?","a":"~5m². Tipicamente casa de banho inteira ou zona do chuveiro."}]'::jsonb
WHERE id = 'grout-replace';


-- kitchen-leak (P2, popular)
UPDATE servicos SET
  tagline    = 'Fuga de água no lava-loiça — a segunda causa mais comum de chamadas de canalização.',
  duracao_tipica = '45 min - 1h15',
  inclui     = '["Diagnóstico","Reparação ou substituição de sifão, flexível ou válvula","Verificação de selagem da banca","Teste completo","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Substituição da banca ou lava-loiça","Obra em armário de cozinha","Rede pública"]'::jsonb,
  faq        = '[{"q":"E se for difícil chegar?","a":"Desmontamos o mínimo necessário para aceder e remontamos no fim."}]'::jsonb
WHERE id = 'kitchen-leak';

-- ═════════════════════════════════════════════════════════════════════
-- DETALHE RICO — PÓS-OBRA (12 serviços, 11 fixos + 1 personalizado)
-- ═════════════════════════════════════════════════════════════════════

UPDATE servicos SET
  tagline    = 'Acabamento pós-obra à medida — limpeza + retoques + entulho conforme precisar.',
  duracao_tipica = 'A combinar (mínimo 2h)',
  inclui     = '["Equipa especializada em pós-obra","Equipamento profissional (aspiradores HEPA, máquinas de polimento)","Combinação de tarefas numa intervenção","Facturação ao tempo real"]'::jsonb,
  nao_inclui = '["Remoção de entulho pesado em grandes volumes (ver serviço separado)","Reparação de obra (é pós-obra, não obra)","Materiais de substituição ou reposição"]'::jsonb,
  faq        = '[{"q":"Faz-se no mesmo dia?","a":"Obras pequenas sim. Obras grandes podem exigir 1-2 dias — combinamos na visita."}]'::jsonb
WHERE id = 'personalizado-pos';

-- pos-clean-t1
UPDATE servicos SET
  tagline    = 'Limpeza completa pós-obra T0/T1 — remove pó, cimento e resíduos finos.',
  duracao_tipica = '4h - 5h',
  inclui     = '["Aspiração profunda com HEPA (filtração fina)","Remoção de resíduos de cimento, tinta e silicone","Limpeza de vidros, caixilhos e estores","Desinfecção profunda de casa de banho e cozinha","Limpeza de interiores de armários","Produtos industriais adequados"]'::jsonb,
  nao_inclui = '["Remoção de entulho pesado (ver serviço separado)","Retoques de pintura","Reparação de acabamentos"]'::jsonb,
  faq        = '[{"q":"É só uma vez?","a":"Pós-obra é limpeza profunda após obra. Para manutenção regular, ver Limpeza na categoria Limpeza."}]'::jsonb
WHERE id = 'pos-clean-t1';

-- pos-clean-t3
UPDATE servicos SET
  tagline    = 'Limpeza completa pós-obra T3 — equipa reforçada para dia completo.',
  duracao_tipica = '6h - 8h',
  inclui     = '["2-3 técnicos em simultâneo","Aspiração HEPA em toda a casa","Limpeza de vidros, caixilhos, estores, rodapés","Desinfecção profunda","Limpeza de interiores de armários","Produtos industriais adequados"]'::jsonb,
  nao_inclui = '["Remoção de entulho pesado","Retoques de pintura","Reparação de obra"]'::jsonb,
  faq        = '[{"q":"Até que ponto limpam?","a":"Deixamos pronto a habitar. Se restar pó fino em 1-2 dias, reportamos visita de retoque gratuita."}]'::jsonb
WHERE id = 'pos-clean-t3';

-- pos-clean-t4
UPDATE servicos SET
  tagline    = 'Limpeza completa pós-obra T4+ ou moradia — equipa dedicada, dia cheio ou 2.',
  duracao_tipica = '8h - 12h',
  inclui     = '["3 técnicos em simultâneo","Aspiração HEPA","Limpeza completa de todos os espaços","Desinfecção profunda","Interiores de armários","Produtos industriais"]'::jsonb,
  nao_inclui = '["Remoção de entulho pesado","Retoques de pintura","Limpeza de áreas exteriores (terraço, jardim)"]'::jsonb,
  faq        = '[{"q":"Em quantos dias?","a":"Normalmente 1 dia completo. Para moradias muito grandes, 2 dias."}]'::jsonb
WHERE id = 'pos-clean-t4';

-- pos-clean-comm (comercial por m²)
UPDATE servicos SET
  tagline    = 'Limpeza pós-obra de espaço comercial (por m²) — escritórios, lojas, restaurantes.',
  duracao_tipica = 'Consulte segundo área',
  inclui     = '["Aspiração HEPA de toda a área","Limpeza de vidros e montras","Desinfecção de casas de banho e copas","Remoção de resíduos finos","Produtos industriais adequados"]'::jsonb,
  nao_inclui = '["Remoção de entulho (ver serviço separado)","Limpeza de equipamento industrial específico","Abrilhantamento de pavimentos (serviço separado)"]'::jsonb,
  faq        = '[{"q":"Trabalham à noite?","a":"Sim — para espaços comerciais, fim-de-semana ou noite sem custo extra se agendado com antecedência."}]'::jsonb
WHERE id = 'pos-clean-comm';

-- pos-windows (vidros pós-obra)
UPDATE servicos SET
  tagline    = 'Limpeza de vidros pós-obra — remove tinta, cimento e argamassa.',
  duracao_tipica = '1h30 - 2h30',
  inclui     = '["Remoção de tinta e argamassa dos vidros","Limpeza de caixilhos","Polimento final","Produtos específicos para pós-obra"]'::jsonb,
  nao_inclui = '["Vidros em altura >2º andar (orçamento especial)","Vidros danificados ou riscados (sem garantia de remoção total)","Substituição de vidros"]'::jsonb,
  faq        = '[{"q":"Remove cimento queimado?","a":"Sim na maioria dos casos. Em resíduos muito antigos ou queimados, o resultado pode ser parcial — avaliamos antes."}]'::jsonb
WHERE id = 'pos-windows';

-- pos-debris-s (entulho pequeno)
UPDATE servicos SET
  tagline    = 'Remoção de entulho pequeno (<1m³) — saco grande, transporte e depósito em aterro.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Sacos big-bag ou contentor pequeno","Carregamento manual","Transporte e depósito em aterro autorizado","Guia de remoção"]'::jsonb,
  nao_inclui = '["Resíduos perigosos (amianto, químicos — serviço especializado)","Desmontagem de estruturas","Acesso difícil requerendo equipamento especial"]'::jsonb,
  faq        = '[{"q":"Que volumes é 1m³?","a":"Aproximadamente 1 saco big-bag — cabe numa carrinha pequena."}]'::jsonb
WHERE id = 'pos-debris-s';

-- pos-debris-m (entulho médio)
UPDATE servicos SET
  tagline    = 'Remoção de entulho médio (1-3m³) — contentor apropriado, transporte incluído.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Contentor de 3m³ ou múltiplos big-bags","Carregamento (2 técnicos)","Transporte e depósito em aterro autorizado","Guia de remoção"]'::jsonb,
  nao_inclui = '["Resíduos perigosos","Desmontagem de estruturas","Obras parciais (remoção parcial de parede — orçamento)"]'::jsonb,
  faq        = '[{"q":"Acesso com contentor ok?","a":"Verificamos acesso antes — pode ser necessária autorização da câmara para colocar contentor na via pública."}]'::jsonb
WHERE id = 'pos-debris-m';

-- pos-protect-floor (protecção pavimento)
UPDATE servicos SET
  tagline    = 'Protecção de pavimento para obra — por m², evita danos durante intervenções.',
  duracao_tipica = 'Consulte segundo área',
  inclui     = '["Aplicação de cartão ou plástico profissional","Fixação com fita","Remoção no fim da obra"]'::jsonb,
  nao_inclui = '["Reparação de danos anteriores","Encerado após remoção (ver serviço separado)","Materiais premium à medida"]'::jsonb,
  faq        = '[{"q":"Funciona em madeira?","a":"Sim — usamos protecção adequada para soalho delicado sem marcar."}]'::jsonb
WHERE id = 'pos-protect-floor';

-- pos-paint-touch (retoques pintura pós-obra)
UPDATE servicos SET
  tagline    = 'Retoques de pintura pós-obra — pequenos arranhões e marcas após a obra.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Pintor com kit de retoque","Limpeza dos pontos a retocar","Betumagem de pequenos defeitos","Aplicação de tinta com igualação de cor","Até 10 pontos incluídos"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (normalmente sobras da obra original)","Pintura de divisões inteiras (ver Pintura)","Reparação de fissuras grandes"]'::jsonb,
  faq        = '[{"q":"Tinta da obra original?","a":"Idealmente sim — se não tiver, igualamos cor o melhor possível mas pode notar-se ligeiramente."}]'::jsonb
WHERE id = 'pos-paint-touch';

-- pos-silicone (silicone pós-obra)
UPDATE servicos SET
  tagline    = 'Acabamento de silicones e vedantes pós-obra — juntas impecáveis em todo o espaço.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Silicone sanitário anti-fungos","Aplicação em banca, lava-loiça, azulejos, banheira, cabine","Remoção de silicone mal aplicado","Acabamento profissional","Até 10m incluídos"]'::jsonb,
  nao_inclui = '["Reparação de fissuras estruturais","Substituição de juntas de azulejos (ver serviço separado)"]'::jsonb,
  faq        = '[{"q":"Quanto tempo a secar?","a":"24h para secagem completa. Pode usar com cuidado ao fim de 6h."}]'::jsonb
WHERE id = 'pos-silicone';


-- ═════════════════════════════════════════════════════════════════════
-- 15. AGRUPAMENTO POR TIPOLOGIA/TAMANHO — 9 grupos pai
-- ═════════════════════════════════════════════════════════════════════
-- Pattern: progressive disclosure. A lista mostra "Limpeza doméstica regular
-- desde €35,91", o cliente toca e só aí escolhe tipologia. Reduz ruído visual
-- e baixa a barreira de exploração.
--
-- Schema: acrescenta servico_pai_id à tabela servicos. Os 9 "pais" são serviços
-- com tipo='grupo' — não são reserváveis directamente. Os filhos mantêm todos
-- os seus dados (inclui/nao_inclui/faq) e são os que entram na ordem.
--
-- No ecrã de lista: WHERE servico_pai_id IS NULL → só pais + serviços "soltos".
-- No ecrã de seletor de variante: WHERE servico_pai_id = 'cln-home' → filhos.
-- ═════════════════════════════════════════════════════════════════════

-- 15.1 Coluna nova (idempotente)
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS servico_pai_id TEXT REFERENCES servicos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_servicos_pai ON servicos(servico_pai_id) WHERE servico_pai_id IS NOT NULL;

-- 15.2 Inserir os 9 serviços-pai (tipo='grupo', preço = mínimo dos filhos)
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  -- LIMPEZA
  ('cln-home',     'limpeza',     'cln_regular',    'Limpeza doméstica',           35.91,  39.90,  'grupo', TRUE,  FALSE, 1),
  ('cln-deep',     'limpeza',     'cln_profunda',   'Limpeza profunda',            62.91,  69.90,  'grupo', TRUE,  FALSE, 7),
  ('cln-sofa',     'limpeza',     'cln_texteis',    'Limpeza de sofá',             49.41,  54.90,  'grupo', FALSE, FALSE, 11),
  ('cln-mattress', 'limpeza',     'cln_texteis',    'Higienização de colchão',     26.91,  29.90,  'grupo', FALSE, FALSE, 14),
  -- JARDIM
  ('jar-mow',      'jardim',      'jar_corte',      'Corte de relva',              26.91,  29.90,  'grupo', TRUE,  FALSE, 1),
  ('jar-maint',    'jardim',      'jar_corte',      'Manutenção mensal de jardim', 53.91,  59.90,  'grupo', TRUE,  FALSE, 4),
  -- PISCINA
  ('pol-maint',    'piscina',     'pol_manutencao', 'Manutenção mensal de piscina',62.91,  69.90,  'grupo', TRUE,  FALSE, 3),
  -- PINTURA
  ('pnt-apt',      'pintura',     'pnt_interior',   'Pintura de apartamento completo', 494.91, 549.90, 'grupo', TRUE, FALSE, 5),
  -- PÓS-OBRA
  ('pos-clean',    'pos_obra',    'pos_limpeza',    'Limpeza pós-obra',            134.91, 149.90, 'grupo', TRUE,  FALSE, 1)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  tipo = EXCLUDED.tipo, popular = EXCLUDED.popular, ordem = EXCLUDED.ordem, updated_at = NOW();

-- 15.3 Detalhe rico dos 9 pais — texto comercial que introduz o grupo
UPDATE servicos SET
  tagline    = 'A limpeza regular ideal para a sua casa — escolha a tipologia no próximo ecrã.',
  duracao_tipica = 'Varia com tipologia (2h - 5h)',
  inclui     = '["Aspiração e lavagem de pavimentos em todas as divisões","Desinfecção de casas de banho","Remoção de pó em todas as divisões","Limpeza exterior de mobiliário e cozinha","Troca de sacos do lixo e cama se preparada","Produtos e equipamento profissional incluídos"]'::jsonb,
  nao_inclui = '["Lavagem de loiça","Engomadoria","Limpeza de vidros (ver serviço dedicado)","Limpeza profunda de electrodomésticos (serviços separados)"]'::jsonb,
  faq        = '[{"q":"Como escolho a tipologia?","a":"T0/T1 até 60m², T2 60-90m², T3 90-120m², T4+ acima. Se tiver dúvida, escolha pela área aproximada."},{"q":"Posso tornar recorrente?","a":"Sim — há desconto em packs mensais e mantemos a mesma técnica."},{"q":"Tenho de fornecer produtos?","a":"Não — a técnica traz tudo o que precisa."}]'::jsonb
WHERE id = 'cln-home';

UPDATE servicos SET
  tagline    = 'Renovação total — para mudanças, pós-obra ligeira ou 1-2x/ano.',
  duracao_tipica = 'Varia com tipologia (4h - 8h)',
  inclui     = '["Tudo da limpeza regular + extras","Interior de armários (cozinha e roupeiros)","Descalcificação de torneiras e azulejos","Rodapés, caixilhos, estores, portas","Desinfecção final com produto profissional","Garantia — se ficar algo por limpar, voltamos em 48h"]'::jsonb,
  nao_inclui = '["Interior do forno ou frigorífico a fundo (serviços separados)","Lavagem de estofos e colchões (ver Têxteis)","Vidros exteriores em altura"]'::jsonb,
  faq        = '[{"q":"Com que frequência?","a":"1-2x/ano para casas normais, ou em mudanças e pós-obras."},{"q":"Posso morar durante?","a":"Sim — trabalhamos divisão a divisão e coordenamos com o residente."}]'::jsonb
WHERE id = 'cln-deep';

UPDATE servicos SET
  tagline    = 'Sofá como novo — remove ácaros, odores e manchas superficiais.',
  duracao_tipica = 'Varia com dimensão (1h - 2h)',
  inclui     = '["Aspiração profunda de tecido","Tratamento higienizante profissional","Máquina de injecção-extracção","Tratamento anti-ácaros","Secagem acelerada (2-4h)"]'::jsonb,
  nao_inclui = '["Sofás em pele (tratamento específico, consulte)","Manchas muito antigas ou impregnadas","Reparação de tecido danificado"]'::jsonb,
  faq        = '[{"q":"Tempo até poder usar?","a":"2-4h após. Ideal deixar secar durante a noite."},{"q":"Funciona em qualquer tecido?","a":"Tecidos standard sim. Pele ou alcântara requerem tratamento específico."}]'::jsonb
WHERE id = 'cln-sofa';

UPDATE servicos SET
  tagline    = 'Colchão higienizado — elimina ácaros, suor e odores acumulados.',
  duracao_tipica = '45 min - 1h',
  inclui     = '["Aspiração profunda anti-ácaros","Tratamento higienizante profissional","Extracção de humidade residual","Tratamento UV opcional"]'::jsonb,
  nao_inclui = '["Remoção de manchas orgânicas antigas (sem garantia total)","Reparação do colchão"]'::jsonb,
  faq        = '[{"q":"Com que frequência?","a":"1x/ano uso regular, 2x/ano se alergias ou crianças."},{"q":"Colchão viscoelástico/memória?","a":"Sim, usamos método adequado sem o danificar."}]'::jsonb
WHERE id = 'cln-mattress';

UPDATE servicos SET
  tagline    = 'Corte uniforme, profissional, com remoção do material cortado.',
  duracao_tipica = 'Varia com área (30 min - 3h30)',
  inclui     = '["Corte uniforme com máquina profissional","Aparo de cantos e bordas","Remoção do material cortado","Combustível e equipamento incluídos","Limpeza da zona no fim"]'::jsonb,
  nao_inclui = '["Escarificação (serviço separado)","Poda de árvores ou sebes","Tratamento anti-musgo ou fertilização"]'::jsonb,
  faq        = '[{"q":"Frequência ideal?","a":"Primavera/verão a cada 10-15 dias, outono/inverno a cada 3-4 semanas."},{"q":"E se chover?","a":"Reagendamos sem custo — relva molhada corta-se mal."}]'::jsonb
WHERE id = 'jar-mow';

UPDATE servicos SET
  tagline    = 'Jardim sempre cuidado — plano mensal com o mesmo jardineiro.',
  duracao_tipica = 'Varia com dimensão (2h - 6h)',
  inclui     = '["Corte de relva","Poda ligeira de arbustos e sebes pequenas","Limpeza de canteiros e ervas daninhas","Remoção de resíduos","Verificação de rega e plantas","Mesmo jardineiro sempre que possível"]'::jsonb,
  nao_inclui = '["Poda de árvores grandes (serviço separado)","Plantação nova","Tratamentos fitossanitários especializados","Sistemas de rega (ver Rega)"]'::jsonb,
  faq        = '[{"q":"Contrato fixo?","a":"Plano mensal com desconto ou avulso. Flexível."},{"q":"E se faltar um mês?","a":"Reagendamos sem custo — o jardim mantém-se cuidado."}]'::jsonb
WHERE id = 'jar-maint';

UPDATE servicos SET
  tagline    = 'Água cristalina, equipamento cuidado — 4 visitas por mês.',
  duracao_tipica = '4 visitas/mês (1h - 2h cada)',
  inclui     = '["4 visitas mensais","Análise e correcção química","Aspiração e limpeza","Limpeza da linha de água e skimmers","Retrolavagem do filtro","Produtos químicos básicos","Verificação de equipamento"]'::jsonb,
  nao_inclui = '["Reparações de equipamento avariado (orçamento)","Abertura/fecho de época (serviços separados)","Tratamento de choque após tempestade/festa"]'::jsonb,
  faq        = '[{"q":"Tempestade, vêm extra?","a":"Sim — emergências climáticas têm visita de recuperação com desconto."},{"q":"Plano anual?","a":"Sim, 12 meses com desconto adicional."}]'::jsonb
WHERE id = 'pol-maint';

UPDATE servicos SET
  tagline    = 'Casa renovada de uma só vez — todas as paredes, dois demãos.',
  duracao_tipica = 'Varia com tipologia (2-6 dias úteis)',
  inclui     = '["Protecção completa de móveis e pavimentos","Lixagem e betumagem de paredes","Primário onde necessário","2 demãos de tinta standard (branca ou cor clara)","Rodapés, caixilhos e cantos","Limpeza final completa","Garantia 90 dias"]'::jsonb,
  nao_inclui = '["Fornecimento de tinta (cliente compra — aconselhamos marca e quantidade)","Pintar tectos (serviço separado)","Pintar portas (serviço separado)","Fissuras estruturais ou humidade (orçamento)"]'::jsonb,
  faq        = '[{"q":"Posso morar em casa durante?","a":"Sim — trabalhamos divisão a divisão e coordenamos com o residente."},{"q":"Cores diferentes por divisão?","a":"Sim, sem custo extra se forem cores standard."},{"q":"Quanta tinta comprar?","a":"Indicamos a quantidade exacta quando confirmar a tipologia."}]'::jsonb
WHERE id = 'pnt-apt';

UPDATE servicos SET
  tagline    = 'Casa pronta a habitar depois da obra — remove pó, cimento, tinta seca.',
  duracao_tipica = 'Varia com tipologia (4h - 12h)',
  inclui     = '["Aspiração HEPA (filtragem fina adequada a pó de obra)","Remoção de resíduos de cimento, tinta e silicone","Limpeza de vidros, caixilhos e estores","Desinfecção profunda de casa de banho e cozinha","Limpeza de interiores de armários","Produtos industriais adequados"]'::jsonb,
  nao_inclui = '["Remoção de entulho pesado (serviço separado)","Retoques de pintura (serviço separado)","Reparação de acabamentos ou obra"]'::jsonb,
  faq        = '[{"q":"Quando agendar?","a":"Depois de toda a obra terminada, com canalização e electricidade ligadas."},{"q":"E se ficar pó fino depois?","a":"Reporte em 48h — voltamos gratuitamente para retificar."}]'::jsonb
WHERE id = 'pos-clean';

-- 15.4 Apontar os filhos aos pais
UPDATE servicos SET servico_pai_id = 'cln-home' WHERE id IN ('cln-home-t1','cln-home-t2','cln-home-t3','cln-home-t4');
UPDATE servicos SET servico_pai_id = 'cln-deep' WHERE id IN ('cln-deep-t1','cln-deep-t2','cln-deep-t3','cln-deep-t4');
UPDATE servicos SET servico_pai_id = 'cln-sofa' WHERE id IN ('cln-sofa-2','cln-sofa-3','cln-sofa-L');
UPDATE servicos SET servico_pai_id = 'cln-mattress' WHERE id IN ('cln-mattress-s','cln-mattress-d');
UPDATE servicos SET servico_pai_id = 'jar-mow' WHERE id IN ('jar-mow-s','jar-mow-m','jar-mow-l');
UPDATE servicos SET servico_pai_id = 'jar-maint' WHERE id IN ('jar-maint-s','jar-maint-m','jar-maint-l');
UPDATE servicos SET servico_pai_id = 'pol-maint' WHERE id IN ('pol-maint-s','pol-maint-m','pol-maint-l');
UPDATE servicos SET servico_pai_id = 'pnt-apt' WHERE id IN ('pnt-apt-t1','pnt-apt-t2','pnt-apt-t3');
UPDATE servicos SET servico_pai_id = 'pos-clean' WHERE id IN ('pos-clean-t1','pos-clean-t2','pos-clean-t3','pos-clean-t4');

-- 15.5 Verificação
-- SELECT id, nome, preco, servico_pai_id, popular, tipo FROM servicos
-- WHERE id LIKE 'cln-home%' ORDER BY ordem;
-- Expected: cln-home (grupo, preço 35.91, sem pai) + 4 filhos (cln-home-t1..t4 com servico_pai_id='cln-home')

-- ═════════════════════════════════════════════════════════════════════
-- 16. LIMPEZA DE MUDANÇA — novo grupo cln-move + 4 variantes
-- ═════════════════════════════════════════════════════════════════════
-- Limpeza de entrada/saída de casa — casa vazia, acabamento meticuloso
-- do essencial (vidros, interior de armários, sanitários, cozinha).
-- Diferente da limpeza profunda (casa habitada, 1-2x/ano).
-- ═════════════════════════════════════════════════════════════════════

-- 16.1 Serviço-pai
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  ('cln-move', 'limpeza', 'cln_regular', 'Limpeza de mudança', 59.90, 69.90, 'grupo', FALSE, FALSE, 5)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  tipo = EXCLUDED.tipo, ordem = EXCLUDED.ordem, updated_at = NOW();

-- 16.2 Variantes (filhos)
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem, servico_pai_id) VALUES
  ('cln-move-t1', 'limpeza', 'cln_regular', 'Limpeza de mudança T0/T1', 59.90,  69.90,  'fixo', FALSE, FALSE, 1, 'cln-move'),
  ('cln-move-t2', 'limpeza', 'cln_regular', 'Limpeza de mudança T2',    79.90,  89.90,  'fixo', TRUE,  FALSE, 2, 'cln-move'),
  ('cln-move-t3', 'limpeza', 'cln_regular', 'Limpeza de mudança T3',    99.90, 113.90,  'fixo', FALSE, FALSE, 3, 'cln-move'),
  ('cln-move-t4', 'limpeza', 'cln_regular', 'Limpeza de mudança T4+',  129.90, 149.90,  'fixo', FALSE, FALSE, 4, 'cln-move')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, servico_pai_id = EXCLUDED.servico_pai_id, updated_at = NOW();

-- 16.3 Detalhe rico do pai
UPDATE servicos SET
  tagline    = 'Casa vazia impecável — para entrega a novo inquilino ou mudança para casa nova.',
  duracao_tipica = 'Varia com tipologia (3h - 7h)',
  inclui     = '["Aspiração completa de pavimentos","Limpeza profunda de casas de banho e cozinha","Interior de todos os armários e roupeiros vazios","Limpeza de vidros, caixilhos e estores","Rodapés, portas, maçanetas e interruptores","Produtos e equipamento profissional incluídos","Fotografias antes/depois para acordo de entrega"]'::jsonb,
  nao_inclui = '["Remoção de entulho ou mobiliário pesado (ver Pós-Obra)","Pequenas reparações (ver Manutenção)","Pintura ou retoques","Limpeza de estofos (se ficaram)"]'::jsonb,
  faq        = '[{"q":"Quando agendar?","a":"Casa já vazia e chaves disponíveis. Idealmente 1-2 dias antes da entrega ao novo inquilino ou antes da mudança entrar."},{"q":"Emitem fotos para o senhorio?","a":"Sim — relatório fotográfico final que pode enviar ao senhorio como prova do estado de entrega."},{"q":"Diferença para limpeza profunda?","a":"Mudança é em casa vazia (mais rápido, foca-se no essencial). Profunda é em casa habitada (demora mais por causa dos móveis)."}]'::jsonb
WHERE id = 'cln-move';

-- 16.4 Detalhe rico dos filhos (um em cada, focado na tipologia)
UPDATE servicos SET
  tagline    = 'Limpeza de mudança T0/T1 — apartamento até 60m² pronto a entregar em meio-dia.',
  duracao_tipica = '3h - 4h',
  inclui     = '["Aspiração completa","Casa de banho e cozinha profundas","Interior de armários vazios","Vidros e caixilhos","Rodapés e portas","Produtos incluídos","Relatório fotográfico final"]'::jsonb,
  nao_inclui = '["Remoção de entulho","Pequenas reparações","Limpeza de estofos ou colchões"]'::jsonb,
  faq        = '[{"q":"Casa já tem de estar vazia?","a":"Sim — idealmente sem qualquer móvel. Se houver poucas peças avisar antecipadamente."}]'::jsonb
WHERE id = 'cln-move-t1';

UPDATE servicos SET
  tagline    = 'Limpeza de mudança T2 — a mais pedida, pronta a entregar em 1 dia.',
  duracao_tipica = '4h - 5h',
  inclui     = '["2 técnicos em simultâneo para ser rápido","Aspiração completa de todas as divisões","2 casas de banho profundas","Cozinha completa com interior de armários","Vidros, caixilhos, rodapés","Produtos incluídos","Relatório fotográfico final"]'::jsonb,
  nao_inclui = '["Remoção de entulho","Limpeza de estofos (se ficaram)","Pequenas reparações ou pintura"]'::jsonb,
  faq        = '[{"q":"Horário preferencial?","a":"Começamos cedo (8h-9h) para terminar em 1 dia. Combinamos hora exacta ao confirmar."},{"q":"Levam a casa ao estado original?","a":"Sim — nível de entrega profissional, com relatório fotográfico."}]'::jsonb
WHERE id = 'cln-move-t2';

UPDATE servicos SET
  tagline    = 'Limpeza de mudança T3 — casa grande pronta em 1 dia com equipa reforçada.',
  duracao_tipica = '5h - 6h',
  inclui     = '["2 técnicos em simultâneo","Aspiração completa","3 casas de banho profundas","Cozinha completa","Interior de todos os armários","Vidros, caixilhos, rodapés, portas","Produtos incluídos","Relatório fotográfico"]'::jsonb,
  nao_inclui = '["Remoção de entulho ou mobiliário","Limpeza de estofos ou colchões","Reparações"]'::jsonb,
  faq        = '[{"q":"Faz-se em 1 dia?","a":"Sim com 2 técnicos. Se preferir pode ser em dois meios-dias."}]'::jsonb
WHERE id = 'cln-move-t3';

UPDATE servicos SET
  tagline    = 'Limpeza de mudança T4+ — moradia ou apartamento grande com equipa dedicada.',
  duracao_tipica = '6h - 8h',
  inclui     = '["3 técnicos em simultâneo","Aspiração completa de toda a casa","Até 4 casas de banho","Cozinha completa","Interior de todos os armários","Vidros, caixilhos, estores, rodapés","Produtos incluídos","Relatório fotográfico"]'::jsonb,
  nao_inclui = '["Remoção de entulho (ver Pós-Obra)","Áreas exteriores extensas (consulte)","Reparações"]'::jsonb,
  faq        = '[{"q":"Moradia grande?","a":"Para áreas >200m² ou 5+ casas de banho pode ser necessário orçamento com visita prévia."}]'::jsonb
WHERE id = 'cln-move-t4';


-- ═════════════════════════════════════════════════════════════════════
-- 17. EXTRAS DE LIMPEZA — produtos/materiais
-- ═════════════════════════════════════════════════════════════════════
-- Tabela servico_extras já existe no schema. Estes são os extras
-- aplicáveis aos 4 grupos de limpeza (cln-home, cln-deep, cln-move, cln-sofa).
-- Nota: frequência (mensal, mensal+profunda) é modelada no frontend
-- como opção dinâmica — multiplicador + desconto aplicado no preço final.
-- Guardar em ordens.metadata JSONB quando confirmada.
-- ═════════════════════════════════════════════════════════════════════

-- 17.1 Adicionar coluna metadata para guardar opções dinâmicas do cliente
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
-- Exemplos de metadata guardada na ordem:
-- { "produtos": "tecnica_traz" | "cliente_fornece",
--   "frequencia": "pontual" | "mensal" | "mensal_profunda",
--   "preco_extras": 4.00 }

-- 17.2 Extras de produtos — aplicam-se a todos os 4 grupos de limpeza
INSERT INTO servico_extras (id, servico_id, nome, descricao, preco, duracao_extra_min, ordem) VALUES
  ('ext-prod-cln-home',  'cln-home',  'Técnica traz produtos e materiais', 'Detergentes, panos e sacos profissionais incluídos — não precisa de fornecer nada.',  4.00, 0, 1),
  ('ext-prod-cln-deep',  'cln-deep',  'Técnica traz produtos e materiais', 'Produtos profissionais adequados a limpeza profunda incluídos.',                      6.00, 0, 1),
  ('ext-prod-cln-move',  'cln-move',  'Técnica traz produtos e materiais', 'Produtos profissionais adequados a limpeza de mudança incluídos.',                    6.00, 0, 1),
  ('ext-prod-cln-sofa',  'cln-sofa',  'Técnica traz produtos e materiais', 'Produtos específicos para higienização de estofos incluídos.',                        4.00, 0, 1)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, preco = EXCLUDED.preco,
  ordem = EXCLUDED.ordem;

-- 17.3 Verificação
-- SELECT s.id, s.nome, e.nome AS extra, e.preco
-- FROM servicos s LEFT JOIN servico_extras e ON e.servico_id = s.id
-- WHERE s.id LIKE 'cln-%' AND s.tipo = 'grupo' ORDER BY s.id;

-- ═════════════════════════════════════════════════════════════════════
-- 18. FREQUÊNCIA / VENDA RECORRENTE — templates reutilizáveis
-- ═════════════════════════════════════════════════════════════════════
-- Estratégia: em vez de configurar opções à-la-carte por serviço, cada
-- serviço aplicável aponta a uma de 7 templates. Frontend renderiza
-- conforme a template (definidas no JSX em FREQUENCY_TEMPLATES).
--
-- Templates:
--   'cln_home'        → Pontual / Mensal / Mensal+Profunda
--   'cln_occasional'  → Pontual / Trimestral / Semestral
--   'cln_office'      → Pontual / Semanal / Quinzenal / Mensal
--   'jardim_corte'    → Pontual / Semanal / Quinzenal / Mensal
--   'sazonal_cut'     → Pontual / Semestral / Anual
--   'plano_anual'     → Mensal (sem compromisso) / Plano Anual
--   'piscina_quimica' → Pontual / Quinzenal / Mensal
--
-- Serviços sem template: frequency_template = NULL (ecrã de detalhe
-- não mostra secção Frequência).
-- ═════════════════════════════════════════════════════════════════════

-- 18.1 Coluna nova
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS frequency_template TEXT;

-- 18.2 Atribuir templates aos serviços aplicáveis
-- Limpeza
UPDATE servicos SET frequency_template = 'cln_home'       WHERE id = 'cln-home';
UPDATE servicos SET frequency_template = 'cln_occasional' WHERE id IN ('cln-bathroom-deep', 'cln-oven', 'cln-fridge');
UPDATE servicos SET frequency_template = 'cln_office'     WHERE id = 'cln-office-small';

-- Jardim
UPDATE servicos SET frequency_template = 'jardim_corte'   WHERE id = 'jar-mow';
UPDATE servicos SET frequency_template = 'plano_anual'    WHERE id = 'jar-maint';
UPDATE servicos SET frequency_template = 'sazonal_cut'    WHERE id IN ('jar-hedge-prune', 'jar-weed');

-- Piscina
UPDATE servicos SET frequency_template = 'plano_anual'     WHERE id = 'pol-maint';
UPDATE servicos SET frequency_template = 'piscina_quimica' WHERE id IN ('pol-chem-basic', 'pol-chem-full', 'pol-vacuum');

-- 18.3 Os filhos dos grupos HERDAM o template do pai no runtime do frontend
-- (não precisa de UPDATE extra). Exemplo: cln-home-t2 herda de cln-home.

-- 18.4 Verificação
-- SELECT id, nome, tipo, frequency_template FROM servicos
-- WHERE frequency_template IS NOT NULL ORDER BY frequency_template, ordem;
-- Expected: 9 serviços-pai/soltos com template atribuída.
--
-- Cobertura de recorrência por categoria:
--   limpeza:  5 serviços (cln-home grupo, cln-bathroom-deep, cln-oven, cln-fridge, cln-office-small)
--   jardim:   4 serviços (jar-mow grupo, jar-maint grupo, jar-hedge-prune, jar-weed)
--   piscina:  4 serviços (pol-maint grupo, pol-chem-basic, pol-chem-full, pol-vacuum)

-- ═════════════════════════════════════════════════════════════════════
-- 19. TABELA DE TEMPLATES DE FREQUÊNCIA (configurável via admin)
-- ═════════════════════════════════════════════════════════════════════
-- Objectivo: mover os valores de desconto do frontend para a DB, de modo
-- a que o admin possa ajustá-los via UI sem tocar em código.
--
-- Frontend carrega esta tabela no arranque (1 query), cacha em memória,
-- e renderiza as opções conforme cada servico.frequency_template.
--
-- Cada linha tem um array JSONB de opções, onde cada opção é:
--   {
--     "id": "mensal",
--     "label": "Plano mensal (4 visitas/mês)",
--     "hint":  "Mesma técnica sempre · −15%",
--     "multiplier": 4,
--     "discount":   0.15,
--     "suffix":     "/mês",
--     "per_visit":  false,      -- opcional
--     "includes_deep": false    -- opcional (só cln_home)
--   }
-- ═════════════════════════════════════════════════════════════════════

-- 19.1 Tabela
CREATE TABLE IF NOT EXISTS frequency_templates (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  options     JSONB NOT NULL DEFAULT '[]'::jsonb,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 19.2 Seed com as 8 templates actuais
INSERT INTO frequency_templates (id, nome, descricao, options) VALUES

('cln_home', 'Limpeza doméstica regular',
 'Pontual · Mensal (4 visitas/mês) · Mensal+Profunda trimestral',
 '[
   {"id":"pontual",         "label":"Pontual",                      "hint":"1 visita apenas",                   "multiplier":1,    "discount":0,    "suffix":""},
   {"id":"mensal",          "label":"Plano mensal (4 visitas/mês)", "hint":"Mesma técnica sempre · −15%",       "multiplier":4,    "discount":0.15, "suffix":"/mês"},
   {"id":"mensal-profunda", "label":"Mensal + profunda trimestral", "hint":"4 regulares + 1 profunda/3 meses",  "multiplier":4.33, "discount":0.12, "suffix":"/mês", "includes_deep":true}
 ]'::jsonb),

('cln_occasional', 'Limpeza ocasional recorrente',
 'Pontual · Trimestral · Semestral (preço por visita)',
 '[
   {"id":"pontual",    "label":"Pontual",    "hint":"1 visita apenas",              "multiplier":1, "discount":0,    "suffix":""},
   {"id":"trimestral", "label":"Trimestral", "hint":"1 visita cada 3 meses · −10%", "multiplier":1, "discount":0.10, "suffix":"/visita", "per_visit":true},
   {"id":"semestral",  "label":"Semestral",  "hint":"1 visita cada 6 meses · −5%",  "multiplier":1, "discount":0.05, "suffix":"/visita", "per_visit":true}
 ]'::jsonb),

('cln_office', 'Limpeza de escritório',
 'Alta frequência — semanal, quinzenal ou mensal',
 '[
   {"id":"pontual",   "label":"Pontual",   "hint":"1 visita apenas",      "multiplier":1, "discount":0,    "suffix":""},
   {"id":"semanal",   "label":"Semanal",   "hint":"4 visitas/mês · −20%", "multiplier":4, "discount":0.20, "suffix":"/mês"},
   {"id":"quinzenal", "label":"Quinzenal", "hint":"2 visitas/mês · −15%", "multiplier":2, "discount":0.15, "suffix":"/mês"},
   {"id":"mensal",    "label":"Mensal",    "hint":"1 visita/mês · −10%",  "multiplier":1, "discount":0.10, "suffix":"/mês"}
 ]'::jsonb),

('jardim_corte', 'Corte de relva',
 'Sazonal — semanal na primavera, mensal no inverno',
 '[
   {"id":"pontual",   "label":"Pontual",   "hint":"1 corte apenas",       "multiplier":1, "discount":0,    "suffix":""},
   {"id":"semanal",   "label":"Semanal",   "hint":"4 cortes/mês · −15%",  "multiplier":4, "discount":0.15, "suffix":"/mês"},
   {"id":"quinzenal", "label":"Quinzenal", "hint":"2 cortes/mês · −12%",  "multiplier":2, "discount":0.12, "suffix":"/mês"},
   {"id":"mensal",    "label":"Mensal",    "hint":"1 corte/mês · −8%",    "multiplier":1, "discount":0.08, "suffix":"/mês"}
 ]'::jsonb),

('sazonal_cut', 'Poda e limpeza sazonal',
 'Pontual · Semestral · Anual (preço por visita)',
 '[
   {"id":"pontual",   "label":"Pontual",   "hint":"1 visita apenas",     "multiplier":1, "discount":0,    "suffix":""},
   {"id":"semestral", "label":"Semestral", "hint":"2 visitas/ano · −10%","multiplier":1, "discount":0.10, "suffix":"/visita", "per_visit":true},
   {"id":"anual",     "label":"Anual",     "hint":"1 visita/ano · −5%",  "multiplier":1, "discount":0.05, "suffix":"/visita", "per_visit":true}
 ]'::jsonb),

('plano_gradual', 'Plano mensal/trimestral/semestral/anual',
 'Serviço já mensal — gradação de desconto por compromisso',
 '[
   {"id":"mensal",     "label":"Mensal",     "hint":"Sem compromisso",                       "multiplier":1, "discount":0,    "suffix":"/mês"},
   {"id":"trimestral", "label":"Trimestral", "hint":"3 meses comprometidos · −3%",           "multiplier":1, "discount":0.03, "suffix":"/mês"},
   {"id":"semestral",  "label":"Semestral",  "hint":"6 meses comprometidos · −6%",           "multiplier":1, "discount":0.06, "suffix":"/mês"},
   {"id":"anual",      "label":"Plano anual","hint":"12 meses · −10% · prioridade na agenda","multiplier":1, "discount":0.10, "suffix":"/mês"}
 ]'::jsonb),

('piscina_quimica', 'Tratamento químico de piscina',
 'Pontual · Quinzenal · Mensal',
 '[
   {"id":"pontual",   "label":"Pontual",   "hint":"1 tratamento apenas",         "multiplier":1, "discount":0,    "suffix":""},
   {"id":"quinzenal", "label":"Quinzenal", "hint":"2 tratamentos/mês · −12%",    "multiplier":2, "discount":0.12, "suffix":"/mês"},
   {"id":"mensal",    "label":"Mensal",    "hint":"1 tratamento/mês · −8%",      "multiplier":1, "discount":0.08, "suffix":"/mês"}
 ]'::jsonb),

('manutencao_anual', 'Manutenção anual',
 'Serviços que são 1×/ano — pontual ou plano anual com lembrete',
 '[
   {"id":"pontual", "label":"Pontual",      "hint":"1 visita apenas",                               "multiplier":1, "discount":0,    "suffix":""},
   {"id":"anual",   "label":"Plano anual",  "hint":"12 meses · lembrete automático · −10% · prioridade", "multiplier":1, "discount":0.10, "suffix":"/visita", "per_visit":true}
 ]'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, descricao = EXCLUDED.descricao,
  options = EXCLUDED.options, updated_at = NOW();


-- ═════════════════════════════════════════════════════════════════════
-- 20. NOVOS SERVIÇOS ANUAIS + RE-ATRIBUIÇÃO DE TEMPLATES
-- ═════════════════════════════════════════════════════════════════════

-- 20.1 Adicionar 2 serviços anuais em falta
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  ('mnt-ac-main',      'manutencao', 'mnt_climatizacao', 'Manutenção anual de ar condicionado', 79.90, 89.90, 'fixo', TRUE, FALSE, 10),
  ('mnt-water-heater', 'manutencao', 'mnt_climatizacao', 'Manutenção anual de esquentador',     89.90, 99.90, 'fixo', FALSE,FALSE, 11)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, updated_at = NOW();

-- 20.2 Detalhe rico dos novos
UPDATE servicos SET
  tagline    = 'Manutenção anual preventiva — limpeza, verificação de gás e eficiência.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Limpeza de filtros e unidade interior","Verificação de pressão de gás","Teste de funcionamento em modo frio e quente","Limpeza de drenagem e condensados","Verificação eléctrica e ruído","Relatório fotográfico com estado"]'::jsonb,
  nao_inclui = '["Recarga de gás se houver fuga (orçamento separado)","Substituição de componentes avariados","Desmontagem completa da unidade exterior"]'::jsonb,
  faq        = '[{"q":"Com que frequência?","a":"1×/ano é o recomendado pelos fabricantes. Duplica a vida útil do equipamento e mantém a garantia."},{"q":"Plano anual tem vantagens?","a":"Sim — lembrete automático, prioridade na agenda e −10% no preço."}]'::jsonb
WHERE id = 'mnt-ac-main';

UPDATE servicos SET
  tagline    = 'Manutenção anual de esquentador — gás ou eléctrico — evita avarias e gastos.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Limpeza interna do permutador","Verificação de pressão e estanquidade","Ajuste de chama (gás) ou resistência (eléctrico)","Limpeza de filtros e válvulas","Teste de segurança e temperatura","Relatório com estado"]'::jsonb,
  nao_inclui = '["Reparação de avarias (orçamento separado)","Substituição de peças (ver Reparação)","Aquecedor avariado não pode ser mantido — tem de ser reparado primeiro"]'::jsonb,
  faq        = '[{"q":"Obrigatório?","a":"Para esquentadores a gás, sim por lei (2 anos). Para eléctricos, recomendado anualmente."},{"q":"E se tiver avaria?","a":"Reportamos no fim, com orçamento. A manutenção foca-se na prevenção."}]'::jsonb
WHERE id = 'mnt-water-heater';

-- 20.3 Re-atribuir templates (plano_anual foi renomeado para plano_gradual)
UPDATE servicos SET frequency_template = 'plano_gradual'    WHERE id IN ('jar-maint', 'pol-maint');
UPDATE servicos SET frequency_template = 'manutencao_anual' WHERE id IN ('mnt-ac-main', 'mnt-water-heater');
UPDATE servicos SET frequency_template = 'sazonal_cut'      WHERE id = 'jar-scarify';

-- 20.4 Verificação final
-- SELECT s.id, s.nome, s.frequency_template, ft.nome AS template_nome
-- FROM servicos s LEFT JOIN frequency_templates ft ON ft.id = s.frequency_template
-- WHERE s.frequency_template IS NOT NULL ORDER BY s.frequency_template, s.ordem;
-- Expected: ~12 serviços com template atribuída.

-- ═════════════════════════════════════════════════════════════════════
-- 21. SERVIÇOS SAZONAIS E HANDYMAN ADICIONAIS
-- ═════════════════════════════════════════════════════════════════════
-- Inspirados no catálogo do InstaService.com (USA). Preenchem lacunas:
--   • Natal: luzes, árvore, decoração (sazonal Out-Jan)
--   • Handyman: pendurar quadros, cortinados, baby proofing
--
-- A nova subcategoria 'mnt_sazonal' permite filtrar estes serviços na UI
-- e mostrar banners contextuais (ex: "🎄 Marque já as luzes de Natal —
-- agendas abertas até 10 Dez").
-- ═════════════════════════════════════════════════════════════════════

-- 21.1 Nova subcategoria "Sazonal"
INSERT INTO subcategorias (id, categoria_id, nome, icon, ordem) VALUES
  ('mnt_sazonal', 'manutencao', 'Sazonal e festivo', '🎄', 8)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, icon = EXCLUDED.icon, ordem = EXCLUDED.ordem;

-- 21.2 Serviços sazonais de Natal (grupo consolidado + detalhe)
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  -- Grupo-pai Montagem de iluminação natalícia
  ('mnt-xmas-lights',          'manutencao', 'mnt_sazonal', 'Montagem de luzes de Natal',        59.90,  69.90, 'grupo', TRUE,  FALSE, 1),
  -- Variantes (interior/exterior/completo)
  ('mnt-xmas-lights-interior', 'manutencao', 'mnt_sazonal', 'Luzes Natal — interior',            59.90,  69.90, 'fixo', FALSE, FALSE, 1),
  ('mnt-xmas-lights-exterior', 'manutencao', 'mnt_sazonal', 'Luzes Natal — exterior',            99.90, 119.90, 'fixo', TRUE,  FALSE, 2),
  ('mnt-xmas-lights-full',     'manutencao', 'mnt_sazonal', 'Luzes Natal — interior + exterior',149.90, 179.90, 'fixo', FALSE, FALSE, 3),
  -- Serviços sazonais individuais
  ('mnt-xmas-takedown',        'manutencao', 'mnt_sazonal', 'Desmontagem de luzes de Natal',     39.90,  44.90, 'fixo', FALSE, FALSE, 4),
  ('mnt-xmas-tree',            'manutencao', 'mnt_sazonal', 'Montagem de árvore de Natal',       39.90,  44.90, 'fixo', FALSE, FALSE, 5),
  ('mnt-xmas-decor',           'manutencao', 'mnt_sazonal', 'Decoração exterior (coroa, rena)',  29.90,  34.90, 'fixo', FALSE, FALSE, 6)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  tipo = EXCLUDED.tipo, popular = EXCLUDED.popular, ordem = EXCLUDED.ordem, updated_at = NOW();

-- 21.3 Atribuir filhos ao pai mnt-xmas-lights
UPDATE servicos SET servico_pai_id = 'mnt-xmas-lights'
WHERE id IN ('mnt-xmas-lights-interior', 'mnt-xmas-lights-exterior', 'mnt-xmas-lights-full');

-- 21.4 Detalhe rico dos sazonais
UPDATE servicos SET
  tagline    = 'Casa iluminada e festiva sem stress — montamos tudo em segurança.',
  duracao_tipica = 'Varia — 1h30 a 4h consoante interior/exterior',
  inclui     = '["Montagem profissional com escada e ferramentas próprias","Fixação segura sem danificar superfícies","Teste de todos os circuitos","Configuração de timer se aplicável","Dicas de poupança energética","Desmontagem incluída em pack completo (opcional)"]'::jsonb,
  nao_inclui = '["Fornecimento das luzes (cliente compra — aconselhamos tipo e quantidade)","Instalação eléctrica nova (ver Elétrica)","Decorações que requeiram escadas >3m (orçamento)"]'::jsonb,
  faq        = '[{"q":"Quando agendar?","a":"Recomendamos entre 15 Nov e 10 Dez. Agendas encerram quando a época termina."},{"q":"E se as luzes avariarem durante a época?","a":"Garantia de 30 dias — voltamos sem custo se algo falhar."},{"q":"Posso comprar as luzes onde?","a":"Qualquer loja — IKEA, Leroy Merlin, Continente. Indicamos a quantidade após ver as fotos da casa."}]'::jsonb
WHERE id = 'mnt-xmas-lights';

UPDATE servicos SET
  tagline    = 'Luzes interiores — lareira, janelas, móveis — montadas com cuidado.',
  duracao_tipica = '1h - 1h30',
  inclui     = '["Montagem em janelas, lareira, móveis, escadas interiores","Fixação não-permanente (sem buracos)","Teste de circuitos e timer","Arrumação de fios visíveis"]'::jsonb,
  nao_inclui = '["Desmontagem posterior (serviço separado)","Fornecimento das luzes","Árvore de Natal (ver Montagem de árvore)"]'::jsonb,
  faq        = '[{"q":"Quantos metros de luzes preciso?","a":"Depende da casa — para T2/T3 típico: 15-30m."}]'::jsonb
WHERE id = 'mnt-xmas-lights-interior';

UPDATE servicos SET
  tagline    = 'Fachada iluminada em segurança — pros com escada e formação em altura.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Montagem na fachada, beiral, varandas","Escada e ferramentas próprias","Uso de clips não-danificantes","Teste de circuitos e impermeabilidade","Timer exterior configurado"]'::jsonb,
  nao_inclui = '["Fachadas acima de 3m requerem orçamento","Instalação eléctrica nova","Desmontagem (serviço separado)"]'::jsonb,
  faq        = '[{"q":"E se chover?","a":"Luzes exteriores são IP44 mínimo — instalamos em segurança, mas se a instalação for em dia de chuva reagendamos."},{"q":"Luzes aguentam o inverno?","a":"Sim — usamos luzes certificadas para exterior e instalação adequada."}]'::jsonb
WHERE id = 'mnt-xmas-lights-exterior';

UPDATE servicos SET
  tagline    = 'Pack completo — casa pronta a brilhar por dentro e por fora.',
  duracao_tipica = '3h30 - 4h30',
  inclui     = '["Montagem interior completa","Montagem exterior (fachada, varandas)","Clips e timer exterior incluídos","Desmontagem pós-época incluída (Jan-Fev)","Relatório fotográfico antes/depois"]'::jsonb,
  nao_inclui = '["Fornecimento das luzes","Fachadas acima de 3m (orçamento)","Árvore de Natal (serviço separado)"]'::jsonb,
  faq        = '[{"q":"Quando é feita a desmontagem?","a":"Entre 6-31 de Janeiro. Agendamos em separado depois do Natal."}]'::jsonb
WHERE id = 'mnt-xmas-lights-full';

UPDATE servicos SET
  tagline    = 'Luzes e decoração recolhidas e embaladas em caixas prontas a guardar.',
  duracao_tipica = '1h - 2h',
  inclui     = '["Desmontagem de toda a iluminação e decoração","Enrolamento e organização em caixas","Teste das luzes para confirmar funcionamento para o próximo ano","Arrumação do espaço limpo"]'::jsonb,
  nao_inclui = '["Transporte/armazenagem das caixas (cliente arruma)","Reparação de luzes partidas (orçamento)"]'::jsonb,
  faq        = '[{"q":"Incluído no pack completo?","a":"Sim — se contratar o pack interior+exterior, a desmontagem está incluída."}]'::jsonb
WHERE id = 'mnt-xmas-takedown';

UPDATE servicos SET
  tagline    = 'Árvore montada com luzes, bolas e estrela em 30 min.',
  duracao_tipica = '30 min - 1h',
  inclui     = '["Montagem da estrutura da árvore","Distribuição uniforme das luzes","Colocação de enfeites conforme gosto","Colocação da estrela/ponteira","Arrumação das caixas"]'::jsonb,
  nao_inclui = '["Árvore e enfeites (cliente fornece)","Desmontagem em Janeiro (pode ser pedida à parte)"]'::jsonb,
  faq        = '[{"q":"E árvore natural?","a":"Sim — também montamos. Avise-nos no pedido."},{"q":"Tamanhos possíveis?","a":"Até 2.5m — acima, orçamento prévio."}]'::jsonb
WHERE id = 'mnt-xmas-tree';

UPDATE servicos SET
  tagline    = 'Coroa na porta, rena no jardim, Pai Natal na varanda — tudo no lugar certo.',
  duracao_tipica = '30 min - 1h',
  inclui     = '["Montagem de peças decorativas externas","Fixação adequada ao tipo de superfície","Distribuição equilibrada","Teste de estabilidade e luzes"]'::jsonb,
  nao_inclui = '["Fornecimento das decorações","Decorações grandes ou insufláveis (consulte)","Instalação eléctrica nova"]'::jsonb,
  faq        = '[{"q":"Têm sugestões de decoração?","a":"Sim — partilhamos ideias se nos enviar fotos da casa."}]'::jsonb
WHERE id = 'mnt-xmas-decor';

-- 21.5 Handyman adicionais (2 serviços comuns em falta)
-- Nota: 'mnt-curtains' (varão de cortinas) já existe noutra secção, não duplicar.
INSERT INTO servicos (id, categoria_id, subcategoria_id, nome, preco, preco_original, tipo, popular, eco, ordem) VALUES
  ('mnt-pictures-hang', 'manutencao', 'mnt_fixacao', 'Pendurar quadros e espelhos',        19.90, 22.90, 'fixo', TRUE,  FALSE, 20),
  ('mnt-baby-proof',    'manutencao', 'mnt_seguranca','Baby proofing (casa à prova de crianças)', 79.90, 89.90, 'fixo', FALSE, FALSE, 22)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, preco = EXCLUDED.preco, preco_original = EXCLUDED.preco_original,
  popular = EXCLUDED.popular, updated_at = NOW();

-- Detalhe rico dos 2 handyman novos
UPDATE servicos SET
  tagline    = 'Quadros e espelhos pendurados no sítio certo, alinhados e firmes.',
  duracao_tipica = '30 min - 1h (até 5 peças)',
  inclui     = '["Marcação e nivelamento profissional","Furação adaptada ao tipo de parede (alvenaria, gesso, azulejo)","Fixadores próprios para cada peça","Até 5 peças incluídas","Limpeza do pó gerado"]'::jsonb,
  nao_inclui = '["Fornecimento de ganchos ou buchas especiais","Peças >15kg (orçamento)","Espelhos encastrados (serviço separado)"]'::jsonb,
  faq        = '[{"q":"E se for em azulejo?","a":"Sim — temos brocas e técnica adequadas. Zero fissuras se feito correctamente."},{"q":"Mais de 5 peças?","a":"Adicione mais (+€3 cada) ou passe a Personalizado se forem muitas."}]'::jsonb
WHERE id = 'mnt-pictures-hang';

UPDATE servicos SET
  tagline    = 'Casa segura para bebé a gatinhar — gavetas, armários, escadas, tomadas.',
  duracao_tipica = '2h - 3h',
  inclui     = '["Verificação da casa divisão a divisão","Travões em gavetas, armários e loiça","Protectores de tomadas (12 unidades incluídas)","Bloqueadores de portas e janelas","Cantos protegidos em móveis afiados","Porta de escadas (se fornecida)","Relatório com pontos ainda a melhorar"]'::jsonb,
  nao_inclui = '["Fornecimento dos equipamentos de segurança (trazemos kit básico, resto cliente compra)","Portas de escadas personalizadas","Redes de varanda (orçamento especial)"]'::jsonb,
  faq        = '[{"q":"Que idade do bebé?","a":"Idealmente antes de começar a gatinhar (~6-8 meses). Antes é mais fácil preparar."},{"q":"Kit completo inclui?","a":"Básico 30-40 peças. Para casas grandes pode ser necessário comprar mais."}]'::jsonb
WHERE id = 'mnt-baby-proof';

-- 21.6 Nova subcategoria para mnt-pictures-hang e mnt-curtains
INSERT INTO subcategorias (id, categoria_id, nome, icon, ordem) VALUES
  ('mnt_fixacao',   'manutencao', 'Fixação e instalação', '🔨', 9),
  ('mnt_seguranca', 'manutencao', 'Segurança doméstica',   '🛡️', 10)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, icon = EXCLUDED.icon;

-- 21.7 Verificação
-- SELECT id, nome, subcategoria_id, preco, servico_pai_id, tipo
-- FROM servicos
-- WHERE subcategoria_id IN ('mnt_sazonal', 'mnt_fixacao', 'mnt_seguranca')
-- ORDER BY subcategoria_id, ordem;
