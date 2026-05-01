# Current Sprint — PropTech Platform

> Actualizado: 2026-05-01
> Branch activa: `main`

---

## Sprint Activa: TBD — 1C ou 1D?

**Estado:** Decisão pendente Mário.

**CEO weekly-recap #8 strategic note:**
> "Platform is technically strong but has zero real users — W18 must
> shift energy from building to recruiting 5 alpha owners."

**Opção A — Sprint 1C primeiro (Architecture v2 V5):** 13-19h, melhora UX antes de
alpha test. Risk: building > validating.

**Opção B — Sprint 1D primeiro (Receipt Trojan Horse alpha):** 2-3 sem, recruta 5
alpha owners. Risk: UX actual pode ser limitação para alpha quality feedback.

**Opção C — Híbrido:** mini-1C (só fix weather bug + Casa+Início merge, ~5h) +
arrancar 1D em paralelo.

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
