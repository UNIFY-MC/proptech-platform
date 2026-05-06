# AUDIT-RAW · PropTech Platform · 2026-05-05

> Ground-truth factual audit. Read-only. Gerado por CEO audit session.

---

## a) Estrutura de topo (tree -L 3)

```
proptech-platform/
├── .claude/
│   ├── ADRs/              (vazio — só .gitkeep)
│   ├── agent-memory/      (10 dirs: architect-proptech, auditor, ceo, cfo, cmo, coo, cpo, cto, supabase-designer, vertical-builder)
│   ├── agents/            (10 .md files + 1 dir "scheduled" vazio)
│   ├── current/           (ADR-005, current-sprint.md, decisions-log, next-session, q2-2026-okrs)
│   ├── employees/         (bia.md, bia.meta.json)
│   ├── history/           (vazio)
│   ├── hooks/             (session-start.ps1, subagent-stop.ps1)
│   ├── outputs/           (audits/, competitor-watches/, daily-briefs/, incidents/, weekly-recaps/)
│   ├── pending-approval/  (vazio)
│   ├── reviews/           (vazio)
│   ├── scripts/           (transcribe.py)
│   ├── skills/            (design, design-md — 2 skills)
│   ├── sprints/           (1D-receipt-trojan-horse/, README.md)
│   ├── state/             (ver secção g)
│   ├── strategy/          (adrs/, sops/, research/, + varios .md)
│   └── workflows/         (qa-flow.md, review-pr.md)
├── .github/workflows/     (5 workflows — ver secção f)
├── admin/                 (index.html + index(admin).html — PRODUÇÃO NETLIFY — NÃO TOCAR)
├── apps/
│   ├── core/              (React+Vite — scaffold legacy)
│   ├── dashboard/         (React+Vite — agentic-ops command center)
│   ├── v1-core/           (React+Vite — port do admin/index.html)
│   ├── v2-condominios/    (**NOVO** React 19 + @proptech/* — não estava em CLAUDE.md)
│   ├── v4-energia/        (React+Vite — em construção)
│   └── v5-manutencao/     (React+Vite — app principal activa)
├── docs/
│   └── dashboard/         (data.json estático, index.html legacy, README)
├── index.html             (V9 Portal cliente — NÃO TOCAR)
├── netlify.toml           (deploy config — NÃO TOCAR)
├── package.json           (workspace root — scripts: dashboard:build, dashboard:dev)
├── packages/
│   ├── auth/              (@proptech/auth v0.1.0)
│   └── db/               (@proptech/db v0.1.0)
├── scripts/
│   ├── dashboard-data-build.js
│   ├── dev-sync.js
│   └── watchers/          (competitor_monitor.py, daily_brief.py, weekly_recap.py)
├── supabase/
│   ├── functions/         (delete-account/, gerar-magic-link/, v4-energia-lead/)
│   └── migrations/        (2 ficheiros — ver secção i)
└── test-v2.html
```

**Total apps/: 6** (core, dashboard, v1-core, v2-condominios, v4-energia, v5-manutencao)
**Total packages/: 2** (auth, db)

---

## b) Sub-agents Claude Code (dev-time)

### Localização: `.claude/agents/` (raiz do repo)

| Ficheiro | name | model | notes |
|---|---|---|---|
| architect-proptech.md | architect-proptech | sonnet | memory: project |
| auditor-agent.md | auditor-agent | opus | memory: project |
| ceo-agent.md | ceo-agent | opus | memory: project |
| cfo-agent.md | cfo-agent | sonnet | memory: project |
| cmo-agent.md | cmo-agent | sonnet | memory: project |
| coo-agent.md | coo-agent | sonnet | memory: project |
| cpo-agent.md | cpo-agent | sonnet | memory: project |
| cto-agent.md | cto-agent | opus | memory: project |
| supabase-designer.md | supabase-designer | sonnet | memory: project |
| vertical-builder.md | vertical-builder | sonnet | memory: project |

`scheduled/` — vazio (sem scheduled agents definidos via .md)

### Localização: `apps/v5-manutencao/.claude/agents/`

| Dir/Ficheiro | Tipo |
|---|---|
| v5-prompts/ | Runtime agent system prompts (não sub-agents) |

### Localização: `apps/*/.claude/agents/` (outras apps)

`core`, `dashboard`, `v1-core`, `v2-condominios`, `v4-energia` — **nenhuma** tem `.claude/agents/`

