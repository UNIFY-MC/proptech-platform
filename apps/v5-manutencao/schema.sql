-- =================================================================
-- V5 MANUTENÇÃO — Schema inicial
-- Projecto: PropTech V1 Core Hub (hkmvszkpxjbxmnixzqbl)
-- Região: eu-west-3
-- Data: 19 Abril 2026
-- =================================================================
-- Aplicar via: Supabase Dashboard → SQL Editor → New query
-- Link directo: https://supabase.com/dashboard/project/hkmvszkpxjbxmnixzqbl/sql/new
-- =================================================================

-- ─── Schema ───
CREATE SCHEMA IF NOT EXISTS v5_manutencao;

-- ─── Tabela: catalogo_servicos ───
-- Catálogo de serviços disponíveis (limpeza mensal, jardim, piscina, etc.)
CREATE TABLE v5_manutencao.catalogo_servicos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          TEXT UNIQUE NOT NULL,
  nome            TEXT NOT NULL,
  categoria       TEXT NOT NULL CHECK (categoria IN (
    'limpeza','manutencao','jardim','piscina','pintura','eletrica','canalizacao','obra'
  )),
  descricao       TEXT,
  preco_base      NUMERIC(10,2) NOT NULL CHECK (preco_base > 0),
  unidade         TEXT DEFAULT '/visita' CHECK (unidade IN ('/visita','/mês','fixo','/hora','/m2')),
  duracao_tipica  TEXT,
  icon_emoji      TEXT,
  badge           TEXT CHECK (badge IN ('Destaque','Popular','Urgente','Novo') OR badge IS NULL),
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Tabela: prestadores ───
-- Técnicos/profissionais que executam os serviços
CREATE TABLE v5_manutencao.prestadores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         UUID REFERENCES core.pessoas(id) ON DELETE SET NULL,
  nome              TEXT NOT NULL,
  iniciais          TEXT,
  categorias        TEXT[] NOT NULL DEFAULT '{}',
  rating_medio      NUMERIC(3,2) DEFAULT 5.00 CHECK (rating_medio >= 0 AND rating_medio <= 5),
  num_servicos      INT DEFAULT 0,
  anos_experiencia  INT DEFAULT 0,
  localizacao       TEXT,
  estado            TEXT DEFAULT 'activo' CHECK (estado IN ('activo','ocupado','inactivo','suspenso')),
  aprovado          BOOLEAN DEFAULT false,
  iban              TEXT,
  nivel             TEXT DEFAULT 'base' CHECK (nivel IN ('base','silver','gold','elite')),
  telemovel         TEXT,
  email             TEXT,
  notas_internas    TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── Tabela: servicos_contratados ───
-- Serviços activos dos clientes (contratos recorrentes ou avulsos)
CREATE TABLE v5_manutencao.servicos_contratados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE RESTRICT,
  imovel_id         UUID REFERENCES core.imoveis(id) ON DELETE SET NULL,
  catalogo_id       UUID NOT NULL REFERENCES v5_manutencao.catalogo_servicos(id) ON DELETE RESTRICT,
  prestador_id      UUID REFERENCES v5_manutencao.prestadores(id) ON DELETE SET NULL,
  periodicidade     TEXT DEFAULT 'mensal' CHECK (periodicidade IN (
    'mensal','quinzenal','semanal','trimestral','anual','pontual'
  )),
  valor_mensal      NUMERIC(10,2),
  valor_unitario    NUMERIC(10,2),
  data_inicio       DATE DEFAULT CURRENT_DATE,
  data_fim          DATE,
  estado            TEXT DEFAULT 'activo' CHECK (estado IN (
    'activo','pausado','cancelado','concluido'
  )),
  notas             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── Tabela: ordens_trabalho ───
