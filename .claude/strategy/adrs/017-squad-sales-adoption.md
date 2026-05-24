---
id: ADR-017
title: Adopção Squad Sales (8 elite minds B2B) + rejeição OpenSquad
date: 2026-05-23
status: Accepted
deciders: [mario-carvalho, aiox-master, architect-proptech]
sprint: feat/squad-sales-install
related: [ADR-010 Command Center, ADR-011 CookAI Catalog, ADR-V11-004 CRM Attio, ADR-V11-005 Truth Engine]
implemented_in:
  - squads/sales/ (25 ficheiros, 19.054 linhas markdown)
  - (futuro) supabase/migrations/<YYYYMMDD>_seed_squad_sales.sql
  - (futuro) CLAUDE.md root entry squads/
---

# ADR-017 · Adopção Squad Sales (8 elite minds B2B) + rejeição OpenSquad

## Status

Accepted · 2026-05-23 · branch `feat/squad-sales-install` (a partir de `origin/main`).

---

## Context

### O problema

O plano Leads Machine (consolidado em sessão 2026-05-23 — combine Kyle Deals Machine + Cook.ai Serge + Attio CRM) precisa de **camada de conteúdo de vendas comprovado** para os agents `growth.lead_concierge`, `growth.ad_analyst` e cross-vertical fazerem qualify/negotiate/close de leads com qualidade.

Hoje:
- CookAI catalog (ADR-011) tem 92 skills + 49 recipes, mas skills são genéricas (não têm know-how vendas)
- Recipes futuras (qualify-and-engage, follow-up-7d, cross-sell-trigger) precisam de **prompts de qualidade** baseados em frameworks comprovados (SPIN, Gap, Sandler, Tactical Empathy)
- Sem conteúdo de vendas elite, skills como `generate-message` produzem outputs medíocres ("escreve follow-up profissional")
- Solo founder Mário não tem tempo de codificar 8 frameworks de vendas do zero

### O catalisador

Mário tem acesso a 2 fontes externas:
1. **Squad Sales** (Acervo Formações T5 SQUAD vendas, cohort AIOX Fundamentals T5 2026-05-18) — 24 ficheiros markdown, 19.054 linhas, score validação 7.9/10 PASS, criado 2026-03-30 por "Squad Architect"
2. **OpenSquad** (`github.com/renatoasse/opensquad`, 1.7k stars MIT) — framework de orquestração multi-agente Node.js 20+ Playwright

### Custos de não decidir

- Recipes Leads Machine ficam com prompts ad-hoc → qualidade inconsistente → output Hermes/Mia degradado
- Reinventar 8 frameworks de vendas (SPIN, Gap, Sandler, Tactical Empathy, Challenger, Fanatical Prospecting, Ultimate Sales Machine, Predictable Revenue) = ~6 meses de trabalho solo + leitura
- Cross-vertical sales (V2→V3→V4→V5) não escala sem padrões formais de qualify/close

---

## Decisão

### D1 · Adoptar Squad Sales como squads/sales/

**Importar** `squad-sales-main/` (24 ficheiros, ~19k linhas markdown) para `squads/sales/` no monorepo (path novo). Estrutura preservada do upstream:

```
squads/sales/
├── README.md, ARCHITECTURE.md, CHANGELOG.md (3 docs)
├── config.yaml
├── agents/ (9 files: sales-chief + Neil Rackham + Sandler + Keenan + Voss + Challenger + Jeb Blount + Chet Holmes + Aaron Ross)
├── tasks/ (9 files: diagnose-deal, qualify-prospect, create-cold-outreach, negotiate-deal, close-deal, create-followup-sequence, create-email-sequences, create-sales-copy, create-sales-scripts)
├── checklists/ (2 files: deal-qualification 14 items, discovery-quality 13 items)
└── outputs/sales/ (1 HTML presentation bonus)
```

**Localização escolhida `squads/sales/`** (não `.claude/agents/sales/`) porque:
- Coerente com `apps/` e `packages/` (top-level monorepo folders)
- Permite squads futuras (`squads/marketing/`, `squads/legal/`, etc.)
- Tracked em git como conteúdo regular
- Não interfere com `.claude/agents/aiox-*.md` que são agents Claude Code (diferente conceito)

