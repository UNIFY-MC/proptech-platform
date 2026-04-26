# v5-manutencao — Contexto para Claude Code

Este ficheiro é lido automaticamente pelo Claude Code a cada invocação. Mantém-se curto e actual.
**Última actualização:** 2026-04-26 · Sprint 3.4D em curso

---

⚠️ **MANUTENÇÃO DESTE FICHEIRO**

Actualizar SEMPRE em:
1. Fim de fase (X.Y fechada) → actualizar Resumo executivo + Decisões de design + Lições aprendidas
2. Decisão arquitectural nova (stack, padrão, anti-padrão) → actualizar Princípios ou Stack
3. Bug crítico descoberto → adicionar a Pontos de atenção
4. Refactor estrutural → actualizar secção afectada

Não esperar pelo fim do projecto. Cada commit que muda padrão estrutural deve incluir update CLAUDE.md no mesmo commit OU commit imediato a seguir. NÃO mexer no V5_MASTER.md (visão estratégica · estável).

---

## Resumo Executivo

### Concluído

| Sprint | Conteúdo |
|---|---|
| Fase 0 | Reset estrutural · monorepo · multi-tenant base |
| Sprint 3.3 | UI catálogo completa · 199 serviços · 4 combos BD · subscrições · descontos · FabSheet · Home onClicks · ServicoDetail 15 secções · Combos BD · OrçamentoWizard |
| **3.4A** | Auth core Supabase · LoginScreen + Signup + Recover · AuthContext · DEMO_PESSOA_ID eliminado de 26 ficheiros |
| **3.4B** | Onboarding wizard 5 steps · RPC fn_complete_onboarding atómica · cria org+membership+localizacao+perfil_fiscal · validação NIF PT · bloqueio total até conclusão |
| **3.4C** | RLS em core (23 tabelas) + v5_manutencao (39 tabelas) · helpers SECURITY DEFINER · cross-tenant validado · REVOKE anon em RPCs públicas · empty states honestos · pre_auth_* eliminado |
| **3.4D fix-ux #1** | primeiro_nome + apelidos em core.pessoas · wizard 2 campos · saudação usa primeiro_nome · PerfilDrawer actualizado |

### Em curso

- **3.4D** — SMTP Resend configurado (domain prataowners.pt) · email change in-app · password change in-app · GDPR account delete · RPC guards is_staff() · `.single()` audit

### Pendente

| Fase | Âmbito |
|---|---|
| 4 | Backoffice / staff panel |
| 5 | V5 features reais (poupanças, IA tips, histórico, métricas) |
| 6 | Prestador app (V6/V8/V9) |
| 6.5 | Admin panel multi-fase |
| 7 | Mobile (Capacitor) + App Store / Play Store |
| 8 | Migração utilizadores V2 reais |

---

## Projecto

**v5-manutencao** é a vertical de Manutenção & Limpeza da plataforma PropTech. Uma app React + Vite + Supabase que serve três tipos de utilizador (cliente, prestador, admin) num único SPA.

- **Caminho local**: `C:\Users\mario\dev\proptech-platform\apps\v5-manutencao`
- **Dev server**: `npm run dev` (porta 5175)
- **Build**: `npm run build` → `dist/`
- **Deploy**: Netlify (push ao `main` faz deploy automático quando ligado)
- **BD**: Supabase V1 Core Hub `hkmvszkpxjbxmnixzqbl` (URL e ANON_KEY em `.env.local`)

---

## Stack e arquitectura

- **React 18** com Vite 5
- **Supabase** para auth + BD + storage
- **Single-file App.jsx** — `src/App.jsx` contém toda a lógica (>3000 linhas). Isto é intencional para facilitar leitura contextual; não refactorizar para múltiplos ficheiros sem pedido explícito.
- **Sem router externo** — o routing é feito por state (`ecra`, `role`, etc.) dentro do `App`.
- **Estilos inline** — usa `style={{...}}` com uma constante `C = {...}` no topo como design tokens. Não usar Tailwind.
- **Fontes**: Fraunces (display, serif) + Outfit (body, sans) via Google Fonts.
- **Ícones**: lucide-react.

### SMTP (DEV — 3.4D)

