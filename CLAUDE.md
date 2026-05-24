# PropTech Platform — Contexto Canónico

Plataforma horizontal multi-vertical PropTech em Portugal.
Solo founder: **Mário Carvalho** (TOC — contabilista certificado · licença Toconline activa).

---

## 🗺️ Naming V1–V10 (canónico — não alterar)

| # | Nome | Tipo | Estado |
|---|---|---|---|
| **V1** | Core Hub | 🟦 Horizontal | A construir (Supabase vazio) |
| **V2** | Condomínios | 🟩 Vertical | **Produção viva** (`prataowners.pt`) |
| **V3** | Seguros | 🟩 Vertical | A construir |
| **V4** | Energia | 🟩 Vertical | **Próxima** |
| **V5** | Manutenção | 🟩 Vertical | Futura |
| **V6** | Reabilitação | 🟩 Vertical | Futura |
| **V7** | Real Estate | 🟩 Vertical | Futura |
| **V8** | Rentals | 🟩 Vertical | Futura |
| **V9** | BaaS / Swan | 🟦 Horizontal | Infra financeira |
| **V10** | Owners Club | 🟦 Horizontal | Fidelidade |

---

## 📚 Notion — Fonte de Verdade

Antes de decisões arquitecturais, consultar via MCP:

| Página | Notion ID |
|---|---|
| 🏗️ **Visão & Arquitectura** | `34084147-fa60-813d-94fe-d7f72d47d8bd` |
| 🛠️ **Developer Guide — GitHub, Deploy & Verticais** | `34184147-fa60-81b1-b72c-e4e6878656bb` |
| 🔑 **Prompts de Contexto V1-V9** | `34084147-fa60-814d-9836-c3c572949438` |
| 📒 **Contabilidade — Toconline + Multi-Adapter** | `34684147-fa60-810f-8133-ec96e510c10f` |
| 🏢 **V2 — Condomínios · Arquitectura & Integração** | `34184147-fa60-810e-8c85-d750d2623ece` |
| 🏢 **V2 Condomínios · Relatório Estratégico** | `34484147-fa60-8128-9286-c013a28075d3` |
| 🛡️ **V3 Seguros · Relatório Estratégico** | `34284147-fa60-81f2-96d0-f4f5a54b5aa6` |
| 🛡️ **V3 Seguros · Contexto Claude Project** | `34184147-fa60-8150-9b72-ed51c392e7ef` |
| ⚡ **V4 Energia · Relatório Estratégico** | `34284147-fa60-81f3-8028-d475371682fa` |
| ⚡ **V4 Energia · Contexto Claude Project** | `34184147-fa60-814a-9239-d3c54a0a062d` |
| ⚡ **Energia · Tipologias Arquitectónicas** | `34384147-fa60-81a4-84a6-e0b20ccd9ff2` |
| ⚡ **Energia · Análise Competitiva** | `34284147-fa60-8177-a35c-ef819dd16cac` |
| ⚡ **Spock.es · Impacto Vertical Energia** | `34284147-fa60-81c1-97b1-f366c27254f9` |
| 🏦 **V8 BaaS Swan · Relatório** | `34384147-fa60-810e-bd37-f3a99de9500c` |

**Regra:** qualquer agent que faça decisão arquitectural deve começar por consultar a página Notion relevante via MCP.

---

## 🗂️ Estrutura do repositório

```
proptech-platform/
├── admin/                       ← 🔒 HTMLs legacy em produção (NÃO TOCAR)
│   ├── index.html
│   └── index (admin).html
├── index.html                   ← 🔒 V9 Portal cliente (NÃO TOCAR)
├── netlify.toml                 ← 🔒 Deploy config (NÃO TOCAR sem aprovação)
├── .github/workflows/
│   └── deploy.yml               ← Auto-deploy Netlify (inalterado)
├── .gitignore                   ← Ignora node_modules/, .env, dist/, builds
├── CLAUDE.md                    ← Este ficheiro
└── apps/
    ├── dashboard/               ← Hub central (port 5180) · CookAI-style Agent Command Center
    │   │                          IAM + Billing + Growth integrados (ADR-013/014/015)
    │   ├── src/App.jsx          ← Routes /growth/funnel, /growth/leads, /growth/oportunidades, /growth/rules
    │   ├── package.json
    │   └── vite.config.js
    ├── v2-condominios/          ← V2 produção (port 5172) · prataowners.pt
    ├── v4-energia/              ← V4 em construção (port livre) · simulador tarifas
    ├── v5-manutencao/           ← V5 produção (port 5175) · catálogo serviços
    └── (v3-seguros, v6-reabilitacao, ... a construir)
└── squads/                      ← Conteúdo agentic (markdown puro, biblioteca CookAI)
    ├── README.md                ← Índice das squads + como adicionar novas
    └── sales/                   ← Squad Sales (v1.0.0, ADR-017) — 8 elite minds B2B
        ├── agents/              ← 9 agents (sales-chief + Neil Rackham + Sandler + Keenan + Voss + Challenger + Jeb Blount + Chet Holmes + Aaron Ross)
        ├── tasks/               ← 9 tasks (diagnose, qualify, cold-outreach, negotiate, close, followup, emails, copy, scripts)
        ├── checklists/          ← 2 checklists (deal-qualification, discovery-quality)
        └── config.yaml + README/ARCHITECTURE/CHANGELOG
```

