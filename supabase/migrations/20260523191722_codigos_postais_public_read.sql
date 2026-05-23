-- =====================================================================
-- Migration: core.codigos_postais — public read policy
-- Story: 019.2 (DB-018)
-- Project: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
-- Date: 2026-05-23
-- Author: @data-engineer (Dara)
-- =====================================================================
--
-- WHY:
--   Diagnostic at 2026-05-23 (see docs/database/postgrest-exposure-audit-2026-05-23.md)
--   confirmed core.codigos_postais (205 817 rows) has:
--     - GRANT SELECT TO authenticated, anon  ✅ (already in place)
--     - RLS ENABLED  ✅
--     - ZERO POLICIES  ❌  → default-deny applies, all reads return 0 rows silently
--
--   This is a classic "silent RLS failure" — grants are right, table exists,
--   but RLS blocks because no policy permits SELECT.
--
--   Portuguese postal codes are PUBLIC data (CTT, no licensing).
--   They are used for: address autocomplete, geocoding fallback,
--   postal-code validation. Zero PII. Read-only from the app perspective.
--
-- WHAT:
--   - Idempotent re-grant of SELECT to authenticated, anon
--   - CREATE POLICY for SELECT (USING true) — public read
--   - No write policies — only service role loads this table
--
-- ROLLBACK:
--   DROP POLICY IF EXISTS codigos_postais_public_read ON core.codigos_postais;
--
-- VERIFY AFTER APPLY:
--   -- Should return >= 1 row
--   SET ROLE authenticated;
--   SELECT * FROM core.codigos_postais WHERE codigo = '1000-001' LIMIT 1;
--   RESET ROLE;
-- =====================================================================

-- Idempotent re-grant (no harm if already present)
GRANT SELECT ON core.codigos_postais TO authenticated, anon;

-- Public read policy — postal codes are CTT public data, zero PII
DROP POLICY IF EXISTS codigos_postais_public_read ON core.codigos_postais;

CREATE POLICY codigos_postais_public_read
  ON core.codigos_postais
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- =====================================================================
-- End of migration
-- =====================================================================
