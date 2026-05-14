# 05 — Integrações Prioritárias

> 🎯 **Objectivo:** setup passo-a-passo das integrações que vais usar.
> 📋 **Pré-requisitos:** [04 — Comunicação](04-comunicacao-com-agents.md).

---

## Prioridade por ROI imediato

| # | Integração | Estado | Setup | Custo/mês |
|---|---|---|---|---|
| 1 | **Resend** (email outbound) | ⭐⭐⭐⭐⭐ | 5 min | 0€ (free 3000/mês) |
| 2 | **Gmail/Postmark inbound** | ⭐⭐⭐⭐⭐ | 30 min | 0€ ou 15€ |
| 3 | **Google Calendar ICS** (Sprint N ✅) | ⭐⭐⭐⭐⭐ | 2 min | 0€ |
| 4 | **Anthropic Claude** | ⭐⭐⭐⭐⭐ | já ✅ | ~$30/mês |
| 5 | **Wispr Flow** (ditar) | ⭐⭐⭐⭐ | 5 min | $15/mês |
| 6 | **Unipile** (WhatsApp+LinkedIn+IG) | ⭐⭐⭐⭐ | 30 min | $19-99/mês |
| 7 | **Vapi** (voice agent) | ⭐⭐⭐⭐ | 1h | ~$30/mês uso normal |
| 8 | **Playwright + Browserbase** | ⭐⭐⭐⭐ | 30 min | 0€ free / $39/mês prod |
| 9 | **Apify** (scraping) | já ✅ | já ✅ | $49/mês |
| 10 | **Toconline** (faturação PT) | já ✅ | já ✅ | depende plano TOC |

---

## 1. Resend (email outbound) — 5 min

**Para enviar emails (replies dos agents):**

