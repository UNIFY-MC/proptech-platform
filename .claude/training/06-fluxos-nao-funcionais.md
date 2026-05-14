# 06 — Fluxos Não Funcionais + Roadmap

> 🎯 **Objectivo:** mapa de gaps actuais + esforço/valor para decidir o que implementar a seguir.

---

## Status actual (2026-05-14)

**Implementado** (24+ commits desde sessão começou):
- ✅ Skills (92 com training Edit/Test/Promote · receipt + connectors + fallback_agent)
- ✅ Recipes (49 com steps agent/human + input {{vars}} + retry + multi-skill · normalize_step compat)
- ✅ Schedules (system.schedules + pg_cron */5min + edge fn schedule-run)
- ✅ Triggers (event-driven · DB triggers automáticos · edge fn trigger-fire · basic/agentic modes)
- ✅ Connectors + Permissions per recipe
- ✅ Visual flow chart (reactflow)
- ✅ Tasks Kanban 4-col + MissionDetail full-screen (Review/Approve/Revise/Comment stream/Realtime)
- ✅ Inbox + Daily Roundup + Approvals
- ✅ Calendar com Google Calendar ICS sync (Sprint N)
- ✅ Email integration (Gmail/Postmark inbound + classify + draft + Approve & Send) (Sprint M)
- ✅ Files manager · Chat ChatPage (parcial — freeform input pendente)
- ✅ Employees hub (Overview + Departments + Org Chart)
- ✅ Projects (tabela CookAI-style)
- ✅ Clients (overview + Setup/Email/Reporting sub-pages)
- ✅ Integrations (45 reais + 41 useful tools)
- ✅ Multi-tenant via verticals[] (filtra tudo)

---

## Gaps identificados

### 🔴 Críticos (bloqueiam ROI imediato)

