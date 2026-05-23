# PostgREST Schema Exposure Audit — V1 + V2

**Date:** 2026-05-23
**Story:** 019.2 (DB-016, DB-018)
**Branch:** `feat/db-016-postgrest-exposure`
**Auditor:** @data-engineer (Dara)
**Method:** Direct query to `pg_roles.rolconfig` of role `authenticator` (the only reliable source — Dashboard UI and Management API are known to misreport per ADR-V2-002)

---

## Executive Summary

| Project | Status | Action Required |
|---------|--------|----------------|
| **V1 Core Hub** (`hkmvszkpxjbxmnixzqbl`) | **Partial exposure** — 2 schemas missing | Migration created (not applied) |
| **V2 Condo Hub** (`eozklslwfaqujaijvdnl`) | **OK** — no custom schemas, `public`-only architecture | No action needed |

Plus one orthogonal silent-failure (DB-018) found and fixed: `core.codigos_postais` has RLS enabled but **zero policies** → all reads deny silently for `authenticated`/`anon`. Migration created (not applied).

---

## V1 Core Hub — Detailed Diagnostic

### Current `pgrst.db_schemas`

```text
public, graphql_public, core, system, iam, growth, v2_condominios,
v3_seguros, v4_energia, v5_manutencao, v1_owners_club
```

Source query (executed via Supabase Management API):
```sql
SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';
```

Full `rolconfig`:
```text
session_preload_libraries=safeupdate
statement_timeout=8s
lock_timeout=8s
pgrst.db_schemas=public, graphql_public, core, system, iam, growth,
                  v2_condominios, v3_seguros, v4_energia, v5_manutencao,
                  v1_owners_club
```

### Existing custom schemas in V1

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT LIKE 'pg_%'
  AND schema_name NOT LIKE '\_%'
  AND schema_name NOT IN ('public','graphql_public','information_schema',
                          'auth','storage','realtime','supabase_functions',
                          'vault','extensions','pgsodium','pgsodium_masks',
                          'pgbouncer','net','graphql','supabase_migrations')
