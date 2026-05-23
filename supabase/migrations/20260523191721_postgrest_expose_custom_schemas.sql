-- =====================================================================
-- Migration: PostgREST — expose missing custom schemas in V1 Core Hub
-- Story: 019.2 (DB-016)
-- Project: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
-- Date: 2026-05-23
-- Author: @data-engineer (Dara)
-- =====================================================================
--
-- WHY:
--   Diagnostic at 2026-05-23 (see docs/database/postgrest-exposure-audit-2026-05-23.md)
--   showed pgrst.db_schemas was missing `marketing` (13 tables, ADR-015)
--   and `v2_new` (6 tables, V2 modernization). Frontend calls to those
--   schemas were silently failing with PGRST106 Invalid schema.
--
--   Fonte de verdade é pg_roles.rolconfig do role `authenticator` —
--   Dashboard UI e Management API mentem sobre exposure (ver ADR-V2-002).
--
-- WHAT:
--   - Add `marketing` and `v2_new` to pgrst.db_schemas
--   - Keep all previously exposed schemas
--   - Keep `v1_owners_club` (rename to `v10_owners_club` is story 019.14)
--   - NOTIFY pgrst to reload config (no pod restart needed)
--
-- ROLLBACK:
--   ALTER ROLE authenticator SET pgrst.db_schemas =
--     'public, graphql_public, core, system, iam, growth,
--      v2_condominios, v3_seguros, v4_energia, v5_manutencao,
--      v1_owners_club';
--   NOTIFY pgrst, 'reload config';
--
-- VERIFY AFTER APPLY:
--   SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';
--   -- expect pgrst.db_schemas line to include `marketing` and `v2_new`
-- =====================================================================

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, core, iam, system, growth, marketing, v1_owners_club, v2_condominios, v2_new, v3_seguros, v4_energia, v5_manutencao';

NOTIFY pgrst, 'reload config';

-- =====================================================================
-- End of migration
-- =====================================================================
