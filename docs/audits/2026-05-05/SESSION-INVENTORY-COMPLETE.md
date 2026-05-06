# SESSION-INVENTORY-COMPLETE · PropTech Platform · 2026-05-05

> Inventário cross-worktree das últimas 8h. Read-only · zero alterações.

---

## 1 · Worktrees mapeadas

| Caminho | Branch actual | HEAD hash | Último commit (descrição) |
|---|---|---|---|
| `C:\Users\mario\dev\proptech-platform` | `feat/command-center` | `e251b9b` | feat(bia): meta sidebar with skills, recipes, peer reads, cost |
| `C:\Users\mario\dev\proptech-v5-1b3` | `sprint/v5-1b3` | `b5ce1fb` | feat(dashboard): tab Verticais + equipa marketing + schemas v2/v3/v4 + v2 port fix |
| `C:\Users\mario\dev\proptech-v4-scaffold` | `feat/v4-energia-scaffold` | `aa7071c` | docs(claude): deploy protocol rules D1-D6 |
| `C:\Users\mario\dev\proptech-docs` | `chore/docs-sync` | `aa7071c` | docs(claude): deploy protocol rules D1-D6 |

**Remote**: `origin → https://github.com/UNIFY-MC/proptech-platform.git`

**Branches locais que NÃO existem em origin** (nunca pushed):
- `feat/command-center` — **19 commits locais**, branch inexistente em remote
- `sprint/v5-1b3` — 3 commits à frente de `origin/sprint/v5-1b3` (`b5ce1fb`, `b0cd052`, `863bc34`)

**proptech-v4-scaffold** e **proptech-docs**: sem actividade nas últimas 8h. Clean status.

---

## 2 · Trabalho das últimas 8h por worktree

### 2a · proptech-platform (`feat/command-center`)

| Categoria | Nº ficheiros | Exemplos | Tracked? |
|---|---|---|---|
| `.claude/strategy/research/` | 1 | `cookai/Gravação 2026-05-05 174633.mp4` (528 MB!) | **Untracked** |
| `docs/audits/2026-05-05/` | 9 | AUDIT-RAW, AUDIT-data, CEO-REPORT, SESSION-RECAP, etc. | **Untracked** |
| `.claude/agents/` | 3 | frontend-builder.md, code-reviewer.md, ops-builder.md | **Untracked** |
| Outras categorias | — | — | sem actividade |

**Total proptech-platform nas 8h**: 13 ficheiros · todos untracked · 1 commit (e251b9b, feito antes das 8h desta janela).

### 2b · proptech-v5-1b3 (`sprint/v5-1b3`) — PRINCIPAL

| Categoria | Nº ficheiros | Exemplos | Tracked? |
|---|---|---|---|
| `.claude/agents/` (condo) | 11 | orquestrador-condo, financeiro, atendimento, manutencao, assembleia, docs, compliance, comunicacao, importador, energia, seguros | **TRACKED ✓** (b5ce1fb) |
| `.claude/employees/` (condo) | 20 | assembleia-condo.md + .meta.json × 10 funcionários | **TRACKED ✓** (b5ce1fb) |
| `.claude/employees/` (marketing) | 10 | diretor-marketing, criativo-conteudo, gestor-ads, publisher-social, gestor-leads × .md + .meta.json | **TRACKED ✓** (b5ce1fb) |
| `.claude/strategy/adrs/` | 1 | ADR-condo-001-ai-native-architecture.md (17.4KB) | **TRACKED ✓** (b5ce1fb) |
| `.claude/strategy/` | 2 | command-centre-condo.md + sops/supabase-schema-v2-condominios.md (59.4KB) | **TRACKED ✓** (b5ce1fb) |
| `.claude/agent-memory/supabase-designer/` | 4 | project_v2_condominios_schema.md, project_v3_seguros_schema.md, project_v4_energia_schema_updated.md, feedback_plpgsql_vs_sql_language.md | **Status incerto** (não em ls-files, não em status — possível gitignore) |
| `apps/v5-manutencao/supabase/migrations/` | 3 | 20260505_v2_condominios_schema.sql (41.3KB), v3_seguros_schema.sql (13.1KB), v4_energia_schema.sql (17.4KB) | **TRACKED ✓** (b5ce1fb) |
| `apps/v2-condominios/src/` | 2 | App.jsx (68.3KB — 7 ecrãs), main.jsx | **TRACKED ✓** (b0cd052) |
| `apps/dashboard/src/components/` | 1 | Verticais.jsx (23.5KB) | **TRACKED ✓** (b5ce1fb) |
| `apps/dashboard/src/` | 1 | App.jsx (modificado para tab Verticais) | **TRACKED ✓** (b5ce1fb) |
| `apps/dashboard/public/` | 1 | data.json (96.9KB) | **RISCO: MM — staged + unstaged não-commitados** |
| `apps/dashboard/src/components/` | 1 | Agents.jsx (+329 linhas) | **RISCO: M — modificado, NÃO staged** |
| `scripts/` | 1 | dashboard-data-build.js (+14 linhas) | **RISCO: M — modificado, NÃO staged** |
| `package-lock.json` | 1 | — | **RISCO: M — modificado, NÃO staged** |