-- Ordens individuais de execução (cada visita/serviço é uma OT)
CREATE TABLE v5_manutencao.ordens_trabalho (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id        UUID REFERENCES v5_manutencao.servicos_contratados(id) ON DELETE SET NULL,
  pessoa_id         UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE RESTRICT,
  imovel_id         UUID REFERENCES core.imoveis(id) ON DELETE SET NULL,
  catalogo_id       UUID REFERENCES v5_manutencao.catalogo_servicos(id) ON DELETE SET NULL,
  prestador_id      UUID REFERENCES v5_manutencao.prestadores(id) ON DELETE SET NULL,
  morada_intervencao TEXT,
  data_agendada     TIMESTAMPTZ NOT NULL,
  data_inicio       TIMESTAMPTZ,
  data_conclusao    TIMESTAMPTZ,
  estado            TEXT DEFAULT 'pendente' CHECK (estado IN (
    'pendente','atribuida','em_curso','concluida','cancelada'
  )),
  fotos_urls        TEXT[] DEFAULT '{}',
  relatorio         TEXT,
  notas_cliente     TEXT,
  notas_prestador   TEXT,
  assinatura_cliente BOOLEAN DEFAULT false,
  avaliacao_cliente INT CHECK (avaliacao_cliente >= 1 AND avaliacao_cliente <= 5),
  comentario_cliente TEXT,
  valor_ot          NUMERIC(10,2),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── Índices ───
CREATE INDEX idx_servicos_pessoa ON v5_manutencao.servicos_contratados(pessoa_id);
CREATE INDEX idx_servicos_estado ON v5_manutencao.servicos_contratados(estado);
CREATE INDEX idx_ot_pessoa ON v5_manutencao.ordens_trabalho(pessoa_id);
CREATE INDEX idx_ot_prestador ON v5_manutencao.ordens_trabalho(prestador_id);
CREATE INDEX idx_ot_estado ON v5_manutencao.ordens_trabalho(estado);
CREATE INDEX idx_ot_data ON v5_manutencao.ordens_trabalho(data_agendada DESC);
CREATE INDEX idx_catalogo_categoria ON v5_manutencao.catalogo_servicos(categoria);
CREATE INDEX idx_catalogo_ativo ON v5_manutencao.catalogo_servicos(ativo);

-- ─── Trigger updated_at (igual ao v4_energia) ───
CREATE OR REPLACE FUNCTION v5_manutencao.tg_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_catalogo_updated BEFORE UPDATE ON v5_manutencao.catalogo_servicos
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.tg_update_timestamp();
CREATE TRIGGER tg_prestadores_updated BEFORE UPDATE ON v5_manutencao.prestadores
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.tg_update_timestamp();
CREATE TRIGGER tg_servicos_updated BEFORE UPDATE ON v5_manutencao.servicos_contratados
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.tg_update_timestamp();
CREATE TRIGGER tg_ot_updated BEFORE UPDATE ON v5_manutencao.ordens_trabalho
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.tg_update_timestamp();

-- ─── RLS (DESLIGADA em DEV — activar quando login estiver pronto) ───
-- IMPORTANTE: em produção, activa RLS com as policies comentadas em baixo.
-- Por agora, deixa desligada para facilitar leitura/escrita em desenvolvimento.

-- ALTER TABLE v5_manutencao.catalogo_servicos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE v5_manutencao.prestadores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE v5_manutencao.servicos_contratados ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE v5_manutencao.ordens_trabalho ENABLE ROW LEVEL SECURITY;

-- POLICY FUTURAS (comentadas por agora):
-- Cliente vê apenas os seus próprios serviços e OTs:
--   CREATE POLICY cliente_servicos ON v5_manutencao.servicos_contratados
--     FOR SELECT TO authenticated USING (pessoa_id = auth.uid());
--   CREATE POLICY cliente_ots ON v5_manutencao.ordens_trabalho
--     FOR SELECT TO authenticated USING (pessoa_id = auth.uid());
-- Prestador vê apenas OTs atribuídas a ele:
--   CREATE POLICY prestador_ots ON v5_manutencao.ordens_trabalho
--     FOR ALL TO authenticated
--     USING (prestador_id IN (SELECT id FROM v5_manutencao.prestadores WHERE pessoa_id = auth.uid()));
-- Staff admin vê tudo:
--   CREATE POLICY staff_admin_all ON v5_manutencao.ordens_trabalho
--     FOR ALL TO authenticated
--     USING ((auth.jwt() -> 'app_metadata' ->> 'v5_manutencao_role') = 'admin');

-- =================================================================
-- SEED DATA — dados de exemplo do HTML V5
-- =================================================================

-- Catálogo de serviços (8 tipos do HTML)
INSERT INTO v5_manutencao.catalogo_servicos (codigo, nome, categoria, descricao, preco_base, unidade, duracao_tipica, icon_emoji, badge) VALUES
  ('S001', 'Plano Anual Preventivo',  'manutencao',  'Contrato anual preventivo com revisões trimestrais programadas', 49,  '/mês',    'Recorrente', '🛡️', 'Destaque'),
  ('S002', 'Limpeza Mensal',          'limpeza',     'Limpeza profunda mensal com equipa fixa',                        75,  '/visita', '3–5h',       '🧹', NULL),
  ('S003', 'Limpeza Pós-Obra',        'limpeza',     'Limpeza especializada após obras ou remodelações',              120, 'fixo',    '4–8h',       '🏗️', 'Popular'),
  ('S004', 'Manutenção de Jardim',    'jardim',      'Corte de relva, poda e manutenção geral do espaço exterior',    45,  '/visita', '2–3h',       '🌿', NULL),
  ('S005', 'Manutenção de Piscina',   'piscina',     'Tratamento químico e limpeza mensal da piscina',                55,  '/visita', '1–2h',       '🏊', NULL),
  ('S006', 'Urgência Canalização',    'canalizacao', 'Resposta rápida a fugas e desentupimentos',                     65,  'fixo',    '1–2h',       '🚿', 'Urgente'),
  ('S007', 'Instalação Elétrica',     'eletrica',    'Instalação de pontos de luz, tomadas e quadros',                80,  'fixo',    '2–4h',       '⚡', NULL),
  ('S008', 'Pintura de Divisão',      'pintura',     'Pintura completa de divisão incluindo preparação',              90,  'fixo',    '4–6h',       '🎨', NULL);

-- Prestadores iniciais (4 técnicos do HTML)
INSERT INTO v5_manutencao.prestadores (nome, iniciais, categorias, rating_medio, num_servicos, anos_experiencia, localizacao, estado, aprovado, nivel) VALUES
  ('António Ferreira', 'AF', ARRAY['limpeza','obra'],             4.9, 340, 8,  'Caldas da Rainha', 'activo',  true, 'gold'),
  ('Ricardo Gomes',    'RG', ARRAY['canalizacao','eletrica'],     4.8, 520, 12, 'Óbidos',           'activo',  true, 'silver'),
  ('Sandra Matos',     'SM', ARRAY['limpeza'],                    5.0, 190, 6,  'Caldas da Rainha', 'activo',  true, 'base'),
  ('Manuel Costa',     'MC', ARRAY['jardim','piscina'],           4.7, 210, 9,  'Alcobaça',         'ocupado', true, 'silver');

-- =================================================================
-- VERIFICAÇÃO
-- =================================================================
-- Depois de correr, verifica:
-- SELECT count(*) FROM v5_manutencao.catalogo_servicos;   -- deve dar 8
-- SELECT count(*) FROM v5_manutencao.prestadores;         -- deve dar 4
-- SELECT count(*) FROM v5_manutencao.servicos_contratados; -- deve dar 0 (ainda sem clientes)
-- SELECT count(*) FROM v5_manutencao.ordens_trabalho;     -- deve dar 0
