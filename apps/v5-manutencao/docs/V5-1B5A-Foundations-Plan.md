# Sprint 1B.5A — Foundations Plan
**Análise concluída:** 28 Abril 2026 · Branch `feat/1b5a-foundations-analysis`
**Fase 2 (implementação):** aguarda aprovação de Mario

---

## 1. Estado actual do monorepo

### Apps existentes

| App | React | supabase-js | Notas |
|-----|-------|-------------|-------|
| `apps/v1-core` | 19.2.4 | 2.103.3 | Port do admin/index.html legacy · SPA html único |
| `apps/core` | 19.2.4 | 2.103.3 | Cópia idêntica de v1-core · mesmo package.json |
| `apps/v4-energia` | 19.x | 2.103.3 | Shell inicial · `supa.js` minimalista (2 clients, sem DEV helpers) |
| `apps/v5-manutencao` | 18.3.1 | 2.45.0 | App principal · `supa.js` completo + AuthContext · 55+32 imports |

### Ferramentas de workspace

- `package.json` na raiz: **NÃO EXISTE**
- `pnpm-workspace.yaml`: NÃO EXISTE
- `.yarnrc.yml`: NÃO EXISTE
- Conclusão: **zero workspace tooling** — ponto de partida limpo

### Divergências de versão (risco)

| Dep | V5 (React 18 era) | Outros | Delta |
|-----|-------------------|--------|-------|
| `react` / `react-dom` | ^18.3.1 | ^19.2.4 | 1 major |
| `supabase-js` | ^2.45.0 | ^2.103.3 | ~58 minors |
| `vite` | ^6.x | ^8.x | 2 majors |

---

## 2. Candidatos a packages partilhados

### `packages/db` — factory de clientes Supabase

**O problema:** cada app cria o(s) seu(s) cliente(s) com a mesma URL + anon key hardcoded. Se a URL ou key mudar (ex: migração de projecto Supabase), requer edição em N ficheiros.

