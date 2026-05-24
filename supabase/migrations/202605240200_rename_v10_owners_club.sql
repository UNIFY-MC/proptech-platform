-- =============================================================================
-- Migration: 202605240200_rename_v10_owners_club.sql
-- Data: 2026-05-24
-- DB-005 brownfield Critical — schema com nome errado (v1_owners_club deveria
-- ser v10_owners_club conforme naming canónico V1-V10 do CLAUDE.md).
--
-- AUDIT 2026-05-24 (pré-rename):
--   - 3 tabelas: ofertas (6 rows), pontos_historico (0), resgates (0)
--   - 9 triggers (auto-RI + trg_ofertas_updated_at) — viajam com schema rename
--   - 4 policies RLS — viajam com schema rename
--   - 0 funções/RPCs com 'v1_owners_club' em prosrc (zero dependências externas)
--   - 1 view externa: public.v_ofertas (SELECT direto de v1_owners_club.ofertas)
--   - 1 FK interna: resgates.oferta_id → ofertas (mantém-se intacta)
--   - pgrst.db_schemas inclui 'v1_owners_club' — precisa update
--
-- ESTRATÉGIA:
--   1. ALTER SCHEMA RENAME — renomeia tabelas + triggers + policies + FKs automaticamente
--   2. DROP VIEW public.v_ofertas + CREATE VIEW (PostgreSQL NÃO actualiza view defs)
--   3. ALTER ROLE authenticator SET pgrst.db_schemas (substitui v1_owners_club por v10)
--   4. NOTIFY pgrst, 'reload config'
--
-- REVERSÃO (se necessário):
--   ALTER SCHEMA v10_owners_club RENAME TO v1_owners_club;
--   DROP VIEW public.v_ofertas;
--   CREATE VIEW public.v_ofertas AS SELECT ... FROM v1_owners_club.ofertas;
--   ALTER ROLE authenticator SET pgrst.db_schemas = '...,v1_owners_club,...';
--   NOTIFY pgrst, 'reload config';
--
-- Refs: DB-005 (technical-debt-assessment.md), CLAUDE.md naming canónico V1-V10
-- =============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1 — ALTER SCHEMA RENAME
-- ============================================================================
-- Postgres renomeia automaticamente: tabelas, indexes, triggers, policies, FKs internas
-- search_path de funções já existentes NÃO é actualizado (mas zero funções referenciam — confirmado audit)

ALTER SCHEMA v1_owners_club RENAME TO v10_owners_club;


-- ============================================================================
-- PARTE 2 — Recriar view public.v_ofertas com novo schema
-- ============================================================================
-- PostgreSQL não actualiza referências hard-coded em view definitions.
-- Recriar com mesmo schema (idempotente).

DROP VIEW IF EXISTS public.v_ofertas;

CREATE VIEW public.v_ofertas AS
SELECT id,
       titulo,
       descricao,
       categoria,
       parceiro,
       desconto_txt,
       tier_minimo,
       validade_ate,
       activa,
       imagem_url,
       url_resgate,
       created_at,
       updated_at
FROM v10_owners_club.ofertas;

-- Recriar grants para a view (perdidos no DROP)
GRANT SELECT ON public.v_ofertas TO anon, authenticated;


-- ============================================================================
-- PARTE 3 — Update PostgREST schema exposure
-- ============================================================================
-- Substituir 'v1_owners_club' por 'v10_owners_club' na lista pgrst.db_schemas
-- Lista actual confirmada via audit 2026-05-24:
--   public, graphql_public, core, iam, system, growth, marketing,
--   v1_owners_club, v2_condominios, v2_new, v3_seguros, v4_energia, v5_manutencao

ALTER ROLE authenticator SET pgrst.db_schemas =
  'public, graphql_public, core, iam, system, growth, marketing, v10_owners_club, v2_condominios, v2_new, v3_seguros, v4_energia, v5_manutencao';

NOTIFY pgrst, 'reload config';

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES (correr DEPOIS de apply)
-- ============================================================================
--
-- 1. Confirmar schema renomeado (esperado: v10_owners_club existe, v1_owners_club NÃO):
--    SELECT schema_name FROM information_schema.schemata
--    WHERE schema_name IN ('v1_owners_club','v10_owners_club');
--
-- 2. Confirmar 3 tabelas + 6 rows preservadas (esperado: 6 rows ofertas):
--    SELECT table_name FROM information_schema.tables WHERE table_schema='v10_owners_club';
--    SELECT count(*) FROM v10_owners_club.ofertas;
--
-- 3. Confirmar view public.v_ofertas funciona:
--    SELECT count(*) FROM public.v_ofertas;  -- Esperado: 6
--
-- 4. Confirmar pgrst.db_schemas actualizado:
--    SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';
--    -- Esperado: lista inclui v10_owners_club, NÃO inclui v1_owners_club
--
-- 5. Confirmar FK interna preservada:
--    SELECT constraint_name FROM information_schema.table_constraints
--    WHERE table_schema='v10_owners_club' AND constraint_type='FOREIGN KEY';
--    -- Esperado: 1 row (oc_resgates_oferta_id_fkey)
--
-- 6. Confirmar RLS policies preservadas:
--    SELECT count(*) FROM pg_policies WHERE schemaname='v10_owners_club';
--    -- Esperado: 4
-- =============================================================================
