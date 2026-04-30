# .claude/ — Guia de Agentes PropTech Platform

> Sistema de C-Suite agents para orquestração de decisões estratégicas e técnicas.
> Criado: 2026-04-30 · Mantido por: Mário Carvalho

---

## Estrutura

```
.claude/
├── agents/                    ← Definições dos agentes (YAML frontmatter + persona)
│   ├── ceo-agent.md           — Orquestrador cross-functional
│   ├── cfo-agent.md           — Finance + unit economics
│   ├── cto-agent.md           — Architecture + sprint (default Claude Code)
│   ├── cmo-agent.md           — Marketing + brand + copy
│   ├── cpo-agent.md           — Product + PRDs + user research
│   ├── coo-agent.md           — Operations + RGPD + vendors
│   ├── auditor-agent.md       — Devil's advocate (invocar antes de >€10k decisions)
│   ├── architect-proptech.md  — Decisões arquitecturais Supabase/multi-vertical
│   ├── supabase-designer.md   — Schema design + migrations + RLS + edge functions
│   └── vertical-builder.md   — Scaffolding novas verticais React
├── strategy/
│   └── master-plan-snapshot.md  ← Extracto Notion Master Plan (sincronizar mensalmente)
├── current/
│   ├── q2-2026-okrs.md           ← OKRs Q2 (actualizar semanalmente)
│   ├── current-sprint.md         ← Sprint activa + stack de próximos
│   └── decisions-log.md          ← Log de decisões cross-functional
├── ADRs/                      ← Architecture Decision Records (CTO escreve)
├── reviews/                   ← Outputs de multi-agent reviews (CEO agrega)
├── outputs/
│   ├── daily-briefs/          ← Briefs diários (agente scheduled)
│   ├── weekly-recaps/         ← Recaps semanais
│   ├── competitor-watches/    ← Intel competitiva
│   ├── incidents/             ← Post-mortems
│   └── audits/                ← Auditorias Auditor agent
├── history/                   ← Histórico de sprint notes (v5-manutencao)
└── _temp/                     ← Ficheiros temporários (não commitados)
```

---

## Como Invocar Agents

### Invocação simples (single agent)

No Claude Code, pedir directamente por role:

```
@cfo-agent: valida o pricing model V5 — Free/€6.90/€12.90 — com LTV/CAC target Q2
```

```
@cpo-agent: cria PRD para Receipt Trojan Horse MVP
```

```
@auditor-agent: audita a decisão de lançar V4 Energia antes de validar 50 owners V5
```

### Invocação via Agent tool (multi-agent paralelo)

O CEO agent orquestra os outros em paralelo. Exemplo:

```
@ceo-agent: faz weekly review completa — agrega outputs CFO + CTO + CMO + CPO + COO
```

O CEO dispara Tasks paralelas para cada C-level e integra numa síntese executiva.

---

## Padrões de Orquestração

### Single agent — análise especializada

Use quando a decisão pertence claramente a um domínio:

| Cenário | Agent |
|---|---|
| Pricing, runway, unit economics | CFO |
| Architecture, ADR, sprint planning | CTO |
| Copy, posicionamento, competitive intel | CMO |
| Feature spec, PRD, UX decisions | CPO |
| RGPD, vendor, SOP, incident | COO |
| Decisão >€10k, pivot, hire | Auditor |

### Multi-agent paralelo — revisão completa

Use para weekly reviews ou decisões que cruzam domínios:

```
CEO → [CFO, CTO, CMO, CPO, COO] em paralelo → síntese CEO
```

Output guardado em `reviews/weekly-YYYY-WNN.md`.

### Sequential — com validação obrigatória

Use quando agent B precisa do output de agent A:

```
CPO → PRD
↓
CTO → implementação plan
↓
Auditor → sanity check antes de commit
```

---

## Regras de Ownership

| Ficheiro | Owner | Frequência de update |
|---|---|---|
| `strategy/master-plan-snapshot.md` | CEO | Mensal (sincronizar com Notion) |
| `current/q2-2026-okrs.md` | CEO | Semanal |
| `current/current-sprint.md` | CTO | Por sprint |
| `current/decisions-log.md` | CEO | Por decisão importante |
| `ADRs/*.md` | CTO | Por decisão arquitectural |
| `reviews/weekly-*.md` | CEO | Semanal (se aplicável) |

---

## Notion — Offices dos Agents

| Agent | Notion Office | ID |
|---|---|---|
| CEO | 👑 CEO Office | (ver master plan) |
| CFO | 💰 CFO Office | (ver master plan) |
| CTO | 🏗️ CTO Office | (ver Developer Guide) |
| CMO | 📣 CMO Office | (ver competitive analysis) |
| CPO | 🎨 CPO Office | (ver V5 roadmap) |
| COO | ⚙️ COO Office | (ver RGPD checklist) |
| Auditor | 🔍 Auditor Office | (ver decisões pendentes) |

IDs Notion canónicos em `CLAUDE.md` (root do projecto).

---

## Agents Especializados (técnicos)

Estes agents foram criados antes do C-Suite e são invocados via `Agent tool` pelo Claude Code principal:

| Agent | Quando invocar |
|---|---|
| `architect-proptech` | Antes de qualquer decisão arquitectural (naming, schemas, novas verticais) |
| `supabase-designer` | Design/modificação de schemas, migrations, RLS, edge functions |
| `vertical-builder` | Criar/expandir verticais React em `apps/vN-<nome>/` |

**Regra:** C-Suite agents → estratégia e produto. Agents técnicos → implementação.

---

## Quick Start — Primeira Vez

```bash
# 1. Verificar agents disponíveis
ls .claude/agents/

# 2. Ler estado actual
cat .claude/current/current-sprint.md

# 3. Invocar um agent (exemplo CFO)
# → Em Claude Code: "@cfo-agent: [pergunta]"

# 4. Após decisão, registar
# → Adicionar entrada em .claude/current/decisions-log.md
```
