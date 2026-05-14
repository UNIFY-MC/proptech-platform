---
id: approval
title: Approval queue — lifecycle decisão Mário
entity_table: system.approvals_queue
status_column: status
states: [pending, approved, edited_approved, dismissed]
status: active
version: "1.0"
updated: 2026-05-12
---

# Approval queue — lifecycle decisão Mário

> Toda acção com efeito externo de um agent (Bia, casa_advisor, etc.) passa
> primeiro por `system.approvals_queue` com status `pending`. Mário decide:
> aprova como está, edita e aprova, ou rejeita. Apenas estados terminais
> aprovados disparam side-effects reais (envio WhatsApp, INSERT em tabelas
> de negócio, deploy, etc.).

## Goal

Single source of truth para todas as acções pendentes de decisão humana
no projecto. Garante audit trail completo (quem aprovou, quando, com que
edição). Impede agents de fazer side-effects autónomos em produção.

## Estados

```
   ┌──────────┐
   │ pending  │ ←── agent INSERT via bia_submit_approval (ou equivalente)
   └────┬─────┘
        │
        ├──── Mário clica "Aprovar" ──────────────▶ ┌──────────┐
        │                                            │ approved │ (terminal)
        │                                            └──────────┘
        │
        ├──── Mário edita texto + aprova ──────────▶ ┌────────────────┐
        │                                            │ edited_approved│ (terminal)
        │                                            └────────────────┘
        │
        └──── Mário rejeita (opcional: razão) ─────▶ ┌──────────┐
                                                     │ dismissed│ (terminal)
                                                     └──────────┘
```

## Estados — detalhe

| Estado | Significado | Terminal? | Quem escreve | Side-effect ao entrar |
|---|---|---|---|---|
| `pending` | Acabou de ser criada pelo agent. Aguarda decisão. | Não | Agent service_role (via tool `bia_submit_approval`) | Realtime push para UI. SLA timer inicia. |
| `approved` | Mário aprova sem editar. Texto/payload original vai para execução. | ✅ Sim | UI staff via `useApprovalActions.approveItem()` | Trigger executor edge function. |
| `edited_approved` | Mário editou `edited_message` antes de aprovar. **Executor usa `edited_message`, não `draft_message`**. | ✅ Sim | UI staff via `useApprovalActions.editAndApprove()` | Trigger executor. Audit: diff entre draft e edited. |
| `dismissed` | Mário rejeitou. `dismiss_reason` opcional. Sem side-effect. | ✅ Sim | UI staff via `useApprovalActions.rejectItem()` | Nenhum side-effect externo. Log para futuro fine-tuning do prompt. |

## Transições

| From → To | Trigger | Guard | Side-effects |
|---|---|---|---|
| `(init) → pending` | Agent chama tool `bia_submit_approval` | Tool valida `action_type` ∈ Set permitido, `draft_message` não vazio | INSERT row. Audit em `core.agent_audit_log`. Realtime notify. |
| `pending → approved` | Mário clica "Aprovar" no dashboard | `is_staff()` true | `decision_at = now()`, `decision_by = auth.uid()`. Executor invocado. |
| `pending → edited_approved` | Mário edita texto + clica "Guardar e aprovar" | `is_staff()` + `edited_message` não vazio | Idem `approved` mas `edited_message` é o texto canónico. |
| `pending → dismissed` | Mário clica "Rejeitar" | `is_staff()` true | `decision_at`, `decision_by`, `dismiss_reason` opcional. Sem executor. |
| `* → *` (terminal) | — | — | **Estados approved/edited_approved/dismissed são imutáveis.** Reversões fazem-se criando nova approval com referência (Sprint B). |
| `pending → pending` | Mário edita rascunho sem aprovar (UI futura) | `is_staff()` + edição | UPDATE `edited_message` apenas. Estado permanece pending. |

## CHECK constraint actual (já em produção)

```sql
-- Confirmado via pg_get_constraintdef em 2026-05-12:
CHECK (status = ANY (ARRAY['pending', 'approved', 'edited_approved', 'dismissed']))
CHECK (((decision_at IS NULL) AND (decision_by IS NULL)) OR (status = ANY (ARRAY['approved','edited_approved','dismissed'])))
CHECK (((dismiss_reason IS NULL) OR (status = 'dismissed')))
CHECK (((edited_message IS NULL) OR (status = ANY (ARRAY['pending', 'edited_approved']))))
```

