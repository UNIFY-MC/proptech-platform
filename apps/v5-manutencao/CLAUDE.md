# v5-manutencao — Contexto para Claude Code

Este ficheiro é lido automaticamente pelo Claude Code a cada invocação. Mantém-se curto e actual.
**Última actualização:** 2026-04-28 · Sprint 1B.2.2 **FECHADA** · Próximo: 1B.2.3 UI AdicionarCamaraScreen

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

### Em curso

- Nada · **Sprint 1B.2.2 fechada** · Próximo: **1B.2.3** UI `AdicionarCamaraScreen`

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

**Regra AA — Edge Functions: nunca redeploy sem ver tool_error real (lição 1B.1.2)**

Quando uma Edge Function de agent retorna 500, fazer SEMPRE diagnóstico antes de qualquer fix:
1. `SELECT tool_error FROM core.agent_audit_log WHERE agent_name='<x>' ORDER BY created_at DESC LIMIT 5;`
2. Logs do Supabase Dashboard → Functions → `<fn>` → Logs

Causa real pode ser API key corrompida, não código. Três deploys especulativos não substituem 1 query de diagnóstico.

**Regra BB — Validação categórica de inputs de agentes (lição 1B.2.1)**

Tools de agentes que aceitem string para uma coluna categórica (categoria, status, tipo) **devem validar contra `Set<string>` hardcoded antes do SQL**, com throw explícito listando valores válidos.

Razão: agentes podem alucinar valores (`'boiler'` em inglês, `'aquecimento_central'` inventado), Anthropic não impõe constraints em runtime, e CHECK na BD é frágil para conjuntos que evoluem. Validação no executor permite ao agente fazer retry com valor válido (frequentemente `'outros'`).

```ts
const VALID_CATEGORIAS = new Set(["aquecimento", "climatizacao", /* ... */]);
function assertCategoria(cat: string): void {
  if (!VALID_CATEGORIAS.has(cat)) throw new Error(`Categoria inválida: '${cat}'. Válidos: ${[...VALID_CATEGORIAS].join(" | ")}`);
}
```

Lição 1B.2.1: `equipamento_create`, `equipamento_update`, `catalogo_search_servico_relevante` usam `VALID_EQUIPAMENTO_CATEGORIAS` e `VALID_SERVICO_CATEGORIAS` (Sets separados — as listas são diferentes).

**Regra CC — Helpers DEV de teste devem ser tolerantes a inputs (lição 1B.2.2)**

Helpers `window.__test*` que aceitem opções devem aceitar string solta E object. Lição 1B.2.2 (deploy v3-v4): helper recebia `{ localizacao_id: 'uuid' }` e enviava o objecto inteiro como valor do campo, PostgREST falhava com `22P02 "invalid input syntax for type uuid: [object Object]"`.

Pattern obrigatório:
```js
const config = typeof opts === 'string'
  ? { localizacao_id: opts }
  : opts;
```

Aplicado em: `src/supa.js` `__testImageInspector`.

---

Lições aprendidas em 3.4C/3.4D audit — nunca introduzir:

- `DEMO_*`, `MOCK_*`, `FAKE_*`, `HARDCODED_*` fora de testes/storybook
- Fallback arrays em renderização (`[90,65,80,50,68][i]` etc.)
- `useState` com valor não-zero/não-null que pareça dado real
- Mock data partilhado entre utilizadores (todos vêem os mesmos pedidos/poupanças)
- `.single()` sem garantia de ≥1 row — usar `.maybeSingle()`
- Funções RPC `SECURITY DEFINER` com `GRANT anon` sem guard interno (`auth.uid() IS NOT NULL`)
- **RLS sem GRANT — bug silencioso (lição 3.4D)**:

```sql
-- PADRÃO OBRIGATÓRIO para toda tabela nova com RLS:
ALTER TABLE schema.tabela ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON schema.tabela TO authenticated;  -- ← OBRIGATÓRIO antes da POLICY
CREATE POLICY "..." ON schema.tabela FOR SELECT TO authenticated USING (...);
```