### DIVERGÊNCIA CRÍTICA — agents no state vs agents disponíveis

`.claude/state/agents/` contém **29 ficheiros de estado**:
`architect-proptech`, `assembleia-condo`, `atendimento-condo`, `auditor-agent`, `ceo-agent`, `cfo-agent`, `cmo-agent`, `code-reviewer`, `compliance-condo`, `comunicacao-condo`, `coo-agent`, `cpo-agent`, `criativo-conteudo`, `cto-agent`, `diretor-marketing`, `docs-condo`, `energia-condo`, `financeiro-condo`, **`frontend-builder`**, `gestor-ads`, `gestor-leads`, `importador-v2`, `manutencao-condo`, **`notion-librarian`**, **`ops-builder`**, `orquestrador-condo`, `publisher-social`, `seguros-condo`, `supabase-designer`, `vertical-builder`

**Dos 29 state files, apenas 10 têm .md correspondente em `.claude/agents/`.**
Os restantes 19 agentes têm estado mas NÃO existem como sub-agents invocáveis:
`frontend-builder`, `ops-builder`, `notion-librarian`, `code-reviewer`, e 15 agentes de domínio (assembleia-condo, atendimento-condo, etc.)

---

## c) Runtime agent prompts

### `apps/v5-manutencao/.claude/agents/v5-prompts/`

| Ficheiro | Título | Edge Function target |
|---|---|---|
| casa_advisor.md | System Prompt: v5.casa_advisor | `supabase/functions/agent-casa-advisor` (Fase 1B — não deployed) |
| image_inspector.md | System Prompt: v5.image_inspector | `supabase/functions/agent-image-inspector/index.ts` |
| README.md | V5 Agent System Prompts (documentação) | — |

`casa_advisor` — edge function referenciada existe **apenas localmente**, não nos 3 functions deployados em `supabase/functions/`.

---

## d) Rules

Sem `.claude/rules/` em nenhum app ou raiz. Regras vivem em `CLAUDE.md` (raiz) e `apps/v5-manutencao/CLAUDE.md`.

---

## e) Skills

### `.claude/skills/` (raiz)
- `design` — skill de design
- `design-md` — skill de design (markdown?)

Sem skills em nenhum `apps/*/.claude/skills/`.

---

## f) Watchers / Cron

### GitHub Actions (`.github/workflows/`)

| Workflow | Schedule | Cadência |
|---|---|---|
| competitor-monitor.yml | `0 8 * * 1` | Segunda-feira 8h UTC (9h Lisboa verão) |
| daily-brief.yml | `0 8 * * *` | Diário 8h UTC (9h Lisboa) |
| healthcheck.yml | `0 8 * * *` | Diário 8h UTC |
| weekly-recap.yml | `0 16 * * 5` | Sexta 16h UTC (17h Lisboa) |
| deploy.yml | trigger push only | sem schedule |

**4 cron activos** em GitHub Actions.

### Scripts Python (`scripts/watchers/`)
- `competitor_monitor.py` — invocado pelo GH Action
- `daily_brief.py` — invocado pelo GH Action
- `weekly_recap.py` — invocado pelo GH Action

### Supabase Cron (pg_cron)
ADR-condo-001 refere 9 schedules planeados — mas estado actual das tabelas Supabase não auditado aqui (requer acesso MCP para confirmar se pg_cron foi aplicado).

---

## g) Apps inventário

| App | name (package.json) | version | Porta | Scripts extras |
|---|---|---|---|---|
| apps/core/ | core | 0.0.0 | ? | dev, build, lint, preview |
| apps/dashboard/ | @proptech/dashboard | 0.1.0 | ? | dev, build, preview |
| apps/v1-core/ | v1-core | 0.0.0 | ? | dev, build, lint, preview |
| apps/v2-condominios/ | v2-condominios | 0.1.0 | 5176 | dev, build, preview |
| apps/v4-energia/ | v4-energia | 0.1.0 | ? | dev, build, preview |
| apps/v5-manutencao/ | v5-manutencao | 0.1.0 | ? | dev, build, preview, seed:cp, seed:cp:force |

**ANOMALIA**: `apps/core/` e `apps/v1-core/` coexistem. O CLAUDE.md menciona apenas `apps/v1-core/`. `apps/core/` parece duplicado ou scaffold não documentado.