Isto **já garante** invariants:
- `decision_at/decision_by` só populados se status decidiu
- `dismiss_reason` só em `dismissed`
- `edited_message` só em `pending` (rascunho) ou `edited_approved` (final)

## Action types — semântica

Coluna `action_type` controla o **tipo de side-effect** que vai disparar quando status passa a `approved`/`edited_approved`:

| action_type | Side-effect (Sprint B executor) | Status actual Sprint A |
|---|---|---|
| `whatsapp_send` | POST Twilio/Resend para `pedido.contacto_preferido` | Aprovada mas não executa — placeholder |
| `email_send` | POST Resend | Aprovada mas não executa |
| `db_insert` | INSERT em tabela específica (ex: `servicos_contratados` para triagem) | Aprovada mas não executa |
| `db_update` | UPDATE em tabela específica | Aprovada mas não executa |
| `deploy` | Trigger Vercel deploy via API | Não usado ainda |
| `api_call` | Chamada genérica a API externa | Não usado ainda |

## Executor (Sprint B — pendente)

Sprint B adiciona edge function `approvals-executor` que:

1. Subscreve `postgres_changes` em `system.approvals_queue` para `UPDATE WHERE status='approved' OR status='edited_approved'`
2. Faz lookup por `action_type` numa tabela `system.executors` (a criar) com map para função
3. Invoca função correspondente
4. UPDATE `execution_at`, `execution_result` na row
5. Em caso de erro: insere `system.inbox_items` com `severity='critical'` e item_type='alert'

## RLS

Definido em ADR-010 e migrations system.* já aplicadas:

- READ: `authenticated` AND `public.is_staff()` true
- INSERT: apenas `service_role` (agents via edge function)
- UPDATE: `is_staff()` AND row.status = 'pending'

## Audit

Cada UPDATE de status deveria gerar row em `core.agent_audit_log` ou `core.eventos_cliente` (Sprint B). Hoje o audit está embebido na own row (`decision_at`, `decision_by`, `dismiss_reason`, `execution_at`, `execution_result`).

## SLA

- 🔴 Emergência: decisão necessária em <2h (Bia metadata)
- 🟡 Urgente: <24h
- 🟢 Normal: <72h
- Outreach R2: <72h

Coluna `expires_at` é informacional no Sprint A. Sprint B: cron diário verifica `expires_at < now() AND status='pending'` → escalate inbox + Discord webhook.

## Observability

```sql
-- Distribuição actual
SELECT status, action_type, count(*)
FROM system.approvals_queue
GROUP BY 1, 2 ORDER BY 1, 2;

-- Tempo médio até decisão (últimos 30d)
SELECT
  action_type,
  count(*) AS total,
  avg(EXTRACT(epoch FROM (decision_at - created_at))/60)::numeric(10,1) AS avg_min,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (decision_at - created_at))/60) AS p95_min
FROM system.approvals_queue
WHERE decision_at IS NOT NULL AND created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 4 DESC;

-- Approval rate por action_type
SELECT
  action_type,
  count(*) FILTER (WHERE status IN ('approved','edited_approved'))::numeric / count(*) AS approval_rate,
  count(*) FILTER (WHERE status = 'edited_approved')::numeric / nullif(count(*) FILTER (WHERE status IN ('approved','edited_approved')), 0) AS edit_rate
FROM system.approvals_queue
WHERE status != 'pending' AND created_at > now() - interval '30 days'
GROUP BY 1;

-- Overdue pendentes (>4h)
SELECT id, action_type, source_agent, created_at, EXTRACT(epoch FROM (now() - created_at))/3600 AS hours_open
FROM system.approvals_queue
WHERE status = 'pending' AND created_at < now() - interval '4 hours'
ORDER BY created_at;
```

## Notes / TODO

- Sprint A: schema CHECK já completo (verificado em produção)
- Sprint A: source_agent CHECK aceita `bia | casa_advisor | image_inspector | manual`
- Sprint B: edge function `approvals-executor` (autoplay side-effect após aprovação)
- Sprint B: `system.executors` table com map `action_type → executor_fn`
- Sprint B: Discord webhook on insert pending high-urgency
- Sprint C: undo flow — aprovação anulável em janela <5 min antes de execução
- Sprint C: bulk actions — aprovar/rejeitar múltiplas approvals
