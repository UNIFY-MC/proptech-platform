<!-- last_updated: 2026-07-01 · owner: Mário · scope: handoff para replicação do dashboard V1 na stack do kit-arranque -->

# Handoff — Replicação fiel do V1 Dashboard na stack do kit-arranque-projetos

> **Objectivo**: replicar fielmente `apps/dashboard/` (localhost:5180) na stack do
> `kit-arranque-projetos (2026.0621)` — **Stack A: Next.js (App Router) + TypeScript +
> Tailwind v4 + Supabase + Vercel** — mantendo o mesmo backend Supabase V1 Core Hub.
>
> Este documento foi preparado numa sessão remota (Claude Code web) para ser continuado
> **localmente** no PC do Mário, onde o kit está em
> `C:\Users\mario\dev\MCdocs\SkillsNovoProjeto\kit-arranque-projetos (2026.0621)`.

---

## 1. Inventário do dashboard actual (`apps/dashboard/`)

**Stack de origem**: React 18 + Vite (JavaScript, sem TS), react-router-dom 6, zustand 4,
reactflow 11, lucide-react, react-markdown, CSS custom (sem Tailwind).

**Dimensão**: 161 ficheiros · 106 componentes/views `.jsx` · `index.css` com 2.151 linhas
(design system completo: tokens, KPI cards, badges, tabelas, sidebar, modais, light/dark).

**Rotas (~55)** definidas em `src/App.jsx` (189 linhas):

| Área | Rotas |
|---|---|
| Home/ops | `/` (Overview), `/activity`, `/roadmap`, `/multiview`, `/watchers` |
| Inbox | `/inbox` (InboxUnified), `/live-inbox` |
| Approvals | `/approvals` |
| Agentes/Employees | `/agentes`, `/employees`, `/employees/:slug`, `/employees/bia`, `/employees/bia/scorecard`, `/employees/bia/test`, `/departments`, `/departments/:slug` |
| Growth | `/growth`, `/growth/funnel`, `/growth/leads`, `/growth/oportunidades`, `/growth/rules` |
| Clients | `/clients`, `/clients/setup`, `/clients/email`, `/clients/reporting`, `/clients/:slug/flow`, `/clients/:slug/portal` |
| Skills/Recipes | `/skills`, `/skills/marketplace`, `/skills/review`, `/recipes`, `/recipes/:slug`, `/flow-templates` |
| Tarefas/agenda | `/tasks`, `/tasks/:id`, `/projects`, `/schedules`, `/triggers`, `/calendar`, `/calendar/settings` |
| Comunicação | `/chat`, `/email`, `/files`, `/context` |
| Integrações | `/integrations`, `/connections`, `/connections/discord`, `/apify-actors`, `/useful-tools`, `/influencers`, `/competitors`, `/competitors/legacy` |
| Verticais | `/verticais`, `/condominios`, `/condominios/:codigo` + embed `/embed/v2..v5` (proxy no `vite.config.js`) |

**Views**: 48 ficheiros em `src/views/`. **Hooks**: ~40 em `src/hooks/` — cada um é a
camada de dados de um domínio (useTasks, useInboxReads, useAgentsList, useApprovalActions,
useRecipes, useSkills, useCondominios, useHomeKPIs, useTriggers, useSchedules, …).