🛠 **Passos**:
1. [resend.com](https://resend.com) → cria conta
2. Adiciona domain `property007.pt` (ou similar)
3. Resend gera 3 DNS records: SPF + DKIM (2 CNAMEs) + DMARC
4. Adiciona ao DNS do teu registrar (Cloudflare/Namecheap)
5. Verifica em Resend → status `verified`
6. Cria API key (Production)
7. Adiciona ao Supabase secrets:
   - `RESEND_API_KEY=re_xxxxxxxxxx`
   - `[email protected]`

✅ **Verificação**: edge fn `gmail-send` detecta key e muda para modo `live` (envia real em vez de mailto:).

**Custo**: 3000 emails/mês gratuito · $20/mês para 50K.

---

## 2. Email inbound (Postmark OR Gmail watch)

### Opção A — Postmark (mais simples, $15/mês)

🛠 **Passos**:
1. [postmark.com](https://postmark.com) → cria server "Property007 Inbound"
2. Cria Inbound Stream → obtém endereço único `xxxxx@inbound.postmarkapp.com`
3. Configura webhook URL → `https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/gmail-inbound`
4. Postmark format compatível (já testado)
5. Forward `mario@property007.pt` → `xxxxx@inbound.postmarkapp.com` (via Gmail filter ou domain MX)

✅ Mensagens chegam → `gmail-inbound` edge fn → task com draft.

### Opção B — Gmail Push (gratuito, mais complexo)

🛠 **Passos**:
1. Google Cloud Console → projecto "Property007"
2. Activa Gmail API + Pub/Sub API
3. Cria Pub/Sub topic `gmail-watch`
4. OAuth client ID (web app) com scope `gmail.readonly` + `gmail.send`
5. Mário autoriza → guardar refresh_token em Supabase Vault
6. Chama `users.watch` para subscribe ao topic (renova a cada 7 dias)
7. Cloud Run service ou Supabase edge fn `gmail-push-handler` que recebe Pub/Sub → fetch message via Gmail API → invoke `gmail-inbound` edge fn

Mais setup mas zero custo recorrente. Recomendado quando volume > 1000 emails/mês.

---

## 3. Google Calendar ICS — 2 min (Sprint N ✅)

🛠 **Passos**:
1. [calendar.google.com/settings](https://calendar.google.com/calendar/u/0/r/settings)
2. Clica no calendar à esquerda (ex: `mario@property007.pt`)
3. Scroll "Integrate calendar"
4. Copia **"Secret address in iCal format"** (URL HTTPS auth-protected)
5. Em Property007: [/calendar/settings](http://localhost:5180/calendar/settings) → Add source
   - Nome: `Mário · principal`
   - URL: cola
   - Vertical: deixa Global
6. Submit → auto-sync imediato

✅ Eventos do Google Calendar aparecem em `/calendar` com cor azul ICS · pg_cron sync horário.

**Bidirectional OAuth** (criar events Gcal a partir Property007) — Sprint futuro.

---

## 4. Wispr Flow — ditar para Property007/Claude

🛠 **Passos**:
1. [wisprflow.ai](https://wisprflow.ai) → download Mac/Windows
2. Instala → permite microfone + accessibility
3. Configura hotkey (Cmd+Space ou F8)
4. Hold key → fala → solta → texto aparece em qualquer field

**Casos de uso**:
- Em /chat dashboard: hold F8 → "Bia, prepara plano de mora para Prata Owners para Junho"
- Em /tasks descrição: hold F8 → "Cria task para verificar status do mandato SEPA do Apt 4D"
- Em BRAIN-DUMP.md: hold F8 → ditar ideia solta · sai escrito em PT-PT correcto

**Custo**: $15/mês plano Pro · trial 14 dias.

---

## 5. Unipile (WhatsApp + LinkedIn + IG + Email)

🛠 **Passos**:
1. [unipile.com](https://unipile.com) → conta · plan Starter $19/mês
2. Dashboard Unipile → Add account → WhatsApp → QR scan com telemóvel
3. Add account LinkedIn → OAuth login
4. Add account Instagram → OAuth Meta Business
5. Add Gmail account (opcional — alternativa a Resend para outbound)
6. Copy API key + workspace ID
7. Em Property007 Supabase secrets:
   - `UNIPILE_API_KEY=...`
   - `UNIPILE_WORKSPACE_ID=...`
8. Configura webhook em Unipile → `https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/unipile-inbox` (edge fn futura)

**Skills associadas**:
- `unipile-messaging` (envia WhatsApp/LinkedIn/IG)
- `linkedin-outreach` (campaigns LinkedIn massivas)
- `whatsapp-condomino` (V2 atendimento Prata Owners)

---

## 6. Vapi (voice agent)

🛠 **Passos**:
1. [vapi.ai](https://vapi.ai) → cria conta · adiciona payment method
2. Twilio number setup integrado (Vapi pode comprar PT +351 directly por $5/mês)
3. Create Assistant:
   - Voice: `eleven-labs/Andrea-PT` (PT-PT feminino)
   - Model: `gpt-4o-mini` ou `claude-3-haiku`
   - System prompt: "És a Bia, concierge V5 Manutenção Property007. Atende chamadas de condóminos com avaria. Recolhe: morada, fração, tipo avaria, urgência. PT-PT formal-amigável."
   - Functions:
     - `create_task` → POST Property007 edge fn `task-execute` com payload da chamada
4. Configura webhook do Assistant para `https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/vapi-event`
5. Test: liga ao número Vapi → fala "Olá, tenho uma avaria" → Bia responde

**Custo**: ~$0.05/min (Twilio + LLM + voice) · $30/mês uso normal V2 (10h/mês chamadas).

**Caso de uso prioritário**:
- V5 Manutenção: número geral "Property007 Manutenção" — atende 24/7 · cria OT prestador
- V2 Condomínios: número Prata Owners — atende dúvidas quotas · trasfere para tu se complexo
- V10 Owners Club: concierge premium para owners — agenda visitas, restaurantes, etc.

---

## 7. Playwright + Browserbase

> Eu (Jarvis/Claude Code) uso para testar a app + scrapers JS-heavy.

🛠 **Local setup (gratuito)**:
1. `pnpm add -D @playwright/test playwright`
2. `pnpm playwright install chromium`
3. Cria `tests/e2e/smoke.spec.ts`:
   ```ts
   test('inbox roundup loads', async ({ page }) => {
     await page.goto('http://localhost:5180/inbox')
     await expect(page.locator('text=Daily Roundup')).toBeVisible()
   })
   ```
4. `pnpm playwright test` corre em background

🛠 **Cloud setup (Browserbase, $39/mês)**:
1. [browserbase.com](https://browserbase.com) → free tier 60min/mês ou Pro $39/mês 4h/dia
2. Cria projecto · obtém API key
3. Em edge fn nova `playwright-cloud`:
   ```ts
   const session = await fetch('https://api.browserbase.com/v1/sessions', {
     method: 'POST',
     headers: { 'x-bb-api-key': Deno.env.get('BROWSERBASE_API_KEY') },
     body: JSON.stringify({ projectId: 'xxx' }),
   })
   // Conecta via WebSocket Playwright
   ```
4. Skill `playwright-browser` em system.skills:
   - "Verifica que /tasks abre, click Run num card, confirma step in_progress"
   - "Captura screenshots full-page de /recipes, /clients" → guarda em Supabase Storage

**Casos de uso**:
- Testar UI após cada commit (CI/CD)
- Scrapers Idealista anti-bot (CAPTCHA solving via Browserbase residential proxies)
- Demo screenshots automáticos para `/training` docs

---

## 8. Apify (já ✅)

[apify.com](https://apify.com) — actors prontos para LinkedIn / IG / Google Maps.

Skills associadas (já existem):
- `apify-actor` (genérico runner)
- watcher-instagram, watcher-x, watcher-news, watcher-linkedin (Property007 edge fns)

**Custo**: $49/mês plan Personal — 100K compute units (suficiente p/ 10K runs/mês).

---

## 9. Toconline (já ✅)

[toconline.pt](https://toconline.pt) — faturação online PT (Mário é TOC).

Skill `toconline` em system.skills · usado em recipes V2 financeiro.

---

## 10. Stripe (V8/V9/V10 futuro)

🛠 **Setup quando precisar**:
1. [stripe.com](https://stripe.com) → onboarding empresa PT
2. Webhooks → `https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/stripe-webhook`
3. Eventos: `payment_intent.succeeded`, `subscription.created`, `invoice.paid`
4. Skill `stripe-payments` para recipes:
   - V8 Rentals: cobra booking → confirma reserva
   - V10 Owners Club: subscription mensal
   - V9 BaaS: alternativa a Swan para Sandbox testing

---

## Tabela de secrets Supabase recomendada

```bash
# Anthropic (já temos)
ANTHROPIC_API_KEY=sk-ant-xxx

# Resend
RESEND_API_KEY=re_xxx
[email protected]

# Unipile
UNIPILE_API_KEY=xxx
UNIPILE_WORKSPACE_ID=xxx

# Vapi
VAPI_API_KEY=xxx

# Apify (já temos)
APIFY_TOKEN=apify_api_xxx

# Browserbase
BROWSERBASE_API_KEY=bb_xxx
BROWSERBASE_PROJECT_ID=xxx

# Stripe (futuro)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Setup via Supabase Dashboard → Project Settings → Edge Functions → Manage secrets.

---

**Próximo**: [06 — Fluxos Não Funcionais + Roadmap](06-fluxos-nao-funcionais.md)
