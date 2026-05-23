# Processo de Migrations — Forward-Only

**Estado:** Canónico desde 2026-05-23 (Story 019.4, debt DB-003)
**Aplicável a:** Todos os projectos Supabase do monorepo (V1 Core Hub, V2 Condo Hub, futuros V3-V10)
**Autoridade:** @data-engineer (Dara), reforçado por @devops em `git push`

---

## TL;DR

A partir de **2026-05-23**:

1. Toda a alteração de schema vive num ficheiro `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql` (14 dígitos).
2. Migrations só são aplicadas via `supabase db push` ou `supabase migration up`.
3. Aplicação directa via SQL Editor ou `apply_migration` MCP está **proibida**, excepto em emergências documentadas.
4. O baseline `00000000000000_baseline_2026_05_v1.sql` representa o estado em 2026-05-23. Antes dele, nada existe no histórico local.
5. Forward-only: nunca editar uma migration aplicada — criar nova com o fix.

---

## Regra 1 — Naming canónico

Formato obrigatório: `YYYYMMDDHHMMSS_descricao_curta.sql`

- **14 dígitos** de timestamp, não 8.
- Timestamp em UTC.
- `descricao_curta` em snake_case, máximo 50 caracteres.
- Extensão `.sql` minúscula.

Exemplos válidos:
- `20260523093000_iam_add_session_token.sql`
- `20260601120000_v4_energia_add_tarifa_view.sql`

Exemplos inválidos:
- `20260523_iam_session.sql` (só 8 dígitos)
- `20260523093000-IAM-add-session.sql` (kebab-case + maiúsculas)
- `iam_session.sql` (sem timestamp)

Gerar timestamp em PowerShell:
```powershell
(Get-Date -AsUTC).ToString("yyyyMMddHHmmss")
```

Gerar timestamp em bash:
```bash
date -u +%Y%m%d%H%M%S
```

Atalho via CLI: `supabase migration new <descricao_curta>` (cria ficheiro vazio com timestamp correcto).

---

## Regra 2 — One change, one file

Um ficheiro de migration = uma unidade lógica de alteração.

- Adicionar tabela + RLS + índice + GRANT relacionado → **1 ficheiro** ok.
- Adicionar tabela A e tabela B sem relação → **2 ficheiros**.
- Refactor cross-schema + nova feature → **2 ficheiros**, refactor primeiro.

Razões:
- Rollback granular fica viável.
- Cherry-pick entre branches funciona.
- Code review é digerível.

---

## Regra 3 — Idempotência

Toda migration deve poder ser corrida **uma única vez sem assumir o estado anterior** — mas se for re-aplicada acidentalmente, não destrói dados.

Use:
- `CREATE TABLE IF NOT EXISTS …`
- `CREATE INDEX IF NOT EXISTS …`
- `DO $$ BEGIN IF NOT EXISTS (…) THEN … END IF; END $$;` para policies/triggers
- `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` (Postgres 9.6+)

Evite:
- `DROP TABLE …` sem `IF EXISTS`
- `TRUNCATE` em produção (V2)
- `DELETE FROM … WHERE true` sem WHERE específico

---

## Regra 4 — Forward-only

**Nunca** editar uma migration que já está em `main`.

Se descobrir bug numa migration aplicada:
1. Criar nova migration com timestamp posterior que corrige.
2. Se for crítico e a migration ainda não chegou a `main`, é aceitável (em coordenação com @devops) fazer `git rebase` para corrigir antes do push — mas só nesse intervalo.
3. Para reverter, criar migration `YYYYMMDDHHMMSS_revert_X.sql` em vez de editar.

Razão: `supabase_migrations.schema_migrations` regista o hash do ficheiro. Editar invalida o hash → drift detectado → push falha.

---

## Regra 5 — Baseline é intocável

`supabase/migrations/00000000000000_baseline_2026_05_v1.sql` representa o estado-do-mundo em 2026-05-23. **Nunca editar.**

Se descobrir que o baseline tem algo a corrigir → criar nova migration forward que ajusta. Nunca mexer no baseline.

---

