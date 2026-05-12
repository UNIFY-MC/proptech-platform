---
id: ADR-V2-002
title: PostgREST schema exposure — fonte de verdade é pg_roles.rolconfig
date: 2026-05-12
status: Accepted
deciders: [main-session, supabase-designer]
sprint: V2 sprint/v2-vertical-fase1
related: [ADR-010 Command Center, ADR-condo-001 V2 AI-native]
---

# ADR-V2-002 · PostgREST schema exposure no Supabase

## Status

Accepted · 2026-05-12

---

## Context

Durante o sprint V2 (`sprint/v2-vertical-fase1`) ficou bloqueado o probe REST a vários schemas custom (`v2_condominios`, `system`, `v3_seguros`, `v5_manutencao`, `marketing`, `v1_owners_club`) com erro `PGRST106 "Invalid schema"`. A app `apps/v2-condominios/` consegue queries a `core` e `v4_energia` mas tudo o resto devolve `406 Not Acceptable`.

A resolução levou **horas** e **três restarts** do projecto Supabase porque o Supabase mantém a configuração de `db_schemas` em **três camadas distintas** que podem ficar dessincronizadas:

| Camada | Fonte | Visualização | Persistência |
|---|---|---|---|
| 1. **Dashboard UI** ("Exposed schemas") | Browser local state | Dropdown com ticks verdes | "Save" persiste em camada 2 |
| 2. **Management API** (`/v1/projects/{ref}/postgrest`) | API storage | GET retorna `db_schema: "..."` | Sobrevive a restart |
| 3. **`pg_roles.rolconfig`** da role `authenticator` | Postgres role config | `SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator'` | É o que o PostgREST realmente lê ao arrancar |

O bug observado: as camadas 1 e 2 mostravam os 10 schemas correctos (`public, graphql_public, core, system, v2_condominios, v3_seguros, v4_energia, v5_manutencao, v1_owners_club, marketing`), mas a camada 3 ficou em estado intermédio (`public, graphql_public, v4_energia, core` — apenas 4). O PostgREST runtime lê **só** a camada 3 ao arrancar; restarts subsequentes não corrigiram porque a camada 3 não estava a ser actualizada pelos PATCH à management API nem pelo "Save" do Dashboard.

`NOTIFY pgrst, 'reload config'` e `'reload schema'` foram emitidos múltiplas vezes sem efeito — o canal pgrst pode estar quebrado para reload-config quando o pod já está em estado "stuck".

A descoberta crítica veio de `SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator'` que mostrou a chave `pgrst.db_schemas` explicitamente. Ao actualizar via `ALTER ROLE authenticator SET pgrst.db_schemas = '...'`, os schemas ficaram expostos em segundos sem precisar de restart.

---

## Decisions

### D1 · Fonte de verdade canónica

Para qualquer alteração à lista de schemas expostos no PostgREST do Supabase, **usar SQL directo via Postgres**:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas =
  'public, graphql_public, core, system, v2_condominios, v3_seguros, v4_energia, v5_manutencao, v1_owners_club, marketing';
NOTIFY pgrst, 'reload config';
```

**Não confiar** em:
- "Exposed schemas" do Dashboard UI (pode persistir estado parcial)
- PATCH à management API (`/v1/projects/{ref}/postgrest`) — escreve em camada paralela que pode não propagar para `authenticator.rolconfig`

### D2 · Verificação antes de troubleshooting

Antes de pedir restart do projecto Supabase ou tentar reload, verificar primeiro a camada 3:

```sql
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname = 'authenticator';
```

Procurar `pgrst.db_schemas=...` em `rolconfig`. Se a lista lá não estiver correcta, qualquer outra acção é em vão.

### D3 · Sintoma vs causa

O sintoma `PGRST106 "Only the following schemas are exposed: <lista X>"` é **literal** — `<lista X>` é o conteúdo actual de `pgrst.db_schemas` na role `authenticator`. Se o sintoma persiste após Save no Dashboard, a Save não tocou na camada 3. Não desperdiçar restarts.

### D4 · Documentação no CLAUDE.md do projecto

Adicionar entrada na secção "💾 Supabase" do `CLAUDE.md` raiz com o snippet `ALTER ROLE authenticator SET pgrst.db_schemas = ...` como procedimento canónico. Ver Followups.

---

## Consequences

### Positivas

- Próximas alterações a `db_schemas` resolvem-se em segundos via SQL, sem restarts (que afectam V5 produção e edge functions).
- Diagnóstico futuro é determinístico: 1 SELECT a `pg_roles` em vez de horas de tentativa-erro.

### Negativas

- A UI "Exposed schemas" do Supabase Dashboard continua a poder enganar visualmente. Não é fonte de verdade.
- Se o utilizador editar no Dashboard sem coordenação com a camada 3, a UI "Save" pode reverter alterações SQL feitas via `ALTER ROLE`. Necessário convenção: **SQL é canónico, Dashboard é read-only para schemas**.

### Neutras

- O comportamento descrito pode ser específico a uma versão do Supabase ou plano (este projecto usa Free tier). Em planos pagos pode haver sync automático entre layers. Verificar antes de assumir comportamento idêntico noutros projects.

---

## Implementation

Aplicado a 2026-05-12 via `mcp__claude_ai_Supabase__execute_sql` no projecto `hkmvszkpxjbxmnixzqbl`:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas =
  'public, graphql_public, core, system, v2_condominios, v3_seguros, v4_energia, v5_manutencao, v1_owners_club, marketing';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
```

Confirmação imediata via `SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator'` e smoke test REST aos schemas v2_condominios, system, v3_seguros, v5_manutencao (todos `HTTP 200`).

---

## Followups

- [ ] Adicionar nota no `CLAUDE.md` raiz (secção 💾 Supabase) com o snippet canónico
- [ ] Registar este truque no `.claude/state/opportunities.md` se for útil a outros agents
- [ ] Validar comportamento no projecto V2 produção (`eozklslwfaqujaijvdnl`) — não testar até cutover

---

## References

- Postgres `pg_roles.rolconfig` docs
- PostgREST `db-schemas` config reference: https://docs.postgrest.org/en/latest/configuration.html#db-schemas
- Supabase: schema configuration via SQL is the supported path for advanced users
- Issue PostgREST `#2791` — reload notifications dropped during in-progress reload