> **Nota cleanup 2026-05-13:** `apps/core/` e `apps/v1-core/` (cópias legacy do admin/index.html, 1941 linhas duplicadas) **removidos** com a centralização. Tudo o que era "core" é agora `apps/dashboard/` + schemas centrais (`core`, `iam`, `growth`, `system`).

> **Nota squads 2026-05-23 (ADR-017):** `squads/sales/` adoptado como camada de conteúdo agentic (Acervo Formações T5 SQUAD vendas v1.0.0, 7.9/10 PASS). 25 ficheiros markdown, ~19k linhas, zero deps. Squad mapeia para `system.skills` (category='sales') + `system.agent_profile` (agent_id `sales.*`) via seed migration futura. OpenSquad foi **rejeitado** (compete com CookAI) — ver ADR-017.

---

## 🔒 Regras invioláveis (PRODUÇÃO)

1. **NUNCA editar** `admin/` — está a ser usado agora em produção
2. **NUNCA editar** `index.html` da raiz — é o V9 Portal público
3. **NUNCA editar** `netlify.toml` sem confirmação humana dupla
4. **NUNCA alterar dados** em `eozklslwfaqujaijvdnl` (Supabase V2) — tem ~5.000 linhas de dados reais de clientes
5. **NUNCA commitar** service role keys, `.env`, ou credenciais em geral
6. **SEMPRE perguntar antes** de `git push` que afecte produção
7. **SEMPRE usar branches** `feat/<descrição>` para novas features
8. **SEMPRE commits convencionais**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`

---
## 🛰️ Protocolo inter-agentes (vinculativo)

Aplica-se a **todos os sub-agentes e workers** invocados em qualquer worktree (`proptech-platform`, `proptech-v5-1b3`, `proptech-v4-scaffold`, `proptech-docs`). O estado partilhado vive em `.claude/state/` (junction → `C:\Users\mario\dev\proptech-state\`, fora de git).

### Regra 1 — Antes de agir

Antes de executar qualquer trabalho substantivo, ler:

1. `.claude/state/recent-activity.md` — últimas 5 entradas (o que outros agentes fizeram recentemente)
2. `.claude/state/agents/<self>.md` — o teu próprio estado (última task, próximo sugerido)
3. `.claude/state/triggers.md` secção **Activos** — se aparecer linha `TO <self>`, **trata primeiro** (a menos que o pedido directo do Mário a sobreponha)

O hook `SessionStart` já injecta resumo destes ficheiros no início de cada sessão. Mesmo assim, reler antes de agir é obrigatório porque outros agentes podem ter escrito desde o arranque.

### Regra 2 — Depois de agir

Actualizar `.claude/state/agents/<self>.md` no formato 5-linhas (ver `_template.md`):

​```
Last run: <ISO timestamp UTC>
Worktree: <nome do worktree onde correu>
Last task: <uma linha — o que foi feito>
Outputs: <ficheiros tocados, PRs, ADRs, refs>
Next suggested: <uma linha — proactividade>
​```

E acrescentar entrada ao topo do `## Histórico` do mesmo ficheiro (manter últimas 5).

**Sem actualizar = trabalho não terminado.** O `auditor-agent` recusa rever PRs cujo agente não actualizou o seu state file.

### Regra 3 — Trigger entre agentes

Se o teu trabalho cria obrigação para outro agente, escrever linha em `.claude/state/triggers.md` secção `## Activos`:

​```
[YYYY-MM-DDTHH:mmZ] FROM <self> → TO <target>: <pedido em uma linha> [refs]
​```

Exemplo real: `architect-proptech` decide criar nova tabela em V1 → escreve trigger para `supabase-designer` ("criar migration para core.<tabela> conforme ADR-XYZ"). E também para `notion-librarian` ("documentar decisão na página Arquitectura V1").