RLS sem GRANT = PostgREST devolve `data: null` silenciosamente (sem erro visível no console).
Como ter fechadura sem maçaneta — ninguém entra mesmo com a chave certa.
Efeito prático: queries JS devolvem `null`, estados ficam em `[]`/`false`, sem alerta.
**Verificar sempre:** `GRANT` antes de `CREATE POLICY`, em todos os schemas (`core`, `v5_manutencao`, `public`).
Diagnóstico rápido: `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='X' AND table_name='Y';`

- **Embeds PostgREST são literais às colunas reais (lição 3.4D)**:

Quando adicionas embed `tabela:nome_real(col1, col2)`, **abre o schema da tabela embedded primeiro**. Nunca infiras nomes de colunas pelo padrão de outras tabelas. Em particular:
- `public.servicos` (V1 legacy) usa `categoria_id` (FK numérica)
- `v5_manutencao.catalogo_servicos` (V5) usa `categoria` (string, sem `_id`)

Não fazer copy-paste de embeds entre schemas diferentes. Se a query falha com 400, lê o campo `hint` na resposta PostgREST — indica a coluna correcta. Bug encontrado em 3.4D smoke test G (`App.jsx:10523`).

- **SECURITY DEFINER sem GRANT EXECUTE = erro 42501 silencioso (lição 3.4D)**:

Para qualquer função `SECURITY DEFINER`, declarar explicitamente quem pode executar:

```sql
CREATE OR REPLACE FUNCTION schema.fn_x(...) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ ... $$;

-- OBRIGATÓRIO depois do CREATE:
GRANT EXECUTE ON FUNCTION schema.fn_x(...) TO <role_específico>;
REVOKE EXECUTE ON FUNCTION schema.fn_x(...) FROM PUBLIC;
```

Roles típicos: Edge Function via service_role key → `TO service_role`; RPC frontend → `TO authenticated`; Admin → `TO postgres`.
Sintoma: `code: "42501", message: "permission denied for function X"`. Bug encontrado em 3.4D smoke test G T4 (`core.fn_anonymize_account`).

- **`core.pessoas` usa `metadata` JSONB para soft-delete GDPR (não coluna `deleted_at`)**:

```sql
UPDATE core.pessoas SET
  metadata = jsonb_build_object('deleted', true, 'deleted_at', now()::text),
  nome = 'Conta eliminada', email = 'deleted+<uuid>@v5casa.pt',
  primeiro_nome = NULL, apelidos = NULL, telemovel = NULL, nif = NULL
WHERE id = <pessoa_id>;

-- Filtrar activas:
WHERE COALESCE(metadata->>'deleted', 'false') != 'true'
```

Inconsistência conhecida e aceite: `core.memberships` usa coluna `deleted_at` dedicada; `core.pessoas` usa metadata. ADR a alinhar em Fase 7+.

- **Naming consistency — colunas diferem entre schemas, não copiar (lição 3.4D)**:

| Conceito | `core.pessoas` | `public.servicos` | `v5_manutencao.catalogo_servicos` |
|---|---|---|---|
| Telefone | `telemovel` | n/a | n/a |
| Categoria | n/a | `categoria_id` (FK int) | `categoria` (string) |
| Soft-delete | `metadata->>'deleted'` | n/a | n/a |
| Soft-delete memberships | `deleted_at` (coluna) | n/a | n/a |

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
7. **Inspecionar Network tab durante smoke test** — qualquer 400 indica embed PostgREST mal formado (coluna inexistente); qualquer 403 indica GRANT em falta na tabela
8. **Para tabelas novas com RLS**, confirmar GRANT em `information_schema.role_table_grants` antes de fechar a fase

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
| **3.4D** | ✅ **fechada** | SMTP Resend · email/password change in-app · GDPR delete · staff_roles + is_staff() · refactor nome split · 4 bug fixes (categoria_id, GRANT staff_roles, GRANT EXECUTE fn_anonymize, PasswordInput) |
| **3.5** | ✅ **fechada** | branding.js · scoreLabel · empty states honestos · meta SEO · missões hierarquia · faturação labels · audit DEMO_ · favicon |
| **1B.1.1** | ✅ **fechada** | Schema agents · agent_audit_log + agent_policies + api_usage · helper fn_can_use_api · regras W+X aplicadas |
| **1B.1.2** | ✅ **fechada** | Anthropic raw fetch + runAgent.ts + Edge Function agent-test · cost tracking + audit · smoke test B+C+D OK |
| **1B.2.1** | ✅ **fechada** | image_inspector infra · bucket equipamentos-fotos · fn_match_existing_equipamento · 4 tool executors com validação · system prompt pt-PT (74 linhas) · types.ts objective: string \| unknown[] |
| **1B.2.2** | ✅ **fechada** | Edge Function image-inspector com Vision · 4 deploys (3 fixes evolutivos) · smoke test E2E PASSOU com Bosch SMV41D10EU · custo real €0.08/análise · prompt_cache adiado p/ Onda 2 |

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

