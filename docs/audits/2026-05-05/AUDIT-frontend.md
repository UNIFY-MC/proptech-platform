# AUDIT-frontend · PropTech Platform · 2026-05-05

> Audit read-only das 6 apps React do monorepo.
> Executado por: **vertical-builder** (a substituir frontend-builder, que não existe como agent — ver secção "Nota de autoria").
> Baseado em: AUDIT-RAW.md (contexto factual), leitura directa de package.json, vite.config.js e src/.

---

## Nota de autoria

O agente `frontend-builder` aparece em `.claude/state/agents/frontend-builder.md` (state file) mas **não existe** como sub-agent invocável em `.claude/agents/`. Não tem ficheiro `.md` de definição e nunca foi criado. Esta audit foi executada pelo **vertical-builder**, que tem conhecimento directo das apps React do monorepo.

---

## Estado por App

### 1. `apps/core/`

**Stack exacta**

| Dep | Versão |
|-----|--------|
| react | ^19.2.4 |
| react-dom | ^19.2.4 |
| @supabase/supabase-js | ^2.103.3 |
| chart.js | ^4.5.1 |
| vite | ^8.0.4 |
| @vitejs/plugin-react | ^6.0.1 |

- Porta: 5171 (`vite.config.js` com `strictPort: true`)
- Scripts: dev, build, lint, preview

**Propósito documentado vs aparente**

O CLAUDE.md não documenta `apps/core/` — menciona apenas `apps/v1-core/`. O ficheiro `src/App.jsx` tem exactamente o mesmo cabeçalho e conteúdo que `apps/v1-core/src/App.jsx` nas primeiras 80 linhas verificadas: mesmo timestamp (`v1-core 2026.0418 2316.jsx`), mesmas credenciais Supabase hardcoded, mesmos helpers (`eur`, `fdate`, `fdt`, `ecls`, `vcls`, `roleCls`), mesmo bloco CSS injectado via `<style>`.

A diferença detectável é estrutural: `apps/core/` tem um terceiro ficheiro `src/components/VerticaisNav.jsx` que não existe em `apps/v1-core/`. `VerticaisNav` é um hub de navegação cross-vertical (lista V1-V5 + links Supabase) — sugere que `apps/core/` é uma versão _mais recente_ de `apps/v1-core/`, com adição de navegação para as outras verticais.

Ambos usam React 19 e Vite 8 — o CLAUDE.md declara React 18 como stack, o que está desactualizado.

**Estado: LEGACY / DUPLICADO**

É provavelmente uma iteração de `apps/v1-core/` que não foi documentada e nunca substituiu formalmente o anterior. Ver secção "Stack Drift".

---

### 2. `apps/dashboard/`

**Stack exacta**

| Dep | Versão |
|-----|--------|
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| @supabase/supabase-js | ^2.105.3 |
| react-router-dom | ^6.30.3 |
| zustand | ^4.5.7 |
| lucide-react | ^0.395.0 |
| vite | ^6.0.0 |
| @vitejs/plugin-react | ^4.3.1 |

- Porta: 5180
- Nome workspace: `@proptech/dashboard`
- Scripts: dev, build, preview (sem lint)

**Propósito documentado vs aparente**

Dashboard interno agentic-ops — command center para Mário gerir o estado dos agentes, inbox de aprovações, scorecard Bia, roadmap, watchers competitivos. É a app mais recentemente activa (commits `feat(bia):*` de hoje). Está deployada no projecto Vercel `proptech-agentic-ops`.

É a única app que usa **React Router v6** e **Zustand** como padrão. Não usa `@proptech/auth` nem `@proptech/db` apesar de estar listado como consumidor em AUDIT-RAW.md — o package.json não declara essas dependências. Usa Supabase directamente (`@supabase/supabase-js` ^2.105.3, a versão mais recente do repo).

**Estado: ACTIVO (produção interna)**

---

### 3. `apps/v1-core/`

**Stack exacta**

| Dep | Versão |
|-----|--------|
| react | ^19.2.4 |
| react-dom | ^19.2.4 |
| @supabase/supabase-js | ^2.103.3 |
| chart.js | ^4.5.1 |
| vite | ^8.0.4 |
| @vitejs/plugin-react | ^6.0.1 |

- Porta: não declarada no vite.config.js (default Vite: 5173)
- Scripts: dev, build, lint, preview

**Propósito documentado vs aparente**