- **Provider**: Resend (`smtp.resend.com:465`)
- **Domain verificado**: `prataowners.pt` (partilhado com V2 Condomínios)
- **Sender**: `info@prataowners.pt` (V5 Manutenção dev)
- **API Key**: variável `RESEND_API_KEY` em `.env.local` (não exposta no browser — sem prefixo `VITE_`)
- **Rate limit Supabase**: ~30 emails/hora · min interval per user: 60s
- **Produção Fase 7**: domínio dedicado `mail.<v5-domain>` a definir

### Auth helpers (3.4C)

Funções SECURITY DEFINER em schema `public` (PostgREST expõe automaticamente):

- `public.current_pessoa_id()` → UUID da pessoa logada (`auth.uid()` → `core.pessoas`)
- `public.current_organization_ids()` → `uuid[]` das orgs do utilizador via memberships
- `public.has_org_role(org_id uuid, roles text[])` → boolean
- `public.is_staff()` → boolean (3.4D — a implementar)

### Capacitor (preparação Fase 7)

Decisão: Capacitor sobre React Native (reutiliza 95% do código React).
Implicações que afectam código actual desde já:

- **Router**: BrowserRouter (não HashRouter)
- **Storage crítico**: `@capacitor/preferences` em vez de `localStorage` para dados persistentes
- **Safe areas**: `env(safe-area-inset-*)` em fixed headers/footers
- **Touch targets**: mínimo 44×44pt
- **Theme color meta tag**: deve coincidir com verde brand (`#0B3D2E`)
- **Deep links**: schema custom `v5manutencao://` para links de email
- **Push notifications**: registar token device em `core.pessoas.metadata` (Fase 7)

---

## Paleta canónica (design tokens)

```js
const C = {
  forest: "#0B3D2E", forestDeep: "#072819", forestSoft: "#164E3A",
  emerald: "#10B981", emeraldDark: "#059669", emeraldBright: "#22C55E",
  emeraldSoft: "#D1FAE5", emeraldPale: "#ECFDF5",
  cream: "#FAFAF6", paper: "#FFFFFF",
  ink: "#0A1620", stone: "#6B7685", stoneLight: "#E5E7EB", line: "#ECE9E2",
  amber: "#F59E0B", amberSoft: "#FEF3C7",
};
```

---

## Estado do catálogo

- **199 serviços** em 8 categorias (limpeza, manutenção, jardim, piscina, pintura, elétrica, canalização, pós-obra)
- **11 grupos-pai** com variantes (tipologia/tamanho) — ex: `cln-home` tem t1/t2/t3/t4, `cln-move` tem t1/t2/t3/t4, `mnt-xmas-lights` tem interior/exterior/full
- **36 serviços variantes** ligados a grupos-pai via `servico_pai_id`
- **8 templates de frequência** configuráveis via admin (tabela `frequency_templates`)
- **166/166 com detalhe rico (100%)**: tagline, inclui, nao_inclui, duracao_tipica, faq (exclui os 11 grupos-pai — esses têm detalhe próprio orientado a ecrã de agrupamento, não a checkout)
- **45 subcategorias** incluindo a nova **Sazonal e festivo** (`mnt_sazonal` — Natal, decorações) e **Segurança doméstica** (`mnt_seguranca` — baby proofing)
- Ver `docs/CATALOGO-COMPLETO.md` para tabela completa

---

## Documentos de referência

- `docs/TASK-fluxo-completo.md` — 8 fases de implementação (Fase 1 a 8)
- `docs/CATALOGO-COMPLETO.md` — catálogo completo por categoria, com IDs e preços
- `docs/v5-complete-flow-reference.jsx` — demo visual de referência (3111 linhas, NÃO copiar para src/)
- `supabase/migrations/20260422_catalogo_completo.sql` — migração completa e idempotente (21 secções)

---

## Guard-rails absolutos (NÃO TOCAR)