## Notas para 3.4D

### Auth & segurança in-app
- **EmailModal**: alteração email via `supa.auth.updateUser({email})` + banner pendente em `pessoas.metadata.email_pendente`
- **PasswordModal**: re-auth + nova password ≥8 chars + match
- **DeleteAccountModal**: danger modal · re-auth + checkbox confirmação · chama Edge Function `delete-account`
- **PasswordInput** (`src/components/PasswordInput.jsx`): toggle eye show/hide · usado em todos os ecrãs auth + modais

### GDPR delete
- Edge Function `supabase/functions/delete-account/index.ts`: JWT verify → re-auth password → chama `core.fn_anonymize_account` → `supabase.auth.admin.deleteUser()`
- RPC `core.fn_anonymize_account(p_auth_user_id uuid)`: SECURITY DEFINER · apenas `service_role` (GRANT EXECUTE explícito) · anonimiza `core.pessoas` via `metadata = jsonb_build_object('deleted', true, 'deleted_at', now())` + sets nome='Conta eliminada', email='deleted+<uuid>@v5casa.pt', primeiro_nome/apelidos/telemovel/nif/foto_url=NULL · marca `core.memberships.deleted_at = now()` · anonimiza `v5_manutencao.perfis_fiscais` · preserva `ordens_trabalho` (10 anos AT)
- **Pattern soft-delete:** `core.pessoas` usa `metadata->>'deleted'`, NÃO coluna dedicada. `core.memberships` usa coluna `deleted_at`. Inconsistência aceite (pessoas é hot-path, memberships é metadata operacional).

### Staff roles
- Tabela `core.staff_roles`: `auth_user_id` (NÃO `pessoa_id`) · `role` (admin/support/operator) · `active` · `granted_by` · `revoked_at`
- Helper `public.is_staff()`: SECURITY DEFINER · GRANT EXECUTE TO authenticated
- RLS staff_roles: policy SELECT `auth_user_id = auth.uid()` (cada user vê os seus)
- GRANT SELECT TO authenticated obrigatório (POLICY sem GRANT = 403)
- StaffBanner componente: amarelo discreto fixed top · expansível · só renderiza se `isStaff===true`
- AuthContext extended com `isStaff` + `staffRoles[]`
- Gestão (INSERT/UPDATE/DELETE) reservada para Fase 4 backoffice via service_role

### Refactor nome split
- `core.pessoas` ganhou `primeiro_nome` + `apelidos` (mantém `nome` completo para fiscal)
- Backfill de 70+ pessoas via split simples
- `fn_complete_onboarding` actualizado para escrever os 3 campos
- UI saudação usa `primeiro_nome` (fallback split de `nome`)
- PerfilDrawer mostra display name + nome legal subtitle

### SMTP Resend
- Provider: Resend (`smtp.resend.com:465`) · domain `prataowners.pt` verificado
- Sender: `info@prataowners.pt` (partilhado com V2 Condomínios — Fase 7 mudar para domínio dedicado)
- API key `v5-dev-supabase` em Supabase Dashboard SMTP settings
- Rate 30/h, min interval 60s

