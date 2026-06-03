# V2 Legacy → V1 Core Hub Migration — Frontend Functional Gap Audit

**Data:** 2026-05-24
**Autor:** Atlas (aiox-analyst)
**Estado:** Discovery / Read-only — apenas relatório, sem alterações de código
**Audiência:** Mário Carvalho (decisor) + future devs

---

## TL;DR

> **A premissa do brief de spawn está parcialmente errada.** O `index.html` e o `admin/*.html` na raiz deste monorepo **NÃO** são o legacy de `prataowners.pt`. São, respectivamente, o **V9 Owners Club portal** e o **PropTech Control Centre** (admin cross-vertical), e ambos já apontam para V1 Core Hub (`hkmvszkpxjbxmnixzqbl`). Nenhum dos dois liga ao V2 legacy (`eozklslwfaqujaijvdnl`).
>
> A **app de gestão V2 condomínios** (que serve Mário em `prataowners.pt`) **não vive neste repositório como HTML monolítico**. Existe um build sem fontes em [`apps/v2-condomino-mobile/dist/`](apps/v2-condomino-mobile/dist/) com título `Prata Owners — Portal Condóminos`, mas **sem `src/`** (apenas `dist/` + `node_modules/`) — é um deploy artefacto, não código.
>
> A app React [`apps/v2-condominios/`](apps/v2-condominios/) é o substituto canónico já em construção: **23 views funcionais**, build OK, conecta a V1 Core Hub via schema `v2_condominios` (que está populado via mecanismos não totalmente mapeados — o único cron versionado, [`v2-legacy-bridge-cron`](supabase/functions/v2-legacy-bridge-cron/index.ts), apenas espelha `condominos → core.pessoas`).
>
> **Decisão de Mário pendente:** confirmar onde está o HTML/app real que serve `prataowners.pt` (provavelmente num repo separado ou no próprio Supabase como Edge Function de SPA), porque sem inspeccionar o legacy real **não conseguimos garantir feature parity**.

---

## Secção 1 — Inventário de funcionalidades do "legacy HTML" (revisado)

### 1.1 Realidade dos ficheiros HTML na raiz

Inspeccionei [`index.html`](index.html) (785 linhas) e [`admin/index.html`](admin/index.html) + [`admin/index (admin).html`](admin/index%20(admin).html) (1001 + 988 linhas). Conclusões factuais:

#### [`index.html`](index.html) — **V9 Owners Club Portal** (não V2)

