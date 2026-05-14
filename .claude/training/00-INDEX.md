# Property007 Training — Index

> **Curso completo** para operar a plataforma Property007 como AI-first PropTech agency.
> **Audiência:** Mário Carvalho (founder) + futuros staff + AI agents (Bia, etc).
> **Filosofia:** sell outcomes, not tools. Encode human judgment in skills + recipes.

---

## Como usar este training

Cada documento é **executável** — não é teoria. Cada secção tem:
- 🎯 **Objectivo** (o que vais conseguir fazer)
- 📋 **Pré-requisitos** (o que precisas antes)
- 🛠 **Passos** (com links profundos para a app)
- ✅ **Verificação** (como saber que funcionou)

**Lê pela ordem** se é a primeira vez. Salta para o doc específico se já conheces o resto.

---

## Documentos

| # | Documento | O que ensina | Lê se… |
|---|---|---|---|
| **01** | [Conceito Geral](01-conceito-geral.md) | Filosofia AI-first PropTech · 4 princípios · moat = niche data + playbook · comparação CookAI | Primeira vez · queres alinhar mentalmente |
| **02** | [Flow Onboarding Cliente](02-flow-onboarding-cliente.md) | Passo-a-passo Invite → Setup → Intake → Implementation → Reporting · UI screens · personas envolvidas | Vais onboardar Prata Owners ou cliente novo |
| **03** | [Curso Operations 101](03-curso-operations-101.md) | Workflow do dia 08h-18h · Inbox · Approvals · Tasks · Recipes · Schedules · Triggers · Chat | Queres usar a plataforma diariamente |
| **04** | [Comunicação com Agents](04-comunicacao-com-agents.md) | Como falar com Bia, Diretor Marketing, etc. · Discord/Slack/WhatsApp/Email/Voice/Chat · arquitectura recomendada | Comunicação não está optimizada |
| **05** | [Integrações Prioritárias](05-integracoes-prioritarias.md) | Setup passo-a-passo: Unipile (LinkedIn+WhatsApp+IG) · Vapi (voice) · Evolution API · Wispr Flow · Playwright · Cal.com · OpenPhone · Trigger.dev · Cloudflare R2 · Replicate | Vais ligar novas tools |
| **06** | [Fluxos Não Funcionais](06-fluxos-nao-funcionais.md) | Gap analysis (10 features) + esforço/valor + schema/edge fn proposto · roadmap Sprints F-R | Decidir o que implementar a seguir |
| **B** | [BRAIN-DUMP](BRAIN-DUMP.md) | **Ficheiro aberto para Mário escrever ideias soltas** · processado periodicamente pelo Jarvis | Tens uma ideia/frustração e não queres perder |

---

## Onde mais procurar

| Para | Vai a | Comando |
|---|---|---|
| Comparação detalhada CookAI vs Property007 | [`.claude/strategy/cookai-vs-property007-comparison.md`](../strategy/cookai-vs-property007-comparison.md) | — |
| Transcrição original Serge Gattari (CookAI walkthrough) | [`.claude/strategy/research/cookai-walkthrough.md`](../strategy/research/cookai-walkthrough.md) | 3274 linhas |
| ADRs (decisões arquitecturais) | [`.claude/strategy/adrs/`](../strategy/adrs/) | — |
| Schema Supabase | dashboard.supabase.com | project `hkmvszkpxjbxmnixzqbl` |
| Estado actual sprint | [`.claude/current/current-sprint-state.md`](../current/current-sprint-state.md) | — |

---

## Glossário rápido (PT-PT)

| Termo | Significado |
|---|---|
| **Skill** | Unidade de know-how (ex: `writer`, `gmail-sender`, `verificar-mora`). Tem receita + connectors + fallback agent. |
| **Recipe** | Sequência de steps que invocam skills. Reutilizável com variáveis `{{vars}}`. |
| **Schedule** | Recipe que corre num cron (ex: todas as Segundas 9h). Autopilot. |
| **Trigger** | Recipe que dispara num evento (ex: novo lead → email follow-up). React em real time. |
| **Mission** | Instância runtime duma recipe a correr. Observable em `/tasks/:id`. |
| **AI Employee** | Agent atribuído (Bia, Diretor Marketing, etc.). Tem skills disponíveis + dept. |
| **Vertical** | V1-V10 (V2 Condomínios, V4 Energia, V5 Manutenção, …). Multi-tenant. |
| **Client** | Tenant dentro duma vertical (ex: Prata Owners é cliente V2). |
| **Connector** | Integração externa (Gmail, Meta, Vapi). Pode ser "external", "internal" ou "mcp". |
| **Useful Tool** | Tool para descoberta/avaliação. Link externo (não OAuth). |

---

**Última actualização:** 2026-05-14 · **Autor:** Jarvis (Claude Opus 4.7) for Mário Carvalho