**Total proptech-v5-1b3 nas 8h**: ~70 ficheiros · a maioria TRACKED e committed · 4 ficheiros MODIFICADOS e não-commitados em risco.

### 2c · proptech-v4-scaffold + proptech-docs

Sem ficheiros modificados nas últimas 8h. Estáticos.

---

## 3 · Apps V3 (seguros) e V4 (energia) — onde estão

### V3 Seguros — React App

**NÃO EXISTE** em nenhum worktree, branch, ou commit.

Não existe `apps/v3-seguros/`, `apps/v3/`, nem nenhum directório React com esse nome em qualquer branch. O que existe é exclusivamente o schema SQL:
- `apps/v5-manutencao/supabase/migrations/20260505_v3_seguros_schema.sql` (13.1KB) — 4 tabelas: `seguradoras`, `apolices`, `sinistros`, `simulacoes` — commitado em `b5ce1fb` (sprint/v5-1b3).

**Conclusão**: V3 React app nunca foi criado. Existe apenas a infra de dados (SQL migration) e o schema no Supabase.

### V4 Energia — React App

**EXISTE PARCIALMENTE** em proptech-platform (feat/command-center), mas **não como app novo/scaffold** — como extensão do app existente.

Estado factual:
- `apps/v4-energia/` com `src/App.jsx` (existente, tracked, de commits anteriores) — está commitado
- 6 componentes UNTRACKED em proptech-platform: `Btn.jsx`, `ClienteSimulator.jsx`, `Info.jsx`, `RoleBar.jsx`, `StaffLeads.jsx`, `StepBar.jsx`
- `apps/v4-energia/src/lib/`, `src/styles/`, `src/supa.js` — todos UNTRACKED em proptech-platform
- `supabase/functions/v4-energia-lead/` — edge function já existente (commitada)

**proptech-v4-scaffold** (branch `feat/v4-energia-scaffold`): NÃO tem `apps/v4-energia/`. Tem apps/core/, apps/v1-core/, apps/v2-condominios/ (scaffold mínimo). A branch chama-se "v4-energia-scaffold" mas não tem o app V4.

**Branches que mencionam V4**: `feat/v4-energia-scaffold` (branch local, sem commits recentes), `apps/v4-energia/` está na maioria das branches como app existente.

**Conclusão**: Não há um novo scaffold React V4. Há um app V4 existente com componentes novos (untracked) em proptech-platform.

---

## 4 · Agents · Employees · Skills · ADRs criados nas 8h

### Tabela mestre

