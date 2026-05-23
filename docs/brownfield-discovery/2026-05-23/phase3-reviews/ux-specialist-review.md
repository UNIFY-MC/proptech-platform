# UX Specialist Review — Phase 6

> **Workflow:** Brownfield Discovery — Phase 6 (UX Specialist Review)
> **Reviewer:** Uma (aiox-ux design expert)
> **Data:** 2026-05-23
> **Inputs:** technical-debt-DRAFT.md (Phase 4) · frontend-spec.md (Phase 1)
> **Estado:** REVIEW concluída — entregue ao architect-proptech para Phase 8

---

## Veredicto Geral

**NEEDS REVISION**

A secção Frontend do draft captura **fielmente** as dívidas estruturais mais visíveis (design system fragmentado, auth, acessibilidade, routing) e respeita os critérios canónicos do PropTech (PT-PT, design tokens, light-first). As 14 FE-* representam ~70% do problema real, mas existem **omissões materiais** que vão impactar decisões de roadmap se não forem incorporadas antes do documento final:

1. **Falta dívida de Performance / Bundle / Code Splitting** — nenhuma FE-* aborda tempo de carregamento, lazy loading, bundle size. Em V5 (produção activa, possível Capacitor mobile na Fase 7) isto é material.
2. **Falta dívida de Error Boundaries / Loading States** — zero apps têm `<ErrorBoundary>` documentado e os loading states são ad-hoc. UX em falha de rede é desconhecida.
3. **Falta dívida de Mobile / Responsive** — V2 produção serve condóminos em mobile. Sem evidência de responsive testing nem de breakpoints partilhados. FE-001 menciona tokens, mas não cobre layout/grid.
4. **Falta dívida de Testing** — zero menção a testes frontend (Vitest, RTL, Playwright). Em 5 apps com 5 implementações de auth, ausência de testes é risco crítico não capturado.
5. **Severity de FE-004 (Routing) está subdimensionada** — V5 é a app **principal viva** sem URL shareable. Deveria ser CRITICAL (não HIGH), porque bloqueia suporte ao cliente e onboarding.
6. **Esforço de FE-001 (Design System)** está sub-estimado em "XL multi-semanas" — sem decomposição (tokens → primitives → molecules → migration), o architect não consegue gerar uma epic executável.

Recomendo ao architect-proptech incorporar **6 novas FE-* (FE-015 a FE-020)** + revisões de severity/esforço listadas abaixo antes de avançar para Phase 8.

---

## Por Debt (FE-001 a FE-014)