ORDER BY schema_name;
```

Result:

| Schema | Tables | Exposed? | Expected? | Decision |
|--------|--------|----------|-----------|----------|
| `core` | 38 | ✅ yes | yes | keep |
| `cron` | n/a (system) | n/a | n/a (Supabase internal) | skip |
| `growth` | 9 | ✅ yes | yes | keep |
| `iam` | 6 | ✅ yes | yes (ADR-013) | keep |
| `marketing` | 13 | ❌ **NO** | **YES** (ADR-015, CLAUDE.md) | **EXPOSE** |
| `system` | 52 | ✅ yes | yes | keep |
| `v1_owners_club` | 3 | ✅ yes | yes (legacy, rename → story 019.14) | keep |
| `v2_condominios` | 66 | ✅ yes | yes | keep |
| `v2_new` | 6 | ❌ **NO** | **YES** (V2 modernization) | **EXPOSE** |
| `v3_seguros` | 4 | ✅ yes | yes | keep |
| `v4_energia` | 10 | ✅ yes | yes | keep |
| `v5_manutencao` | 46 | ✅ yes | yes | keep |

**Gap:** `marketing` and `v2_new` exist with substantive content but are NOT REST-accessible. Frontend calls hit `PGRST106 Invalid schema` and silently fail.

### Schemas referenced in CLAUDE.md root but not yet present

- `v10_owners_club` — does not exist; current name is `v1_owners_club` (legacy). Rename is story **019.14**. **Keep `v1_owners_club` in exposure list for now.**

### Final desired `pgrst.db_schemas` (V1)

```text
public, graphql_public, core, iam, system, growth, marketing,
v1_owners_club, v2_condominios, v2_new, v3_seguros, v4_energia, v5_manutencao
```

This matches AC-2 of the story, with two adjustments grounded in observed reality:
- `v1_owners_club` retained (rename to `v10_owners_club` is a separate story)
- Both `marketing` AND `v2_new` added (story listed `marketing`, `v2_new`, plus optional `growth`; `growth` was already exposed)

### IAM functions audit (relevant to AC-3)

```sql
SELECT n.nspname, p.proname, pg_get_function_arguments(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'iam'
ORDER BY p.proname;
```

Functions present in `iam`:
- `has_permission(p_section text, p_action text)` ← canonical permission check
- `log_activity(p_tipo text, p_detalhe text, ...)` ← activity logging
- `portal_dashboard(p_token uuid)` ← portal dashboard
- `portal_get_or_create_token(p_pessoa_id uuid, p_fracao_id uuid)` ← token issuance
- `portal_token_login(p_token uuid)` ← portal login
- `set_permission_grant(p_group_code text, p_section_code text, p_action text, p_value boolean)` ← grant management
- `staff_login_lookup(p_alias text)` ← staff alias lookup
- `user_can(p_section text, p_action text)` ← RLS helper
- `user_can_workspace(ws_id uuid)` ← workspace permission

**Note on AC-3:** Story references `iam.get_my_permissions()` but the database does NOT contain a function with that name. The closest equivalents are `iam.has_permission()` and `iam.user_can()`. Smoke test should use one of these instead. This naming inconsistency is documented but is OUT OF SCOPE for story 019.2 — the schema exposure work is the gate. If `get_my_permissions` is genuinely needed, that becomes a follow-up story.

---

## DB-018 — `core.codigos_postais` Silent Failure

### Diagnostic

```sql
SELECT table_schema, table_name,
       c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policy WHERE polrelid = c.oid) AS policy_count
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'core' AND t.table_name = 'codigos_postais';
```

Result:

| table_schema | table_name | rls_enabled | policy_count |
|--------------|------------|-------------|--------------|
| core | codigos_postais | **YES** | **0** |

```sql
SELECT (SELECT count(*) FROM core.codigos_postais) AS total_rows,
       has_table_privilege('authenticated', 'core.codigos_postais', 'SELECT') AS auth_can_select,
       has_table_privilege('anon', 'core.codigos_postais', 'SELECT') AS anon_can_select;
```

| total_rows | auth_can_select | anon_can_select |
|------------|-----------------|-----------------|
| **205 817** | true | true |

### Diagnosis

- Table has 205 817 rows (full Portuguese postal codes dataset from CTT)
- `GRANT SELECT` already in place for both `authenticated` and `anon` ✅
- RLS **enabled** but **zero policies** → PostgreSQL default-deny applies regardless of grants
- Effect: every query against `core.codigos_postais` returns 0 rows silently for any non-superuser session, including service workers

This is the textbook "silent RLS failure" — grants look right, table exists, but RLS blocks because there are no policies.

### Justification for public read policy

Portuguese postal codes are **public data** distributed by CTT (Correios de Portugal) without licensing restriction. They contain zero PII. They are used as a lookup/autocomplete primitive in:
- Address forms (frontend autocomplete)
- Geocoding fallbacks
- Postal-code-to-locality validation

A `SELECT`-only policy `USING (true)` for `authenticated` and `anon` is the canonical pattern for public reference data and matches industry convention (Supabase docs, postal-code patterns).

No write policies are needed — only operators (service role / superuser) load this table, and service role bypasses RLS.

### Fix proposed

Migration `20260523191722_codigos_postais_public_read.sql` (not applied — awaiting Mário's approval):

```sql
-- Grants already exist; this is a safety re-grant (idempotent)
GRANT SELECT ON core.codigos_postais TO authenticated, anon;

CREATE POLICY codigos_postais_public_read
  ON core.codigos_postais
  FOR SELECT
  TO authenticated, anon
  USING (true);
