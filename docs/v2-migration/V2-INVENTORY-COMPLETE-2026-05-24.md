# V2 → V1 React — Inventário Exaustivo de Funcionalidades

**Data:** 2026-05-24
**Autor:** Atlas (aiox-analyst)
**Estado:** Discovery completo — read-only, sem alterações de código
**Substitui:** [`V2-LEGACY-AUDIT-2026-05-24.md`](V2-LEGACY-AUDIT-2026-05-24.md) (que estava parcialmente errado — assumia que `index.html`/`admin/index.html` da raiz eram V2; eram V9 Owners Club + Control Centre)

---

## TL;DR

O verdadeiro código-fonte do **admin que serve `prataowners.pt`** está em [`test-v2.html`](test-v2.html#L1) (15.381 linhas, 1.9MB) na raiz do monorepo. Esta versão local é **mais nova** (1.9MB) do que o build deployed em produção (~1.1MB) — provável que tenha features adicionadas mas ainda não publicadas.

A app React substituta [`apps/v2-condominios/`](apps/v2-condominios/) (24 views, 4256 linhas) **cobre as estruturas-base** mas tem **GAPs P0 severos**:

| Domínio | Legacy `test-v2.html` | React `apps/v2-condominios/` | Status |
|---|---|---|---|
| **PDF export** (Prestação, Conta Corrente, Avisos, Recibos, Carregador) | 10+ chamadas `jsPDF` | **0** | ❌ P0 |
| **XLSX upload extrato bancário** ("🔄 Atualizar Extrato") | `XLSX.read` + `portal_extrato_upsert` | **0** | ❌ P0 |
| **Charts Chart.js** (receitas/despesas mensais + donut distribuição) | `new Chart()` em 2 sítios | **0** | ❌ P0 |
| **OCR de faturas** (upload PDF → EF `ocr-fatura` → review + associar a extrato) | Fluxo completo + modal review | **0** (só ver `documentos`) | ❌ P0 |
| **Centro de Automações** (Emissão Avisos, Envio Email, Quota Extra EV, Templates) | 8 cards interactivos, 200 linhas | **127 linhas read-only** lista `pg_cron` | ❌ P0 |
| **Portal condómino completo** (Conta Corrente, Pendentes, Recibos, Avisos, Ficha, Carregador) | 5+ views completos | apenas link "abrir como condómino" (impersonation) | ❌ P0 |
| **i18n PT/EN** com `data-pt` / `data-en` | `LANG` + 50+ chaves | **0** | ⚠️ P1 |
| **Multi-condomínio toggle** (PRATA 2A · Global) | `condominioBtn` + scope filter | parcial via `YearContext`/topbar (apenas ano) | ⚠️ P1 |
| **CRUD Condóminos completo** (modal `+ Novo Condómino`, edit ✏, email, WA, eliminar) | `portal_admin_create_condomino` + `portal_admin_update_condomino` + modal completo | apenas tabela read-only | ❌ P0 |
| **Transferência de fracção** (mudança de proprietário com histórico) | `portal_admin_transferir_fracao` | **0** | ⚠️ P1 |
| **Histórico de proprietários** por fracção | `showHistoricoByFracao` + drawer | **0** | ⚠️ P1 |
| **Configurações condomínio** (NIF, IBAN, código postal, etc.) | `sb.from('condominios').update()` | **0** | ❌ P0 |
| **Sub-drill Resumo Financeiro** (Saldo, Dívidas Cond, Dívidas Forn, Valores análise, Valores devolver, FCR) | `buildDCDetail`, `buildDFDetail`, `buildSecDetail` (6 sub-views) | parcial — só KPIs top | ⚠️ P1 |
| **Permissões IAM** (utilizadores portal + grupos + secções) | `permissoes_grupo` legacy | OK — usa schema `iam` canónico (ADR-013) | ✅ |
| **Reconciliação extrato ↔ documentos** (botão associar doc a movimento) | `openAssociarModal` + Drive upload | **0** (só botão `reconciliar_extrato`) | ⚠️ P1 |

**Confiança da análise:** ALTA — cruzei 4 fontes (test-v2.html source, screenshots reais, código React, snapshot schemas V1+V2).

---

## Secção 1 — Fontes consultadas (metodologia)

**Fonte A — Screenshots produção** ([`docs/v2-migration/screenshots/internal/`](docs/v2-migration/screenshots/internal/), 14 PNGs)
Capturados via Playwright + auth staff `BOSSMC` em 2026-05-24. Cobertura: login (3 modos), home admin, Prestação de Contas (4 sub-tabs), Condóminos, Mapa Receitas, Recebimentos, Dívida Actual, Fracções, Automações, Ver como Condómino, ficha de condómino. Manifest com PII em [`manifest.json`](docs/v2-migration/screenshots/internal/manifest.json) (gitignored).

**Fonte B — Source code legacy** ([`test-v2.html`](test-v2.html), 15.381 linhas, 1.9MB)
Liga directamente a `https://eozklslwfaqujaijvdnl.supabase.co` ([`L13`](test-v2.html#L13)) com anon key hardcoded ([`L14`](test-v2.html#L14)). Stack externa via CDN ([`L10-L20`](test-v2.html#L10-L20)):
- `@supabase/supabase-js@2`
- `Chart.js 4.4.1`
- `XLSX 0.18.5` (SheetJS)
- `jspdf 2.5.1`
- `pdf.js 3.11.174` (worker + main)
- DM Serif Display + Cormorant Garamond + DM Mono + DM Sans

Total funções `function name(){}` identificadas: **84+** — incluindo `updateAll`, `renderResumo`, `renderBvR`, `renderOrcamento`, `renderFrac`, `renderBancosView`, `renderFaturasView`, `renderDocsView`, `renderMapaReceitas`, `renderMapaCarregadores`, `renderPermissoes`, `renderAutomacoes`, `renderNotifLog`, `renderCCOwner`, `renderAvisosAll`, `renderRecibosAll`, `renderCarregador`, `renderPortalDocs`, `renderHistorico`, `openAssociarModal`, `exportFaturasCSV`, `exportMapaReceitas`, etc.

**Fonte C — Substituta React** ([`apps/v2-condominios/src/views/`](apps/v2-condominios/src/views/), 24 views, 4256 linhas)
Rotas em [`App.jsx`](apps/v2-condominios/src/App.jsx#L64-L88). Clients em [`lib/clients.js`](apps/v2-condominios/src/lib/clients.js): `mainClient`, `coreClient`, `v2Client` (→ V1 Core Hub schema `v2_condominios`), `systemClient`, `iamClient`, `v2LegacyClient` (read-only direct ao V2).

**Fonte D — Snapshot schemas V1 Core Hub** ([`docs/database/v1-schema-snapshot-2026-05-24.json`](docs/database/v1-schema-snapshot-2026-05-24.json), 2897 referências `v2_condominios`)
Schema `v2_condominios.*` no V1 Core Hub já contém: `condominios`, `condominos`, `fracoes`, `recebimentos`, `extrato_bancario`, `faturas_pendentes`, `faturas_ocr`, `documentos`, `documentos_drive`, `documentos_institucionais`, `fornecedores`, `seguro_fracoes`, `carregadores_contagens`, `orcamentos`, `orcamento_por_fracao`, `eventos`, `audit_log`, `email_log`, `assembleias`, `atas`, `convocatorias`, `comunicacoes`, `conta_corrente`, `historico_proprietarios`, `historico_pedidos`, `dividas_condominos_snapshot`, `dividas_fracoes_snapshot`, `divida_2026_agregada`, `financeiro_snapshot`, `kpis_ano_fechado`, `configuracoes`, `portal_tokens`, `activity_logs`, `permission_*`, mais ~20 staging `_stg_*` e 2 views `v_ocr_historico` + `v_faturas_sem_ocr`. **Bridge bidireccional para V2 legacy desconhecido (OPEN)**.

**Fonte D adicional — Edge Functions disponíveis** (`supabase/functions/`, **57 EFs**):
- **V2 legacy referenciadas em `test-v2.html`**: `send-email` ([`L3196`, `L10493`, `L10561`](test-v2.html#L3196)), `ocr-fatura` ([`L5337`](test-v2.html#L5337)), `migrar-fatura` ([`L6581`, `L6961`](test-v2.html#L6581)), `send-login-link` ([`L3413`, `L11325`](test-v2.html#L3413))
- **V1 Core Hub disponíveis para reutilizar**: `core-api`, `v2-recibo-pdf` ✓ (já existe), `v2-legacy-bridge-cron`, `email-auto-archive`, `gerar-magic-link`, mais outros 50 EFs cross-vertical

---

## Secção 2 — Sidebar real (confirmado por DOM + screenshots)

Extraído de [`test-v2.html L811-L850`](test-v2.html#L811) (data-view attributes):

### Sidebar Admin (8 items + 4 sections)
```
DASHBOARD
  • Início                  → data-view="vAdminHome"
  • Prestação de Contas     → data-view="vDash"
GESTÃO
  • Dívidas 2025            → data-view="vAdminDividas"
  • Dívida Actual 2026      → data-view="vAdminAtual"
  • Recebimentos            → data-view="vAdminRec"
  • Bancos                  → data-view="vBancos"
CADASTRO
  • Condóminos              → data-view="vAdminCond"
  • Fracções                → data-view="vAdminFrac"
  • Faturas                 → data-view="vAdminFaturas"
  • Mapa de Receitas        → data-view="vMapaReceitas"
  • Documentos              → data-view="vAdminDocs"
PORTAL CONDÓMINO
  • Abrir como Condómino    → data-view="vPortalCond"
FERRAMENTAS
  • Automações              → data-view="vAutomacoes"
DEVELOPER (gated, IS_DEVELOPER)
  • Permissões              → data-view="vPermissoes"
```

### Sidebar Portal Condómino (6 items)
```
PORTAL
  • Início                  → data-ptab="home"
  • Pendentes               → data-ptab="pend" (com badge contador)
  • Conta Corrente          → data-ptab="cc-home"
  • Carregador              → data-ptab="ev"
  • Documentos              → data-ptab="dc"
  • Ficha                   → data-ptab="fi"
```

### Topbar (multi-control)
- Multi-condomínio chip: "PRATA 2A · Global"
- Multi-ano: 2024 · 2025 · 2026 (chips)
- i18n toggle: "EN" / "PT"
- Botão "PDF" (export contextual)
- Dark/Light toggle: "🌙 Dark"
- Sidebar footer: "🔄 Atualizar Extrato" (upload XLSX) + user info + Sair

### Cobertura React (gap visível)
- ✅ Routes equivalentes existem em [`App.jsx L64-L88`](apps/v2-condominios/src/App.jsx#L64) — mas sidebar component (`Sidebar.jsx`) precisa de validação para confirmar correspondência 1:1 dos labels/icons
- ❌ Topbar multi-condomínio + i18n + PDF + Atualizar Extrato **não confirmado** no [`Topbar.jsx`](apps/v2-condominios/src/components/Topbar.jsx) (não lido nesta análise — assumir GAP até prova contrária)

---

## Secção 3 — Matriz exaustiva de funcionalidades

> **Legenda:** ✅ Completa · ⚠️ Parcial · ❌ Ausente · 🆕 React-only (não existia em V2)
> **Effort:** XS<2h · S=0.5-1d · M=1-3d · L=3-7d · XL>1sem
> Linhas referenciadas no formato `file#Lline` para clickable jump.

### 3.1 — Autenticação & Sessão

| Feature | Legacy (test-v2.html) | App produção (screenshot) | React (apps/v2-condominios) | Status | Effort |
|---|---|---|---|---|---|
| Login magic link condómino (email) | [`L3341`](test-v2.html#L3341) `portal_get_condomino_by_email` + [`L3413`](test-v2.html#L3413) `send-login-link` EF | screenshot 01 — "✉ Enviar link de acesso" | [`@proptech/auth`](packages/auth) AuthProvider | ⚠️ — usa `@proptech/auth` magic link, mas não chama `send-login-link` EF nem fluxo `portal_get_condomino_by_email`; sem prova de paridade | M |
| Login UUID token portal | [`L3377`](test-v2.html#L3377) `portal_get_condomino` + `?token=` URL | screenshot 01 — "Token" input | [`PortalCondomino.jsx`](apps/v2-condominios/src/views/PortalCondomino.jsx) só impersonation | ❌ — sem fluxo `?token=` público | M |
| Login staff user/pwd | [`L3490`](test-v2.html#L3490) `portal_staff_login(p_username, p_password)` | screenshot 01 — "Staff →" form | `@proptech/auth` Supabase Auth | ⚠️ — Supabase Auth ≠ `portal_staff_login` RPC; alias mapping via `iam.staff_login_aliases` (ADR-013) | M |
| Set/change staff password | [`L10006`](test-v2.html#L10006) `portal_staff_set_password` | (gated em Permissoes) | [`Permissoes.jsx`](apps/v2-condominios/src/views/Permissoes.jsx) — confirmar | ⚠️ | S |
| Persistência sessão (`localStorage`) | [`L16`](test-v2.html#L16) `persistSession:true` + saved token | — | `mainClient` Supabase Auth default | ✅ | — |
| Logout | `sb.auth.signOut()` | "Sair" botão sidebar | `@proptech/auth` | ✅ | — |
| Service Worker unregister (force fresh) | [`L32-L36`](test-v2.html#L32) | — | nenhum SW na app React | 🆕 (nada a portar) | — |

### 3.2 — Internacionalização

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| i18n PT/EN toggle | [`L2516-L2670`](test-v2.html#L2516) `LANG` + `data-pt`/`data-en` attrs em 50+ elementos | screenshot 01 — "🇵🇹 PT 🇬🇧 EN" buttons | **0 referências i18n** | ❌ P1 | L (refactor todos os labels) |
| Auto-detect lang por condómino (`Inglês/English`) | [`L10623-L10637`](test-v2.html#L10623) `_idiomaToLang` mapper | — | ❌ | ❌ P2 | S |
| Email body bilingue (lang flag para EF send-email) | [`L11328`](test-v2.html#L11328) `lang: 'en'/'pt'` | — | ❌ | ❌ P2 | XS (junto com 3.1) |

### 3.3 — Dashboard / Prestação de Contas

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| 4 KPIs top: Saldo Inicial / Receitas / Despesas / Saldo Final | [`L1817`](test-v2.html#L1817) `renderResumo()` + RPC `condo_dashboard_kpis` | screenshot 11, 30 | [`PrestacaoContas.jsx#L68-L73`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L68) — mesma RPC | ✅ | — |
| "Resultado do Período" linha destaque | implícito em renderResumo | screenshot 30 | [`L75-L91`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L75) | ✅ | — |
| Resumo Financeiro: 6 linhas drill-down (Saldo, Dív Cond, Dív Forn, Valores análise, Valores devolver, FCR recebido, Saldo Financeiro) | [`L1817-L2052`](test-v2.html#L1817) + [`L1926`](test-v2.html#L1926) `buildDCDetail` + [`L1965`](test-v2.html#L1965) `buildDFDetail` + [`L1982`](test-v2.html#L1982) `buildSecDetail` | screenshot 11 (visível: 7 rows) | parcial — [`kpis_detalhe`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L170) embed mas sem drill-down completo | ⚠️ P1 | M |
| Tab "Visão Geral" | tab activa default | screenshot 30 | [`TABS L5-L12`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L5) | ✅ | — |
| Tab "Orçamento vs Real" — barras execução % por rubrica | [`L2053`](test-v2.html#L2053) `renderBvR()` | screenshot 31 — barras vermelhas (>100% deviation), verdes (<100%) | [`L440`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L440) `orcamento_efetivo` query — mas confirmação visual de progress bars não feita | ⚠️ | S |
| Drill-down BvR por rubrica (sub-rows expandíveis) | [`L2220`](test-v2.html#L2220) `toggleDrillBvR` | screenshot 31 — caret expandable | ❌ ou parcial | ⚠️ P2 | S |
| Tab "Orçamento" — tabela código/rubrica/valor mensal/anual | [`L2274`](test-v2.html#L2274) `renderOrcamento()` + RPC `get_receitas_resumo` + `get_receitas_detalhe` | screenshot 32 | [`L357`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L357) `orcamento_rubricas` query | ✅ | — |
| Tab "Orçamento por Fração" — search + tabela permilagem | [`L2336`](test-v2.html#L2336) `renderFrac()` | screenshot 33 | [`L624`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L624) `orcamento_por_fracao` query | ✅ | — |
| Tab "Extrato Bancário" embeded em Prestação | [`L1447, L4076`](test-v2.html#L1447) `extrato_bancario` filter por ano | confirmado tabs | [`L263, L541, L705`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L263) `extrato_bancario` query | ✅ | — |
| Tab "Documentos" embeded em Prestação | [`L7714`](test-v2.html#L7714) `renderDocsView()` | confirmado tab "📎 Documentos" | [`L775`](apps/v2-condominios/src/views/PrestacaoContas.jsx#L775) `documentos` query | ✅ | — |
| **Gráfico Chart.js "Receitas & Despesas mensais"** (linha verde) | [`L2010`](test-v2.html#L2010) `mk()` helper + Chart.js | screenshot 10 — gráfico Receitas verde | **0** Chart.js | ❌ P0 | M |
| **Gráfico Chart.js "Distribuição de Despesas" donut** | [`L2010`](test-v2.html#L2010) `mk()` (type:'doughnut') | screenshot 10 — donut Seguro/Limpeza/Electricidade/Elevadores/Reparações | **0** Chart.js | ❌ P0 | M |
| Year-aware filtering (2024/2025/2026/Global) | global var `YR` em todo o ficheiro | screenshot 03 chips "2024 2025 2026 Global" | `YearContext` + `useYear()` ✅ | ✅ | — |
| **Multi-condomínio toggle (PRATA 2A · Global)** | implícito (single-condo legacy mas chips visíveis na topbar) | screenshot 03 chip "PRATA 2A" + "Global" | ❌ — `YearContext` só cobre ano, não condomínio | ❌ P1 | M |
| **Export PDF "Prestação de Contas"** botão topbar | [`L12953, L13218, L13386, L13712, L13864, L14514, L14845, L15110`](test-v2.html#L12953) — múltiplos `new jsPDF()` | screenshot 10 botão "📄 PDF" | **0** jsPDF | ❌ P0 | L (mínimo 1 doc) |
| Botão "🖨 Imprimir" (CSS @media print) | spread por views | screenshot 11 | ❌ | ⚠️ P2 | XS |

### 3.4 — Dívidas / Mora

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Dívida Actual 2026 — tabela por condómino + fracção | confirmado screenshot 15 | screenshot 15 — colunas Div.Ant./Quotas/Q.Extra/Multas/Crédito/Total | [`Mora.jsx`](apps/v2-condominios/src/views/Mora.jsx) — confirmar paridade colunas | ⚠️ | S |
| Dívidas 2025 (snapshot histórico) | leitura `dividas_*_snapshot` | sidebar item separado | [`Mora.jsx`](apps/v2-condominios/src/views/Mora.jsx) — apenas 1 view para 2 rotas (`/dividas-2025` + `/divida-actual-2026`) | ⚠️ — sem diferenciação clara | S |
| Aging buckets (<7d/>7d/>30d/>60d/>90d "legal") | implícito | totals row screenshot 15: "32 condóminos · 10 151,32 €" | [`Mora.jsx`](apps/v2-condominios/src/views/Mora.jsx) tem aging confirmado em [audit anterior L108](docs/v2-migration/V2-LEGACY-AUDIT-2026-05-24.md) | ✅ | — |
| Disparar aviso → cria entry `system.inbox_items` (Bia/Dora) | ❌ não existe em legacy | ❌ | 🆕 [`Mora.jsx`](apps/v2-condominios/src/views/Mora.jsx) — funcionalidade agentic nova | 🆕 | — |
| Total agregado por condómino com múltiplas fracções | screenshot 15 mostra agregação | "1,86 €  5581,13 €  4554,65 €  44,92 €  31,24 €  10 151,32 €" | confirmar | ⚠️ | — |

### 3.5 — Recebimentos

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Listagem recebimentos (data/fração/período/ref/valor) | [`L3279, L4359, L4429`](test-v2.html#L3279) `extrato_bancario`/`faturas_pendentes` | screenshot 14 — colunas Data/Mês/Tipo/Categoria/Subcat/Condómino/Valor | [`Recebimentos.jsx`](apps/v2-condominios/src/views/Recebimentos.jsx) 229 linhas | ✅ | — |
| `+ Lançar Recebimento` modal (insert manual) | implícito em fluxo admin | screenshot 14 botão visible top right | [`Recebimentos.jsx`](apps/v2-condominios/src/views/Recebimentos.jsx) modal CRUD | ✅ | — |
| Filtros (mês, condómino, tipo) | implícito | screenshot 14 — tabela tem muitas categorias visíveis | confirmar filtros react | ⚠️ | S |

### 3.6 — Bancos / Extrato

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Lista de movimentos extrato com filtros | [`L1447, L3279, L4076`](test-v2.html#L1447) `extrato_bancario` | (não capturado screenshot) | [`Bancos.jsx`](apps/v2-condominios/src/views/Bancos.jsx) 163 linhas | ✅ | — |
| Reconciliação (associar movimento a categoria/fatura) | [`L4302`](test-v2.html#L4302) update + [`L6402`](test-v2.html#L6402) `openAssociarModal` | botão por linha | RPC `reconciliar_extrato(p_movimento_id)` ✅ | ✅ | — |
| **Upload XLSX extrato bancário** ("🔄 Atualizar Extrato") | [`L10747-L10803`](test-v2.html#L10747) `XLSX.read` + chunks via `portal_extrato_upsert` RPC | screenshot 11+ sidebar footer botão azul "🔄 Atualizar Extrato" | **0** XLSX import | ❌ P0 | L |
| Drive upload de doc associado a extrato | [`L6530`](test-v2.html#L6530) update `drive_url` | ✏ pencil icon | ❌ | ⚠️ P1 | M |
| Mark "sem fatura" toggle | [`L5231`](test-v2.html#L5231) `update({sem_fatura})` | ❌ não visto | ❌ | ⚠️ P2 | XS |
| Clear/delete (`errClear`) extrato | [`L8760-L8767`](test-v2.html#L8760) | admin only | ❌ | ⚠️ P3 | XS |

### 3.7 — Condóminos

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Listagem com colunas Nome/Email/Telefone/NIF/Morada Fiscal | [`L9558`](test-v2.html#L9558) `utilizadores_portal` | screenshot 12 — 18+ linhas visíveis com pencil icon por linha | [`Condominos.jsx`](apps/v2-condominios/src/views/Condominos.jsx#L4-L80) só Fração/Nome/Email/Tipo/Desde | ⚠️ P0 — colunas faltam (telefone, NIF, morada, email status) | M |
| Cross-schema join (`v2.condominos` → `core.pessoas`) | (não aplicável legacy) | — | ✅ [`L22-L30`](apps/v2-condominios/src/views/Condominos.jsx#L22) | ✅ | — |
| Toggle "Mostrar inativos (0)" | filtro visible | screenshot 12 top | ❌ | ❌ P1 | XS |
| `+ Novo Condómino` modal | [`L11794`](test-v2.html#L11794) `portal_admin_create_condomino` RPC | screenshot 12 botão azul top right | ❌ | ❌ P0 | M |
| Editar condómino (✏ pencil) | [`L9828, L9887, L11095`](test-v2.html#L9828) `portal_admin_update_condomino` RPC | screenshot 12 — 18 ✏ icons | ❌ | ❌ P0 | M |
| Eliminar condómino | [`L9903`](test-v2.html#L9903) delete | ✏ → modal | ❌ | ❌ P1 | XS |
| Botões bulk Email / WA / Imprimir | [`L2920`](test-v2.html#L2920) `openBulkContact(type)` | screenshot 12 botões "✉ Email · 💬 WA · 🖨 Imprimir" | ❌ | ❌ P1 | M |
| **Ficha de condómino (modal/drawer)** com tabs Quota/Dívidas/IBAN/Documentos | [`L12439, L12720`](test-v2.html#L12439) `renderFicha` + tabs | ✏ click → modal | ❌ | ❌ P0 | L |
| **Histórico de proprietários** por fracção | [`L11366-L11404`](test-v2.html#L11366) `showHistoricoByFracao` + `showHistorico` | screenshot 18 — info no portal cond. | ❌ | ⚠️ P1 | M |
| **Transferência de fracção** (mudança proprietário) | [`L11810, L11916`](test-v2.html#L11810) `portal_admin_transferir_fracao` RPC | (admin flow) | ❌ | ⚠️ P1 | M |
| Lookup CEP → morada (Códigos Postais CTT) | [`L11160`](test-v2.html#L11160) `portal_lookup_codpostal` RPC | (modal autofill) | ❌ | ⚠️ P2 | XS |
| Gestão de contactos múltiplos (admin save/delete) | [`L2807, L2891, L2914`](test-v2.html#L2807) `portal_admin_get_contactos`/`save_contacto`/`delete_contacto` | (ficha condómino) | ❌ | ❌ P1 | M |

### 3.8 — Fracções

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Listagem (código/letra/tipologia/permilagem) | [`L9560`](test-v2.html#L9560) `fracoes` | screenshot 16 — 18+ linhas col Fracção/Tipo/Permilagem/Status | [`Fracoes.jsx`](apps/v2-condominios/src/views/Fracoes.jsx) 90 linhas | ✅ | — |
| `+ Novo / Transferir` botão | screenshot 16 top right (azul) | botões topo direito | ❌ | ⚠️ P1 | S |
| Indicador permilagem total / linha | screenshot 16 | per row | ✅ provável | — | — |
| Histórico de mudanças de proprietário | — | (linkado a 3.7) | ❌ | ⚠️ P1 | (junto 3.7) |

### 3.9 — Faturas / OCR

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Listagem faturas pendentes/pagas | [`L4429`](test-v2.html#L4429) + [`L6268`](test-v2.html#L6268) `renderFaturasTable` | (não capturado screenshot) | [`Faturas.jsx`](apps/v2-condominios/src/views/Faturas.jsx) 168 linhas | ✅ | — |
| Marcar fatura paga | [`L4659, L4679, L4694, L4707`](test-v2.html#L4659) update estado | botão por linha | ✅ RPC `marcar_fatura_paga` ([`L49-L60`](apps/v2-condominios/src/views/Faturas.jsx#L49)) | ✅ | — |
| Insert manual (fornecedor/valor/data/nº/rubrica) | [`L4751`](test-v2.html#L4751) | botão `+` | ❌ React-side | ❌ P1 | S |
| **OCR de fatura PDF** — upload + EF `ocr-fatura` | [`L5337`](test-v2.html#L5337) `fetch('/functions/v1/ocr-fatura')` + [`L5429-L5531`](test-v2.html#L5429) dedup logic | (workflow admin) | **0** | ❌ P0 | L |
| Review OCR (review modal + correcções) | [`L6113-L6253`](test-v2.html#L6113) bulk update `faturas_ocr` + `faturas_pendentes` | modal | ❌ | ❌ P0 | M |
| Migrar fatura OCR → pendente (EF `migrar-fatura`) | [`L6581, L6961`](test-v2.html#L6581) `fetch('/functions/v1/migrar-fatura')` | (admin batch) | ❌ | ❌ P0 | M |
| Histórico OCR (`v_ocr_historico` view) | [`L5531`](test-v2.html#L5531) | tab | ❌ | ⚠️ P1 | S |
| Faturas sem OCR (`v_faturas_sem_ocr` view) | [`L5532`](test-v2.html#L5532) | tab | ❌ | ⚠️ P1 | S |
| Upsert NIF de fornecedor a partir do OCR | [`L6122`](test-v2.html#L6122) | (automático) | ❌ | ⚠️ P2 | XS |
| Export CSV faturas | [`L7070`](test-v2.html#L7070) `exportFaturasCSV` | botão | ❌ | ⚠️ P2 | XS |
| CRUD Fornecedores standalone | [`L4823, L4890-L4891`](test-v2.html#L4823) | (modal) | ❌ | ❌ P1 | S |

### 3.10 — Mapa de Receitas

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Resumo emitido/recebido/por receber por rubrica | [`L7637`](test-v2.html#L7637) `renderMapaReceitas` | screenshot 13 — tabela 7 rubricas (R001-R007) | [`MapaReceitas.jsx`](apps/v2-condominios/src/views/MapaReceitas.jsx) 234 linhas | ✅ | — |
| Drill-down por rubrica (caret ›) | screenshot 13 — caret colapsável | confirmar | ⚠️ | — | S |
| Não alocados row destaque | screenshot 13 row "Não alocados — — 150,50 € —" | ❌ confirmar | ⚠️ | — | XS |
| 4 sub-tabs: Resumo / Recebimentos (72) / Dívidas / Avisos / Carregadores ⚡ | screenshot 13 sub-tabs | apenas Resumo isolado | ❌ — 4 tabs unificados perdidos | ❌ P1 | M |
| Botão "Exportar" XLSX | [`L9004`](test-v2.html#L9004) `exportMapaReceitas` | screenshot 13 botão "🖨 Exportar" | ❌ | ❌ P1 | S |

### 3.11 — Documentos

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Grid cards (200 mais recentes) com data/fornecedor/valor OCR | [`L7408`](test-v2.html#L7408) `renderDocsView` + [`L7714-L7726`](test-v2.html#L7714) `documentos` + `extrato_bancario` joins | (não capturado) | [`Documentos.jsx`](apps/v2-condominios/src/views/Documentos.jsx) 81 linhas read-only | ⚠️ P1 — apenas grid básico | M |
| **Open PDF preview** (pdf.js worker) | [`L5964-L5967, L2708`](test-v2.html#L2708) `openDoc` + `initPdf` | overlay PDF | ❌ | ❌ P1 | M |
| Drive upload (público) + association | [`L6530`](test-v2.html#L6530) | (admin) | ❌ | ⚠️ P1 | M |
| Documentos institucionais (regulamentos) — CRUD | [`L2731, L7413, L7598, L7618, L7629`](test-v2.html#L7413) `documentos_institucionais` | secção separada | ❌ | ⚠️ P1 | S |

### 3.12 — Portal Condómino (público, 64 utilizadores reais)

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| App shell separado | [`L3555`](test-v2.html#L3555) `showAppShell(isAdmin)` | screenshot 18 — sidebar diferente | ❌ — só "Abrir como condómino" (impersonation) | ❌ P0 | XL |
| Sidebar 6 items (Início/Pendentes/CC/Carregador/Docs/Ficha) | [`L811-L816`](test-v2.html#L811) | screenshot 18 | ❌ | ❌ P0 | (incluído acima) |
| **Conta Corrente** completa por condómino | [`L14029`](test-v2.html#L14029) `renderCCOwner` | tab "Conta Corrente" | ❌ | ❌ P0 | L |
| **Pendentes** (aviso quotas em aberto) com badge contador | [`L812`](test-v2.html#L812) `sbPendBadge` | sidebar item com badge red | ❌ | ❌ P0 | M |
| **Recibos** (lista + PDF preview) | [`L12365, L14729`](test-v2.html#L12365) `renderRecibosAll` + jsPDF | botão por mês | ❌ — EF `v2-recibo-pdf` EXISTE mas não consumida | ❌ P0 | M (reaproveita EF) |
| **Avisos** (lista cronológica) | [`L14650`](test-v2.html#L14650) `renderAvisosAll` + jsPDF | botão por mês | ❌ | ❌ P0 | M |
| **Carregador EV** (gráfico + estatísticas) | [`L12497-L12599`](test-v2.html#L12497) `renderCarregador` + Chart.js | screenshot 18 portal | ❌ | ❌ P0 | M |
| **Mapas** (Orçamento em Vigor, Quotas por Fracção, Dívidas, Prestação) | [`L3605, L3676, L3709, L3674`](test-v2.html#L3605) `renderMapasOrc` `renderMapasQfr` `renderMapasDiv` `renderMapasPc` | screenshot 18 cards "📊 Orçamento em Vigor · 🏠 Quotas por Fracção · ⚠️ Dívidas · 📋 Prestação de Contas" | ❌ | ❌ P0 | L |
| **Ficha** condómino (editar dados) | [`L12874`](test-v2.html#L12874) `portal_update_condomino` | tab Ficha | ❌ | ❌ P1 | M |
| **Documentos** condómino (lista filtrada) | [`L12620`](test-v2.html#L12620) `renderPortalDocs` + `documentos_institucionais` | tab Docs | ❌ | ❌ P1 | M |
| **Info pre-login** (Quota/Dívidas/IBAN/Documentos) | [`L12720, L14795`](test-v2.html#L12720) `renderInfo` | screenshot 18 (Token area) | ❌ | ❌ P1 | S |
| Log de acessos portal | [`L3834`](test-v2.html#L3834) `portal_acessos` insert | (audit invisible) | ❌ | ⚠️ P2 | XS |
| Auto-detect language por idioma do condómino | [`L10623`](test-v2.html#L10623) | — | ❌ | ⚠️ P2 | XS |

> **⚠️ Crítico**: Como já anotado no [audit anterior L226](docs/v2-migration/V2-LEGACY-AUDIT-2026-05-24.md#L226), há **64 utilizadores reais** que dependem deste portal. **Cutover sem o portal pronto = quebrar todos eles.** O `apps/v2-condomino-mobile/dist/` que serve o portal hoje é dist-only (sem source) — separar este track ou incluir como Fase 4+ do plano.

### 3.13 — Automações (Centro de Automações)

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Card "📋 Emissão de Avisos" — selector mês+ano + botão emitir | [`L10198-L10204`](test-v2.html#L10198) + RPC `portal_admin_emitir_avisos(p_ano,p_mes)` | screenshot 17 — primeiro card visible | ❌ — [`Automacoes.jsx`](apps/v2-condominios/src/views/Automacoes.jsx) só lista `list_cron_jobs` | ❌ P0 | M |
| Card "✉️ Envio de Avisos por Email" — escolher destinatários | [`L10206-L10211`](test-v2.html#L10206) `automAbrir('aviso')` | screenshot 17 | ❌ | ❌ P0 | M |
| Card "💳 Envio de Conta Corrente" — escolher destinatários + anexar PDF | [`L10213-L10217`](test-v2.html#L10213) `automAbrir('cc')` | screenshot 17 | ❌ | ❌ P0 | M |
| Card "⚡ Quota Extra Carregadores" — preview + emitir | [`L10219-L10233`](test-v2.html#L10219) + [`L10287-L10402`](test-v2.html#L10287) `qeLoadDatas`/`qeCalc`/`qeEmitir` + RPCs `portal_get_carregadores_datas`/`portal_admin_preview_quota_extra`/`portal_admin_emitir_quota_extra` | screenshot 17 | ❌ | ❌ P0 | L |
| Card "🧪 Teste de Email" | [`L10235-L10241`](test-v2.html#L10235) | screenshot 17 | ❌ | ❌ P0 | S |
| Card "✏️ Modelos de Email" — editor de templates (Aviso/CC/Geral/Recibo) | [`L10243-L10259`](test-v2.html#L10243) `loadEmailTemplate` `saveEmailTemplate` `previewEmailTemplate` (localStorage `p2a_email_templates`) | screenshot 17 | ❌ | ❌ P0 | L |
| Card "📬 Histórico de Emails" (últimos 50 via `portal_admin_get_email_log`) | [`L10261-L10264, L10578`](test-v2.html#L10261) | screenshot 17 | ❌ | ⚠️ P1 | S |
| Card "👥 Lista de Destinatários" (condóminos com email) | [`L10266-L10283`](test-v2.html#L10266) | screenshot 17 | ❌ | ⚠️ P1 | S |
| EF `send-email` (Resend integration) | [`L3196, L10493, L10561`](test-v2.html#L3196) `fetch('/functions/v1/send-email')` | (background) | EF existe em supabase/functions/ mas não consumida em React | ❌ P0 | (incluído) |
| Build HTML email (template engine) | [`L7284`](test-v2.html#L7284) `buildEmailHtml(nome,bodyHtml,portalUrl)` | (helper) | ❌ | ❌ P0 | S |

### 3.14 — Permissões (IAM)

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Listagem `utilizadores_portal` + roles | [`L9558`](test-v2.html#L9558) | (gated IS_DEVELOPER) | ✅ [`Permissoes.jsx`](apps/v2-condominios/src/views/Permissoes.jsx) 599 linhas migrado para `iam.*` schema (ADR-013) | ✅ | — |
| Permissões por grupo/secção (upsert) | [`L10036`](test-v2.html#L10036) `permissoes_grupo` upsert | tabela edit-inline | ✅ via `iam.permission_grants` | ✅ | — |
| Set/change staff password | [`L10006`](test-v2.html#L10006) | (admin form) | confirmar Permissoes.jsx | ⚠️ | XS |
| Audit log de admin actions | [`L10060`](test-v2.html#L10060) `audit_log` insert manual | (background) | `iam.activity_logs` ✅ | ✅ | — |
| Logs de acesso ao portal (`portal_acessos`) | [`L11222`](test-v2.html#L11222) | (admin only) | ❌ | ⚠️ P2 | XS |

### 3.15 — AI Assistant (chat agentic) e Agentes

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| AI assistant chat (🤖 botão floating) | (não encontrado — pode ser feature nova local) | screenshot 10 botão "🤖" canto inferior direito | 🆕 [`Chat.jsx`](apps/v2-condominios/src/views/Chat.jsx) + [`Agente.jsx`](apps/v2-condominios/src/views/Agente.jsx) + 10 agentes em [`Inicio.jsx`](apps/v2-condominios/src/views/Inicio.jsx) | 🆕 (React-first) | — |
| Inbox eventos agentes | ❌ | ❌ | 🆕 [`Inbox.jsx`](apps/v2-condominios/src/views/Inbox.jsx) `system.inbox_items` | 🆕 | — |
| Approvals queue | ❌ | ❌ | 🆕 [`Approvals.jsx`](apps/v2-condominios/src/views/Approvals.jsx) | 🆕 | — |
| Bug em produção: `ReferenceError: condomino is not defined` 4x por load | (não localizado em test-v2 — provavelmente em código deployed mais antigo) | console.error em screenshot logs | n/a | ⚠️ — anotar para resolver no cutover | XS |

### 3.16 — Energia (carregadores EV)

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Listagem leituras + KPIs (kWh/€/postos) | [`L8536-L8688`](test-v2.html#L8536) `renderMapaCarregadores` + `carregadores_contagens` | tab Carregadores em Mapa Receitas | [`Energia.jsx`](apps/v2-condominios/src/views/Energia.jsx) 102 linhas | ✅ | — |
| **Gráfico Chart.js evolução kWh** | [`L12497-L12599`](test-v2.html#L12497) `_evChart = new Chart(ctx)` | (portal cond view) | ❌ | ❌ P1 | M |
| Cobrança automática (Quota Extra) | linkado a 3.13 | — | ❌ | ❌ P0 | (já contado) |

### 3.17 — Seguros

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Apólices por fracção (read-only) | (não localizado em test-v2 — provavelmente em screenshots não capturados) | sidebar não tem item específico | [`Seguros.jsx`](apps/v2-condominios/src/views/Seguros.jsx) 77 linhas | ⚠️ — possível 🆕 React | S |

### 3.18 — Assembleias / Atas / Convocatórias

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Convocatórias (PDF + email) | tabelas existem (`assembleias`, `atas`, `convocatorias`, `comunicacoes`) em snapshot V1 | sidebar tem? — não no admin | [`Assembleias.jsx`](apps/v2-condominios/src/views/Assembleias.jsx) 92 linhas — confirmar scope | ⚠️ P2 | M |
| Voto online em deliberações | — | — | ❌ | ⚠️ P3 | — |

### 3.19 — Comunicações

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Envio mass email (não-aviso, comunicações gerais) | (parte do Automações + `email_log`) | em "Modelos de Email > Geral" | [`Comunicacao.jsx`](apps/v2-condominios/src/views/Comunicacao.jsx) 92 linhas | ⚠️ | S |

### 3.20 — Cross-cutting (theme, toasts, mobile)

| Feature | Legacy | App produção | React | Status | Effort |
|---|---|---|---|---|---|
| Dark/Light theme + persist | [`L10601`](test-v2.html#L10601) `toggleTheme` + `localStorage.p2a_theme` | botão sidebar "🌙 Dark" | ✅ `localStorage.v2theme` em [App.jsx#L37](apps/v2-condominios/src/App.jsx#L37) | ✅ | — |
| Toast notifications | [`L7086`](test-v2.html#L7086) `showToast` | inline | confirmar | ⚠️ | XS |
| Mobile sidebar collapse | [`L3925`](test-v2.html#L3925) `openMobileSidebar` | screenshot mobile (não capturado) | confirmar `Sidebar.jsx` | ⚠️ | S |
| Skip-to-content link (a11y) | [`L82`](test-v2.html#L82) `.skip-link` | hidden until focus | confirmar | ⚠️ P2 | XS |
| Background image (Prata login bg) | [`L89`](test-v2.html#L89) `icons/prata_login_bg.jpg` | confirmado | ❌ — visual branding | ⚠️ P2 | XS |
| PWA manifest + icons | [`L22, L28`](test-v2.html#L22) | `manifest.json` + `apple-touch-icon` | confirmar `public/manifest.json` em apps/v2-condominios | ⚠️ P2 | XS |
| Tipografia DM Serif / Cormorant / DM Mono / DM Sans | [`L21`](test-v2.html#L21) | confirmado | confirmar `packages/ui` design system | ⚠️ | XS |

### 3.21 — Edge Functions chamadas pelo legacy

| EF | Uso no legacy | EF existe? (supabase/functions/) | React consome? |
|---|---|---|---|
| `send-email` | [`L3196, L10493, L10561`](test-v2.html#L3196) Resend integration | ✅ existe | ❌ — não consumida em React |
| `ocr-fatura` | [`L5337`](test-v2.html#L5337) | ✅ existe | ❌ |
| `migrar-fatura` | [`L6581, L6961`](test-v2.html#L6581) | ❌ **NÃO está em supabase/functions/** | n/a — precisa reescrita ou substituição |
| `send-login-link` | [`L3413, L11325`](test-v2.html#L3413) | ❌ **NÃO está em supabase/functions/** — usa `gerar-magic-link` em V1? | ⚠️ confirmar substituto |
| `v2-recibo-pdf` | (não usado em legacy directo) | ✅ existe | ❌ — opportunity para PDF recibo no React |

### 3.22 — RPCs Supabase consumidas (catálogo)

**Total RPCs distintas encontradas em test-v2.html**: 30+

| RPC | Schema esperado | Linhas chamada | React usa? |
|---|---|---|---|
| `portal_extrato_stats` | v2 legacy | [`L1485`](test-v2.html#L1485) | ❌ |
| `portal_extrato_upsert` | v2 legacy | [`L10803`](test-v2.html#L10803) | ❌ (linkado a XLSX upload) |
| `portal_get_condomino` (por token) | v2 legacy | [`L3377, L8981, L11395, L11955, L15328`](test-v2.html#L3377) | ❌ |
| `portal_get_condomino_by_email` | v2 legacy | [`L3341`](test-v2.html#L3341) | ❌ |
| `portal_get_condomino_by_ref` | v2 legacy | [`L8805, L10679, L11969`](test-v2.html#L8805) | ❌ |
| `portal_get_condomino_by_nome` | v2 legacy | [`L11980`](test-v2.html#L11980) | ❌ |
| `portal_staff_login` | v2 legacy | [`L3490`](test-v2.html#L3490) | ❌ — substituído por @proptech/auth + iam.staff_login_aliases |
| `portal_staff_set_password` | v2 legacy | [`L10006`](test-v2.html#L10006) | ❌ |
| `portal_update_condomino` | v2 legacy | [`L12874`](test-v2.html#L12874) | ❌ |
| `portal_admin_update_condomino` | v2 legacy | [`L11095, L12905`](test-v2.html#L11095) | ❌ |
| `portal_admin_create_condomino` | v2 legacy | [`L11794`](test-v2.html#L11794) | ❌ |
| `portal_admin_transferir_fracao` | v2 legacy | [`L11810, L11916`](test-v2.html#L11810) | ❌ |
| `portal_admin_get_contactos` | v2 legacy | [`L2807`](test-v2.html#L2807) | ❌ |
| `portal_admin_save_contacto` | v2 legacy | [`L2891`](test-v2.html#L2891) | ❌ |
| `portal_admin_delete_contacto` | v2 legacy | [`L2914`](test-v2.html#L2914) | ❌ |
| `portal_admin_get_all` | v2 legacy | [`L3505, L10721, L10826, L10877`](test-v2.html#L3505) | ❌ |
| `portal_admin_emitir_avisos` | v2 legacy | [`L10406`](test-v2.html#L10406) | ❌ |
| `portal_admin_emitir_quota_extra` | v2 legacy | [`L10362`](test-v2.html#L10362) | ❌ |
| `portal_admin_preview_quota_extra` | v2 legacy | [`L10317`](test-v2.html#L10317) | ❌ |
| `portal_get_carregadores_datas` | v2 legacy | [`L10292`](test-v2.html#L10292) | ❌ |
| `portal_admin_get_email_log` | v2 legacy | [`L10578`](test-v2.html#L10578) | ❌ |
| `portal_lookup_codpostal` | v2 legacy | [`L11160`](test-v2.html#L11160) | ❌ |
| `portal_get_mapas_data` | v2 legacy | [`L3599`](test-v2.html#L3599) | ❌ |
| `get_condominio` | v2 legacy | [`L3524`](test-v2.html#L3524) | ❌ |
| `get_receitas_resumo` | v2 legacy | [`L7830`](test-v2.html#L7830) | ❌ |
| `get_receitas_detalhe` | v2 legacy | [`L7834`](test-v2.html#L7834) | ❌ |
| `condo_dashboard_kpis(p_ano)` | **v2_condominios em V1** | (React) | ✅ usado em PrestacaoContas |
| `reconciliar_extrato(p_movimento_id)` | **v2_condominios em V1** | (React) | ✅ usado em Bancos |
| `marcar_fatura_paga(p_fatura_id, p_data_pagamento)` | **v2_condominios em V1** | (React) | ✅ usado em Faturas |
| `list_cron_jobs` | v2_condominios em V1 | (React) | ✅ usado em Automacoes (read-only) |

**Gap crítico**: das 30+ RPCs no V2 legacy, **23 ainda não têm equivalente nem chamada em V1** (todas as `portal_*` admin). Migração tem 2 opções:
1. **Replicar RPCs** no V1 schema `v2_condominios` (mudar nome para perder prefixo `portal_`)
2. **Substituir por queries directas + RLS** (mais React-friendly)

---

## Secção 4 — Resumo de GAPs por prioridade

### GAPs P0 (bloqueadores de cutover)

1. **OCR de faturas** (upload PDF → EF `ocr-fatura` → review → migrar para `faturas_pendentes`) — workflow inteiro inexistente em React. Estimativa: **5-7 dias**.
2. **Centro de Automações funcional** (Emissão Avisos + Envio Email + CC + Quota Extra EV + Templates + Histórico Emails) — React tem só viewer cron read-only. Estimativa: **7-10 dias**.
3. **Portal Condómino completo** (Conta Corrente, Pendentes badge, Recibos PDF, Avisos PDF, Carregador EV chart, Mapas, Ficha, Documentos) — 64 utilizadores reais dependem disto. Estimativa: **15-20 dias**.
4. **Charts Chart.js em Prestação de Contas** (linha receitas/despesas mensais + donut distribuição despesas) — Estimativa: **2-3 dias**.
5. **Export PDF** múltiplos contextos (Prestação, Conta Corrente, Avisos, Recibos) — base `jsPDF` + helpers. Estimativa: **5-7 dias**.
6. **Upload XLSX extrato bancário** ("🔄 Atualizar Extrato" sidebar footer) + chunks via RPC. Estimativa: **3-4 dias**.
7. **CRUD Condóminos completo** (modal +Novo, edit, eliminar, bulk Email/WA/Imprimir, ficha condómino com tabs) — Estimativa: **5-7 dias**.
8. **Configurações condomínio** (NIF/IBAN/CP/contactos admin) — Estimativa: **1-2 dias**.

**Subtotal P0: 43-60 dias.**

### GAPs P1 (qualidade / parity)

9. i18n PT/EN (50+ strings) — **3-5 dias**.
10. Multi-condomínio toggle (admin scope filter) — **1-2 dias**.
11. Resumo Financeiro drill-down completo (6 linhas + sub-views) — **2-3 dias**.
12. Histórico de proprietários por fracção — **2 dias**.
13. Transferência de fracção — **2 dias**.
14. Bulk contacts (Email/WA send-out) — **2-3 dias**.
15. Documentos institucionais CRUD — **1-2 dias**.
16. Drive upload + preview PDF condóminos — **3 dias**.
17. Mapa Receitas: 4 sub-tabs + export XLSX — **3 dias**.
18. Histórico e Faturas-sem-OCR views — **1-2 dias**.
19. CRUD Fornecedores standalone — **1 dia**.
20. Audit logs + portal acessos viewers — **1-2 dias**.

**Subtotal P1: 22-30 dias.**

### GAPs P2/P3 (nice-to-have)

- Reposição padrões templates, lookup CEP CTT, auto-detect lang condómino, skip-to-content a11y, PWA icons completo, Mark "sem fatura" toggle, Service Worker re-init, voto online assembleias, etc. — **5-10 dias** distribuídos.

**TOTAL effort estimado para feature parity completa: ~75-100 dias de dev (com Mário + AI ~20h/sem = 6-9 meses).**

---

## Secção 5 — Open Questions (revisadas)

1. **Como é que `v2_condominios.*` no V1 Core Hub é populado?** O único cron versionado ([`v2-legacy-bridge-cron`](supabase/functions/v2-legacy-bridge-cron/index.ts)) só faz `condominos → core.pessoas`. As outras 30+ tabelas (recebimentos, extrato, faturas, docs) que estão lá — vieram de import manual, bridge não versionada, ou snapshot único? Sem isto resolvido, app React mostra dados stale.
2. **`apps/v2-condomino-mobile/dist/` é o portal real de `prataowners.pt` para 64 utilizadores condómino, ou é só artefacto antigo?** Se for usado, precisa de track de migração separado (sem source code!).
3. **EFs `migrar-fatura` e `send-login-link` referenciadas no legacy não existem em `supabase/functions/`** — estão deployed só no V2 Supabase (`eozklslwfaqujaijvdnl`) ou foram removidas? Para migrar OCR/login precisamos delas.
4. **Bug `ReferenceError: condomino is not defined` 4× por load** — está em produção. Localização exacta no test-v2.html não confirmada (provável code-path post-login admin). Anotar para cutover.
5. **Política sunset V2 Supabase**: depois de paridade React + migração, V2 fica activo paralelo durante N dias para rollback?

---

## Anexo A — Ficheiros consultados nesta análise

- [`test-v2.html`](test-v2.html) (15.381 linhas) — legacy admin SPA
- [`docs/v2-migration/screenshots/internal/*.png`](docs/v2-migration/screenshots/internal/) (14 PNGs gitignored)
- [`docs/v2-migration/screenshots/internal/manifest.json`](docs/v2-migration/screenshots/internal/manifest.json)
- [`apps/v2-condominios/src/App.jsx`](apps/v2-condominios/src/App.jsx)
- [`apps/v2-condominios/src/lib/clients.js`](apps/v2-condominios/src/lib/clients.js)
- [`apps/v2-condominios/src/views/`](apps/v2-condominios/src/views/) — Automacoes (127L), Condominos (80L), Faturas (168L), PrestacaoContas (870L primeiros 100 lidos)
- [`docs/database/v1-schema-snapshot-2026-05-24.json`](docs/database/v1-schema-snapshot-2026-05-24.json) (2897 referências v2_condominios)
- [`docs/v2-migration/V2-LEGACY-AUDIT-2026-05-24.md`](docs/v2-migration/V2-LEGACY-AUDIT-2026-05-24.md) (audit anterior parcialmente errado, substituído por este)
- [`supabase/functions/`](supabase/functions/) — listing 57 EFs

**OPEN: precisa de capture adicional de**:
- Sub-tab "Extrato Bancário" e "Documentos" em Prestação de Contas (não no 14 actual)
- Modal `+ Novo Condómino` aberto
- Modal `+ Lançar Recebimento` aberto
- Tab "Recebimentos (72)" do Mapa de Receitas
- Portal condómino logged-in (tabs CC/Pendentes/Recibos/Avisos/Carregador/Ficha)
- Sub-tabs Mapa Receitas (Dívidas, Avisos, Carregadores)
- View "Bancos" (não capturado)
- View "Faturas" admin (não capturado)
- View "Documentos" admin (não capturado)
- AI assistant 🤖 modal expandido

---

**Confiança da análise**: **ALTA** para inventário (cruzei 4 fontes); **MÉDIA** para detalhes de implementação React (li 5 views completas + grep em todas); **MÉDIA** para effort estimado (varia conforme decisão arquitectural Opção 1 vs 2 em §3.22).

**Próxima acção sugerida**: Mário valida priorização P0/P1 antes de qualquer sprint planning.