| ID | Original Severity | Revised Severity | Confirmação | Correcção / Nota | Esforço revisto |
|----|-------------------|------------------|-------------|------------------|-----------------|
| **FE-001** · 5 design systems paralelos | CRITICAL | CRITICAL | ✅ Confirmado | Decomposição em falta: (a) extrair tokens canónicos para `packages/ui/tokens.css` com paridade light/dark; (b) extrair primitives `Button/Input/Badge/Table`; (c) migrar app por app. Sem decomposição o "XL" não é executável. CLAUDE.md root é a fonte de verdade dos tokens (`--bg --surface --blue --green --gold --red --purple`). V5 (forest/emerald) precisa de ADR específico — é divergência **intencional** documentada em V5 CLAUDE.md, não bug. | XL → decompor em 3 fases: P1 tokens (1-2 sem), P2 primitives (3-4 sem), P3 migration por app (6-8 sem) |
| **FE-002** · Auth fragmentada em 5 implementações | CRITICAL | CRITICAL | ✅ Confirmado | Adicionar nota: V5 tem regressão silenciosa (declara `@proptech/auth` mas usa `./lib/AuthContext.jsx`). Prioridade absoluta: migrar V5 primeiro (é produção activa). Dashboard pode esperar (interno, menor impacto). | L (3 apps × 2-3 dias cada) |
| **FE-003** · Acessibilidade quase ausente — DL 83/2018 | CRITICAL | CRITICAL | ✅ Confirmado | Adicionar passo concreto: (1) `<html lang="pt-PT">` em todas as apps (1h cada); (2) `eslint-plugin-jsx-a11y` em todos os `package.json` (P); (3) skip-to-content link em layout shell (P); (4) auditoria axe-core integrada em CI (M). V5 é o único com nível ARIA real (29 ocorrências em 9 ficheiros) — usar como referência interna. **Risco legal real para V2 produção (prataowners.pt).** | G → decompor em quick-wins (1-2 dias) + remediação incremental (ongoing) |
| **FE-004** · Routing inconsistente (Router vs state) | HIGH | **CRITICAL** | ⚠️ Confirmado mas severity revisto | V5 é **produção activa** servindo clientes reais. Sem URL shareable: suporte impossível ("envie um screenshot, eu vou navegar à mão"), deep links impossíveis, browser back partido, bookmarks impossíveis. Justificação "Capacitor Fase 7 resolverá" é teórica — entretanto é débito **operacional em produção**. V4 ainda não está em produção (HIGH para v4 está ok). | M (v4) + G (v5 com role-aware routes e modais → rotas) |
| **FE-005** · Zero apps usam React Query / SWR | HIGH | HIGH | ✅ Confirmado | Adicionar nota: dashboard tem 40+ hooks custom (`useTasks`, `useClients`, `useCondominios`...) que reinventam cache/dedup. Migration path: começar por dashboard (mais ROI), depois v2, depois v5. v4 é simples (3 tabs, pode ficar). Tem dependência implícita com FE-001 (provider único) e FE-016 (error boundaries). | G por app — começar com dashboard (3-4 sem), depois v2 (2 sem), depois v5 (2-3 sem) |
| **FE-006** · `v2-condomino-mobile` artefacto órfão | HIGH | HIGH | ✅ Confirmado | Está duplicado com ARCH-005. Manter referência cruzada mas remover duplicação (uma das duas debts deve ser nota "ver outro ID"). Decisão é arquitectural (integrar fonte ou eliminar) — owner é architect. | S (decisão) + M-G (reintegração se necessária) — manter como está |
| **FE-007** · `apps/core/` e `apps/v1-core/` no filesystem | HIGH | **MEDIUM** | ⚠️ Confirmado mas severity exagerado | É lixo, sim, mas não bloqueia nada. Sem `src/` (apenas `node_modules/`) não há risco de edição acidental — qualquer agente que abra a pasta vê que está vazia. Resolução é 1h de trabalho. Não justifica HIGH. | P (eliminar dois directórios + actualizar CLAUDE.md) |
| **FE-008** · `@proptech/auth` declarado mas não usado em v5 | HIGH | HIGH | ✅ Confirmado | É essencialmente sub-item de FE-002. Manter como debt separada porque tem solução técnica diferente: migrar `App.jsx:10` para importar `useAuth` de `@proptech/auth` e remover `./lib/AuthContext.jsx`. Atenção: V5 tem `OnboardingWizardScreen` que pode depender do context local — validar antes da migração. | M (1-2 dias com testes) |
| **FE-009** · Demo accounts hardcoded em v5 (@deprecated 3.4A) | MEDIUM | **HIGH** | ⚠️ Severity sub-estimado | Dados demo em código de produção é risco directo: se `DEMO_PESSOA_ID` for usado por engano numa query, dados de clientes reais podem misturar com dados demo. Comentário `@deprecated 3.4A` indica que devia ter sido removido há 3+ versões — ficou esquecido. Em produção, isto não é "Medium". | P (30 min: remover import + grep + confirmar zero usos) |
| **FE-010** · 3 chaves `localStorage` diferentes para tema | MEDIUM | MEDIUM | ✅ Confirmado | Confirmar: a chave canónica deve ser `proptech-theme` (não `v1theme` — esse nome é confuso com V1 Core Hub). Tem dependência directa com FE-001 (resolver em conjunto). V5 actualmente não tem toggle (sempre light) — decisão deliberada da V5 CLAUDE.md ou bug? Clarificar antes de migrar. | P (alterar 1 string em 4 apps + script de migração de localStorage existente) |
| **FE-011** · TODOs operacionais 2026-05-05 sem resolução | MEDIUM | **HIGH** | ⚠️ Severity sub-estimado | Lista inclui: writes para tabela errada (`servicos` vs `catalogo_servicos`), NIF sem checkdigit, ETA hardcoded 18min, FAQ hardcoded, `suporte@exemplo.pt` placeholder, `app.exemplo.pt` placeholder em referral. Isto **não** é débito técnico estético — são **bugs visíveis em produção V5**. Placeholders expostos a utilizadores finais é UX falhada. Severity HIGH justificado. | M (re-scan de TODOs + fix por fix — 1 semana) |
| **FE-012** · Nomes inconsistentes packages workspace | LOW | LOW | ✅ Confirmado | OK como Low. Notar que `@property007/truth` usa prefixo de **organização legal** (Property 007 LDA) enquanto `@proptech/*` usa prefixo de produto. Decisão: convergir para `@proptech/*` ou aceitar dual prefix (truth como produto separado)? Owner é architect, não UX. | S (decisão) + P por package |
| **FE-013** · Fontes inconsistentes (Inter/DM Sans/Fraunces+Outfit/sistema) | LOW | **MEDIUM** | ⚠️ Severity sub-estimado | Se houver embedding (`AppEmbed.jsx` no dashboard sugere padrão), todas as fontes carregam em simultâneo — bundle inflado, FOUT. Inter + JetBrains Mono é o canónico CLAUDE.md mas v5 tem decisão explícita Fraunces+Outfit (justificável: V5 tem identidade visual própria). Resolução não é "todos para Inter" — é definir regras claras: app de produto (V5) pode divergir, apps de gestão devem usar canónico. | S (ADR de tipografia) + M (implementação por app) |
| **FE-014** · `apps/truth/` usa Tailwind como outlier único | LOW | LOW | ✅ Confirmado | OK como Low. Mas precisa de decisão arquitectural: Tailwind é o futuro padrão (e migrar tudo) ou exception (e justificar em ADR)? Como FE-001 vai consolidar para `packages/ui` com tokens CSS vars, Tailwind em truth pode coexistir (Tailwind consome CSS vars). Recomendação: manter Tailwind em truth como exception com ADR explícita. | S (ADR + comentar em CLAUDE.md) |

