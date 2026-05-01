# v5-manutencao — Contexto para Claude Code

Este ficheiro é lido automaticamente pelo Claude Code a cada invocação. Mantém-se curto e actual.
**Última actualização:** 2026-04-29 · Sprint 1B.5A.0 CLAUDE.md hierarchy · Próximo: 1B.5A Fase 2 Foundations

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
| **3.4D** | SMTP Resend (prataowners.pt) · email change in-app · password change in-app · GDPR via Edge Function · `is_staff()` + `core.staff_roles` · `.single()` audit (9 ficheiros) · StaffBanner · PasswordInput toggle · smoke test G completo |
| **3.5** | branding.js · scoreLabel · empty states honestos · meta SEO · missões hierarquia · faturação labels · audit DEMO_ · favicon |
| **1B.1.1** | Schema agents · agent_audit_log + agent_policies + api_usage · fn_can_use_api · regras W+X |
| **1B.1.2** | Anthropic raw fetch + runAgent.ts + agent-test Edge Function · cost tracking + audit · smoke test B+C+D OK |
| **1B.2.1** | image_inspector infra · bucket equipamentos-fotos · fn_match_existing_equipamento · 4 tool executors com validação · system prompt pt-PT · types.ts objective: string \| unknown[] |
| **1B.2.2** | Edge Function image-inspector · Vision pipeline completo · imageCompression.js cliente · 4 deploys evolutivos · smoke test E2E PASSOU (Bosch SMV41D10EU) · custo real €0.08/análise · Regra CC |
| **1B.5A.0** | CLAUDE.md hierarchy · sprint-notes.md criado · 60% redução de tamanho |

### Em curso

- **1B.5A** — Foundations Phase 2 (decisões D1-D5 aprovadas · migração schema a executar)

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
- `public.is_staff()` → boolean (3.4D — consulta `core.staff_roles`)

### Agents (Onda 1B)

- Agents correm SEMPRE em Edge Functions (server-side); API key Anthropic em Supabase secrets
- Chamar Anthropic via **raw fetch** — `npm:@anthropic-ai/sdk` falha no Deno com "Connection error"
- Naming: `v5.*` consumer · `admin.*` backoffice · tools snake_case sem dots
- Model seeds: `claude-sonnet-4-6` para `v5.image_inspector` e `v5.casa_advisor`
- Free tier: 3/dia + 10/mês por utilizador (2× `fn_can_use_api` por invocação)
- Diagnóstico obrigatório antes de qualquer redeploy: ver **Regra AA** em `.claude/rules/anti-patterns.md`

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

> Regras completas em **`.claude/rules/anti-patterns.md`** (indexáveis via grep).

Regras em vigor:
- **AA** — nunca redeploy sem ver audit log + Edge Function logs
- **BB** — validação categórica de inputs de agentes com `Set<string>` hardcoded
- **CC** — helpers DEV tolerantes a `string | object` (lição 1B.2.2)
- **DD** — `supaPublic` não partilha JWT — nunca usar para RPCs com `auth.uid()` context; usar `useAuth()` ou `supa` (lição 1B.2.3c)
- **FF** — auditar GRANT após CREATE POLICY service_role; policy sem GRANT é silenciosa (lição 1B.3)
- **GG** — chat/kanban/mapa usam `height:calc(100vh - X)` + `flex:1` interno; scroll-down screens usam `minHeight:100vh + paddingBottom` (lição 1B.3)
- **W** — RLS sem GRANT devolve `null` silencioso — sempre GRANT antes de CREATE POLICY
- **X** — SECURITY DEFINER sem GRANT EXECUTE lança 42501 — sempre GRANT EXECUTE explícito
- **Y** — PostgREST embeds são literais às colunas reais — abrir schema antes de escrever
- **Z** — Audit RLS checklist obrigatório antes de fechar qualquer fase com RLS

Anti-padrões gerais: nunca introduzir `DEMO_*`/`MOCK_*`/`FAKE_*`, fallback arrays em render, `useState` com valor mock, `.single()` sem garantia de ≥1 row, `GRANT anon` em funções SECURITY DEFINER sem guard interno.

---

## Modelo de identidade e papéis (V5)

Princípio: **1 pessoa → 1 identidade** (`auth.users` + `core.pessoas`) → N papéis activáveis em N contextos.

| Papel | Tabela | Chave | Significa |
|---|---|---|---|
| Cliente em org | `core.memberships` | pessoa_id + org_id | Pertence a uma organização cliente |
| Staff plataforma | `core.staff_roles` | auth_user_id | Trabalha PARA a V5 (admin/support/readonly) |
| Prestador (Fase 6) | `v5_manutencao.prestador_perfis` | pessoa_id | Executa serviços via V5 |

**Coexistência:**
- Maria → cliente apenas (memberships)
- Sandra → cliente da sua casa + prestadora limpeza (memberships + prestador_perfis)
- João → staff support (staff_roles · sem memberships de cliente)
- Mário → staff admin + cliente da sua casa (testa como cliente)

