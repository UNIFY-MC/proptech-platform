# Frontend Spec — PropTech Platform · Brownfield Discovery Phase 3

> **Data:** 2026-05-23
> **Autor:** Uma (UX Design Expert — AIOX)
> **Modo:** YOLO · inventário read-only, sem mockups
> **Baseline:** `docs/audits/2026-05-05/AUDIT-frontend.md` (vertical-builder, 2026-05-05)
> **Âmbito:** apps React/Vite + HTMLs legacy + packages partilhados.

Este documento é leitura de estado actual. Quando uma afirmação não pôde ser confirmada por inspecção directa de ficheiros, é marcada como `[unverified]`.

---

## 0. Deltas vs baseline (AUDIT 2026-05-05) — leitura obrigatória

| # | Afirmação na baseline / CLAUDE.md | Estado real em 2026-05-23 |
|---|---|---|
| 1 | "apps/core/ e apps/v1-core/ foram removidos em 2026-05-13" (CLAUDE.md) | **FALSO.** Ambas as pastas continuam em disco com `node_modules/` (a baseline listava-as como activas — confirmado: zero ficheiros src de aplicação fora de node_modules). Estado real: **directórios stub/órfãos** ainda não eliminados do filesystem mas já sem código fonte da app. Confirma a **intenção** da nota CLAUDE.md, mas o cleanup físico está incompleto. |
| 2 | "apps/v2-condominios é stub de 39 linhas" (baseline 2026-05-05) | **OBSOLETO.** App agora tem 24 ficheiros .jsx, 22 views routadas, Sidebar/Topbar separados, design system completo em `styles.css` (337+ linhas), 6 clientes Supabase (main + core + v2 + system + iam + v2-legacy), V2AuthSync sincroniza JWT cross-schema. Salto qualitativo enorme. |
| 3 | "apps/v5-manutencao usa @proptech/auth + ./lib/AuthContext em paralelo" (baseline) | **MANTÉM-SE.** package.json declara `@proptech/auth: workspace:*` mas `App.jsx:10` importa `useAuth` de `./lib/AuthContext.jsx` (local). O package workspace NÃO É USADO em runtime. Dependência declarada mas morta. |
| 4 | "Nenhuma app usa Tailwind" (baseline) | **DELTA.** `apps/truth/` (novo, port 5181) usa Tailwind 3.4.17 + PostCSS + autoprefixer. É a única app com Tailwind no monorepo. |
| 5 | "Não existe packages/ui" (implícito na baseline) | **DELTA.** `packages/ui` agora existe com 5 componentes partilhados (Drawer, DrawerContext, EmployeeHeader, InboxItemCard, ApprovalCard). Consumido por `apps/dashboard` e `apps/v2-condominios`. |
| 6 | "Apps v2 e v5 usam @proptech/auth + @proptech/db" (baseline) | **PARCIAL.** v2 usa AMBOS via clients.js. v5 declara mas NÃO usa em runtime (#3). |
| 7 | Apareceu `apps/v2-condomino-mobile/` (não na baseline) | Folder com **apenas `dist/`** — artefacto buildado isolado. Sem `package.json`, sem `src/`, sem `vite.config.js`. Apenas `index.html` + `assets/index-CSNQrCwX.js` + `index-B_iO69uY.css`. Origem do código fonte **não identificável neste monorepo** `[unverified]`. |
| 8 | "Stack: React 18 + Tailwind" (CLAUDE.md) | **CONFIRMADA DIVERGÊNCIA.** Realidade: 6 apps com React 19, 1 app (dashboard) com React 18.3.1. Tailwind apenas em truth. CLAUDE.md desactualizado em ambos. |
| 9 | "@proptech/growth-pixel" (não na baseline) | **NOVO PACKAGE.** ADR-015. Hook `useGrowthPixel({ vertical, autoPageview, autoForms })` consumido por v2-condominios. |
| 10 | v4-energia tinha "Btn, Info, StepBar, RoleBar, ClienteSimulator, StaffLeads" (baseline) | Acrescentou `LeadDetalheDrawer` e `UploadFaturaStep`. Tokens movidos para `src/styles/tokens.css` (em vez de inline em App.jsx). Aliases legacy V4 (`--primary`, `--secondary`, `--accent`, `--danger`) mantidos para compat. |

---

## 1. Inventário de apps frontend

| App | Framework / versão | Build tool | Porta dev | Deploy | Estado |
|---|---|---|---|---|---|
| `admin/index.html` + `admin/index (admin).html` | HTML monolítico vanilla (sem framework) | n/a | n/a | **Netlify** (raiz, `/admin/*` redirect SPA) | Produção viva V2 (prataowners.pt) — **NÃO TOCAR** |
| `index.html` (raiz) | HTML monolítico vanilla (V9 portal cliente) | n/a | n/a | **Netlify** (raiz) | Produção V9 — **NÃO TOCAR** |
| `apps/dashboard/` | React 18.3.1 + Vite 6.0.0 | Vite | 5180 | **Vercel** (`proptech-agentic-ops`, branch `main`) | Activo, command center interno |
| `apps/v2-condominios/` | React 19 + Vite 6.0.1 | Vite | 5172 (strictPort) | `[unverified]` (sem deploy confirmado neste repo; provavelmente Preview-only) | Em construção avançada |
| `apps/v2-condomino-mobile/` | **só artefacto** `dist/` (sem src/, sem pkg.json) | desconhecido | n/a | `[unverified]` — destino do build mobile | Artefacto órfão |
| `apps/v4-energia/` | React 19.2.4 + Vite 8.0.4 | Vite | 5174 (strictPort) | Não deployado (futuro `proptech-v4-alpha`) | Scaffold activo, simulador tarifas |
| `apps/v5-manutencao/` | React 19.0.0 + Vite 6.0.1 | Vite | 5175 (strictPort) | **Vercel** (`proptech-v5-alpha`, branch `main`) — também Netlify auto-deploy `[unverified]` | Activo, app principal |
| `apps/truth/` | React 19.2.4 + Vite 8.0.4 + **Tailwind 3.4.17** | Vite | 5181 (strictPort) | `[unverified]` | App nova `@property007/truth` — não documentada em CLAUDE.md |
| `apps/core/` | — (só `node_modules/`) | n/a | n/a | n/a | Órfão pós-cleanup |
| `apps/v1-core/` | — (só `node_modules/`) | n/a | n/a | n/a | Órfão pós-cleanup |
| `apps/cli/` | Node CLI (não frontend) | n/a | n/a | n/a | Fora de scope |
| `apps/discord-bot/` | Node bot (não frontend) | n/a | n/a | Fly.io `[unverified]` | Fora de scope |
| `apps/discord-bot-cf/` | Cloudflare Worker (não frontend) | n/a | n/a | Cloudflare | Fora de scope |

### Notas estruturais

- **3 apps em React 19** (v2, v4, v5, truth) + **1 app em React 18** (dashboard). v4 e truth em Vite 8 (pre-release/recente); restantes em Vite 6.
- **3 builders Vercel** vs **2 HTMLs Netlify** vs **1 artefacto sem origin** (`v2-condomino-mobile/dist`).
- Nomes inconsistentes: `@proptech/dashboard`, `v2-condominios` (sem prefixo `@proptech/`), `v5-manutencao` (sem prefixo), `v4-energia` (sem prefixo), `@property007/truth` (prefixo de organização diferente).

---

## 2. Design system maturity

### Onde vivem os tokens

| Sítio | Conteúdo | Estado |
|---|---|---|
| `apps/v4-energia/src/styles/tokens.css` | `--bg, --surface, --blue, --green, --gold, --red, --purple, --mono` + aliases legacy V4 (`--primary, --secondary, --accent, --danger`) | Mais limpo: ficheiro CSS separado |
| `apps/v2-condominios/src/styles.css` | Dark default + `body[data-theme='light']` override · adiciona vars **"portal gold"** (`--ink, --paper, --surface, --border, --gold, --green, --red, --blue`) para PortalCondomino. Mistura **dois sistemas** de tokens (dark/light geral + portal gold) | Inchado por duplicação |
| `apps/dashboard/src/index.css` | Conjunto próprio: `--bg #0a0e1a, --primary #534AB7, --success, --warning, --danger, --info` + light override. **Não usa o "blue/green/gold canónico" da CLAUDE.md** | Divergente do canónico CLAUDE.md |
| `apps/v5-manutencao/src/App.jsx` (constante `C = {...}`) | Paleta exclusiva (forest/emerald/cream) — verde corporate da V5 | **Não compatível com tokens das outras apps**. Filosofia diferente (forest deep, emerald) |
| `apps/v4-energia/src/App.jsx` (V4_CSS string) | Repete os tokens canónicos numa string CSS injectada — duplicação relativamente ao próprio `tokens.css` da app | Duplicação interna v4 |

### `packages/ui`

Existe (5 componentes exportados) mas **sem tokens partilhados**:

```js
// packages/ui/src/index.js
export { default as Drawer, DrawerSection } from './Drawer.jsx'
export { DrawerProvider, useDrawer } from './DrawerContext.jsx'
export { default as EmployeeHeader } from './EmployeeHeader.jsx'
export { default as InboxItemCard } from './InboxItemCard.jsx'
export { default as ApprovalCard } from './ApprovalCard.jsx'
```

`peerDependencies`: react >=18, react-dom >=18, react-router-dom >=6.

Consumidores:
- **`apps/dashboard`**: declara `@proptech/ui: workspace:*` em `dependencies`
- **`apps/v2-condominios`**: declara `@proptech/ui: workspace:*` em `dependencies` (importa `DrawerContext` em `App.jsx:4`)
- **`apps/v5-manutencao`**: NÃO declara `@proptech/ui` (apesar de ter um `PerfilDrawer` próprio que duplica funcionalidade)
- **`apps/v4-energia`**: NÃO declara `@proptech/ui`
- **`apps/truth`**: NÃO declara `@proptech/ui`

### Filosofias de styling em coexistência

| App | Abordagem | Sintoma |
|---|---|---|
| dashboard | CSS file (`index.css`) + componentes externos | Maturo |
| v2-condominios | CSS file (`styles.css`) + class names BEM-like (`.sb`, `.app-shell`, etc.) | Maturo |
| v4-energia | Tokens CSS file + grande string CSS injectada via `<style>` no App.jsx | Híbrido |
| v5-manutencao | Inline `style={...}` + constante `C={...}` no topo do App.jsx + sem CSS file | Inline-everything |
| truth | Tailwind utility classes | Outlier (única no monorepo) |

**Conclusão:** **5 design systems paralelos**, zero código partilhado de design tokens. `packages/ui` cobre só 5 componentes utilitários (drawers + cards) — não inclui tokens, primitives (Button, Input, Badge, Table), nem layout shell. Maturidade real do design system: **~10%**.

---

## 3. Componentes partilhados vs duplicados

### Multi-implementações detectadas (5+ exemplos concretos)

| Componente | Implementações | Localizações | Severidade |
|---|---|---|---|
| **LoginScreen** | 4+ versões independentes | `apps/v2-condominios/src/components/LoginScreen.jsx`, `apps/v5-manutencao/src/screens/auth/LoginScreen.jsx`, `apps/v4-energia/src/App.jsx` (embutido com `.s-login` class), `apps/dashboard/src/components/AuthGuard.jsx` | **Critical** |
| **Sidebar / nav lateral** | 3+ versões | `apps/v2-condominios/src/components/Sidebar.jsx`, `apps/dashboard/src/components/Sidebar.jsx` (+ `AppSubSidebar.jsx`, `SidebarGroup.jsx`), `apps/v5-manutencao` (embutido no App.jsx via state-based nav) | **High** |
| **Topbar** | 2 versões | `apps/v2-condominios/src/components/Topbar.jsx`, `apps/dashboard/src/components/Topbar.jsx` | High |
| **Drawer** | Mínimo 2 | `packages/ui/src/Drawer.jsx` (consumido por dashboard + v2), `apps/v5-manutencao/src/PerfilDrawer.jsx` + `DrawerMenu.jsx` (paralelo, não usa packages/ui) | High |
| **KPI Card / Stat Card** | Reimplementado em cada vertical | dashboard `Overview.jsx`, v2 `Inicio.jsx` / `PrestacaoContas.jsx`, v4 `App.jsx` (4 KPIs hardcoded), v5 `IniciaScreen.jsx` (score + poupanças cards) | High |
| **Badge / Pill** | Múltiplas variantes inline | Em todas as apps via inline styles ou class names próprias (`.b`, `.b-blue`, `.b-green` na CLAUDE.md; mas nenhuma app exporta o componente) | Medium |
| **Tabela com header mono uppercase** | 4× implementações | dashboard (vários views), v2 (`Recebimentos`, `Faturas`, `Fracoes`, etc.), v5 (admin tables), v4 (`StaffLeads`) | Medium |
| **Modal / Sheet** | Múltiplas | v5 tem `OrgLocBottomSheet`, `ImovelSelectorSheet`, `PerfilSheet`, `SmartPromptsSheet`, `EscolherImovelSheet` (5+ sheets só na v5!); dashboard tem `RecipeModal`, `SkillModal`, `IntegrationDetailModal` | Medium |
| **EmployeeHeader / InboxItemCard / ApprovalCard** | Bem extraídos — únicos componentes em `packages/ui` que servem múltiplas verticais | Sucesso da extracção. | (sucesso) |
| **Helpers PT-PT** (`eur`, `fdate`, `fdt`, `ecls`, `vcls`, `roleCls`) | Duplicados em apps órfãs (core, v1-core) e re-implementados ad-hoc nas outras | Zero centralização. v4 tem `fNum, fEur`; v5 tem `formatPreco`, v2 não tem helpers expostos | Medium |

### Componentes que **deveriam** estar em `packages/ui` (>=2 consumidores)

1. `LoginScreen` (4 versões) — primeiro candidato
2. `Sidebar` colapsável (3 versões)
3. `Topbar` (2 versões + provavelmente futura v4/v5)
4. `KPICard` (5+ versões)
5. `Badge` (universal)
6. `DataTable` (4 versões)
7. `Sheet` / `BottomSheet` (v5 sozinha tem 5)
8. `EmptyState` (v5 tem padrão "Honestidade Radical" só dele — extrair)
9. `PageHeader` (sticky com título + acções)
10. `ThemeToggle` (cada app implementa o seu — chaves `localStorage` diferentes: `v1theme`, `v2theme`, `dashboard-theme`, `theme`)

---

## 4. Routing patterns

| App | Router | Convenção de rotas | Notas |
|---|---|---|---|
| dashboard | **React Router v6.30.3** | `/`, `/employees`, `/clients`, `/growth/funnel`, `/growth/leads`, `/growth/oportunidades`, `/growth/rules`, `/condominios`, `/calendar`, `/recipes/:slug`, `/skills`, `/multi-view`, `/projects`, `/inbox`, `/files`, `/chat` | Padrão maduro. 49+ views ligadas. Redirect manual `/departments/:slug` → `?tab=departments&dept=slug`. Embed mode detectado via `window.parent !== window`. |
| v2-condominios | **React Router v6.30.3** | `/`, `/prestacao-contas`, `/dividas-2025`, `/divida-actual-2026`, `/recebimentos`, `/bancos`, `/condominos`, `/fracoes`, `/faturas`, `/mapa-receitas`, `/documentos`, `/portal-condomino`, `/automacoes`, `/permissoes`, `/energia`, `/seguros`, `/assembleias`, `/comunicacao`, `/inbox`, `/approvals`, `/chat`, `/agentes/:slug`, `/v2-legacy` | Maduro. Fallback `<Navigate to="/" replace />` para wildcard. |
| v4-energia | **State-based** (`useState` + condicional render) | n/a — tabs (`Painel` / `Simulador` / `Leads`) via `activeTab` state | Não usa React Router. URL nunca muda. |
| v5-manutencao | **State-based** (`useState('ecra'...)` + role-aware) | n/a — routing via `ecra`, `role` states no `App.jsx`. Decisão documentada em V5 CLAUDE.md: "Sem router externo — o routing é feito por state (`ecra`, `role`, etc.) dentro do `App`. Capacitor (Fase 7) usará BrowserRouter" | Justificado para mobile-first, mas anti-padrão para web. URL não shareable. |
| truth | `react-router-dom` ^6.30.1 declarado | `[unverified]` (não inspeccionada estrutura interna) | — |

**Inconsistência crítica:** 2 apps com Router, 2 apps state-based. Deep links impossíveis em v4 e v5 — sem URL para partilhar.

**Convenções:**
- v2 e dashboard usam **prefixos por área** (`/growth/*`, `/portal-condomino`) — boa prática
- v2 usa kebab-case (`/prestacao-contas`), dashboard usa camelCase em alguns sítios (`/multi-view` ok, `/calendar-settings` ok)
- IAM (`/iam/*`) declarado na missão mas **não confirmado em nenhuma app** — `[unverified]`. Permissões em v2 estão em `/permissoes` (PT). Sem `/iam` no monorepo.

---

## 5. Estado e data fetching

| App | Cliente Supabase | State manager | Data fetching | Cache |
|---|---|---|---|---|
| dashboard | `createClient` directo em `lib/supabase.js` | **Zustand** ^4.5.7 (`store/index.js` + `useAppShellStore`, `useMultiViewStore`) + custom hooks (`useData`, `useTasks`, `useClients`, `useRecipes`, etc. — 40+ hooks em `src/hooks/`) | Hooks customizados com fetch directo | Sem React Query |
| v2-condominios | **`@proptech/db` factories** (`createMainClient, createCoreClient, createV2Client, createSystemClient, createIamClient, createV2LegacyClient`) — **6 clientes Supabase** instanciados em `lib/clients.js` | Context API (`YearContext`, `DrawerContext` de `@proptech/ui`) — sem Zustand nem Redux | `V2AuthSync` sincroniza JWT entre os 6 clientes a cada mudança auth; views fazem fetch ad-hoc | Sem cache global |
| v4-energia | `createClient` directo em `App.jsx` (2 instâncias: `sb` public + `sbV4` schema `v4_energia`) | `useState` local | Fetch directo | Sem cache |
| v5-manutencao | `supa.js` (factory custom + helpers `sbGetV5`, `sbSave`) — usa `@supabase/supabase-js` directo apesar de declarar `@proptech/db` | Context API local (`ImovelAtivoContext`, `PerfisFiscaisContext`) + `useState` extensivo | Fetch ad-hoc | Sem cache |
| truth | `[unverified]` — declara `@supabase/supabase-js` directo | `[unverified]` | `[unverified]` | — |

**Inconsistências:**
- **Zero apps usam `@tanstack/react-query`** (ou SWR). 100% das apps fazem fetch manual em `useEffect`.
- v2 é a única com factories centralizadas (`@proptech/db`). v5 declara o package mas usa client próprio. v4 e dashboard usam `createClient` directo.
- v5 tem helper próprio `sbSave('tabela', dbRow, token)` que **assina pedidos com JWT manualmente** — anti-padrão se o cliente Supabase já tem sessão activa (DD anti-pattern em `.claude/rules/anti-patterns.md`).
- dashboard tem 40+ hooks custom (`useTasks`, `useClients`, `useCondominios`, etc.) — alguns potencialmente cacheáveis com React Query, mas reinventam a roda.

---

## 6. Auth integration

### `@proptech/auth` (packages/auth/src/AuthContext.jsx)

API actual:
```jsx
<AuthProvider mainClient={mainClient} coreClient={coreClient}>
  {children}
</AuthProvider>

const { session, pessoa, pessoa_id, memberships, authenticated, loading,
        needsOnboarding, isStaff, staffRoles, signOut, refreshPessoa } = useAuth()
```

**Comportamento:**
- Carrega `core.pessoas` por `auth_user_id` via `coreClient`
- Carrega `core.staff_roles` activos (define `isStaff`)
- Carrega `core.memberships` (define `needsOnboarding = !memberships.length`)
- `syncCoreClient` propaga JWT do mainClient para coreClient via `setSession`

### Consumo por app

| App | `@proptech/auth` declarado? | Importa? | Notas |
|---|---|---|---|
| dashboard | Não | Não | Usa `AuthGuard.jsx` próprio. Sem `useAuth` em react-router routes. |
| v2-condominios | **Sim (workspace:*)** | **Sim — `App.jsx:3`** | Padrão de referência. Usa `<AuthProvider mainClient={mainClient} coreClient={coreClient}>`. Adiciona `V2AuthSync` para os 4 clientes extra. |
| v4-energia | Não | Não | Usa `sb.auth.signInWithPassword` directo. Sem provider, sem context. |
| v5-manutencao | **Sim (workspace:*)** | **NÃO** — usa `./lib/AuthContext.jsx` local | Regressão silenciosa. O package está em `dependencies` mas o código importa o context local. |
| truth | `[unverified]` | `[unverified]` | — |

### Inconsistências

1. **5 implementações de auth** efectivas: dashboard (AuthGuard próprio), v2 (`@proptech/auth`), v4 (sem provider), v5 (local AuthContext), admin/index.html (HTML legacy próprio).
2. **`@proptech/auth` declarado mas não usado em v5** — risco de manutenção (duas verdades).
3. **JWT sync** apenas implementado em v2 (`V2AuthSync`). v5 usa `supaPublic` que **não partilha JWT** (Regra DD bug documentado). Outras apps não fazem multi-schema.
4. **Onboarding wizard** existe em v5 (`OnboardingWizardScreen`) mas não há equivalente noutras apps — convenção não partilhada.
5. **Demo accounts** hardcoded em v5 (`DEMO_PESSOA_ID`, `DEMO_ORGANIZATION_ID`) ainda importados em `App.jsx:6` mesmo com `@deprecated 3.4A` no comentário.

### `packages/auth` extras

`packages/auth/src/usePermission.js` — exportado em `package.json` mas não inspeccionado em uso. `[unverified]`. Provavelmente helper para verificar `iam.has_permission(section, action)` via RPC.

---

## 7. Acessibilidade & i18n

### Idioma

| App | `<html lang>` | Strings PT-PT? | Notas |
|---|---|---|---|
| admin/index.html | `[unverified]` | Sim (produção V2 prataowners.pt) | Legacy |
| dashboard | `[unverified]` (sem inspecção do index.html) | Sim — labels em PT (`Inicio`, `Watchers`, `Aprovações`) | |
| v2-condominios | `[unverified]` | Sim (PT-PT correcto: "Frações", "Recebimentos", "Permissões") | |
| v4-energia | `[unverified]` | Sim | |
| v5-manutencao | `[unverified]` (CLAUDE.md afirma PT-PT) | **Sim, com regras canónicas em V5 CLAUDE.md** ("escolha", "serviço", "morada", "técnico" — proibido PT-BR) | |
| truth | `[unverified]` | `[unverified]` | |
| v2-condomino-mobile (dist) | `lang="pt"` (confirmado no dist/index.html) | `[unverified]` | |

**Zero apps usam i18next ou react-intl.** Strings PT-PT estão hardcoded em JSX. Sem chave de tradução. Migração para multi-idioma futura seria custo alto (>40 ficheiros por app).

### ARIA / keyboard nav

Contagem rápida de atributos ARIA (`aria-*`, `role=`, `tabIndex`):

| App | Ocorrências |
|---|---|
| dashboard | 2 (apenas em `RecipesPage.jsx`) |
| v2-condominios | 1 (em `Topbar.jsx`) |
| v5-manutencao | 29 ocorrências em 9 ficheiros |
| v4-energia | `[unverified]` (não medido) |

**Conclusão:** v5 é o único com algum nível de ARIA real. Dashboard e v2 estão **quase sem suporte de acessibilidade**. Nenhuma app passa WCAG 2.1 AA `[unverified]` (sem auditoria automatizada confirmada — sem `eslint-plugin-jsx-a11y` em qualquer `package.json`).

### Dark mode persistência

| App | localStorage key | Default | Toggle |
|---|---|---|---|
| dashboard | `dashboard-theme` | `dark` | `data-theme` no body |
| v2-condominios | `v2theme` | `dark` (mas `body[data-theme='light']` é override → light secondary) | `data-theme` no body |
| v4-energia | `v1theme` (partilhada com v1-core, mas v1-core está morto) | light | `body.dark` class |
| v5-manutencao | (paleta única, sem toggle) | n/a — sempre light | n/a |
| truth | `[unverified]` | — | — |

**3 chaves diferentes para o mesmo conceito.** Sem persistência cross-app — entrar em v2-condominios e mudar para light não afecta dashboard se ambos forem embed.

### Outros checks

- **Focus indicator visível:** v2 implementa `:focus-visible` global com `outline: 2px solid var(--go)` (boa prática). Outras apps `[unverified]`.
- **Reduced motion:** Nenhuma app respeita `prefers-reduced-motion` `[unverified]`.
- **Color contrast:** `[unverified]` — não auditado neste sweep.
- **Skip-to-content link:** Não detectado em nenhuma app.

---

## 8. Dívida de UI · Top 10

Ordenado por severidade. "Esforço" é estimativa grosseira (P=Pequeno <1d, M=Médio 1-3d, G=Grande 1-2 semanas, GG=Grande+ multi-semanas).

| # | Severidade | Item | Impacto | Esforço fix |
|---|---|---|---|---|
| 1 | **CRITICAL** | **5 design systems paralelos sem código partilhado** (dashboard purple, v2 dark+gold, v4 blue/green/gold, v5 forest/emerald, truth tailwind). Tokens duplicados em 4 sítios diferentes. `packages/ui` cobre apenas 5 componentes utilitários. | Inconsistência visual cross-vertical inevitável. Mudança de marca = editar 4 ficheiros + 2 strings CSS inline. Onboarding de novos developers caótico. | GG |
| 2 | **CRITICAL** | **Auth fragmentada em 5 implementações** (dashboard AuthGuard, v2 @proptech/auth, v4 sb.auth directo, v5 local AuthContext + @proptech/auth declarado-mas-morto, admin HTML legacy). v5 declara `@proptech/auth` mas usa `./lib/AuthContext.jsx`. | Bug fixes têm que ser feitos em 5 sítios. Risco de divergência de comportamento (ex: signout que limpa state numa app mas não noutra). | G |
| 3 | **CRITICAL** | **Acessibilidade quase ausente em dashboard (2 ARIA) e v2 (1 ARIA).** Sem skip-to-content, sem `eslint-plugin-jsx-a11y` em nenhuma app, sem audit WCAG conhecido. PT-PT obrigatório mas sem `<html lang="pt-PT">` confirmado em nenhuma app. | Risco legal (LBI, AAPCD/Decreto-Lei 83/2018 acessibilidade do sector público — V2 condomínios pode estar sujeito). UX inacessível a screen readers. | G |
| 4 | **HIGH** | **Routing inconsistente: 3 apps com React Router v6, 2 apps state-based (v4, v5).** Deep links impossíveis em v5 (a app principal viva!). URL não shareable, browser back broken. | UX prejudicada. Suporte a clientes vê screenshots sem URL. Sharable links impossíveis. Capacitor (Fase 7) vai resolver em v5 mas é débito hoje. | M-G por app |
| 5 | **HIGH** | **Zero apps usam React Query / SWR.** 100% das chamadas Supabase são `useEffect + fetch + setState`. Sem cache, sem dedup, sem retry, sem stale-while-revalidate. Dashboard tem 40+ hooks custom que reinventam isto. | Performance (refetch desnecessário em cada navegação), UX (loading flashes), bugs (race conditions em fetches paralelos). | G por app |
| 6 | **HIGH** | **`apps/v2-condomino-mobile/` é artefacto órfão:** existe apenas `dist/` (HTML + 1 JS + 1 CSS bundle). Sem `src/`, sem `package.json`, sem `vite.config.js` neste repo. Código fonte de origem desconhecida. | Manutenibilidade zero. Não pode ser rebuildado a partir deste monorepo. Risco de divergência silenciosa entre dist e qualquer fonte externa. | P (decisão) + M-G (reintegração) |
| 7 | **HIGH** | **`apps/core/` e `apps/v1-core/` ainda existem em disco** apesar de CLAUDE.md declarar removal em 2026-05-13. Apenas com `node_modules/` mas confundem inventário, scripts de build, agentes que façam glob `apps/*`. | Lixo no monorepo. Ambiguidade sobre qual é o template canónico. Fingerprint do baseline ainda válido. | P (cleanup) |
| 8 | **HIGH** | **`@proptech/auth` declarado em v5-manutencao mas NÃO importado em runtime.** App importa `./lib/AuthContext.jsx` local. Manutenção fica em 2 sítios e divergência cresce. | Mudanças no AuthContext global (ex: novo claim em pessoa) não chegam à v5. Bugs subtis tipo `is_staff()` retornando valores diferentes. | M (migração v5) |
| 9 | **HIGH** | **TODOs operacionais ainda abertos da baseline 2026-05-05:** writes para tabela errada (`servicos` vs `catalogo_servicos`), `pontos_historico`/`missoes_utilizador` possivelmente inexistentes, NIF sem checkdigit, ETA hardcoded 18min em chat, FAQ hardcoded, links V2 com `alert('TODO')`, `suporte@exemplo.pt` placeholder, `app.exemplo.pt` placeholder em referral. Baseline tinha 15+ — não conta como resolvidos sem evidência. | Bugs de produção visíveis (ETA fake, NIF inválido aceite), placeholders em ecrãs de utilizador final, dados em schemas errados. | M (catalogados) |
| 10 | **MEDIUM** | **Padrões de styling em coexistência (Tailwind em truth, inline em v5, CSS-in-JS string em v4, CSS file em v2/dashboard).** Sem PostCSS plugin partilhado, sem variável `--font-mono` exportada de um sítio único (JetBrains Mono carregada 4× se todas as apps embedded). | Bundle inflado, font-flash, dificuldade onboarding. | G (decisão sobre padrão único) |

### Dívida menor (não top-10 mas registo)

- **localStorage keys de tema diferentes** (`v1theme`, `v2theme`, `dashboard-theme`) — bem-vindo unificar para `proptech-theme`.
- **Nomes inconsistentes de packages workspace** (`@proptech/*` vs `@property007/truth` vs sem-prefixo).
- **Fontes:** Inter / DM Sans / Fraunces+Outfit / `-apple-system` defaults em coexistência. v5 usa Fraunces+Outfit (decisão V5 CLAUDE.md). v2 usa DM Sans. v4/v1-core usam Inter. CLAUDE.md root declara Inter + JetBrains Mono como canónico — divergência.
- **`AppEmbed.jsx` em dashboard** sugere padrão de iframe-embedding de outras verticais — mas não há contrato/manifesto formal entre apps.
- **`v2-condominios/views/V2Legacy.jsx`** sugere ponte para a app HTML antiga — `[unverified]` se é iframe ou link.
- **5 sheets/modais só na v5** (`OrgLocBottomSheet`, `ImovelSelectorSheet`, `PerfilSheet`, `SmartPromptsSheet`, `EscolherImovelSheet`) — sem extracção para componente único parametrizável.

---

## 9. Resumo executivo (5 frases)

1. **Existem 5 apps frontend activas com 5 design systems paralelos** — `packages/ui` cobre só 5 componentes utilitários (drawer, header, cards) e zero tokens.
2. **Auth está fragmentada em 5 implementações** — `@proptech/auth` só é genuinamente consumida por v2; v5 declara-a mas usa context local.
3. **Routing é inconsistente** — dashboard e v2 com React Router maduro; v4 e v5 (a app principal viva!) usam state-based routing sem URL.
4. **Acessibilidade quase ausente** em dashboard (2 ARIA) e v2 (1 ARIA), sem `eslint-plugin-jsx-a11y` em nenhuma app, com risco legal real para V2 produção.
5. **Cleanup pós-rename incompleto:** `apps/core/` e `apps/v1-core/` ainda no disco; `apps/v2-condomino-mobile/` é artefacto órfão sem código fonte neste monorepo; `apps/truth/` apareceu e não está em CLAUDE.md.

---

## Apêndice A — Stack drift consolidado

| App | React | Vite | Tailwind | Router | State | Auth |
|---|---|---|---|---|---|---|
| dashboard | 18.3.1 | 6.0.0 | — | RR v6 | Zustand + 40+ hooks | AuthGuard próprio |
| v2-condominios | 19.0.0 | 6.0.1 | — | RR v6 | Context API | @proptech/auth ✓ |
| v4-energia | 19.2.4 | 8.0.4 | — | state | useState | sb.auth directo |
| v5-manutencao | 19.0.0 | 6.0.1 | — | state | Context API | local AuthContext (declara @proptech/auth mas não usa) |
| truth | 19.2.4 | 8.0.4 | **3.4.17** | RR v6.30.1 | `[unverified]` | `[unverified]` |
| v2-condomino-mobile | só `dist/` | — | — | — | — | — |

## Apêndice B — Inventário de TODO operacionais por origem

Baseline 2026-05-05 tinha 15 TODOs em apps/v5-manutencao. Este sweep não fez re-scan exaustivo de TODOs (out-of-scope da Phase 3 Frontend Data Collection). Assumir que os TODOs documentados em `docs/audits/2026-05-05/AUDIT-frontend.md` § "Bugs UX conhecidos" continuam abertos a menos que prova em contrário. Phase 4 (Architect draft) deve re-validar.