### D2 · Squad Sales é conteúdo read-only

**NÃO editar** `squads/sales/agents/*.md` ou `squads/sales/tasks/*.md` directamente. Customizações PropTech vão em:
- `system.skills.prompt_override` (per-skill prompt override em DB)
- `system.context_docs` (extra context layer per skill)
- `apps/dashboard/src/lib/squadAdapters/` (UI customization)

Manter squad intacta permite sync futuro com upstream + comparar variantes + reverter customizações.

### D3 · Seed migration mapeia squad → CookAI catalog

**Migration futura** `supabase/migrations/<YYYYMMDD>_seed_squad_sales.sql` (não criada nesta sprint — fica como follow-up):

```sql
-- 8 elite minds + 1 orchestrator → system.agent_profile
INSERT INTO system.agent_profile (agent_id, display_name, description, model, source_squad, source_path)
VALUES
  ('sales.sales_chief',     'Sales Chief',      'Orchestrator B2B sales — routing 6 dimensões',         'claude-sonnet-4-6', 'sales', 'squads/sales/agents/sales-chief.md'),
  ('sales.neil_rackham',    'Neil Rackham',     'SPIN Selling — discovery e qualificação',              'claude-sonnet-4-6', 'sales', 'squads/sales/agents/neil-rackham.md'),
  ('sales.david_sandler',   'David Sandler',    'Sandler Submarine System — controle do processo',      'claude-sonnet-4-6', 'sales', 'squads/sales/agents/david-sandler.md'),
  ('sales.keenan',          'Keenan',           'Gap Selling — venda centrada em problema',             'claude-sonnet-4-6', 'sales', 'squads/sales/agents/keenan.md'),
  ('sales.chris_voss',      'Chris Voss',       'Tactical Empathy — negociação',                        'claude-sonnet-4-6', 'sales', 'squads/sales/agents/chris-voss.md'),
  ('sales.challenger',      'Challenger Sale',  'Teach-Tailor-Take Control',                            'claude-sonnet-4-6', 'sales', 'squads/sales/agents/challenger-sale.md'),
  ('sales.jeb_blount',      'Jeb Blount',       'Fanatical Prospecting + Sales EQ',                     'claude-sonnet-4-6', 'sales', 'squads/sales/agents/jeb-blount.md'),
  ('sales.chet_holmes',     'Chet Holmes',      'Ultimate Sales Machine + Dream 100',                   'claude-sonnet-4-6', 'sales', 'squads/sales/agents/chet-holmes.md'),
  ('sales.aaron_ross',      'Aaron Ross',       'Predictable Revenue + Cold Calling 2.0',               'claude-sonnet-4-6', 'sales', 'squads/sales/agents/aaron-ross.md');

-- 9 tasks → system.skills (category='sales')
INSERT INTO system.skills (slug, name, description, category, code_ref, status)
VALUES
  ('sales-diagnose-deal',          'Diagnose Deal',           'Diagnóstico completo do deal',                  'sales', 'squads/sales/tasks/diagnose-deal.md',           'active'),
  ('sales-qualify-prospect',       'Qualify Prospect',        'SPIN + Gap + Sandler',                          'sales', 'squads/sales/tasks/qualify-prospect.md',        'active'),
  ('sales-create-cold-outreach',   'Create Cold Outreach',    'Aaron Ross Cold Calling 2.0 + Chet Dream 100', 'sales', 'squads/sales/tasks/create-cold-outreach.md',    'active'),
  ('sales-negotiate-deal',         'Negotiate Deal',          'Chris Voss Tactical Empathy',                   'sales', 'squads/sales/tasks/negotiate-deal.md',          'active'),
  ('sales-close-deal',             'Close Deal',              'David Sandler Submarine System',                'sales', 'squads/sales/tasks/close-deal.md',              'active'),
  ('sales-create-followup',        'Create Followup Sequence','Sequências multi-estágio',                      'sales', 'squads/sales/tasks/create-followup-sequence.md','active'),
  ('sales-create-email-sequences', 'Create Email Sequences',  'Nurture, launch, cart, onboarding, upsell',     'sales', 'squads/sales/tasks/create-email-sequences.md',  'active'),
  ('sales-create-sales-copy',      'Create Sales Copy',       'Sales page, VSL, webinar, proposta, landing',   'sales', 'squads/sales/tasks/create-sales-copy.md',       'active'),
  ('sales-create-sales-scripts',   'Create Sales Scripts',    'Discovery call, demo, closing, objeções, DMs',  'sales', 'squads/sales/tasks/create-sales-scripts.md',    'active');

-- 2 checklists → system.context_docs (type='checklist', tags={'sales'})
INSERT INTO system.context_docs (employee_id, title, type, source_url, content, tags)
VALUES
  (NULL, 'Deal Qualification Checklist (14 items)',   'never_rule', 'squads/sales/checklists/deal-qualification-checklist.md',   '...', '{sales,qualification}'),
  (NULL, 'Discovery Quality Checklist (13 items)',    'never_rule', 'squads/sales/checklists/discovery-quality-checklist.md',    '...', '{sales,discovery}');
```