| # | Feature | Esforço | Valor | Detalhe |
|---|---|---|---|---|
| **A** | Active Agents Widget na sidebar (TASKS·CHATS dropdown) | 2h | ⭐⭐⭐⭐⭐ | Sprint P agora · CookAI screenshot replica |
| **B** | Fixes triviais (Invite client, Learn Skills modal, Chat freeform, Clients drill-in) | 2h | ⭐⭐⭐⭐ | Sprint P agora |
| **C** | Discord/Slack bridge (agents postam updates, mentions criam tasks) | 6h | ⭐⭐⭐⭐⭐ | Sprint Q · arquitectura em [04 — Comunicação](04-comunicacao-com-agents.md) |
| **D** | Vapi voice agent (atendimento V5/V2/V10) | 4h | ⭐⭐⭐⭐⭐ | Sprint R · receita prota em [05](05-integracoes-prioritarias.md#6-vapi) |
| **E** | Unipile WhatsApp+LinkedIn+IG webhook receiver | 3h | ⭐⭐⭐⭐ | Sprint S |

### 🟡 Médios (melhoram experiência mas não bloqueiam)

| # | Feature | Esforço | Valor | Detalhe |
|---|---|---|---|---|
| **F** | Onboarding Flow Builder real drag-drop (substitui placeholders) | 8h | ⭐⭐⭐⭐ | Sprint T · cliente intake wizard custom |
| **G** | Client Portal lado público `/portal/:slug` (Dashboard/Onboarding/Connections) | 6h | ⭐⭐⭐⭐ | Sprint U · cliente vê dados dele |
| **H** | Reporting dashboard builder (widgets KPI/chart por client_id) | 6h | ⭐⭐⭐ | Sprint V · clientes vêem performance |
| **I** | Centralized Context wired aos agents (system.context_docs leitura automática) | 3h | ⭐⭐⭐ | Sprint W · agents lêem playbooks ao executar |
| **J** | AgentMail real send via Resend + DNS validation actual | 3h | ⭐⭐⭐ | Sprint X · já temos infra Sprint M ✅ |

### 🟢 Baixa prioridade (interessantes mas não urgentes)

| # | Feature | Esforço | Valor | Detalhe |
|---|---|---|---|---|
| **K** | OAuth bidirectional Google Calendar (write events) | 4h | ⭐⭐⭐ | Sprint Y · complementa Sprint N ICS read |
| **L** | Cal.com booking integration (lead agenda meet → cria task no agent) | 3h | ⭐⭐⭐ | Sprint Z |
| **M** | CLI Property007 (agents acedem sem UI, like CookAI CLI) | 8h | ⭐⭐ | Sprint AA · só faz sentido a partir de 5+ staff |
| **N** | Skill marketplace (vender/comprar recipes a outros consultants) | 12h | ⭐⭐ | Sprint BB futuro · só após ter 200+ skills |
| **O** | Mobile native apps (Capacitor V5 prestador / V2 condómino) | 16h | ⭐⭐⭐ | Sprint CC · só após split físico V5 |
| **P** | Trigger.dev background jobs (>150s long-running migration de schedule-run) | 4h | ⭐⭐ | Quando schedules atingem limite Supabase edge fns |
| **Q** | Cloudflare R2 storage migration (V4 facturas + V5 fotos) | 2h | ⭐⭐ | Quando Supabase Storage >50GB billing |

---

## Roadmap proposto (próximos 30 dias)

```
WEEK 1 (15-21 May)
├── Sprint P: Fixes triviais + ActiveAgentsWidget          (2h)
├── Sprint Q: Discord bridge                                (6h)
└── Sprint R: Vapi voice agent V5                           (4h)

WEEK 2 (22-28 May)
├── Sprint S: Unipile webhook WhatsApp/LinkedIn             (3h)
├── Sprint T: Onboarding Flow Builder real                  (8h)
└── Smoke test + screenshots /training docs                 (3h)

WEEK 3 (29 May-4 Jun)
├── Sprint U: Client Portal lado público                    (6h)
├── Sprint V: Reporting dashboard builder                   (6h)
└── Sprint W: Context wired aos agents                      (3h)

WEEK 4 (5-11 Jun)
├── Sprint X: AgentMail real send (Resend production)       (3h)
├── Sprint Y: OAuth bidirectional Gcal                      (4h)
├── Sprint Z: Cal.com booking                                (3h)
└── Polish + onboard Prata Owners cliente real              (8h)
```

**Total**: ~64h efectivos · 4 semanas · ~16h/semana (3h/dia × 5 dias).

**Milestone fim de Junho**:
- Property007 com Prata Owners a operar em produção
- 5 clientes adicionais convidados (3 V2 + 2 V7)
- $5K MRR inicial

---

## Bloqueadores externos identificados

| Bloqueador | Como resolver | Quando |
|---|---|---|
| **DNS records SPF/DKIM/DMARC** para `property007.pt` | Cloudflare → manual setup 10 min | Hoje (precondição Resend) |
| **API keys** (Resend, Unipile, Vapi, Browserbase) | Criar contas + adicionar Supabase secrets | Esta semana |
| **Apify subscription** ($49/mês) | Upgrade Personal plan | Quando atingir limite free |
| **Domain `portal.property007.com`** | Compra + DNS Vercel | Sprint U |
| **Stripe onboarding empresa** | Mário + contabilista | Sprint quando precisar V8/V9 |

---

## Decisões pendentes do Mário

Estas decisões bloqueiam alguns sprints — registar em ADRs ou no BRAIN-DUMP:

1. **Email outbound provider**: Resend ($20/mês) vs Postmark ($15/mês) vs Amazon SES ($1/mês mas DIY)?
2. **Email inbound provider**: Postmark Inbound ($15/mês) vs Gmail Push API (gratuito + complexo)?
3. **WhatsApp**: Unipile SaaS ($19/mês unified) vs Evolution API self-hosted (4€/mês VPS)?
4. **Voice provider**: Vapi (Twilio backend) vs OpenAI Realtime API (mais barato mas menos features)?
5. **Storage long-term**: Supabase Storage vs Cloudflare R2 ($0.015/GB · 10× mais barato)?
6. **Background jobs**: Supabase edge fns (limite 150s) vs Trigger.dev (longer + retries built-in)?

Respostas mais provavelmente recomendadas (eu Jarvis):
1. Resend (developer-first DX, melhor que Postmark)
2. Postmark Inbound (simplicidade > custo)
3. Unipile (unified API vale o premium)
4. Vapi (melhor PT-PT voice via ElevenLabs)
5. Supabase Storage até 50GB, depois migrar para R2
6. Continuar edge fns enquanto schedule-run < 150s · migrar para Trigger.dev quando crescer

---

## Como contribuir ideias

1. Abre [`BRAIN-DUMP.md`](BRAIN-DUMP.md) e escreve sem estruturar
2. Eu processo periodicamente e proponho ADRs
3. ADRs vão para `.claude/strategy/adrs/`
4. Decisões consensuais entram no roadmap (este documento)

---

**Fim do training. Volta ao [00 — INDEX](00-INDEX.md).**
