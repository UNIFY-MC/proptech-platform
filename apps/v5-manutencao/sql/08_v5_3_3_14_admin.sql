-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Migration: sub_grupos_config + campos admin em catalogo_servicos    ║
-- ║  v5-manutencao · 25 Abr 2026 · 3.3.14-fix-ux2                       ║
-- ║                                                                      ║
-- ║  1. CREATE v5_manutencao.sub_grupos_config — config de chips         ║
-- ║  2. ALTER catalogo_servicos ADD ordem + sub_grupo                    ║
-- ║  3. Seed sub_grupos_config para todas as 8 categorias                ║
-- ║     (sub_grupo = valor exacto de public.servicos.sub_grupo)          ║
-- ║  Idempotente: IF NOT EXISTS + ON CONFLICT DO UPDATE                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- 1. Tabela de configuração de sub-grupos por categoria
CREATE TABLE IF NOT EXISTS v5_manutencao.sub_grupos_config (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_slug text NOT NULL,
  sub_grupo    text NOT NULL,
  label        text,
  emoji        text,
  ativo        boolean DEFAULT true,
  ordem        int DEFAULT 100,
  criado_em    timestamptz DEFAULT now(),
  UNIQUE(categoria_slug, sub_grupo)
);

CREATE INDEX IF NOT EXISTS idx_subgrupos_cat_ativo
  ON v5_manutencao.sub_grupos_config(categoria_slug, ativo, ordem);

-- 2. Adicionar campos de gestão admin a catalogo_servicos
ALTER TABLE v5_manutencao.catalogo_servicos
  ADD COLUMN IF NOT EXISTS ordem    int DEFAULT 100,
  ADD COLUMN IF NOT EXISTS sub_grupo text;

-- 3. Seed sub_grupos_config — valores exactos de public.servicos.sub_grupo

-- MANUTENÇÃO (reparação/urgente primeiro, sazonal último)
INSERT INTO v5_manutencao.sub_grupos_config (categoria_slug, sub_grupo, label, emoji, ordem) VALUES
  ('manutencao','Reparação',             'Reparação',   '🔨', 10),
  ('manutencao','Climatização',          'Climatização','❄️', 20),
  ('manutencao','Ajustes e regulações',  'Ajustes',     '⚙️', 30),
  ('manutencao','Montagem e instalação', 'Montagem',    '🔩', 40),
  ('manutencao','Fixação e suporte',     'Fixação',     '📌', 50),
  ('manutencao','Segurança doméstica',   'Segurança',   '🔒', 70),
  ('manutencao','Sazonal e festivo',     'Sazonal',     '🎄', 90)
ON CONFLICT (categoria_slug, sub_grupo) DO UPDATE SET
  label=EXCLUDED.label, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;

-- LIMPEZA
INSERT INTO v5_manutencao.sub_grupos_config (categoria_slug, sub_grupo, label, emoji, ordem) VALUES
  ('limpeza','Limpeza regular',  'Regular',    '🧽', 10),
  ('limpeza','Limpeza profunda', 'Profunda',   '✨', 20),
  ('limpeza','Superfícies',      'Superfícies','🪟', 30),
  ('limpeza','Têxteis',          'Têxteis',    '🛋️',40),
  ('limpeza','Pós-obra',         'Pós-obra',   '🚧', 50)
ON CONFLICT (categoria_slug, sub_grupo) DO UPDATE SET
  label=EXCLUDED.label, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;

-- CANALIZAÇÃO (urgências primeiro)
INSERT INTO v5_manutencao.sub_grupos_config (categoria_slug, sub_grupo, label, emoji, ordem) VALUES
  ('canalizacao','Fugas e diagnósticos','Fugas',       '💧', 10),
  ('canalizacao','Autoclismo e sanita', 'Sanitário',   '🚽', 20),
  ('canalizacao','Torneiras',           'Torneiras',   '🚰', 30),
  ('canalizacao','Duche e banheira',    'Duche',       '🚿', 40),
  ('canalizacao','Lavatório',           'Lavatório',   '🪞', 50),
  ('canalizacao','Desentupimentos',     'Entupimentos','🌊', 60),
  ('canalizacao','Manutenção',          'Manutenção',  '🔧', 70)
ON CONFLICT (categoria_slug, sub_grupo) DO UPDATE SET
  label=EXCLUDED.label, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;

-- ELÉTRICA
INSERT INTO v5_manutencao.sub_grupos_config (categoria_slug, sub_grupo, label, emoji, ordem) VALUES
  ('eletrica','Iluminação',           'Iluminação','💡', 10),
  ('eletrica','Tomadas e interruptores','Tomadas', '🔌', 20),
  ('eletrica','Quadro elétrico',       'Quadro',   '🔋', 30),
  ('eletrica','Diagnóstico',           'Diagnóstico','🔍',40)
ON CONFLICT (categoria_slug, sub_grupo) DO UPDATE SET
  label=EXCLUDED.label, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;

-- JARDIM
INSERT INTO v5_manutencao.sub_grupos_config (categoria_slug, sub_grupo, label, emoji, ordem) VALUES
  ('jardim','Corte e manutenção', 'Corte',     '✂️', 10),
  ('jardim','Poda e limpeza',     'Poda',      '🌳', 20),
  ('jardim','Plantação e design', 'Plantação', '🌱', 30),
  ('jardim','Rega e equipamentos','Rega',      '💦', 40)
ON CONFLICT (categoria_slug, sub_grupo) DO UPDATE SET
  label=EXCLUDED.label, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;

-- PISCINA
INSERT INTO v5_manutencao.sub_grupos_config (categoria_slug, sub_grupo, label, emoji, ordem) VALUES
  ('piscina','Manutenção',       'Manutenção', '🏊', 10),
  ('piscina','Tratamento químico','Tratamento','🧪', 20),
  ('piscina','Reparação',        'Reparação',  '🔧', 30),
  ('piscina','Abertura e fecho', 'Época',      '☀️', 40)
ON CONFLICT (categoria_slug, sub_grupo) DO UPDATE SET
  label=EXCLUDED.label, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;

-- PINTURA
INSERT INTO v5_manutencao.sub_grupos_config (categoria_slug, sub_grupo, label, emoji, ordem) VALUES
  ('pintura','Interior',    'Interior',   '🏠', 10),
  ('pintura','Exterior',    'Exterior',   '🏢', 20),
  ('pintura','Preparação',  'Preparação', '🪣', 30),
  ('pintura','Especial',    'Especial',   '🎨', 40)
ON CONFLICT (categoria_slug, sub_grupo) DO UPDATE SET
  label=EXCLUDED.label, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;

-- PÓS-OBRA
INSERT INTO v5_manutencao.sub_grupos_config (categoria_slug, sub_grupo, label, emoji, ordem) VALUES
  ('pos_obra','Limpeza de obra',        'Limpeza', '✨', 10),
  ('pos_obra','Remoção de entulho',     'Entulho', '🚛', 20),
  ('pos_obra','Remates e acabamentos',  'Remates', '🖌️',30)
ON CONFLICT (categoria_slug, sub_grupo) DO UPDATE SET
  label=EXCLUDED.label, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;