1. **Preservar sempre** a autenticação Supabase, rotas de role (cliente/prestador/admin), integração do chat, pipeline de estados das ordens.
2. **Nunca refactorizar** o `App.jsx` monolítico em múltiplos ficheiros sem pedido explícito.
3. **Nunca eliminar** os botões de demo (Cliente / Prestador / Admin) no login — são essenciais para testes rápidos.
4. **Nunca apagar nem fazer TRUNCATE** em tabelas Supabase. Migrations são sempre aditivas (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO UPDATE`).
5. **Nunca commitar** ficheiros com credenciais. `.env.local` está no `.gitignore`.
6. **Nunca fazer `git push`** — deixar ao Mario decidir quando empurrar.
7. **Não tocar** nos textos e fluxos do admin e do prestador (só adicionar módulo novo na Fase 6, sem alterar o existente).
8. **Copy em português de Portugal** (não PT-BR): "escolha", "serviço", "morada" (não "endereço"), "técnico".

---

## Princípios fundamentais (UX V5)

### Honestidade Radical

Princípio aplicado a partir de 3.4C — **zero como ponto de partida visível, não escondido**:

- Sem promessas estáticas tipo "até X%" — só dados reais do utilizador
- Empty states explicam valor, não mostram vazio inerte
- Estados de score: `null` → "Casa por avaliar 🏠" (neutro), NÃO "Casa em Risco 🚨" (alarme falso para utilizador novo)
- Comparações ano-a-ano: omitir quando denominador é zero
- `useState(null)` para distinguir loading / empty / zero legítimo
- Aplicar a: Score, Poupanças, Pontos, Streak, Histórico, Pedidos

**Exemplo concreto:** utilizador novo vê `"0€ · Sobe a cada serviço"` (motivação real), não `"0€ · até 30% economia"` (promessa vazia).

### Anti-padrões PROIBIDOS

Lições aprendidas em 3.4C audit — nunca introduzir:

- `DEMO_*`, `MOCK_*`, `FAKE_*`, `HARDCODED_*` fora de testes/storybook
- Fallback arrays em renderização (`[90,65,80,50,68][i]` etc.)
- `useState` com valor não-zero/não-null que pareça dado real
- Mock data partilhado entre utilizadores (todos vêem os mesmos pedidos/poupanças)
- `.single()` sem garantia de ≥1 row — usar `.maybeSingle()`
- Funções RPC `SECURITY DEFINER` com `GRANT anon` sem guard interno (`auth.uid() IS NOT NULL`)

---

## Pontos de atenção

### RLS audit checklist obrigatório (lição 3.4C)

ANTES de fechar qualquer fase que aplique/altere RLS:

1. `grep -rn "DEMO_\|MOCK_\|FAKE_\|HARDCODED_" src/` → deve dar 0 matches
2. Auditar TODAS as views (regulares e materialized) sem RLS explícita
3. Auditar TODAS as funções RPC SECURITY DEFINER:
   ```sql
   SELECT n.nspname, p.proname, p.prosecdef
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname IN ('core','v5_manutencao','public');
   ```
   → cada uma deve ter guard `auth.uid() IS NOT NULL` ou `is_staff()` interno
4. Cross-tenant test: criar 2º utilizador, validar que NÃO vê dados do 1º (Network tab + Response inspection)
5. Testar UI com utilizador novo (sem histórico) — não pode ver mocks
6. `NOTIFY pgrst, 'reload schema';` após cada batch de policies

### Naming PostgREST embed (lição 3.4C bugs)

Sintaxe correcta para foreign embed:

```js
// ERRADO — PostgREST procura tabela chamada "servico_id" (não existe):
.select('ordem, servico:servico_id(id, nome)')

// CORRECTO — embed por nome da tabela destino:
.select('ordem, servico:catalogo_servicos(id, nome)')
```

### Race condition authUser bridge (lição 3.4D)

O bridge `session → authUser` em App.jsx pode disparar antes de `pessoa` carregar do BD.
Fix: segundo `useEffect` que actualiza `authUser.nome` quando `pessoa?.nome` muda.
Para saudações e display, usar sempre `useAuth().pessoa.primeiro_nome` directamente — não depender do bridge.

---

## Pre-launch checklist (antes do primeiro cliente real)

- [x] ~~Implementar auth real~~ ✅ 3.4A
- [x] ~~Policies pre_auth_*~~ ✅ removidas em 3.4C
- [ ] Reset da sequência de ordens:
      `ALTER SEQUENCE ordens_numero_seq RESTART WITH 1;`
      `TRUNCATE ordens_trabalho RESTART IDENTITY CASCADE;`
- [ ] Remover contas demo do Supabase Auth:
      `admin@demov5.pt` · `prestador@demov5.pt` · `cliente@demov5.pt`
      · `maria.santos@v5demo.pt` · `rls-test@v5demo.pt`
- [ ] Limpar contas de teste (`*@v5demo.pt`, `*+v5test*`)
- [ ] SMTP: mudar sender para domínio dedicado (não `prataowners.pt`)
- [ ] DROP colunas órfãs da tabela `ordens`:
      `ALTER TABLE ordens DROP COLUMN descricao_cliente;`
      `ALTER TABLE ordens DROP COLUMN notas_cliente;`
      `ALTER TABLE ordens DROP COLUMN nota_cliente;`
- [ ] Concluir Task E 3.4D: `REVOKE anon` de `fn_complete_onboarding`
- [ ] Concluir Task D 3.4D: `fn_delete_account` GDPR

---

## Supabase — tabelas

### core schema (V1 Core Hub · `hkmvszkpxjbxmnixzqbl`)

- `core.pessoas` — auth_user_id, nome, **primeiro_nome**, **apelidos**, email, nif, telemovel
- `core.organizations` — tipo (individual/empresa/condominio/gestor_imoveis), nome, nif
- `core.memberships` — pessoa_id, organization_id, role (owner/admin/member)

### v5_manutencao schema

Tabelas principais:
- `profiles` (users), `prestadores`
- `ordens_trabalho` (com pipeline de 10 estados), `mensagens_chat`
- `categorias`, `subcategorias`
- `catalogo_servicos` (com `servico_pai_id` para grupos e `frequency_template` para recorrência) — colunas novas: `imagem_url`, `imagem_alt`, `popular`, `sub_grupo`
- `servico_variacoes`, `servico_extras`
- `frequency_templates` (8 templates configuráveis)
- `v5_manutencao.servicos_inclui_exclui` — inclui/exclui por serviço (228 rows para 7 serviços top)
- `v5_manutencao.servicos_faq` — FAQ por serviço
- `v5_manutencao.platform_stats` — KPIs da plataforma (5 stats)
- `v5_manutencao.combos` + `combo_servicos` — packs de serviços
- `v5_manutencao.planos_subscricao` + `descontos_config`
- `v5_manutencao.localizacoes`, `perfis_fiscais`, `equipamentos`
- `v5_manutencao.pedidos_orcamento`, `orcamentos_recebidos`
- `v5_manutencao.subscricoes`, `prestadores_equipa_cliente`

Colunas novas em `ordens_trabalho`:
- `metadata` JSONB — guarda opções dinâmicas escolhidas pelo cliente (produtos, frequência, preço efectivo)
- `slots_flexiveis` JSONB, `schedule_mode` TEXT, `notas_cliente`, `fotos_cliente`, `faturacao_*`, `metodo_pagamento`, `promo_code`

---

## Workflow técnico

1. Antes de editar `App.jsx`, fazer `grep` da secção que se vai alterar para confirmar âncoras.
2. Depois de cada alteração grande, correr `npm run build` para garantir que não quebrou.
3. Commits convencionais: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
4. Não fazer `git push` automático.
5. Mostrar `git diff` e esperar aprovação antes de `git commit`.

---

## Estado das fases (actualizado 2026-04-26)

| Fase | Estado | Notas |
|---|---|---|
| 3.3.7 | ✅ fechada | 22 ecrãs visuais + reorg menus + selector de imóvel |
| **3.3.8** | ✅ fechada | Schema BD (11 tabelas novas, 3 ALTERs) + seed multi-imóveis Maria |
| **3.3.9** | ✅ fechada | Todas as screens ligadas à BD real; MOCK removido de App.jsx; States.jsx criado |
| **3.3.10** | ✅ fechada | Hotfix pós 3.3.9 |
| **3.3.11** | ✅ fechada | Perfis fiscais por imóvel + snapshot fiscal nas ordens |
| **3.3.12** | ✅ fechada | Imóvel como entidade central: GPS + CRUD completo + ImovelDetalheScreen |
| **3.3.13** | ✅ fechada | Orçamentos à medida (flow visual 4 steps) + CategoriaScreen enriquecida + AlertActions Shipshape |
| **3.3.14** | ✅ fechada | Tab memory + EscolherImovelSheet + orcamentos BD real + SmartPromptsSheet + completude |
| **3.3.14-fix-ux1** | ✅ fechada | Combos UI + HeroHeader + layout ServicosScreen |
| **3.3.14-fix-ux2** | ✅ fechada | IniciaScreen hero redesign + smart shortcuts |
| **3.3.14-fix-ux3** | ✅ fechada | Combos BD real + search bar debounce + 9ª cat Packs + 22 serviços novos (199 total) |
| **3.3.14-fix-ux4** | ✅ fechada | ServicoDetailScreen redesign 15 secções + inclui/exclui BD + stats + imagens Unsplash + FAQ |
| **3.3.14-fix-ux5** | ✅ fechada | Configurador variações + planos frequência + thumbnails CategoriaScreen |
| **3.3.14-fix-ux6** | ✅ fechada | Packs banner dourado + combos ligados BD + urgência clickável + Plano Home+ MVP + MaisContratados fix |
| **3.3.14-fix-ux7** | ✅ fechada | planos_subscricao + descontos_config BD · CombosScreen BD · ServicosListaScreen · desconto Home+ no CTA |
| **3.3.14-fix-ux8** | ✅ fechada | Packs fonte única BD · nav back stack (router.js) · BottomNav universal · imagens pool+hash · combos imagem_url |
| **3.3.14-fix-ux9** | ✅ fechada | FAB redesign (sem PEDIR) · FabSheet 5 secções · 5 novos ecrãs (Emergência, AIExpertFab, Câmara, Doc, Energia) |
| **3.3.14-fix-ux10** | ✅ fechada | Home onClicks · serviços pop BD · equipa BD · missões · poupanças · AI Expert pergunta_inicial |
| **3.3.14-fix-ux11** | ✅ fechada | Serviços populares HomeScreen · preco_base→preco · useState null robustness |
| **3.3.14-fix-ux12** | ✅ fechada | Scroll-to-top universal · ServicosListaScreen error handling · 3 screens catch |
| **Sprint 3.3** | ✅ **FECHADA** | 8 fases base + 12 fix-ux (ux1–ux12) · 199 serviços · 4 combos BD · subscrições · descontos |
| **3.4A** | ✅ **fechada** | Auth core: LoginScreen + Signup + Recover + AuthContext + DEMO_PESSOA_ID → useAuth() |
| **3.4B** | ✅ **fechada** | Onboarding wizard 5 steps · RPC fn_complete_onboarding · needsOnboarding bloqueante |
| **3.4C** | ✅ **fechada** | RLS todas as tabelas (core 23 + v5_manutencao 39) · helpers SECURITY DEFINER · multi-org switcher · OrgLocBottomSheet · REVOKE anon RPCs · empty states honestos |
| **3.4D fix-ux #1** | ✅ **fechada** | primeiro_nome+apelidos em core.pessoas · wizard 2 campos · saudação usa primeiro_nome · PerfilDrawer actualizado |
| **3.4D** | **EM CURSO** | SMTP Resend (prataowners.pt) · email change · password change · GDPR delete · RPC guards is_staff() · .single() audit |

---

## Notas para 3.3.12

- `localizacoes` tem: `num_quartos`, `num_wcs`, `num_pisos`, `foto_principal_url` (novos) + `coords` (point, já existia)
- `coords` formato Postgres `point`: `"(lng,lat)"` — usar `pointToCoords()` e `coordsToPoint()` em `src/lib/geocoding.js`
- Geocoding via Nominatim (gratuito, rate-limited) — TODO(mario): migrar para Google Maps API em volume
- `ModalEditarImovel` exportado de `MoradasScreen.jsx` — usado também em `ImovelDetalheScreen.jsx`
- `ImovelDetalheScreen` acessível via: header imóvel activo (IniciaScreen), card em MoradasScreen, ecra `imovel_detalhe`
- `moradaCurta()` e `moradaCompleta()` adicionados a `src/lib/labels.js`
- Seed 3 imóveis Maria: tipologia, área, quartos, WCs, pisos, GPS backfilled via migração `v5_3_3_12_imovel_rico`
- `localizacoes.tipo` CHECK real: `habitacao | condominio | empresa | segunda_habitacao`
- **Mapa visual removido** (react-leaflet incompatível React 18 — erro `render2 is not a function`): `MapaPicker` substituído por inputs lat/lng + GPS actual. `ImovelDetalheScreen` mostra coords + link Google Maps em vez de mapa embed.

## Notas para 3.3.13

- Screens novos: `OrcamentosLandingScreen`, `OrcamentoWizardScreen` (4 steps), `OrcamentoConfirmadoScreen`
- Mock data em `src/data/mock.js`: `MOCK_ORCAMENTOS_AREAS`, `MOCK_ORCAMENTOS_FORMATOS`, `MOCK_ALERTAS_ENRIQUECIDOS`
- `AlertaDetailScreen` reescrito: mostra lista completa MOCK_ALERTAS_ENRIQUECIDOS (Shipshape style) + acções 1-toque
- `CategoriaScreen` enriquecida: hero + badges 2x2 + CTA orçamento + sobre + relacionados + reviews + FAQ

## Notas para 3.3.14

- `pedidos_orcamento.estado` CHECK: `aberto | em_cotacao | cotado | aceite | cancelado | expirado`
- `pedidos_orcamento.organization_id` NOT NULL — usar `DEMO_ORGANIZATION_ID` nos seeds
- `EscolherImovelSheet` + `useEscolherImovel` hook em `src/components/` e `src/lib/`
- `SmartPromptsSheet` persiste respostas em `contexto_servico` (UNIQUE por localizacao+categoria)
- `completude.js` calcula score 0-100% baseado em 10 campos com pesos; cor: verde ≥80%, âmbar ≥50%, vermelho <50%
- `ImovelAtivoContext` agora tem: `imovelAtivoPorTab`, `setImovelAtivoForTab`, `onTabChange`, `resetParaPrincipal`

## Notas para 3.3.14-fix-ux3

- `v5_manutencao.combos` carregados da BD (não mock): `preco_combo`, `preco_normal`, `cor_hex`, `emoji`, `sub`, `desconto_pct`, `servicos_ids`, `descricao_longa`
- `adaptCombo(bdRow)` → formato card; `adaptComboForDetail(bdRow)` → ComboDetailScreen
- Search bar com debounce 300ms, dropdown com resultado + card rosa "Orçamento personalizado"
- `ServicosScreen.jsx` migrado para ficheiro separado (~290 linhas)

## Notas para 3.3.14-fix-ux6

- **BD**: criada `v5_manutencao.combo_servicos` (combo_id UUID FK combos, servico_id UUID FK catalogo_servicos, ordem INT); `combos` ganhou `cor_texto TEXT DEFAULT '#1B4332'`
- **`src/lib/descontos.js`**: `getDescontoAplicavel(pessoaId, valorBase)` — lê `subscricoes`, devolve `{ tipo, label, pct, credito_eur }`
- **`src/screens/PlanoHomeDetalheScreen.jsx`**: ecrã full-screen Plano Home+; CTA desactivado (Stripe futuro)

## Notas para 3.3.14-fix-ux8

- **Nav back stack**: criado `src/lib/router.js` com `useNavStack()` hook
- **BottomNav universal**: `BNav` e `FabPickerModal` fora do bloco `{!cliOver}`; renderizados condicionalmente com `ecra !== 'orcamento_wizard'`
- **`src/lib/imagens.js`**: `POOL_POR_SUB_GRUPO` (28 sub-grupos) + `hashStr()` determinístico

## Notas para 3.3.14-fix-ux9

- **FabSheet**: `FabPickerModal` reescrito com 5 secções — Emergência + grid Pedir + AI Expert + Adicionar à casa + descrição livre
- **Screens novos**: `EmergenciaScreen`, `AIExpertFabScreen`, `AdicionarCamaraScreen`, `AdicionarDocScreen`, `AdicionarEnergiaScreen`

## Notas para 3.3.14-fix-ux10

- **IniciaScreen**: `SERVICOS_POP` e `EQUIPA` hardcoded removidos; queries BD para serviços popular, equipa, combos
- **BD**: `prestadores` ganhou `bio`, `especialidades` jsonb, `verificado`, `ordem`; criada `prestadores_equipa_cliente`
- **SQL**: `sql/13_v5_3_3_14_ux10_equipa.sql`

## Notas para 3.4A — Auth core Supabase

- **`AuthProvider`** em `src/lib/AuthContext.jsx` — expõe `session`, `pessoa`, `pessoa_id`, `authenticated`, `loading`, `signOut`, `refreshPessoa`
- **Auth screens** em `src/screens/auth/`: `LoginScreen`, `SignupScreen`, `ConfirmEmailPendingScreen`, `ConfirmEmailScreen`, `RecoverPasswordScreen`, `ResetPasswordScreen`
- **`DEMO_PESSOA_ID`** deprecated: substituído por `useAuth().pessoa_id` em 26 ficheiros
- **Bridge `useEffect`** em App.jsx: session real → `authUser` compatível (manter componentes que recebem `authUser` prop)
- **`supa.js`**: `detectSessionInUrl: true`, `flowType: 'pkce'`
- **SQL**: `sql/14_v5_3_4_auth.sql` — `core.pessoas.auth_user_id`, `email_verified`, `ultimo_login`
- **Contas demo** (Login rápido de teste):

| Role      | Email                    | Password    |
|-----------|--------------------------|-------------|
| Admin     | `admin@demov5.pt`        | `Demo2026!` |
| Prestador | `prestador@demov5.pt`    | `Demo2026!` |
| Cliente   | `cliente@demov5.pt`      | `Demo2026!` |
| Demo Maria| `maria.santos@v5demo.pt` | `Maria2026!`|

## Notas para 3.4B — Onboarding wizard

- `OnboardingWizardScreen` em `src/screens/OnboardingWizardScreen.jsx`
- 5 steps inline: Step1Tipo · Step2DadosPessoais · Step3Entidade · Step4Localizacao · Step5Welcome
- Steps por tipo: individual=[1,2,4,5] · empresa/condo=[1,2,3,4,5] · gestor=[1,2,3,5]
- `fn_complete_onboarding(payload jsonb)` em schema `core` — SECURITY DEFINER · atómica
- RPC cria: `core.pessoas` + `core.organizations` + `core.memberships` + `v5_manutencao.perfis_fiscais` + `v5_manutencao.localizacoes`
- `needsOnboarding = memberships.length === 0` em AuthContext — bloqueante, sem override
- Logout no header do wizard NÃO limpa localStorage de onboarding (retoma no próximo login)
- SQL: `sql/15_v5_3_4b_onboarding_rpc.sql`

## Notas para 3.4C — RLS + multi-org switcher

- **Helpers SECURITY DEFINER** em schema `public`:
  - `public.current_pessoa_id()`, `public.current_organization_ids()`, `public.has_org_role()`
  - `GRANT EXECUTE TO authenticated`; indexes em `core.memberships(pessoa_id)` e `core.pessoas(auth_user_id)`
- **supaCore JWT sync** — `syncSupaCore(session)` em `AuthContext.jsx` chama `supaCore.auth.setSession()` a cada mudança. Crítico: supaCore tem `persistSession:false`
- **RLS v5_manutencao** (39 tabelas): PER_ORG (12) · PER_ORG indirect (5) · PER_PESSOA (7) · PER_PESSOA indirect (2) · PUBLICO (12)
- **OrgLocBottomSheet.jsx** — substitui `ImovelSelectorSheet`; mostra secção de org switching quando `organizations.length > 1`
- **REVOKE anon** nas 5 core_get_* RPCs públicas: `sql/20_v5_3_4c_revoke_anon_rpc.sql`
- SQL helpers: `sql/16_v5_3_4c_rls_helpers.sql`; SQL v5_manutencao: `sql/17_v5_3_4c_rls_v5_manutencao.sql`

## Notas para 3.4D fix-ux #1 — Nome split

- **BD**: `core.pessoas` ganhou `primeiro_nome text` + `apelidos text`; backfill automático via `split_part`
- **`fn_complete_onboarding`**: aceita `primeiro_nome` + `apelidos` no payload; compõe `nome` internamente; backward-compat com `nome` legacy
- **`OnboardingWizardScreen` Step 2**: campo único "Nome completo" substituído por grid 2 campos (Primeiro nome obrigatório · Apelido opcional)
- **`IniciaScreen`**: saudação usa `authPessoa?.primeiro_nome` directo do `useAuth()` hook; fallback chain robusta sem `@` ou `+`
- **App.jsx bridge**: segundo `useEffect` que actualiza `authUser.nome` quando `pessoa?.nome` carrega (fix race condition)
- **`PerfilDrawerContent`**: `.single()` → `.maybeSingle()`; select inclui `primeiro_nome, apelidos`; header mostra `nomeDisplay` (primeiro nome) + `nomeLegal` como subtitle quando diferem; iniciais correctas
- **SQL**: `sql/22_v5_3_4d_nome_split.sql`

---

## Débitos abertos (3.4D+)

- **3.4D em curso**: email change in-app · password change in-app · GDPR `fn_delete_account` · `is_staff()` guard · `.single()` audit (16 ocorrências em 11 ficheiros)
- **Moradas do cliente**: tabela `cliente_moradas` + selector no checkout; GPS + reverse geocoding Nominatim
- **Configurador opções dinâmicas por serviço** (3.5 IA)
- **Stripe checkout subscrição** — CTA desactivado em PlanoHomeDetalheScreen (Fase 5)
- **Reviews reais** por serviço e por categoria (3.5)
- **FAQ seedado completo** — actualmente só 7 serviços em 199
- **Mapa visual** — Leaflet incompatível React 18; avaliar MapLibre ou Google Maps iframe
- **Imagens AI brand próprias** (Fase 5+) — actualmente Unsplash
- **Aceitar/cancelar proposta** no OrcamentoDetalheScreen
- **Pesquisa: preservar query state ao voltar** (Fase 5)
- **Poupanças reais** — `fn_calc_poupancas(pessoa_id)` (Fase 5) · actualmente mostra 0€ com "Sobe a cada serviço"
- **DEMO_PESSOA_ID em ServicoDetailScreen** → substituir por `useAuth().pessoa_id` (residual)

## Débito mapa visual

`MapaPicker` e `ImovelDetalheScreen` precisam de mapa visual interactivo.
Opções a avaliar: **MapLibre GL JS** (open-source, sem API key, React 18) · **react-map-gl** (wrapper Mapbox/MapLibre) · Google Maps iframe embed (estático, zero deps)
Contexto: `MapaPicker` em `MoradasScreen.jsx` e `ImovelWizard.jsx`; mapa estático em `ImovelDetalheScreen.jsx`.

---

## Decisões de design recentes

### 3.4C — Honestidade nos dados
- Score `null` → "Casa por avaliar" (não "Casa em Risco")
- Poupanças: `useState(null)` + empty state com CTA, não hardcoded 229€
- Pedidos: `useState([])` + query BD, não `ORDENS_INIT` partilhado

### 3.4D — Nome e identidade
- **Nome split**: `primeiro_nome` (obrigatório, display) + `apelidos` (opcional) + `nome` (gerado = primeiro_nome + apelidos, usado fiscal/recibos)
- **Saudação UI**: usar `primeiro_nome`; fallback `split_part(nome,1)`; último fallback `email.split('@')[0].split('+')[0]`
- **Phone com country code separado**: 🇵🇹 +351 default; dropdown com flags; validação condicional ao indicativo
- **Empty states com null**: distingue loading / empty / zero legítimo (`null` ≠ `0`)
- **GDPR delete**: anonimização (não DELETE físico) · ordens_trabalho preservadas (obrigação legal AT 10 anos)

---

## Estilo de comunicação

- Responder em português de Portugal
- Ser directo, sem elogios vazios
- Propor planos antes de executar mudanças com mais de ~50 linhas
- Parar e esperar confirmação entre fases
- Ao terminar, listar brevemente o que foi alterado e qual o impacto esperado
- Mostrar `git diff` e esperar aprovação antes de `git commit`
