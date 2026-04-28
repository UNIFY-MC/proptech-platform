# Sprint 1B.5A — Foundations Plan
**Análise concluída:** 28 Abril 2026 · Branch `feat/1b5a-foundations-analysis`
**Fase 2 (implementação):** ✅ APROVADA — decisões D1-D5 confirmadas por Mario 28 Abr 23h

---

## Decisões aprovadas Mario (28 Abr 23h)

| ID | Decisão | Aprovação |
|----|---------|-----------|
| D1 | npm workspaces | ✅ Mario 28 Abr |
| D2 | @proptech/* naming | ✅ Mario 28 Abr |
| D3 | V5+V2 usam versões exactas recentes; V63 isolado e excluído | ✅ Mario 28 Abr (revista) |
| D4 | Verificar @proptech disponível npm | ⏳ Fase 2 |
| D5 | V2 scope: login mínimo | ✅ Mario 28 Abr |

### Implicações da D3 — Versions (revista 28 Abr 23h)

V5 + V2 novo usam `packages/*` com versões exactas e recentes:
- `packages/db`: `"@supabase/supabase-js": "^2.103.0"`
- `packages/auth`: peer `"react": "^19.0.0"`

V63 fica fora de scope:
- `v63-prataowners/` **NÃO migra** para packages
- Mantém-se em React 18 + supa-js 2.45 isolado
- Continua em produção até `v2-condominios` atingir feature parity
- Quando V2 novo estiver pronto → migração de utilizadores → V63 deprecated

Vantagens desta abordagem:
- Zero hacks de compatibilidade (sem `"^18 || ^19"` defensivo)
- packages limpos com versões exactas
- V5 e V2 evoluem juntos como "nova plataforma"
- V63 morre naturalmente sem bloquear inovação
- Sem risco de bugs latentes entre versões diferentes

### Sprint futura — Substituição V63 → V2 novo

Não é upgrade, é replacement. Quando `v2-condominios` atingir feature parity com `v63-prataowners`:
1. Migration plan de utilizadores
2. Migration plan de dados (se necessário)
3. Cutover (período em paralelo + cutover final)
4. V63 deprecated mas mantido read-only durante 3–6 meses
5. V63 archived

Esforço estimado: muito grande, depende do scope final V2. **NÃO é parte de 1B.5A.**

---

## 1. Estado actual do monorepo

### Apps existentes

| App | React | supabase-js | Usa packages? | Notas |
|-----|-------|-------------|---------------|-------|
| `apps/v5-manutencao` | 18.3.1 | 2.45.0 | ✅ Sim (Fase 2) | App principal · `supa.js` completo + AuthContext · 55+32 imports |
| `apps/v2-condominios` (NOVO) | 19 | 2.103 | ✅ Sim (Fase 2) | Construído de raiz · substitui V63 |
| `apps/v63-prataowners` | 18 | 2.45 | ❌ Não — legacy isolado | Produção viva · intocável até V2 feature parity |
| `apps/v1-core` | 19.2.4 | 2.103.3 | ❌ Não — fora scope | Port do admin/index.html legacy |
| `apps/core` | 19.2.4 | 2.103.3 | ❌ Não — fora scope | Cópia idêntica de v1-core |
| `apps/v4-energia` | 19.x | 2.103.3 | ❌ Não — fora scope | Shell inicial · fora de 1B.5A |

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

**D3 ✅ — Versões exactas recentes; V63 excluído de packages**
- `packages/db`: `"@supabase/supabase-js": "^2.103.0"`
- `packages/auth`: peer `"react": "^19.0.0"`
- V5 e V2 novo usam as mesmas versões — zero hacks de compatibilidade
- V63 (`v63-prataowners`) **excluído** — legacy isolado, substituto não upgrade
- *Nota:* V5 ainda está em React 18 / supa 2.45 — Fase 2 inclui upgrade de V5 antes de ligar packages

**D4 ⏳ — Verificar namespace @proptech no npm** (executar no início da Fase 2)
- Comando: `npm info @proptech/db 2>&1 | head -5` — se 404, namespace livre; se 200, escolher alternativa
- Alternativa de fallback: `@mariocarvalho/db` + `@mariocarvalho/auth` (namespace pessoal garantido)

**D5 ✅ — V2 scope mínimo: login funcional apenas** (sem listagens, sem dashboard)

---

## 5. Estimativa Fase 2 (implementação)

| Step | Descrição | Estimativa |
|------|-----------|-----------|
| 2.0 | Verificar D4 (`npm info @proptech/db`) + `package.json` raiz + workspace config | 20 min |
| 2.1 | Upgrade V5: React 18→19 + supabase-js 2.45→2.103 (alinhar com packages) | 30 min + smoke test |
| 2.2 | Criar `packages/db`: URL/key + factories (supa ^2.103.0) | 30 min |
| 2.3 | Adaptar `supa.js` de V5 para usar `@proptech/db` | 20 min |
| 2.4 | Mover `AuthContext.jsx` para `packages/auth` (fase 1 — shim em V5) | 45 min |
| 2.5 | Refactorizar `AuthProvider` para aceitar clients via props (peer react ^19) | 45 min |
| 2.6 | Smoke test V5 completo (auth, uploads, onboarding, GDPR) | 30 min |
| 2.7 | Scaffold login mínimo V2 com `@proptech/auth` (D5 validation) | 20 min |
| **Total** | | **~4h** |

---

## 6. Sequência de commits Fase 2

```
chore(monorepo): add npm workspaces root package.json + packages/ scaffold
chore(v5): upgrade react 18→19 + supabase-js 2.45→2.103 (align with packages)
feat(packages/db): @proptech/db — Supabase client factories (supa ^2.103.0)
refactor(v5): supa.js → uses @proptech/db factory
feat(packages/auth): @proptech/auth — AuthContext + useAuth extracted from V5
refactor(v5): AuthContext → consumes @proptech/auth (shim, no logic change)
refactor(v5): AuthProvider accepts mainClient + coreClient via props (react ^19)
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
