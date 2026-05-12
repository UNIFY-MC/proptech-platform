---
id: pedido-orcamento
title: Pedido de orçamento V5 — lifecycle completo
entity_table: v5_manutencao.pedidos_orcamento
status_column: estado
states: [aberto, em_triagem, matched, cancelado, fechado]
status: active
version: "1.0"
updated: 2026-05-12
---

# Pedido de orçamento V5 — lifecycle

> Owner cria pedido descrevendo trabalho que precisa. Bia faz triagem
> (classificação + match prestador). Mário aprova. Prestador executa.
> Owner valida. Pedido fecha.

## Goal

Garantir que cada pedido tem 1 estado claro em qualquer instante, com
trail de auditoria para legal (NF-AT 10 anos) e produto (rating prestador).

## Estados

```
   ┌──────────┐
   │  aberto  │ ←── owner submete via app PRATA
   └────┬─────┘
        │ trigger: Bia faz pedido_triagem (manual ou event)
        ▼
   ┌─────────────┐                 cancelar
   │ em_triagem  │ ───────────────────────────▶ ┌───────────┐
   └────┬────────┘                              │ cancelado │
        │ Mário aprova approval em queue        └───────────┘
        ▼                                        (terminal)
   ┌──────────┐
   │  matched │
   └────┬─────┘
        │ Prestador completa trabalho + owner valida
        ▼
   ┌──────────┐
   │  fechado │ (terminal)
   └──────────┘
```

## Estados — detalhe

| Estado | Significado | Terminal? | Quem escreve | Quando entra |
|---|---|---|---|---|
| `aberto` | Acabou de ser criado pelo owner. Sem triagem feita. | Não | App owner | INSERT inicial |
| `em_triagem` | Bia já consultou e criou approval em queue. À espera de decisão humana. | Não | Bia (edge function via approval insert) | Bia cria approval com `action_type='db_insert'` |
| `matched` | Mário aprovou match. Prestador foi notificado. | Não | Edge function executor (Sprint B) após approval status='approved' | Approval decision_at populado |
| `cancelado` | Owner cancelou OU Mário rejeitou triagem OU SLA emergência expirou sem prestador | ✅ Sim | Edge function executor | `cancelado_em` + `cancelado_motivo` |
| `fechado` | Trabalho executado e validado pelo owner | ✅ Sim | App owner (rating) | `concluido_em` |

## Transições

| From → To | Trigger | Guard | Side-effects |
|---|---|---|---|
| `(init) → aberto` | App owner submete | Campos obrigatórios: `descricao`, `areas[]`, `pessoa_id`, `organization_id` | `created_at = now()` |
| `aberto → em_triagem` | Bia invocada com `pedido_triagem(pedido_id)` | Approval criada em `system.approvals_queue` com `action_type='db_insert'` e `pedido_orcamento_id=this.id` | UPDATE estado, sem side-effect externo |
| `em_triagem → matched` | Mário clica "Aprovar" no dashboard | Approval `status='approved'` ou `'edited_approved'` | Edge function executor cria row em `v5_manutencao.servicos_contratados` ligando prestador↔pedido. Notify prestador via WhatsApp/email |
| `em_triagem → cancelado` | Mário clica "Rejeitar" | Approval `status='dismissed'` + `dismiss_reason` | `cancelado_em`, `cancelado_motivo = approval.dismiss_reason` |
| `aberto → cancelado` | Owner cancela antes da triagem | — | `cancelado_motivo='owner_cancelled'` |
| `matched → cancelado` | Prestador rejeita / não comparece | — | Re-trigger triagem (Sprint C) — Bia sugere alternativo |
| `matched → fechado` | Owner aceita trabalho completo + rating | Existe row em `v5_manutencao.recibos_servico` (trabalho documentado) | `concluido_em = now()`. Pontos owner em `pontos_historico` |
| `cancelado → *` | — | — | **Terminal: imutável** |
| `fechado → *` | — | — | **Terminal: imutável (audit legal AT 10 anos)** |

## CHECK constraint SQL recomendada

```sql
-- Verificar constraint actual:
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'v5_manutencao.pedidos_orcamento'::regclass AND contype = 'c';

-- Se não existir, adicionar:
ALTER TABLE v5_manutencao.pedidos_orcamento
  ADD CONSTRAINT chk_estado
  CHECK (estado IN ('aberto', 'em_triagem', 'matched', 'cancelado', 'fechado'));
```

## RLS (já definido em produção)

- Owner: vê só os seus pedidos (`pessoa_id = current_pessoa_id()`)
- Staff: vê todos (`is_staff()`)
- Prestador (Fase 6): vê só pedidos onde está matched ou candidato

## Audit obrigatório

Toda transição de estado deve criar row em `core.eventos_cliente`:

```sql
INSERT INTO core.eventos_cliente (pessoa_id, vertical, tipo, payload)
VALUES (
  $pessoa_id, 'v5', 'pedido_estado_change',
  jsonb_build_object('pedido_id', $id, 'from', $from, 'to', $to, 'by', $actor)
);
```

## Observability

```sql
-- Distribuição actual
SELECT estado, count(*) FROM v5_manutencao.pedidos_orcamento GROUP BY 1;

-- Tempo médio em cada estado (últimos 30d)
SELECT
  estado,
  avg(EXTRACT(epoch FROM (now() - created_at))/3600)::numeric(10,2) AS avg_hours_in_state
FROM v5_manutencao.pedidos_orcamento
WHERE created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1;

-- Funnel conversão aberto → fechado (cohort mensal)
SELECT
  date_trunc('month', created_at) AS mes,
  count(*) FILTER (WHERE estado IN ('aberto','em_triagem','matched','fechado')) AS total,
  count(*) FILTER (WHERE estado = 'fechado') AS fechados,
  count(*) FILTER (WHERE estado = 'cancelado') AS cancelados,
  (count(*) FILTER (WHERE estado = 'fechado'))::numeric / nullif(count(*), 0) AS conv_rate
FROM v5_manutencao.pedidos_orcamento
GROUP BY 1 ORDER BY 1 DESC;
```

## Notes / TODO

- Sprint A: estado `em_triagem` é novo — verificar se já existe no CHECK actual e adicionar se faltar (migration)
- Sprint B: side-effect executor (`em_triagem → matched`) precisa de edge function `approvals-executor`
- Sprint B: trigger automático `aberto → em_triagem` por watcher (sem precisar Mário clicar)
- Sprint C: SLA enforcement — `aberto > 24h sem triagem` → escalate inbox + Discord
- Sprint C: cohort retention por urgência (emergência vs normal)