**O que partilhar:**
- Constante `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- Factory `createMainClient(options?)` → devolve `SupabaseClient`
- Factory `createCoreClient(options?)` → devolve `SupabaseClient` com `db: { schema: 'core' }`

**O que NÃO partilhar:**
- Config específica V5: `storageKey: 'v5-auth'`, `persistSession: false` para `supaPublic`
- DEV helpers (`window.supabase`, `window.__testImageInspector`)
- Schema overrides por vertical (`v5_manutencao`, `v4_energia`)

Cada app mantém o seu `supa.js` local que importa a factory e adiciona a config própria:
```js
// apps/v5-manutencao/src/supa.js (depois)
import { createMainClient, createCoreClient } from '@proptech/db'
export const supa = createMainClient({ db: { schema: 'v5_manutencao' } })
export const supaCore = createCoreClient()
// ... resto V5-específico fica aqui
```

**Surface de impacto:** 0 ficheiros mudam dentro de V5 — apenas `supa.js` (1 ficheiro).

---

### `packages/auth` — AuthContext + useAuth

**O problema:** `AuthContext.jsx` em V5 importa `supa` e `supaCore` directamente do `../supa` local. Para reutilizar em V4, teria de copiar o ficheiro inteiro e adaptar os imports.

**O que partilhar:**
- `AuthProvider` component (aceita `mainClient` + `coreClient` como props)
- `useAuth()` hook
- Tipos/interfaces (se TypeScript)

**O que NÃO partilhar:**
- Lógica específica a V5 (needsOnboarding baseado em memberships V5, staffRoles V5)

**Decisão de design:** refactorizar `AuthProvider` para receber clients via props em vez de imports hardcoded:
```jsx
// packages/auth/AuthContext.jsx
export function AuthProvider({ mainClient, coreClient, children }) {
  // usa mainClient para onAuthStateChange
  // usa coreClient para core.pessoas + core.memberships + core.staff_roles
}
```

**Surface de impacto em V5:** 1 ficheiro muda (`App.jsx`) + 1 (`src/lib/AuthContext.jsx` → importa do package).
Os 32 ficheiros que fazem `import { useAuth }` só mudam o path do import.

---

## 3. Riscos identificados

### Risco A — Divergência React 18 vs 19 (MÉDIO)

`packages/auth` vai usar hooks React. Se o package compilar contra React 19 e V5 consumir com React 18, pode haver conflito de instância de React ("Invalid hook call").

**Mitigação:** declarar `react` como `peerDependency` (não `dependency`) em cada package. Cada app fornece a sua própria instância.

### Risco B — supabase-js 2.45 vs 2.103 (BAIXO-MÉDIO)

V5 usa 2.45. Se o package usar tipos do 2.103 que não existem em 2.45, TypeScript vai reclamar (se/quando V5 migrar para TS).
Por agora (JS puro em V5), sem impacto em runtime — a API pública não mudou de forma breaking.

**Mitigação recomendada:** upgradar V5 para 2.103 numa commit separada ANTES da extracção, para garantir parity.

### Risco C — Regressão Auth V5 (ALTO se não testado)

AuthContext em V5 é o componente mais crítico — toca em login, onboarding bloqueante, staff banner, GDPR delete. Qualquer regressão aqui quebra toda a app.

**Mitigação:** extracção em 2 fases:
1. Mover ficheiro para `packages/auth/` SEM alterar lógica → re-exportar de `src/lib/AuthContext.jsx` (shim)
2. Refactorizar para aceitar clients como props (fase separada, com smoke test obrigatório)

### Risco D — v1-core e core são legacy HTML ports (BAIXO)

`v1-core` e `core` são ports de `admin/index.html`. Não têm AuthContext próprio (autenticação é via Supabase JS directo no HTML). Não vão consumir `packages/auth` inicialmente. Sem risco.

---

## 4. Decisões pendentes (Mario aprova antes da Fase 2)

**D1 — Workspace tooling: npm workspaces ou pnpm?**

| | npm workspaces | pnpm workspaces |
|--|--|--|
| Deps adicionais | Nenhuma (built-in Node 16+) | Instalar pnpm globalmente |
| Hoisting | Permissivo (pode mascarar missing deps) | Strict (mais correcto) |
| Velocidade install | Lento | Rápido |
| Familiaridade Mario | Alta (já usa npm) | Baixa |
| Recomendação | ✅ Para este projecto | Overkill nesta fase |

**Recomendação:** `npm workspaces` — sem deps novas, Mario já conhece npm.

**D2 — Naming dos packages: `@proptech/*` ou outro?**

Opções:
- `@proptech/db` + `@proptech/auth` — reflecte a plataforma
- `@v5/db` + `@v5/auth` — reflecte a vertical (mas `db` é cross-vertical)
- `packages/db` + `packages/auth` — sem scope (mais simples, sem npm publish)

**Recomendação:** `@proptech/db` + `@proptech/auth` — scope correcto dado que ambos serão usados por V4, V5, futuras verticais.

**D3 — Upgradar V5 React 18 → 19 antes ou depois da extracção?**

**Recomendação:** ANTES. Evita package compilar com peer React 19 e ser consumido por V5 React 18. A upgrade é relativamente segura — V5 não usa Server Components nem features React 18-específicas que tenham mudado.

**D4 — Upgradar V5 supabase-js 2.45 → 2.103 antes ou depois?**

**Recomendação:** ANTES (mesma razão). 2.45 → 2.103 é semver minor; sem breaking changes na API pública JS. Confirmar em changelog se há mudanças no `onAuthStateChange` ou `signIn` que V5 usa.

**D5 — Scope do scaffold V4?**

V4 tem shell mínimo. Ao extrair `packages/auth`, faz sentido adicionar `AuthProvider` a V4 ao mesmo tempo?

**Recomendação:** SIM — scaffolding mínimo (login screen + AuthProvider) com AuthContext partilhado valida que o package funciona em 2 apps reais.

---

## 5. Estimativa Fase 2 (implementação)

| Step | Descrição | Estimativa |
|------|-----------|-----------|
| 2.0 | `package.json` raiz + workspace config | 15 min |
| 2.1 | Upgrade V5: React 18→19 + supabase-js 2.45→2.103 | 30 min + smoke test |
| 2.2 | Criar `packages/db`: URL/key + factories | 30 min |
| 2.3 | Adaptar `supa.js` de V5 para usar `@proptech/db` | 20 min |
| 2.4 | Adaptar `supa.js` de V4 para usar `@proptech/db` | 10 min |
| 2.5 | Mover `AuthContext.jsx` para `packages/auth` (fase 1 — shim em V5) | 45 min |
| 2.6 | Refactorizar `AuthProvider` para aceitar clients via props | 45 min |
| 2.7 | Smoke test V5 completo (auth, uploads, onboarding, GDPR) | 30 min |
| 2.8 | Scaffold AuthProvider em V4 (validação cross-app) | 20 min |
| **Total** | | **~4h** |

---

## 6. Sequência de commits Fase 2

```
chore(monorepo): add npm workspaces root package.json + packages/ scaffold
chore(v5): upgrade react 18→19 + supabase-js 2.45→2.103
feat(packages/db): @proptech/db — Supabase client factories
refactor(v5): supa.js → uses @proptech/db factory
refactor(v4): supa.js → uses @proptech/db factory
feat(packages/auth): @proptech/auth — AuthContext + useAuth extracted from V5
refactor(v5): AuthContext → consumes @proptech/auth (shim)
refactor(v5): AuthProvider accepts clients via props (generic)
test(v5): smoke test auth + uploads post-extraction
feat(v4): scaffold AuthProvider from @proptech/auth
```

---

## 7. Ficheiros criados/analisados nesta fase

**Lidos (diagnóstico):**
- `apps/v5-manutencao/package.json` — React 18, supa 2.45
- `apps/v1-core/package.json` — React 19, supa 2.103
- `apps/core/package.json` — React 19, supa 2.103 (cópia de v1-core)
- `apps/v4-energia/package.json` — React 19, supa 2.103
- `apps/v5-manutencao/src/supa.js` — 3 clients + DEV helpers
- `apps/v4-energia/src/supa.js` — 2 clients simples
- `apps/v5-manutencao/src/lib/AuthContext.jsx` — 156 linhas · factory de context

**Grep counts:**
- `import.*supa` em V5: 55 ficheiros
- `import.*AuthContext\|useAuth` em V5: 32 ficheiros
- `AuthProvider` em App.jsx: 2 ocorrências (open + close)

**Não modificado:** zero ficheiros de produção — apenas este documento criado.
