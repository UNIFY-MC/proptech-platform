---
sprint:
  id: 1D
  name: "Receipt Trojan Horse Alpha"
  wave: 1D
  vertical: V5
  status: active
  started: "2026-05-01"
  target: "2026-05-15"
  total_days: 14
  hypothesis: "Owner→link→prestador 48h: se proporcionarmos a um owner PT proprietário 40-65 anos um link partilhável que dispara recibo digital + ficha mínima do prestador, então pelo menos 1 em 5 owners convidados completa o fluxo end-to-end"
gates:
  - day: 7
    desc: "≥1 owner externo aceitou convite; flow funciona no telefone"
    date: "2026-05-07"
    status: pending
  - day: 11
    desc: "≥1 end-to-end real: owner convida, prestador aceita, recibo emitido"
    date: "2026-05-11"
    status: pending
  - day: 14
    desc: "5/5 criteria OK + decisão Sprint 1E"
    date: "2026-05-15"
    status: pending
days_done:
  - day: 0
    label: "Charter aprovado · reconciliações fechadas"
    status: done
  - day: 1
    label: "Migration Sprint 1D aplicada — magic_links + prestadores_parceiros + recibos_servico"
    status: done
  - day: 2
    label: "RPC atomic + 2 Edge Functions deployed"
    status: done
  - day: 3
    label: "Route /r/join/:token + PrestadorOnboardingFlow + E2E PASS"
    status: done
  - day: 4
    label: "Trabalhos recentes owner-side + realtime"
    status: done
  - day: 5
    label: "UI Registar trabalho + modal 3 campos + WhatsApp link"
    status: done
---

# Estado consolidado dos sprints
> Auto-gerado por architect-proptech em 2026-05-02
> Source of truth: este ficheiro. Detalhe: `.claude/sprints/<wave>/`

---

## Roadmap geral

| Wave | Status | Período | Output principal |
|------|--------|---------|-----------------|
| Fase 0 | ✅ Fechado | Pre-2026 | Reset estrutural · monorepo · multi-tenant base |
| Sprint 3.3 | ✅ Fechado | Pre-2026 | UI catálogo · 199 serviços · OrçamentoWizard |
| Sprint 3.4A–3.4D | ✅ Fechado | Pre-2026 | Auth Supabase · onboarding wizard · RLS 62 tabelas · SMTP Resend |
| Sprint 3.5 | ✅ Fechado | Pre-2026 | Branding · meta SEO · empty states honestos |
| Sprint 1B.1–1B.2 | ✅ Fechado | Pre-2026 | Agent infra · image-inspector Edge Fn · Vision pipeline |
| Sprint 1B.4 Fase 2A+2B | ✅ Fechado | Abr 2026 | Weather forecast (Open-Meteo) · HeroHeader · reverse geocoding |
| Sprint 1B.5A | ✅ Fechado | 2026-04-29/30 | SQL foundations aplicados · pricing alinhado (€6.90/€12.90) |
| Sprint A | ✅ Fechado | 2026-04-30 | C-Suite agents (7 personas) em `.claude/agents/` |
| Sprint B Lite | ✅ Fechado | 2026-05-01 | 3 watchers (competitor-monitor + daily-brief + weekly-recap) + healthcheck · crons ON · custo $0.60/mês |
| Sprint 1C lite | ✅ Incluído em 1D | 2026-05-01 | Casa+Início merge + Receipt flow inline (scope absorvido pelo 1D) |
| **Sprint 1D** | **ACTIVO** | **2026-05-01 → 2026-05-15** | **Receipt Trojan Horse Alpha — owner-first 14-day MVP** |
| Sprint 1E | Planeado | Pós 2026-05-15 | Camada 2: dashboard prestador · Stripe Connect · Moloni · schema rename `recibos_servico → trabalhos_documentados` |
| Fase 4 | Futura | TBD | Backoffice staff panel |
| Fase 5 | Futura | TBD | IA features (poupanças reais, score Home Intelligence) |

---

## Sprint actual

**Wave:** Sprint 1D — Receipt Trojan Horse Alpha
**Hipótese:** "Se proporcionarmos a um owner PT proprietário 40–65 anos com 1–3 imóveis um link partilhável que dispara recibo digital + ficha mínima do prestador para ele entregar ao seu canalizador/electricista/jardineiro habitual após um serviço pago fora-app, então pelo menos 1 em 5 owners convidados completa o fluxo end-to-end."
**Hard blocker:** Nenhum P0 activo. Bug weather "Todos os imóveis" (Modo A/B) é P1 diferido para Sprint 1E.
**Próximo gate:** Day 7 (2026-05-07) — ≥1 owner externo aceitou convite; flow funciona no telefone.

### O que foi feito

