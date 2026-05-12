---
id: bia-daily-roundup
title: Bia · Daily roundup matinal
employee: v5.bia
trigger_type: cron
trigger_value: "30 6 * * *"        # 06h30 UTC = 07h30 Lisbon (inverno) / 07h30 verão (Portugal +1 DST)
                                   # cron job em pg_cron: bia-daily-roundup (jobid=2)
pattern: chain                     # query state → compose digest → write inbox
status: active                     # pg_cron schedule existe, inactivo até vault.secrets configurado
version: "1.0"
updated: 2026-05-12
---

# Bia · Daily roundup matinal

> Todas as manhãs às 07h30 Lisbon, Bia produz um digest curto do estado
> operacional V5 e escreve-o em `system.inbox_items` (sem aprovação humana
> — só notificação). Mário lê no `/inbox` quando abre o dashboard.

## Goal

Mário tem 1 fonte única para "como está a operação V5 hoje" sem precisar
de fazer queries SQL manuais ou abrir 3 ecrãs. Reduz ansiedade de
gestão e detecta drift de SLA antes de virar problema.

## Trigger

| Tipo | Quando | Source |
|---|---|---|
| Cron | Diário 07h30 Lisbon | `pg_cron.bia-daily-roundup` → `system.fn_invoke_bia_daily_roundup()` → `net.http_post(bia-chat)` |
| Manual | Mário pode invocar via UI a qualquer hora | dashboard `/employees/bia` → "Daily roundup" |

**Pré-requisito**: `vault.secrets.proptech_service_role_key` configurado, caso contrário a RPC lança exception clara e o cron falha silenciosamente.

## Inputs

```json
{}
```

Sem inputs — Bia compõe a partir do contexto que tem via tools.

## Pattern

**Chain simples sem branching**. Razão: digest é um relatório com tom único
e estrutura fixa, sem decisões condicionais por enquanto.

```
trigger (cron OR manual)
  ↓
  (Sprint A): LLM compose a partir de conhecimento prévio + data de hoje
  ↓
  bia_add_inbox_item(item_type='daily_roundup', title, body, severity='info')
  ↓
  end_turn
```

**Sprint B evolução** — adicionar query tools para Bia consultar estado real:

```
trigger
  ↓
  parallel:
    bia_count_pedidos_abertos()
    bia_count_outreach_pendente()
    bia_count_approvals_pending_overdue()
    bia_top_owners_inactive(days=7)
  ↓
  LLM compose digest com bullets reais
  ↓
  bia_add_inbox_item(...)
  ↓
  end_turn
```

## Steps (Sprint A — versão actual)

| # | Skill / Tool | Input | Decision | Output |
|---|---|---|---|---|
| 1 | _interno LLM_ | data de hoje + system prompt | Compose digest curto | body markdown |
| 2 | `bia_add_inbox_item` | `{ item_type: 'daily_roundup', title: 'Bia · Resumo diário <YYYY-MM-DD>', body, severity: 'info', payload_extra: { ts } }` | obrigatório | `{ inbox_item_id }` |
| 3 | _end_turn_ | — | obrigatório | Confirmação curta |

## Steps (Sprint B — versão completa, futuro)

Adicionar à frente da step 1, em paralelo:

| # | Skill / Tool | Input | Output |
|---|---|---|---|
| 0a | `bia_count_pedidos_abertos` | — | `{ total, by_urgencia, by_zona }` |
| 0b | `bia_count_outreach_pendente` | — | `{ pending_approvals_outreach, idade_max_horas }` |
| 0c | `bia_count_approvals_overdue` | `{ threshold_hours: 4 }` | `{ overdue: [...] }` |
| 0d | `bia_top_owners_inactive` | `{ days: 7 }` | `{ owners[] }` |

Estas tools são `SELECT count(*)` ou `SELECT ... LIMIT N` — implementação trivial em Sprint B.

## Constraints do digest

- PT-PT
- Markdown com `## Estado` e `## Acções sugeridas` headers
- Máximo 8 bullets totais (cabe em 1 screen mobile)
- Severity sempre `info` no Sprint A (Sprint B: escalar para `warning` se SLA breach detectado)
- Sem links externos (mantém-se dentro do dashboard)
- Sem números inventados — se Bia não tem tool para confirmar, escreve "estado não disponível"

## Success criteria

- ✅ Row em `system.inbox_items` com `source='bia'`, `item_type='daily_roundup'`, `vertical='v5'`
- ✅ `title` no formato `Bia · Resumo diário YYYY-MM-DD`
- ✅ `body` entre 200-1500 chars (markdown)
- ✅ Audit log com `stop_reason='end_turn'` numa única iteração (Sprint A)
- ✅ Custo < €0.02 por invocation
- ✅ Latência < 8s p95
- ✅ Cron corre 365 dias/ano sem falhas (após vault config)

## Failure modes

| Sintoma | Causa provável | Mitigação |
|---|---|---|
| Cron não corre | `vault.secrets.proptech_service_role_key` em falta | RPC `fn_invoke_bia_daily_roundup` lança exception explícita |
| RPC corre mas edge falha 401 | service_role_key inválida | Validar key no Vault — formato JWT |
| `tool_error` em `bia_add_inbox_item` | item_type fora da lista válida | Regra BB — Set hardcoded já protege |
| Digest com data errada | Timezone confuso | `new Date().toISOString().slice(0,10)` é UTC — para Lisbon usar `Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon' })` |
| Drift de DST (verão) | `30 6 * * *` UTC fica 07h30 inverno, 07h30 verão? | Portugal: UTC+0 inverno, UTC+1 verão. Cron sempre 06h30 UTC = 06h30 inverno / 07h30 verão. **TODO**: ajustar cron expr ou meter em timezone-aware (pg_cron 1.5+ suporta `cron.schedule_in_database` com timezone) |

## Observability

```sql
-- Últimos 7 daily roundups
SELECT created_at::date AS dia, title, length(body) AS chars
FROM system.inbox_items
WHERE source = 'bia' AND item_type = 'daily_roundup'
ORDER BY created_at DESC LIMIT 7;

-- Cron job health
SELECT runid, jobid, start_time, status, return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'bia-daily-roundup')
ORDER BY start_time DESC LIMIT 10;

-- Custo mensal
SELECT date_trunc('month', created_at) AS mes, sum(cost_eur)::numeric(10,3) AS eur
FROM core.agent_audit_log
WHERE agent_name = 'v5.bia' AND objective LIKE '%daily_roundup%'
GROUP BY 1 ORDER BY 1 DESC;
```

## Notes / TODO

- Sprint A: configurar `vault.secrets.proptech_service_role_key` (manual via Supabase Studio)
- Sprint A: ajustar cron para DST-aware (06h30 UTC inverno, 05h30 UTC verão = 07h30 Lisbon constante)
- Sprint B: adicionar tools `bia_count_*` para conteúdo real
- Sprint B: severity = warning se SLA breach detectado
- Sprint C: digest enriquecido com social digest (Meta/X) — exige novo watcher
