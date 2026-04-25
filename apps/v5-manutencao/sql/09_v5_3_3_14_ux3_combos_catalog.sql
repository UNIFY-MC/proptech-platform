-- ══════════════════════════════════════════════════════════════════
-- Migration: ux3 — combos enriquecidos + catálogo 29 novos serviços
-- v5-manutencao · 25 Abr 2026 · 3.3.14-fix-ux3
--
-- A1. ALTER v5_manutencao.combos ADD COLUMN sazonal, ordem, popular, descricao_longa, cor_bg
-- A2. ALTER v5_manutencao.catalogo_servicos ADD COLUMN popular
-- A3. UPDATE combos — ordem + popular + servicos_ids
-- B.  INSERT 29 novos serviços em public.servicos
--     → catálogo total: 177 → 206 serviços activos
-- ══════════════════════════════════════════════════════════════════

-- ── A1. ALTER combos ──────────────────────────────────────────────
ALTER TABLE v5_manutencao.combos
  ADD COLUMN IF NOT EXISTS sazonal        bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS ordem          int  DEFAULT 100,
  ADD COLUMN IF NOT EXISTS popular        bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS descricao_longa text,
  ADD COLUMN IF NOT EXISTS cor_bg         text;

-- ── A2. ALTER catalogo_servicos ───────────────────────────────────
ALTER TABLE v5_manutencao.catalogo_servicos
  ADD COLUMN IF NOT EXISTS popular bool DEFAULT false;

-- ── A3. UPDATE combos — ordem + popular + servicos_ids ────────────
UPDATE v5_manutencao.combos SET
  ordem         = 1,
  popular       = true,
  servicos_ids  = '["mnt-ac-main","mnt-ac-filter","mnt-heater"]'::jsonb,
  descricao_longa = 'Pack completo de preparação para o inverno: revisão do aquecimento, limpeza das caleiras e inspecção da cobertura. Serviços coordenados numa única visita.'
WHERE slug = 'pack-inverno';

UPDATE v5_manutencao.combos SET
  ordem         = 2,
  popular       = true,
  servicos_ids  = '["cln-deep","jar-maint","cln-windows"]'::jsonb,
  descricao_longa = 'Renova a tua casa para a primavera: limpeza profunda completa + manutenção do jardim + limpeza de janelas. Tudo marcado para o mesmo dia.'
WHERE slug = 'reset-primavera';

UPDATE v5_manutencao.combos SET
  ordem         = 3,
  popular       = true,
  servicos_ids  = '["pnt-apt","cln-deep","pos-clean","mnt-furniture"]'::jsonb,
  descricao_longa = 'Prepara a tua casa para venda ou arrendamento em 48 horas: pintura, limpeza profunda, acabamentos e montagem de mobiliário.'
WHERE slug = 'pre-venda-casa';

-- ── B. 29 novos serviços ──────────────────────────────────────────
INSERT INTO public.servicos
  (id, nome, categoria_id, subcategoria_id, sub_grupo, preco, tipo, activo, popular, duracao_tipica, ordem, tagline)
VALUES

-- LIMPEZA (5)
('cln-fridge',    'Limpeza de frigorífico',         'limpeza', 'cln_regular',    'Limpeza regular',  35.00, 'fixo', true, false, '60min',  210, 'Interior + exterior · produtos alimentares seguros'),
('cln-oven',      'Limpeza de forno',                'limpeza', 'cln_profunda',   'Limpeza profunda', 40.00, 'fixo', true, false, '45min',  211, 'Desengordurante profissional · resultado imediato'),
('cln-carpet-sm', 'Limpeza de tapete pequeno',       'limpeza', 'cln_texteis',    'Têxteis',          25.00, 'fixo', true, false, '45min',  212, 'Até 4m² · secagem em 2h'),
('cln-blinds',    'Limpeza de persianas',            'limpeza', 'cln_superficies','Superfícies',      30.00, 'fixo', true, false, '60min',  213, 'Desmontagem e limpeza de 3 persianas incluídas'),
('cln-windows',   'Limpeza de janelas',              'limpeza', 'cln_superficies','Superfícies',      45.00, 'fixo', true, false, '90min',  214, '5 janelas · vidros + caixilhos + peitoris'),