> NOTA: schema `system.agent_profile` precisa de colunas novas `source_squad text` e `source_path text` (migration aditiva). Pendente confirmação com supabase-designer.

### D4 · Rejeitar OpenSquad — não instalar

**OpenSquad NÃO entra no monorepo.** Razões:

1. **Compete directamente com CookAI** (ADR-011) que já tens em produção (92 skills, 49 recipes, schedules, triggers, missions, employees Bia/Mia). Instalar OpenSquad = 2 frameworks de orquestração paralelos.
2. **Contraria recomendação brownfield Phase 2A** (53 dívidas técnicas pendentes — consolidar antes de adicionar).
3. **Cognitive overhead** — Node 20 + Playwright + MCP + dashboard React extra para solo founder com 8 apps no monorepo.
4. **Sem ROI** vs CookAI v2.8.0 do Serge que já cobre Skills→Recipes→Schedule/Trigger→Employee→Mission com hooks React testados.

**Pivot útil de OpenSquad como inspiração (NÃO instalação):**
- Dashboard 2D em tempo real → adapta para `/missions` ou `/tasks` no apps/dashboard
- Skills marketplace → quando CookAI tiver >3 employees em produção
- Multi-provider → já estás a fazer (Hermes Nous para executivo)

---

## Alternativas Consideradas

### A1 · Não instalar squad-sales — codificar frameworks do zero

Rejeitada. ~6 meses de trabalho solo para reproduzir 8 frameworks de vendas. Squad Sales já tem 7.9/10 PASS validation, 19k linhas comprovadas.

### A2 · Instalar squad-sales em `.claude/agents/sales/`

Rejeitada. Confunde com agents Claude Code nativos (`.claude/agents/aiox-*.md`). Squad é conteúdo consumido pelo CookAI runtime, não agent IDE.

### A3 · Instalar OpenSquad + descartar CookAI

Rejeitada. Refactor catastrófico — migrar 92 skills + 49 recipes + system.* schema para outro formato. CookAI já tem ADRs, hooks React, edge functions, está em produção. YAGNI.

### A4 · Híbrido — instalar AMBAS as squads

Rejeitada. 2 frameworks de orquestração em paralelo = cognitive overhead + bug duplication + manutenção dupla. Escolher um.

---

## Consequências

### Positivas

- **Camada de conteúdo de vendas comprovado** sem ~6 meses de codificação
- **Recipes Leads Machine** ganham prompts de qualidade (SPIN, Gap, Sandler, Voss)
- **Cross-vertical** — frameworks aplicam-se a V2 (admins externos), V3 (renovações), V4 (switch comercializador), V5 (prestadores), V9 (parcerias B2B)
- **Reusable** — squad-sales é fonte única para skills, em vez de duplicar prompts em N recipes
- **Sync futuro** — upstream squad-sales v1.1.0 pode ser merged sem perder customizações (separadas em DB)
- **Squad pattern** estabelecido — `squads/marketing/`, `squads/legal/`, etc. podem seguir mesma estrutura

### Negativas