Documentado em CLAUDE.md como "port do admin/index.html" — o ficheiro monolítico HTML de produção que está em `admin/`. O `src/App.jsx` confirma: cabeçalho documenta "PORT FIDELITY NOTES", 8 páginas (financeiro, clientes, pipeline, leads, permissões, staff, apikeys, developer), 5 modais, Chart.js MRR.

O design system referência para todas as outras verticais (design tokens, helpers `eur()`, `fdate()`, etc.).

Nota: as chaves Supabase estão **hardcoded** directamente no `App.jsx` (anon key visível), não via variáveis de ambiente. Isto é consistente com o port de um ficheiro HTML que tinha as mesmas chaves expostas.

**Estado: REFERÊNCIA ARQUITECTURAL / NÃO DEPLOYADO**

É o template canónico, mas não está em produção. A produção real corre ainda no `admin/index.html` (Netlify).

---

### 4. `apps/v2-condominios/`

**Stack exacta**

| Dep | Versão |
|-----|--------|
| react | ^19.0.0 |
| react-dom | ^19.0.0 |
| @proptech/auth | * (workspace) |
| @proptech/db | * (workspace) |
| vite | ^6.0.1 |
| @vitejs/plugin-react | ^4.3.4 |

- Porta: 5176 (vite.config.js + package.json scripts)
- Scripts: dev, build, preview
- Sem Supabase client directo — delega para `@proptech/db`
- Sem lucide-react, sem Chart.js, sem Tailwind

**Propósito documentado vs aparente**

Não documentado em CLAUDE.md. O AUDIT-RAW.md assinala como "ANOMALIA CRÍTICA". A leitura do `src/App.jsx` confirma: é um **stub de 39 linhas** — apenas importa `@proptech/auth` e `@proptech/db`, exibe "Dashboard V2 Condomínios a construir…" depois de login.

O `src/components/LoginScreen.jsx` é funcional (email + password via `mainClient.auth.signInWithPassword`) mas sem design system aplicado — inline styles básicos sem tokens CSS, sem Inter/JetBrains Mono, sem dark/light toggle.

Esta app é a tentativa de rebuild da V2 usando a arquitectura workspace com `@proptech/*` packages. O trabalho real do command centre V2 foi feito noutro lado (commit b0cd052 do vertical-builder faz referência a `apps/v2-condominios/src/App.jsx` com 1346 linhas — **mas o ficheiro lido tem apenas 39 linhas**). Isto indica que o commit b0cd052 pode estar na branch `sprint/v5-1b3` e ainda não chegou ao `main`, ou foi revertido.

**Estado: STUB / EM CONSTRUÇÃO (não deployado)**

---

### 5. `apps/v4-energia/`

**Stack exacta**

| Dep | Versão |
|-----|--------|
| react | ^19.2.4 |
| react-dom | ^19.2.4 |
| @supabase/supabase-js | ^2.103.3 |
| vite | ^8.0.4 |
| @vitejs/plugin-react | ^6.0.1 |

- Porta: não declarada no vite.config.js (default Vite: 5173)
- Scripts: dev, build, preview (sem lint)
- Sem lucide-react, sem Chart.js (apesar de estar no template obrigatório do vertical-builder), sem Tailwind

**Propósito documentado vs aparente**

O `src/App.jsx` tem cabeçalho claro: "V4 ENERGIA · React App, V1 SCOPE, Login email/password via Supabase Auth, Dashboard com 4 KPIs ligados a v4_energia.contratos_energia". Usa design tokens idênticos a v1-core (mesmas variáveis CSS: `--bg`, `--surface`, `--blue`, `--mono`, etc.) injectados via `<style>`.

Usa **variáveis de ambiente** para as chaves Supabase (`import.meta.env.VITE_SUPABASE_URL`) — ao contrário de v1-core que as tem hardcoded. Boa prática.

Tem dois clientes Supabase: `sb` (schema público para auth) e `sbV4` (schema `v4_energia` para dados). Estrutura correcta.

A pasta `src/components/` tem 6 componentes (Btn, Info, StepBar, RoleBar, ClienteSimulator, StaffLeads) e `src/lib/` tem motor.js e queries.js — indica que houve scaffolding real além do mínimo V1.

**Estado: EM CONSTRUÇÃO (scaffold activo, sem deploy)**

---

### 6. `apps/v5-manutencao/`

**Stack exacta**

