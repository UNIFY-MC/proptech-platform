# Current Sprint — PropTech Platform

> Actualizado: 2026-04-30
> Branch activa: `main` (feat/1b5a-foundations-analysis merged via f9fea5c)

---

## Sprint Activa: 1B.5A — Foundations Phase 2

**Estado:** Em curso  
**Fase 1 (análise + decisões D1-D5):** ✅ APROVADA (commit `1b4e7da`)  
**Fase 2 (migração schema):** ⏳ A executar

### Decisões aprovadas na Fase 1

| Decisão | Conteúdo |
|---|---|
| D1 | Schema `ordens_trabalho`: normalizar campos metadata |
| D2 | Tabela `equipamentos`: adicionar campos extras (202604281530 SQL) |
| D3 | V63 isolado; V5+V2 usam latest schema |
| D4 | Planos subscrição: nova tabela `v5_manutencao.planos` (11_v5_3_3_14 SQL) |
| D5 | Arquitectura foundations confirmada (ver docs/V5-1B5A-Foundations-Plan.md) |

### SQLs pendentes de aplicar

- `sql/202604281530_v5_1b_2_3c_equipamento_extras.sql`
- `sql/11_v5_3_3_14_ux7_planos.sql`

---

## Sprints Recentes

| Sprint | Estado | Conteúdo |
|---|---|---|
| **1B.4 Fase 2A** | ✅ | Edge Function weather-forecast + Open-Meteo |
| **1B.4 Fase 2B** | ✅ | useWeatherForecast hook + HeroHeader + IniciaScreen + reverse geocoding |
| **1B.5A Fase 1** | ✅ | Análise foundations + decisões D1-D5 aprovadas |
| **Sprint A** | ✅ | C-Suite agents setup (7 agents + master-plan-snapshot) |
| **1B.5A Fase 2** | 🟡 | Migração schema (SQLs pendentes) |

---

## Próximos Sprints (stack ordenada)

| # | Sprint | Âmbito | Prioridade |
|---|---|---|---|
| 1 | **1B.5A Fase 2** | Aplicar SQLs foundations pendentes | AGORA |
| 2 | **1C** | Architecture v2 (Casa=Início+Casa, Owners Club tab) | ALTA |
| 3 | **1D** | Receipt Trojan Horse MVP (build directo + alpha 5 owners) | ALTA |
| 4 | **Fase 4** | Backoffice staff panel | MÉDIA |
| 5 | **Fase 5** | IA features (poupanças reais, score Home Intelligence) | MÉDIA |

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

- Branch: `feat/1b5a-foundations-analysis`
- V5 CLAUDE.md: `apps/v5-manutencao/CLAUDE.md`
- Anti-padrões: `apps/v5-manutencao/.claude/rules/anti-patterns.md`
- Sprint notes: `apps/v5-manutencao/.claude/history/sprint-notes.md`
- Roadmap: `apps/v5-manutencao/docs/V5-Roadmap-Pos-3.5.md`
