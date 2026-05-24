# V2 Migration Plan — `test-v2.html` (legacy) → `apps/v2-condominios/` (React)

**Data:** 2026-05-24
**Autor:** Atlas (aiox-analyst)
**Companion de:** [`V2-INVENTORY-COMPLETE-2026-05-24.md`](V2-INVENTORY-COMPLETE-2026-05-24.md)
**Premissa do Mário:** "replicar tudo no V1 porque V2 está em HTML monolítico vanilla e quer tudo em React"
**Capacidade assumida:** 1 dev (Mário + AI agents) a ~20h/semana

---

## 0. Resumo executivo

| Aspecto | Valor |
|---|---|
| **Effort total estimado** | 75-100 dias-dev (P0+P1) ⇒ **6-9 meses calendário** a 20h/sem |
| **Effort apenas P0 (cutover-ready mínimo)** | 43-60 dias-dev ⇒ **4-6 meses** a 20h/sem |
| **Fases propostas** | 7 (Fase 0 → Fase 6 sunset) |
| **Risco máximo** | Quebrar 64 utilizadores reais do portal condómino (`apps/v2-condomino-mobile`) e o cliente Property 007 LDA (€5k/mês ARR potencial) |
| **Pre-flight blocker** | Resolver as 5 OPEN QUESTIONS antes da Fase 1 |
| **Custos Supabase paralelo** | ~25€/mês (Pro plan V2 mantido durante rollback window ~30-60 dias) |

---

## 1. Princípios e constraints

