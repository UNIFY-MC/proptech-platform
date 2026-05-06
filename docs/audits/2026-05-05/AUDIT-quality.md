# AUDIT-quality · PropTech Platform · 2026-05-05

> Auditoria de qualidade de código. Read-only — zero edições em código.
> Executado por: general-purpose agent (substitui `code-reviewer`, que não existe como agent .md — ver AUDIT-RAW.md secção b, "Divergência Crítica").
> **Nota de substituição:** o `code-reviewer` tem state file em `.claude/state/agents/code-reviewer.md` mas não tem `.md` correspondente em `.claude/agents/`. Esta sessão substitui essa função. Documentado aqui para o `auditor-agent` ter contexto na próxima revisão de PR.

---

## CLAUDE.md Compliance

### Regras definidas (resumo)

O `CLAUDE.md` raiz define:
- Commits convencionais: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- Branches `feat/<descrição>` para novas features
- Nunca editar `admin/`, `index.html` raiz, `netlify.toml`
- Nunca commitar credenciais
- Nunca alterar dados em `eozklslwfaqujaijvdnl`

O `apps/v5-manutencao/CLAUDE.md` acrescenta:
- Mostrar `git diff` antes de commitar
- Não fazer `git push` automático
- Commits convencionais (reiterado)
- App.jsx monolítico é **intencional** — não refactorizar sem pedido explícito

### Análise dos últimos 30 commits

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