---

## Debts em Falta (adicionar ao draft)

### FE-015 · Performance / Bundle Size sem auditoria — HIGH · Frontend

**Severity:** High
**Descrição:** Zero apps têm baseline de Lighthouse, zero apps documentam bundle size ou code splitting. v5-manutencao é produção activa em mobile (Capacitor planeado Fase 7) — sem análise de performance. v2-condominios serve condóminos em prataowners.pt. Dashboard tem 40+ hooks custom e 49+ views routadas — provavelmente bundle pesado mas nunca medido. Nenhum `vite-plugin-bundle-analyzer` ou equivalente configurado.
**Impacto:** Performance degradada em mobile (V5) e em conexões fracas. Possível impacto SEO (V2 público). Sem medição, regressões passam despercebidas a cada feature nova. Capacitor (V5 Fase 7) vai amplificar problemas de bundle.
**Esforço:** M (configurar `rollup-plugin-visualizer` em todas as apps + baseline Lighthouse + threshold em CI)
**Dependências:** Paralelo a FE-005 (React Query pode reduzir refetches mas não bundle). Bloqueia decisão "podemos lançar V5 mobile?".

---

### FE-016 · Zero Error Boundaries / Loading States inconsistentes — HIGH · Frontend

**Severity:** High
**Descrição:** Nenhuma app declara `<ErrorBoundary>` (React 19 tem-na nativa via `componentDidCatch` mas tem que ser configurada). Sem fallback UI quando uma view crasha — utilizador vê página em branco. Loading states são `useState(loading)` ad-hoc em cada hook — sem skeleton screens partilhados, sem padrão de "empty state" partilhado (v5 tem "Honestidade Radical" só dela, é boa prática mas não exportada). Sem padrão de retry em fetches falhados.
**Impacto:** UX em falha de rede ou erro de runtime é "página em branco" — pior cenário UX. Em V2 produção (prataowners.pt) condómino em mobile com 3G fraca vê app aparentemente quebrada. Suporte cresce.
**Esforço:** M (componente `<ErrorBoundary>` partilhado em `packages/ui` + skeleton screens + adopt em layout shells)
**Dependências:** Pode ser feito em paralelo a FE-001. Bloqueia migração para React Query (FE-005) — error boundaries devem existir primeiro.

---

### FE-017 · Mobile / Responsive sem auditoria nem breakpoints partilhados — HIGH · Frontend

**Severity:** High
**Descrição:** V2 (prataowners.pt) serve condóminos em mobile mas zero evidência de testing responsive sistemático. V5 (mobile-first declarado) tem decisões mobile-specific mas sem documentação de breakpoints. Nenhuma app exporta breakpoints como tokens (ex: `--bp-sm: 640px`). Cada app define media queries ad-hoc. Capacitor (V5 Fase 7) amplifica problema — webview em iOS/Android tem viewports específicos.
**Impacto:** UX inconsistente entre desktop e mobile. Bugs de layout específicos de viewport vão emergir em produção. Sem breakpoints partilhados, qualquer mudança de design exige decisão repetida.
**Esforço:** M (auditoria de cada app em viewports padrão + definir `packages/ui/breakpoints.css` + adopt incremental)
**Dependências:** Co-resolve com FE-001 (tokens) — breakpoints são tokens.