**ANOMALIA CRÍTICA**: `apps/v2-condominios/` existe mas NÃO estava documentado no CLAUDE.md. Usa **React 19** (não 18), consome `@proptech/auth` e `@proptech/db`, porta 5176. É um rebuild novo da V2 que não foi referenciado em nenhuma decisão registada.

**Apps referenciadas no CLAUDE.md mas não existentes**:
- Nenhuma — as 6 existentes cobrem o documentado (V1-V5 + dashboard). V3 Seguros e restantes ainda por criar.

---

## h) Packages workspace

| Package | name | version | Consumido por |
|---|---|---|---|
| packages/auth/ | @proptech/auth | 0.1.0 | apps/v2-condominios/, apps/dashboard/ |
| packages/db/ | @proptech/db | 0.1.0 | apps/v2-condominios/, apps/dashboard/ |

Workspace root `package.json` define `workspaces: ['apps/*', 'packages/*']` com scripts `dashboard:build` e `dashboard:dev`.

`apps/v5-manutencao/` e `apps/v4-energia/` **não consomem** `@proptech/*` — cada um tem a sua própria integração Supabase directa.

---

## i) Supabase

### Root `supabase/migrations/` — apenas 2 ficheiros:

| Ficheiro | Descrição |
|---|---|
| 20260504_system_grants_anon_authenticated.sql | GRANTs schema system para anon+authenticated |
| 20260505_system_open_internal.sql | RLS relaxado para uso interno (1 utilizador, Vercel-protected) |

### `apps/v5-manutencao/supabase/migrations/` — **13 ficheiros**

(ficheiros nomeados `202604xx_*` e `202605xx_*`)

Inclui: v2_condominios schema, v3_seguros schema, v4_energia schema (criados 2026-05-05 em hkmvszkpxjbxmnixzqbl).

### `apps/v5-manutencao/sql/` — **40 ficheiros**

Migrations históricas (numeradas `01_*` a `29_*`) + fixes avulso (`03c_*`, `v5_casa_*`, etc.).

**Nota arquitectural**: As migrations de V5 vivem em `apps/v5-manutencao/supabase/migrations/` e `apps/v5-manutencao/sql/`, **não** em `supabase/migrations/` (raiz). Existe separação, mas os schemas v2_condominios, v3_seguros, v4_energia foram aplicados a partir dos ficheiros de V5 — não dos ficheiros de raiz.

### `supabase/functions/` — 3 Edge Functions versionadas

| Função | Propósito |
|---|---|
| delete-account/ | Apagar conta utilizador |
| gerar-magic-link/ | Magic link auth (V5) |
| v4-energia-lead/ | Lead capture V4 Energia |

**Edge functions referenciadas em code mas NÃO versionadas aqui**:
- `agent-casa-advisor` (referenciada em v5-prompts/casa_advisor.md como Fase 1B)
- `agent-image-inspector` (referenciada em v5-prompts/image_inspector.md)

### Supabase projecto linkado

V5 `.temp/linked-project.json` → `hkmvszkpxjbxmnixzqbl` (V1 Core Hub, Paris eu-west-3).
Todos os schemas (v5_manutencao, v2_condominios, v3_seguros, v4_energia, system, core) vivem neste mesmo projecto.

### Seed files

`apps/v5-manutencao/sql/02b_v5_casa_seed_demo.sql` + `03b_v5_3_3_8_seed.sql` — seeds de demo existem.

---

## j) Git context

### Branch actual: `sprint/v5-1b3`

### Git status (inicio de sessão)
```
 M package-lock.json          ← modificado, não staged
?? apps/v5-manutencao/supabase/.temp/  ← untracked (temp dir Supabase CLI)
```

