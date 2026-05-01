# Current Sprint — PropTech Platform

> Actualizado: 2026-05-02
> Branch activa: `main`

---

## Sprint Activa: 1D — Receipt Trojan Horse Alpha

**Estado:** Day 5/5.5/5.6 ✅ shipped — "Registar trabalho" UI + equipamento dropdown + naming pivot. Day 6-7 = R2 outreach alpha owners.
**Sprint window:** 2026-05-01 → 2026-05-15 (14 dias)
**Docs:** `.claude/sprints/1D-receipt-trojan-horse/`

### Progress

| Day | Estado | Entregável |
|-----|--------|-----------|
| Day 0 | ✅ | Charter approved, reconciliações fechadas |
| Day 1 | ✅ | Schema migration applied (3 tabelas + RLS + indexes), 4/4 smoke tests |
| Day 2 | ✅ | RPC atomic + 2 edge functions deployed (gerar-magic-link, prestador-onboarding), 4/4 smoke tests |
| Day 3 | ✅ | `/r/join/:token` route + PrestadorOnboardingFlow + 6 sub-components + E2E PASS |
| Day 4 | ✅ | Trabalhos recentes secção + realtime channel + useAuth bug fix + visual PASS Mário |
| Day 5 | ✅ | UI owner-side: "Registar trabalho" + modal 3 campos + link WhatsApp + above-fold |
| Day 5.5 | ✅ | Linkagem equipamento_id — dropdown modal + edge fn v2 + card embed |
| Day 5.6 | ✅ | Naming pivot UI: "registar trabalho" (Camada 1) vs "recibo fiscal" (Camada 2) |
| Day 6 | 🔜 | R2 outreach 5 alpha owners — partilha magic link + CMO naming background |
| Day 7 | 🔜 | Gate: ≥1 owner externo aceitou; flow funciona no telefone |

### Gates

| Gate | Data | Critério GO | Estado |
|------|------|------------|--------|
| Day 3 | 2026-05-03 | Schema + 2 edge functions em produção | ✅ CLEARED (Day 2) |
| Day 7 | 2026-05-07 | ≥1 owner externo aceitou; flow funciona no telefone | 🔜 |
| Day 11 | 2026-05-11 | ≥1 flow end-to-end owner real completo | 🔜 |
| Day 14 | 2026-05-15 | 5/5 success criteria avaliados; decisão 1E | 🔜 |

---

## Sprints Recentes

| Sprint | Estado | Conteúdo |
|---|---|---|
| **1B.4 Fase 2A** | ✅ | Edge Function weather-forecast + Open-Meteo |
| **1B.4 Fase 2B** | ✅ | useWeatherForecast hook + HeroHeader + IniciaScreen + reverse geocoding |
| **1B.5A Fase 1** | ✅ | Análise foundations + decisões D1-D5 aprovadas |
| **Sprint A** | ✅ | C-Suite agents setup (7 agents + master-plan-snapshot) |
| **1B.5A Fase 2** | ✅ | SQL foundations (já aplicados via dashboard, commit `bcad675` como docs) |
| **Sprint B Lite** | ✅ | 3 watchers + healthcheck active (commits `a6909b5`...`2124d55`) |
| **Sprint 1C lite** | 🔀 | Casa+Início merge + Receipt flow inline — INCLUSO em 1D scope |

---

## Próximos Sprints (stack ordenada)

| # | Sprint | Âmbito | Prioridade |
|---|---|---|---|
| 1 | **1C** | Architecture v2 (Casa=Início+Casa, Owners Club tab) | AGORA |
| 2 | **1D** | Receipt Trojan Horse MVP (build directo + alpha 5 owners) | ALTA |
| 3 | **Fase 4** | Backoffice staff panel | MÉDIA |
| 4 | **Fase 5** | IA features (poupanças reais, score Home Intelligence) | MÉDIA |

---

## Bloqueadores Activos

| Bloqueador | Desde | Impacto | Owner |
|---|---|---|---|
| "Todos os imóveis" weather bug — Modo A aciona quando devia ser Modo B | 1B.4 | BAIXO (UX minor) | CTO — Sprint 1C |

---

## Bugs P0/P1 Abertos

Nenhum actualmente.

---

## Links rápidos

- Branch: `main`
- V5 CLAUDE.md: `apps/v5-manutencao/CLAUDE.md`
- Anti-padrões: `apps/v5-manutencao/.claude/rules/anti-patterns.md`
- Sprint notes: `apps/v5-manutencao/.claude/history/sprint-notes.md`
- Roadmap: `apps/v5-manutencao/docs/V5-Roadmap-Pos-3.5.md`
