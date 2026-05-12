-- ============================================================
-- ADR-V4-001: Motor BD-driven + Ingestão ERSE/OMIE
-- Data: 2026-05-12
-- Projecto: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
-- Aprovado por: Mário Carvalho em 2026-05-12
-- ============================================================
-- Nota de segurança: NUNCA altera eozklslwfaqujaijvdnl (V2 produção).
-- Este ficheiro corre APENAS em hkmvszkpxjbxmnixzqbl.
-- ============================================================


-- 1. EXTENSÃO DE v4_energia.tarifas
-- -----------------------------------------------------------
-- Colunas legado preservadas: id, comercializador_id, nome_plano, preco_kwh,
-- preco_potencia_dia, potencias_disponiveis, valida_desde, valida_ate,
-- activa (boolean legado), notas, created_at
-- NUNCA remover valida_desde / valida_ate nesta migration (período de transição).

ALTER TABLE v4_energia.tarifas
  ADD COLUMN IF NOT EXISTS tipo_energia TEXT NOT NULL DEFAULT 'electricidade'
    CONSTRAINT ck_tarifas_tipo_energia
    CHECK (tipo_energia IN ('electricidade', 'gas')),

  ADD COLUMN IF NOT EXISTS tipo_tarifa TEXT NOT NULL DEFAULT 'simples'
    CONSTRAINT ck_tarifas_tipo_tarifa
    CHECK (tipo_tarifa IN ('simples', 'bi_horaria', 'tri_horaria', 'indexada')),

  ADD COLUMN IF NOT EXISTS tipo_oferta TEXT NOT NULL DEFAULT 'fixa'
    CONSTRAINT ck_tarifas_tipo_oferta
    CHECK (tipo_oferta IN ('fixa', 'indexada', 'promocional', 'verde')),

  ADD COLUMN IF NOT EXISTS tensao TEXT NOT NULL DEFAULT 'BTN'
    CONSTRAINT ck_tarifas_tensao
    CHECK (tensao IN ('BTN', 'BTE')),

  ADD COLUMN IF NOT EXISTS periodo_horario TEXT NOT NULL DEFAULT 'simples'
    CONSTRAINT ck_tarifas_periodo_horario
    CHECK (periodo_horario IN ('simples', 'ponta', 'cheia', 'vazio', 'super_vazio')),

  ADD COLUMN IF NOT EXISTS potencia_kva_min NUMERIC(6,2) NOT NULL DEFAULT 0
    CONSTRAINT ck_tarifas_potencia_min CHECK (potencia_kva_min >= 0),

  ADD COLUMN IF NOT EXISTS potencia_kva_max NUMERIC(6,2) NOT NULL DEFAULT 999
    CONSTRAINT ck_tarifas_potencia_max CHECK (potencia_kva_max > 0),

  ADD COLUMN IF NOT EXISTS data_inicio_validade TIMESTAMPTZ NOT NULL DEFAULT now(),

  ADD COLUMN IF NOT EXISTS data_fim_validade TIMESTAMPTZ
    CONSTRAINT ck_tarifas_validade_range
    CHECK (data_fim_validade IS NULL OR data_fim_validade > data_inicio_validade),

  -- "ativo" é a nova coluna canónica (snake_case sem cedilha).
  -- "activa" (legado, boolean) mantém-se para retrocompatibilidade.
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true,

  ADD COLUMN IF NOT EXISTS fonte_ingestao TEXT DEFAULT 'manual'
    CONSTRAINT ck_tarifas_fonte
    CHECK (fonte_ingestao IN ('manual', 'erse_scraper', 'api_parceiro')),

  ADD COLUMN IF NOT EXISTS hash_conteudo TEXT,

  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Unique constraint para deduplicação por ingestão (hash_conteudo pode ser NULL — só aplica quando NOT NULL)
-- DEFERRABLE permite seed em bloco sem conflito de ordering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_tarifas_hash' AND conrelid = 'v4_energia.tarifas'::regclass
  ) THEN
    ALTER TABLE v4_energia.tarifas
      ADD CONSTRAINT uq_tarifas_hash UNIQUE (hash_conteudo)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END;
$$;

-- Índices estratégicos
CREATE INDEX IF NOT EXISTS idx_tarifas_ativo_validade
  ON v4_energia.tarifas (ativo, data_inicio_validade, data_fim_validade)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_tarifas_comercializador_tipo
  ON v4_energia.tarifas (comercializador_id, tipo_energia, tipo_tarifa, tensao);

CREATE INDEX IF NOT EXISTS idx_tarifas_potencia_range
  ON v4_energia.tarifas (potencia_kva_min, potencia_kva_max);

COMMENT ON COLUMN v4_energia.tarifas.ativo IS
  'Flag canónica (nova). Coluna legado "activa" mantém-se durante período de transição.';
COMMENT ON COLUMN v4_energia.tarifas.data_inicio_validade IS
  'Timestamp de início de validade (canónico). Substitui valida_desde (DATE legado) em Fase 2+.';