- **Título** ([line 6](index.html#L6)): `Owners Club — Área de Cliente`
- **Supabase target** ([line 439](index.html#L439)): `hkmvszkpxjbxmnixzqbl` (V1 Core Hub) com anon key hardcoded
- **API base** ([line 441](index.html#L441)): `${SUPABASE_URL}/functions/v1/core-api`
- **Estética**: tema dourado (Owners Club brand), Cormorant Garamond + Outfit + DM Mono — **não** o tema azul-PropTech
- **Funcionalidades** (auto-contidas, 4 tabs):
  1. **Auth**: magic link por email via Supabase Auth + verificação prévia em `/auth/check?email=`
  2. **Dashboard hero**: cartão digital animado (tier-aware: member/silver/gold), greeting, progress bar de tier, 3 KPIs (pontos · serviços activos · imóveis)
  3. **Tab Serviços**: grid de serviços activos por vertical (condominio/seguros/energia/manutencao/reabilitacao/imoveis) com valor mensal
  4. **Tab Imóveis**: cards de imóveis associados (fracção, condomínio, tipo, morada)
  5. **Tab Ofertas**: protocolos Owners Club filtrados por tier mínimo (gastronomia, stays, lazer, bem-estar, reabilitação)
  6. **Tab Histórico**: timeline de interacções (upgrades, serviços, eventos com pontos)
  7. **Concierge button** decorativo (fixed bottom-right)
  8. **Logout** via `sb.auth.signOut()`
- **APIs consumidas**: `/auth/check`, `/auth/me`, `/ofertas?tier=`
- **Stack externa**: `@supabase/supabase-js@2` via CDN, **sem Chart.js, sem XLSX, sem PDF**, sem export — só leitura + render
- **Dados consumidos**: `pessoa`, `imoveis`, `servicos`, `historico`, `ofertas` — tudo via `core-api` EF (servida do V1 Core Hub)

#### [`admin/index.html`](admin/index.html) — **PropTech Control Centre** (cross-vertical admin, não V2 admin)

- **Título** ([line 6](admin/index.html#L6)): `PropTech — Control Centre`
- **Supabase target** ([line 632](admin/index.html#L632)): `hkmvszkpxjbxmnixzqbl` (V1 Core Hub) — anon key hardcoded
- **Funcionalidades** (8 páginas):
  1. **Login dual-mode**: magic link (admin) + password (vertical staff) — toggle UI
  2. **Financeiro / Overview** (page padrão):
     - 8 KPIs: MRR Total, ARR, ARPU, LTV, Clientes activos, Novos 30d, Churn 30d, Total Pessoas
     - Tabela "MRR por vertical" (vertical, MRR, ARR, clientes, n_servicos)
     - Tabela "Owners Club — Tiers" (tier, n_pessoas, MRR_tier, pontos_medios)
     - **Gráfico de barras Chart.js** "Evolução MRR" (últimos 6 meses, [line 760](admin/index.html#L760))
     - Grid "Saúde das Verticais" (renderHealth)
  3. **Clientes**: tabela filtrável (search + filtro tier) com colunas Nome/Email/Localidade/Tier/Serviços/MRR/Pontos/Fonte; modal de detalhe ao clicar
  4. **CRM Pipeline**: tabela de oportunidades abertas por vertical (Data/Vertical/Produto/Cliente/Estado/Valor est./Origem)
  5. **Leads**: tabela com filtros por vertical (Seguros/Energia/Manutenção) + acção converter lead
  6. **Owners Club**: grid de ofertas com modal CRUD (criar/editar/eliminar oferta — categoria/parceiro/desconto/tier_minimo/validade/activa)
  7. **Staff**: formulário criar membro (nome/email/password/role/scope vertical) + tabela de staff actual com último acesso
  8. **API Keys**: gerador de keys por vertical (mostradas uma única vez) + tabela de keys activas + bloco de código de exemplo de uso
  9. **Developer Hub**: links para Supabase projects, doc da Core API v1.4 (17 endpoints), links Notion, estrutura de pastas
- **Stack externa**: `@supabase/supabase-js@2` + `chart.js@4` via CDN. **Sem XLSX, sem PDF, sem export.**
- **Toggle dark/light** ([line 10](admin/index.html#L10)) com persistência em `localStorage.theme`
- **APIs consumidas** (todas em `/functions/v1/core-api`): `/auth/check`, `/auth/me`, `/auth/staff-check`, `/staff/dashboard`, `/staff/pessoas`, `/financial/kpis`, `/financial/mrr-historico`, `/financial/vertical-health`, `/leads`, `/leads/converter`, `/client/:id`, `/ofertas-admin`, `/api-keys`, `/api-keys/generate`, `/servico`, `/lead`

#### [`admin/index (admin).html`](admin/index%20(admin).html) — variante/backup

- **Idêntico** ao `admin/index.html` no estilo, navegação e funcionalidades — confirmado por leitura comparativa (mesmas 8 páginas, mesma Control Centre)
- Diferença chave: **não tem o handler de toggle dark/light** ([linhas 10-11](admin/index.html#L10-L11) do principal), e os links externos têm `target="_blank"` ligeiramente diferentes. Provavelmente é um backup/variante anterior.
- **Recomendação**: não migrar — eliminar após confirmação.

### 1.2 O que estes HTMLs **NÃO** são

- **Não** são a app de gestão V2 que Mário usa para condóminos/frações/recebimentos
- **Não** ligam ao Supabase V2 (`eozklslwfaqujaijvdnl`) — só ao V1 Core Hub
- **Não** fazem exports XLSX nem PDF (apesar do brief de spawn os mencionar)
- **Não** têm 1941 linhas combinadas que sejam relevantes para V2; têm 2774 linhas mas **0% delas tocam dados V2**

### 1.3 Onde está o legacy V2 real?

**OPEN QUESTION 1**: A app que `prataowners.pt` serve no terreno **não existe como código-fonte neste repo**. Inferências factuais:

- `apps/v2-condomino-mobile/dist/index.html` ([line 8](apps/v2-condomino-mobile/dist/index.html#L8)) — título `Prata Owners — Portal Condóminos`, SPA React (build Vite), **sem `src/`**, com bundle minificado `/assets/index-CSNQrCwX.js`
- Comentário em [`019.5-bia-mia-cleanup`](docs/stories/epics/epic-019-brownfield-cleanup-2026-q2/stories/019.5-bia-mia-cleanup.md) (ver commit `d7c5ec6 chore(cleanup): document apps/v2-condomino-mobile DIST-ONLY status`) confirma que esta pasta é **dist-only** intencionalmente
- A app de **gestão** (admin Mário) também não está aqui. **Possíveis localizações** (a confirmar com Mário):
  - Repo separado (privado?)
  - Servida directamente por edge function do projecto Supabase V2 (`eozklslwfaqujaijvdnl`)
  - Outro deploy Netlify/Vercel ligado a um repo diferente

> **Sem inspeccionar o legacy real, qualquer afirmação sobre "feature parity" entre `apps/v2-condominios/` e o que serve `prataowners.pt` é especulativa.** É o blocker #1 desta auditoria.

---

## Secção 2 — Cobertura React (`apps/v2-condominios/src/views/`)

### 2.1 Inventário das 24 views React

Total: **4256 linhas** distribuídas por 24 ficheiros. Stack: React 19 + Vite 6 + react-router-dom 6.30 + workspace packages `@proptech/auth` / `@proptech/db` / `@proptech/ui` / `@proptech/growth-pixel`. App root: [`apps/v2-condominios/src/App.jsx`](apps/v2-condominios/src/App.jsx).

| View | Linhas | Rota(s) | Schemas tocados | Tabelas / RPCs principais | Funcionalidades |
|---|---:|---|---|---|---|
| [Inicio](apps/v2-condominios/src/views/Inicio.jsx) | 70 | `/` | — (estático) | — | 6 atalhos rápidos + grid de 10 agentes condo (Otto, Dora, Fina, Selma, Enzo, etc.) |
| [PrestacaoContas](apps/v2-condominios/src/views/PrestacaoContas.jsx) | **870** | `/prestacao-contas` | `v2_condominios` | RPC `condo_dashboard_kpis(p_ano)`, `kpis_detalhe`, `orcamentos`, `orcamento_por_fracao`, `extrato_bancario`, `documentos` | **Heart da app.** 4 KPIs (saldo inicial/receitas/despesas/saldo final), resumo financeiro com drill-down por rubrica, 6 tabs: Visão Geral / Orçamento vs Real / Orçamento / Orçamento por Fração / Extrato Bancário / Documentos. Year-aware via `YearContext`. |
| [Mora](apps/v2-condominios/src/views/Mora.jsx) | 215 | `/dividas-2025` `/divida-actual-2026` | `v2_condominios`, `system` | `recebimentos`, `inbox_items` (system) | Aging buckets (<7d/>7d/>30d/>60d/>90d legal); 3 KPIs (dívida total, n_fracções, n_críticas); botão "dispararAviso" que cria entry em `system.inbox_items` (vertical=v2_condominios, target_agent=financeiro-condo ou compliance-condo) |
| [Recebimentos](apps/v2-condominios/src/views/Recebimentos.jsx) | 229 | `/recebimentos` | `v2_condominios` | `recebimentos` (insert via "+ Lançar Recebimento" modal) | Listagem (data/fracção/período/referência/valor) + modal CRUD para inserção manual |
| [Bancos](apps/v2-condominios/src/views/Bancos.jsx) | 163 | `/bancos` | `v2_condominios` | `extrato_bancario` (500 rows), RPC `reconciliar_extrato(p_movimento_id)` | Lista de movimentos com filtros (todos/não-rec/rec); KPIs total/n_rec/n_não-rec; botão reconciliar inline |
| [Condominos](apps/v2-condominios/src/views/Condominos.jsx) | 80 | `/condominos` | `v2_condominios` + `core` | `condominos` (v2) + lookup `core.pessoas` por pessoa_id | Listagem cruzada (fracção/nome/email/tipo/desde) — **demonstra padrão de query inter-schema** |
| [Fracoes](apps/v2-condominios/src/views/Fracoes.jsx) | 90 | `/fracoes` | `v2_condominios` | `fracoes` | Tabela básica (letra/andar/tipologia/permilagem) — empty state explícito sobre importação |
| [Faturas](apps/v2-condominios/src/views/Faturas.jsx) | 168 | `/faturas` | `v2_condominios` | `faturas_pendentes` + embed `fornecedores`, RPC `marcar_fatura_paga(p_fatura_id, p_data_pagamento)` | Filtros por estado, marcação como paga, KPIs total/count/fornecedores |
| [MapaReceitas](apps/v2-condominios/src/views/MapaReceitas.jsx) | 234 | `/mapa-receitas` | `v2_condominios` | (necessita leitura adicional para confirmar) | Mapa de receitas por fracção/período (matriz pivot) |
| [Documentos](apps/v2-condominios/src/views/Documentos.jsx) | 81 | `/documentos` | `v2_condominios` | `documentos` + embed `documentos_drive` + `faturas_ocr` | Grid cards (200 mais recentes) com OCR valor + link Drive |
| [PortalCondomino](apps/v2-condominios/src/views/PortalCondomino.jsx) | 160 | `/portal-condomino` | `v2_condominios` | `portal_tokens` | "Abrir como condómino" — modo impersonation que abre portal cliente com `?token=` em nova tab (útil para suporte/QA) |
| [Automacoes](apps/v2-condominios/src/views/Automacoes.jsx) | 127 | `/automacoes` | `system` (provavelmente) | (necessita leitura adicional) | Gestão de automações/schedules dos agentes condo |
| [Permissoes](apps/v2-condominios/src/views/Permissoes.jsx) | **599** | `/permissoes` | `iam` | `iam.permission_groups`, `iam.permission_sections`, `iam.permission_grants`, `iam.staff_login_aliases` | **2º maior view.** CRUD completo de IAM (ADR-013) — grupos, secções, grants por user |
| [Energia](apps/v2-condominios/src/views/Energia.jsx) | 102 | `/energia` | `v2_condominios` | `carregadores_contagens` + embed `fracoes` | Leituras EV: 3 KPIs (kWh acumulado/valor cobrado/postos activos) + tabela |
| [Seguros](apps/v2-condominios/src/views/Seguros.jsx) | 77 | `/seguros` | `v2_condominios` | `seguro_fracoes` + embed `fracoes` | Apólices por fracção (seguradora/apólice/renovação) |
| [Assembleias](apps/v2-condominios/src/views/Assembleias.jsx) | 92 | `/assembleias` | (necessita leitura adicional) | — | Provavelmente actas/convocatórias — **GAP potencial** (V2 legacy real provavelmente tem mais) |
| [Comunicacao](apps/v2-condominios/src/views/Comunicacao.jsx) | 92 | `/comunicacao` | `system`? | — | Envio de comunicações a condóminos (email-condo Eddy) |
| [Inbox](apps/v2-condominios/src/views/Inbox.jsx) | 72 | `/inbox` | `system` | `system.inbox_items` | Lista de eventos dos agentes em tempo real |
| [Approvals](apps/v2-condominios/src/views/Approvals.jsx) | 77 | `/approvals` | `system` | `system.approvals_queue` | Acções pendentes de aprovação humana |
| [Chat](apps/v2-condominios/src/views/Chat.jsx) | 136 | `/chat` | (Otto chatbot) | — | Conversar com Otto (agente roteador) — vai a EF de chat |
| [Agente](apps/v2-condominios/src/views/Agente.jsx) | 83 | `/agentes/:slug` | — (lib local) | `CONDO_AGENTS` constant | Ficha de cada um dos 10 agentes condo (Otto, Dora, Fina, Selma, Enzo, Astor, Selka, Conrad, Eddy, Iris — provável) |
| [Dashboard](apps/v2-condominios/src/views/Dashboard.jsx) | 204 | **não routed** | (necessita leitura adicional) | (necessita leitura adicional) | View órfã — provavelmente legado da scaffolding inicial |
| [V2Legacy](apps/v2-condominios/src/views/V2Legacy.jsx) | 216 | `/v2-legacy` | V2 legacy direct via `v2LegacyClient` | 28 tabelas listadas em constante (read-only probe) | Painel de inspecção do V2 legacy real — catálogo + live queries para 3 tabelas RLS-off; **único consumer de `v2LegacyClient`** |
| [Stub](apps/v2-condominios/src/views/Stub.jsx) | 19 | (placeholder) | — | — | Placeholder reutilizável |

### 2.2 Schemas tocados pela app React (resumo)

- **`v2_condominios`** (no V1 Core Hub, NÃO no V2 legacy): a vasta maioria das queries — `condominios`, `fracoes`, `condominos`, `recebimentos`, `extrato_bancario`, `faturas_pendentes`, `documentos`, `seguro_fracoes`, `carregadores_contagens`, `orcamentos`, `orcamento_por_fracao`, `portal_tokens`, `kpis_detalhe`. RPCs: `condo_dashboard_kpis`, `reconciliar_extrato`, `marcar_fatura_paga`.
- **`core`**: pessoas (lookup em Condominos) e indirectamente via bridge
- **`iam`** (ADR-013): toda a página Permissoes
- **`system`**: inbox_items + approvals_queue (Mora dispara avisos, Inbox/Approvals consomem)
- **`v2_condominios` no V2 legacy (eozklslwfaqujaijvdnl)**: APENAS via `V2Legacy.jsx` (read-only probe, não-produção)

### 2.3 Matriz de cobertura legacy HTML ↔ React

Como o legacy HTML real não está acessível neste repo, esta matriz só pode ser feita contra o que o brief afirmou e contra o catálogo de 28 tabelas V2 conhecido (de [`V2Legacy.jsx`](apps/v2-condominios/src/views/V2Legacy.jsx#L8-L37)):

| Domínio legacy V2 (tabelas) | Linhas reais | View React equivalente | Estado de cobertura |
|---|---:|---|---|
| `condominios` (1) | 1 | implícito em todas | OK |
| `fracoes` (97) | 97 | Fracoes | OK (basic) |
| `condominos` (65) | 65 | Condominos | OK (precisa bridge `core.pessoas`) |
| `historico_proprietarios` (97) | 97 | **GAP** | **P1** — não vi view |
| `utilizadores_portal` (64) | 64 | PortalCondomino (impersonation only) | **P0** — não há CRUD de utilizadores; apenas impersonation |
| `portal_acessos` (50) | 50 | **GAP** | **P2** — logs de acesso ao portal |
| `permissoes_grupo` (52) | 52 | Permissoes (IAM canónico) | OK (migrado para schema `iam`) |
| `recebimentos` (593) | 593 | Recebimentos + Mora | OK |
| `faturas_pendentes` (172) | 172 | Faturas | OK |
| `faturas_ocr` (99) | 99 | Documentos (embed) | OK (read-only) |
| `extrato_bancario` (1056) | 1056 | Bancos | OK |
| `orcamentos` (83) | 83 | PrestacaoContas (tab Orçamento) | OK |
| `orcamento_por_fracao` (294) | 294 | PrestacaoContas (tab Orçamento por Fração) | OK |
| `fornecedores` (13) | 13 | Faturas (embed) | parcial — sem CRUD de fornecedores standalone — **P2** |
| `dividas_*_snapshot` (67) | 67 | (não acedido directamente) | **P2** — snapshots históricos |
| `financeiro_snapshot` (29) | 29 | (não acedido) | **P2** |
| `configuracoes` (12) | 12 | **GAP** | **P0** — configurações do condomínio (admin) |
| `documentos` (2733) | 2733 | Documentos | OK (read-only — sem upload) |
| `documentos_drive` (93) | 93 | Documentos (embed) | OK |
| `documentos_institucionais` (11) | 11 | **GAP** | **P1** — docs institucionais (regulamentos, etc.) |
| `seguro_fracoes` (98) | 98 | Seguros | OK (read-only — sem CRUD) |
| `carregadores_contagens` (359) | 359 | Energia | OK (read-only) |
| `eventos` (7) | 7 | **GAP** | **P2** — histórico de eventos |
| `audit_log` (151) | 151 | **GAP** | **P1** — audit trail (compliance) |
| `email_log` (27) | 27 | **GAP** | **P2** — log de emails enviados |
| `envios_log` (0) | 0 | **GAP** | **P3** — vazio, irrelevante |
| `assembleias` (?) | ? | Assembleias | **a confirmar** — view existe mas não vi o schema usado |

### 2.4 Funcionalidades adicionais React (não no legacy V2)

A app React introduz **funcionalidades novas inexistentes no V2 legacy**:

- **10 agentes AI cards** (Inicio + Agente views) — funcionalidade CookAI / agentic
- **Inbox / Approvals queue** (system.*) — sistema de aprovações agentic
- **Chat com Otto** — chatbot vertical
- **Permissões IAM cross-vertical** (schema `iam` ADR-013) — substitui o `permissoes_grupo` local
- **Multi-tenant condomínios** (commits recentes `d6201d1 feat(v2): área Condomínios (multi-tenant)` e `4a7dce3 feat(v2): multi-tenant condomínios + agente responde em nome do condo`)
- **Growth pixel tracking** (ADR-015)

---

## Secção 3 — Análise de risco

### 3.1 Uso de `v2LegacyClient` na app React

Confirmado por grep e inspecção: **apenas [`apps/v2-condominios/src/views/V2Legacy.jsx`](apps/v2-condominios/src/views/V2Legacy.jsx)** importa `v2LegacyClient`. Todas as outras views usam `v2Client` (que aponta para V1 Core Hub schema `v2_condominios`). Logo, **a substituição do legacy NÃO quebra nada na app React além da inspecção debug** — e mesmo essa pode continuar a funcionar paralelamente até ao sunset.

### 3.2 Mismatch de schemas: `core.*` vs `v2_condominios.*`

A app React faz queries a:
- `v2Client.from('condominos')` → schema `v2_condominios` no V1 Core Hub
- `coreClient.from('pessoas').in('id', pessoaIds)` → schema `core` no V1 Core Hub

Logo, **a app já assume o modelo "v2_condominios é espelho, core é canónico"**. Não há mismatch — está consistente. A única dependência cruzada visível é em [`Condominos.jsx`](apps/v2-condominios/src/views/Condominos.jsx#L22-L30) onde junta v2 + core.

### 3.3 Cobertura do cron bridge

O cron [`v2-legacy-bridge-cron`](supabase/functions/v2-legacy-bridge-cron/index.ts) é **muito limitado**:

- Lê **apenas** `v2.condominos` (linha [254-259](supabase/functions/v2-legacy-bridge-cron/index.ts#L254-L259))
- Escreve **apenas** em `core.pessoas` no V1 Core Hub
- Faz dedup waterfall (NIF → email → telefone → fuzzy nome+morada → INSERT)

**Não sincroniza** `recebimentos`, `extrato_bancario`, `faturas_pendentes`, `documentos`, `fracoes`, `seguro_fracoes`, `carregadores_contagens`, `orcamentos`, `orcamento_por_fracao`, etc.

**OPEN QUESTION 2**: O brief de spawn afirma que `v2_condominios.*` no V1 Core Hub já tem dados (951 extrato, 1189 recebimentos, 192 docs, 97 fracoes). **Como lá chegaram?** Inferências:

- Importação manual feita pelo Mário/agentes
- Outro cron/EF não versionada em git
- Bridge anterior que foi entretanto removida ou consolidada

> **Sem responder a esta pergunta, não conseguimos garantir que a app React em `apps/v2-condominios/` continua a ver dados frescos.** Se a única fonte de dados é manual, então fica-se com snapshot — não com sistema vivo.

### 3.4 Risco de quebrar utilizadores reais

Dados conhecidos do V2 produção (de [`V2Legacy.jsx`](apps/v2-condominios/src/views/V2Legacy.jsx#L14-L15)):
- **64 utilizadores portal** (login condómino)
- **65 condóminos** registados
- **97 fracções**
- **151 entradas audit_log**

O **portal condómino público** (que esses 64 utilizadores usam) **NÃO está na app `apps/v2-condominios/`** — esta é a app de gestão admin. O portal é provavelmente o build dist-only em [`apps/v2-condomino-mobile/dist/`](apps/v2-condomino-mobile/dist/) que serve `Prata Owners — Portal Condóminos`.

**Risco crítico**: substituir o legacy sem antes ter o portal condómino também migrado **deixa os 64 utilizadores sem acesso**. Esse trabalho **não está scope desta auditoria** mas é um blocker para o cutover.

### 3.5 Risco de dados desactualizados

Se o V2 legacy continua a receber writes (Mário lança recebimentos lá, faturas chegam à inbox da Dora que escreve em V2 legacy, etc.), então a app React em `apps/v2-condominios/` está a **ver snapshot stale** salvo se houver bridge mais completo que o single-cron versionado.

---

## Secção 4 — Caminho de migração recomendado em fases

| Fase | Objectivo | Duração estimada | Dependências |
|---|---|---:|---|
| **0** | Inventário definitivo: localizar o repo/build do legacy V2 real que serve `prataowners.pt`; mapear que cron/EF/script popula `v2_condominios.*` no V1 hoje. Resolver as 5 OPEN QUESTIONS abaixo. | 1-2 dias | Confirmação Mário |
| **1** | Feature parity audit contra o legacy real (não contra suposições). Preencher GAPs P0 identificados: `configuracoes` (admin), `utilizadores_portal` CRUD, cobertura de Assembleias. Documentar GAPs P1/P2 aceitáveis. | 5-8 dias | Fase 0 OK |
| **2** | Smoke test exaustivo de `apps/v2-condominios/` contra V1 Core Hub: validar todas as RPCs (`condo_dashboard_kpis`, `reconciliar_extrato`, `marcar_fatura_paga`), validar inserts (Recebimentos modal, Mora dispararAviso), validar embed queries. Comparar resultados side-by-side com legacy real. | 3-4 dias | Fase 1 OK |
| **3** | Deploy preview paralelo (Vercel preview URL para `apps/v2-condominios/`, não tocar Netlify de `prataowners.pt`). Mário testa workflows-chave durante 2-3 semanas em paralelo, registando bugs em `system.inbox_items`. | 2-3 semanas | Fase 2 OK |
| **4** | Switch de produção: actualizar DNS de `prataowners.pt` (ou subdomínio) para apontar ao novo deploy. Manter legacy a 24/7 ainda no Supabase V2 para rollback rápido (DNS revert <5 min). **Esta fase é decisão única do Mário.** | 1 dia | Fase 3 aprovada |
| **5** | Sunset: após 30+ dias estáveis em produção sem incidentes, congelar writes no V2 legacy, dump final, e arquivar projecto Supabase V2 (não apagar — manter para auditoria 5+ anos por compliance financeiro/AT). | 1 dia + observação contínua | Fase 4 estável 30d |

**Effort total realista**: 6-10 semanas, dominado por Fase 1 (preencher GAPs) e Fase 3 (paralelismo + correcção de bugs descobertos).

---

## Secção 5 — Open questions ao Mário (top 5)

1. **Onde está o código-fonte do legacy V2 real que serve `prataowners.pt`?** Não está neste monorepo. Está noutro repo? Edge function? Outro Netlify/Vercel? Sem este código, qualquer "feature parity claim" é especulativo.

2. **Que mecanismo popula `v2_condominios.*` no V1 Core Hub?** O único cron versionado em git só sincroniza `condominos → core.pessoas`. Como é que 1189 recebimentos, 951 extrato, 192 docs lá chegaram? Há outro cron/EF/script?

3. **Confirmar scope da app `apps/v2-condominios/`**: é só a **app de gestão admin** do Mário? Ou também substitui o **portal condómino público** (que tem 64 utilizadores reais)? Se for só admin, o portal mobile precisa de migração separada — **`apps/v2-condomino-mobile/` (dist-only)** continua a ser servido em paralelo?

4. **Há features no legacy V2 que já foram intencionalmente deprecated?** Antes de fazer parity, queremos cortar o que já não é usado. Casos suspeitos pelo catálogo: `dividas_*_snapshot` (snapshots históricos, talvez já não usados), `envios_log` (0 linhas), `documentos_institucionais` (11 linhas — ainda relevante?).

5. **Política de fallback**: se cutover correr mal, o plano é DNS revert para Netlify legacy em <5 min. Está OK manter projecto Supabase V2 ligado e activo durante 30+ dias após switch para suportar rollback rápido? Custo Supabase Pro plan (~25€/mês) é aceitável durante esse período?

**OPEN QUESTION 6 (bónus)**: A V9 Owners Club ([`index.html`](index.html) na raiz) e a PropTech Control Centre ([`admin/index.html`](admin/index.html)) **também são HTMLs legacy que devem ser migrados para React** (já há `apps/dashboard/`). Está no scope desta migração ou são tracks separados (provavelmente já cobertos em epic-019, story `019.14-rename-v10-owners-club`)?

---

## Anexo A — Evidências do filesystem

- App React V2 (substituta canónica): [`apps/v2-condominios/`](apps/v2-condominios/) — 24 views, 4256 linhas, build OK em `dist/`
- App "mobile" (dist-only, portal condóminos): [`apps/v2-condomino-mobile/`](apps/v2-condomino-mobile/) — sem `src/`, apenas `dist/index.html` + `node_modules/`
- Bridge único: [`supabase/functions/v2-legacy-bridge-cron/index.ts`](supabase/functions/v2-legacy-bridge-cron/index.ts) — só condominos→pessoas
- HTMLs raiz (NÃO são V2 legacy admin): [`index.html`](index.html) (V9 Owners Club), [`admin/index.html`](admin/index.html) (PropTech Control Centre)
- Inventário canónico do V2 legacy 28 tabelas: [`apps/v2-condominios/src/views/V2Legacy.jsx`](apps/v2-condominios/src/views/V2Legacy.jsx#L8-L37)
- Clients V1↔V2: [`apps/v2-condominios/src/lib/clients.js`](apps/v2-condominios/src/lib/clients.js)
- Routes: [`apps/v2-condominios/src/App.jsx`](apps/v2-condominios/src/App.jsx#L64-L89)

---

**Confiança da análise**: ALTA para o que está neste repo; **BAIXA** para feature parity contra o legacy real (que não está aqui).
**Próxima acção sugerida**: Mário responde às 6 OPEN QUESTIONS antes de qualquer trabalho de Fase 1.