1. **V2 produção (`prataowners.pt` + Supabase `eozklslwfaqujaijvdnl`) é INTOCÁVEL** até cutover validado por Mário (Regra D4 do `CLAUDE.md`).
2. **App React vai para Vercel** (Preview por branch, Production só após merge a `main` por Mário — Regra D2).
3. **Portal condómino mobile (`apps/v2-condomino-mobile/`) é track paralelo** — não bloquear admin migration por isso, mas tem de estar pronto **antes** do DNS switch.
4. **Reaproveitar `@proptech/` workspace packages** (`auth`, `db`, `ui`, `growth-pixel`) — não recriar primitivas.
5. **Schemas no V1 Core Hub** (`hkmvszkpxjbxmnixzqbl`) já têm a estrutura `v2_condominios.*` provisionada (2897 refs) — confirmar mecanismo de povoamento (OPEN #1).
6. **Cada Fase só fecha quando**: (a) PR mergeada em `main`, (b) Vercel Preview validado, (c) smoke test definido nesta secção passa, (d) Mário valida live, (e) rollback procedure documentada e testada.
7. **Read-only neste documento** — nenhuma migration SQL é proposta aqui; só pointers ao que precisa de existir.

---

## 2. Pre-flight checklist (Fase 0)

**Duração:** 3-5 dias. **Bloqueia tudo o que vem depois.**

### 2.1 OPEN QUESTIONS a fechar (Mário decide)

| # | Pergunta | Decisão necessária | Impacto se não resolvido |
|---|---|---|---|
| OQ1 | Como `v2_condominios.*` no V1 é populado hoje? | Identificar cron/EF/script ou confirmar que é manual | App React mostra dados stale; risco silencioso de dessincronia |
| OQ2 | `apps/v2-condomino-mobile/dist/` está em produção? | Sim/não. Se sim, qual track de migração paralelo. | 64 utilizadores quebram no cutover |
| OQ3 | EFs `migrar-fatura` e `send-login-link` existem só no V2? | Migrar/recriar em V1 antes da Fase 4 (OCR) e Fase 1 (Auth) | OCR e login não funcionam em V1 |
| OQ4 | Bug em produção `ReferenceError: condomino is not defined` (4×/load) | Localizar e fixar agora antes de migrar | Carrega para a React; perde-se oportunidade de fix limpo |
| OQ5 | Política sunset V2 (manter quantos dias paralelo) | 30 / 60 / 90 dias | Custo Supabase + janela rollback |

### 2.2 Pre-requisitos técnicos

- [ ] **Variáveis ambiente** (`.env.example`) actualizado com `VITE_SUPABASE_URL` (V1 Core Hub), `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_V2_LEGACY_ANON_KEY` (debug only).
- [ ] **Bridge cron completo** (alargado para além do actual `condominos → core.pessoas`): definir scope com supabase-designer (separado deste plano).
- [ ] **Domínio Vercel preview** stable para Mário testar: `v2-condominios-prata.vercel.app` (ou similar) já configurado no projecto `proptech-v2-alpha` (a criar).
- [ ] **Project Vercel "proptech-v2-alpha"** criado, Production Branch = `main`, root directory = `apps/v2-condominios`.
- [ ] **Confirmar Edge Functions disponíveis em V1**: `send-email`, `ocr-fatura`, `v2-recibo-pdf`. Se faltar alguma, OQ3 resolve.
- [ ] **`@proptech/ui` design system** está pronto com cores PRATA OWNERS (dark + light)? — confirmar antes da Fase 1.

### 2.3 Smoke test Fase 0

- App React em Preview Vercel carrega sem erros JS.
- Login staff (via `@proptech/auth` + `iam.staff_login_aliases`) funciona com credenciais reais de Mário (`BOSSMC` ou equiv).
- Prestação de Contas mostra KPIs do ano 2026 com valores **idênticos** ao screenshot 11 (Saldo Inicial 77 245,15 €, Receitas 19 759,84 €, Despesas 15 870,93 €, Saldo Final 81 134,06 €).
- **Critério go/no-go**: se KPIs ≠ legacy, OQ1 não está resolvido → não avançar.

---

## 3. Fases (sequência recomendada)

### Fase 1 — Foundations: Auth completa + i18n + Multi-condomínio + Charts

**Duração:** 8-12 dias-dev (~3-4 semanas calendário)
**Objectivo:** elevar a app React ao mesmo nível "shell" do legacy (sem ainda atacar features admin profundas).

#### Scope técnico

- **Auth (3 fluxos completos)**:
  - Staff login user/pwd via `iam.staff_login_aliases` ✅ (já existe parcial)
  - Magic link email para condómino (via `send-email` EF + token persistido)
  - Token URL `?token=` para portal condómino (RPC equivalente a `portal_get_condomino`)
- **i18n PT/EN**: criar `src/i18n/` com `pt.json` + `en.json`, hook `useT(key)`. Refactor de **todos os labels visíveis** (estimativa: ~80-100 strings)
- **Topbar componente completo**: chips multi-condomínio (Prata 2A · Global), multi-ano (2024/2025/2026), botões EN/PDF/Dark, "Atualizar Extrato" no sidebar footer (placeholder até Fase 3)
- **Multi-condomínio scope context** (`CondominioContext.jsx`) similar ao `YearContext`
- **Charts em Prestação de Contas**: `Chart.js 4` em React via `react-chartjs-2`, gráfico linha receitas/despesas mensais + donut despesas por rubrica
- **Drill-down completo do Resumo Financeiro** (6 linhas: Saldo Final, Dívidas Condóminos, Dívidas Fornecedores, Valores em análise, Valores a devolver, Saldo Financeiro, FCR recebido) — usar `kpis_detalhe` já em uso

#### Ficheiros a tocar (estimado)

| Path | Acção |
|---|---|
| `apps/v2-condominios/src/i18n/{pt,en}.json` | criar |
| `apps/v2-condominios/src/i18n/useT.js` | criar |
| `apps/v2-condominios/src/context/CondominioContext.jsx` | criar |
| `apps/v2-condominios/src/components/Topbar.jsx` | reescrever (multi-cond + i18n + PDF btn + atualizar-extrato hint) |
| `apps/v2-condominios/src/components/Sidebar.jsx` | refactor para `useT()` |
| `apps/v2-condominios/src/views/PrestacaoContas.jsx` | adicionar 2 charts + drill-down completo |
| `apps/v2-condominios/src/views/LoginScreen.jsx` (ou equiv. em `components/`) | adicionar fluxo magic-link + token |
| `apps/v2-condominios/package.json` | adicionar `chart.js`, `react-chartjs-2` |
| `apps/v2-condominios/src/lib/i18n.test.js` | tests básicos chaves PT/EN paridade |

#### Dependências

- Fase 0 fechada (OQ3 resolvido para magic-link funcionar)
- `@proptech/auth` aceita callbacks de magic-link (validar com architect-proptech)

#### Riscos

- **R1**: i18n refactor toca 24 views — fácil escapar strings. Mitigação: lint rule `no-string-literal-in-jsx` (eslint-plugin-formatjs ou custom).
- **R2**: Charts em SPA Vercel podem ter SSR issues — fix: lazy import `chart.js`.
- **R3**: `CondominioContext` quebra `YearContext` se mal coordenado — Mitigação: provider order definido + tests.

#### Smoke test Fase 1

- [ ] Toggle EN no topbar muda todos os labels visíveis em `/` e `/prestacao-contas` (manual cross-check com legacy)
- [ ] Chart linha + donut em `/prestacao-contas` renderizam com dados reais
- [ ] Drill-down resumo financeiro: clicar em "Dívidas Condóminos ›" expande sub-tabela
- [ ] Multi-condomínio toggle "Global" muda KPIs (se só 1 condo registado, valor = Prata 2A)
- [ ] Magic-link flow: cliente recebe email com token, abre no browser, vê portal cond simulado (mesmo que conteúdo seja placeholder)

#### Rollback Fase 1

- Reverter merge dos PRs Fase 1 → Vercel rebuild automático
- Production só foi tocada no merge a `main` → revert é git revert + push

---

### Fase 2 — Admin core: Condóminos, Fracções, Faturas, Bancos, Configurações

**Duração:** 12-15 dias-dev (~4-5 semanas)
**Objectivo:** paridade dos workflows admin diários do Mário.

#### Scope técnico

- **Condóminos**:
  - Tabela completa (colunas Nome/Email/Telefone/NIF/Morada Fiscal + status email + ✏)
  - Modal `+ Novo Condómino` (RPC equivalente a `portal_admin_create_condomino` ou INSERT directo + RLS via iam)
  - Modal edit ficha (multi-tab: Quota mensal / Dívidas / IBAN / Documentos + contactos múltiplos)
  - Toggle "Mostrar inativos"
  - Acções bulk: Email (selecionar + abrir modal Resend) / WhatsApp (deep link) / Imprimir (PDF lista)
  - **Histórico de proprietários** drawer por fracção (`historico_proprietarios` em V1 já existe)
  - **Transferência de fracção** modal (mudança de proprietário com data + history insert)
  - Lookup CEP CTT (RPC `portal_lookup_codpostal` portado)
- **Fracções**:
  - Tabela com permilagem total
  - Botão `+ Novo / Transferir`
- **Faturas (admin)**:
  - Modal `+ Lançar Fatura` (fornecedor/valor/data/nº/rubrica)
  - CRUD Fornecedores standalone (separado de Faturas modal)
  - Filtros: estado, fornecedor, ano, rubrica
  - Export CSV
- **Bancos**:
  - Botão "Associar documento" inline por movimento (modal upload Drive + update `drive_url`)
  - Toggle "sem fatura" por movimento
- **Configurações condomínio**:
  - Página `/configuracoes` (admin only)
  - Campos: NIF, IBAN, código postal, morada, contactos admin
  - Salva em `v2_condominios.configuracoes` ou `condominios.config_jsonb`

#### Ficheiros a tocar

- 9 views novas/refactor em `apps/v2-condominios/src/views/`: `Condominos.jsx`, `Fracoes.jsx`, `Faturas.jsx`, `Bancos.jsx`, novas `Configuracoes.jsx`, `Fornecedores.jsx`, `HistoricoProprietarios.jsx`
- Components reusáveis em `apps/v2-condominios/src/components/`: `CondominoModal.jsx`, `FaturaModal.jsx`, `TransferirFracaoModal.jsx`, `BulkActionsBar.jsx`
- Routes em `App.jsx`: `/configuracoes`, `/fornecedores`
- Sidebar adicionar items "Configurações" e "Fornecedores"
- Backend (separado, não neste PR): RPCs equivalentes às 7-8 `portal_admin_*` a criar em V1 schema `v2_condominios`

#### Dependências

- Fase 1 fechada
- Schema `v2_condominios.configuracoes` populado com dados de Prata 2A (1 row)
- RPCs admin criadas em V1 (trigger para supabase-designer)

#### Riscos

- **R4**: Migração de dados de configuração legacy → V1 pode falhar (NIF/IBAN críticos). Mitigação: dump V2 antes + diff manual.
- **R5**: Bulk actions (mass email) pode disparar Resend rate-limit. Mitigação: chunking 50/batch + delay 1s.
- **R6**: Modal Edit Condómino é o componente mais complexo do admin (multi-tab + multi-CRUD). Risco de regressão visual vs legacy.

#### Smoke test Fase 2

- [ ] Criar novo condómino fictício "Test 2026" via modal → aparece na lista
- [ ] Editar contactos do "Test 2026" → save → re-fetch confirma
- [ ] Transferir fracção 12-A1A para "Test 2026" → histórico mostra a transferência
- [ ] Lançar fatura fictícia + marcar paga + confirmar log em `email_log` (se trigger email)
- [ ] Export CSV faturas tem mesmas colunas/order que legacy
- [ ] Configurações: alterar IBAN simulado → save → recarregar → persistiu

#### Rollback Fase 2

- Toda escrita admin tem que ter DELETE flag em modais de teste
- Se cutover falha, dados criados em V1 paralelo não afectam V2 produção

---

### Fase 3 — Bancos avançado: Upload XLSX extrato + reconciliação manual

**Duração:** 5-7 dias-dev (~2 semanas)
**Objectivo:** substituir o workflow crítico "🔄 Atualizar Extrato" (sidebar footer).

#### Scope técnico

- **Upload XLSX**:
  - Drag-drop em sidebar footer (mesma posição do legacy)
  - Parse client-side com `xlsx` library (NPM, não CDN)
  - Preview da tabela parsed (primeiras 10 linhas + count total)
  - Chunks de 50 rows → RPC `extrato_upsert` em V1 (criar análoga à `portal_extrato_upsert` legacy)
  - Progress bar + relatório final (inseridos/duplicados/erros)
- **Reconciliação manual avançada**:
  - Modal "Associar movimento → documento" com search de documentos + Drive upload se não existir
  - Update `extrato_bancario.drive_url` + `extrato_bancario.documento_id`

#### Ficheiros a tocar

- `apps/v2-condominios/src/components/AtualizarExtratoModal.jsx` (novo)
- `apps/v2-condominios/src/components/Sidebar.jsx` (adicionar slot footer)
- `apps/v2-condominios/src/views/Bancos.jsx` (adicionar AssociarDocModal)
- `apps/v2-condominios/package.json`: + `xlsx` (CVE check antes — biblioteca já teve CVEs)

#### Dependências

- Fase 2 fechada
- RPC `extrato_upsert` criada em V1 (trigger supabase-designer)

#### Riscos

- **R7**: XLSX library tem CVE histórico (Prototype Pollution). Mitigação: pin a versão patched + audit.
- **R8**: Chunks RPC podem timeout em ficheiros grandes (5000+ linhas). Mitigação: client-side throttle.

#### Smoke test Fase 3

- [ ] Upload XLSX real do extrato de Abril 2026 → tabela parsed correcta → upsert insere movimentos novos sem duplicar antigos
- [ ] Associar movimento "Easyfresh - Limpeza" a documento via modal → `drive_url` actualizado

---

### Fase 4 — OCR de Faturas (workflow completo)

**Duração:** 8-12 dias-dev (~3-4 semanas)
**Objectivo:** restaurar fluxo OCR end-to-end (admin emails recebem PDF → OCR auto → review → associar).

#### Scope técnico

- **Upload PDF**:
  - Drag-drop em `/faturas` com botão "+ OCR Fatura"
  - POST para EF `ocr-fatura` (já existe em V1)
- **Review OCR modal**:
  - Mostrar fields detectados (fornecedor, NIF, número fatura, valor, data, rubrica)
  - Edit inline + save → bulk update `faturas_ocr` + `faturas_pendentes`
  - Botão "Migrar para Pendente" → EF `migrar-fatura` (resolver OQ3 primeiro)
  - Dedup waterfall warning (número fatura + NIF duplicate check)
- **Views adicionais**:
  - Tab "Histórico OCR" — view `v_ocr_historico`
  - Tab "Faturas sem OCR" — view `v_faturas_sem_ocr`
- **Auto-upsert NIF fornecedor** quando OCR detecta NIF novo

#### Ficheiros a tocar

- `apps/v2-condominios/src/views/Faturas.jsx` (refactor — adicionar tabs OCR)
- `apps/v2-condominios/src/components/OCRReviewModal.jsx` (novo)
- `apps/v2-condominios/src/components/UploadFaturaButton.jsx` (novo)

#### Dependências

- Fase 3 fechada
- EF `migrar-fatura` resolvida (OQ3) ou substituída por RPC

#### Riscos

- **R9**: OCR async — UX precisa de loading state robusto + retry. Mitigação: realtime subscription ou poll cada 3s.
- **R10**: Dedup waterfall (número + NIF) pode dar falsos positivos. Mitigação: confirm modal sempre.

#### Smoke test Fase 4

- [ ] Upload fatura PDF real de fornecedor "EDP" → OCR returns campos → review modal mostra valores correctos → Migrar → aparece em Faturas Pendentes
- [ ] Upload mesma fatura 2x → 2ª vez avisa "Possível duplicado"

---

### Fase 5 — Centro de Automações (Avisos / Emails / Quota EV / Templates)

**Duração:** 12-15 dias-dev (~4-5 semanas)
**Objectivo:** substituir o Centro de Automações 8-cards. Este é o coração operacional do Mário.

#### Scope técnico (1 sub-fase por card)

- **5.1 Emissão de Avisos** (selector mês+ano + RPC `emitir_avisos` em V1) — 2d
- **5.2 Envio de Avisos por Email** (modal "escolher destinatários" + chunked send via EF `send-email`) — 3d
- **5.3 Envio de Conta Corrente** (anexar PDF da CC gerada via `v2-recibo-pdf` ou nova EF) — 2d
- **5.4 Quota Extra Carregadores** (preview + emitir; RPCs `get_carregadores_datas` + `preview_quota_extra` + `emitir_quota_extra`) — 3d
- **5.5 Teste Email** + **Templates** (CRUD em `v2_condominios.email_templates` nova tabela ou JSONB em config) — 2d
- **5.6 Histórico de Emails** (view de `email_log`) — 1d
- **5.7 Lista de Destinatários** (read-only filter dos condóminos com email) — 0.5d

#### Ficheiros a tocar

- `apps/v2-condominios/src/views/Automacoes.jsx` (reescrever completamente, 127L → ~600-800L)
- 8 sub-components em `apps/v2-condominios/src/components/automacoes/`
- Helper `buildEmailHtml(nome, body, portalUrl)` (já existe em legacy [`L7284`](test-v2.html#L7284), portar)
- Tabela nova `v2_condominios.email_templates` (trigger supabase-designer)

#### Dependências

- Fase 4 fechada
- EF `send-email` confirmada e configurada com Resend key
- Schema `email_templates` criado em V1

#### Riscos

- **R11**: Emissão de avisos é destrutiva (cria 32 rows por mês). Mitigação: confirm modal duplo + log audit obrigatório.
- **R12**: Quota Extra usa valores reais de carregadores — erro de cálculo cobra valor errado a 32 condóminos. Mitigação: preview obrigatório + Mário valida manualmente antes Emitir.
- **R13**: Templates `localStorage` no legacy → V1 precisa DB-backed para multi-device. Mudança comportamental — comunicar.

#### Smoke test Fase 5

- [ ] Emitir avisos Maio 2026 (mês teste) → 32 rows criadas → comparar count vs legacy
- [ ] Enviar email teste para `mariocarvalho.biz@gmail.com` → recebido
- [ ] Quota EV: preview entre 2 datas → totais batem com legacy ± 0.01 €
- [ ] Templates: editar template "Aviso", guardar, recarregar página → persistiu

---

### Fase 6 — Portal Condómino (público)

**Duração:** 15-20 dias-dev (~5-7 semanas)
**Objectivo:** substituir `apps/v2-condomino-mobile/dist/` (que serve 64 utilizadores reais).

> **Decisão chave**: integrar dentro de `apps/v2-condominios/` (rota `/portal/:token`) **ou** manter app separada (`apps/v2-condominios-portal/`)?
> **Recomendação**: app separada para evitar bundle bloat + permitir branding mobile-first diferente. Stack idêntica.

#### Scope técnico

- **App shell** mobile-first (sidebar drawer)
- **6 rotas**: `/`, `/pendentes`, `/conta-corrente`, `/carregador`, `/documentos`, `/ficha`
- **Auth**: token URL `?token=` ou magic-link email
- **Pendentes** com badge contador (avisos não pagos)
- **Conta Corrente** completa (extracto + saldos + recibos)
- **Recibos PDF** (consumir EF `v2-recibo-pdf` que já existe)
- **Avisos PDF** (gerar via jsPDF)
- **Carregador EV** com gráfico Chart.js + tabela de leituras
- **Mapas** (Orçamento em Vigor, Quotas por Fracção, Dívidas, Prestação)
- **Ficha**: editar dados próprios (RPC `update_condomino_self`)
- **Documentos** institucionais (filtrados RLS por condomínio)
- **Log de acessos** automático em `iam.activity_logs`

#### Ficheiros a tocar

- Criar `apps/v2-condominios-portal/` (nova app workspace)
- 6 views: `Inicio.jsx`, `Pendentes.jsx`, `ContaCorrente.jsx`, `Carregador.jsx`, `Documentos.jsx`, `Ficha.jsx`
- Auth components: `MagicLinkLogin.jsx`, `TokenLogin.jsx`
- Reuse `@proptech/ui` Sidebar/Topbar/Modal
- Manifest PWA + apple-touch-icon + offline shell básica (opcional)

#### Dependências

- Fase 5 fechada (templates/email working)
- RPCs `portal_*` portadas para V1 (~10 RPCs)
- DNS subdomain `portal.prataowners.pt` (decisão Mário) ou path `/portal`

#### Riscos

- **R14**: 64 utilizadores reais — qualquer regressão visível causa reclamações ao Mário em horas. Mitigação: paralelismo prolongado + opt-in switch.
- **R15**: Magic-link em mobile pode falhar (apps default browsers diferentes). Testar iOS Safari + Android Chrome + WhatsApp in-app browser.
- **R16**: Recibos PDF têm de bater 1:1 com legacy (formato AT auditável). Mitigação: EF `v2-recibo-pdf` já existe → confirmar formato.

#### Smoke test Fase 6

- [ ] 5 condóminos reais (escolhidos por Mário) acedem via magic-link → vêem CC com mesmos valores que legacy
- [ ] Recibo PDF Abril 2026 — diff visual vs legacy aceitável
- [ ] Carregador EV: condómino com fracção 2A006 vê leituras correctas + gráfico
- [ ] Ficha: condómino edita o seu próprio telefone → save → admin vê actualizado

---

### Fase 7 — Cutover + Sunset V2

**Duração:** 1 dia cutover + 30-60 dias observação
**Objectivo:** mover `prataowners.pt` para o novo deploy, desactivar V2 Supabase.

#### 7.1 Pre-cutover (1 semana antes)

- [ ] **Freeze de features** em ambos os ambientes (não criar mais bugs)
- [ ] **Diff final**: query side-by-side V2 ↔ V1 das 10 tabelas mais críticas (`extrato_bancario`, `recebimentos`, `faturas_pendentes`, `condominos`, `fracoes`, `documentos`, `seguro_fracoes`, `carregadores_contagens`, `orcamentos`, `audit_log`) — diferenças = 0
- [ ] **Bridge cron** desligada (V1 passa a ser fonte de verdade)
- [ ] **Backup completo** Supabase V2 (pg_dump + Storage rsync)
- [ ] **Email aos 64 utilizadores** condómino: "Nova versão do portal a 24 de XX. Magic-link continua igual."

#### 7.2 Cutover (1 dia, janela 2h madrugada)

1. **00:00** — Read-only mode no V2 Supabase (revoke INSERT/UPDATE para `anon`, `authenticated`)
2. **00:15** — Final diff V2↔V1 (deve ser 0 — qualquer delta = STOP e fix)
3. **00:30** — DNS switch:
   - `prataowners.pt` (apex) → Vercel `proptech-v2-alpha` (admin)
   - `portal.prataowners.pt` (subdomain) → Vercel `proptech-v2-portal-alpha`
4. **01:00** — Smoke test live: login Mário staff + 3 condóminos test
5. **01:30** — Email confirmação a Mário + 3 condóminos test
6. **02:00** — Cutover done OU rollback (revert DNS, restore V2 read-write)

**Rollback procedure (<5 min):**
- DNS revert via Netlify (Mário tem painel pessoal)
- V2 Supabase: revoke read-only flag
- Comms: email "voltámos à versão antiga, problemas detectados, sem perda de dados"

#### 7.3 Post-cutover (30-60 dias observação)

- **Semana 1**: Mário monitoriza diariamente. Bugs → fix forward em V1 (não rollback)
- **Semana 2-4**: Mário valida workflows mensais (emissão avisos Maio, recebimentos, OCR)
- **Dia 30**: Decisão GO/NOGO para sunset V2 Supabase
- **Dia 30-60** (se GO): Sunset:
  - Freeze writes V2 (já read-only)
  - Final dump → glacier storage
  - Paus Supabase project V2 (~25€/mês saved)
  - Manter project pausado 12 meses para auditoria/compliance AT (Mário é TOC, prazo 5 anos legal)

---

## 4. Calendarização realista (Gantt simplificado)

> 1 dev (Mário + AI) ~20h/sem ≈ 1 dia-dev por 2-3 dias calendário (mais lento por contexto + decisões)

| Fase | Effort | Calendário (start) | Calendário (end) |
|---|---:|---|---|
| Fase 0 — Pre-flight | 3-5d | 2026-05-26 | 2026-06-05 |
| Fase 1 — Foundations | 8-12d | 2026-06-08 | 2026-07-10 |
| Fase 2 — Admin core | 12-15d | 2026-07-13 | 2026-08-21 |
| Fase 3 — Upload XLSX | 5-7d | 2026-08-24 | 2026-09-11 |
| Fase 4 — OCR Faturas | 8-12d | 2026-09-14 | 2026-10-16 |
| Fase 5 — Automações | 12-15d | 2026-10-19 | 2026-11-27 |
| Fase 6 — Portal Cond | 15-20d | 2026-11-30 | 2027-01-29 |
| Fase 7 — Cutover | 1d + 30d obs | 2027-02-02 | 2027-03-04 |
| Fase 7 — Sunset | 1d (gated) | 2027-04-01 | 2027-04-01 |

**Total**: ~10 meses calendário, com cutover possível **2027-02-02** se tudo fluir.

**Aceleração possível (4-6 meses)**:
- Reduzir scope Fase 6 (portal mobile pode ficar em paralelo até Q3 2027 — admin migra primeiro)
- Sequência alternativa: Fase 0 → 1 → 2 → 5 (Automações primeiro porque é o que Mário usa diariamente) → 3 → 4 → 6
- Cortar P1 features para depois do cutover (parity P0-only primeiro)

---

## 5. Vercel deployment plan

| Projecto Vercel | Repo path | Production Branch | DNS final |
|---|---|---|---|
| `proptech-v2-alpha` (a criar) | `apps/v2-condominios` | `main` | `prataowners.pt` (cutover Fase 7) |
| `proptech-v2-portal-alpha` (a criar) | `apps/v2-condominios-portal` (criar Fase 6) | `main` | `portal.prataowners.pt` (cutover Fase 7) |

**Workflow por sprint** (Regra D2):
1. Trabalho em branch `sprint/v2-fN-<feature>`
2. Push → Vercel Preview deploy
3. Mário valida Preview URL
4. Merge a `main` → Production rebuild
5. Mário valida Production URL

**Smoke test em cada merge** (Regra D3):
- Preview build OK em <2min
- Renderiza sem erros
- Auth funciona

**V2 produção INTOCÁVEL** (Regra D4): apps/v2-condominios deploy actual em Netlify deve continuar até cutover.

---

## 6. Custos

| Item | €/mês |
|---|---|
| Vercel Pro (2 projectos novos, mas free tier serve até cutover) | 0 → 20€ (ao escalar) |
| Supabase Pro V1 Core Hub (já pago) | 25€ |
| Supabase Pro V2 Legacy (mantido até sunset Q2 2027) | 25€ (~6 meses paralelo = 150€) |
| Vercel domains (já pago) | 0€ |
| **Total adicional durante migração** | ~150€ one-time + 20€/mês quando escalar |

Sunset V2 Q2 2027 = -25€/mês recurrentes.

---

## 7. Comunicação Mário ↔ utilizadores

### Mário ↔ Mário (auto-comunicação operacional)
- Daily Hermes brief: `.claude/state/triggers.md` cada manhã
- Story per Fase em `docs/stories/epics/epic-020-v2-migration-2026-q3-2027/`
- Decisions log em `.claude/current/decisions-log.md`

### Mário ↔ 64 condóminos reais
- **T-30 dias**: email "Vamos atualizar o portal. Sem acção necessária. Magic-link igual."
- **T-7 dias**: lembrete + screenshot teaser do novo UI
- **T-0 (cutover day)**: email confirmação + nº suporte WhatsApp directo (Mário)
- **T+7**: feedback poll opcional

### Mário ↔ Property 007 LDA (cliente real)
- Decisões arquitecturais (NIF, IBAN) precisam aprovação dupla — Mário valida live
- Sunset V2 só após 30 dias zero-incidents

---

## 8. Anexo: matriz de dependências por Fase

```
Fase 0 (pre-flight)
   │
   ├─► Fase 1 (foundations: auth + i18n + charts + multi-condo)
   │      │
   │      ├─► Fase 2 (admin core: Condóminos + Fracções + Faturas + Bancos + Config)
   │      │      │
   │      │      ├─► Fase 3 (XLSX upload)
   │      │      │      │
   │      │      │      └─► Fase 4 (OCR)
   │      │      │             │
   │      │      │             └─► Fase 5 (Automações) ──┐
   │      │      │                                        │
   │      │      └─► Fase 5 (Automações pode arrancar paralelo após Fase 2)
   │      │                                               │
   │      └─► Fase 6 (Portal Condómino — pode arrancar paralelo após Fase 1, mas só finaliza após Fase 5)
   │                                                      │
   └─► Fase 7 (Cutover) ◄────────────────────────────────┘
              │
              └─► Fase 7 (Sunset, gated +30d post-cutover)
```

**Caminho crítico**: 0 → 1 → 2 → 5 → 6 → 7. Outras Fases podem paralelizar com agentes assistentes (architect-proptech, supabase-designer, vertical-builder em paralelo a Mário+UI dev).

---

## 9. Métricas de sucesso (post-cutover)

| KPI | Target | Como medir |
|---|---|---|
| Bugs em produção primeiros 7 dias | ≤3 P2, 0 P0 | Mário tracking + utilizador reports |
| Latência login (p95) | <3s | Vercel analytics |
| Taxa de erro chamadas Supabase | <0.5% | Supabase logs |
| Satisfação Mário (workflow daily) | "igual ou melhor que legacy" | Auto-poll semanal |
| Tempo gasto por Mário em workflow "emitir avisos mensais" | igual ou menor | Cronometrar 1× pré + 1× pós |
| Reclamações dos 64 condóminos | <5 emails/mês | Inbox Mário |
| Custo Supabase | descida de 50€ para 25€ após sunset | Faturas Supabase |

---

**Confiança do plano**: **MÉDIA-ALTA**. O scope é grande mas decomposto. Riscos principais são humanos (capacidade Mário + AI ~20h/sem realista?) e técnicos (OCR + Automações são profundos). **Recomendação Atlas**: começar com **Fase 0 imediatamente** (resolver as 5 OPEN QUESTIONS) e usar Fase 1 como sprint piloto para calibrar velocity real.

**Próxima acção sugerida**: Mário valida sequência de Fases + responde às 5 OPEN QUESTIONS. Depois invoco `aiox-pm` para criar Epic + 7 Stories no `docs/stories/epics/epic-020-v2-migration/`.