---

### FE-018 · Zero testes frontend (Vitest, RTL, Playwright) — HIGH · Frontend

**Severity:** High
**Descrição:** Não há evidência de configuração de Vitest, React Testing Library ou Playwright em qualquer `apps/*/package.json` `[unverified]` (validar em Phase 8 se há `tests/` ou `*.test.jsx`). 5 implementações de auth, 5 design systems, 22+ views em v2, 40+ hooks no dashboard — refactorings sem rede de segurança. Brownfield Discovery sem testes é refactoring "à fé".
**Impacto:** Cada uma das remediações Phase 2/3 (Structural/Long-term) carrega risco enorme. Migração de v5 para `@proptech/auth` sem testes é roleta russa. Consolidação de design system sem snapshot tests vai gerar regressões visuais não detectadas.
**Esforço:** L (introduzir Vitest + RTL em todas as apps + suite mínima por app: smoke tests + auth flow + 1 view principal) → G (suite completa após design system consolidado)
**Dependências:** Bloqueia execução segura de FE-001 (design system), FE-002 (auth), FE-004 (routing). Deveria ser **primeiro passo** das remediações Phase 2.

---

### FE-019 · Internacionalização hardcoded (zero i18n) — MEDIUM · Frontend

**Severity:** Medium
**Descrição:** Zero apps usam `i18next` ou `react-intl`. Strings PT-PT estão hardcoded em JSX em todos os ficheiros. Migração para multi-idioma (ex: PT-PT + ES quando V4 expandir, ou EN para clientes internacionais futuros) é custo enorme (>40 ficheiros por app). PropTech opera em Portugal hoje, mas o relatório estratégico V4 Energia menciona Spock.es (Espanha) — internacionalização não é hipotética.
**Impacto:** Risco futuro material. Decisão "lançamos em Espanha" hoje implica 6+ meses de extracção de strings. Sem keys, validação de PT-PT (vs PT-BR) é manual e propensa a erro.
**Esforço:** L (introduzir i18next em uma app piloto — v4 é simples — + tooling de extracção)
**Dependências:** Decisão de produto: vamos para Espanha? Se sim, prioridade sobe.

---

### FE-020 · `AppEmbed` em dashboard sem contrato/manifesto inter-app — MEDIUM · Frontend

**Severity:** Medium
**Descrição:** `apps/dashboard/src/views/AppEmbed.jsx` sugere padrão de iframe-embedding de outras verticais dentro do hub central (CookAI-style "Agent Command Center"). Mas não existe contrato formal: cada vertical tem que saber lidar com `window.parent !== window`, partilhar JWT, comunicar via `postMessage`, lidar com tema do parent. V2 detecta embed mode mas a especificação não está escrita. Risco de bug subtil em cross-origin/CORS.
**Impacto:** Cada nova vertical embedded reimplementa convenções (auth sync, tema sync, postMessage). Bug-by-bug fixing em vez de protocolo único. Inconsistência cross-vertical.
**Esforço:** M (ADR de embed contract + helper `@proptech/embed` package + documentar em CLAUDE.md)
**Dependências:** FE-001 (tokens) e FE-002 (auth) devem estar consolidados para que embed contract seja coerente.

---

## Top 3 Remediations Prioritárias

### Remediation #1 · Activar A11Y baseline em todas as apps (FE-003, parcial)

**Razão de ser primeiro:** É P/M de esforço, risco legal real (DL 83/2018 + V2 em produção), e desbloqueia confiança em todas as outras remediações.

**Passos concretos:**

1. Adicionar `<html lang="pt-PT">` em todos os `index.html` das apps:
   - `apps/dashboard/index.html`
   - `apps/v2-condominios/index.html`
   - `apps/v4-energia/index.html`
   - `apps/v5-manutencao/index.html`
   - `apps/truth/index.html`

2. Adicionar `eslint-plugin-jsx-a11y` a todos os `package.json` das apps + estender `.eslintrc.cjs`:
   ```js
   extends: ['plugin:jsx-a11y/recommended']
   ```

