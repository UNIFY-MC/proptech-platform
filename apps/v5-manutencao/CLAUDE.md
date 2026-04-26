# v5-manutencao — Contexto para Claude Code

Este ficheiro é lido automaticamente pelo Claude Code a cada invocação. Mantém-se curto e actual.

## Projecto

**v5-manutencao** é a vertical de Manutenção & Limpeza da plataforma PropTech. Uma app React + Vite + Supabase que serve três tipos de utilizador (cliente, prestador, admin) num único SPA.

- **Caminho local**: `C:\Users\mario\dev\proptech-platform\apps\v5-manutencao`
- **Dev server**: `npm run dev` (porta 5175)
- **Build**: `npm run build` → `dist/`
- **Deploy**: Netlify (push ao `main` faz deploy automático quando ligado)
- **BD**: Supabase (URL e ANON_KEY em `.env.local`)

## Stack e arquitectura

- **React 18** com Vite 5
- **Supabase** para auth + BD + storage
- **Single-file App.jsx** — `src/App.jsx` contém toda a lógica (>3000 linhas). Isto é intencional para facilitar leitura contextual; não refactorizar para múltiplos ficheiros sem pedido explícito.
- **Sem router externo** — o routing é feito por state (`ecra`, `role`, etc.) dentro do `App`.
- **Estilos inline** — usa `style={{...}}` com uma constante `C = {...}` no topo como design tokens. Não usar Tailwind.
- **Fontes**: Fraunces (display, serif) + Outfit (body, sans) via Google Fonts.
- **Ícones**: lucide-react.

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

## Estado do catálogo

- **199 serviços** em 8 categorias (limpeza, manutenção, jardim, piscina, pintura, elétrica, canalização, pós-obra)
- **11 grupos-pai** com variantes (tipologia/tamanho) — ex: `cln-home` tem t1/t2/t3/t4, `cln-move` tem t1/t2/t3/t4, `mnt-xmas-lights` tem interior/exterior/full
- **36 serviços variantes** ligados a grupos-pai via `servico_pai_id`
- **8 templates de frequência** configuráveis via admin (tabela `frequency_templates`)
- **166/166 com detalhe rico (100%)**: tagline, inclui, nao_inclui, duracao_tipica, faq (exclui os 11 grupos-pai — esses têm detalhe próprio orientado a ecrã de agrupamento, não a checkout)
- **45 subcategorias** incluindo a nova **Sazonal e festivo** (`mnt_sazonal` — Natal, decorações) e **Segurança doméstica** (`mnt_seguranca` — baby proofing)
- Ver `docs/CATALOGO-COMPLETO.md` para tabela completa

## Documentos de referência

- `docs/TASK-fluxo-completo.md` — 8 fases de implementação (Fase 1 a 8)
- `docs/CATALOGO-COMPLETO.md` — catálogo completo por categoria, com IDs e preços
- `docs/v5-complete-flow-reference.jsx` — demo visual de referência (3111 linhas, NÃO copiar para src/)
- `supabase/migrations/20260422_catalogo_completo.sql` — migração completa e idempotente (21 secções)

## Workflow preferido por fase

Sempre em sequência, com confirmação entre fases:

1. **Fase 1** — Aplicar SQL + verificar (cheque de contagens)
2. **Fase 2a** — Adicionar primitivos UI ao App.jsx (sem ecrãs)
2. **Fase 2b** — Adicionar os 7 ecrãs novos
2. **Fase 2c** — Ligar à Home + substituir checkout
3. **Fase 3** — Testar manualmente os 8 caminhos × 4 variações
4. **Fase 4** — Botão Personalizado CTA na Home (já na 2c)
5. **Fase 5** — Ícone sparkle AI (stub, só alert)
6. **Fase 6** — UI admin templates frequência
7. **Fase 7** — Bottom nav com FAB central
8. **Fase 8** — Sazonais e campanhas (opcional MVP)

Entre cada fase, apresenta o plano ou o resultado e espera confirmação.

## Guard-rails absolutos (NÃO TOCAR)