### Bugs descobertos em smoke test G e fixados
1. **App.jsx `categoria_id` vs `categoria`**: embed PostgREST de `catalogo_servicos` pedia coluna `categoria_id` (nome V1) mas tabela V5 usa `categoria` (string). Fix: `catalogo_servicos(nome, categoria)`.
2. **staff_roles RLS sem GRANT**: policy SELECT correcta mas falta `GRANT SELECT ON core.staff_roles TO authenticated` → retorna null silencioso. Persistido em `sql/23_v5_3_4d_staff_roles.sql`.
3. **fn_anonymize_account 42501**: SECURITY DEFINER sem GRANT EXECUTE a service_role. Persistido em `sql/24_v5_3_4d_rpc_guards.sql`.
4. **fn_anonymize_account schema**: Edge Function chamava sem `db: { schema: 'core' }` → PostgREST procurava em public. Fix no `index.ts`.

### SQL files 3.4D
- `sql/22_*` — refactor nome split (primeiro_nome + apelidos)
- `sql/23_*` — staff_roles + is_staff() + GRANT SELECT authenticated
- `sql/24_*` — REVOKE anon fn_complete_onboarding · fn_anonymize_account · GRANT EXECUTE service_role · deleted_at em memberships
- `sql/26_v5_1b_1_1_agents_schema.sql` — Schema base agents Onda 1B (audit log + policies + rate limit + fn_can_use_api). Aplicar antes de qualquer Edge Function de agent.

---

## Débitos abertos (3.4D+)

- ~~**Smoke Test G concluído** (2026-04-27): staff banner ✅ · password change ✅ · GDPR delete ✅ · HomeScreen 400 fix ✅~~
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

## Notas para 1B.1.1 — Schema agents

### Tabelas core
- `core.agent_audit_log` — uma row por iteration (várias por session_id) · colunas de custo e tokens
- `core.agent_policies` — config per-org per-agent (limits, approval, model) · seeds default por org
- `core.api_usage` — rate limit tracker · auto-cleanup 30 dias

### Helper
- `core.fn_can_use_api(endpoint, limit, window_hours)` SECURITY DEFINER
  · Retorna jsonb `{ allowed, used, limit, remaining, window_hours }`
  · Cada Edge Function de agent chama isto antes de executar
  · GRANT EXECUTE TO authenticated (regra W)

### Convenção naming
- Agents: `v5.*` (consumer) ou `admin.*` (backoffice)
- Tools: prefixo por domínio — `vision.*`, `equipamento.*`, `weather.*`, `catalogo.*`

### Modelo por agent (seeds default)
- v5.image_inspector → claude-sonnet-4-6 (actualizado em 1B.2.1 — Opus era excesso para este use case)
- v5.casa_advisor → claude-sonnet-4-6 (cost-effective)

### Free tier vs Home+
- Free image_inspector: 3/dia + 10/mês (2 chamadas a fn_can_use_api)
- Home+: limit=999999 se `pessoas.metadata->>'tier'='home_plus'`
- Stripe + tier real chega na Onda 2

### Achados do Passo 0 (histórico)
- `agent_audit_log` e `agent_policies` já existiam como stubs (schema diferente, 0 dados, RLS activo mas zero policies → tudo bloqueado)
- `anon` tinha ALL nas duas tabelas → revogado
- UNIQUE em `agent_policies` era apenas `(organization_id)` → substituída por `(organization_id, agent_name)`
- Helpers estão em `public.*` (não `auth.*`) — corrigido no SQL

### Próximo (1B.2)
- image_inspector com 8 tools reais (Vision + Postgres)

---

## Notas para 1B.1.2 — Anthropic SDK + runAgent + agent-test