| Day | Estado | Entregável |
|-----|--------|-----------|
| Day 0 | ✅ | Charter aprovado · reconciliações fechadas · `tasks/alpha-owners.md` escrito |
| Day 1 | ✅ | Migration `202605010001_v5_1d_foundations.sql` aplicada via Supabase MCP — 3 tabelas (`magic_links`, `prestadores_parceiros`, `recibos_servico`) + RLS + 10 indexes. 4/4 smoke tests PASS. |
| Day 2 | ✅ | RPC `create_prestador_and_recibo_atomic` deployed + 2 Edge Functions (`gerar-magic-link`, `prestador-onboarding`). 4/4 smoke tests PASS. |
| Day 3 | ✅ | Route `/r/join/:token` + `PrestadorOnboardingFlow` + 6 sub-components. RPC pública `get_magic_link_public_info` (SECURITY DEFINER + GRANT anon). E2E PASS browser anónimo. |
| Day 4 | ✅ | Secção "Trabalhos recentes" owner-side + realtime channel + bug fix `useAuth()`. Visual PASS Mário. |
| Day 5 | ✅ | UI "Registar trabalho" above-fold + modal 3 campos + link WhatsApp. |
| Day 5.5 | ✅ | Linkagem `equipamento_id` — dropdown no modal + edge fn v2 + card embed. |
| Day 5.6 | ✅ | Naming pivot: "registar trabalho" (Camada 1) vs "recibo fiscal" (Camada 2). |
| Day 5.7 | ✅ | Mixed feed lifecycle — pending (amber) + completed (verde) + expired (vermelho) + realtime 2 canais (INSERT em `recibos_servico` + INSERT/UPDATE em `magic_links`). Header counter dinâmico. |

### O que está em curso

- **Day 6** (próximo): R2 outreach aos 5 alpha owners — partilha de magic link pessoalmente + CMO naming background.
- **Day 7** (2026-05-07): Gate — confirmar ≥1 owner externo aceitou e o flow funciona no telefone.

### O que vem a seguir

1. **Sprint 1E** — Camada 2 prestador-side: dashboard Jobber-style · Stripe Connect KYC PT · Moloni/InvoiceXpress · rename `recibos_servico → trabalhos_documentados` · Owners Club tab dedicada (KR 2.2) · selector imóvel centralizado (KR 2.3)
2. **Fase 4** — Backoffice staff panel (prioridade MÉDIA)
3. **Fase 5** — IA features: poupanças reais, score Home Intelligence (prioridade MÉDIA)

---

## Histórico resumido

**Sprints 3.x (Pre-2026 → Abr 2026):** Construção do core da app V5 — auth, RLS, catálogo de serviços, agents de IA (image-inspector, casa-advisor), branding. Resultado: app funcional multi-tenant com 62 tabelas, RLS completo, SMTP Resend, weather forecast, 199 serviços catalogados. Detalhe: `apps/v5-manutencao/.claude/history/sprint-notes.md`

**Sprint 1B.5A + Sprint A (2026-04-29–30):** Foundations v2 — SQL migrations aplicadas, pricing final alinhado (€6.90/€12.90), inter-agent protocol estabelecido, 7 C-Suite agents configurados em `.claude/agents/`. Detalhe: `.claude/sprints/` (não tem pasta dedicada — decisões em `decisions-log.md`)

**Sprint B Lite (2026-05-01):** Automação de inteligência competitiva — 3 watchers GitHub Actions (competitor-monitor semanal, daily-brief, weekly-recap) + healthcheck. Custo validado $0.60/mês (cap €100/mês = 166x de margem). Detalhe: `.github/workflows/`

**Sprint 1D Days 0–5.7 (2026-05-01–02):** Receipt Trojan Horse em execução. Backend 100% pronto (schema + 2 edge fns + RPC pública). Frontend owner-side completo (feed misto lifecycle, above-fold, realtime). Aguarda validação com owners reais a partir de Day 6. Detalhe: `.claude/sprints/1D-receipt-trojan-horse/`

---

## Decisões em aberto

| Data | Owner | Decisão pendente |
|------|-------|----------------|
| 2026-05-01 | CEO via weekly-recap #8 | "W18 must shift energy from building to recruiting 5 alpha owners" — operacionalizado em 1D mas validação de impacto pendente (gate Day 7) |
| 2026-05-01 | CMO | Hubbent threat=ALTO classification provisional — reclassificar após W18 investigation (founders, capital, tracção) |
| Pré-launch | CTO | P0 security: `VITE_ANTHROPIC_API_KEY` em `App.jsx` (browser-side) — blocker para V5 production deploy. Mitigado até agora (não deployed), resolve em Sprint 1E |
| TBD | Mário | Decidir sprint 1C full (Owners Club tab, weather bug fix) — diferido de 1D para 1E |

---

## Como manter este ficheiro actualizado

O agente architect-proptech actualiza este ficheiro sempre que:
- Um sprint fecha (gate atingido ou wave concluída)
- Há decisão major registada no `decisions-log.md`
- O Mário pede explicitamente

Fontes canónicas para actualização:
- `.claude/current/current-sprint.md` — sprint activa e progress
- `.claude/current/decisions-log.md` — todas as decisões cross-functional
- `.claude/sprints/<wave>/00-charter.md` — hipóteses e critérios
- `.claude/sprints/<wave>/status/day-XX-closed.md` — gates fechados
