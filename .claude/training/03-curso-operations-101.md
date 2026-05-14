# 03 — Curso Operations 101

> 🎯 **Objectivo:** workflow do teu dia-a-dia operando Property007.
> 📋 **Pré-requisitos:** [02 — Onboarding](02-flow-onboarding-cliente.md).

---

## O dia do Mário Carvalho — workflow recomendado

```
08:00 ──── Daily Roundup AI (auto)         · /inbox
08:05 ──── Approvals queue                  · /inbox cards âmbar
08:30 ──── Kanban Running/Needs You         · /tasks
09:00 ──── Schedules check (próximos crons)· /schedules
09:30 ──── Triggers monitor (events fired) · /triggers
…
12:00 ──── Inbox: emails respondidos pelo agent · /tasks (kind=email_reply)
14:00 ──── Chat improvisado com agents    · /chat
17:00 ──── Review mission cards do dia    · /tasks coluna Done
17:30 ──── Brain dump update              · .claude/training/BRAIN-DUMP.md
```

Total tempo activo: **~2h/dia**. Resto = agents autopilot.

---

## 08:00 — Daily Roundup AI (auto)

Edge fn `daily-roundup` corre via pg_cron 08h:
- Lê novos items de `system.inbox_items` + outputs de `system.tasks` últimas 24h
- Claude Haiku sumariza em 3-5 bullet points: insights, blockers, recomendações
- Insert em `system.inbox_items` com `kind='daily_roundup'`

**Tu vês**: [/inbox](http://localhost:5180/inbox) tem card no topo "📅 Daily Roundup · 14 de Maio".

**Acção**: ler 30 segundos · marcar como lido.

---

## 08:05 — Approvals queue

Items com status `needs_human` aguardam:
- **Tasks needs_human**: `email_reply` drafts pendentes · steps human approval em recipes
- **Approvals queue**: comunicações sensíveis (cartas mora > €500, deliberações legais)

🛠 **Para cada card âmbar**:
1. Lê preview (3 linhas)
2. Click → MissionDetail full
3. Vês:
   - Email draft (se kind=email_reply) com Subject + Body editável
   - Review output (se step needs_human) com textarea + Approve/Request revision
4. Decide: **Approve** (verde) ou **Edit** (revê draft + Save) ou **Request revision** (re-corre agent com feedback)

**Regra**: nunca aprovar comunicações externas sem ler. Levam tu peso jurídico no condomínio.

✅ **Verificação**: lista vazia até próximo evento.

---

## 08:30 — Kanban Running/Needs You

[/tasks](http://localhost:5180/tasks) tem 4 colunas:
- **Running** (open + in_progress): tasks a correr
- **Needs You** (blocked + needs_human): bloqueadas em ti
- **Failed** (failed + cancelled): falharam — investiga
- **Done** (done): completas hoje

🛠 **Verifica**:
- Coluna Running: alguma stuck > 30min? Click no card → vê steps → "Resolver skills" ou "Análise pedido" ainda activos? Provavelmente Claude rate-limited — espera ou re-Run.
- Coluna Failed: click → MissionDetail → "Análise do pedido" com erro detalhado. Comum: JSON parse error (já temos parser resiliente) ou Anthropic 429.

---

## 09:00 — Schedules check

[/schedules](http://localhost:5180/schedules) mostra todos os autopilot jobs:
- **Next: 5m** (próximo a correr) → confere se cliente activou
- **Active toggle**: pausa schedules de clientes inactivos
- **Run now**: dispara dry-run manual

**Schedules típicos hoje**:
- `Prata Owners mora mensal` — cron `0 9 1 * *`
- `V4 análise faturas mensal` — cron `0 9 1 * *`
- `V7 weekly Idealista scout` — cron `0 9 * * 1`

---

## 09:30 — Triggers monitor

[/triggers](http://localhost:5180/triggers):
- Quantos `fires` em cada trigger últimas 24h?
- `last_fired_at` recente? Bot está a reagir.
- `fire_count` em 0 com event esperado? Verifica `event_filter` JSON.

**Comum**:
- Trigger `inbox_item_added` filter `{"kind":"lead"}` mas vem `{"kind":"whatsapp"}` — ajusta filter.

---

## 12:00 — Email approvals (Sprint M ✅)

Tu recebes email "Ana Silva — dúvida cobrança quota" via Gmail/Postmark → Property007:
- `gmail-inbound` edge fn classifica (intent=invoice_query, agent=financeiro-condo, confidence 0.95)
- Skill writer redige draft profissional PT-PT
- Task criada `kind='email_reply'`, status `needs_human`, payload tem `email_draft`

**Tu vês em** [/tasks](http://localhost:5180/tasks) **coluna Needs You**:
- Click no card → MissionDetail abre
- **EmailDraftCard azul** mostra: Subject + Body do draft + intent badge
- **Approve & Send** verde → `gmail-send` edge fn dispara:
  - Se `RESEND_API_KEY` env configurado: envia via Resend SMTP
  - Senão: abre `mailto:` em nova tab (envias manualmente)
- Comment auto na task: "✉️ Email enviado para ana.silva@example.pt"
- Task → `done`

**Tempo total**: 15 segundos por email.

---

## 14:00 — Chat improvisado

[/chat](http://localhost:5180/chat) — instrução ad-hoc a um agent:

> "Bia, prepara plano de mora para Prata Owners para Junho. Quero ver draft das 3 cartas até amanhã 12h."

Bia executa:
1. Verifica condóminos com saldo > 60d
2. Calcula juros legais PT
3. Redige 3 cartas (1 por condómino)
4. Cria task com 3 sub-deliverables
5. Notifica-te em /inbox quando pronto

---

## 17:00 — Review mission cards do dia

[/tasks](http://localhost:5180/tasks) coluna **Done**:
- Lista tasks completadas hoje
- Click qualquer uma → MissionDetail
- Vê deliverable (output_md do agent)
- "Mission Completed in 12m 41s" badge verde

**Avalia qualidade**:
- 5 missions consecutivas sem precisar Request Revision → agent está calibrado
- 2-3 Revisions seguidas → edita `receipt_md` da skill principal em [/skills](http://localhost:5180/skills) e re-promote

---

## 17:30 — Brain dump

Abre [`.claude/training/BRAIN-DUMP.md`](BRAIN-DUMP.md):
- Anota frustrações ("hoje 2 emails escalaram à Bia em vez do financeiro — ajustar classify-intent")
- Anota ideias ("v8 Rentals: integrar Hostfully channel manager")
- Anota integrações descobertas ("vi a Postiz no X — concorrente Blotato, gratuito, vale a pena testar")

Eu (Jarvis) processo o brain dump periodicamente e proponho ADRs ou sprints concretos.

---

## Atalhos teclado úteis (próximos sprints)

| Atalho | Acção |
|---|---|
| `g i` | Go inbox |
| `g t` | Go tasks |
| `g c` | Go chat |
| `n t` | New task |
| `a` | Approve focused needs_human card |
| `e` | Edit focused draft |
| `/` | Search global |

---

**Próximo**: [04 — Comunicação com Agents](04-comunicacao-com-agents.md)
