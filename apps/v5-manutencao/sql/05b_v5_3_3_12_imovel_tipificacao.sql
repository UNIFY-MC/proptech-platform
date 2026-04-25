-- 3.3.12b — Tipificação de imóveis: categoria, uso, origem, sistemas, amenities
-- Idempotente: ADD COLUMN IF NOT EXISTS + ON CONFLICT DO NOTHING

-- ─────────────────────────────────────────────
-- 1. Novas colunas
-- ─────────────────────────────────────────────

ALTER TABLE v5_manutencao.localizacoes
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'habitacional'
    CHECK (categoria IN ('habitacional','comercial','industrial','rural','condominio')),
  ADD COLUMN IF NOT EXISTS uso text DEFAULT 'residencia_principal'
    CHECK (uso IN (
      'residencia_principal','segunda_habitacao','AL_airbnb',
      'arrendado_LT','actividade_propria','cedido','vazio','obras',
      'gestao_terceiros'
    )),
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'v5_cliente'
    CHECK (origem IN ('v5_cliente','v2_sync')),
  ADD COLUMN IF NOT EXISTS v2_legacy_id text,
  ADD COLUMN IF NOT EXISTS sistemas_geridos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS amenities jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_loc_categoria ON v5_manutencao.localizacoes(categoria);
CREATE INDEX IF NOT EXISTS idx_loc_origem    ON v5_manutencao.localizacoes(origem);
CREATE INDEX IF NOT EXISTS idx_loc_uso       ON v5_manutencao.localizacoes(uso);

-- ─────────────────────────────────────────────
-- 2. Backfill imóveis existentes de Maria
-- ─────────────────────────────────────────────

-- Casa Principal (Coimbra · habitacional T2 · residência principal)
UPDATE v5_manutencao.localizacoes SET
  categoria        = 'habitacional',
  uso              = 'residencia_principal',
  sistemas_geridos = '["avac","aguas_quentes","canalizacao","eletrica","gas","limpeza","electrodomesticos"]'::jsonb,
  amenities        = '{"tem_jardim":true,"tem_garagem":false}'::jsonb
WHERE id = '52cd3ed3-29eb-4d0e-baca-fcb1b81695b8';

-- Apartamento Lisboa (AL / Airbnb)
UPDATE v5_manutencao.localizacoes SET
  categoria        = 'habitacional',
  uso              = 'AL_airbnb',
  sistemas_geridos = '["avac","aguas_quentes","canalizacao","eletrica","limpeza","internet","lavandaria"]'::jsonb,
  amenities        = '{"tem_alarme":true,"tem_terraco":true}'::jsonb
WHERE id = '0ac3b9f7-5dc0-4902-bfa3-31445075be8a';

-- Casa de Férias (Faro · segunda habitação)
UPDATE v5_manutencao.localizacoes SET
  categoria        = 'habitacional',
  uso              = 'segunda_habitacao',
  sistemas_geridos = '["avac","aguas_quentes","canalizacao","eletrica","gas","piscina","jardim","monitoring_remoto"]'::jsonb,
  amenities        = '{"tem_piscina":true,"tem_jardim":true,"tem_garagem":true,"tem_alarme":true}'::jsonb
WHERE id = '4bdb86a6-778c-4af0-8871-8a4f40ac310d';

-- ─────────────────────────────────────────────
-- 3. Inserir Loja Centro CBR (4.º imóvel Maria)
-- ─────────────────────────────────────────────

INSERT INTO v5_manutencao.localizacoes (
  pessoa_id, nome, categoria, tipo, tipologia, uso,
  rua, numero, codigo_postal, cidade, distrito, pais, principal,
  area_m2, ano_construcao, num_pisos,
  sistemas_geridos, amenities,
  origem, home_score, coords
)
SELECT
  '9ef5000a-827b-4486-9c5d-352545e4de91',
  'Loja Centro CBR', 'comercial', 'empresa', 'Loja', 'actividade_propria',
  'R. Visconde da Luz', '24', '3000-052', 'Coimbra', 'Coimbra', 'PT', false,
  35, 1995, 1,
  '["avac","eletrica","seguranca_alarme","cctv","limpeza","frio_comercial","montra"]'::jsonb,
  '{"tem_alarme":true}'::jsonb,
  'v5_cliente', 60, '(-8.4290,40.2089)'::point
WHERE NOT EXISTS (
  SELECT 1 FROM v5_manutencao.localizacoes
  WHERE pessoa_id = '9ef5000a-827b-4486-9c5d-352545e4de91'
    AND nome = 'Loja Centro CBR'
);

-- ─────────────────────────────────────────────
-- 4. Inserir Cond. Edifício Estrela (5.º imóvel Maria · v2_sync)
-- ─────────────────────────────────────────────

INSERT INTO v5_manutencao.localizacoes (
  pessoa_id, nome, categoria, tipo, tipologia, uso,
  rua, numero, codigo_postal, cidade, distrito, pais, principal,
  ano_construcao,
  sistemas_geridos, amenities,
  origem, v2_legacy_id, home_score, coords
)
SELECT
  '9ef5000a-827b-4486-9c5d-352545e4de91',
  'Cond. Edifício Estrela', 'condominio', 'condominio', 'Prédio', 'gestao_terceiros',
  'Av. da República', '50', '1050-191', 'Lisboa', 'Lisboa', 'PT', false,
  2002,
  '["elevador","limpeza_partes_comuns","iluminacao_comum","anti_incendio","cctv","jardim_comum","garagem_comum"]'::jsonb,
  '{"tem_elevador":true,"tem_garagem":true,"tem_jardim":true,"num_fracoes":24,"num_pisos_total":5}'::jsonb,
  'v2_sync', 'v2-cond-1234', 78, '(-9.1500,38.7349)'::point
WHERE NOT EXISTS (
  SELECT 1 FROM v5_manutencao.localizacoes
  WHERE pessoa_id = '9ef5000a-827b-4486-9c5d-352545e4de91'
    AND nome = 'Cond. Edifício Estrela'
);