COMMENT ON COLUMN v4_energia.tarifas.hash_conteudo IS
  'SHA-256 do payload ingerido (comercializador|plano|preco|validade). Usado para deduplicação pelo scraper ERSE.';


-- 2. NOVA TABELA: v4_energia.omie_dam_horario
-- -----------------------------------------------------------
-- OMIE DAM = Mercado Diário Ibérico de Electricidade.
-- Preços horários publicados diariamente às 12h30 UTC pelo OMIE.
-- Usados para calcular propostas de tarifas indexadas.

CREATE TABLE IF NOT EXISTS v4_energia.omie_dam_horario (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data           DATE NOT NULL,
  hora           SMALLINT NOT NULL
    CONSTRAINT ck_omie_hora CHECK (hora BETWEEN 0 AND 23),
  preco_eur_mwh  NUMERIC(10,4) NOT NULL
    CONSTRAINT ck_omie_preco CHECK (preco_eur_mwh >= 0),
  zona           TEXT NOT NULL DEFAULT 'PT'
    CONSTRAINT ck_omie_zona CHECK (zona IN ('PT', 'ES')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_omie_data_hora_zona UNIQUE (data, hora, zona)
);

COMMENT ON TABLE v4_energia.omie_dam_horario IS
  'Preços horários OMIE DAM (Mercado Diário Ibérico de Electricidade). '
  'Ingeridos diariamente pela Edge Function v4-ingest-omie às 13h00 Lisboa. '
  'Usados para calcular propostas de tarifas indexadas (Coopernico Verde Indexado, Endesa Indexada, etc).';

COMMENT ON COLUMN v4_energia.omie_dam_horario.hora IS
  'Hora UTC (0-23). O OMIE publica em UTC. Converter para hora Lisboa ao apresentar ao utilizador.';

COMMENT ON COLUMN v4_energia.omie_dam_horario.preco_eur_mwh IS
  'Preço em EUR/MWh com 4 casas decimais (OMIE usa 2, margem para precisão futura). '
  'Para converter a EUR/kWh: preco_eur_mwh / 1000.';

-- RLS: staff autenticado pode fazer tudo; anon e condómino só leitura.
-- Racional: preços OMIE são dados públicos — sem restrição de leitura.
-- A escrita é reservada ao staff (Edge Function corre com service_role, bypass implícito).
ALTER TABLE v4_energia.omie_dam_horario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_omie"
  ON v4_energia.omie_dam_horario
  FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "public_read_omie"
  ON v4_energia.omie_dam_horario
  FOR SELECT TO anon, authenticated
  USING (true);

-- Índices: data DESC para queries "últimas N horas", (data, zona) para joins
CREATE INDEX IF NOT EXISTS idx_omie_data_desc
  ON v4_energia.omie_dam_horario (data DESC);

CREATE INDEX IF NOT EXISTS idx_omie_data_zona
  ON v4_energia.omie_dam_horario (data, zona);


-- 3. SEED: v4_energia.comercializadores (8 actuais)
-- -----------------------------------------------------------
-- Idempotente: só insere se tabela estiver vazia.
-- Preserva rows existentes caso já tenha sido executado.

INSERT INTO v4_energia.comercializadores (nome, activo)
SELECT * FROM (VALUES
  ('Eni Plenitude',  true),
  ('Luzboa',         true),
  ('Ibelectra',      true),
  ('Goldenergy',     true),
  ('Coopernico',     true),
  ('Endesa',         true),
  ('Galp Power',     true),
  ('EDP Comercial',  true)
) AS v(nome, activo)
WHERE NOT EXISTS (SELECT 1 FROM v4_energia.comercializadores LIMIT 1);


-- 4. SEED: v4_energia.tarifas (1 plano simples BTN por comercializador)
-- -----------------------------------------------------------
-- Idempotente: só insere se tarifas estiver vazia E comercializadores tiver 8 rows.
-- preco_kwh = TAR_ENERGIA ERSE 2026 (0.0689) + spread por comercializador (Notion estratégico).
-- Nota: "activa" (legado boolean) e "ativo" (nova coluna) ambos TRUE.
-- ON DELETE: FK para comercializadores → RESTRICT (não apagar comercializador com tarifas).

DO $$
DECLARE
  v_eni   UUID;
  v_luz   UUID;
  v_ibe   UUID;
  v_gol   UUID;
  v_cop   UUID;
  v_end   UUID;
  v_gal   UUID;
  v_edp   UUID;
BEGIN
  -- Guarda: só executa se tarifas estiver vazia
  IF EXISTS (SELECT 1 FROM v4_energia.tarifas LIMIT 1) THEN
    RAISE NOTICE 'Tarifas já têm dados — seed ignorado.';
    RETURN;
  END IF;

  -- Guarda: só executa se os 8 comercializadores existirem
  IF (SELECT COUNT(*) FROM v4_energia.comercializadores WHERE activo = true) < 8 THEN
    RAISE NOTICE 'Comercializadores insuficientes — seed tarifas ignorado.';
    RETURN;
  END IF;

  SELECT id INTO v_eni FROM v4_energia.comercializadores WHERE nome = 'Eni Plenitude' LIMIT 1;
  SELECT id INTO v_luz FROM v4_energia.comercializadores WHERE nome = 'Luzboa' LIMIT 1;
  SELECT id INTO v_ibe FROM v4_energia.comercializadores WHERE nome = 'Ibelectra' LIMIT 1;
  SELECT id INTO v_gol FROM v4_energia.comercializadores WHERE nome = 'Goldenergy' LIMIT 1;
  SELECT id INTO v_cop FROM v4_energia.comercializadores WHERE nome = 'Coopernico' LIMIT 1;
  SELECT id INTO v_end FROM v4_energia.comercializadores WHERE nome = 'Endesa' LIMIT 1;
  SELECT id INTO v_gal FROM v4_energia.comercializadores WHERE nome = 'Galp Power' LIMIT 1;
  SELECT id INTO v_edp FROM v4_energia.comercializadores WHERE nome = 'EDP Comercial' LIMIT 1;

  INSERT INTO v4_energia.tarifas
    (comercializador_id, nome_plano, preco_kwh,
     tipo_energia, tipo_tarifa, tipo_oferta,
     tensao, periodo_horario,
     potencia_kva_min, potencia_kva_max,
     data_inicio_validade, ativo, activa,
     fonte_ingestao, valida_desde)
  VALUES
    -- preco_kwh = TAR base 0.0689 + spread (fonte: Notion estratégico V4)
    -- Eni Plenitude: spread 0.0600 → total 0.1289 €/kWh
    (v_eni, 'Eni Plenitude Simples BTN',  0.1289, 'electricidade', 'simples', 'fixa',     'BTN', 'simples', 1.15, 41.4,  now(), true, true, 'manual', CURRENT_DATE),
    -- Luzboa: spread 0.0630 → total 0.1319 €/kWh
    (v_luz, 'Luzboa Simples BTN',         0.1319, 'electricidade', 'simples', 'fixa',     'BTN', 'simples', 1.15, 41.4,  now(), true, true, 'manual', CURRENT_DATE),
    -- Ibelectra: spread 0.0690 → total 0.1379 €/kWh
    (v_ibe, 'Ibelectra Simples BTN',      0.1379, 'electricidade', 'simples', 'fixa',     'BTN', 'simples', 1.15, 41.4,  now(), true, true, 'manual', CURRENT_DATE),
    -- Goldenergy: spread 0.0740 → total 0.1429 €/kWh
    (v_gol, 'Goldenergy Simples BTN',     0.1429, 'electricidade', 'simples', 'fixa',     'BTN', 'simples', 1.15, 41.4,  now(), true, true, 'manual', CURRENT_DATE),
    -- Coopernico: spread 0.0710 → total 0.1399 €/kWh (verde — energia 100% renovável)
    (v_cop, 'Coopernico Simples BTN',     0.1399, 'electricidade', 'simples', 'verde',    'BTN', 'simples', 1.15, 41.4,  now(), true, true, 'manual', CURRENT_DATE),
    -- Endesa: spread 0.0820 → total 0.1509 €/kWh
    (v_end, 'Endesa Simples BTN',         0.1509, 'electricidade', 'simples', 'fixa',     'BTN', 'simples', 1.15, 41.4,  now(), true, true, 'manual', CURRENT_DATE),
    -- Galp Power: spread 0.0880 → total 0.1569 €/kWh
    (v_gal, 'Galp Power Simples BTN',     0.1569, 'electricidade', 'simples', 'fixa',     'BTN', 'simples', 1.15, 41.4,  now(), true, true, 'manual', CURRENT_DATE),
    -- EDP Comercial: spread 0.1062 → total 0.1751 €/kWh (incumbente, spread mais alto)
    (v_edp, 'EDP Comercial Simples BTN',  0.1751, 'electricidade', 'simples', 'fixa',     'BTN', 'simples', 1.15, 41.4,  now(), true, true, 'manual', CURRENT_DATE);

  RAISE NOTICE 'Seed tarifas: 8 planos inseridos com sucesso.';
END;
$$;


-- 5. SCHEDULES pg_cron
-- -----------------------------------------------------------
-- NOTA: As linhas abaixo são REFERÊNCIA — executadas pelo supabase-designer via MCP
-- separadamente (requerem pg_cron activo e service_role_key configurada).
-- NÃO incluir aqui para não falhar a migration se pg_cron não estiver activo.
--
-- v4-ingest-erse: Domingo 03h00 UTC (= 03h00-04h00 Lisboa conforme DST)
-- SELECT cron.schedule('v4-ingest-erse-weekly', '0 3 * * 0', ...);
--
-- v4-ingest-omie: Diário 13h00 UTC (após publicação DAM às 12h30 UTC)
-- SELECT cron.schedule('v4-ingest-omie-daily', '0 13 * * *', ...);
