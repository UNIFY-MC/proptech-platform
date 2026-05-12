---
id: workflow-id-em-snake-case
title: Título descritivo
employee: v5.bia                  # agent_name em core.agent_policies
trigger_type: manual | event | cron
trigger_value: "30 6 * * *"       # cron expr | event name | manual
pattern: chain | route | parallel | orchestrator | evaluator
                                  # ver Anthropic "Building effective agents"
status: draft | active | deprecated
version: "1.0"
updated: 2026-05-12
---

# {Título}

> Snapshot canónico do workflow. Pode ser executado por código (runAgent) ou
> lido por humano. Source of truth: este ficheiro. DB (Sprint B) é cópia mutável.

## Goal

Uma frase que descreve o outcome de negócio (não a implementação técnica).

## Trigger

| Tipo | Quando dispara | Source |
|---|---|---|
| Manual | Mário clica botão | UI dashboard `/employees/bia` |
| Event | Row inserida em tabela X | Supabase Realtime subscription |
| Cron | Horário fixo | pg_cron job |

## Inputs

```json
{
  "campo_obrigatorio": "string · UUID",
  "campo_opcional": "object | null"
}
```

Validação: ver runtime check em `bia-chat/index.ts`.

## Pattern

**{Nome do pattern}** — porquê este pattern para este workflow.

Diagrama em texto:

```
input → skill_1 → skill_2 → ... → submit_approval → end_turn
        (route by X)
                ├→ skill_2a → ...
                └→ skill_2b → ...
```

## Steps

| # | Skill / Tool | Input | Decision | Output |
|---|---|---|---|---|
| 1 | `tool_name` | `{...}` | sempre | `{ ... }` |
| 2 | `tool_name` | depende de #1 | if X then ... | `{ ... }` |
| 3 | `bia_submit_approval` | classification + draft | obrigatório | `{ approval_id }` |

## Success criteria

- ✅ Approval criada com `action_type=X` e `status=pending`
- ✅ Audit log em `core.agent_audit_log` com `stop_reason=end_turn`
- ✅ Custo total < €X por invocation
- ✅ Latência < Ys p95

## Failure modes

| Sintoma | Causa provável | Mitigação |
|---|---|---|
| 400 Anthropic API | Modelo ID inválido | Verificar `agent_policies.model` |
| stop_reason=max_tokens | System prompt demasiado longo | Truncar / sumarizar |
| Tool throw "validação categórica" | Bia alucinou enum | Regra BB — Set hardcoded já no executor |
| approval orfã (sem decisão >4h) | SLA breach | Notify Discord (Sprint B) |

## Observability

- Audit: `SELECT * FROM core.agent_audit_log WHERE session_id = $1 ORDER BY iteration`
- Approval: `SELECT * FROM system.approvals_queue WHERE id = $approval_id`
- Costs: `SELECT sum(cost_eur) FROM core.agent_audit_log WHERE agent_name = 'v5.bia' AND created_at > now() - interval '30 days'`

## Notes / TODO

- ...