### Convenção arquitectural agents
- Agents correm SEMPRE em Edge Functions (server-side)
- API key Anthropic em Supabase secrets (nunca `.env.local` nem `VITE_*`)
- Chamar Anthropic via **raw fetch** (não npm SDK) — ver Lições abaixo
- service_role para audit log (cross-tenant write); user JWT para fn_can_use_api
- Tools agnósticas a vertical → vivem em `_shared/agents/tools/<dominio>/`
- Cada agent → sua Edge Function própria (não multiplexar)
- **Endpoint key naming:** `'agent.<nome_agent>'` para invocações reais (ex: `agent.image_inspector`). Reservar `'helper.test_call'` ou similar para testes manuais à `fn_can_use_api`. Evita colisão entre testes interactivos e rate limits de produção.
- **Score vs match_type:** ferramentas de lookup/match devem retornar `score` numérico (0.0–1.0), não `match_type` categórico. Permite ao agente ajustar limiar dinamicamente em vez de hardcode da lógica no system prompt. Decisão 1B.2.1: `fn_match_existing_equipamento` retorna `score real` com thresholds 0.6 (match forte) / 0.3–0.59 (possível duplicado) / <0.3 (novo).

### Ficheiros _shared/agents/
- `types.ts` — interfaces partilhadas (`AgentTool`, `AgentContext`, `AgentRunOptions`, `AgentRunResult`, `AgentPolicy`)
- `anthropic.ts` — raw fetch a `api.anthropic.com` + `calculateCostEur()`
- `runAgent.ts` — tool use loop (max 20 iter) + audit por iteration + audit por tool execution

### runAgent.ts — convenção stop_reason no audit
- Row de iteration: `stop_reason = resp.stop_reason` (`end_turn`/`tool_use`/`max_tokens`/`error`)
- Rows de tool execution: `stop_reason = NULL` — só `tool_name`/`tool_input`/`tool_output`/`tool_error`

### Helpers public.* reutilizados (criados em 3.4C)
- `public.current_pessoa_id()` — já existe, chamado directamente via `.rpc()`
- `public.current_organization_ids()` — idem
- Razão: não criar wrappers `_for_agent` — os helpers `public.*` já são expostos pelo PostgREST

### TODOs adiados
- Human-in-loop (`approval_required_tools`) → 1B.2 image_inspector
- CORS apertar para domínio próprio → Onda 4 (Capacitor)
- Web fetch + pgvector tools → Onda 2

### Lições do smoke test 1B.1.2

- **API keys via Supabase secrets:** colar directamente em `supabase secrets set KEY=value` é mais seguro que Read-Host/SecureString (PowerShell). Estes últimos podem injectar newline invisível que faz Anthropic responder `"failed to parse header value"`.

- **Anthropic no Deno — raw fetch obrigatório:** `npm:@anthropic-ai/sdk` na compat layer npm do Deno tenta usar o `https` module Node.js e devolve `"Connection error"`. Fix: chamar `https://api.anthropic.com/v1/messages` directamente com `fetch()` nativo Deno — zero dependências externas.

- **Se npm SDK for necessário no futuro:** `npm:@anthropic-ai/sdk@0.30.0` (versão exacta, sem `^`) + `new Anthropic({ apiKey, fetch: globalThis.fetch })`. Ambos obrigatórios em conjunto.

### Regra AA — Edge Functions: nunca redeploy sem ver tool_error real

Quando uma Edge Function de agent retorna 500, antes de propor QUALQUER fix:

1. ```sql
   SELECT iteration, stop_reason, tool_error, model
   FROM core.agent_audit_log
   WHERE agent_name = '<agent>'
   ORDER BY created_at DESC LIMIT 5;
   ```
2. Ler logs do Edge Function via Supabase Dashboard → Functions → `<fn>` → Logs.

Lição 1B.1.2: 3 deploys especulativos (fetch override, versão SDK, raw fetch) eram red herrings. Causa real era contaminação da API key com newline (PowerShell SecureString). Diagnóstico antes de fix poupa deploys e sanidade.

### sql/27
- `sql/27_v5_1b_1_2_seed_test_echo.sql` — seed `v5.test_echo` em `core.agent_policies` (Sonnet 4.6, enabled, sem tools de aprovação)

---

## Notas para 1B.2.1 — image_inspector infra

