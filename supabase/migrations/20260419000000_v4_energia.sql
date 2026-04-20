-- =============================================================================
-- V4 Energia — Schema, Tabelas, RLS e Seed
-- Projecto: PropTech Platform (Portugal)
-- TAR: Tarifas de Acesso às Redes 2026
-- Executar no Supabase SQL Editor
-- =============================================================================


-- =============================================================================
-- 1. SCHEMA
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS v4_energia;


-- =============================================================================
-- 2. TABELAS
-- =============================================================================

-- 2a. Acordos com Comercializadoras (tabela de referência)
CREATE TABLE IF NOT EXISTS v4_energia.acordos_comercializadoras (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                 text        NOT NULL,
    codigo               text        NOT NULL UNIQUE,
    desconto_tar_pct     numeric,                        -- % de desconto na TAR 2026
    preco_kwh_vazio      numeric,                        -- €/kWh — período vazio
    preco_kwh_fora_vazio numeric,                        -- €/kWh — fora de vazio
    preco_kwh_ponta      numeric,                        -- €/kWh — ponta
    ativa                boolean     NOT NULL DEFAULT true,
    created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  v4_energia.acordos_comercializadoras                IS 'Comercializadoras de energia elétrica com condições acordadas para a plataforma V4 Energia';
COMMENT ON COLUMN v4_energia.acordos_comercializadoras.desconto_tar_pct     IS 'Percentagem de desconto aplicada sobre a TAR 2026 (Tarifas de Acesso às Redes)';
COMMENT ON COLUMN v4_energia.acordos_comercializadoras.preco_kwh_vazio      IS 'Preço em €/kWh para o período tarifário vazio';
COMMENT ON COLUMN v4_energia.acordos_comercializadoras.preco_kwh_fora_vazio IS 'Preço em €/kWh para o período tarifário fora de vazio';
COMMENT ON COLUMN v4_energia.acordos_comercializadoras.preco_kwh_ponta      IS 'Preço em €/kWh para o período tarifário ponta';


-- 2b. Contratos de Energia (pipeline de leads)
CREATE TABLE IF NOT EXISTS v4_energia.contratos_energia (
    id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id              uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    comercializadora_id    uuid        REFERENCES v4_energia.acordos_comercializadoras (id) ON DELETE SET NULL,
    tipo_contrato          text        NOT NULL CHECK (tipo_contrato IN ('BTN', 'BTE', 'MT')),
    potencia_contratada_kva numeric,
    consumo_anual_kwh       numeric,
    tar_ciclo               text        CHECK (tar_ciclo IN ('diario', 'semanal')),
    poupanca_estimada_eur   numeric,
    estado                  text        NOT NULL DEFAULT 'lead'
                                        CHECK (estado IN ('lead', 'em_analise', 'contratado', 'cancelado')),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  v4_energia.contratos_energia                        IS 'Pipeline de leads e contratos de energia da vertical V4 Energia';
COMMENT ON COLUMN v4_energia.contratos_energia.pessoa_id              IS 'Referência ao utilizador autenticado (auth.users)';
COMMENT ON COLUMN v4_energia.contratos_energia.tipo_contrato          IS 'Escalão de tensão: BTN (Baixa Tensão Normal), BTE (Baixa Tensão Especial), MT (Média Tensão)';
COMMENT ON COLUMN v4_energia.contratos_energia.tar_ciclo              IS 'Ciclo TAR 2026 aplicável: diario ou semanal';
COMMENT ON COLUMN v4_energia.contratos_energia.poupanca_estimada_eur  IS 'Poupança anual estimada em EUR face ao contrato actual do cliente';
COMMENT ON COLUMN v4_energia.contratos_energia.estado                 IS 'Estado do pipeline: lead → em_analise → contratado | cancelado';


-- =============================================================================
-- 3. TRIGGER — updated_at em contratos_energia
-- =============================================================================

CREATE OR REPLACE FUNCTION v4_energia.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_energia_updated_at ON v4_energia.contratos_energia;

CREATE TRIGGER trg_contratos_energia_updated_at
    BEFORE UPDATE ON v4_energia.contratos_energia
    FOR EACH ROW
    EXECUTE FUNCTION v4_energia.set_updated_at();


-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- 4a. Activar RLS nas duas tabelas
ALTER TABLE v4_energia.acordos_comercializadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_energia.contratos_energia          ENABLE ROW LEVEL SECURITY;

-- Garantir que o schema é acessível pelas roles relevantes
GRANT USAGE ON SCHEMA v4_energia TO anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 4b. Políticas: acordos_comercializadoras
-- -----------------------------------------------------------------------------

-- service_role: acesso total (todas as operações)
CREATE POLICY "service_role_all_acordos"
    ON v4_energia.acordos_comercializadoras
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- anon + authenticated: SELECT público — lista de comercializadoras disponíveis
CREATE POLICY "public_select_acordos"
    ON v4_energia.acordos_comercializadoras
    AS PERMISSIVE
    FOR SELECT
    TO anon, authenticated
    USING (ativa = true);


-- -----------------------------------------------------------------------------
-- 4c. Políticas: contratos_energia
-- -----------------------------------------------------------------------------

-- service_role: acesso total
CREATE POLICY "service_role_all_contratos"
    ON v4_energia.contratos_energia
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- anon: apenas INSERT (submissão de lead sem autenticação prévia)
-- Nota: pessoa_id deve ser preenchido pelo backend/edge function com o uid gerado
CREATE POLICY "anon_insert_contratos"
    ON v4_energia.contratos_energia
    AS PERMISSIVE
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- authenticated: SELECT dos seus próprios contratos
CREATE POLICY "authenticated_select_own_contratos"
    ON v4_energia.contratos_energia
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (pessoa_id = auth.uid());

-- authenticated: UPDATE dos seus próprios contratos
CREATE POLICY "authenticated_update_own_contratos"
    ON v4_energia.contratos_energia
    AS PERMISSIVE
    FOR UPDATE
    TO authenticated
    USING (pessoa_id = auth.uid())
    WITH CHECK (pessoa_id = auth.uid());


-- =============================================================================
-- 5. GRANTS DE TABELA
-- =============================================================================

-- acordos_comercializadoras
GRANT SELECT ON v4_energia.acordos_comercializadoras TO anon, authenticated;
GRANT ALL    ON v4_energia.acordos_comercializadoras TO service_role;

-- contratos_energia
GRANT INSERT          ON v4_energia.contratos_energia TO anon;
GRANT SELECT, UPDATE  ON v4_energia.contratos_energia TO authenticated;
GRANT ALL             ON v4_energia.contratos_energia TO service_role;


-- =============================================================================
-- 6. SEED — 3 Comercializadoras de exemplo
-- =============================================================================

INSERT INTO v4_energia.acordos_comercializadoras
    (nome, codigo, desconto_tar_pct, preco_kwh_vazio, preco_kwh_fora_vazio, preco_kwh_ponta, ativa)
VALUES
    (
        'EDP Comercial',
        'EDP-COM-2026',
        5.00,       -- 5 % de desconto na TAR 2026
        0.0812,     -- €/kWh vazio
        0.1634,     -- €/kWh fora de vazio
        0.2017,     -- €/kWh ponta
        true
    ),
    (
        'Galp Energia',
        'GALP-ENE-2026',
        7.50,       -- 7,5 % de desconto na TAR 2026
        0.0798,     -- €/kWh vazio
        0.1589,     -- €/kWh fora de vazio
        0.1976,     -- €/kWh ponta
        true
    ),
    (
        'Endesa',
        'ENDESA-PT-2026',
        6.00,       -- 6 % de desconto na TAR 2026
        0.0804,     -- €/kWh vazio
        0.1610,     -- €/kWh fora de vazio
        0.1998,     -- €/kWh ponta
        true
    )
ON CONFLICT (codigo) DO NOTHING;