| Dep | Versão |
|-----|--------|
| react | ^19.0.0 |
| react-dom | ^19.0.0 |
| @proptech/auth | * (workspace) |
| @proptech/db | * (workspace) |
| @supabase/supabase-js | ^2.103.0 |
| lucide-react | ^1.8.0 |
| dompurify | ^3.4.1 |
| marked | ^18.0.2 |
| vite | ^6.0.1 |
| @vitejs/plugin-react | ^4.3.4 |

- Porta: 5175 (`strictPort: true`, `host: 127.0.0.1`)
- Scripts: dev, build, preview, seed:cp, seed:cp:force (tsx)
- Tailwind: **NÃO** (zero referências em qualquer ficheiro da app)
- Chart.js: **NÃO**

**Propósito documentado vs aparente**

A app principal activa do produto. Pelo glob de jsx encontrámos 85+ ficheiros de componentes e ecrãs — estrutura de app mobile-first completa com rotas internas, onboarding wizard, pedidos, chat, gamification, owners club, perfil fiscal, etc.

O `App.jsx` tem mais de 10.800 linhas lidas (o ficheiro termina depois da linha 10.835 verificada). É o maior ficheiro do repo. Usa CSS-in-JS via `<style>` tags inline e inline styles extensivos — sem Tailwind, sem CSS modules.

Usa **ambos** `@proptech/auth` (import em top-level) e o seu próprio `./lib/AuthContext.jsx` separado — há duas camadas de auth em coexistência, o que é uma fonte de confusão (ver `@deprecated 3.4A` no import de demo.js na linha 6 de App.jsx).

**Estado: ACTIVO / PRODUÇÃO VERCEL (`proptech-v5-alpha`)**

---

## Stack Drift

### Versões React

| App | React declarado | Vite |
|-----|----------------|------|
| apps/core | ^19.2.4 | ^8.0.4 |
| apps/dashboard | ^18.3.1 | ^6.0.0 |
| apps/v1-core | ^19.2.4 | ^8.0.4 |
| apps/v2-condominios | ^19.0.0 | ^6.0.1 |
| apps/v4-energia | ^19.2.4 | ^8.0.4 |
| apps/v5-manutencao | ^19.0.0 | ^6.0.1 |

O CLAUDE.md declara "React 18 + Vite" como stack. **5 das 6 apps já usam React 19.** Apenas `apps/dashboard` mantém React 18.

Há também duas gerações de Vite: `^6.x` (apps v2, v5, dashboard) e `^8.x` (apps core, v1-core, v4). Vite 8 é muito recente (pode ser pre-release) — confirmar compatibilidade com `@vitejs/plugin-react` ^6.

### Tailwind

Nenhuma app usa Tailwind. Zero ficheiros com referências a `tailwind` foram encontrados. O CLAUDE.md menciona "Tailwind (core utilities)" na stack técnica — isto é letra morta. O padrão real é CSS injectado via `<style>` tag com tokens CSS custom properties.

### `@proptech/*` packages

| App | @proptech/auth | @proptech/db |
|-----|---------------|-------------|
| apps/core | Não | Não |
| apps/dashboard | Não | Não |
| apps/v1-core | Não | Não |
| apps/v2-condominios | Sim | Sim |
| apps/v4-energia | Não | Não |
| apps/v5-manutencao | Sim | Sim |

Os packages workspace são usados apenas pelas duas apps mais recentes (v2 e v5). As restantes têm integração Supabase directa via `createClient()`. Há portanto duas abordagens de auth em paralelo no repo — a arquitectura antiga (sb directo) e a nova (@proptech/auth + AuthProvider).

### Divergência com CLAUDE.md

| Item declarado | Realidade |
|----------------|-----------|
| React 18 | 5/6 apps em React 19 |
| Tailwind | Zero uso em qualquer app |
| Chart.js 4 | Apenas em apps/core e apps/v1-core |
| lucide-react | Apenas dashboard e v5-manutencao |

---

## Packages workspace

### `@proptech/auth` — `packages/auth/src/AuthContext.jsx`

**Funcional** (não é stub). Implementa:

- `AuthProvider` — context provider com `mainClient` + `coreClient` (dois clientes Supabase para schemas diferentes)
- Sincronização de JWT entre os dois clientes (`syncCoreClient`) a cada mudança de sessão
- `loadPessoa()` — busca registo `core.pessoas` por `auth_user_id`
- `loadStaffRoles()` — busca `core.staff_roles` para determinar `isStaff`
- `loadMemberships()` — busca `core.memberships` para determinar `needsOnboarding`
- `useAuth()` — hook com `session`, `pessoa`, `authenticated`, `isStaff`, `staffRoles`, `needsOnboarding`, `signOut`, `refreshPessoa`