3. Criar `packages/ui/src/SkipToContent.jsx` (componente partilhado) e usar em layout shells:
   - `apps/dashboard/src/components/AppShell.jsx` (verificar nome real)
   - `apps/v2-condominios/src/App.jsx` (wrap children)
   - V4/V5: adoptar quando consolidarmos shells

4. Adicionar regra global de `:focus-visible` aos tokens canónicos (v2 já tem — extrair).

5. Configurar `axe-core` em CI para Vitest (parte de FE-018 antecipado):
   ```sh
   npm i -D @axe-core/react vitest-axe
   ```

**Ficheiros a alterar:** ~10 (5 index.html + 5 package.json + 1 eslint config + 1 component novo).
**Package a criar/expandir:** `packages/ui` ganha `SkipToContent` + `focus-visible.css` tokens.
**Esforço total:** 1-2 dias.

---

### Remediation #2 · Extrair tokens canónicos para `packages/ui/tokens` (FE-001, fase 1)

**Razão de ser segundo:** Desbloqueia todas as remediações de design (FE-010 tema, FE-013 fontes, FE-017 breakpoints) e é fundação de FE-001. Sem tokens partilhados, qualquer "consolidação" de design system é cosmética.

**Passos concretos:**

1. Criar `packages/ui/src/tokens/` com:
   - `colors.css` — paleta canónica light + dark (`--bg --surface --surface2 --border --text --muted --blue --green --gold --red --purple`) conforme CLAUDE.md root
   - `typography.css` — Inter + JetBrains Mono carregadas uma vez via `@font-face`
   - `radius.css` — 4px / 8px / 10-12px
   - `breakpoints.css` — sm/md/lg/xl como CSS vars + media queries reutilizáveis
   - `motion.css` — `--ease-default`, `--duration-fast: 150ms`, respect `prefers-reduced-motion`

2. Exportar em `packages/ui/src/index.js`:
   ```js
   export const tokens = './tokens/index.css'
   ```

3. Em cada app, substituir tokens locais por import:
   - `apps/v4-energia/src/styles/tokens.css` → re-export de `@proptech/ui/tokens`
   - `apps/v2-condominios/src/styles.css` → manter apenas o overlay "portal gold" como override
   - `apps/dashboard/src/index.css` → migrar `--primary #534AB7` para `--purple` canónico (ou justificar divergência em ADR)
   - `apps/v5-manutencao` — **decisão em ADR**: forest/emerald é divergência intencional. Manter mas via "theme override" de tokens canónicos.

4. Unificar chave `localStorage` para `proptech-theme` (FE-010 incluído).

5. Documentar tokens canónicos em `packages/ui/README.md` com exemplos light/dark.

**Ficheiros a alterar:** ~15 (5 ficheiros novos em packages/ui + 5 imports em apps + 5 limpezas).
**Package a criar/expandir:** `packages/ui` ganha sub-folder `tokens/`.
**Esforço total:** 1-2 semanas (decisão V5 forest/emerald em ADR pode demorar).

---

### Remediation #3 · Migrar V5 para `@proptech/auth` (FE-002 + FE-008 + FE-009)

**Razão de ser terceiro:** V5 é a app principal **viva** com a maior dívida combinada (auth fragmentada + demo accounts + state-based routing). Resolver auth desbloqueia FE-004 (routing) e reduz risco de FE-011 (TODOs em produção).

**Passos concretos:**

1. Auditar `apps/v5-manutencao/src/lib/AuthContext.jsx` vs `packages/auth/src/AuthContext.jsx`:
   - Identificar diferenças de API (`useAuth` retorna o quê?)
   - Identificar dependentes em V5 (`OnboardingWizardScreen` provável)
   - Documentar gap em comentário no PR

2. Migrar `App.jsx:10` para:
   ```jsx
   import { useAuth } from '@proptech/auth';
   ```
   Manter `./lib/AuthContext.jsx` como shim/wrapper durante 1 release.

3. Remover demo accounts (FE-009):
   - Apagar `App.jsx:6` (`DEMO_PESSOA_ID`, `DEMO_ORGANIZATION_ID`)
   - `grep -r "DEMO_PESSOA_ID\|DEMO_ORGANIZATION_ID"` no projecto, fixar todos os usos
   - Confirmar que nenhum flow de onboarding cai nestes IDs

4. Garantir que `mainClient` e `coreClient` de V5 (em `supa.js`) são compatíveis com `<AuthProvider mainClient={...} coreClient={...}>`. Adicionar `V5AuthSync` se houver schemas extra (semelhante a `V2AuthSync`).

