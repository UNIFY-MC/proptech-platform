# Bia Code References — Audit (read-only)

**Data:** 2026-05-23
**Story:** 019.5
**Debt:** ARCH-002 (Critical), FE-007 (Medium)
**Scope:** `apps/dashboard/src/**` (jsx + js)
**Out-of-scope desta story:** rename efectivo (depende de 019.10 — `sprint/cookai3-week1` resolution + ADR-019.10 sobre estratégia)

## Resumo executivo

- **32 ficheiros** com referências a "Bia" ou "bia" (case-sensitive grep)
- **417 ocorrências totais**
- **3 views órfãs** (importam hooks inexistentes — quebram `/employees/bia` HOJE)
- **8 components em `components/bia/`** (subdirectório dedicado)
- **3 hooks `useBia*`** (existem)
- **2 hooks `useBia*` IMPORTADOS MAS NÃO EXISTENTES** (`useBiaProfile`, `useBiaIntegrations`)
- **3 rotas** em `App.jsx` (`/employees/bia`, `/employees/bia/scorecard`, `/employees/bia/test`)
- **1 ficheiro `.css`** (`index.css`, 239 ocorrências — provavelmente classes ou comentários)

## Classificação por ficheiro

### Categoria 1: **VIEWS ÓRFÃS** (críticas — quebram hoje)

| Ficheiro | Classe | Acção sugerida (019.10) |
|----------|--------|-------------------------|
| `views/BiaScorecard.jsx` | Component name | Rename → `MiaScorecard.jsx`. Importa `useBiaProfile` e `useBiaIntegrations` que **não existem** — causa 500 em `/employees/bia` hoje. |
| `views/BiaTaskLauncher.jsx` | Component name | Rename → `MiaTaskLauncher.jsx`. Depende de hooks que podem ou não existir. |
| `views/BiaPlaceholder.jsx` | Component name | Rename → `MiaPlaceholder.jsx` ou DELETAR (substituído por BiaTaskLauncher). |

### Categoria 2: **COMPONENTS NAMES (subdir `components/bia/`)** (rename futuro)

| Ficheiro | Classe | Acção sugerida (019.10) |
|----------|--------|-------------------------|
| `components/bia/BiaHeader.jsx` | Component name | Mover para `components/mia/MiaHeader.jsx` |
| `components/bia/BiaInstructions.jsx` | Component name | Mover para `components/mia/MiaInstructions.jsx` |
| `components/bia/BiaIntegrations.jsx` | Component name | Mover para `components/mia/MiaIntegrations.jsx` |
| `components/bia/BiaMetaSidebar.jsx` | Component name | Mover para `components/mia/MiaMetaSidebar.jsx` |
| `components/bia/BiaStats.jsx` | Component name | Mover para `components/mia/MiaStats.jsx` |
| `components/bia/BiaTOC.jsx` | Component name | Mover para `components/mia/MiaTOC.jsx` |
| `components/bia/TaskCard.jsx` | Component (genérico, vive em pasta bia/) | Mover para `components/mia/` (ou genérico se reusável) |
| `components/bia/TaskResultDrawer.jsx` | Component (genérico) | Mover para `components/mia/` (ou genérico se reusável) |

### Categoria 3: **HOOK NAMES** (rename futuro)

Existentes (3):

| Ficheiro | Classe | Acção sugerida (019.10) |
|----------|--------|-------------------------|
| `hooks/useBiaInstructions.js` | Hook name | Rename → `useMiaInstructions.js` |
| `hooks/useBiaMeta.js` | Hook name | Rename → `useMiaMeta.js` |
| `hooks/useBiaStats.js` | Hook name | Rename → `useMiaStats.js` |

**Em falta (mas importados — bug crítico HOJE):**

| Hook esperado | Importado em | Acção |
|---------------|--------------|-------|
| `useBiaProfile` | `views/BiaScorecard.jsx` linha 14 | Criar (com nome final `useMiaProfile`) OU remover importação. |
| `useBiaIntegrations` | `views/BiaScorecard.jsx` linha (não verificado, inferido) | Criar OU remover. |

### Categoria 4: **ROUTE PATHS** (rename futuro — App.jsx)

```javascript
// apps/dashboard/src/App.jsx linhas 129-131
<Route path="/employees/bia"            element={<BiaScorecard />} />
<Route path="/employees/bia/scorecard"  element={<BiaScorecard />} />
<Route path="/employees/bia/test"       element={<BiaTaskLauncher />} />
```

| Path actual | Path sugerido | Notas |
|-------------|---------------|-------|
| `/employees/bia` | `/employees/mia` | Adicionar redirect `/employees/bia` → `/employees/mia` para back-compat |
| `/employees/bia/scorecard` | `/employees/mia/scorecard` | Idem redirect |
| `/employees/bia/test` | `/employees/mia/test` | Idem redirect |