### Storage bucket
- Bucket `equipamentos-fotos`: privado (public=false) · 10MB · MIME: jpeg/png/webp/heic/heif
- Path convention: `{pessoa_id}/{eq_id}/{timestamp}.{ext}` — 1º segmento é o pessoa_id
- RLS em `storage.objects`: 3 policies (INSERT/SELECT/DELETE) isolam por `(foldername(name))[1] = current_pessoa_id()`
- service_role bypassa RLS — uploads da Edge Function são sempre autorizados
- TODO: sem policy UPDATE para `authenticated`. Edge Function usa service_role (bypass RLS). Se UI futura precisar de update directo do user (raro), adicionar policy.

### fn_match_existing_equipamento
- `v5_manutencao.fn_match_existing_equipamento(p_localizacao_id, p_categoria, p_nome)` SECURITY DEFINER
- Retorna top-5 por score numérico [0,1]: 0.5 se categoria exacta + até 0.5 por `similarity()` (pg_trgm)
- GRANT EXECUTE TO service_role; REVOKE de anon + authenticated
- pg_trgm foi instalado em 1B.2.1 (`CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions`)

### Tool executors — `_shared/agents/tools/equipamento.ts`
- **`equipamento_lookup`**: chama `fn_match_existing_equipamento` via `serviceRole.schema('v5_manutencao').rpc()`
- **`equipamento_create`**: INSERT em `equipamentos` com `organization_id: ctx.organizationId`; injeta `agente_inspecao_session_id` + `agente_inspecao_em` no `dados_ia` (NÃO confiar no agente para estes campos)
- **`equipamento_update`**: guard Opção C via `localizacao_id → localizacoes → memberships` (3 queries; funciona mesmo com `equipamentos.organization_id IS NULL` legacy); merge PATCH de `dados_ia` com histórico das últimas 10 sessões em `agente_inspecao_history[]`
- **`catalogo_search_servico_relevante`**: `.or('nome.ilike.%q%,descricao.ilike.%q%').limit(10)` + ranking JS (nome antes de descricao) + slice(0,5)

### dados_ia merge behavior (não overwrite)
Para `equipamento_update`, o `dados_ia` passado pelo agente é um PATCH:
```ts
mergedDadosIA = { ...existing, ...input.dados_ia, agente_inspecao_session_id, agente_inspecao_em, agente_inspecao_history }
```
A sessão anterior é arquivada em `agente_inspecao_history[]` (últimas 10). O agente só envia o que detectou na sessão actual.

### Validação categórica (Regra BB aplicada)
Dois Sets hardcoded no executor (não na BD — sem CHECK constraint nova):
- `VALID_EQUIPAMENTO_CATEGORIAS` (14 valores) — validado em `equipamento_lookup` + `equipamento_create`
- `VALID_SERVICO_CATEGORIAS` (8 valores) — validado em `catalogo_search_servico_relevante`
Throw com mensagem útil → agente recebe `is_error: true` e pode retry com `'outros'`.

### Tool naming convention
snake_case sem dots: `equipamento_lookup`, `equipamento_create`, `equipamento_update`, `catalogo_search_servico_relevante`.
(Dots só no `agent_name` da policy: `v5.image_inspector`.)

### Free tier 3/dia + 10/mês
Edge Function `image-inspector` (1B.2.2) vai chamar `fn_can_use_api` 2×:
1. `(endpoint='agent.image_inspector', limit=3, window_hours=24)` — limite diário
2. `(endpoint='agent.image_inspector.monthly', limit=10, window_hours=720)` — limite mensal
Bloqueia se qualquer falhar. Home+: limit=999999 quando `pessoas.metadata->>'tier'='home_plus'`.

### types.ts — AgentRunOptions.objective
Alterado de `string` para `string | unknown[]` para suportar Vision content blocks (array com `image` + `text`).
`runAgent.ts` não precisa de mudança — `content: objective` funciona para ambos os tipos.
O caller (Edge Function 1B.2.2) constrói o array com `{ type: "image", source: {...} }` + `{ type: "text", text: "..." }`.