```

**Rollback:** `DROP POLICY codigos_postais_public_read ON core.codigos_postais;`

---

## Execution Procedure (when Mário approves)

### Step 1 — Apply schema exposure migration (V1)

```bash
cd C:/Users/mario/dev/proptech-platform
supabase link --project-ref hkmvszkpxjbxmnixzqbl --yes
supabase db push --linked --include-all
```

OR via SQL Editor (Supabase Dashboard → SQL Editor → New query):

```sql
-- Paste contents of 20260523191721_postgrest_expose_custom_schemas.sql
```

### Step 2 — Verify exposure took effect

```sql
SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';
```

Expected: `pgrst.db_schemas` line contains `marketing` and `v2_new`.

### Step 3 — Smoke test REST endpoint

```bash
# Replace ANON_KEY with the actual V1 anon key
curl -s -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY" \
  "https://hkmvszkpxjbxmnixzqbl.supabase.co/rest/v1/?select=*" | jq '.definitions | keys'
```

Expected: array includes tables from `marketing` and `v2_new` schemas (with `marketing_` and `v2_new_` prefixed names per PostgREST conventions, or as schema-qualified depending on PostgREST version).

### Step 4 — Apply DB-018 migration

Same approach as Step 1, with the `codigos_postais_public_read.sql` file.

### Step 5 — Smoke test `codigos_postais`

```bash
curl -s -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY" \
  "https://hkmvszkpxjbxmnixzqbl.supabase.co/rest/v1/codigos_postais?codigo=eq.1000-001&select=*&limit=1"
```

Expected: non-empty array with the row matching codigo `1000-001`.

### Step 6 — Update CLAUDE.md root

Update the "Exposição de schemas custom ao PostgREST" section to reflect the final list, replacing the previous one. Done in same PR.

---

## Rollback Plan

If exposure migration causes any issue:

```sql
-- Restore previous exposure list
ALTER ROLE authenticator SET pgrst.db_schemas =
  'public, graphql_public, core, system, iam, growth, v2_condominios,
   v3_seguros, v4_energia, v5_manutencao, v1_owners_club';
NOTIFY pgrst, 'reload config';
```

If `codigos_postais_public_read` policy causes any issue:

```sql
DROP POLICY codigos_postais_public_read ON core.codigos_postais;
```

Both rollbacks are idempotent and additive — no data loss possible.

---

## Decisions made (auto-decision log)

| Decision | Rationale |
|----------|-----------|
| Keep `v1_owners_club` in exposure list (not `v10_owners_club`) | Schema rename is scope of story 019.14; current name in DB is `v1_owners_club` |
| Skip `cron` schema | Internal Supabase schema, not intended for REST |
| Add BOTH `marketing` AND `v2_new` even though story lists `v2_new` as primary concern | `marketing` (13 tables) is referenced in CLAUDE.md ADR-015 and was also clearly missing |
| Use `USING (true)` (not `WITH CHECK`) for `codigos_postais` | SELECT-only policy; CTT data is public and immutable from app perspective |
| Document but do NOT block on `iam.get_my_permissions()` mismatch | AC-3 references a function that does not exist; the closest substitute (`iam.has_permission` / `iam.user_can`) exists. Renaming/adding is out of scope here |
| Do NOT apply migration via `supabase db push` | Per spawn prompt: create file, await Mário's explicit approval |

---

## References

- ADR-V2-002 — PostgREST schema exposure procedure
- CLAUDE.md root → "Exposição de schemas custom ao PostgREST"
- CLAUDE.md root → "Estratégia de schemas (decisão canónica · Opção C + ADR-013)"
- Epic 019 — Brownfield cleanup Q2 2026 (DB-016, DB-018)
- Supabase docs — PostgREST schema configuration
- CTT postal codes — public dataset, no licensing

---

## Files produced

- `supabase/migrations/20260523191721_postgrest_expose_custom_schemas.sql` (V1, not applied)
- `supabase/migrations/20260523191722_codigos_postais_public_read.sql` (V1, not applied)
- `docs/database/postgrest-exposure-audit-2026-05-23.md` (this file)
- `docs/database/v2-postgrest-status-2026-05-23.md` (V2 audit, read-only)
