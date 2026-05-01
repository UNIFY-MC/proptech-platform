# Decision Log — PropTech Platform

> Formato: `YYYY-MM-DD | Owner | Decisão | Racional | Status`
> Scope: decisões cross-functional e estratégicas. Decisões técnicas puras → ADRs em `.claude/ADRs/`.

---

## 2026-04-30

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | CEO (Mário) |
| **Decisão** | V5 Architecture v2: Casa tab = Início+Casa fundidos; Owners Club = tab dedicada |
| **Racional** | Duplicação Início/Casa cria confusão em UX; owners precisam de um "comando central" claro. Owners Club merece tab própria para monetizar gamification. |
| **Status** | ✅ APROVADA → Sprint 1C |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | CEO + CTO |
| **Decisão** | Setup C-Suite agents (7 personas) em `.claude/agents/` para orquestração de decisões |
| **Racional** | Solo founder precisa de sounding boards especializados. Agents reduzem viés de confirmação e forçam análise multi-perspectiva antes de decisões críticas. |
| **Status** | ✅ APROVADA → Sprint A executado |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | Mário |
| **Decisão** | Brain cost discipline: cap €100/mês Anthropic API até 1º owner pagante, alerta automático aos €80 |
| **Racional** | Runway preservation — agents escalam custo se não disciplinados; sem clientes pagantes não há receita para cobrir |
| **Status** | ✅ APROVADA |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | Mário |
| **Decisão** | Receipt Trojan Horse: build directo + alpha 5 owners convidados (não smoke pre-build) |
| **Racional** | Alta convicção estratégica — build é validation real; demand-pulls-supply é core insight, não hipótese a validar com mock |
| **Status** | ✅ APROVADA → Sprint 1D |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | Mário |
| **Decisão** | ~~Sprint A em `feat/1b5a-foundations-analysis`~~ → **Sprint A em `main`** (branch already merged via `f9fea5c`) |
| **Racional** | Diagnostic descobriu branch fechada |
| **Status** | ⚠️ Superseded por entrada abaixo |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | CTO |
| **Decisão** | Sprint A commit directo em `main` + atomic commits (Sprint A separado de 1B.5A Phase 2) |
| **Racional** | Concerns diferentes (agents infra vs database schema); melhor git hygiene; revert independente possível |
| **Status** | ✅ APROVADA |

---

## 2026-05-01

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | 1B.5A Phase 2 Path A: NÃO re-aplicar SQLs (já aplicados via dashboard, IF NOT EXISTS protege mas risk > benefit) |
| **Racional** | SQLs descobertos como already-applied via Supabase MCP diagnostic — re-aplicar seria inócuo mas introduz risco desnecessário |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Pricing alignment 2.B: master plan correcto (€6.90/€12.90), DB tinha valores antigos (€9.99/€24.99). UPDATE aplicado |
| **Racional** | Master plan = source of truth para pricing estratégico; DB estava desalinhado por ter sido seedado antes da decisão de pricing final |
| **Status** | ✅ Approved & Applied |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Migration tracking gap reconhecido: SQL 1 (equipamento_extras) aplicado via Supabase dashboard sem registo em `schema_migrations` |
| **Racional** | Aceitar gap e documentar; futuro: usar sempre `apply_migration` MCP em vez de SQL editor manual |
| **Status** | ✅ Acknowledged |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CMO v3 |
| **Decisão** | Competitor monitoring 4-tier structure aprovado (25 entidades, custo ~€0.76/mês) |
| **Racional** | Context expansion via Notion analysis revelou FIXO como threat CRÍTICO (Fidelidade-owned); TaskRabbit activo em PT desde 2017; coverage completa exige 4 cadências distintas |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Lisbeyond removido de competitor scope (rentals diferente do owner maintenance) |
| **Racional** | Scope rentals/Airbnb não compete com V5 owner maintenance; future B2B partner candidate para V8 Imobiliário ou partnership rental managers |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | P0 security audit: `VITE_ANTHROPIC_API_KEY` em `App.jsx` (browser-side) viola ADR-004. Risk actual LOW (não deployed), risk futuro CRITICAL |
| **Racional** | Audit pre-Sprint B build revelou 7 referências a direct Anthropic fetch do browser em `apps/v5-manutencao/src/App.jsx`. Key value não está em git. |
| **Status** | ⚠️ TODO pre-launch — blocker para V5 production deploy |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Sprint B build aprovado: usa workspace key `ci-watchers` separada (sem `VITE_` prefix), zero overlap com `App.jsx` |
| **Racional** | `App.jsx` refactor é pre-launch concern, não bloqueia Sprint B — os watchers correm em CI server-side, não no browser |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | 7 architecture decisions Sprint B aprovadas: 3 workflows separados, healthcheck 4º, hybrid output (artifact + Issue), `ANTHROPIC_API_KEY` sem `VITE_` |
| **Racional** | Ver `.claude/strategy/sprint-b-architecture.md` — matrix não suporta crons mistos; hybrid output resolve mobile sync sem poluir git history |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Sprint B Lite COMPLETE: 3 watchers (competitor-monitor weekly, daily-brief, weekly-recap) + healthcheck activos, todos crons ON |
| **Racional** | Validated end-to-end: 4 issues criadas, outputs CMO-grade quality |
| **Status** | ✅ Done |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Token economics validated: $0.60/mês total (cap €5/mês = 8x margin) |
| **Racional** | Cost discipline preserved |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CEO via weekly-recap #8 |
| **Decisão** | "W18 must shift energy from building to recruiting 5 alpha owners" — strategic priority Sprint 1D > Sprint 1C |
| **Racional** | Platform technically strong, zero real users = validation gap dominates |
| **Status** | ⚠️ Decisão Mário pendente |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Hubbent (hubbent.com) added Tier 1 weekly competitor monitoring |
| **Racional** | Identificado em rodapé observação Mário; entrante recente PT, dual-app architecture |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CMO |
| **Decisão** | Hubbent threat=ALTO classification provisional pending W18 investigation (founders, capital, tracção) |
| **Racional** | Insufficient public data hoje, but dual-app + "maior plataforma" claim warrants Tier 1 |
| **Status** | ⚠️ Reassess W18 |