### ctx.sessionId injectado por runAgent
`AgentContext` ganhou `sessionId?: string`. `runAgent.ts` injeta `{ ...context, sessionId }` ao chamar cada executor.
Permite aos executors registar a session ID no `dados_ia` sem que o agente tenha acesso directo.

### Extensão pg_trgm (1B.2.1)
- Activada via `sql/28`: `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;`
- Permite score numérico `0.0–1.0` via `similarity()` em `fn_match_existing_equipamento` em vez de match_type categórico
- `fn_match_existing_equipamento` usa `similarity()` (função), NÃO o operador `%` — importante para search_path
- `SET search_path = v5_manutencao, extensions, public` na função para que `similarity()` seja encontrado no schema `extensions`
- Confirmar instalação: `SELECT extname FROM pg_extension WHERE extname='pg_trgm';`
- Versão aplicada: `1.6` · schema: `extensions`

### Debug interactivo browser (DEV)
- `src/supa.js` expõe `window.supabase` / `window.supaCore` / `window.supaPublic` dentro de `if (import.meta.env.DEV)`
- Vite remove este bloco em production build (tree-shake)
- Uso: `window.supabase.from('ordens_trabalho').select('id,estado').limit(5).then(console.log)`
- NÃO usar `VITE_*` para credentials — os clientes são criados com a anon key (segura para browser)

### sql files 1B.2.1
- `sql/28_v5_1b_2_1_bucket_and_helper.sql` — bucket equipamentos-fotos + RLS + pg_trgm + fn_match_existing_equipamento
- `sql/29_v5_1b_2_1_update_policies.sql` — UPDATE core.agent_policies para v5.image_inspector (model → sonnet, limit=3, approval=['equipamento_create'])

---

## Notas para 1B.2.2 — Edge Function image-inspector (Vision)

### Ficheiros criados / alterados
- `supabase/functions/agent-image-inspector/index.ts` — pipeline completo: auth → parse → localização → rate limit → upload bucket → signed URL → runAgent com Vision blocks → resposta
- `src/lib/imageCompression.js` — compressão cliente (max 1568px, JPEG q85, OffscreenCanvas, sem deps)
- `src/supa.js` — `window.__testImageInspector(file, opts)` helper DEV tolerante a string|object
- `supabase/functions/_shared/agents/runAgent.ts` — `opts.sessionId ?? crypto.randomUUID()` (antes era sempre novo UUID)
- `supabase/functions/_shared/agents/types.ts` — `AgentRunOptions.sessionId?: string`; `VisionContentBlock`, `ImageInspectorRequest`, `ImageInspectorResponse` interfaces

### Custo real Vision (medido em smoke test)
- Foto 1176×1568px ≈ 1.568 tokens (fórmula linear Anthropic: `width×height/750`, sem tiles)
- System prompt + tools schema ≈ 3.500 tokens fixos por iteration
- Cada iteration carrega foto + histórico completo da conversa
- Custo médio por análise (4 iterations típicas): **€0.08–0.10**
- Free tier 3/dia + 10/mês = max €1.00/user/mês (aceitável)

### Estimativa original (€0.005) era irrealista
Assumia 1 call sem contexto. Tool use loop com 4 iterations é o caso real. Não é bug — é arquitectura do agent loop.

### TODO Onda 2: prompt_cache para system prompt + tools
Anthropic `prompt_cache` (`cache_control: { type: "ephemeral" }`) reduz tokens fixos para 10% após aquecer. Estimado 60-70% redução do custo (€0.08 → €0.025–0.035). Não fazer agora — Onda 2.

### Bugs encontrados e corrigidos durante sprint
1. **orgIds[0] indeterminado (deploy v1 → v2)**: validação usava `loc.organization_id !== orgIds[0]`. Para utilizadores com 2+ orgs, `orgIds[0]` é indeterminado. Fix: `!(orgIds as string[]).includes(loc.organization_id)` + `organizationId = loc.organization_id` (vem da localização, não do array).
2. **Helper opts object vs string (deploy v3 → v4)**: `window.__testImageInspector(file, { localizacao_id: '...' })` enviava objecto inteiro como valor UUID, PostgREST falhava com `22P02`. Fix: extracção tolerante com `typeof opts === 'string' ? opts : opts?.localizacao_id`. Ver Regra CC.

