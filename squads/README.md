# Squads — Camada de conteúdo agentic do PropTech Platform

> Squads são **biblioteca de conteúdo** (markdown puro, zero dependências) para alimentar o motor agentic CookAI (`system.skills`, `system.recipes`, `system.agent_profile`).

Cada squad é um corpus self-contained de elite minds + frameworks + tasks + checklists, **importado** de fontes externas e **adaptado** ao stack PropTech via seed migrations.

## Distinção squads/ vs apps/ vs packages/

| Local | Tipo | Stack | Exemplo |
|---|---|---|---|
| `apps/*` | Aplicações executáveis (Vite, Next.js, Deno, Ink) | React, TypeScript, Deno | dashboard, v2-condominios, truth, discord-bot |
| `packages/*` | Bibliotecas partilhadas (código TypeScript) | TypeScript exports | @proptech/ui, @proptech/auth, @proptech/db |
| `squads/*` | **Conteúdo agentic** (markdown puro, sem código) | Markdown + YAML config | sales (8 elite minds B2B sales) |

## Squads instaladas

| Squad | Origem | Versão | Componentes | ADR |
|---|---|---|---|---|
| **sales** | Acervo Formações T5 SQUAD vendas (Cohort AIOX Fundamentals T5 2026-05-18) | v1.0.0 (PASS 7.9/10) | 9 agents + 9 tasks + 2 checklists + 1 HTML presentation | [ADR-017](../.claude/strategy/adrs/017-squad-sales-adoption.md) |

## Como consumir squads no PropTech

1. **system.agent_profile** — 1 row por agent (`squad_id='sales'`, `agent_id='sales.neil_rackham'`, etc.)
2. **system.skills** — 1 row por task (`category='sales'`, `code_ref='squads/sales/tasks/<task>.md'`)
3. **system.context_docs** — 1 row por checklist (`type='checklist'`, `tags={'sales'}`)
4. **CookAI Recipes** — referenciam skills da squad nos `steps[]`

Seed migration de uma squad fica em `supabase/migrations/<YYYYMMDD>_seed_squad_<name>.sql`.

## Princípio: squads são read-only

**Squads importadas mantêm-se intactas** (não editar `squads/sales/agents/*.md`).

Customizações específicas do PropTech (e.g. adaptar Neil Rackham para PT-PT condomínios) ficam em:
- `system.skills.prompt_override` (per-skill override de prompt)
- `system.context_docs` (extra context layer)
- `apps/dashboard/src/lib/squadAdapters/` (UI customization)

Manter squads intactas permite:
- Sync futuro com upstream (e.g. squad-sales v1.1.0 quando sair)
- Comparar variantes
- Reverter customizações sem perder fonte

## Como adicionar uma squad nova

1. Copy `<source>/**` → `squads/<name>/` (preservar estrutura origem)
2. Adicionar entrada na tabela "Squads instaladas" deste README
3. Criar `.claude/strategy/adrs/0XX-squad-<name>-adoption.md`
4. Criar `supabase/migrations/<YYYYMMDD>_seed_squad_<name>.sql` (seed agents + skills + context_docs)
5. Trigger `notion-librarian` para sync com Notion canónico

## Referências

- [ADR-017 Squad Sales Adoption](../.claude/strategy/adrs/017-squad-sales-adoption.md)
- [project-cookai-framework memory](file:///C:/Users/mario/.claude/projects/c--Users-mario-dev-proptech-platform/memory/project_cookai_framework.md)
- [project-mia-hermes-squad-sales memory](file:///C:/Users/mario/.claude/projects/c--Users-mario-dev-proptech-platform/memory/project_mia_hermes_squad_sales.md)
