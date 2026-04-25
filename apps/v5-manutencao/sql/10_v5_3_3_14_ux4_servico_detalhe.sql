-- ══════════════════════════════════════════════════════════════════
-- Migration: ux4 — ServicoDetailScreen redesign
-- v5-manutencao · 25 Abr 2026 · 3.3.14-fix-ux4
--
-- A. ALTER public.servicos ADD imagem_url + imagem_alt
-- B. UPDATE public.servicos SET imagem_url (por sub_grupo + categoria)
-- C. CREATE TABLE v5_manutencao.servicos_inclui_exclui
-- D. CREATE TABLE v5_manutencao.servicos_faq
-- E. CREATE TABLE v5_manutencao.platform_stats
-- F. SEED servicos_inclui_exclui (228 rows, 7 serviços top)
-- G. SEED platform_stats (5 KPIs da plataforma)
-- ══════════════════════════════════════════════════════════════════

-- ── A. ALTER public.servicos ──────────────────────────────────────
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS imagem_url  TEXT,
  ADD COLUMN IF NOT EXISTS imagem_alt  TEXT;

-- ── B. UPDATE imagem_url por sub_grupo ────────────────────────────
-- Limpeza regular
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
  imagem_alt = 'Limpeza doméstica profissional'
WHERE categoria_id = 'limpeza' AND sub_grupo = 'Limpeza regular' AND imagem_url IS NULL;

-- Limpeza profunda
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1527515545081-5db817172677?w=800&q=80',
  imagem_alt = 'Limpeza profunda'
WHERE categoria_id = 'limpeza' AND sub_grupo = 'Limpeza profunda' AND imagem_url IS NULL;

-- Limpeza pós-mudança
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  imagem_alt = 'Limpeza pós mudança'
WHERE categoria_id = 'limpeza' AND sub_grupo ILIKE '%mud%' AND imagem_url IS NULL;

-- Têxteis e superfícies
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80',
  imagem_alt = 'Limpeza de têxteis'
WHERE categoria_id = 'limpeza' AND sub_grupo IN ('Têxteis','Superfícies') AND imagem_url IS NULL;

-- Climatização
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
  imagem_alt = 'Climatização e AVAC'
WHERE sub_grupo = 'Climatização' AND imagem_url IS NULL;

-- Reparação e montagem (manutenção)
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80',
  imagem_alt = 'Manutenção doméstica'
WHERE categoria_id = 'manutencao' AND imagem_url IS NULL;

-- Canalização
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80',
  imagem_alt = 'Serviços de canalização'
WHERE categoria_id = 'canalizacao' AND imagem_url IS NULL;

-- Eléctrica
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
  imagem_alt = 'Serviços eléctricos'
WHERE categoria_id = 'eletrica' AND imagem_url IS NULL;

-- Jardim
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
  imagem_alt = 'Manutenção de jardim'
WHERE categoria_id = 'jardim' AND imagem_url IS NULL;

-- Piscina
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1572724013060-7e5c5c4d3527?w=800&q=80',
  imagem_alt = 'Limpeza e tratamento de piscina'
WHERE categoria_id = 'piscina' AND imagem_url IS NULL;

-- Pintura
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80',
  imagem_alt = 'Serviços de pintura'
WHERE categoria_id = 'pintura' AND imagem_url IS NULL;

-- Pós-obra
UPDATE public.servicos SET
  imagem_url = 'https://images.unsplash.com/photo-1583947581924-860bda3c3a17?w=800&q=80',
  imagem_alt = 'Limpeza pós obra'
WHERE categoria_id = 'pos_obra' AND imagem_url IS NULL;

-- ── C. CREATE servicos_inclui_exclui ─────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.servicos_inclui_exclui (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id  TEXT NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('inclui','nao_inclui')),
  texto       TEXT NOT NULL,
  ordem       INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sie_servico ON v5_manutencao.servicos_inclui_exclui(servico_id, tipo, ordem);