**Supabase**: `src/lib/supabase.js` com `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
(projecto **hkmvszkpxjbxmnixzqbl**, V1 Core Hub). 93 chamadas `.schema(...)`:
`system` (82) · `core` (6) · `growth` (2) + `public`. Migrations locais em
`apps/dashboard/supabase/migrations/` (bia_*, cookai catalog/seed).
Inventário completo de tabelas/RPCs consumidas: ver secção 3-A.

**Dependências internas do monorepo**: `@proptech/ui` (workspace) — `Drawer`,
`DrawerContext`, `ApprovalCard`, `EmployeeHeader`, `InboxItemCard`. Na réplica, estes
componentes devem ser **internalizados** (o kit não usa monorepo pnpm).

**Estado global**: zustand (`src/store/index.js`) + `DrawerContext`. Tema light/dark
persistido em `localStorage.v1theme` — ⚠️ na stack nova, o kit proíbe localStorage para
estado de app; tema é UI efémera/preferência, decidir se fica em cookie (SSR-safe) ou
se se aceita a excepção.

## 2. Convenções do kit a respeitar (resumo operacional)

- Next.js App Router + **TypeScript sempre**; rotas kebab-case, componentes PascalCase.
- Tailwind v4 CSS-first: **todos os tokens em `app/globals.css`** via `@theme inline`.
  Zero cor/espaçamento hardcoded, zero `style` inline, zero CSS files novos.
- **Queries só em `lib/data/<modulo>.ts`** — os ~40 hooks actuais mapeiam 1:1 para
  módulos `lib/data/` + hooks finos de UI por cima.
- Páginas (`app/(app)/<modulo>/page.tsx`) **só compõem**; lógica em `lib/`.
- Um ficheiro = uma responsabilidade; >150 linhas → dividir.
- Auth via `middleware.ts` + `app/(auth)/login/` + `app/(app)/layout.tsx` (o AuthGuard
  actual converte-se nisto).
- `design/DESIGN.md` (skill `/design-md`) como fonte de verdade visual — gerar a partir
  dos tokens do `index.css` actual (que seguem o design system do CLAUDE.md raiz:
  `--bg #f4f3f0`, `--surface`, `--blue #1a5296`, Inter + JetBrains Mono, dark mode).
- CI: `.github/workflows/ci.yml` com `tsc --noEmit` + build + audit.
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (mesmos valores dos `VITE_*` actuais).

## 3. Mapa de migração (origem → destino)

| Origem (Vite/JS) | Destino (Next/TS) |
|---|---|
| `src/App.jsx` + react-router | `app/(app)/<rota>/page.tsx` (file-based routing) |
| `src/views/*.jsx` | `app/(app)/**/page.tsx` (composição) + `components/` |
| `src/components/**` | `components/` e `components/ui/` (primitivos) |
| `src/hooks/use<X>.js` | `lib/data/<x>.ts` (queries) + hook fino se necessário |
| `src/lib/supabase.js` | `lib/supabase.ts` (template do kit) |
| `src/index.css` (2.151 linhas) | tokens → `app/globals.css` `@theme`; classes utilitárias → Tailwind nos componentes |
| `@proptech/ui` | internalizar em `components/ui/` |
| zustand store | avaliar caso a caso: UI efémera → useState/Context; partilhado → Supabase |
| Proxy `/embed/v2..v5` (vite.config) | `next.config.ts` `rewrites()` para os mesmos targets |
| `localStorage.v1theme` | cookie ou excepção documentada em `decisions/` |

## 3-A. Dados — objectivo: **schema novo no Supabase** (decisão do Mário, 2026-07-01)

A réplica **não** aponta directamente aos schemas actuais: cria-se um **schema novo**
no V1 Core Hub (`hkmvszkpxjbxmnixzqbl`) que passa a ser a fonte da app nova, com
migrations disciplinadas desde o dia 1 (`supabase migration new <slug>` + `ORDER.md`,
regra do kit). Naming das tabelas limpo dentro do schema (Opção C canónica). Nome do
schema a validar com `architect-proptech` + ADR (sugestão: `dashboard` ou `v1_dashboard`).

**Superfície de dados que o dashboard consome hoje** (o que o schema novo tem de cobrir):

- `system.*` (82 usos): `tasks`, `task_comments`, `projects`, `recipes`, `skills`,
  `schedules`, `triggers`, `clients`, `watcher_sources`, `calendar_sources`,
  `email_messages`, `email_attachments`, `draft_refinements`, `useful_tools`,
  `integrations`, `approvals_queue`, `agent_profile`, `agent_chat_messages`.
- `core.*`: `pessoas`, `organizations`, `subscricoes`, `faturas`, `agent_audit_log`.
- `growth.*`: `leads`, `oportunidades`.
- `public.*` (legado a absorver pelo schema novo): `cookai_context_docs`, `cookai_apps`,
  `cookai_app_routes`, `cookai_watcher_profiles`, `cookai_employee_skills`,
  `cookai_employee_integrations`, `system_tasks`, `system_clients`, `system_projects`,
  `system_schedules`, `system_triggers`, `system_skills_marketplace`,
  `system_my_skill_installs`, `system_chat_threads`, `system_flow_templates`,
  `system_client_flow_steps`, `system_email_messages`, `system_task_comments`,
  `system_calendar_sources`, `system_apify_runs`, `system_agent_channels`,
  `calendar_events`, `competitor_reports`, `competitor_reports_latest` (view),
  `integration_usage_latest` (view), `cron_jobs_status`, `cookai_employee_*`.
