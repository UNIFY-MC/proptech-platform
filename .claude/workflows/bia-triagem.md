---
id: bia-pedido-triagem
title: Bia · Triagem de pedido de orçamento
employee: v5.bia
trigger_type: manual
trigger_value: dashboard /employees/bia → "+ Pedir task" → "Triagem de pedido"
pattern: chain + route + parallel
                                   # chain principal, route por urgência classificada,
                                   # parallel quando consulta prestadores + catálogo
status: active
version: "1.0"
updated: 2026-05-12
---

# Bia · Triagem de pedido de orçamento

> Owner submete pedido (texto + áreas + opcionalmente fotos) em
> `v5_manutencao.pedidos_orcamento`. Bia classifica urgência, cita preço
> base do catálogo, e propõe match com 1-3 prestadores. Mário aprova o
> match e executa side-effect (criar relação prestador-pedido).

## Goal

Reduzir o tempo manual de triagem de pedidos (hoje 100% Mário) de ~10 min
para <1 min de revisão sobre um draft pronto da Bia.

## Trigger

| Tipo | Quando | Source |
|---|---|---|
| Manual (Sprint A) | Mário pega pedido pendente em `pedidos_orcamento` | UI dashboard |
| Event (Sprint B) | INSERT em `pedidos_orcamento` com `estado='aberto'` | Realtime subscription |

## Inputs

```json
{
  "pedido_id": "string · UUID obrigatório · v5_manutencao.pedidos_orcamento.id"
}
```

## Pattern

**Chain principal + Route interno + Parallel queries**. Razão:

- **Chain** porque ordem importa: dados → classificação → match → approval
- **Route** porque urgência altera o tom da mensagem e o tipo de prestador a procurar
- **Parallel** porque catálogo e prestadores são queries independentes

```
input(pedido_id)
  ↓
  bia_query_pedido(pedido_id)
  ↓ (descrição + áreas + owner + localização)
  ───┬──── Classify urgência (LLM interno) ────┐
     │     🔴 emergencia | 🟡 urgente | 🟢 normal│
     ▼                                          ▼
     parallel:                                  │
       bia_query_catalogo(categoria inferida)   │
       bia_query_prestadores(categoria, zona)   │
     ↓                                          │
  ◄───── (route by urgência) ───────────────────┘
  ↓
  Compose draft + select top prestador
  ↓
  bia_submit_approval(
    action_type='db_insert',
    pedido_orcamento_id=<id>,
    draft_message,
    classification={urgencia, categoria, razao},
    prestador_suggested=<top 1 snapshot>
  )
  ↓
  end_turn
```

## Steps

| # | Skill / Tool | Input | Decision | Output |
|---|---|---|---|---|
| 1 | `bia_query_pedido` | `{ pedido_id }` | sempre | `{ pedido, owner, localizacao }` |
| 2 | _interno LLM_ | descrição + áreas | Classifica urgência | `🔴/🟡/🟢` + categoria inferida |
| 3a | `bia_query_catalogo` | `{ categoria }` | paralelo com 3b | `{ servicos[] }` |
| 3b | `bia_query_prestadores` | `{ categoria, zona: localizacao.localidade }` | paralelo com 3a | `{ prestadores[] }` |
| 4 | _interno LLM_ | resultados 2+3a+3b | Compose draft + select top prestador | draft + prestador snapshot |
| 5 | `bia_submit_approval` | classification + prestador_suggested + pedido_orcamento_id | obrigatório | `{ approval_id }` |
| 6 | _end_turn_ | — | obrigatório | Resumo curto da triagem |

## Route table — urgência → comportamento

| Urgência | Critério | Comportamento da Bia |
|---|---|---|
| 🔴 emergencia | Gás, fumo, choque, inundação, ar condicionado >35°C interior | Prefixo `⚠️ Liga 112 imediatamente.` Procura prestadores com `nivel='premium'` e `aprovado=true` independentemente de rating |
| 🟡 urgente | Avaria sem alternativa (caldeira único aquecimento Inverno, fuga de água) | Top 1-2 prestadores por `rating_medio` + zona |
| 🟢 normal | Manutenção planeada, pintura, jardim, limpeza | Top 3 prestadores por `rating_medio + founding_professional DESC` |

## Success criteria

- ✅ Approval criada com `action_type='db_insert'`, `pedido_orcamento_id` correcto
- ✅ `classification.urgencia` ∈ {emergencia, urgente, normal}
- ✅ `prestador_suggested` populado com snapshot (id, nome, rating_medio, localizacao)
- ✅ Para urgência 🔴: draft começa com "⚠️ Liga 112"
- ✅ Custo < €0.10 por invocation (2-3 iterations, ~2000 input tokens)
- ✅ Latência < 15s p95

## Failure modes

| Sintoma | Causa provável | Mitigação |
|---|---|---|
| `pedido_id não encontrado` | UUID errado / pedido apagado | UI dropdown filtra `estado='aberto'` |
| `prestadores[] = []` | Sem prestadores na zona/categoria | Bia escreve approval com `prestador_suggested: null` e classificação `razao='sem_match_na_rede'` — Mário decide manual |
| Classificação errada (🔴 → 🟢) | Pedido ambíguo | Audit manual periódico — ajustar system prompt se padrão repetir |
| Categoria alucinada | LLM inventa categoria fora do catálogo | Regra BB já protege `bia_query_catalogo` — throw com lista válida |
| Approval >4h sem decisão | SLA breach em emergência | Notify Discord (Sprint B), escalate critical urgency |

## Observability

```sql
-- Distribuição de urgência últimas 30d
SELECT classification->>'urgencia' AS urg, count(*)
FROM system.approvals_queue
WHERE source_agent = 'bia' AND action_type = 'db_insert'
  AND created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 2 DESC;

-- Tempo médio Mário-decision
SELECT
  classification->>'urgencia' AS urg,
  avg(EXTRACT(epoch FROM (decision_at - created_at))/60) AS avg_min_to_decide
FROM system.approvals_queue
WHERE source_agent = 'bia' AND status != 'pending'
GROUP BY 1;
```

## Notes / TODO

- Sprint B: side-effect executor após `status='approved'` → criar row em `v5_manutencao.servicos_contratados` ligando prestador↔pedido↔owner
- Sprint B: notify prestador via WhatsApp/email quando match é aprovado
- Sprint C: re-triagem automática se primeiro prestador rejeitar em 24h
- Sprint C: feedback loop — após trabalho concluído, capturar rating real → realimenta ranking de prestadores