**Regra anti-ambiguidade:** NUNCA usar `pessoa_id` como sinónimo de "cliente" ou "prestador" em nomes de coluna. Usar `cliente_pessoa_id` + `prestador_pessoa_id` quando necessário. Actualmente `ordens_trabalho.pessoa_id` = cliente (inequívoco) e `prestador_id` é coluna separada.

**Decisão prestador-cliente cross (registada 3.4D):**
- Sandra (prestadora) PODE contratar Ricardo (prestador) via V5
- Sem comissão entre prestadores (incentivo network interno)
- Implementação Fase 6: detectar `prestador_perfis` em ambos os lados da ordem → skip fee

**UI modos múltiplos (Fase 6):** Mode switcher Uber-style no header. Login com 1 perfil → entra directo. Login com 2+ → selector inline (após auth, antes router push). Último modo persistido em `pessoas.metadata.last_mode`.

**Helpers RLS por perfil:**
- `public.current_pessoa_id()` ✅ 3.4C
- `public.current_organization_ids()` ✅ 3.4C
- `public.has_org_role()` ✅ 3.4C
- `public.is_staff()` ✅ 3.4D — consulta `core.staff_roles`
- `public.current_prestador_id()` — Fase 6
- `public.is_prestador_approved()` — Fase 6
- `public.current_active_mode()` — Fase 6 (lê JWT custom claim)

**Staff de teste:** `mariocarvalho.biz+v5staff@gmail.com` → role `admin` em `core.staff_roles`. NÃO usar `mariocarvalho.biz@gmail.com` (reservado para uso real futuro). NÃO usar `+v5test` (já é cliente normal).

**GDPR test:** `mariocarvalho.biz+v5gdpr@gmail.com` — conta descartável para testes de eliminação. Pode ser recriada a qualquer altura. Após delete, fica com email `deleted+<uuid_sem_hifens>@v5casa.pt` em `core.pessoas` (formato real de `fn_anonymize_account`). Validação: `SELECT email FROM core.pessoas WHERE email LIKE 'deleted+%@v5casa.pt' ORDER BY updated_at DESC LIMIT 5;`

---

## Pontos de atenção

### Regra Z — RLS audit checklist + Regra Y — PostgREST embeds

> Detalhes completos em `.claude/rules/anti-patterns.md` (Regra Z e Regra Y).

Checklist rápido pré-fecho de fase com RLS:
1. `grep -rn "DEMO_\|MOCK_\|FAKE_\|HARDCODED_" src/` → 0 matches
2. `NOTIFY pgrst, 'reload schema';` após batch de policies
3. Network tab: 400 = embed mal formado · 403 = GRANT em falta
4. Cross-tenant test com 2º utilizador

PostgREST embed: usar nome da tabela destino, nunca o nome da FK. Se 400, ler campo `hint` da resposta.

### Race condition authUser bridge (lição 3.4D)

O bridge `session → authUser` em App.jsx pode disparar antes de `pessoa` carregar do BD.
Fix: segundo `useEffect` que actualiza `authUser.nome` quando `pessoa?.nome` muda.
Para saudações e display, usar sempre `useAuth().pessoa.primeiro_nome` directamente — não depender do bridge.

---

## Pre-launch security checklist (BLOCKER)

### P0 — Anthropic API key exposure (CTO audit 2026-05-01)

**Status:** OPEN. **Blocker para deploy production.**

**Descoberto em:** `App.jsx` linhas 4206, 4210, 4221, 4481, 4525, 4825, 4827 fazem `import.meta.env.VITE_ANTHROPIC_API_KEY` e fetch directo Anthropic do browser. Viola ADR-004 ("Anthropic API calls em Edge Functions, nunca no browser").

**Risk actual:** LOW (V5 não deployed)
**Risk se deployed:** CRITICAL (key visível em DevTools de qualquer visitor)

**Action plan obrigatório antes de deploy V5:**

1. Refactor `App.jsx` (linhas ~4206-4230 + 5 outras refs):
   - Substituir direct fetch Anthropic por chamada à Edge Function
   - Reuse pattern existente (`casa_advisor`, `image_inspector` já usam Edge Functions)
2. Remover `const ANTHROPIC_KEY` e todas as refs de `App.jsx`
3. Remover `VITE_ANTHROPIC_API_KEY` de `apps/v5-manutencao/.env.local`
4. Audit final: `grep "VITE_ANTHROPIC" apps/v5-manutencao/src/` deve retornar zero matches

**Não rotacionar key:** valor nunca foi exposto em git nem em production.

**Tracked:** `.claude/current/decisions-log.md` 2026-05-01 + `.claude/strategy/sprint-b-architecture.md`

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
- [x] ~~Concluir Task E 3.4D: `REVOKE anon` de `fn_complete_onboarding`~~ ✅ 3.4D
- [x] ~~Concluir Task D 3.4D: `fn_delete_account` GDPR~~ ✅ 3.4D (`fn_anonymize_account` + Edge Function `delete-account`)

---

## Supabase — tabelas

### core schema (V1 Core Hub · `hkmvszkpxjbxmnixzqbl`)