---

## 2026-05-01 (Sprint 1D debate)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CEO via debate multi-agent |
| **Decisão** | Sprint 1D charter approved: Receipt Trojan Horse Alpha owner-first 14-day MVP |
| **Racional** | Hubbent+FIXO+Jobber pressure forces validation-first; CEO weekly-recap #8 "shift energy from building to recruiting 5 alpha owners" |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | No Stripe Connect MVP iteration 1 — info/contacto flow only |
| **Racional** | KYC PT compliance 2-3 weeks dilui sprint focus; validate demand first; Stripe process initiated Day 10 para eliminar lead time para 1E |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CPO |
| **Decisão** | UX 1C-lite scope: Casa+Início merge + Receipt flow inline only |
| **Racional** | Other 1C items (Owners Club tab, weather bug) adiados — focus discipline; 8 screens definidos com reuse inventory |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Auditor |
| **Decisão** | Top 3 risks P×I: (1) Schema mismatch CPO vs CTO — tabela recibos não existe P×I=25; (2) Entrevistas Day 15-17 fora do sprint P×I=20; (3) Edge fn confirm-receipt ausente no CTO plan P×I=20 — todos resolvidos em 06-final-plan.md |
| **Racional** | Pre-mortem standard practice; CONDITIONAL GO → GO após Day 0 reconciliações |
| **Status** | ⚠️ Mitigations approved via 06-final-plan.md Decisions 1-7 |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | COO |
| **Decisão** | Alpha recruitment: 5 owners (Mário + 4 rede pessoal) + prestador outreach manual (fora-app) |
| **Racional** | Demand-pulls-supply Receipt Trojan Horse strategy; prestador real diferido para 1E por Auditor recommendation |
| **Status** | ✅ Approved |

---

## 2026-05-01 (Sprint 1D Day 0.5)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Live Dashboard HTML em `docs/dashboard/` via GitHub Pages |
| **Racional** | Auto-refresh 5min, GitHub API client-side, zero backend, mobile-friendly. Setup one-time: repo Settings → Pages → /docs |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Skip gstack full install durante Sprint 1D |
| **Racional** | Scope creep risk num sprint de 14 dias; conflito potencial com `.claude/agents/` existentes; muitos commands para apps deployed que não se aplicam |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Adoptar 2 gstack-style files: `qa-flow.md` + `review-pr.md` em `.claude/workflows/` |
| **Racional** | 80% do valor de gstack com 5% do setup overhead; checklists adaptadas ao contexto Sprint 1D (magic links, RLS, VITE_ anti-pattern) |
| **Status** | ✅ Approved |

---

## 2026-05-01 (Tese estratégica)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Tese 2-camadas clarificada: V5 owner-side + V5-pro prestador-side, magic-link como ponte |
| **Racional** | Diferenciação vs Hubbent/OSCAR (single-side marketplaces) — cada owner activo é funil de supply; aquisição prestadores custo €0 |
| **Status** | ✅ Approved |

---

## 2026-05-02 (Sprint 1D Day 2)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-02 |
| **Owner** | CTO |
| **Decisão** | RPC `create_prestador_and_recibo_atomic` deployed + 4/4 smoke tests PASS |
| **Racional** | Day 2 gate cleared, edge functions live |
| **Status** | ✅ Done |

---

## Template para novas entradas

```
---

| Campo | Valor |
|---|---|
| **Data** | YYYY-MM-DD |
| **Owner** | CEO / CFO / CTO / CMO / CPO / COO |
| **Decisão** | [Descrição clara da decisão — o que foi escolhido] |
| **Alternativas rejeitadas** | [O que foi considerado e descartado] |
| **Racional** | [Porquê esta opção] |
| **Dependências** | [O que esta decisão bloqueia ou desbloqueia] |
| **Status** | ✅ APROVADA / 🟡 PENDENTE / ❌ REJEITADA |
| **Review date** | YYYY-MM-DD (quando rever se assumo reversível) |

```