É código de produção real, não placeholder. Depende de tabelas no schema `core` do V1 Core Hub: `pessoas`, `staff_roles`, `memberships`.

**Um único ficheiro** em `packages/auth/src/` — sem package.json próprio visível no glob (pode existir na raiz do package).

### `@proptech/db` — `packages/db/src/index.js`

**Funcional** (não é stub). Implementa:

- `SUPABASE_URL` — constante com o URL do V1 Core Hub (hardcoded, safe para commit)
- `createMainClient(anonKey, options)` — factory para cliente com `persistSession: true`
- `createCoreClient(anonKey)` — factory para cliente do schema `core` com `persistSession: false` e `storageKey: 'sb-core-auth'`

É a camada de abstracção de clientes Supabase para os apps que usam `@proptech/*`. Cobre o padrão dual-client necessário quando uma app tem utilizadores normais (schema v5_manutencao) e precisa também de consultar o schema core (staff, pessoas).

---

## Bugs UX conhecidos

Inventário completo de TODOs encontrados no código (38 ocorrências em 25 ficheiros):

### Críticos (impacto em produção)

**1. Tabela errada para writes de serviços** (`apps/v5-manutencao/src/App.jsx:7545`)
```
// TODO(mario): writes ainda vão para public.servicos — migrar para catalogo_servicos em Tarefa D
const result = await sbSave('servicos', dbRow, authUser?.token)
```
Impacto: dados de serviços criados/editados pelo admin vão para `public.servicos` em vez de `v5_manutencao.catalogo_servicos`. Os reads podem estar noutra tabela, causando dessincronização silenciosa.

**2. Auth ainda usa demo mode** (`apps/v5-manutencao/src/lib/demo.js:1`)
```
// TODO(mario): remover quando auth real implementada (Fase 4 — signup dual)
export const DEMO_PESSOA_ID       = '9ef5000a-...'
export const DEMO_ORGANIZATION_ID = 'bf984bae-...'
```
O App.jsx importa estas constantes com `@deprecated 3.4A` mas o import existe. A auth real está parcialmente activa (Fase 2d implementada) mas o modo demo coexiste.

**3. `pontos_historico` pode não existir** (`apps/v5-manutencao/src/lib/gamification.js:24`)
```
// TODO(mario): verificar que tabela pontos_historico existe no schema v5_manutencao
```
A função `ganharPontos()` usa `supa.from('pontos_historico').insert(...)` — se a tabela não existe, o sistema de gamification falha silenciosamente (tem `try/catch` que retorna `false`). O módulo inteiro (pontos, streaks, missões) pode estar não-funcional sem aviso visível ao utilizador.

**4. ETA hardcoded no chat** (`apps/v5-manutencao/src/ChatPedidoScreen.jsx:25`)
```
const etaMin = 18 // TODO(mario): real ETA from ordens_trabalho
```
O ETA mostrado ao utilizador no chat com prestador é sempre 18 minutos, independentemente da ordem real.

**5. NIF sem validação** (`apps/v5-manutencao/src/components/PerfilFiscalForm.jsx:42`)
```
// TODO(mario): validar checkdigit NIF português
```
Aceita qualquer sequência de 9 dígitos como NIF válido. Impacto fiscal directo — dados incorrectos chegam à faturação.

### Médios (funcionalidade incompleta)

**6. Auth para equipamentos usa token legacy** (`App.jsx:10485`)
```
// TODO(mario): migrar para supa client com auth real (Fase 4)
const eqs = await sbGetV5('equipamentos', '...', authUser?.token)
```

**7. Tabela `missoes_utilizador` pode não existir** (`gamification.js:116`)
Mesma classe de problema que `pontos_historico`.

**8. OwnersClubScreen com dados estáticos** (`OwnersClubScreen.jsx:8,71,130,150`)
Quatro TODOs consecutivos — toda a ecrã usa dados hardcoded.

**9. MissoesScreen com dados estáticos** (`MissoesScreen.jsx:8`)
Missões lidas de array local, não da BD.

