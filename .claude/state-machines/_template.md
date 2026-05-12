---
id: nome-entidade-em-kebab-case
title: Título descritivo
entity_table: schema.tabela        # FK canónica
status_column: estado | status     # nome da coluna que guarda o estado
states: [estado1, estado2, ...]    # lista canónica para CHECK constraint
status: draft | active | deprecated
version: "1.0"
updated: 2026-05-12
---

# {Título}

> State machine canónica da entidade. Documenta estados válidos, transições
> permitidas, guards (precondições), side-effects (o que acontece em cada
> transição) e terminal states. Pode ser usado como referência para CHECK
> constraints SQL e para validação aplicacional.

## Goal

Uma frase: porque existe esta entidade e qual o seu lifecycle.

## Estados

```
   ┌──────────┐
   │   draft  │ ←── initial state
   └────┬─────┘
        │ submit
        ▼
   ┌──────────┐    cancel    ┌──────────┐
   │  active  │ ─────────────▶│cancelled │ (terminal)
   └────┬─────┘              └──────────┘
        │ complete
        ▼
   ┌──────────┐
   │ closed   │ (terminal)
   └──────────┘
```

## Estados — detalhe

| Estado | Significado | Terminal? | Read by | Write by |
|---|---|---|---|---|
| `draft` | Criado mas ainda incompleto | Não | UI owner | App + agent |
| `active` | Em curso, válido para acção | Não | Staff + agent | Staff via UI |
| `closed` | Concluído com sucesso | ✅ Sim | Todos | Não |
| `cancelled` | Abortado, sem acção válida | ✅ Sim | Todos | Não |

## Transições

| From → To | Trigger | Guard (precondição) | Side-effects |
|---|---|---|---|
| `draft → active` | User submits via UI | Campos obrigatórios preenchidos | `submitted_at = now()` · notify staff |
| `active → closed` | Worker completes task | Output válido + audit OK | `closed_at = now()` · settle financeiro |
| `active → cancelled` | Staff or user cancels | (sempre permitido durante active) | `cancelled_at` · `cancelled_motivo` · revert holds |
| `closed → *` | — | — | **Estado terminal: imutável** |
| `cancelled → *` | — | — | **Estado terminal: imutável** |

## CHECK constraint SQL recomendada

```sql
ALTER TABLE schema.tabela
  ADD CONSTRAINT chk_status
  CHECK (status IN ('draft','active','closed','cancelled'));
```

## RLS (quem vê o quê)

- Owner: vê só os seus (`pessoa_id = current_pessoa_id()`)
- Staff: vê todos (`is_staff()`)
- Agent service_role: bypass

## Observability

```sql
-- Distribuição actual
SELECT status, count(*) FROM schema.tabela GROUP BY 1;

-- Velocidade de transição (draft → active)
SELECT
  avg(EXTRACT(epoch FROM (submitted_at - created_at))/60) AS avg_min,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (submitted_at - created_at))/60) AS p95_min
FROM schema.tabela WHERE submitted_at IS NOT NULL;
```

## Notes / TODO

- ...
