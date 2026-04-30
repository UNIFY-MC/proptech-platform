-- =============================================================================
-- Sprint 1B.4 — Schema geo + weather (Open-Meteo + multi-país)
-- =============================================================================
--
-- Schema preparado desde o início para qualquer país. Hoje só PT é importado
-- (via V2 CSV). Quando entrar novo país: download GeoNames {country}.zip e
-- run seed-codigos-postais.ts --country=XX.
--
-- 3 estruturas:
-- 1. core.codigos_postais — referência partilhada multi-país
-- 2. v5_manutencao.weather_forecast_cache — cache forecast (Open-Meteo)
-- 3. v5_manutencao.localizacoes — colunas geo (coords já existe)
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- 1. core.codigos_postais (universal, multi-país)
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.codigos_postais (
  -- Identidade universal
  pais            TEXT NOT NULL DEFAULT 'PT',   -- ISO 3166-1 alpha-2
  cp_completo     TEXT NOT NULL,                -- formato local: '2500-296' (PT), '10001' (US)

  -- Decomposição por país (helper queries)
  cp4             TEXT,       -- PT: 4 primeiros dígitos. NULL outros países.
  cp3             TEXT,       -- PT: 3 últimos. NULL outros.

  -- Localização
  localidade          TEXT NOT NULL,
  designacao_postal   TEXT,

  -- Hierarquia administrativa (padrão GeoNames — universal)
  admin1  TEXT,   -- PT: distrito  | US: state    | FR: région
  admin2  TEXT,   -- PT: concelho  | US: county
  admin3  TEXT,   -- PT: freguesia | UK: parish

  -- Geolocalização (centróide)
  coords      POINT,
  precisao    INTEGER,  -- GeoNames accuracy 1-6

  -- Origem (auditoria)
  source          TEXT NOT NULL,  -- 'v2-import-pt', 'geonames-pt', 'browser-capture'
  source_version  TEXT,           -- data export, versão dataset

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- PK composta: 1 CP pode ter múltiplas localidades em vários países
  PRIMARY KEY (pais, cp_completo, localidade)
);

CREATE INDEX IF NOT EXISTS idx_cp_pais
  ON core.codigos_postais(pais);
CREATE INDEX IF NOT EXISTS idx_cp_pais_cp4
  ON core.codigos_postais(pais, cp4) WHERE cp4 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_pais_localidade_lower
  ON core.codigos_postais(pais, LOWER(localidade));
CREATE INDEX IF NOT EXISTS idx_cp_coords
  ON core.codigos_postais USING GIST(coords) WHERE coords IS NOT NULL;

-- GRANTs (Regra W + Regra FF)
GRANT SELECT ON core.codigos_postais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.codigos_postais TO service_role;
REVOKE ALL ON core.codigos_postais FROM anon;

ALTER TABLE core.codigos_postais DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE core.codigos_postais IS
  'Códigos postais multi-país. Schema GeoNames-compatível.
   Hoje: PT (V2 import, 205k rows, sem coords/admin).
   Futuro: enrichment via GeoNames + outros países a partir do mesmo dataset.
   Source field permite auditoria de proveniência.';

COMMENT ON COLUMN core.codigos_postais.pais IS
  'ISO 3166-1 alpha-2 (PT, ES, FR, US, ...)';
COMMENT ON COLUMN core.codigos_postais.admin1 IS
  'Nível 1 administrativo (distrito PT, state US, région FR)';
COMMENT ON COLUMN core.codigos_postais.admin2 IS
  'Nível 2 administrativo (concelho PT, county US)';
COMMENT ON COLUMN core.codigos_postais.admin3 IS
  'Nível 3 administrativo (freguesia PT, parish UK)';
COMMENT ON COLUMN core.codigos_postais.cp4 IS
  'PT-only: 4 primeiros dígitos para autocomplete rápido. NULL para outros países.';
COMMENT ON COLUMN core.codigos_postais.precisao IS
  'GeoNames accuracy: 1=country, 2=admin1, 3=admin2, 4=city, 5=neighborhood, 6=building';