- **+25 ficheiros no repo** (~19k linhas markdown) — mas zero código executável, zero dependências runtime
- **Squad-sales tem source externo** — sync com upstream depende do Acervo Formações continuar a manter (mitigação: fork em GitHub privado se necessário)
- **Seed migration aditiva** ao schema `system.agent_profile` (colunas `source_squad`, `source_path`) — pendente confirmação supabase-designer
- **Customizações PT-PT** (squad é em PT-BR mistura inglês) — precisam de tradução/adaptação em `system.skills.prompt_override` (~1 dia por skill quando activada)

### Neutras

- Squad-sales tem foco B2B (saas_smb, saas_enterprise, services_consulting). Para PropTech precisa de adaptação para B2C verticais (V2/V4/V5) — mas frameworks aplicam-se (Mário é o vendedor, condóminos/owners são "buyers")

---

## Implementação

### Fase 1 (esta sprint — feat/squad-sales-install)

1. ✅ Stash da branch actual archive/feat-cleanup-bia-mia-apps-orfas-messy-2026-05-23
2. ✅ Branch nova `feat/squad-sales-install` from `origin/main`
3. ✅ Copy 25 ficheiros para `squads/sales/`
4. ✅ Criar `squads/README.md` (índice das squads no monorepo)
5. ✅ Criar este ADR-017
6. ⏳ Edit `CLAUDE.md` root — adicionar `squads/` à estrutura do repo
7. ⏳ git diff + commit (aprovação Mário)
8. ⏳ Push (delegar @devops)
9. ⏳ PR `feat/squad-sales-install` → `main`

### Fase 2 (sprint futuro)

1. Seed migration `<YYYYMMDD>_seed_squad_sales.sql` (precisa colunas `source_squad` + `source_path` em `system.agent_profile`)
2. Adapter UI em `apps/dashboard/src/lib/squadAdapters/sales.ts`
3. Recipe `qualify-and-engage` em `system.recipes` usando skills `sales.spin-discovery`, `sales.pain-funnel`, etc.
4. Tradução/adaptação PT-PT para verticais PropTech (per-skill `prompt_override`)
5. Test E2E: invocar `sales.diagnose-deal` via Discord (`@property007 corre sales-diagnose-deal para lead a3f2`) → resultado em PT-PT

---

## Validation

```bash
# 1. Confirmar 25 ficheiros copiados
find squads/sales/ -type f | wc -l
# Esperado: 25

# 2. Estrutura preservada
ls squads/sales/
# Esperado: ARCHITECTURE.md CHANGELOG.md README.md agents/ checklists/ config.yaml outputs/ tasks/

# 3. Agents (9)
ls squads/sales/agents/ | wc -l
# Esperado: 9

# 4. Tasks (9)
ls squads/sales/tasks/ | wc -l
# Esperado: 9

# 5. Checklists (2)
ls squads/sales/checklists/ | wc -l
# Esperado: 2
```

---

## References

- Squad Sales source: `G:\O meu disco\Acervo Formações\2026-05-18 - AIOX Cohort Fundamentals T5\T5 SQUAD vendas\squad-sales-main\squad-sales-main\`
- OpenSquad rejeitado: `https://github.com/renatoasse/opensquad`
- ADR-010 — Command Center Pivot (apps/dashboard agentic infra)
- ADR-011 — CookAI Catalog (system.skills, recipes, integrations)
- ADR-V11-004 — CRM Attio Multi-Workspace (core.pessoas como lead canónico)
- ADR-V11-005 — Truth Engine Swarm (discoveries cross-vertical)
- [project-mia-hermes-squad-sales memory](file:///C:/Users/mario/.claude/projects/c--Users-mario-dev-proptech-platform/memory/project_mia_hermes_squad_sales.md)

---

## Follow-ups

- [ ] Phase 2 seed migration (supabase-designer)
- [ ] Adapter UI squad-sales → CookAI catalog visualization (`/skills` page filter by `source_squad`)
- [ ] Tradução PT-PT para verticais PropTech (squad-sales é PT-BR + inglês mix)
- [ ] PR `feat/squad-sales-install` → `main` via @devops
- [ ] Trigger `notion-librarian` para sync ADR-017 com Notion "Visão & Arquitectura"
- [ ] Avaliar criação de outras squads externas (marketing, legal, copywriting) quando necessário
