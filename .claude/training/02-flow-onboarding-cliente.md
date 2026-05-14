# 02 — Flow de Onboarding de Cliente

> 🎯 **Objectivo:** acolher um cliente novo (ex: Prata Owners) desde o invite até estar a operar.
> 📋 **Pré-requisitos:** ler [01 — Conceito Geral](01-conceito-geral.md)

---

## 6 fases do onboarding

```
INVITE → SETUP → INTAKE → IMPLEMENTATION → TESTING → OPERATION
 Tu      Cliente  Cliente      Tu             Ambos      Ambos
 1 min   5 min    10 min       2-4h           1-2 dias   Contínuo
```

---

## Fase 1 — INVITE (tu, 1 min)

🛠 **Passos**:
1. [/clients](http://localhost:5180/clients) → click **Invite Client**
2. Preenche: empresa, email, contacto, niche, vertical
3. Click **Enviar invite**

✅ Cliente aparece no grid com badge `PENDING` · `flow_progress: 0%`.

(Magic-link email envio real — Sprint M futuro com `client-invite` edge fn)

---

## Fase 2 — SETUP (cliente, 5 min)

Cliente clica magic-link → portal cliente público → conecta tools:
- **Gmail** OAuth (ler/responder emails condomínio)
- **WhatsApp Business** QR scan
- **Toconline** API key
- **Banco BCP** (upload manual CSV mensal)

✅ No teu lado: card mostra `grants_connected: 4` · `flow_progress: 33%`.

---

## Fase 3 — INTAKE (cliente, 10 min)

Wizard 6 steps replicando CookAI HVAC Client Intake:

| Step | Conteúdo |
|---|---|
| 1 | Welcome — "Welcome to Property007 Prata Owners engine" |
| 2 | Tell us about your business — nome, morada, frações, condóminos, permilagem |
| 3 | Connect financial tools — Toconline já, Stripe opcional, BCP IBAN |
| 4 | Watch: How the engine works (3 min vídeo) |
| 5 | Quick chat with AI strategist — agent pergunta top 3 problemas, comms a automatizar |
| 6 | Done — "🎉 Onboarding complete. Property007 começa a operar em 24-48h" |

✅ `flow_progress: 100%` · status `active` · trigger `client_intake_completed` cria task no teu lado.

---

## Fase 4 — IMPLEMENTATION (tu, 2-4h)

🛠 **Configurar recipes/schedules/triggers específicos do cliente**:

1. **Criar projecto** [/projects](http://localhost:5180/projects):
   - Nome: "Prata Owners — V2 Onboarding"
   - Goals: 4 checkboxes (mandatos SEPA, recipe mora, trigger WhatsApp, dashboard)

2. **Schedule mora** [/schedules](http://localhost:5180/schedules):
   - Recipe `weekly-mora-batch` · bot `financeiro-condo` · cron `0 9 1 * *` (1º dia mês 9h)

3. **Trigger WhatsApp avaria** [/triggers](http://localhost:5180/triggers):
   - Event `inbox_item_added` · filter `{"vertical":"v2","client_id":"prata-owners"}` · recipe `daily-maintenance-triage`

4. **AgentMail mailbox** [/clients/email](http://localhost:5180/clients/email):
   - Domain `mail.prataowners.pt` + DNS records + mailbox `condominio@`

5. **Branding** [/clients/setup](http://localhost:5180/clients/setup):
   - Logo PNG + cor primária `#1E3A8A`

---

## Fase 5 — TESTING (ambos, 1-2 dias)

**Dry-run weekly-mora-batch**:
- /schedules → Run now
- Acompanha em /tasks Kanban
- Quando chega step `human` (Aprovar batch) → revê draft no /tasks/:id EmailDraftCard → Approve & Send

**Smoke test trigger WhatsApp**:
- Mensagem fake "Tubo rebentou Apt 4D" → Bia executa triage → cria OT prestador → vês mission detail

✅ Tu fizeste 3-5 approvals sem corrigir → confiança · cliente fez 2 conversas resolvidas → fluxo robusto.

---

## Fase 6 — OPERATION (contínuo)

**Tua rotina** (ver [03 — Curso Operations 101](03-curso-operations-101.md)):
- 08h Daily Roundup
- 08h05 Approvals queue
- 17h Review mission cards

**Cliente**:
- Recebe email semanal resumo (comment auto da recipe)
- Portal `/portal/prata-owners` para dashboard
- WhatsApp Property007 para falar contigo

---

## Personas envolvidas

| Persona | URL | Acessos |
|---|---|---|
| **Mário** | dashboard agentic-ops | Tudo (admin) |
| **Staff humano futuro** | dashboard agentic-ops | Só verticais atribuídas (RLS) |
| **Cliente Prata Owners** | portal.prataowners.pt | Dashboard + Onboarding + Connections |
| **AI Employee Bia** | edge fn task-execute | API only — posta em /tasks |

---

**Próximo**: [03 — Curso Operations 101](03-curso-operations-101.md)