1. **Preservar sempre** a autenticação Supabase, rotas de role (cliente/prestador/admin), integração do chat, pipeline de estados das ordens.
2. **Nunca refactorizar** o `App.jsx` monolítico em múltiplos ficheiros sem pedido explícito.
3. **Nunca eliminar** os botões de demo (Cliente / Prestador / Admin) no login — são essenciais para testes rápidos.
4. **Nunca apagar nem fazer TRUNCATE** em tabelas Supabase. Migrations são sempre aditivas (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO UPDATE`).
5. **Nunca commitar** ficheiros com credenciais. `.env.local` está no `.gitignore`.
6. **Nunca fazer `git push`** — deixar ao Mario decidir quando empurrar.
7. **Não tocar** nos textos e fluxos do admin e do prestador (só adicionar módulo novo na Fase 6, sem alterar o existente).
8. **Copy em português de Portugal** (não PT-BR): "escolha", "serviço", "morada" (não "endereço"), "técnico".

## Auth dos botões demo — Fase 2d IN PROGRESS

### Contas demo criadas (2d.1 done · 2026-04-24)

| Role      | Email                 | Password   | UUID                                   |
|-----------|-----------------------|------------|----------------------------------------|
| Admin     | `admin@demov5.pt`     | `Demo2026!` | `204d8383-5f14-4632-a24a-a523e7106bfb` |
| Prestador | `prestador@demov5.pt` | `Demo2026!` | `16f12108-47d5-4b15-adf6-c2835707aafe` |
| Cliente   | `cliente@demov5.pt`   | `Demo2026!` | `351c1e38-9be5-4420-8b03-7cb53f05a21a` |

Auto Confirm activo no Supabase Auth. As contas ficam no repo
propositadamente (são só demo). Remover no pre-launch — já listado
no checklist.

### Workarounds ainda activos até 2d.2/2d.3 aplicarem

Os botões Cliente/Prestador/Admin no login mudam state local sem fazer
signin real no Supabase. Consequências e workarounds actuais:

1. **RLS de ordens** tem 2 policies temporárias abertas a role `public`
   (`pre_auth_select_ordens` + `pre_auth_insert_ordens`, migração
   `20260423_fix_ordens_rls_pre_auth.sql`). UPDATE/DELETE ficam sem
   policy — bloqueado por default. Policies anteriores
   (`ordens_participantes`, `temp_anon_insert_ordens`) foram removidas
   porque o pathway do PostgREST com anon key JWT não accionava o role
   matching esperado.
2. **`auth.uid()` retorna null** em todos os fluxos demo.
3. Os IDs dos demos (`demo-cli`, `demo-pro`, `demo-adm`) são strings
   não-UUID. INSERT em colunas UUID com estes IDs falha (erro `22P02:
   invalid input syntax for type uuid`). Workaround: no payload de
   `ordens`, `cliente_id` fica NULL quando `authUser.user.id.startsWith('demo-')`
   (ver `addCatalogOrder` em `App.jsx`). O `prestador_id` já é NULL por
   padrão até ser atribuído.

### Consequências conhecidas do workaround

- Ordens criadas em modo demo têm `cliente_id = NULL`.
- A listagem "Meus Pedidos" V2 (quando implementada) vai precisar de
  tratar este caso — ou a implementação de auth real virá antes.

### Plano de resolução — Fase 2d sub-fases

1. **2d.1** ✅ Contas criadas via Supabase Dashboard (cliente/prestador/admin
   `@demov5.pt`, password `Demo2026!`, Auto Confirm). UUIDs na tabela
   acima. _[done 2026-04-24]_
2. **2d.2** Botões demo passam a fazer `signInWithPassword` com o
   email/password do quadro. Remover check `startsWith('demo-')` em
   `addCatalogOrder` (o `cliente_id` deixa de ser NULL forçado).
3. **2d.3** Substituir policies `pre_auth_*` por policies proper com
   `auth.uid() = cliente_id OR auth.uid() = prestador_id` (ver header
   da migração `20260423_fix_ordens_rls_pre_auth.sql` para template
   SQL completo). `DROP POLICY pre_auth_select_ordens` e
   `pre_auth_insert_ordens` em `ordens`.
4. **2d.4** Schema `cliente_moradas` (ver secção 2d abaixo) + RLS +
   seed 1 morada por demo.
5. **2d.5** Extender `profiles` com NIF + morada_fiscal + cp_fiscal.
6. **2d.6** Perfil UI + address selector no checkout (substituir a
   morada do billing modal por dropdown com moradas guardadas).

**Prioridade**: alta antes de qualquer teste externo ou convite a clientes reais.

## Fase 2d pendente — Perfil do cliente + Moradas

Actualmente no checkout, a morada do billing é reutilizada como
morada do serviço. Isto é um placeholder que precisa ser separado
num refactor futuro (Fase 2d):

- Perfil do cliente passa a ter morada fiscal e NIF permanentes
- Tabela `cliente_moradas` com múltiplas habitações por cliente
  (tipologia, notas de acesso, GPS)
- Checkout pré-preenche com morada default e permite escolher outra
- Técnico na Fase 3 vai precisar das notas de acesso + GPS
  para navegar até ao serviço

Quando auth real for implementada (primeiro débito técnico listado
acima), considerar arrancar 2d imediatamente a seguir — são
prerequisitos mútuos.

### Design target do selector de morada no checkout

Substituir o card "Localização" actual por um dropdown selector:

```
📍 Localização
   ┌─────────────────────────────────────┐
   │ Casa (Rua Palmira Bastos, 4)      ▼ │
   └─────────────────────────────────────┘
```

Abre dropdown com:
- Moradas guardadas (labels "Casa", "Escritório", "Casa da mãe")
- Localização actual (via `navigator.geolocation` + reverse geocoding)
- + Nova morada (abre modal completo)

### Integração técnica

- `navigator.geolocation.getCurrentPosition()` para obter lat/lng
- Reverse geocoding via Nominatim (free) ou Google Geocoding API
  para derivar rua+número+CP+cidade
- Guardar em `cliente_moradas` como default ou morada temporária
- Lat/lng guardados em `cliente_moradas.lat` e `.lng` para usar
  no app do técnico (navegação GPS na Fase 3)

### Dependências

- Auth real implementada (ver débito técnico anterior)
- Sem user identificado, não há moradas a listar nem a guardar

## Fase 2e pendente — Registo Real de Cliente

A Fase 2d implementa auth apenas para os demo users (signIn nos 3
UUIDs já existentes). O flow de signup real — ecrã "Criar conta",
`supabase.auth.signUp`, trigger `handle_new_user` no Postgres para
criar a row em `profiles`, verificação por email/SMS e wizard de
onboarding (NIF, morada fiscal, primeira morada de serviço) — é
scope separado da Fase 2e.

### Documentação

https://www.notion.so/34b84147fa608169a3cbfbe056831bbd

## Fase 3a pendente — Lista de Tarefas do Cliente (Wishlist)

Cliente mantém "lista aberta" de coisas para fazer em casa. Acumula
items (fixos + personalizados) ao longo do tempo. Quando satisfeito,
submete a lista inteira como ordem agrupada e multi-especialidade.

### Valor

- Reduz fricção de decisão ("vale a pena chamar alguém só por isto?")
- Aumenta ticket médio (visita agrupada vs múltiplas pequenas)
- Retenção: cliente com lista aberta volta à app regularmente
- Diferenciador real face a Zaask/Habitissimo/Fixando (todos
  pedido-único)

### Schema (provisório)

```sql
listas_cliente (
  id UUID PRIMARY KEY,
  cliente_id UUID REFERENCES profiles,
  estado TEXT,              -- aberta | submetida | concluida
  morada_id UUID REFERENCES cliente_moradas,
  created_at, submetida_at
)

lista_items (
  id UUID PRIMARY KEY,
  lista_id UUID REFERENCES listas_cliente,
  tipo TEXT,                -- fixo | personalizado
  servico_id TEXT NULL,     -- preenchido quando tipo=fixo
  descricao TEXT NULL,      -- preenchido quando tipo=personalizado
  fotos JSONB,
  preco_estimado NUMERIC,
  categoria_id TEXT,
  created_at
)
```

### Decisões pendentes (ver página Notion para detalhe)

- **Multi-especialidade**: 1 técnico handyman, coordenação de 2, ou
  dividir em sub-ordens
- **Agendamento**: slots obrigatórios 2-4h em vez de "imediato"
- **Cotação**: estimativa preliminar → técnico confirma → cliente
  aceita

### Dependência

Fase 2d concluída (cliente autenticado + morada na BD).

### Posição no roadmap

Fase 3a, imediatamente depois de 2d.

### Página Notion

https://www.notion.so/34b84147fa6081929d9ccf47183dc971

## Pre-launch checklist (antes do primeiro cliente real)

- [ ] Implementar auth real (ver débito "Auth dos botões demo")
- [ ] Arrancar Fase 2d (perfil do cliente + moradas — ver TODO)
- [ ] Reset da sequência de ordens:
      `ALTER SEQUENCE ordens_numero_seq RESTART WITH 1;`
      `TRUNCATE ordens RESTART IDENTITY CASCADE;`
- [ ] Remover policies temporárias `pre_auth_*` e substituir por
      policies proper com `auth.uid() = cliente_id`
- [ ] Remover contas demo do Supabase Auth:
      `admin@demov5.pt` · `prestador@demov5.pt` · `cliente@demov5.pt`
- [ ] Limpar quaisquer outras contas de teste
- [ ] Apagar dados de desenvolvimento em profiles/catalog/etc.
- [ ] DROP colunas órfãs da tabela `ordens`:
      `ALTER TABLE ordens DROP COLUMN descricao_cliente;`
      `ALTER TABLE ordens DROP COLUMN notas_cliente;`
      `ALTER TABLE ordens DROP COLUMN nota_cliente;`

      Contexto: resíduos de migrations anteriores. Nunca são
      gravadas pelo código actual (só `descricao_personalizada` e
      `notas` são). Deixá-las vazias criava dúvidas sobre integridade
      de dados. Remover junto com o reset da sequência.

## Supabase — tabelas

Tabelas principais:
- `profiles` (users), `prestadores`
- `ordens` (com pipeline de 10 estados), `ordem_mensagens` (chat)
- `categorias`, `subcategorias`
- `servicos` (com `servico_pai_id` para grupos e `frequency_template` para recorrência) — colunas novas: `imagem_url`, `imagem_alt`, `popular`, `sub_grupo`
- `servico_variacoes`, `servico_extras`
- `frequency_templates` (nova — 8 templates configuráveis)
- `v5_manutencao.servicos_inclui_exclui` — inclui/exclui por serviço (228 rows para 7 serviços top)
- `v5_manutencao.servicos_faq` — FAQ por serviço
- `v5_manutencao.platform_stats` — KPIs da plataforma (5 stats)

Colunas novas em `ordens`:
- `metadata` JSONB — guarda opções dinâmicas escolhidas pelo cliente (produtos, frequência, preço efectivo)
- `slots_flexiveis` JSONB, `schedule_mode` TEXT, `notas_cliente`, `fotos_cliente`, `faturacao_*`, `metodo_pagamento`, `promo_code`

## Workflow técnico

1. Antes de editar `App.jsx`, fazer `grep` da secção que se vai alterar para confirmar âncoras.
2. Depois de cada alteração grande, correr `npm run build` para garantir que não quebrou.
3. Commits em inglês, prefixo convencional: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
4. Não fazer `git push` automático.

## Estado das fases (actualizado 2026-04-25)

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
| **3.4B** | **próxima** | Onboarding wizard + RLS + tipo cliente |

### Notas para 3.3.12

- `localizacoes` tem: `num_quartos`, `num_wcs`, `num_pisos`, `foto_principal_url` (novos) + `coords` (point, já existia)
- `coords` formato Postgres `point`: `"(lng,lat)"` — usar `pointToCoords()` e `coordsToPoint()` em `src/lib/geocoding.js`
- Geocoding via Nominatim (gratuito, rate-limited) — TODO(mario): migrar para Google Maps API em volume
- `ModalEditarImovel` exportado de `MoradasScreen.jsx` — usado também em `ImovelDetalheScreen.jsx`
- `ImovelDetalheScreen` acessível via: header imóvel activo (IniciaScreen), card em MoradasScreen, ecra `imovel_detalhe`
- `moradaCurta()` e `moradaCompleta()` adicionados a `src/lib/labels.js`
- `ServicosScreen/MarketplaceView` corrigida: props `notifCount`, `onNavigateNotificacoes`, `onNavigateChatSuporte` passadas correctamente
- Seed 3 imóveis Maria: tipologia, área, quartos, WCs, pisos, GPS backfilled via migração `v5_3_3_12_imovel_rico`
- `localizacoes.tipo` CHECK real: `habitacao | condominio | empresa | segunda_habitacao`
- **Mapa visual removido** (react-leaflet incompatível com ambiente React 18 — erro `render2 is not a function`):
  Leaflet e react-leaflet desinstalados. `MapaPicker` substituído por inputs lat/lng + GPS actual.
  `ImovelDetalheScreen` mostra coords + link Google Maps em vez de mapa embed.

## Notas para 3.3.13

- Screens novos: `OrcamentosLandingScreen`, `OrcamentoWizardScreen` (4 steps), `OrcamentoConfirmadoScreen`
- Ecras novos no App.jsx: `orcamentos_landing`, `orcamento_wizard`, `orcamento_confirmado`
- Mock data em `src/data/mock.js`: `MOCK_ORCAMENTOS_AREAS`, `MOCK_ORCAMENTOS_FORMATOS`, `MOCK_ORCAMENTOS_PEDIDOS`, `MOCK_ALERTAS_ENRIQUECIDOS`
- `AlertaDetailScreen` reescrito: mostra lista completa MOCK_ALERTAS_ENRIQUECIDOS (Shipshape style) + acções 1-toque
- `CategoriaScreen` enriquecida: hero + badges 2x2 + CTA orçamento + sobre + relacionados + reviews + FAQ
- `ServicosScreen`: 8ª categoria "À medida" no grid + banner referral + counter "177 DISPONÍVEIS" + routing banner roxo
- `NotificacoesScreen`: onClick item → AlertaDetailScreen
- `PedidosScreen`: card mock OrcamentoMockCard (roxo, progress bar) na tab Em curso
- Novos props: `onNavigateOrcamento` (CategoriaScreen, AlertaDetailScreen), `onNavigateOrcamentos` + `onNavigateReferral` (ServicosScreen), `onNavigateAlerta` (NotificacoesScreen)

## Notas para 3.3.14

- `pedidos_orcamento.estado` CHECK: `aberto | em_cotacao | cotado | aceite | cancelado | expirado`
- `pedidos_orcamento.organization_id` NOT NULL — usar `DEMO_ORGANIZATION_ID` nos seeds
- `orcamentos_recebidos.prestador_id` NOT NULL — join com `prestadores(nome, iniciais, rating_medio, aprovado)`
- `EscolherImovelSheet` + `useEscolherImovel` hook em `src/components/` e `src/lib/`
- `SmartPromptsSheet` persiste respostas em `contexto_servico` (UNIQUE por localizacao+categoria)
- `completude.js` calcula score 0-100% baseado em 10 campos com pesos; cor: verde ≥80%, âmbar ≥50%, vermelho <50%
- `MOCK_ORCAMENTOS_PEDIDOS` e `MOCK_PROPOSTAS_ORCAMENTO` removidos — BD real
- `ImovelAtivoContext` agora tem: `imovelAtivoPorTab`, `setImovelAtivoForTab`, `onTabChange`, `resetParaPrincipal`

## Notas para 3.3.14-fix-ux3

- `v5_manutencao.combos` carregados da BD (não mock): `preco_combo`, `preco_normal`, `cor_hex`, `emoji`, `sub`, `desconto_pct`, `servicos_ids`, `descricao_longa`
- `adaptCombo(bdRow)` → formato card; `adaptComboForDetail(bdRow)` → ComboDetailScreen
- Search bar com debounce 300ms, dropdown com resultado + card rosa "Orçamento personalizado"
- 9ª categoria "Packs" 🎁 no grid → navega para ecra `combos`
- `OrcamentoWizardScreen` aceita `descricaoInicial` prop (pré-preenche descrição a partir da search)
- `wizardBackTarget` em `selNav` para routing correcto do back no wizard (search vs categoria)
- 199 serviços activos (22 novos inseridos, 7 já existiam dos 29 do SQL)
- Fallback COMBOS_FALLBACK / MAIS_FALLBACK como estado inicial (evita flash)
- `ServicosScreen.jsx` migrado para ficheiro separado (~290 linhas)

## Notas para 3.3.14-fix-ux4

- `ServicoDetailScreen.jsx` completamente redesenhado — 15 secções (C1–C15)
- Novos imports: `ImagemServico` component + `supa` para tabelas v5_manutencao
- `supaPublic.from('servicos')` para dados do catálogo; `supa.from(...)` para inclui/exclui/faq/stats
- `incluiDisplay`: BD prioritário, fallback JSONB legacy `src.inclui`
- `faqDisplay`: BD prioritário, fallback `FAQ_GENERICO[catId]` (categorias: 8 entradas)
- `fetchRelacionados`: popular=true da mesma categoria, excluindo o serviço actual
- `platform_stats`: 5 KPIs, carregados via `supa.from('platform_stats')`
- `ImagemServico` component: `src/components/ImagemServico.jsx` + `src/lib/imagens.js`
- `imagens.js`: FALLBACK_POR_CATEGORIA (8 URLs Unsplash) + FALLBACK_GENERICO
- CTA fixo no bottom: preço sem `+ IVA` · botão "+ Lista" + "Pedir agora →"
- `handlePedirAgora` e SmartPromptsSheet preservados inalterados
- `TODO(mario 3.5)`: rating real, configurador dinâmico (anotados inline no JSX)
- SQL: `sql/10_v5_3_3_14_ux4_servico_detalhe.sql`

## Notas para 3.3.14-fix-ux5

- `ServicoDetailScreen`: novos states `variacoes`, `variacaoSel`, `freqOptions`, `freqSel`
- `fetchVariacoes`: `supaPublic.from('servicos').eq('servico_pai_id', servId)` — carrega filhos do grupo
- `fetchFrequencia`: `supaPublic.from('frequency_templates').select('options').eq('id', tmpl)` — depois do detalhe carregar
- `precoEfetivo = precoBase × (1 - freqDiscount)` — actualiza C6 e CTA em tempo real
- Secção C6b (variações) só aparece quando `variacoes.length > 0`
- Secção C6c (frequência) só aparece quando `freqOptions.length > 1`
- `CategoriaScreen`: `imagem_url` adicionado ao select; card mostra thumbnail 52×48 quando disponível, emoji como fallback via `onError`
- Sem nova SQL — `servico_variacoes`, `frequency_templates`, `imagem_url` já existiam

## Notas para 3.3.14-fix-ux6

- **BD**: criada `v5_manutencao.combo_servicos` (combo_id UUID FK combos, servico_id UUID FK catalogo_servicos, ordem INT); `combos` ganhou `cor_texto TEXT DEFAULT '#1B4332'`
- **BD**: seed 8 serviços em `catalogo_servicos` (S009–S016); seed Pack Verão em `combos`; todas as 4 combos ligadas via `combo_servicos`
- **ServicosScreen**: CATS_GRID voltou a 8 itens (Packs removido). Banner dourado Packs entre referral e "Combos populares". Banner Home+ clickável → `onNavigatePlanoHome`
- **ComboDetailScreen**: hero usa `cor_texto` da BD (contraste correcto em fundos claros); serviços carregados de `combo_servicos JOIN catalogo_servicos`; cards clickáveis → `onNavigateServico`
- **PROMOS carousel**: i=0 → limpeza, i=1 → PacksLista, i=2 → canalizacao
- **`src/lib/descontos.js`**: `getDescontoAplicavel(pessoaId, valorBase)` — lê `subscricoes`, devolve `{ tipo, label, pct, credito_eur }`
- **`src/screens/PlanoHomeDetalheScreen.jsx`**: ecrã full-screen Plano Home+; lê subscrição demo; mostra benefícios, preço, FAQ; CTA desactivado (Stripe futuro)
- **`MaisContratadosScreen`**: corrigido — usa `supaPublic.from('servicos')` em vez de `supa`; select limpo (`preco_base`, sem joins problemáticos)

## Notas para 3.3.14-fix-ux7

- **BD**: criadas `v5_manutencao.planos_subscricao` + `v5_manutencao.descontos_config`; seed home_plus (5%, 9.99€) + home_pro (10%, 24.99€)
- **BD**: Maria já tinha `subscricoes.plano='home_plus'` ativo — não necessário novo seed
- **`CombosScreen.jsx`**: convertido de constante hardcoded para `supa.from('combos').select('*').eq('ativo',true).order('ordem')` com `adaptCombo()` inline; COMBOS_FALLBACK mantido para initial state
- **`ServicosListaScreen.jsx`**: novo ecrã em `src/screens/`; aceita `filtro` (populares/recentes/todos) + `titulo`; queries `supaPublic.from('servicos')`; callbacks `onBack` + `onNavigateServico`
- **`ServicoDetailScreen.jsx`**: adicionado chip desconto Home+ no CTA bottom; usa `getDescontoAplicavel(DEMO_PESSOA_ID, preco)` — mostra `✓ Home+ · 10% crédito`; TODO(mario Fase 4) substituir DEMO_PESSOA_ID por authUser real
- **`App.jsx`**: import ServicosListaScreen; ecra `servicos_lista` adicionado à lista cliOver; novo case `ecra==='servicos_lista'`; `onNavigateMaisContratados` rewired → `servicos_lista` (filtro populares); `servico_detail.onBack` usa `selNav.backFrom` para voltar a `servicos_lista` quando navegado de lá
- **SQL**: `sql/11_v5_3_3_14_ux7_planos.sql`

## Notas para 3.3.14-fix-ux8

- **Tarefa A — Packs fonte única BD**: `COMBOS_FALLBACK` removido de `ServicosScreen.jsx` e `CombosScreen.jsx`; ambos iniciam com `useState([])`; ServicosScreen carrossel usa `.eq('popular',true).limit(4)`; CombosScreen lista usa todos ativos; click no fallback vazio já não crashava mas agora é impossível
- **Tarefa B — Nav back stack**: criado `src/lib/router.js` com `useNavStack()` hook para uso futuro; fix cirúrgico Caso 2 em App.jsx: `combo_detail onBack` usa `selNav.comboBackFrom || 'home'`; `combo_detail onNavigateServico` seta `backFrom:'combo_detail'`; navegação para combo guarda `comboBackFrom` (ServicosScreen→`'home'`, CombosScreen→`'combos'`); Casos 1 e 3 já funcionavam
- **Tarefa C — BottomNav universal**: `BNav` e `FabPickerModal` movidos para fora do bloco `{!cliOver && <>}`; renderizados condicionalmente com `ecra !== 'orcamento_wizard'`; 9 screens actualizadas de paddingBottom:32/40 para 80: `CategoriaScreen`, `CombosScreen`, `ServicosListaScreen`, `NotificacoesScreen`, `OrcamentoDetalheScreen`, `OrcamentoConfirmadoScreen`, `ImovelDetalheScreen`, `PerfisFiscaisScreen`, `MoradasScreen`; screens já com pb ≥ 70 mantidas intactas
- **Tarefa D — Imagens variadas**: `src/lib/imagens.js` reescrito com `POOL_POR_SUB_GRUPO` (28 sub-grupos, 2-3 URLs cada) + `hashStr()` determinístico; `getImagemServico()` usa `categoria + sub_grupo` para chave do pool; `imagem_url` adicionada a `adaptComboForDetail` (ServicosScreen) e `adaptCombo` (CombosScreen); `ComboDetailScreen` mostra hero 160px com gradient overlay quando `cb.imagem_url` existe; `CombosScreen` mostra thumbnail 60×60 round-corner nos cards
- **BD**: `v5_manutencao.combos.imagem_url TEXT` adicionado (migration `v5_3_3_14_ux8_combo_imagem_url`); seed 4 imagens Unsplash por slug
- **SQL**: `sql/12_v5_3_3_14_ux8_imagens.sql`

## Notas para 3.3.14-fix-ux9

- **FAB redesign**: `<span>PEDIR</span>` removido do BNav; FAB agora mostra só `✨` (fontSize 22)
- **FabSheet**: `FabPickerModal` reescrito com 5 secções — banner Emergência (vermelho) + grid 3 Pedir serviço + banner AI Expert (índigo) + grid 3 Adicionar à casa + textarea descrição livre; props novas: `onEmergencia`, `onAIExpert`, `onAdicionarCamara`, `onAdicionarDoc`, `onAdicionarEnergia`
- **EmergenciaScreen**: 3 tipos (💧 Inundação, 🔥 Caldeira, ⚡ Eléctrica) + aviso 112 + nota tarifa urgência; `onPedirEmergencia(tipo)` stub
- **AIExpertFabScreen**: standalone MVP com mock chat (sem Claude API); chips de sugestão; respostas mock por keyword; Claude API real mantida intacta em `AIExpertScreen` (App.jsx ~linha 4977, tab Casa)
- **AdicionarCamaraScreen**: upload stub com nota Fase 2d (Storage Supabase)
- **AdicionarDocScreen**: grid 6 tipos de documento + upload stub
- **AdicionarEnergiaScreen**: grid 6 tipos de equipamento + campos nome/marca/ano; stub guardar
- **App.jsx**: 5 imports novos; cliOver estendido (`emergencia`, `ai_expert_fab`, `adicionar_camara`, `adicionar_doc`, `adicionar_energia`); 5 render cases após `plano_home_detalhe`; FabPickerModal call site com 5 novos handlers

## Notas para 3.3.14-fix-ux10

- **IniciaScreen**: `SERVICOS_POP` e `EQUIPA` hardcoded removidos; 3 novas queries no `useEffect` load (servicos popular, prestadores_equipa_cliente, combos by slug); 8 novos props: `onNavigateServico`, `onNavigateServicosLista`, `onNavigateCombo`, `onNavigateAIExpert`, `onNavigateMissoes`, `onNavigatePrestador`, `onNavigateEquipa`, `onNavigatePoupancas`
- **PROMOS**: cada card tem `actionKey` → `handlePromoAction()` — Reset Primavera/Pack Inverno navegam para combo_detail via BD; Urgência vai para alerta_detail
- **Serviços populares**: BD `public.servicos` filtro `popular=true` + skeleton loading; cards → `onNavigateServico`; "Ver tudo →" → `servicos_lista` populares
- **Poupanças**: toda a secção tem onClick → `poupancas_detalhe`
- **Dica IA**: "Perguntar à IA" → `ai_expert_fab` com `perguntaInicial` pré-preenchida
- **Equipa**: carregada de `prestadores_equipa_cliente JOIN prestadores`; cards → `prestador_detail`; "Ver todos →" → `prestadores_equipa`
- **Missões**: cards e título → `missoes_semana`
- **MissoesScreen**: 5 missões mock com redirect para acções relevantes; progress bar; TODO Fase 5
- **PrestadoresEquipaScreen**: query BD + filtros Todos/Favoritos; cards → `prestador_detail`; PrestadorDetailScreen (já existia) reutilizado
- **PoupancasDetalheScreen**: breakdown hardcoded (147€ serviços + 82€ energia = 229€); sugestões; TODO Fase 5 query real
- **AIExpertFabScreen**: prop `perguntaInicial` — no mount faz `enviar(perguntaInicial)` automático via `iniciouRef`
- **BD**: `prestadores` ganhou `bio`, `especialidades` jsonb, `verificado`, `ordem`; criada `prestadores_equipa_cliente`; seed Maria com AF(4), SM(8, fav), RG(2)
- **App.jsx**: 3 imports novos, cliOver+3, 4 render cases novos, IniciaScreen props expandido, AIExpertFabScreen recebe `perguntaInicial`
- **SQL**: `sql/13_v5_3_3_14_ux10_equipa.sql`

## Débitos abertos pós Sprint 3.3 (para 3.4A+)

- **Auth real (3.4A — próxima)**: botões demo passam a fazer `signInWithPassword`; substituir policies `pre_auth_*`; schema `cliente_moradas`
- **Configurador opções dinâmicas por serviço** (3.5 IA)
- **Stripe checkout subscrição** — CTA desactivado em PlanoHomeDetalheScreen (Fase 5)
- **UI admin descontos** — gestão web de `descontos_config` e `planos_subscricao`
- **Reviews reais** por serviço e por categoria (3.5)
- **FAQ seedado completo** — actualmente só 7 serviços em 199
- **RLS** em `pedidos_orcamento`, `orcamentos_recebidos`, `contexto_servico`, `servicos_inclui_exclui`, `servicos_faq`, `platform_stats`
- **Mapa visual** — Leaflet incompatível React 18; avaliar MapLibre ou Google Maps iframe
- **Imagens AI brand próprias** (Fase 5+) — actualmente Unsplash
- **SmartPromptsSheet no wizard** de orçamento
- **Aceitar/cancelar proposta** no OrcamentoDetalheScreen
- **DEMO_PESSOA_ID em ServicoDetailScreen** → substituir por authUser.pessoa_id (Fase 4)
- **Pesquisa: preservar query state ao voltar** (Fase 5)
- **Packs sazonais filtrados por época** — TODO(mario Fase 5) em ServicosScreen

## Débito mapa visual — Continua de 3.3.12

`MapaPicker` e `ImovelDetalheScreen` precisam de mapa visual interactivo.
Opções a avaliar:
- **Google Maps iframe embed** (mais simples, zero deps, mas estático)
- **Mapbox GL JS** (`mapbox-gl` + wrapper próprio, sem react-leaflet)
- **react-map-gl** (wrapper Mapbox/MapLibre, melhor suporte React 18+)
- **MapLibre GL JS** (open-source, sem API key, compatível com React 18)

Contexto: `MapaPicker` em `MoradasScreen.jsx` e `ImovelWizard.jsx`;
mapa estático em `ImovelDetalheScreen.jsx` (só leitura, sem interacção necessária).

## Notas para 3.4A — Auth core Supabase

- **`AuthProvider`** em `src/lib/AuthContext.jsx` — wraps toda a app via `main.jsx`; expõe `session`, `pessoa`, `pessoa_id`, `authenticated`, `loading`, `signOut`, `refreshPessoa`
- **`ImovelAtivoContext`** e **`PerfisFiscaisContext`** migrados para usar `useAuth().pessoa_id` — não carregam se `pessoa_id=null`
- **Auth screens** em `src/screens/auth/`: `LoginScreen`, `SignupScreen`, `ConfirmEmailPendingScreen`, `ConfirmEmailScreen`, `RecoverPasswordScreen`, `ResetPasswordScreen`
- **`AuthRouter`** e **`LoadingScreen`** adicionados ao App.jsx (antes do bloco ROOT)
- **`AuthScreen` original** removida do fluxo activo (função renomeada `AuthScreen_REMOVED`) — snapshot em `src/screens/AuthScreen.jsx`
- **Botões demo** preservados no LoginScreen (secção "Acesso rápido de teste") — chamam `demoLogin()` que agora usa `supa.auth.signInWithPassword()`
- **`DEMO_PESSOA_ID`** deprecated: substituído por `useAuth().pessoa_id` em 26 ficheiros; 3 usos residuais em App.jsx (EquipamentoFicha — TODO 3.4B)
- **Bridge `useEffect`** em App.jsx: session real → `authUser` compatível (para manter componentes que recebem `authUser` prop)
- **`supa.js`** actualizado: `detectSessionInUrl: true`, `flowType: 'pkce'`
- **SQL**: `sql/14_v5_3_4_auth.sql` — `core.pessoas.auth_user_id`, `email_verified`, `ultimo_login`
- **Maria**: precisa de auth user criado no Dashboard (maria.santos@v5demo.pt / Maria2026!) e UPDATE com UUID — ver PASSO A3
- **Login teste**: `maria.santos@v5demo.pt` / `Maria2026!` (após A3)
- **SMTP**: default `noreply@mail.app.supabase.io` (3.4A/B/C); custom Resend em 3.4D pré-launch
- **Débito 3.4B**: onboarding wizard, RLS policies, tipo cliente (Individual/Empresa/Admin)
- **Débito 3.4C**: substituir policies `pre_auth_*`, multi-org switcher
- **Débito 3.4D**: email change re-verify, account delete, SMTP custom

## Estilo de comunicação

- Responder em português de Portugal
- Ser directo, sem elogios vazios
- Propor planos antes de executar mudanças com mais de ~50 linhas
- Parar e esperar confirmação entre fases
- Ao terminar, listar brevemente o que foi alterado e qual o impacto esperado
