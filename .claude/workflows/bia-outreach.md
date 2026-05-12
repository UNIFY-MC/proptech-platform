---
id: bia-outreach-compose
title: Bia · Outreach R2 para alpha owner
employee: v5.bia
trigger_type: manual
trigger_value: dashboard /employees/bia → "+ Pedir task" → "Compor outreach owner"
pattern: chain                     # linear: lookup → optional catalog → compose → submit
                                   # (sem branching — pattern simples por design no Sprint A)
status: active
version: "1.0"
updated: 2026-05-12
---

# Bia · Outreach R2 para alpha owner

> R2 = Recovery Round 2. Owners alpha que registaram conta mas têm baixa
> actividade (zero pedidos em 7+ dias, ou só 1 equipamento registado).
> Bia compõe mensagem WhatsApp curta, personalizada, com next-step concreto.

## Goal

Reactivar alpha owner com WhatsApp que parece humano e propõe uma acção
de baixa fricção (registar equipamento, agendar revisão, fazer assessment).
**Não vende serviço directamente** — propõe sempre passo intermédio.

## Trigger

| Tipo | Quando | Source |
|---|---|---|
| Manual | Mário identifica owner com baixa actividade | Inbox `daily_roundup` ou observação manual |

Futuro (Sprint B): event-driven via watcher que detecta `0 activity > 7d`.

## Inputs

```json
{
  "pessoa_id": "string · UUID obrigatório · core.pessoas.id",
  "contexto": "string · opcional · ex: 'tem 2 equipamentos sem manutenção há 6 meses'"
}
```

## Pattern

**Chain (prompt chaining)** — passos sequenciais sem ramificação. Ideal para
"compor X com base em Y" porque cada passo prepara contexto para o seguinte.

```
input(pessoa_id, contexto)
  ↓
  bia_query_owner(pessoa_id)
  ↓ (nome + localização + idioma)
  bia_query_catalogo(categoria do tipo de imóvel)  [opcional]
  ↓ (serviços relevantes para citar)
  Compose WhatsApp (LLM interno, sem tool)
  ↓ (draft + classification + custo_estimado)
  bia_submit_approval(action_type='whatsapp_send', ...)
  ↓
  end_turn (devolve approval_id + draft ao caller)
```

## Steps

| # | Skill / Tool | Input | Decision | Output |
|---|---|---|---|---|
| 1 | `bia_query_owner` | `{ pessoa_id }` | sempre | `{ pessoa, localizacoes[] }` |
| 2 | `bia_query_catalogo` | `{ categoria: derivada da tipologia }` | só se `localizacoes[0].tipologia` for conhecida | `{ servicos[] }` |
| 3 | _interno LLM_ | contexto acumulado + `contexto` input | Compõe WhatsApp | rascunho text |
| 4 | `bia_submit_approval` | `{ action_type: 'whatsapp_send', draft_message, classification: { tipo: 'r2_outreach', servico_relevante, custo_estimado_eur } }` | obrigatório | `{ approval_id, status: 'pending' }` |
| 5 | _end_turn_ | — | obrigatório | Texto curto a confirmar approval criada |

## Constraints da mensagem (NEVER rules da Bia)

- PT-PT estrito (frigorífico, casa de banho, arranjo)
- Máximo 280 chars (1 SMS WhatsApp legível sem scroll)
- Cumprimentar pelo `primeiro_nome` (nunca nome completo nem "Caro Sr.")
- Referir contexto do imóvel (tipologia + localidade)
- **Não vender directamente** — propor sempre next-step de baixa fricção
- 0 ou 1 emoji
- Nunca prometer preço — só citar "a partir de €X" com base em `bia_query_catalogo`

## Success criteria

- ✅ Row em `system.approvals_queue` com `source_agent='bia'`, `action_type='whatsapp_send'`, `status='pending'`
- ✅ `draft_message` entre 80-280 chars
- ✅ `classification.tipo = 'r2_outreach'`
- ✅ Audit log com `stop_reason='end_turn'` na última iteração
- ✅ Custo < €0.05 por invocation (sonnet-4-6 + 2 tool calls + ~1000 input tokens)
- ✅ Latência < 12s p95

## Failure modes

| Sintoma | Causa provável | Mitigação |
|---|---|---|
| `pessoa_id não encontrada` | UUID errado / pessoa apagada | Validar antes de invocar — UI input deve ser dropdown, não free text (Sprint B) |
| Draft > 280 chars | LLM excedeu limite | System prompt já dá `max 280` — se reincidir, adicionar tool `bia_validate_draft` |
| `classification` vazio | LLM esqueceu obrigatório | Schema do tool já é `required` — validar no executor |
| 0 catálogo match | Owner sem tipologia registada | Step 2 é opcional — chain continua sem cite de preços |
| Approval >4h sem decisão | SLA breach | Notify Discord/email (Sprint B) |

## Observability

```sql
-- Última invocation desta workflow
SELECT iteration, stop_reason, tool_name, input_tokens, output_tokens, cost_eur
FROM core.agent_audit_log
WHERE agent_name = 'v5.bia'
  AND created_at > now() - interval '1 hour'
ORDER BY session_id, iteration;

-- Approvals criadas por outreach (últimas 24h)
SELECT id, draft_message, classification, status, decision_at
FROM system.approvals_queue
WHERE source_agent = 'bia'
  AND action_type = 'whatsapp_send'
  AND created_at > now() - interval '24 hours';
```

## Notes / TODO

- Sprint B: trigger event-driven via watcher `low_activity_owner`
- Sprint B: substituir Resend (teste interno) por Twilio WhatsApp Business
- Sprint C: A/B test de templates (`classification.template_variant`)
- Sprint C: feedback loop — se owner não responder em 72h, segundo outreach com tom diferente
