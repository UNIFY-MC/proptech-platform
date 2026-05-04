---
sprint:
  id: 1D-recovery
  name: "Dashboard live + magic-link fix + prestador-app charter"
  wave: 1D-recovery
  vertical: V5
  status: active
  started: "2026-05-04"
  target: "2026-05-18"
  total_days: 14
  hypothesis: "Preparar V5 para alpha dual launch (owner + prestador): com dashboard agentic-ops 100% live, magic-link fix em produção e charter prestador-app aprovado, o sprint estabelece as fundações necessárias para outreach R2 com confiança técnica e clareza de produto"
gates:
  - day: 6
    desc: "Dashboard 100% live, source indicators, 0 hardcoded estado"
    date: "2026-05-10"
    status: done
  - day: 10
    desc: "Magic-link fix em produção, validado mobile DEV + Vercel"
    date: "2026-05-14"
    status: done
  - day: 14
    desc: "Prestador-app charter aprovado (ADR-006)"
    date: "2026-05-18"
    status: pending
days_done:
  - day: 0
    label: "Dashboard React shell deployed + parser v3.0 live + source indicators (SourceTag)"
    status: done
  - day: 0
    label: "Magic-link fix commit (fix: getBaseUrl dynamic) em Production via merge sprint/v5-1b3 → main"
    status: done
  - day: 0
    label: "Deploy protocol D1-D6 adicionado a CLAUDE.md + sprint/v5-1b3 merged → main"
    status: done
---

# Estado consolidado dos sprints
> Actualizado por architect-proptech em 2026-05-04
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
| Sprint 1D | ✅ Fechado | 2026-05-01 → 2026-05-03 | Receipt Trojan Horse Alpha — backend 100% + frontend owner-side |
| **Sprint 1D-recovery** | **ACTIVO** | **2026-05-04 → 2026-05-18** | **Dashboard live + magic-link fix + prestador-app charter** |
| Sprint 1E | Planeado | Pós 2026-05-18 | Camada 2: dashboard prestador · Stripe Connect · Moloni · schema rename `recibos_servico → trabalhos_documentados` |
| Fase 4 | Futura | TBD | Backoffice staff panel |
| Fase 5 | Futura | TBD | IA features (poupanças reais, score Home Intelligence) |

---

## Sprint actual

**Wave:** Sprint 1D-recovery — Dashboard live + magic-link fix + prestador-app charter
**Hipótese:** Com dashboard agentic-ops 100% live, magic-link fix validado em produção e charter prestador-app aprovado (ADR-006), estamos prontos para outreach R2 dual (owner + prestador) com confiança técnica e clareza de produto.
**Hard blocker:** Nenhum P0 activo.
**Próximo gate:** Day 14 (2026-05-18) — Prestador-app charter aprovado (ADR-006).

### O que foi feito

| Day | Estado | Entregável |
|-----|--------|-----------|
| Day 0 | ✅ | Dashboard React `apps/dashboard/` com parser v3.0 (gray-matter) — 100% live, source indicators (SourceTag), 0 hardcoded estado. Deploy Vercel `proptech-agentic-ops`. |
| Day 0 | ✅ | Magic-link fix: `getBaseUrl(req)` dinâmico — URL aponta para domínio real, não `localhost:5175`. Commit `fix(v5): magic-link URL builds dynamically`. |
| Day 0 | ✅ | Deploy protocol D1-D6 adicionado a `CLAUDE.md`. Sprint `sprint/v5-1b3` merged → `main` (Production). |

### O que está em curso

- **Prestador-app charter (ADR-006)** — plano detalhado para dashboard prestador-side. Pré-requisito: R2 outreach dual (owner + prestador).
- **Smoke test V5 mobile** — validar magic-link URL correcto em `proptech-v5-alpha.vercel.app` (não localhost).

### O que vem a seguir

1. **Sprint 1E** — Camada 2 prestador-side: dashboard Jobber-style · Stripe Connect KYC PT · Moloni/InvoiceXpress · rename `recibos_servico → trabalhos_documentados` · Owners Club tab dedicada (KR 2.2) · selector imóvel centralizado (KR 2.3)
2. **Fase 4** — Backoffice staff panel (prioridade MÉDIA)
3. **Fase 5** — IA features: poupanças reais, score Home Intelligence (prioridade MÉDIA)

---

## Histórico resumido

**Sprints 3.x (Pre-2026 → Abr 2026):** Construção do core da app V5 — auth, RLS, catálogo de serviços, agents de IA (image-inspector, casa-advisor), branding. Resultado: app funcional multi-tenant com 62 tabelas, RLS completo, SMTP Resend, weather forecast, 199 serviços catalogados. Detalhe: `apps/v5-manutencao/.claude/history/sprint-notes.md`

**Sprint 1B.5A + Sprint A (2026-04-29–30):** Foundations v2 — SQL migrations aplicadas, pricing final alinhado (€6.90/€12.90), inter-agent protocol estabelecido, 7 C-Suite agents configurados em `.claude/agents/`. Detalhe: `.claude/sprints/` (não tem pasta dedicada — decisões em `decisions-log.md`)

**Sprint B Lite (2026-05-01):** Automação de inteligência competitiva — 3 watchers GitHub Actions (competitor-monitor semanal, daily-brief, weekly-recap) + healthcheck. Custo validado $0.60/mês (cap €100/mês = 166x de margem). Detalhe: `.github/workflows/`

**Sprint 1D Days 0–5.7 (2026-05-01–03):** Receipt Trojan Horse executado. Backend 100% pronto (schema + 2 edge fns + RPC pública). Frontend owner-side completo (feed misto lifecycle, above-fold, realtime). Fechado sem outreach — pivot para 1D-recovery (infra + charter).

**Sprint 1D-recovery Day 0 (2026-05-04):** Dashboard agentic-ops live (React + Vite, parser v3.0, 100% LIVE), magic-link fix deployed, deploy protocol estabelecido, sprint/v5-1b3 merged → main.

---

## Decisões em aberto

| Data | Owner | Decisão pendente |
|------|-------|----------------|
| 2026-05-04 | Mário + architect-proptech | ADR-006 Prestador-app charter — scope, stack, timeline |
| Pré-launch | CTO | P0 security: `VITE_ANTHROPIC_API_KEY` em `App.jsx` (browser-side) — blocker para V5 production deploy. Mitigado (não deployed), resolve em Sprint 1E |
| TBD | Mário | Decidir sprint 1C full (Owners Club tab, weather bug fix) — diferido de 1D para 1E |
| 2026-05-02 | Mário | Rotação `SUPABASE_SERVICE_ROLE_KEY` V1 — exposed em chat. Trigger: pré-R2 outreach |

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