-- MANUTENÇÃO (8)
('mnt-door-lock',    'Reparação de fechadura',            'manutencao', 'mnt_reparacao',    'Reparação',              45.00, 'fixo', true, true,  '30min', 210, 'Chave emperrada, fechadura partida ou difícil'),
('mnt-shelf-install','Instalação de prateleiras',         'manutencao', 'mnt_montagem',     'Montagem e instalação',  29.00, 'fixo', true, false, '30min', 211, 'Até 2 prateleiras · buchas e parafusos incluídos'),
('mnt-blind-install','Instalação de persiana',            'manutencao', 'mnt_montagem',     'Montagem e instalação',  39.00, 'fixo', true, false, '30min', 212, 'Por persiana · com suportes incluídos'),
('mnt-toilet-seat',  'Substituição de tampo de sanita',   'manutencao', 'mnt_ajustes',      'Ajustes e regulações',   25.00, 'fixo', true, false, '20min', 213, 'Tampa + fixação · qualquer modelo standard'),
('mnt-ac-filter',    'Limpeza filtros ar condicionado',   'manutencao', 'mnt_climatizacao', 'Climatização',           49.00, 'fixo', true, true,  '45min', 214, 'Limpeza e higienização · até 2 unidades interiores'),
('mnt-baby-proof',   'Kit baby proofing básico',           'manutencao', 'mnt_seguranca',    'Segurança doméstica',    59.00, 'fixo', true, false, '60min', 215, 'Protecções tomadas + cantos + barreiras · kit incluído'),
('mnt-smoke-alarm',  'Instalação de detector de fumo',    'manutencao', 'mnt_seguranca',    'Segurança doméstica',    35.00, 'fixo', true, false, '20min', 216, 'Detector incluído · certificado CE · por unidade'),
('mnt-curtain-rod',  'Montagem de varão de cortinas',     'manutencao', 'mnt_fixacao',      'Fixação e suporte',      22.00, 'fixo', true, false, '20min', 217, 'Varão até 2m · suportes incluídos'),

-- CANALIZAÇÃO (4)
('can-dishwasher',      'Ligação de máquina de lavar louça', 'canalizacao', 'can_manutencao', 'Manutenção',       55.00, 'fixo', true, false, '30min', 210, 'Entrada de água + esgoto · verificação de estanqueidade'),
('can-washing-machine', 'Ligação de máquina de lavar roupa', 'canalizacao', 'can_manutencao', 'Manutenção',       45.00, 'fixo', true, false, '30min', 211, 'Entrada de água + esgoto · teste de funcionamento'),
('can-tap-replace',     'Substituição de torneira de cozinha','canalizacao','can_torneiras',  'Torneiras',         79.00, 'fixo', true, true,  '45min', 212, 'Torneira monocomando · material não incluído'),
('can-shower-head',     'Substituição de chuveiro',           'canalizacao','can_duche',      'Duche e banheira',  49.00, 'fixo', true, false, '30min', 213, 'Coluna ou duche fixo · material não incluído'),

-- ELÉTRICA (5)
('elc-led-ceiling',   'Instalação de foco LED embutido',  'eletrica', 'elc_iluminacao', 'Iluminação',              25.00, 'fixo', true, false, '20min', 210, 'Por foco · material não incluído'),
('elc-doorbell',      'Instalação de campainha',           'eletrica', 'elc_pontos',     'Tomadas e interruptores', 39.00, 'fixo', true, false, '30min', 211, 'Com ou sem fio · campainha não incluída'),
('elc-switch',        'Substituição de interruptor',       'eletrica', 'elc_pontos',     'Tomadas e interruptores', 29.00, 'fixo', true, true,  '20min', 212, 'Por ponto · material não incluído'),
('elc-outdoor-light', 'Instalação de luz exterior',        'eletrica', 'elc_iluminacao', 'Iluminação',              65.00, 'fixo', true, false, '60min', 213, 'Aplique ou projetor · material não incluído'),
('elc-socket-usb',    'Tomada com USB',                    'eletrica', 'elc_pontos',     'Tomadas e interruptores', 35.00, 'fixo', true, false, '20min', 214, 'Substituição de tomada simples · material incluído'),

-- JARDIM (3)
('jar-leaves',     'Limpeza de folhas',              'jardim', 'jar_poda', 'Poda e limpeza',       35.00, 'fixo', true, false, '60min', 210, 'Varrimento + ensacamento · jardim até 50m²'),
('jar-hedge',      'Poda de sebe',                   'jardim', 'jar_poda', 'Poda e limpeza',       45.00, 'fixo', true, true,  '60min', 211, 'Até 10m lineares · corte recto ou curvo · limpeza incluída'),
('jar-irrigation', 'Instalação de rega automática',  'jardim', 'jar_rega', 'Rega e equipamentos', 149.00, 'fixo', true, false, '3h',    212, 'Temporizador + 6 aspersores · jardim até 30m²'),

-- PINTURA (2)
('pnt-room', 'Pintura de quarto',       'pintura', 'pnt_interior', 'Interior', 189.00, 'fixo', true, true,  '1 dia', 210, 'Até 15m² · 2 demãos · cor escolhida pelo cliente'),
('pnt-door', 'Pintura de porta interior','pintura','pnt_especial', 'Especial',  45.00, 'fixo', true, false, '2h',    211, 'Por porta · lixa + primário + 2 demãos · tinta não incluída'),

-- PÓS-OBRA (2)
('pos-facade',   'Limpeza de fachada',     'pos_obra', 'pos_limpeza',    'Limpeza de obra',       89.00, 'fixo', true, false, '2h',    210, 'Lavagem pressão · até 20m² · sem andaimes'),
('pos-silicone', 'Aplicação de silicone',  'pos_obra', 'pos_acabamento', 'Remates e acabamentos', 35.00, 'fixo', true, true,  '30min', 211, 'Casa de banho ou cozinha · silicone sanitário incluído')

ON CONFLICT (id) DO NOTHING;
