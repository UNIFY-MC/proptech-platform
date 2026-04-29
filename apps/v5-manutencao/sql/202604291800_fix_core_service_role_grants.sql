-- =============================================================================
-- 1B.3 fix: GRANT em falta em tabelas core para service_role
-- =============================================================================
-- Sintoma directo: agent-casa-advisor falha com "permission denied for table
-- pessoas" ao tentar SELECT em core.pessoas com serviceRole client.
--
-- Causa raiz sistémica: 16 tabelas em core têm policy 'service_role_*'
-- definida em pg_policies mas sem GRANT a nível de tabela. RLS policy sem
-- GRANT subjacente é inacessível.
--
-- Violação histórica da Regra W (GRANT + RLS antes de CREATE POLICY).
--
-- Estratégia: GRANT cirúrgico (SELECT, INSERT, UPDATE, DELETE — não ALL) em
-- todas as tabelas core que têm policy service_role mas não têm GRANT.
-- ALL inclui TRUNCATE/REFERENCES/TRIGGER que não pretendemos conceder.
--
-- Schema v5_manutencao: NÃO afectado (auditado, GRANTs alinhados com policies).
-- Schema core: 16 tabelas afectadas.
--
-- IDEMPOTENTE: GRANT é seguro de re-correr.
-- =============================================================================

BEGIN;

-- Programaticamente conceder GRANT em todas as tabelas core onde existe
-- policy para service_role mas falta GRANT.
DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  FOR r IN
    WITH service_role_policies AS (
      SELECT DISTINCT schemaname, tablename
      FROM pg_policies
      WHERE schemaname = 'core'
        AND 'service_role' = ANY(roles)
    ),
    service_role_grants AS (
      SELECT DISTINCT table_schema as schemaname, table_name as tablename
      FROM information_schema.role_table_grants
      WHERE table_schema = 'core'
        AND grantee = 'service_role'
    )
    SELECT srp.schemaname, srp.tablename
    FROM service_role_policies srp
    LEFT JOIN service_role_grants srg
      ON srp.schemaname = srg.schemaname
      AND srp.tablename = srg.tablename
    WHERE srg.tablename IS NULL
    ORDER BY srp.tablename
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO service_role',
      r.schemaname, r.tablename
    );
    v_count := v_count + 1;
    RAISE NOTICE 'Granted on %.%', r.schemaname, r.tablename;
  END LOOP;
  RAISE NOTICE '=== Total tables granted: % ===', v_count;
END $$;

-- Defensivo: revoke explícito de anon nas mesmas tabelas (Regra Z)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'core'
      AND 'service_role' = ANY(roles)
  LOOP
    EXECUTE format('REVOKE ALL ON %I.%I FROM anon', r.schemaname, r.tablename);
  END LOOP;
END $$;

COMMIT;

-- =============================================================================
-- Verificação pós-aplicação (correr separadamente após COMMIT):
--
-- WITH service_role_policies AS (
--   SELECT DISTINCT schemaname, tablename FROM pg_policies
--   WHERE schemaname = 'core' AND 'service_role' = ANY(roles)
-- ),
-- service_role_grants AS (
--   SELECT DISTINCT table_schema as schemaname, table_name as tablename
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'core' AND grantee = 'service_role'
-- )
-- SELECT srp.schemaname, srp.tablename,
--        CASE WHEN srg.tablename IS NULL THEN 'EM FALTA' ELSE 'OK' END as status
-- FROM service_role_policies srp
-- LEFT JOIN service_role_grants srg
--   ON srp.schemaname = srg.schemaname AND srp.tablename = srg.tablename
-- ORDER BY status DESC, srp.tablename;
--
-- Espera: zero linhas com status 'EM FALTA'.
-- =============================================================================
