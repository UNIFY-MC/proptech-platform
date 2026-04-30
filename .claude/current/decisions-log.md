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