Quando o trigger é concluído, mover linha para `## Done` com prefixo `[DONE YYYY-MM-DD]`.

### Regra 4 — Oportunidade fora-de-scope

Se descobrires melhoria/bug/débito que **não** é o que estavas a fazer, **NÃO** abras nova frente. Adiciona a `.claude/state/opportunities.md` com prioridade (H/M/L) e segue a tarefa original. Mário decide em planning mensal.

### Proactive triggers (despoletamento sem pedido directo)

Estas regras são executadas pelo **CEO orchestrator** ao arrancar e a cada `/status`. Cada agente nomeado deve agir sem esperar pedido explícito do Mário:

| Quando acontece | Agente proactivo | Acção |
|---|---|---|
| Migration aplicada em Supabase | `notion-librarian` | Propõe ADR draft + actualiza página Arquitectura |
| Novo componente em `apps/*/src/components/` | `auditor-agent` | Revê não-pedido (lint + padrões CLAUDE.md) |
| 7 dias sem sync Notion | `notion-librarian` | Propõe weekly digest |
| Nova entrada em `.claude/current/decisions-log.md` | `architect-proptech` | Análise de impacto cross-vertical |
| Sprint fechado (commit `feat(*-day*.*)` ou `chore: close sprint`) | `journey-storyteller` (Fase 4) | Rascunho de post |
| Erro 500 em prataowners.pt nas últimas 24h | `ops-builder` | RCA draft |
| 14 dias sem auditoria stack-health | `ops-builder` | Auditoria completa, actualiza `stack-health.md` |

**Limite:** proactivo significa **propor**, nunca executar mudanças irreversíveis (push, deploy, INSERT em produção V2) sem aprovação do Mário.

---

## 💾 Supabase

### V1 Core Hub — `hkmvszkpxjbxmnixzqbl`
- Estado: **VAZIO** (só tabela `file_deploy` sem dados)
- Propósito: hub horizontal · CRM, MRR, Owners Club, ofertas, API keys
- Schemas a criar: `core`, `v3_seguros`, `v4_energia`, `v5_manutencao`, `v9_swan`, `v10_owners_club`
- Região: `eu-west-3` (Paris)

### V2 Condo Hub — `eozklslwfaqujaijvdnl`
- Estado: **PRODUÇÃO VIVA** — não tocar em dados
- 30 tabelas, ~5.000 linhas reais
- Tabelas chave: `condominos`, `fracoes`, `documentos` (2733), `recebimentos` (593), `extrato_bancario` (1056), `faturas_pendentes`, `faturas_ocr`, `carregadores_contagens` (359), `documentos_drive`, `seguro_fracoes`, `utilizadores_portal` (64), `audit_log`

### Estratégia de schemas (decisão canónica · Opção C + ADR-013)
- Schemas por vertical: `v3_seguros`, `v4_energia`, `v5_manutencao`, `v10_owners_club`
- Tabelas limpas dentro de cada schema: `apolices`, não `v3_apolices`
- Schema `core` para transversal: `pessoas`, `imoveis`, `empresas`, `servicos_ativos`, `leads`, `oportunidades`, `interacoes`, `ofertas`, `api_keys`, `staff`
- Schema **`iam`** (ADR-013, 2026-05-13) para Identity & Access Management cross-vertical: `permission_groups`, `permission_sections` (naming `<vertical>.<seccao>`, ex: `v2.fracoes`, `v5.ordens`), `permission_grants`, `staff_login_aliases`, `portal_tokens`, `activity_logs`. RPCs: `iam.has_permission(section, action)`, `iam.user_can(section, action)` (helper RLS), `iam.get_my_permissions()`, `iam.staff_login_lookup(alias)`, `iam.portal_token_login(token)`. **TODAS as verticais devem usar `iam` para permissões — não criar tabelas próprias.**
- Schema `system` para agentic ops: `inbox_items`, `approvals_queue` (futuro ADR-016: `agent_runs` + `agent_policies` + `notifications`)
- Schema `marketing` (futuro ADR-015): `leads`, `campanhas`, `segmentos`, `interacoes`, `oportunidades`, `cross_sell_rules`

### Exposição de schemas custom ao PostgREST

Adicionar schema custom ao REST do Supabase **não** se faz pelo Dashboard UI nem pela Management API — ambos mentem (mostram "exposed" sem propagar para o pod). A fonte de verdade real é `pg_roles.rolconfig` da role `authenticator`. Procedimento canónico no SQL Editor:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas =
  'public, graphql_public, core, system, iam, marketing, v2_condominios, v3_seguros,
   v4_energia, v5_manutencao, v1_owners_club, marketing';