- **RPCs** usadas: `task_create/assign/update_status`, `skill_install/uninstall/activate/archive`,
  `inbox_mark_read/archive`, `chat_thread_open/archive`, `event_create/delete`,
  `client_flow_create_from_template`, `client_flow_step_update`, `agent_channel_upsert`,
  `is_staff`, `current_pessoa_id`, `current_organization_ids`, `_cron_executar_cross_sell`.
- Permissões continuam no schema **`iam`** (ADR-013) — não recriar tabelas de permissões.

**Sub-decisões em aberto**: (a) schema novo nasce vazio com tabelas novas, ou com
*views* para as tabelas actuais durante a transição (evita migrar dados já); (b) o que
fazer às tabelas `public.cookai_*`/`system_*` legadas — absorver e depreciar.

**PostgREST**: schema novo tem de ser exposto via `ALTER ROLE authenticator SET
pgrst.db_schemas = '...'` + `NOTIFY pgrst, 'reload config'` (procedimento canónico do
CLAUDE.md raiz; o Dashboard UI/Management API não propagam — ver ADR-V2-002).

## 4. Plano faseado proposto

1. **Fase 0 — Bootstrap**: `/novo-projeto` (Stack A, com auth) → estrutura + tokens no
   `globals.css` extraídos do `index.css` actual + `design/DESIGN.md` via `/design-md`
   + `showcase/page.tsx` para validar paleta/componentes contra o original.
   Inclui: criação do **schema novo** no Supabase (migration inicial + exposição
   PostgREST + `/seguranca-rls`) conforme secção 3-A, com ADR do naming.
2. **Fase 1 — Shell**: Sidebar (190px/44px), Topbar, tema light/dark, AppSwitcher,
   AuthGuard→middleware, ToastContainer, Drawer.
3. **Fase 2 — Núcleo**: Overview (Home KPIs), Inbox unificada, Approvals, Agentes/Employees (Bia).
4. **Fase 3 — Growth + Tasks**: funnel/leads/oportunidades/rules, tasks, projects, schedules, triggers.
5. **Fase 4 — Resto**: clients, skills/recipes, calendar, chat/email/files, integrações,
   verticais/condominios, embed das apps V2–V5.
6. **Cada fase**: validar visualmente lado a lado com localhost:5180 antes de avançar
   (regra do kit: não avançar de fase sem validar).

## 5. Decisões em aberto (Mário decide na sessão local)

1. **Destino**: nova pasta no monorepo (ex. `apps/dashboard-next/`) ou projecto
   standalone fora do monorepo (o kit assume projecto próprio com `create-next-app`).
   Nota: dentro do monorepo pnpm, o `create-next-app --use-npm` conflitua com o
   workspace — se for dentro, adaptar; se for standalone, é o caminho do kit puro.
2. **Âmbito da 1ª entrega**: faseado (recomendado) vs tudo de uma vez (~55 rotas).
3. **Tema**: cookie SSR-safe vs manter localStorage como excepção documentada.
4. **Embed das verticais**: manter rewrites para os dev servers 5172–5175 ou adiar.
5. **Schema novo** (secção 3-A): nome do schema + estratégia de dados
   (tabelas novas vazias vs views de transição sobre `system`/`core`/`growth`).

## 6. Como continuar localmente

```
cd C:\Users\mario\dev\proptech-platform
git fetch origin claude/v1-dashboard-replication-ohqy73
git checkout claude/v1-dashboard-replication-ohqy73
claude
```

Prompt sugerido para a sessão local:

> Lê `docs/handoff-v1-dashboard-replication.md` e o kit em
> `C:\Users\mario\dev\MCdocs\SkillsNovoProjeto\kit-arranque-projetos (2026.0621)`.
> Executa a Fase 0 do plano (bootstrap Stack A + tokens + DESIGN.md) e mostra-me o
> showcase para eu validar antes da Fase 1.