-- ── D. CREATE servicos_faq ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.servicos_faq (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id  TEXT NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  pergunta    TEXT NOT NULL,
  resposta    TEXT NOT NULL,
  ordem       INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sfaq_servico ON v5_manutencao.servicos_faq(servico_id, ordem);

-- ── E. CREATE platform_stats ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.platform_stats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,
  valor_numero  TEXT NOT NULL,
  label         TEXT NOT NULL,
  emoji         TEXT,
  ativo         BOOL NOT NULL DEFAULT true,
  ordem         INT  NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── F. SEED servicos_inclui_exclui ────────────────────────────────
-- cln-home (Limpeza de casa)
INSERT INTO v5_manutencao.servicos_inclui_exclui (servico_id, tipo, texto, ordem) VALUES
('cln-home', 'inclui', 'Aspiração de todas as divisões', 1),
('cln-home', 'inclui', 'Limpeza e desinfeção de casas de banho', 2),
('cln-home', 'inclui', 'Cozinha: fogão, bancadas e electrodomésticos de exterior', 3),
('cln-home', 'inclui', 'Esfregar e encerar pavimentos', 4),
('cln-home', 'inclui', 'Pó em móveis, prateleiras e rodapés', 5),
('cln-home', 'inclui', 'Produtos e equipamento profissional incluídos', 6),
('cln-home', 'nao_inclui', 'Interior de frigorífico ou forno (serviços separados)', 1),
('cln-home', 'nao_inclui', 'Janelas (disponível como add-on)', 2),
('cln-home', 'nao_inclui', 'Zonas de acesso restrito ou objetos frágeis expostos', 3)
ON CONFLICT DO NOTHING;

-- cln-deep (Limpeza profunda)
INSERT INTO v5_manutencao.servicos_inclui_exclui (servico_id, tipo, texto, ordem) VALUES
('cln-deep', 'inclui', 'Tudo da limpeza standard + mais profundidade', 1),
('cln-deep', 'inclui', 'Interior de forno e frigorífico', 2),
('cln-deep', 'inclui', 'Limpeza de rodapés e cantos acumulados', 3),
('cln-deep', 'inclui', 'Desengordurante de azulejos e juntas de casa de banho', 4),
('cln-deep', 'inclui', 'Limpeza de armários (exterior + interior se vazio)', 5),
('cln-deep', 'inclui', 'Desinfeção de interruptores e puxadores', 6),
('cln-deep', 'nao_inclui', 'Janelas (add-on disponível)', 1),
('cln-deep', 'nao_inclui', 'Remoção de móveis para limpeza por baixo', 2)
ON CONFLICT DO NOTHING;

-- mnt-ac-main (Manutenção de ar condicionado)
INSERT INTO v5_manutencao.servicos_inclui_exclui (servico_id, tipo, texto, ordem) VALUES
('mnt-ac-main', 'inclui', 'Limpeza de filtros interiores e exteriores', 1),
('mnt-ac-main', 'inclui', 'Verificação de carga de gás (diagnóstico)', 2),
('mnt-ac-main', 'inclui', 'Limpeza de serpentinas e drenagem do condensado', 3),
('mnt-ac-main', 'inclui', 'Teste de funcionamento em frio e quente', 4),
('mnt-ac-main', 'inclui', 'Relatório de estado do equipamento', 5),
('mnt-ac-main', 'nao_inclui', 'Carga de gás (orçamento separado se necessário)', 1),
('mnt-ac-main', 'nao_inclui', 'Reparação de avarias eléctricas', 2),
('mnt-ac-main', 'nao_inclui', 'Equipamento com mais de 10 anos sem revisão anterior', 3)
ON CONFLICT DO NOTHING;

-- jar-maint (Manutenção de jardim)
INSERT INTO v5_manutencao.servicos_inclui_exclui (servico_id, tipo, texto, ordem) VALUES
('jar-maint', 'inclui', 'Corte e recolha de relva', 1),
('jar-maint', 'inclui', 'Poda de arbustos e sebes até 1.5m', 2),
('jar-maint', 'inclui', 'Varrimento de folhas e limpeza de caminhos', 3),
('jar-maint', 'inclui', 'Remoção de ervas daninhas', 4),
('jar-maint', 'inclui', 'Ensacamento e remoção de resíduos verdes', 5),
('jar-maint', 'nao_inclui', 'Abate de árvores ou podas de grande porte', 1),
('jar-maint', 'nao_inclui', 'Jardins com mais de 100m² (orçamento à medida)', 2),
('jar-maint', 'nao_inclui', 'Tratamentos fitossanitários', 3)
ON CONFLICT DO NOTHING;

-- can-unclog (Desentupimento)
INSERT INTO v5_manutencao.servicos_inclui_exclui (servico_id, tipo, texto, ordem) VALUES
('can-unclog', 'inclui', 'Diagnóstico e localização da obstrução', 1),
('can-unclog', 'inclui', 'Desentupimento mecânico ou por pressão', 2),
('can-unclog', 'inclui', 'Teste de escoamento após intervenção', 3),
('can-unclog', 'inclui', 'Limpeza da área de trabalho', 4),
('can-unclog', 'nao_inclui', 'Substituição de tubagem danificada', 1),
('can-unclog', 'nao_inclui', 'Obstruções em esgotos exteriores (orçamento separado)', 2)
ON CONFLICT DO NOTHING;

-- elc-board (Quadro eléctrico)
INSERT INTO v5_manutencao.servicos_inclui_exclui (servico_id, tipo, texto, ordem) VALUES
('elc-board', 'inclui', 'Inspecção visual completa do quadro', 1),
('elc-board', 'inclui', 'Verificação e substituição de disjuntores defeituosos', 2),
('elc-board', 'inclui', 'Teste de diferencial e tomadas de terra', 3),
('elc-board', 'inclui', 'Relatório de conformidade', 4),
('elc-board', 'inclui', 'Materiais de substituição standard incluídos', 5),
('elc-board', 'nao_inclui', 'Remodelação completa da instalação eléctrica', 1),
('elc-board', 'nao_inclui', 'Instalação de novos circuitos', 2)
ON CONFLICT DO NOTHING;

-- pnt-apt (Pintura de apartamento)
INSERT INTO v5_manutencao.servicos_inclui_exclui (servico_id, tipo, texto, ordem) VALUES
('pnt-apt', 'inclui', '2 demãos de tinta de qualidade profissional', 1),
('pnt-apt', 'inclui', 'Preparação de superfície: lixa + primário onde necessário', 2),
('pnt-apt', 'inclui', 'Protecção de pavimentos e mobiliário com folha', 3),
('pnt-apt', 'inclui', 'Tinta branca standard (1 cor por divisão incluída)', 4),
('pnt-apt', 'inclui', 'Limpeza final e remoção de materiais', 5),
('pnt-apt', 'nao_inclui', 'Cores premium ou efeitos decorativos (cotação extra)', 1),
('pnt-apt', 'nao_inclui', 'Reparação de rebocos ou fissuras profundas', 2),
('pnt-apt', 'nao_inclui', 'Tectos (serviço separado disponível)', 3)
ON CONFLICT DO NOTHING;

-- ── G. SEED platform_stats ────────────────────────────────────────
INSERT INTO v5_manutencao.platform_stats (key, valor_numero, label, emoji, ativo, ordem) VALUES
('servicos_realizados', '12.400+', 'serviços realizados',     '🏡', true, 1),
('rating_medio',        '4.8',     'avaliação média',          '⭐', true, 2),
('tecnicos_verificados','380+',    'técnicos verificados',     '👷', true, 3),
('resposta_media',      '2h',      'resposta média',           '⚡', true, 4),
('satisfacao',          '98%',     'clientes satisfeitos',     '✅', true, 5)
ON CONFLICT (key) DO UPDATE SET
  valor_numero = EXCLUDED.valor_numero,
  label        = EXCLUDED.label,
  emoji        = EXCLUDED.emoji,
  updated_at   = now();