## Regra 6 — SQL Editor / MCP `apply_migration` proibidos por defeito

Cenários:

| Cenário | Permitido? | Procedimento |
|---------|-----------|-------------|
| Investigação read-only (SELECT) | Sim | Sem cerimónia |
| Teste de query antes de commit | Sim | Não fazer DML/DDL persistente |
| `EXPLAIN ANALYZE` | Sim | Sem cerimónia |
| Criar tabela em ambiente prod | **Não** | Criar ficheiro `.sql` + `supabase db push` |
| Fix urgente em produção (hotfix) | Excepcional | Aplicar via SQL Editor, **imediatamente** criar ficheiro `.sql` correspondente com o mesmo SQL + INSERT em `schema_migrations` documentado, commit `fix(db): hotfix X + retrofit migration` |

Razão: `apply_migration` cria drift entre o registo remoto e o histórico local. Quando o drift acumula, perde-se a capacidade de fazer `supabase db push` limpo.

---

## Regra 7 — V2 produção é especial

Ficheiros em `supabase/migrations/v2-production/` aplicam **apenas** ao projecto `eozklslwfaqujaijvdnl` (V2 Condo Hub).

- Pasta isolada para evitar mistura acidental.
- Aplicação requer aprovação humana explícita do Mário antes de cada push.
- O baseline V2 (`v2-production/00000000000000_baseline_2026_05_v2.sql`) é read-only — não aplicar.
- Forward-only aplica-se igualmente a V2.

---

## Regra 8 — `supabase db push` antes de `git push`

Workflow obrigatório quando uma branch tem migrations novas:

1. Em local (com `.env` populado): `supabase db push --dry-run` para ver SQL que vai correr.
2. Validar SQL.
3. `supabase db push` → aplica em V1 (ou no projecto linked).
4. Smoke test: ir ao app afectado e verificar que funciona.
5. Só então `git push` para preview deployment Vercel.
6. Para V2, este step é coordenado com Mário um a um.

---

## Regra 9 — Ordem dentro de uma migration

Quando um único ficheiro toca múltiplos schemas/objectos, ordenar:

1. `CREATE SCHEMA IF NOT EXISTS …` (se aplicável)
2. `CREATE EXTENSION IF NOT EXISTS …`
3. `CREATE TYPE …` (enums, composites)
4. `CREATE TABLE …` (em ordem de dependência: parent antes de child)
5. `ALTER TABLE … ADD CONSTRAINT …` (foreign keys cross-table)
6. `CREATE INDEX …`
7. `CREATE OR REPLACE FUNCTION …`
8. `CREATE TRIGGER …`
9. `ALTER TABLE … ENABLE ROW LEVEL SECURITY;`
10. `CREATE POLICY …`
11. `GRANT …`
12. Comentários (`COMMENT ON …`)

---

## Regra 10 — Comentário obrigatório no topo

Todo ficheiro de migration começa com bloco:

```sql
-- Migration: YYYYMMDDHHMMSS_descricao_curta
-- Story: XXX.Y (link a docs/stories/...)
-- Author: <agent ou Mário>
-- Date: YYYY-MM-DD
-- Scope: <qual schema/feature afecta>
-- Reversible: yes | no (se no, justificar)
-- Idempotent: yes (sempre — caso contrário não submeter)
```

---

## Tooling

- **Gerar nova migration:** `supabase migration new <descricao>` ou criar à mão respeitando naming.
- **Aplicar local:** `supabase db push` (após `supabase link`).
- **Ver pendentes:** `supabase migration list`.
- **Drift check:** `scripts/db/check-migration-drift.ps1` (ver `pre-push-checklist.md`).

---

## Excepções

Caso queira propor uma excepção a estas regras, **abrir story** que documenta o porquê e obter aprovação do Mário. Não actuar de moto-próprio em produção.

---

**Referências:**
- ADR-013 (IAM centralização)
- ADR-V2-002 (PostgREST schema exposure)
- Supabase docs: <https://supabase.com/docs/guides/cli/local-development#database-migrations>
- DB-AUDIT 2026-05-05 (origem do problema)