COMMENT ON COLUMN core.codigos_postais.source IS
  'Origem do dado: "v2-import-pt", "geonames-XX", "browser-capture", etc.';

-- ───────────────────────────────────────────────────────────────────────
-- 2. v5_manutencao.weather_forecast_cache (Open-Meteo, TTL 6h)
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v5_manutencao.weather_forecast_cache (
  cache_key   TEXT PRIMARY KEY,
  -- Formato: "lat:LL.LLLL,lng:LL.LLLL" (4 decimais ≈ 11m)
  -- Casas vizinhas partilham a mesma entrada de cache

  raw_json    JSONB NOT NULL,
  alerts      JSONB,
  source      TEXT NOT NULL DEFAULT 'open-meteo',

  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours')
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_expires
  ON v5_manutencao.weather_forecast_cache(expires_at);

GRANT SELECT ON v5_manutencao.weather_forecast_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON v5_manutencao.weather_forecast_cache TO service_role;
REVOKE ALL ON v5_manutencao.weather_forecast_cache FROM anon;

ALTER TABLE v5_manutencao.weather_forecast_cache DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE v5_manutencao.weather_forecast_cache IS
  'Cache genérico de forecast meteorológico. cache_key = "lat:LL.LLLL,lng:LL.LLLL"
   (4 decimais, ~11m). Casas no mesmo bairro partilham cache. TTL 6h.
   Source actual: open-meteo (free non-comercial em dev, plano pago em produção).';

-- ───────────────────────────────────────────────────────────────────────
-- 3. v5_manutencao.localizacoes — colunas geo (coords já existe desde 3.3.12)
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE v5_manutencao.localizacoes
  ADD COLUMN IF NOT EXISTS geo_capturada_em  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geo_precisao_m    NUMERIC;

-- pais pode já existir (verificar antes de adicionar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'v5_manutencao'
      AND table_name   = 'localizacoes'
      AND column_name  = 'pais'
  ) THEN
    ALTER TABLE v5_manutencao.localizacoes
      ADD COLUMN pais TEXT DEFAULT 'PT';
  END IF;
END $$;

COMMENT ON COLUMN v5_manutencao.localizacoes.geo_capturada_em IS
  'Timestamp da captura GPS via browser geolocation. NULL se nunca capturado.';
COMMENT ON COLUMN v5_manutencao.localizacoes.geo_precisao_m IS
  'Precisão GPS em metros (browser geolocation accuracy).
   Útil Onda 2.x anti-cheat: validação chegada prestador.';

COMMIT;

-- =============================================================================
-- Verificação pós-aplicação (correr separadamente após COMMIT):
--
-- -- Tabelas criadas
-- SELECT table_schema, table_name FROM information_schema.tables
-- WHERE table_name IN ('codigos_postais', 'weather_forecast_cache')
-- ORDER BY table_schema;
-- -- Espera: 2 linhas (core + v5_manutencao)
--
-- -- Colunas codigos_postais (espera ~14 colunas)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='core' AND table_name='codigos_postais'
-- ORDER BY ordinal_position;
--
-- -- Indexes (espera 4 + PK)
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname='core' AND tablename='codigos_postais';
--
-- -- Localizacoes: colunas novas
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='v5_manutencao' AND table_name='localizacoes'
--   AND column_name IN ('geo_capturada_em', 'geo_precisao_m', 'pais')
-- ORDER BY column_name;
-- -- Espera: 3 linhas
--
-- -- GRANTs correctos (Regra W)
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_schema='core' AND table_name='codigos_postais'
-- ORDER BY grantee, privilege_type;
-- -- Espera: authenticated→SELECT, service_role→DELETE/INSERT/SELECT/UPDATE
--
-- -- Após npm run seed:cp — smoke dos 2 CPs de teste:
-- SELECT cp_completo, localidade, source FROM core.codigos_postais
-- WHERE pais='PT' AND cp_completo IN ('2500-296','1950-322')
-- ORDER BY cp_completo;
-- -- Espera: 2500-296 → CALDAS DA RAINHA, 1950-322 → LISBOA (source='v2-import-pt')
-- =============================================================================
