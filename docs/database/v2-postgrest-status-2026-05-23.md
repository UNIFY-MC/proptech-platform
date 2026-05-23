# V2 Condo Hub — PostgREST Status (Read-Only Audit)

**Date:** 2026-05-23
**Project:** PropTech V2 Condo Hub
**Project ref:** `eozklslwfaqujaijvdnl`
**Region:** West EU (Paris)
**Status:** **PRODUÇÃO VIVA** — no changes made or planned in this story
**Story:** 019.2 (DB-016 audit only for V2)

---

## Scope

Per CLAUDE.md raiz Regra 4: **V2 produção é INTOCÁVEL**. Esta audit é estritamente read-only e existe para documentar o estado actual da exposição PostgREST, para servir de baseline em futuras decisões.

**Nenhuma migration foi criada para V2.** Nenhuma mudança proposta.

---

## Findings

### `authenticator` rolconfig

```sql
SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';
```

Resultado:

```text
session_preload_libraries=safeupdate
statement_timeout=8s
lock_timeout=8s
```

**`pgrst.db_schemas` não está definido explicitamente.** PostgREST cai no default, que expõe apenas `public` (e `graphql_public` para a extensão GraphQL).

### Custom schemas existentes em V2

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

Resultado: **vazio (zero linhas)**.

V2 não tem schemas custom. Todas as 30 tabelas vivem em `public` — arquitectura legacy monolítica, alinhada com o histórico produtivo desde 2026-03.

---

## Status

| Item | Estado | Acção |
|------|--------|-------|
| `pgrst.db_schemas` | Não definido (default `public`) | Nenhuma — adequado |
| Custom schemas | Zero | N/A |
| RLS coverage | Não auditado nesta story (out of scope) | Ver story 019.x (RLS audit V2) quando existir |
| Risk | **Zero** — estado actual é coerente com arquitectura V2 | — |

---

## Conclusion

V2 não requer qualquer migration relacionada com DB-016 nesta story. A configuração actual (apenas `public` exposto) é apropriada para o desenho monolítico actual.

Qualquer futura migração de tabelas V2 para schemas custom (`v2_condominios` *nativo* em V2, p.ex.) requererá expor o novo schema seguindo o procedimento canónico do ADR-V2-002 — mas isso está fora de escopo desta story.

---

## Procedimento de re-audit (se for necessário no futuro)

```bash
cd C:/Users/mario/dev/proptech-platform
supabase link --project-ref eozklslwfaqujaijvdnl --yes
supabase db query --linked "SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';"
supabase db query --linked "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;"
```

---

## Refs

- ADR-V2-002 — PostgREST schema exposure
- CLAUDE.md raiz §"V2 Condo Hub" e §Regra 4
- Story 019.2 (DB-016 audit only)
