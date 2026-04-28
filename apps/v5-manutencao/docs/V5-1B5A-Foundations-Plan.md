# Sprint 1B.5A — Foundations Plan
**Análise concluída:** 28 Abril 2026 · Branch `feat/1b5a-foundations-analysis`
**Fase 2 (implementação):** ✅ APROVADA — decisões D1-D5 confirmadas por Mario 28 Abr 23h

---

## Decisões aprovadas Mario (28 Abr 23h)

| ID | Decisão | Aprovação |
|----|---------|-----------|
| D1 | npm workspaces | ✅ Mario 28 Abr |
| D2 | @proptech/* naming | ✅ Mario 28 Abr |
| D3 | Manter divergências React/supa, peer ranges largos | ✅ Mario 28 Abr |
| D4 | Verificar @proptech disponível npm | ⏳ Fase 2 |
| D5 | V2 scope: login mínimo | ✅ Mario 28 Abr |

### Implicações da D3 (versions)

- `packages/db` declara `"@supabase/supabase-js": "^2.45.0"` (aceita 2.45 → 2.103+)
- `packages/auth` declara peer dep `"react": "^18 || ^19"`
- V2 novo (`apps/v2-condominios`) arranca com React 19 (latest) + supabase-js 2.103+ (latest)
- V5 fica em React 18 / supabase 2.45 **sem mexer** — produção intocável
- Risco aceite: bug latente onde V5 pode comportar-se diferente de V2/V4. Mitigação: testes nos packages/* exercitam ambas as ranges

### Sprint 1B.5B futura — Upgrade V5

Quando V5 tiver testes E2E suficientes, upgrade para React 19 + supabase 2.103.
- Pré-requisito: smoke test V5 manual cobrir paths críticos (auth, onboarding, uploads, GDPR)
- Esforço estimado: 1-2 dias com cuidado
- Branch dedicada; nunca no mesmo PR que a extracção dos packages

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

## 4. Decisões (aprovadas 28 Abr)

**D1 ✅ — npm workspaces** (built-in Node, zero deps novas, familiar)

**D2 ✅ — Naming `@proptech/*`** (`@proptech/db` + `@proptech/auth`) — scope correcto para uso cross-vertical

**D3 ✅ — Manter divergências de versão; peer ranges largos**
- Não upgradar V5 antes da extracção
- `packages/db` peer `"@supabase/supabase-js": "^2.45.0"`
- `packages/auth` peer `"react": "^18 || ^19"`
- V2 novo arranca com React 19 + supa 2.103; V5 fica intocável
- Upgrade V5 adiado para Sprint 1B.5B (pré-requisito: E2E suficientes)

**D4 ⏳ — Verificar namespace @proptech no npm** (executar no início da Fase 2)
- Comando: `npm info @proptech/db 2>&1 | head -5` — se 404, namespace livre; se 200, escolher alternativa
- Alternativa de fallback: `@mariocarvalho/db` + `@mariocarvalho/auth` (namespace pessoal garantido)

**D5 ✅ — V2 scope mínimo: login funcional apenas** (sem listagens, sem dashboard)

---

## 5. Estimativa Fase 2 (implementação)

| Step | Descrição | Estimativa |
|------|-----------|-----------|
| 2.0 | Verificar D4 (`npm info @proptech/db`) + `package.json` raiz + workspace config | 20 min |
| 2.1 | Criar `packages/db`: URL/key + factories (peer supa ^2.45.0) | 30 min |
| 2.2 | Adaptar `supa.js` de V5 para usar `@proptech/db` | 20 min |
| 2.3 | Adaptar `supa.js` de V4 para usar `@proptech/db` | 10 min |
| 2.4 | Mover `AuthContext.jsx` para `packages/auth` (fase 1 — shim em V5) | 45 min |
| 2.5 | Refactorizar `AuthProvider` para aceitar clients via props (peer react ^18\|\|^19) | 45 min |
| 2.6 | Smoke test V5 completo (auth, uploads, onboarding, GDPR) | 30 min |
| 2.7 | Scaffold login mínimo V2 com `@proptech/auth` (validação cross-app) | 20 min |
| **Total** | | **~3h30** |

---

## 6. Sequência de commits Fase 2

```
chore(monorepo): add npm workspaces root package.json + packages/ scaffold
feat(packages/db): @proptech/db — Supabase client factories (peer supa ^2.45.0)
refactor(v5): supa.js → uses @proptech/db factory
refactor(v4): supa.js → uses @proptech/db factory
feat(packages/auth): @proptech/auth — AuthContext + useAuth extracted from V5
refactor(v5): AuthContext → consumes @proptech/auth (shim, no logic change)
refactor(v5): AuthProvider accepts mainClient + coreClient via props
test(v5): smoke test auth + uploads + onboarding post-extraction
feat(v2): scaffold login mínimo using @proptech/auth (D5 validation)
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
