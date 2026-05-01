---
day: 1
status: CLOSED
date: 2026-05-01
gate: PASSED
---

# Day 1 — Schema Foundations: FECHADO

## Migration aplicada

**Ficheiro:** `apps/v5-manutencao/sql/202605010001_v5_1d_foundations.sql`  
**Target:** V1 Core Hub `hkmvszkpxjbxmnixzqbl` (NUNCA V2)  
**Método:** Supabase MCP `apply_migration`

## Smoke Tests — 4/4 PASS

| # | Query | Resultado |
|---|---|---|
| 1 | `pg_tables` WHERE schemaname = 'v5_manutencao' + 3 tabelas | 3 linhas, `rowsecurity = true` em todas |
| 2 | `information_schema.role_table_grants` — Regra FF audit | `authenticated` SELECT + `service_role` CRUD em 3 tabelas |
| 3 | `pg_indexes` — 10 user-defined indexes | Todos presentes (token UNIQUE, owner_created, active, org, nif, magic, status, owner_data, prestador, org) |
| 4 | `count(*)` nas 3 tabelas | `0, 0, 0` — tabelas vazias, `recibos_servico` em `supabase_realtime` |

## Decisões confirmadas

- **R1 = Opção B** executada: `v5_manutencao.recibos_servico` (não `core.servicos_ativos`)
- **Regra FF** verificada: GRANTs após POLICYs em todas as tabelas

## P1 fix pendente (Day 2 — não breaking)

Token hashing em `gerar-magic-link` edge function: `sha256(token)` antes de gravar.  
Plaintext token em CHECK constraint actualmente. Zero data migration (0 tokens existentes).

## Desbloqueado para Day 2

Edge functions: `gerar-magic-link` (deploy + smoke test JWT) + `prestador-onboarding` (draft).