| Path | Worktree | Branch | Tracked? | Primeira linha |
|---|---|---|---|---|
| `.claude/agents/orquestrador-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Orquestrador Condo — V2 AI-Native` |
| `.claude/agents/financeiro-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Financeiro Condo` |
| `.claude/agents/atendimento-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Atendimento Condo` |
| `.claude/agents/manutencao-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Manutenção Condo` |
| `.claude/agents/assembleia-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Assembleia Condo` |
| `.claude/agents/docs-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Docs Condo` |
| `.claude/agents/compliance-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Compliance Condo` |
| `.claude/agents/comunicacao-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Comunicação Condo` |
| `.claude/agents/importador-v2.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Importador V2` |
| `.claude/agents/energia-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Energia Condo` (6.6KB) |
| `.claude/agents/seguros-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# Seguros Condo` (7.1KB) |
| `.claude/agents/frontend-builder.md` | proptech-platform | feat/command-center | **UNTRACKED** | `---\nname: frontend-builder` |
| `.claude/agents/code-reviewer.md` | proptech-platform | feat/command-center | **UNTRACKED** | `---\nname: code-reviewer` |
| `.claude/agents/ops-builder.md` | proptech-platform | feat/command-center | **UNTRACKED** | `---\nname: ops-builder` |
| `.claude/employees/orquestrador-condo.md` + .meta.json | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | Employee condo |
| `.claude/employees/[9 outros condo]` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | 10 condo employees × 2 = 20 ficheiros |
| `.claude/employees/diretor-marketing.md` + .meta.json | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | Employee marketing |
| `.claude/employees/[4 outros marketing]` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | 5 marketing employees × 2 = 10 ficheiros |
| `.claude/strategy/adrs/ADR-condo-001-ai-native-architecture.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | `# ADR-condo-001: AI-Native Architecture V2` |
| `.claude/strategy/command-centre-condo.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | Strategy document |
| `.claude/strategy/sops/supabase-schema-v2-condominios.md` | proptech-v5-1b3 | sprint/v5-1b3 | TRACKED ✓ | SOP de schema (59.4KB) |

**Skills**: `.claude/skills/design/` e `.claude/skills/design-md/` existem em proptech-platform mas são UNTRACKED e não foram criadas nas últimas 8h (timestamps anteriores).

**Total agents criados nas 8h**: 11 condo (tracked em sprint/v5-1b3) + 3 novos (untracked em feat/command-center) = **14 agents**
**Total employees criados nas 8h**: 15 (10 condo + 5 marketing), todos TRACKED em sprint/v5-1b3 = **30 ficheiros** (.md + .meta.json)

---

## 5 · Mudanças Supabase nas 8h

### Migrations criadas hoje (proptech-v5-1b3)

| Ficheiro | Tamanho | Hora | Tracked? |
|---|---|---|---|
| `apps/v5-manutencao/supabase/migrations/20260505_v2_condominios_schema.sql` | 41.3KB | 17:52 | **TRACKED ✓** |
| `apps/v5-manutencao/supabase/migrations/20260505_v3_seguros_schema.sql` | 13.1KB | 17:41 | **TRACKED ✓** |
| `apps/v5-manutencao/supabase/migrations/20260505_v4_energia_schema.sql` | 17.4KB | 17:42 | **TRACKED ✓** |
| `supabase/migrations/20260505_system_open_internal.sql` | — | — | TRACKED ✓ (em commit anterior) |

**Edge functions**: nenhuma edge function foi criada ou modificada nas últimas 8h (timestamps verificados — sem actividade em `supabase/functions/`).

**Aplicado no Supabase** (`hkmvszkpxjbxmnixzqbl`): schemas `v2_condominios`, `v3_seguros`, `v4_energia` foram aplicados via MCP durante a sessão. O SQL fonte está commitado (sprint/v5-1b3).

---

## 6 · Estado git completo por worktree

### proptech-platform (`feat/command-center`)

```
Status:
  ?? .claude/agents/code-reviewer.md
  ?? .claude/agents/frontend-builder.md
  ?? .claude/agents/ops-builder.md
  ?? .claude/skills/  (design/, design-md/)
  ?? .claude/strategy/research/
  ?? .claude/strategy/sops/
  ?? apps/core/src/components/
  ?? apps/v4-energia/reference/
  ?? apps/v4-energia/src/components/ (6 ficheiros .jsx)
  ?? apps/v4-energia/src/lib/
  ?? apps/v4-energia/src/styles/
  ?? apps/v4-energia/src/supa.js
  ?? apps/v5-manutencao/.claude/ (settings, lock)
  ?? apps/v5-manutencao/data/
  ?? apps/v5-manutencao/docs/ (3 ficheiros)
  ?? apps/v5-manutencao/reference/
  ?? docs/audits/ (9 ficheiros da audit de hoje)
  ?? test-v2.html

Staged: nenhum
Diff unstaged: nenhum (tracked files limpos)
Stash: stash@{0}: WIP on main: adf6c23 feat(v5): local app.jsx with full ServiçoPRO UI
Commits não pushed: 19 (feat/command-center NUNCA foi pushed para origin)
```

### proptech-v5-1b3 (`sprint/v5-1b3`)

```
Status:
  MM apps/dashboard/public/data.json        ← CRÍTICO: staged (parcial) + unstaged (grande)
   M apps/dashboard/src/components/Agents.jsx  ← CRÍTICO: +329 linhas, não staged
   M package-lock.json                      ← modificado, não staged
   M scripts/dashboard-data-build.js        ← +14 linhas, não staged
  ?? apps/v5-manutencao/supabase/.temp/