### sessionId pre-gerado pelo Edge Function
O `sessionId` é gerado em `index.ts` antes do upload, passado ao `runAgent` via `opts.sessionId`. Garante que path do bucket, audit log e `dados_ia` partilham o mesmo ID. `runAgent.ts` usa `opts.sessionId ?? crypto.randomUUID()` — back-compat com `agent-test` que não passa sessionId.

### Rate limit duplo sem double-count
Dois endpoints separados: `'agent.image_inspector'` (daily) e `'agent.image_inspector.monthly'` (monthly). Contadores independentes — sem interferência entre si.

---

## Notas para 3.5

### Branding centralizado
- `src/config/branding.js` — ponto único para nome, emoji, versão, emails, domínio, cor primária
- **Codename interno**: "Zelo" (decisão pendente Mario) — `BRAND.name = 'V5 Manutenção'` até confirmação
- Ficheiros migrados: LoginScreen, SignupScreen, OnboardingWizard, App.jsx (splash, admin sidebar, AI assistant), PerfilMenuContent, PerfilSheetContent, DefinicoesScreen
- `BRAND.version` substitui strings "v0.5.2/v0.5.3 · build dev" hardcoded nos 3 perfil screens
- `admin@servicopro.pt` e `api.servicopro.pt` eliminados → `BRAND.supportEmail` e `BRAND.domain`

### Score labels
- `src/lib/scoreLabel.js` — `scoreLabel()`, `scoreLabelShort()`, `casaScoreLabel()`
- Elimina `casaLabel()` inline em IniciaScreen
- `'Casa em Risco 🚨'` removido — substituído por `'Casa com Atenção 🔧'` (score < 40)
- null/0 → `'Casa por avaliar 🏠'` em IniciaScreen, CasaScreen, ImovelDetalheScreen

### SEO / Meta
- `index.html`: title com tagline, meta description PT, theme-color `#0B3D2E`, og:title/description/type
- Comentário no topo avisa que strings são duplicadas de `branding.js`
- favicon.ico 16x16 verde placeholder em `public/` — substituir por logo no rebrand

### Missões
- `MissoesScreen.jsx` reescrito: Home Assessment = ordem 1, sem prerequisito
- Missões 2-5 locked (🔒) até Home Assessment concluído — `isDesbloqueada()` check UI-only
- Schema migration `sql/25` (coluna `ordem` + `prerequisito_missao_id` em `missoes_utilizador`) → Fase 3.6

### Audit 3.5 findings
- `OrcamentoWizardScreen.jsx`: `DEMO_ORGANIZATION_ID` hardcoded substituído por `memberships[0].organization_id`
- Restantes `DEMO_PESSOA_ID` em App.jsx (3 locais): fallbacks @deprecated, baixo risco — Fase 5
- `MOCK_ALERTAS_ENRIQUECIDOS` (AlertaDetailScreen) + `MOCK_REVIEWS` (ServicoDetailScreen): dados estáticos esperados até Fase 5
- `MoradasScreen.jsx`: label "Faturação: X" unificado para `nome || nome_facturacao || 'dados pessoais'`

### Backlog para 3.6
- Schema `missoes_utilizador`: colunas `ordem` + `prerequisito_missao_id`
- Favicon real (substituir placeholder verde por logo)
- Loading/error UX consistency (Tarefa 3.5.10 não feita — time-box seria excedido)
- Códigos postais autocomplete (Tarefa 3.5.9 — estimativa >4h, adiado)

---

## Estilo de comunicação

- Responder em português de Portugal
- Ser directo, sem elogios vazios
- Propor planos antes de executar mudanças com mais de ~50 linhas
- Parar e esperar confirmação entre fases
- Ao terminar, listar brevemente o que foi alterado e qual o impacto esperado
- Mostrar `git diff` e esperar aprovação antes de `git commit`