- `core.pessoas` — auth_user_id, nome, **primeiro_nome**, **apelidos**, email, nif, telemovel
- `core.organizations` — tipo (individual/empresa/condominio/gestor_imoveis), nome, nif
- `core.memberships` — pessoa_id, organization_id, role (owner/admin/member), **deleted_at** (soft-delete GDPR)
- `core.staff_roles` — auth_user_id, role (admin|support|readonly), active, granted_by, revoked_at (3.4D)

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

## Contas de teste

| Role | Email | Password | Notas |
|---|---|---|---|
| Admin demo | `admin@demov5.pt` | `Demo2026!` | |
| Prestador demo | `prestador@demov5.pt` | `Demo2026!` | |
| Cliente demo | `cliente@demov5.pt` | `Demo2026!` | |
| Cliente principal | `maria.santos@v5demo.pt` | `Maria2026!` | Apartamento Lisboa, Score 65, Prata 700pts |
| Cliente sem histórico | `rls-test@v5demo.pt` | `Password123!` | Para testes RLS cross-tenant |
| Cliente Mario | `mariocarvalho.biz+v5test@gmail.com` | (mario sabe) | Caldas da Rainha, casa |
| Staff teste | `mariocarvalho.biz+v5staff@gmail.com` | (mario sabe) | role admin · banner staff |
| GDPR teste | `mariocarvalho.biz+v5gdpr@gmail.com` | descartável | recriado a cada teste GDPR |
| **RESERVADO** | `mariocarvalho.biz@gmail.com` | — | uso real futuro · NÃO criar |
| **TODO Fase 6** | `mariocarvalho.biz+v5prestador@gmail.com` | — | a criar com fluxo prestador |

---

## Débitos abertos (3.4D+)

- **Moradas do cliente**: tabela `cliente_moradas` + selector no checkout; GPS + reverse geocoding Nominatim
- **Configurador opções dinâmicas por serviço** (3.5 IA)
- **Stripe checkout subscrição** — CTA desactivado em PlanoHomeDetalheScreen (Fase 5)
- **Reviews reais** por serviço e por categoria (3.5)
- **FAQ seedado completo** — actualmente só 7 serviços em 199
- **Mapa visual** — Leaflet incompatível React 18; avaliar MapLibre ou Google Maps iframe
- **Imagens AI brand próprias** (Fase 5+) — actualmente Unsplash
- **Aceitar/cancelar proposta** no OrcamentoDetalheScreen
- **Pesquisa: preservar query state ao voltar** (Fase 5)
- **Poupanças reais** — `fn_calc_poupancas(pessoa_id)` (Fase 5)
- **DEMO_PESSOA_ID em ServicoDetailScreen** → substituir por `useAuth().pessoa_id` (residual)

### TODO Fase 6 — Conta prestador de teste

- Criar `mariocarvalho.biz+v5prestador@gmail.com` com fluxo completo
- Validar wizard prestador (formação, alvará, IBAN, seguro RC)
- Aprovar via backoffice staff (endpoint admin)
- Testar mode switcher cliente/prestador no header
- Testar Sandra (cliente+prestador) cross-mode
- Testar Sandra contrata Ricardo (sem comissão · regra registada 3.4D · ver "Modelo de identidade e papéis")

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

### 3.4D — Nome, identidade e papéis
- **Nome split**: `primeiro_nome` (obrigatório, display) + `apelidos` (opcional) + `nome` (gerado = primeiro_nome + apelidos, usado fiscal/recibos)
- **Saudação UI**: usar `primeiro_nome`; fallback `split_part(nome,1)`; último fallback `email.split('@')[0].split('+')[0]`
- **Phone com country code separado**: 🇵🇹 +351 default; dropdown com flags; validação condicional ao indicativo
- **Empty states com null**: distingue loading / empty / zero legítimo (`null` ≠ `0`)
- **GDPR delete**: anonimização (não DELETE físico) · ordens_trabalho preservadas (obrigação legal AT 10 anos)
- **staff_roles**: tabela separada de `core.staff` (legacy) · usa `auth_user_id` · roles: admin/support/readonly
- **is_staff()**: helper em `public` schema (PostgREST expõe) · SECURITY DEFINER · consulta staff_roles activos
- **Audit pessoa_id**: todos os 28 `pessoa_id` são inequívocos (cliente). `ordens_trabalho` tem `prestador_id` separado. TODO Fase 6: quando `prestador_perfis` existir, `prestador_id` deve referenciar `prestador_perfis(id)` não `pessoas(id)`

---

## Estilo de comunicação

- Responder em português de Portugal
- Ser directo, sem elogios vazios
- Propor planos antes de executar mudanças com mais de ~50 linhas
- Parar e esperar confirmação entre fases
- Ao terminar, listar brevemente o que foi alterado e qual o impacto esperado
- Mostrar `git diff` e esperar aprovação antes de `git commit`

---

## Referências

- Antipatterns completos (W, X, Y, Z, AA, BB, CC, DD, FF, GG): `.claude/rules/anti-patterns.md`
- Histórico de sprints (3.3 → 1B.2.2): `.claude/history/sprint-notes.md`
- Plano Foundations 1B.5A: `docs/V5-1B5A-Foundations-Plan.md` (se existir)