Staged: apps/dashboard/public/data.json (alteração parcial — 20 linhas)
Diff unstaged: 1934 inserções, 89 remoções (maioritariamente data.json e Agents.jsx)
Stash: stash@{0}: WIP on main: adf6c23 feat(v5): local app.jsx with full ServiçoPRO UI
Commits não pushed: 3 (b5ce1fb, b0cd052, 863bc34 à frente de origin/sprint/v5-1b3)
Reflog 8h: b5ce1fb (21:19), b0cd052 (anterior)
```

### proptech-v4-scaffold (`feat/v4-energia-scaffold`)

```
Status: limpo (sem modificações)
Stash: partilhado — stash@{0} WIP on main: adf6c23
Commits não pushed: 0 (branch nunca pushed, mas HEAD = aa7071c que é main-equivalent)
```

### proptech-docs (`chore/docs-sync`)

```
Status: limpo
Sem actividade
```

---

## 7 · Riscos imediatos

- **RISCO CRÍTICO — proptech-v5-1b3**: `apps/dashboard/public/data.json` tem +1678 linhas de alterações UNSTAGED. `Agents.jsx` tem +329 linhas UNSTAGED. Se a sessão fechar ou o worktree for descartado **sem commit**, estas alterações perdem-se permanentemente. São as mais volumosas e recentes.

- **RISCO ALTO — proptech-platform (untracked)**: 9 ficheiros de audit (`docs/audits/2026-05-05/`), 3 novos agents (`.claude/agents/`) e 6 componentes V4 (`apps/v4-energia/src/components/`) são untracked. Qualquer `git clean -fd` ou recriação de worktree elimina-os sem aviso.

- **RISCO MÉDIO — 19 commits não pushed (feat/command-center)**: A branch `feat/command-center` com todo o trabalho Command Center (BiaScorecard, Inbox, Approvals, auth, ADR-010) existe **apenas localmente**. Se o disco falhar ou o git repo for corrompido, estes 19 commits perdem-se.

- **RISCO MÉDIO — 3 commits não pushed (sprint/v5-1b3)**: `b5ce1fb` (Verticais + employees + agents + migrations) e `b0cd052` (V2 7-ecrãs) existem localmente e em origin, mas `863bc34` está 1 commit à frente — verificar se já está sincronizado.

- **RISCO BAIXO — stash@{0}** (WIP on main: `adf6c23`): contém alterações a CLAUDE.md, apps/v1-core/* (apagado), apps/v4-energia/App.jsx. Se o stash for dropped acidentalmente, perde-se. O commit `adf6c23` não está no log visível — pode ser de uma branch entretanto apagada.

---

## 8 · Gaps — o que a memory/SOPs diz que existe mas filesystem nega

| O que foi reportado | O que o filesystem confirma | Gap |
|---|---|---|
| "12 agentes V2" | 11 agentes condo tracked em sprint/v5-1b3 (+ importador-v2 = 11 total, não 12) | **1 agente a menos que o esperado** |
| "18+ employees" | 30 ficheiros = 15 employees (10 condo + 5 marketing) + bia.md em feat/command-center = **16 employees** (não 18+) | Gap de 2+ employees — não criados ou referenciados incorrectamente |
| "estrutura React v3-seguros" | NÃO EXISTE em nenhum worktree ou branch | **Nunca criado** — só existe SQL migration |
| "estrutura React v4-energia" | Apps/v4-energia existe (app legado) com componentes untracked em feat/command-center, mas não é "estrutura nova" | **Confusão terminológica** — é extensão do app existente, não novo scaffold |
| "skills novas" | `.claude/skills/design/` e `design-md/` existem mas são UNTRACKED e timestamps não sugerem criação hoje | **Não criadas hoje** — já existiam |
| "7 ecrãs V2 dashboard" | `apps/v2-condominios/src/App.jsx` 68.3KB confirmado em sprint/v5-1b3 commit b0cd052 | **Confirmado ✓** |
| `supabase-schema-v2-condominios.md` (59.4KB) | Tracked em sprint/v5-1b3 | **Confirmado ✓** |
| Cook.ai menu DAILY/MANAGE/BUILD | **NÃO EXISTE em nenhum commit** de apps/dashboard/src/ | **Nunca commitado** — pode ter sido planeado em sessão mas não implementado |
| `proptech-v4-scaffold` tem app V4 | Branch existe, worktree existe, mas SEM apps/v4-energia/ dentro | **Gap** — o worktree de scaffold para V4 não tem o scaffold V4 |
| agent-memory supabase-designer (4 ficheiros novos) | Ficheiros visíveis no filesystem mas NÃO em git ls-files NEM em git status | **Status incerto** — possivelmente gitignored ou em junction proptech-state |