**10. Links para V2 / outras apps** (`ImovelDetalheScreen.jsx:169`, `MoradasScreen.jsx:564,571`)
Botões "Abrir na V2 →" que fazem `alert('TODO: link para V2')` — não funcionais.

**11. Email de suporte placeholder** (`AjudaScreen.jsx:98`, `DefinicoesScreen.jsx:140`)
`suporte@exemplo.pt` é placeholder — nunca foi substituído pelo email real.

**12. Domínio de referral placeholder** (`ReferralScreen.jsx:46`)
`https://app.exemplo.pt/r/${code}` — domínio final não definido.

**13. Orphan files em Storage** (`App.jsx:3681`)
Upload de documentos pode criar ficheiros órfãos no Storage se o INSERT falhar após o upload.

**14. FAQ hardcoded** (`AjudaScreen.jsx:14`)
FAQ lida de array local — não gerível via backoffice.

**15. Poupanças com dados estáticos** (`PoupancasDetalheScreen.jsx:10`, `IniciaScreen.jsx:430`)
`fn_calc_poupancas()` não implementada — ecrã de poupanças mostra 0€.

---

## Componentes duplicados

Há padrões similares entre apps mas ainda sem extracção formal:

| Padrão | Onde existe | Notas |
|--------|-------------|-------|
| Login screen (email + password) | apps/v2-condominios/src/components/LoginScreen.jsx, apps/v5-manutencao/src/screens/auth/LoginScreen.jsx, apps/v1-core (embutido em App.jsx), apps/core (embutido em App.jsx) | 4 implementações diferentes. A de v2-condominios é a mais simples (85L). |
| Design tokens CSS (--bg, --surface, --blue, etc.) | apps/v1-core/App.jsx, apps/core/App.jsx, apps/v4-energia/App.jsx | Idênticos. Candidatos a extracção para `packages/ui-tokens/` ou `apps/shared/`. |
| Helpers PT-PT (`eur()`, `fdate()`, `fdt()`) | apps/core/App.jsx, apps/v1-core/App.jsx | Código copy-paste. |
| Sidebar colapsável | apps/core (embutida), apps/v1-core (embutida), apps/dashboard (Sidebar.jsx separada) | Implementações diferentes — dashboard tem a mais madura (component separado + React Router). |

Nenhum componente foi ainda extraído para `apps/shared/` — a pasta não existe. A regra "2 ou mais verticais = extracção" do vertical-builder ainda não foi accionada formalmente.

---

## Próximas Acções

Máximo 5, por prioridade:

### 1. Corrigir o write para tabela errada em V5 (crítico, produção)

`App.jsx:7545` — substituir `sbSave('servicos', ...)` por `sbSave('catalogo_servicos', ...)` ou equivalente no schema correcto. Confirmar primeiro qual a tabela de leitura para garantir consistência. Impacto: dados de catálogo deixam de ser escritos em schema errado.

### 2. Confirmar existência de `pontos_historico` e `missoes_utilizador` em Supabase

Delegar ao `supabase-designer`: executar `\dt v5_manutencao.*` e confirmar se as tabelas de gamification existem. Se não existirem, o sistema de pontos falha silenciosamente em produção. Se existirem, remover os TODOs.

### 3. Eliminar `apps/core/` ou documentá-lo formalmente

`apps/core/` é um duplicado não documentado de `apps/v1-core/` com adição de `VerticaisNav`. As opções são: (a) eliminar `apps/core/` e mover `VerticaisNav` para `apps/v1-core/`, ou (b) documentar `apps/core/` como o successor de `apps/v1-core/` e deprecar este. A ambiguidade actual cria confusão sobre qual é o template canónico.

### 4. Actualizar CLAUDE.md: React 19, sem Tailwind

O CLAUDE.md declara "React 18 + Tailwind" — ambos estão errados. 5/6 apps usam React 19. Zero apps usam Tailwind. Actualizar a secção "Stack técnica" para reflectir a realidade: React 19, Vite 6-8, CSS custom properties via `<style>` tag.

### 5. Substituir emails/domínios placeholder antes de qualquer campanha pública

`suporte@exemplo.pt` e `app.exemplo.pt` aparecem em ecrãs visíveis ao utilizador final (Ajuda, Definições, Referral). São placeholders que nunca foram substituídos. Risco de imagem se um utilizador real chegar a estas ecrãs.

---

*Gerado por vertical-builder em 2026-05-05. Read-only. Sem edições de código.*