5. Smoke test em Vercel Preview (`proptech-v5-alpha` branch preview):
   - Login/logout
   - Onboarding wizard
   - is_staff / role detection
   - JWT refresh

6. Após validação Mário em Preview → merge a `main` (segue Regra D2/D3 do CLAUDE.md).

**Ficheiros a alterar:** ~5-8 em V5 (App.jsx, supa.js, OnboardingWizardScreen.jsx, package.json se houver versão pinning).
**Package a criar/expandir:** `packages/auth` pode precisar de novo export `<V5AuthSync>` se V5 usar schemas extra.
**Esforço total:** 2-3 dias com testes manuais. Acelera se FE-018 (testes frontend) for feito antes — passa a 1 dia.

---

## Recomendação para Phase 8 (final)

O architect-proptech deve incorporar no documento final:

### Mudanças obrigatórias

1. **Re-classificar severities:**
   - FE-004 (Routing): HIGH → **CRITICAL** (V5 produção sem URL)
   - FE-007 (apps/core órfão): HIGH → **MEDIUM** (lixo sem risco real)
   - FE-009 (Demo accounts): MEDIUM → **HIGH** (dados demo em produção)
   - FE-011 (TODOs 2026-05-05): MEDIUM → **HIGH** (bugs visíveis em produção)
   - FE-013 (Fontes): LOW → **MEDIUM** (impacto em embedding)

2. **Adicionar 6 debts em falta:** FE-015 a FE-020 (performance, error boundaries, mobile, testing, i18n, embed contract).

3. **Decompor FE-001 em 3 sub-fases** com esforço por fase (tokens 1-2 sem · primitives 3-4 sem · migration 6-8 sem). XL monolítico não é executável.

4. **Adicionar dependência crítica em FE-018 (testes)** como **pré-requisito** das Fases Structural e Long-term. Sem testes, refactor de auth/routing/design system é refactor cego.

5. **Remover duplicação FE-006 ↔ ARCH-005** — manter uma como referência cruzada.

### Mudanças recomendadas no Sumário Quantitativo

Re-calcular tabela:

| Severity | Count actual | Count revisto |
|----------|--------------|---------------|
| Critical | 8 (Frontend: 2 → 3) | 9 (Frontend: 3 com FE-004) |
| High | 16 (Frontend: 6 → 8) | 18 (Frontend: 8 com FE-015, FE-016, FE-017, FE-018; FE-007 cai) |
| Medium | 12 (Frontend: 3 → 5) | 14 (Frontend: 5 com FE-013, FE-019, FE-020; FE-007 sobe) |
| Low | 5 (Frontend: 4 → 2) | 3 (Frontend: 2 com FE-013 a sair) |
| **Total** | 41 | **44** |

### Mudanças na secção "Recomendações Estratégicas"

**Fase 1 — Quick Wins (1-2 semanas):**
Adicionar:
- **FE-007** (eliminar apps/core/v1-core) — confirmar P (não G).
- **FE-009** (remover demo accounts V5) — promover de Quick Win porque agora é HIGH.
- **A11Y baseline** (Remediation #1 deste review) — novo item: 1-2 dias, ROI imediato.

**Fase 2 — Structural (2-6 semanas):**
Adicionar antes dos outros itens:
- **FE-018 (Testing baseline)** — pré-requisito de tudo o resto. 1 semana.
- **Tokens canónicos em `packages/ui`** (Remediation #2) — 1-2 semanas, desbloqueia design system.
- **Migrar V5 para `@proptech/auth`** (Remediation #3) — 2-3 dias após Testing baseline.

**Fase 3 — Long-Term (6+ semanas):**
Adicionar:
- **FE-015 (Performance baseline)** — 1 semana.
- **FE-016 (Error boundaries + skeleton)** — 1-2 semanas após design system.
- **FE-017 (Mobile / responsive auditoria)** — co-resolve com FE-001 fase 1.
- **FE-019 (i18n)** — só se decisão "Spock.es / Espanha" for tomada.
- **FE-020 (Embed contract)** — depois de FE-001/FE-002 consolidados.

---

*Produzido por Uma (aiox-ux) · 2026-05-23 · Phase 6 Brownfield Discovery*
*Inputs: technical-debt-DRAFT.md + frontend-spec.md*
*Próximo: Phase 7 — QA Review (architect incorpora reviews + qa valida)*