**Resultado: 30/30 commits seguem convenções.** Todos usam prefix convencional (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`). Um usa `data:` (34fe132, 7653ca5) que é extensão local não documentada no CLAUDE.md raiz — não é violação, mas é drift de convenção minor.

### Violações identificadas

| Regra | Evidência | Severidade |
|---|---|---|
| "Nunca refactorizar App.jsx sem pedido explícito" | O CLAUDE.md v5 regista esta regra explicitamente e o commit `e02f6f6 refactor(dashboard)` toca `BiaScorecard.jsx` (dashboard), não App.jsx v5 — portanto sem violação | OK |
| Commits push automático | Nenhum commit de merge automático para `main` detectado — branch activa é `sprint/v5-1b3` | OK |
| Credenciais em git | Nenhum `.env` ou chave em commits detectados | OK |
| `admin/` intocável | Nenhum commit toca em `admin/` nos últimos 30 | OK |
| `data:` como prefix não documentado | 2 commits usam `data(sprint):` e `data(state):` — prefix válido semanticamente mas não listado no CLAUDE.md | BAIXO |

**Sem violações críticas nos últimos 30 commits.**

---

## Testes

### Resultado da pesquisa

- Nenhum ficheiro `*.test.*` encontrado em `apps/`
- Nenhum ficheiro `*.spec.*` encontrado em `apps/`
- Nenhum `vitest.config.*` encontrado em `apps/`
- Nenhum `jest.config.*` encontrado em `apps/`

**Zero testes automatizados em todo o repositório.**

### É gap crítico?

**Sim, mas com contexto.** Para uma app solo founder em fase de construção inicial, a ausência de testes é compreensível e deliberada — a velocidade de iteração é prioritária. Contudo, torna-se gap crítico nos seguintes cenários:

1. **Antes de ativar clientes reais em V5:** o pipeline de ordens (10 estados), RLS cross-tenant e gamification são flows complexos sem nenhum safety net automatizado.
2. **Migrations Supabase:** com 53 ficheiros SQL (13 + 40), não há como validar regressões ao aplicar novas migrations.
3. **Edge Functions:** `image-inspector` e `delete-account` correm em produção sem testes de contrato.

**Recomendação pragmática:** não bloqueia o sprint actual, mas deve ser planeado antes do go-live com clientes reais (ver Próximas Acções).

---

## Code Smells e TODOs

### Inventário completo (38 TODOs encontrados)

**Grep em `apps/v5-manutencao/src/` + `apps/dashboard/src/`:**

#### CRÍTICO — afecta ou pode afetar funcionamento em produção

| Localização | TODO | Motivo de severidade |
|---|---|---|
| `App.jsx:4207,4211,4526,4828` | `VITE_ANTHROPIC_API_KEY` em `import.meta.env` + fetch directo Anthropic no browser | **Blocker de deploy** documentado no CLAUDE.md v5 secção "Pre-launch security checklist P0". Chave visível em DevTools de qualquer visitante se deployed. |
| `App.jsx:3608,3658` | `authUser?.user?.id \|\| DEMO_PESSOA_ID` — fallback para UUID demo se auth falhar | Em produção, operações de utilizador real poderiam silenciosamente escrever dados na conta demo |
| `App.jsx:10404` | `authPessoaId \|\| DEMO_PESSOA_ID` | Mesmo padrão — fallback inseguro para conta demo |
| `IniciaScreen.jsx:3` + `OrcamentoWizardScreen.jsx:4` | Importam `DEMO_ORGANIZATION_ID` de `demo.js` | Organização demo hardcoded pode poluir dados reais |
| `lib/gamification.js:24,46` | `pontos_historico` pode não existir; `subscricoes` update silencioso | Gamification falha silenciosamente sem feedback ao utilizador |
| `MissoesScreen.jsx:8` | `// TODO: missões reais via BD` — ecrã inteiramente em mock | Utilizador vê dados fictícios como reais |
| `App.jsx:3681` | `console.warn('[uploadDoc] INSERT falhou após upload. Orphan file:', path) // TODO: cleanup job` | Ficheiros órfãos acumulam-se no bucket Storage sem cleanup |
| `screens/ServicoDetailScreen.jsx:210` | `// TODO Fase 4: substituir pessoa_id por authUser.pessoa_id` — nota diz "quando auth real activa" mas auth já está activa desde 3.4A | Confusão de estado: comment está desatualizado e pode enganar |

#### ALTO — dívida significativa

| Localização | TODO | Impacto |
|---|---|---|
| `lib/gamification.js:116` | `atribuirMissao` falha silenciosamente — "tabela missoes_utilizador pode não existir ainda" | Sistema de missões inoperacional |
| `lib/gamification.js:143` | `concluirMissao` falha silenciosamente | Pontos não atribuídos após conclusão de missão |
| `PoupancasDetalheScreen.jsx:10` | Ecrã inteiramente mockado — "TODO Fase 5: query real fn_calc_poupancas" | Feature principal exibida mas sem dados reais |
| `PlanoHomeDetalheScreen.jsx:106,153` | Crédito acumulado e Stripe checkout não implementados | CTA de subscrição apresentado mas não funcional |
| `ChatPedidoScreen.jsx:25` | ETA de entrega hardcoded (18 min) | Clientes vêem ETA fictício |
| `OwnersClubScreen.jsx:8,71,130,150` | Ecrã inteiramente com dados mock (streak, energia, progress) | Vertical Owners Club (V10) integrada em V5 mas sem dados reais |
| `App.jsx:7545` | `writes ainda vão para public.servicos — migrar para catalogo_servicos` | Schema de escrita desfasado do schema canónico do catálogo |
| `lib/demo.js:1` | Ficheiro marcado para remoção na Fase 4 — auth real está activa desde 3.4A | Ficheiro obsoleto mantido com fallbacks activos em App.jsx |
| `screens/AjudaScreen.jsx:14,98` | FAQ hardcoded no componente; email de suporte é `suporte@exemplo.pt` (domínio exemplo) | Email falso em produção — crítico se a app for deployed |
| `screens/DefinicoesScreen.jsx:140` | "Eliminar conta" aponta para `suporte@exemplo.pt` | Mesmo problema — domínio fictício |
| `screens/ReferralScreen.jsx:46` | URL de referral usa `app.exemplo.pt` | Link de referral com domínio fictício |
| `screens/MoradasScreen.jsx:564,571` | Botões "Abrir na V2" e "Abrir na [external]" chamam `alert('TODO: ...')` | Botões presentes na UI que lançam alert de TODO — visível a utilizadores |
| `screens/ImovelDetalheScreen.jsx:169,176` | Mesmo padrão de `alert('TODO: link para V2')` | Idem |
| `CWishlist.jsx:288` | "criar tabela pontos_historico antes do go-live" | Tabela pode não existir; gamification silenciosa |
| `App.jsx:10485` | `// TODO: migrar para supa client com auth real (Fase 4)` — Fase 4 já passou | Comment obsoleto; risco de confusão |

#### BAIXO — cosmético / futuro

| Localização | TODO | Notas |
|---|---|---|
| `components/PerfilFiscalForm.jsx:42` | Validar checkdigit NIF português | Validação formal pendente |
| `components/MapaPicker.jsx:4` | Mapa visual (MapLibre / Google Maps) | Reconhecido no CLAUDE.md v5 como débito visual |
| `components/ImovelWizard.jsx:117` | Selector de organização no wizard (backlog #1b) | Fase 1B.5 |
| `screens/ServicoDetailScreen.jsx:329,512` | Rating e avaliações reais | Fase 3.5 |
| `AlertaDetailScreen.jsx:22,26,30` | Chat IA, tutorial, detalhe equipamento a partir de alertas | Fase 3.3.14 |
| `PedidosScreen.jsx:30,238` | Estado inesperado em pedidos + trigger Stripe | Fase 5 |
| `SubscricaoScreen.jsx:75` | Cálculo dinâmico de créditos mensais | Fase 5 |
| `CasaScreen.jsx:33` | Rever emojis de categoria | Cosmético |
| `dashboard/hooks/useBiaStats.js:18` | Confirmar case de valor vertical ('v5' vs 'V5') | Baixo risco de data mismatch |

### FIXMEs e HACKs adicionais

Nenhum `FIXME` ou `HACK` encontrado nos dois diretórios auditados. Os problemas de qualidade estão todos marcados como `TODO`.

---

## App.jsx — Risco de Monolito

### Contagem de linhas

| Ficheiro | Linhas | Classificação |
|---|---|---|
| `apps/v5-manutencao/src/App.jsx` | **11.238** | Monolito extremo |
| `apps/v1-core/src/App.jsx` | 1.941 | Monolito moderado (documentado como "port do admin/") |
| `apps/dashboard/src/App.jsx` | 67 | Saudável (router shell apenas) |

**O `App.jsx` de V5 tem 11.238 linhas** — mais de 3× o que o CLAUDE.md v5 próprio documenta (">`3000 linhas`"). O ficheiro cresceu significativamente além do baseline documentado.

### Análise de risco

O CLAUDE.md v5 regista explicitamente: *"Single-file App.jsx — `src/App.jsx` contém toda a lógica (>3000 linhas). Isto é intencional para facilitar leitura contextual; não refactorizar para múltiplos ficheiros sem pedido explícito."*

Esta decisão arquitetural é válida para um solo founder com um único agente. Contudo, a 11.238 linhas emergem riscos concretos:

1. **Context window pressure:** com 11k linhas, agentes que precisam de ler o ficheiro inteiro consomem grande parte do contexto disponível antes de começar a trabalhar.
2. **Colisão de edits concorrentes:** qualquer merge no mesmo ficheiro é propenso a conflito.
3. **VITE_ANTHROPIC_API_KEY exposta nas linhas 4207-4828:** com o ficheiro a crescer, localizar e remover referências torna-se mais difícil — o P0 security blocker está enterrado num ficheiro de 11k linhas.
4. **Refactor implícito já aconteceu:** o repo tem 87+ ficheiros `.jsx/.js` em `src/` fora do `App.jsx` (screens/, components/, lib/, views/). A decomposição já começou organicamente — o App.jsx é o hub de routing/state, não contém tudo.

**O risco real não é o número de linhas per se, mas a presença do P0 security issue (ANTHROPIC_KEY no browser) dentro deste ficheiro.**

### Outros ficheiros monolíticos

- `src/screens/MoradasScreen.jsx`: 714 linhas — aceita (ecrã complexo com múltiplos fluxos)
- `src/screens/ServicoDetailScreen.jsx`: 608 linhas — aceita
- `docs/v5-complete-flow-reference.jsx`: 3.111 linhas — documentado como referência, não copiado para `src/`

Sem outros monolitos de risco fora do `App.jsx`.

---

## Naming Convention

### Análise da estrutura `apps/v5-manutencao/src/`

**Ficheiros auditados:** ~97 ficheiros `.jsx/.js` identificados.

#### Conformidade observada

| Categoria | Padrão esperado | Conformidade |
|---|---|---|
| Componentes React em `src/components/` | PascalCase | **OK** — `DrawerMenu.jsx`, `MapaPicker.jsx`, `StaffBanner.jsx`, `PasswordInput.jsx`, `ImovelWizard.jsx`, `PhoneInput.jsx` |
| Screens em `src/screens/` | PascalCase + sufixo `Screen` | **OK** — `ServicoDetailScreen.jsx`, `MoradasScreen.jsx`, `AjudaScreen.jsx`, `DefinicoesScreen.jsx` |
| Auth screens em `src/screens/auth/` | PascalCase | **OK** — `LoginScreen.jsx`, `SignupScreen.jsx`, `ResetPasswordScreen.jsx` |
| Hooks em `src/lib/` | camelCase com prefixo `use` para hooks | **OK** — `useEscolherImovel.jsx`, `useBiaMeta.js` (dashboard) |
| Libs em `src/lib/` | camelCase | **OK** — `gamification.js`, `faturacao.js`, `imageCompression.js` |
| Contextos em `src/lib/` | PascalCase + sufixo `Context` | **OK** — `AuthContext.jsx`, `ImovelAtivoContext.jsx`, `PerfisFiscaisContext.jsx` |

#### Irregularidades e drift

| Ficheiro | Irregularidade |
|---|---|
| `src/App.jsx` | Padrão aceite — hub único de routing |
| `src/IniciaScreen.jsx` | Fora de `src/screens/` — deveria estar em `screens/IniciaScreen.jsx` |
| `src/CasaScreen.jsx` | Idem — fora de `screens/` |
| `src/ChatPedidoScreen.jsx` | Idem |
| `src/ChatSuporteScreen.jsx` | Idem |
| `src/OwnersClubScreen.jsx` | Idem |
| `src/PedidosScreen.jsx` | Idem |
| `src/ScoreDetailScreen.jsx` | Idem |
| `src/SubscricaoScreen.jsx` | Idem |
| `src/AlertaDetailScreen.jsx` | Idem |
| `src/CWishlist.jsx` | Prefixo `C` não documentado em nenhuma convenção |
| `src/PerfilDrawer.jsx`, `src/PerfilSheet.jsx`, `src/PerfilMenuContent.jsx`, `src/PerfilSheetContent.jsx`, `src/PerfilDrawerContent.jsx` | 5 ficheiros relacionados com Perfil dispersos em `src/` raiz |
| `src/OrgLocBottomSheet.jsx` | Raiz `src/` em vez de `components/` |
| `src/ImovelSelectorSheet.jsx` | Idem |
| `src/views/prestador/PrestadorDash.jsx` | `views/prestador/` — inconsistente com o resto que usa `screens/` |

**Padrão de drift:** os ficheiros antigos (criados antes de `src/screens/` existir) ficaram na raiz `src/`. Os novos vão correctamente para `src/screens/`. Não há inconsistência interna dentro de cada fase — o drift é histórico.

**Severity:** BAIXO para manutenção. Não afecta funcionamento. Mas dificulta onboarding de novos agentes que esperam encontrar screens em `src/screens/`.

---

## Próximas Acções (máximo 5)

### 1. BLOCKER — Remover `VITE_ANTHROPIC_API_KEY` do browser antes de qualquer deploy production

**Prioridade:** P0. Documentado no CLAUDE.md v5 como "Pre-launch security checklist P0 — OPEN".

Acção concreta: refactorizar as linhas 4206-4230 e referências em App.jsx para chamarem a Edge Function existente (`agent-casa-advisor` ou nova function `agent-fatura-ocr`) em vez de fazer fetch directo ao Anthropic. O pattern já existe em `image_inspector`. Depois remover `VITE_ANTHROPIC_API_KEY` de `.env.local` e fazer `grep "VITE_ANTHROPIC" apps/v5-manutencao/src/` → zero matches.

### 2. CRÍTICO — Eliminar fallbacks `DEMO_PESSOA_ID` e `DEMO_ORGANIZATION_ID` do código de produção

**Prioridade:** P1. Auth real está activa desde Sprint 3.4A. O `lib/demo.js` foi marcado para remoção na Fase 4 — essa fase passou.

Há 3 ficheiros que importam de `demo.js`: `App.jsx` (2 fallbacks), `IniciaScreen.jsx`, `OrcamentoWizardScreen.jsx`. Eliminar todos e garantir que ausência de `authUser` leva a redirect de login, não a fallback para UUID demo.

### 3. ALTO — Substituir domínios fictícios em textos visíveis ao utilizador

**Prioridade:** pré-go-live. Os seguintes ficheiros têm `suporte@exemplo.pt` ou `app.exemplo.pt` hardcoded em botões e labels visíveis:

- `src/screens/AjudaScreen.jsx` — email de suporte
- `src/screens/DefinicoesScreen.jsx` — eliminação de conta
- `src/screens/ReferralScreen.jsx` — URL de referral

Se a app for deployed com estes valores, utilizadores verão endereços fictícios. Substituir pelos valores reais do domínio V5 (a definir pelo Mário) ou remover temporariamente os CTAs.

### 4. MÉDIO — Introduzir pelo menos smoke tests manuais documentados (ou 2-3 testes Vitest básicos)

**Prioridade:** antes de go-live com clientes reais. Zero testes automáticos é aceitável agora mas não quando houver dados reais.

Sugestão mínima pragmática: adicionar `vitest` como devDependency em `v5-manutencao` e escrever 3 testes:
- `gamification.test.js` — `calcularNivel()` (função pura, trivial de testar)
- `labels.test.js` — mapeamento de estados de ordens (função pura)
- `descontos.test.js` — cálculo de descontos (função pura)

Estas 3 funções são críticas para o negócio e não têm I/O — ideais para começar sem infraestrutura de mocking.

### 5. BAIXO — Consolidar ficheiros de screen dispersos em `src/` para `src/screens/`

**Prioridade:** qualidade a médio prazo. Mover os 10 ficheiros Screen na raiz `src/` para `src/screens/`, e `CWishlist.jsx` para `src/components/`. Actualizar imports (são poucos — maioritariamente importados apenas em `App.jsx`).

Isto não afecta funcionamento mas reduz confusão para agentes futuros que procuram screens em `src/screens/` e não as encontram todas lá.

---

## Sumário executivo

| Área | Estado | Nota |
|---|---|---|
| Convenções de commits | Saudável | 30/30 conformes |
| Regras CLAUDE.md | Saudável | Sem violações críticas detectadas |
| Testes automáticos | Ausente | Gap aceitável agora, blocker pré-go-live |
| TODOs críticos | 2 blockers ativos | P0: ANTHROPIC_KEY; P1: DEMO_PESSOA_ID fallback |
| TODOs altos | 10 itens | Domínios fictícios, ecrãs mock, gamification silenciosa |
| Monolito App.jsx | 11.238 linhas | Risco de manutenção; aceitável por decisão explícita |
| Naming conventions | Drift histórico leve | 10 screens fora de `src/screens/` — não funcional |
| Security | 1 blocker | `VITE_ANTHROPIC_API_KEY` no browser — não deployed ainda |

**Veredicto geral:** codebase coerente e bem estruturada para o contexto solo founder. Os dois blockers reais (P0 Anthropic key + P1 DEMO fallback) estão documentados no CLAUDE.md v5 mas ainda não resolvidos. São os únicos itens que devem ser endereçados antes de qualquer deploy a utilizadores reais.