NOTIFY pgrst, 'reload config';
```

**Diagnóstico** quando aparece `PGRST106 Invalid schema` no REST:

```sql
SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';
```

Ver `.claude/strategy/adrs/ADR-V2-002-postgrest-schema-exposure.md` (commit `a861c6b`).

---

## 🎨 Design System (extraído originalmente do admin/index.html legacy, mantido em `packages/ui` + `apps/dashboard`)

### Cores (light + dark modes)
```css
:root {
  --bg: #f4f3f0;       /* background principal */
  --surface: #fff;     /* cards, modais */
  --surface2: #f0eeeb; /* surface elevada / inputs */
  --border: rgba(0,0,0,0.08);
  --text: #18160f;
  --muted: #6b6458;
  --blue: #1a5296;
  --green: #2d6a4f;
  --gold: #8c6508;
  --red: #8b1a1a;
  --purple: #6b4fa0;
}
body.dark {
  --bg: #0d1117;
  --surface: #161b22;
  --surface2: #1c2333;
  --border: rgba(255,255,255,0.08);
  --text: #e6edf3;
  --muted: #9198a1;
  --blue: #58a6ff;
  --green: #3fb950;
  --gold: #e3b341;
  --red: #ff7b72;
  --purple: #d2a8ff;
}
```

### Tipografia
- Body: `Inter` (300/400/500/600/700)
- Mono: `JetBrains Mono` (400/500/600) — **todos os números, labels, badges**
- Hierarquia: `.pt` 22px 700, `.card-t` 13px 600, `.ps` 12px muted, labels uppercase 8-10px

### Padrões de componentes
- **KPI card** (`.kpi`, `.kpi-l`, `.kpi-v`, `.kpi-s`) — label uppercase 8px, valor 24px mono, sub 10px
- **Badge** (`.b`, `.b-blue`, `.b-green`, …) — mono 9px, padding 2px 8px
- **Table** — headers mono uppercase 8px, cells 12px, hover `var(--surface2)`
- **Sidebar** — 190px expandida, 44px colapsada, items 12px, sections uppercase 8px mono
- **Modal** — 560px default, bordas `--border`, header + body separados

### Regras
- **Luz primeiro, dark via toggle** — persistir em `localStorage.v1theme`
- **Radius**: 4px (inputs), 8px (cards), 10-12px (modais)
- **Sem transições > 200ms**
- **Botões primários**: `.ab` (`var(--blue)` + `#fff`), `.ab-green`, `.ab-outline`

---

## 🧱 Stack técnica

| Camada | Escolha |
|---|---|
| Database | Supabase (Postgres + Auth + Edge Functions + Realtime + Storage + Vault) |
| Backend | Supabase Edge Functions (Deno + TypeScript) |
| Frontend novas verticais | React 18 + Vite + Tailwind (core utilities) + lucide-react |
| Charts | Chart.js 4 |
| Pagamentos | Swan BaaS (V9) |
| Email transacional | Resend |
| Faturação AT | Toconline (Mario é TOC) |
| Documentos | Google Drive |
| Deploy | Netlify (HTMLs legacy) · TBD para apps React |
| Language | Português PT (nunca PT-BR) |

---

## 🧑 Preferências do utilizador (Mário)

- Não é programador profissional — explica em PT-PT simples, não assume vocabulário
- Prefere **opiniões directas** a listas de 5 opções equivalentes
- Valoriza **rigor técnico + honestidade** sobre viabilidade em vez de optimismo vazio
- Quer preservar trabalho feito — aversão a reinvenção quando existe algo a funcionar
- Notion é o registo canónico das decisões
- Terminologia PT-PT: "frações", "rubricas", "avisos de mora", "permilagem", "condomínio"
- Prefere commits granulares com mensagens descritivas

---

## 🤖 Sub-agents disponíveis

- **`architect-proptech`** — decisões arquitecturais · consulta Notion · valida impactos cross-vertical · escreve ADRs
- **`supabase-designer`** — schemas, migrations, RLS policies, edge functions via MCP Supabase
- **`vertical-builder`** — constrói novas verticais React em `apps/vN-<nome>/` · reutiliza design system do v1-core

---

## 🎯 Missão actual

**Construir V4 Energia** em `apps/v4-energia/` (Vite + React).