### Categoria 5: **REFERÊNCIAS INDIRECTAS / COMENTÁRIOS / DOCS**

(Ficheiros que mencionam "Bia" mas não declaram componentes/hooks/rotas próprios.)

| Ficheiro | Tipo de referência | Acção |
|----------|--------------------|-------|
| `App.jsx` | Imports + routes (já listadas Cat 4) | Rename em 019.10 |
| `components/Agents.jsx` | 2 ocorrências (provavelmente nome string ou comentário) | Audit em 019.10 |
| `components/ActiveAgentsWidget.jsx` | 1 ocorrência | Likely string "Bia" em UI — branding/copy |
| `components/EmployeeActivityFeed.jsx` | 1 ocorrência (comentário linha 7: "Usado em /employees/:slug e BiaScorecard.") | Comentário; actualizar quando renomear |
| `components/IntegrationDetailModal.jsx` | 1 ocorrência | Audit em 019.10 |
| `components/inbox/ExpandableInboxRow.jsx` | 1 ocorrência | Audit em 019.10 |
| `hooks/useAgentsList.js` | 1 ocorrência | Provavelmente nome "Bia" no agente; alinhar com BD em 019.10 |
| `hooks/useEmployee.js` | 7 ocorrências | Lookup table com slug "bia"; alinhar com BD |
| `views/CalendarSettingsPage.jsx` | 1 ocorrência | Audit |
| `views/ChatPage.jsx` | 7 ocorrências | Provavelmente label da página + slug |
| `views/ContextPage.jsx` | 2 ocorrências | Branding/copy |
| `views/DiscordConnectionsPage.jsx` | 2 ocorrências | Branding ou Discord bot name "Bia" |
| `views/EmailPage.jsx` | 2 ocorrências | Branding/copy |
| `views/EmployeesPage.jsx` | 1 ocorrência | Lista — alinhar com BD |
| `views/InboxUnified.jsx` | 1 ocorrência | Branding/copy |
| `views/SkillReviewPage.jsx` | 1 ocorrência | Branding/copy |
| `views/TasksPage.jsx` | 1 ocorrência | Branding/copy |
| `index.css` | 239 ocorrências | Classes CSS `.bia-*` provavelmente — rename CSS classes em 019.10 |

## Sumário por categoria

| Categoria | Count | Severidade |
|-----------|-------|------------|
| 1 - Views órfãs (quebram hoje) | 3 | **CRITICAL** — 500 em `/employees/bia` |
| 2 - Components em `components/bia/` | 8 | HIGH (rename + restructure) |
| 3 - Hooks (existentes) | 3 | HIGH (rename) |
| 3 - Hooks (importados não existem) | 2 | **CRITICAL** — fonte do 500 |
| 4 - Routes em App.jsx | 3 | HIGH (rename + redirect back-compat) |
| 5 - Refs indirectas/branding/comentários | 17 ficheiros | MEDIUM (audit case-a-case) |
| CSS classes (`index.css`) | 239 ocorrências | LOW (rename quando viável) |

## Dependência crítica

**Branch `sprint/cookai3-week1`** introduziu `BiaScorecard.jsx` referenciando hooks `useBiaProfile` e `useBiaIntegrations` que nunca foram criados. Story 019.10 (Resolve sprint branches) deve decidir:

- **Opção A** — Mergear `sprint/cookai3-week1` para `main` E criar os hooks em falta (fix-forward)
- **Opção B** — Descartar `BiaScorecard.jsx` e variantes (rollback)
- **Opção C** — Reverter para `BiaPlaceholder` (rollback parcial, manter componentes meta-data)

Esta story 019.5 NÃO toma essa decisão (out-of-scope per spawn prompt).

## NÃO fazer nesta story

Per spawn prompt:
- ❌ Rename Bia→Mia em código (out-of-scope, depende 019.10)
- ❌ DROP em Edge Functions V1
- ❌ Modificar `apps/v2-condomino-mobile/dist/` (servido hoje)
- ❌ Modificar `apps/dashboard/` (out-of-scope)

Esta story APENAS:
- ✅ Audit (read-only) e classificação dos refs
- ✅ Documentação para 019.10 ter input completo

## Carry-forward

- [ ] **HOJE** — Mário decide entre Opção A/B/C para `BiaScorecard.jsx` (fix `/employees/bia` 500)
- [ ] Story 019.10 — rename ficheiros, hooks, routes, componentes, classes CSS, branding
- [ ] Story 019.10 — adicionar redirect `/employees/bia` → `/employees/mia`
- [ ] Story 019.10 — alinhar slug "bia" vs "mia" na BD `system.agent_profile` (data-driven, NÃO hardcoded)
- [ ] Story 019.10 — verificar se Discord bot name muda de "Bia" para "Mia" (impacto Discord guild)
