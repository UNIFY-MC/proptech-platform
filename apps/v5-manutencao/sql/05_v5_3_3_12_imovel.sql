-- 3.3.12 — Imóvel rico: novas colunas + backfill Maria + GPS
-- Idempotente: usa ADD COLUMN IF NOT EXISTS

ALTER TABLE v5_manutencao.localizacoes
  ADD COLUMN IF NOT EXISTS num_quartos      int,
  ADD COLUMN IF NOT EXISTS num_wcs          int,
  ADD COLUMN IF NOT EXISTS num_pisos        int,
  ADD COLUMN IF NOT EXISTS foto_principal_url text;

-- Backfill Maria: Casa Principal (Coimbra)
UPDATE v5_manutencao.localizacoes SET
  tipologia       = 'T2',
  area_m2         = 85,
  ano_construcao  = 1985,
  num_quartos     = 2,
  num_wcs         = 1,
  num_pisos       = 1,
  coords          = '(-8.4287,40.2110)'::point
WHERE id = '52cd3ed3-29eb-4d0e-baca-fcb1b81695b8';

-- Backfill Maria: Apartamento Lisboa
UPDATE v5_manutencao.localizacoes SET
  tipologia       = 'T1',
  area_m2         = 58,
  ano_construcao  = 2002,
  num_quartos     = 1,
  num_wcs         = 1,
  num_pisos       = 1,
  coords          = '(-9.1417,38.7223)'::point
WHERE id = '0ac3b9f7-5dc0-4902-bfa3-31445075be8a';

-- Backfill Maria: Casa de Férias (Faro)
UPDATE v5_manutencao.localizacoes SET
  tipologia       = 'V3',
  area_m2         = 130,
  ano_construcao  = 2015,
  num_quartos     = 3,
  num_wcs         = 2,
  num_pisos       = 2,
  coords          = '(-7.9304,37.0194)'::point
WHERE id = '4bdb86a6-778c-4af0-8871-8a4f40ac310d';