Contexto V4 no Notion:
- Principal: `34284147-fa60-81f3-8028-d475371682fa` (relatório estratégico)
- Claude Project: `34184147-fa60-814a-9239-d3c54a0a062d`
- Tipologias: `34384147-fa60-81a4-84a6-e0b20ccd9ff2`
- Competitiva: `34284147-fa60-8177-a35c-ef819dd16cac`
- Spock.es: `34284147-fa60-81c1-97b1-f366c27254f9`

---

## 🚀 Protocolo de Deploy (vinculativo · todos os agentes)

Aplica-se sempre que um agente faz commits em qualquer worktree. Regras absolutas, sem excepção.

### Regra D1 — Identificar projecto Vercel afectado ANTES de commit

Cada commit afecta um ou mais projectos Vercel. Identificar antes de prosseguir:

| Path tocado | Projecto Vercel | Production Branch |
|-------------|-----------------|-------------------|
| `apps/v5-manutencao/**` | proptech-v5-alpha | `main` |
| `apps/dashboard/**` | proptech-agentic-ops | `main` |
| `docs/dashboard/**` | proptech-agentic-ops (legado) | `main` |
| `apps/v4-energia/**` | proptech-v4-alpha (futuro) | `main` |
| `scripts/dashboard-data-build.js` | proptech-agentic-ops (data only) | `main` |
| `.claude/**`, `.claude/state/**` | nenhum (Vercel ignora) | n/a |
| `proptech-state/**` | proptech-agentic-ops (via parser) | `main` |
| `*.md` raiz | nenhum | n/a |

Se o commit toca em `apps/` ou `scripts/dashboard-*`, vai afectar Vercel Production quando chegar a `main`.

### Regra D2 — Branches de sprint NÃO chegam a Production sozinhas

Vercel só promove a Production o que está em `main`. Branches `sprint/*`, `feat/*`, `chore/*` ficam em Preview only.

Workflow obrigatório:

1. Trabalho em branch de sprint (ex: `sprint/v5-1b3`)
2. Push despoleta Preview deployment Vercel
3. Mário valida em Preview URL
4. Quando OK → merge para `main` → Production rebuild automático
5. Mário valida em URL Production
6. Sprint fechado → branch eliminada (opcional)

Se agente acaba implementação em `sprint/*` sem mergear para `main`, deve reportar a Mário com instruções de merge.

### Regra D3 — Smoke test obrigatório antes de merge a main

Para commits que tocam em `apps/v5-manutencao/**` ou `apps/dashboard/**`:

1. Aguardar Preview build OK em Vercel (~1-2 min)
2. Abrir Preview URL no browser
3. Verificar que renderiza sem erros
4. Para apps com auth/dados: verificar que requests não falham
5. Só depois propor merge a `main`

Se Preview falha → debugar em Preview, não em Production.

### Regra D4 — V2 produção (prataowners.pt) é INTOCÁVEL

`apps/v2-condominios/**` ou qualquer path em produção V2:
- Está em Netlify (não Vercel) — auto-deploy desactivado
- Schema Supabase separado (`eozklslwfaqujaijvdnl`)
- Cliente real (Property 007 LDA) com ~5k linhas
- Mudanças em V2 requerem aprovação humana explícita do Mário

Agentes nunca fazem commits que tocam V2 sem trigger explícito.

### Regra D5 — Reportar deploy status no fim da sessão

Quando agente termina trabalho que envolveu commits em qualquer projecto Vercel, deve reportar a Mário:

- Branch onde trabalhou
- Commits feitos (count + último hash)
- Vercel impact por projecto (Production vs Preview)
- Acção pendente Mário (validar Preview, aprovar merge, etc)

Sem este report, sessão considerada incompleta.

### Regra D6 — Hooks não devem auto-mergear branches a main

O hook `SubagentStop` faz auto-commit + auto-push em branches de sprint. NÃO deve fazer merge a `main` automaticamente. Merge para `main` é decisão humana do Mário.

Se algum agente sugere "automatizar merge a `main` no hook", recusar — viola Regra D2.

Abordagem:
1. Estrutura idêntica a `apps/v2-condominios/` (apps/v1-core e apps/core foram removidos em 2026-05-13)
2. Design system partilhado (mesmas fontes, mesmos tokens)
3. Schema Supabase em `v4_energia` no V1 Core Hub
4. Scope v1: simulador tarifas + contratos + formulário de mudança de comercializador

**NUNCA começar V4 sem antes consultar o relatório estratégico (página Notion 34284147-fa60-81f3-8028-d475371682fa) para saber o modelo de negócio, parceiros e scope agreed.**