### Últimos 30 commits (oneline)
```
e251b9b feat(bia): meta sidebar with skills, recipes, peer reads, cost
e02f6f6 refactor(dashboard): BiaScorecard single-column Phase 5
926886d feat(dashboard): Bia* components (Header, Stats, Instructions, Integrations)
69969f6 feat(dashboard): useBia hooks (meta, instructions, stats)
745c445 feat(dashboard): bia.meta.json v2 + Cook.ai CSS tokens single-col
4b0951a feat(bia): cookai/hermes-style 3-column scorecard layout
4001723 feat(command-center): bia scorecard inline render
2920b48 feat(command-center): approvals real — cards + actions + edit drawer + toasts
6d4478d feat(command-center): remove auth guard for internal use
a7aafec chore(rls): relax system.* policies for internal use (1 user, vercel-protected)
1451681 feat(command-center): inbox real — cards + drawer + read state
95cc779 fix(command-center): unique realtime channel names to avoid StrictMode collision
7617bed feat(command-center): auth phase 1.5 — magic-link + AuthGuard + logout
d585fa3 feat(command-center): phase 1 UI — sidebar + routes + layout shell
e7b0875 chore(migration): formalize system schema GRANTs to anon+authenticated
34fe132 data(sprint): update to 1D-recovery + verticals live + data.json 100%
863bc34 feat(command-center): phase 1 setup (re-exec) — supabase client + zustand store + supabase hooks
18156ee feat(command-center): phase 1 setup — deps + supabase client + zustand store + router
799ef68 chore(state): regenerate dashboard state after ADR-010
9d799db docs(adr-010): command center pivot architecture (D1-D10)
d975166 chore: merge main into sprint/v5-1b3 (keep sprint versions)
aa7071c docs(claude): deploy protocol rules D1-D6
35470bb feat(dashboard): source indicators + reorder tabs
d3f9d56 feat(parser): v3.0 — 100% live sources
7653ca5 data(state): convert sprint frontmatter to nested YAML
382b063 feat(dashboard): complete agentic-ops dashboard
a33d844 feat(dashboard): React dashboard agentic-ops — apps/dashboard/
3c907cd fix(v5): construct magic-link URL from window.location.origin
8d1e0b2 chore(dashboard): restore approved static design
3e17279 chore(state): add magic-link fix entry to decisions-log
```

### Últimos 5 commits com --stat

```
e251b9b feat(bia): meta sidebar
  .claude/employees/bia.meta.json               |  24 ++--
  apps/dashboard/src/components/bia/BiaMetaSidebar.jsx | 107 lines
  apps/dashboard/src/index.css                  | 149 lines added
  apps/dashboard/src/views/BiaScorecard.jsx     |  25 lines
  4 files, 216+, 89-

e02f6f6 refactor(dashboard): BiaScorecard single-column Phase 5
  apps/dashboard/src/views/BiaScorecard.jsx     | 303 lines (23+, 280-)

926886d feat(dashboard): Bia* components
  4 files: BiaHeader, BiaInstructions, BiaIntegrations, BiaStats

69969f6 feat(dashboard): useBia hooks
  3 files: useBiaMeta, useBiaInstructions, useBiaStats

745c445 feat(dashboard): bia.meta.json v2 + Cook.ai CSS tokens
  2 files: bia.meta.json, apps/dashboard/src/index.css (524 lines adicionadas)
```

---

## Factos surpreendentes / Divergências

1. **`apps/v2-condominios/` não documentado** — existe uma V2 React sendo construída com React 19 e `@proptech/*` packages que não consta em nenhuma documentação ou ADR. Não é claro se é o futuro do V2 ou um experimento.

2. **`apps/core/` vs `apps/v1-core/`** — dois apps com nomes diferentes mas aparente propósito similar (React port do admin/index.html). Um deles é provavelmente obsoleto ou duplicado.

3. **29 agent state files, 10 agent .md files** — 19 agentes têm estado persistido mas não existem como sub-agents invocáveis. Incluindo os 3 pedidos na Fase 2 desta audit: `frontend-builder`, `ops-builder`, `code-reviewer` — nenhum tem `.md` em `.claude/agents/`.

4. **V5 tem 53 ficheiros SQL** (13 em migrations + 40 em sql/) — migração caótica entre sistemas de numeração. Nenhuma migration de root supabase/ cobre o schema v5_manutencao.

5. **ADR-010 é o único ADR versionado em git** — `.claude/strategy/adrs/` tem apenas 1 ficheiro. Todas as outras decisões (ADR-004, ADR-condo-001, etc.) existem apenas em Notion ou em triggers.md.

6. **`agent-casa-advisor` não está deployed** — o system prompt existe em v5-prompts/ mas a edge function não está no repo `supabase/functions/`. Está bloqueado em "Fase 1B".

7. **`frontend-builder`, `ops-builder`, `code-reviewer`, `notion-librarian`** referenciados na Fase 2 desta audit como sub-agents a invocar — nenhum existe como agent .md file. São apenas state files.
