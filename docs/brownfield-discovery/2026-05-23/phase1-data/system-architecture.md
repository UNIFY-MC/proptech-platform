# Phase 1 — System Architecture · PropTech Platform · 2026-05-23

> Produzido por: architect-proptech
> Workflow: Brownfield Discovery — Phase 1 (Data Collection)
> Âmbito: read-only — análise do estado actual do monorepo
> Baseline: `docs/audits/2026-05-05/AUDIT-architecture.md`
> Data: 2026-05-23

---

## 1. Snapshot actual da arquitectura

### 1.1 Apps (`apps/`)

| App | Package name | Stack | Porta | Supabase | Deploy | Estado |
|-----|-------------|-------|-------|----------|--------|--------|
| `apps/dashboard/` | `dashboard` | React 18 + Vite | 5180 | hkmvszkpxjbxmnixzqbl | Vercel: proptech-agentic-ops | **Activo — Command Center principal** |
| `apps/v2-condominios/` | `v2-condominios` | React 19 + Vite | 5172 | hkmvszkpxjbxmnixzqbl (via packages/@proptech) | Não deployado | **Activo — rebuild V2 com packages partilhados** |
| `apps/v4-energia/` | `v4-energia` | React + Vite | 5178 | hkmvszkpxjbxmnixzqbl | Não deployado | Scaffoldo — motor BD-driven |
| `apps/v5-manutencao/` | `v5-manutencao` | React 18 + Vite | 5175 | hkmvszkpxjbxmnixzqbl | Vercel: proptech-v5-alpha | **Activo — PRODUÇÃO** |
| `apps/truth/` | `@property007/truth` | React 19 + Vite + TS | 5181 | hkmvszkpxjbxmnixzqbl | Não deployado | **NOVO (2026-05-18) — Truth Engine / Swarm** |
| `apps/cli/` | `@property007/cli` | Node + Ink + TS | CLI | N/A | Não deployado | **NOVO — TUI 6 comandos** |
| `apps/discord-bot/` | N/A | Deno + TypeScript | N/A | N/A | Fly.io | **NOVO — Discord bot always-on** |
| `apps/discord-bot-cf/` | N/A | Cloudflare Workers + Durable Objects | N/A | N/A | Cloudflare | **NOVO — Discord listener alternativo** |
| `apps/v2-condomino-mobile/` | N/A | TS (apenas dist/) | N/A | N/A | Não deployado | **NOVO — apenas build, sem src visível** |
| `apps/core/` | N/A | React 19 + Vite | 5180 | hkmvszkpxjbxmnixzqbl | Não deployado | Standby — port do admin legado |
| `apps/v1-core/` | N/A | React 19 + Vite | — | — | Não deployado | **ELIMINADO em 2026-05-13 (confirmado em CLAUDE.md)** |

> Nota: `apps/v1-core/` foi removido conforme CLAUDE.md ("Nota cleanup 2026-05-13: apps/core/ e apps/v1-core/ removidos"). No entanto, `apps/core/` ainda existe no filesystem. O CLAUDE.md refere ambos como "removidos" mas `apps/core/` não está ausente. Inconsistência a investigar.

### 1.2 Packages (`packages/`)

| Package | Propósito | Consumidores conhecidos |
|---------|-----------|------------------------|
| `packages/ui` | Componentes partilhados (Drawer, DrawerContext, Cards) | apps/dashboard, apps/v2-condominios |
| `packages/db` | Supabase clients: createMainClient + createCoreClient | apps/v2-condominios |
| `packages/auth` | Auth partilhada | apps/v2-condominios |
| `packages/growth-pixel` | Pixel tracking (marketing) | N/A confirmado |

### 1.3 Supabase (`supabase/`)

Localização canónica de migrations: **`apps/v5-manutencao/supabase/migrations/`** (47 ficheiros).
Localização raiz: **`supabase/migrations/`** (13 ficheiros — apenas migrations até Abril + grants iniciais).

Schemas activos em `hkmvszkpxjbxmnixzqbl` (V1 Core Hub):

| Schema | Propósito | Estado |
|--------|-----------|--------|
| `core` | Entidades transversais: pessoas, imoveis, empresas, workspaces, records_metadata, activity_unified | Activo |
| `iam` | Identity & Access Management cross-vertical | Activo (ADR-013, migration 20260513) |
| `system` | Agentic ops: inbox_items, approvals_queue, agent_triggers, agent_schedules, swarm_* | Activo |
| `growth` | Funil + leads + cross-sell + campanhas | Activo (ADR-015, migration 20260513) |
| `marketing` | Referenciado em CLAUDE.md — ver growth schema | Ver nota |
| `v2_condominios` | Schema novo V2 rebuild (20 tabelas + RLS) | Activo |
| `v2_new` | Schema CRM multi-tenant para V2 (condominios/fracoes/quotas/recebimentos/documentos/actas) | Activo (ADR-V11-004, migration Sprint C2) |
| `v3_seguros` | Schema seguros: seguradoras, apolices, sinistros, simulacoes | Activo (criado 2026-05-05, RLS ON, 0 rows) |
| `v4_energia` | Tarifas, contratos, facturas_uploaded, omie_dam_horario | Activo |
| `v5_manutencao` | Ordens, prestadores, magic_links, catálogo | Activo (schema principal V5) |
| `public` | Legado (is_staff(), helpers) | Activo |

> Nota: CLAUDE.md lista schema `marketing` separado de `growth`. A migration `20260513_growth_schema.sql` existe. A relação entre `marketing` e `growth` não está esclarecida em nenhum ADR.

### 1.4 Scripts (`scripts/`)

| Script | Propósito |
|--------|-----------|
| `dashboard-data-build.js` | Constrói data.json para dashboard estático |
| `dev-sync.js` | Sync de desenvolvimento |
| `sync-employees-to-db.js` | Seed de employees para BD |
| `watchers/` | Scripts de monitoring/watchers |

### 1.5 Legado estático (Netlify)

| Ficheiro | Deploy | Regra |
|----------|--------|-------|
| `admin/index.html` + `admin/index (admin).html` | Netlify (prataowners.pt) | NUNCA editar |
| `index.html` (raiz) | Netlify | NUNCA editar (V9 Portal público) |

---

## 2. Delta vs 2026-05-05

### 2.1 Removido

| Item | Data | Confirmação |
|------|------|-------------|
| `apps/core/` (duplicado legado) | 2026-05-13 | CLAUDE.md nota cleanup |
| `apps/v1-core/` (duplicado obsoleto) | 2026-05-13 | CLAUDE.md nota cleanup |

> AVISO: `apps/core/` ainda existe no filesystem (verificado em 2026-05-23). O CLAUDE.md diz "removido" mas o directório está presente. Pode ser remoção parcial ou referência incorrecta no CLAUDE.md.

### 2.2 Adicionado

| Item | Data aproximada | Notas |
|------|----------------|-------|
| `apps/truth/` | 2026-05-18 | Truth Engine — Swarm AI. React 19 + TS. 4 views: Swarm, Discoveries, Niches, Studio |
| `apps/cli/` | ~2026-05-14 | TUI com 6 comandos (tasks/recipes/inbox/chat) via Ink |
| `apps/discord-bot/` | ~2026-05-15 | Discord bot always-on. Fly.io deploy. |
| `apps/discord-bot-cf/` | ~2026-05-15 | Discord listener alternativo. Cloudflare Workers. |
| `apps/v2-condomino-mobile/` | Incerto | Apenas dist/ e node_modules presentes — sem src/ |
| Schema `iam` | 2026-05-13 | ADR-013. Identity & Access Management cross-vertical |
| Schema `growth` | 2026-05-13 | ADR-015. Funil + cross-sell |
| Schema `v2_new` | 2026-05-18 | ADR-V11-004 Sprint C2. Multi-tenant CRM para condominios |
| `packages/ui`, `packages/db`, `packages/auth`, `packages/growth-pixel` | 2026-05-12–13 | Monorepo packages partilhados |
| 54 agentes em `.claude/agents/` | 2026-05-13–23 | Era ~25, agora 54 (aiox-*, chiefs, design, legal, etc.) |
| ADRs V11-004 e V11-005 | 2026-05-17–18 | Referenciados em triggers/state mas **NÃO têm ficheiro em `.claude/strategy/adrs/`** |
| `supabase/migrations/` raiz: 13 novos ficheiros (20260504–20260513) | 2026-05-04–13 | Foram acrescentados vs os 0 ficheiros úteis do baseline |

### 2.3 Renomeado / mudado de estado

| Item | Antes | Depois |
|------|-------|--------|
| Agente `Bia` (V5 Concierge) | Nome: Bia, role: V5 | Nome: Mia, role: V5 (branch activa: `chore/rename-bia-jarvis-mia`). Ficheiro `bia.md` ainda existe em `.claude/employees/` ao lado de `mia.md`. |
| `apps/dashboard/` rotas | ~20 views | 50+ views (email, discord, CRM /crm/*, growth/funnel, growth/leads, growth/oportunidades, growth/rules, /swarm/*, calendar, etc.) |
| Migrations canónicas | `apps/v5-manutencao/supabase/migrations/` (13 ficheiros) | 47 ficheiros — acrescentados 34 ficheiros desde 2026-05-04 |
| V3 Seguros | "A construir" | Schema criado 2026-05-05, ADR-V3-001 proposto (aguarda Mário) |
| V2 Condomínios | Produção em Netlify sem rebuild frontend | `apps/v2-condominios/` com 20 views activas + packages partilhados |

### 2.4 ADRs: estado delta

| ADR | Baseline (2026-05-05) | Actual (2026-05-23) |
|-----|----------------------|---------------------|
| ADR-010 | Em git | Em git |
| ADR-011 | Proposto | Em git como `011-system-cookai-catalog.md` |
| ADR-013 | Não existia | Em git como `013-centralizar-iam.md`, **Aceite** |
| ADR-014 | Não existia | Em git como `014-centralizar-billing.md`, **Aceite** |
| ADR-015 | Não existia | Em git como `015-growth-funil-cross-sell.md`, **Aceite** |
| ADR-V2-002 | Não existia | Em git — PostgREST schema exposure |
| ADR-V2-003 | Não existia | Em git — Cutover V2 legacy (fases B–F pendentes) |
| ADR-V4-002 | Não existia | Em git — OCR fatura Haiku 4.5 |
| ADR-V3-001 | Não existia | **NÃO está em git** — apenas referenciado em triggers.md |
| ADR-V4-001 | Não existia | **NÃO está em git** — apenas referenciado em triggers.md |
| ADR-V11-004 | Não existia | **NÃO está em git** — apenas em triggers/state |
| ADR-V11-005 | Não existia | **NÃO está em git** — apenas em triggers/state |
| ADR-condo-001 | Referenciado, sem ficheiro | **NÃO está em git** — persiste sem ficheiro |
| ADR-ADR-001 a 009 | Sem ficheiros | **Continuam sem ficheiros em git** |

---

## 3. Mapa de deployment

| App / Camada | Deploy target | Production branch | URL | Notas |
|-------------|--------------|-------------------|-----|-------|
| `apps/dashboard/` | Vercel (proptech-agentic-ops) | `main` | proptech-agentic-ops.vercel.app | Command Center — deploy automático ao merge |
| `apps/v5-manutencao/` | Vercel (proptech-v5-alpha) | `main` | proptech-v5-alpha.vercel.app | V5 produção activa |
| `apps/v4-energia/` | Vercel (proptech-v4-alpha — futuro) | `main` | N/A | Não deployado ainda |
| `apps/truth/` | Nenhum | N/A | localhost:5181 | Sem projecto Vercel definido |
| `apps/cli/` | Nenhum (executável local) | N/A | N/A | Sem deploy |
| `apps/discord-bot/` | Fly.io | N/A | fly.io URL | Deploy independente do Vercel |
| `apps/discord-bot-cf/` | Cloudflare Workers | N/A | workers.dev URL | Deploy independente do Vercel |
| `apps/v2-condominios/` | Nenhum | N/A | localhost:5172 | Em desenvolvimento activo |
| `apps/v2-condomino-mobile/` | Desconhecido | N/A | N/A | Sem src, apenas dist |
| `apps/core/` | Nenhum | N/A | N/A | Standby / legado |
| `admin/` + `index.html` raiz | Netlify (prataowners.pt) | `main` (auto-deploy desactivado) | prataowners.pt | PRODUÇÃO V2 REAL — intocável |
| Supabase Edge Functions | hkmvszkpxjbxmnixzqbl | N/A | supabase.co | 10+ EFs activas (OCR, swarm, bridge, cron) |

---

## 4. Áreas de dívida arquitectural — Top 10

### D1 — CRITICAL: Dois schemas para V2 Condomínios (`v2_condominios` + `v2_new`)

**Severity:** Critical  
**Path:** `supabase/migrations/20260513_*.sql` (v2_condominios) + triggers.md ADR-V11-004 (v2_new)  
**Justificação:** Existem dois schemas com propósito sobreposto para V2. `v2_condominios` foi criado em 2026-05-05 com 20 tabelas e RLS completo. `v2_new` foi criado em 2026-05-18 (Sprint C2, ADR-V11-004) com 6 tabelas FKs core.* para o "rebuild multi-tenant CRM". O que é canónico? A migration `v2-legacy-bridge-cron` sincroniza do Supabase V2 produção (`eozklslwfaqujaijvdnl`) para `v2_new`. A app `apps/v2-condominios/` tem 20 views mas não está claro qual schema usa. Sem ADR que defina a relação entre os dois — decisão ADR-V2-003 (cutover V2) está parcialmente implementada (Fase A+D concluídas, B–F pendentes) mas não menciona `v2_new` que surgiu depois.

### D2 — CRITICAL: ADRs V11-004 e V11-005 implementados mas sem ficheiro em git

**Severity:** Critical  
**Path:** `.claude/strategy/adrs/` (ausente), `.claude/state/triggers.md` (referência)  
**Justificação:** ADR-V11-004 (CRM Attio-style + Multi-Workspace) e ADR-V11-005 (Truth Engine Swarm) foram aprovados, implementados com 4 migrations + 2 Edge Functions cada, e estão em produção em `hkmvszkpxjbxmnixzqbl`. Não existem ficheiros `.md` correspondentes em `.claude/strategy/adrs/`. Se os triggers.md forem limpos, a decisão desaparece. Estas são as decisões mais recentes e mais impactantes — a ausência de ADR formal é a dívida de governança mais urgente.

### D3 — High: `apps/core/` declarado "removido" mas ainda presente no filesystem

**Severity:** High  
**Path:** `apps/core/` (directório)  
**Justificação:** CLAUDE.md afirma explicitamente "apps/core/ e apps/v1-core/ REMOVIDOS em 2026-05-13". Na realidade, `apps/core/` ainda existe. Pode ser uma remoção parcial (directório com conteúdo) ou a nota do CLAUDE.md está incorrecta. Qualquer agente que leia CLAUDE.md vai assumir que `apps/core/` não existe, mas qualquer agente que faça `ls apps/` vai encontrá-lo. Isto cria risco de trabalho duplicado ou edição acidental.

### D4 — High: `apps/v2-condomino-mobile/` sem src, sem ADR, sem deployer identificado

**Severity:** High  
**Path:** `apps/v2-condomino-mobile/`  
**Justificação:** Existe uma pasta `apps/v2-condomino-mobile/` com apenas `dist/` e `node_modules/` — nenhum ficheiro de código fonte visível. Não há referência em CLAUDE.md, em nenhum ADR, nem em triggers.md. Não se sabe o que é (React Native? Capacitor? PWA?), quem o criou, para onde vai ou se está activo. Ocupa espaço e cria confusão sem documentação.

### D5 — High: Agente `bia.md` e `mia.md` coexistem em `.claude/employees/`

**Severity:** High  
**Path:** `.claude/employees/bia.md`, `.claude/employees/mia.md`  
**Justificação:** A renomeação Bia→Mia está na branch `chore/rename-bia-jarvis-mia` (activa). Existem dois ficheiros: `bia.md` (antigo) e `mia.md` (novo). Múltiplas referências no código ainda usam "Bia" (views `BiaScorecard.jsx`, `BiaTaskLauncher.jsx`, `BiaPlaceholder.jsx` em `apps/dashboard/src/views/`). A renomeação está incompleta — metade do sistema chama "Mia", a outra metade ainda chama "Bia".

### D6 — High: Migrations divididas em duas localizações (raiz: 13 ficheiros, V5: 47 ficheiros)

**Severity:** High  
**Path:** `supabase/migrations/` (13) vs `apps/v5-manutencao/supabase/migrations/` (47)  
**Justificação:** Identificado em AUDIT-2026-05-05 como dívida "Média-Alta". Em 18 dias, agravou-se: V5 passou de 17 para 47 migrations (adicionados 30 ficheiros). A raiz tem 13 ficheiros (vs 2 no baseline). As duas localizações continuam activas sem reconciliação. `supabase db reset` na raiz produziria estado diferente do real. Qualquer novo agente que queira fazer uma migration não sabe onde criar o ficheiro.

### D7 — Medium: Schema `marketing` referenciado em CLAUDE.md mas sem migration correspondente clara

**Severity:** Medium  
**Path:** `CLAUDE.md` (referência), `supabase/migrations/20260513_growth_schema.sql`  
**Justificação:** CLAUDE.md define schema `marketing` como separado de `growth`, com tabelas `leads`, `campanhas`, `segmentos`, `interacoes`, `oportunidades`, `cross_sell_rules`. ADR-015 e a migration `20260513_growth_schema.sql` criam schema `growth`. Não existe migration `marketing_schema.sql`. Ou `marketing` é alias de `growth`, ou é um schema a criar. A ambiguidade entre os dois nomes cria confusão em qualquer desenvolvimento futuro de V3/V4/V10.

### D8 — Medium: ADR-V2-003 (cutover V2) parcialmente implementado — fases B–F abertas sem prazo

**Severity:** Medium  
**Path:** `.claude/strategy/adrs/ADR-V2-003-cutover-v2-legacy.md`, `triggers.md`  
**Justificação:** ADR-V2-003 define 6 fases de cutover do V2 produção para V1 Core Hub. Fases A (dados) + D (storage read-only) estão concluídas. Fases B (RPCs+views), C (Edge Fns), E (UI 9 features), F (cutover DNS) estão abertas. Enquanto isso, `apps/v2-condominios/` ganhou 20 views e os schemas `v2_condominios` + `v2_new` cresceram. A lacuna entre o plano de cutover e o desenvolvimento paralelo da app V2 não está coordenada.

### D9 — Medium: `swarm-orchestrator-cron` PAUSADO em produção — bug haiku_json_parse_failed

**Severity:** Medium  
**Path:** `.claude/state/triggers.md` (trigger activo FROM supabase-designer TO mario)  
**Justificação:** O Truth Engine (ADR-V11-005) está deployado com 25 workers e 10 niches, mas o cron principal `swarm-orchestrator-cron` está pausado porque o Claude Haiku retorna JSON com markdown fences que causam `JSON.parse` a falhar. O worker v3 tem fix, mas o swarm não foi reactivado. A funcionalidade central do Truth Engine não está operacional desde o deploy.

### D10 — Medium: 221 commits em 18 dias — sem branches de sprint consolidadas em main

**Severity:** Medium  
**Path:** `git log`  
**Justificação:** 221 commits desde 2026-05-05. Os triggers activos mostram 4+ branches de sprint (`sprint/crm-attio-week1`, `sprint/crm-attio-week2`, `sprint/truth-week1`, `sprint/truth-week2`, `sprint/truth-week3`, `sprint/cookai3-week1`, `sprint/cookai3-week2`) que nunca foram mergeadas em `main`. O Mário tem acumulado validações pendentes. O fosso entre `main` e as branches de sprint aumenta risco de conflitos e torna o estado de produção opaco.

---

## 5. Dependências cross-vertical

### 5.1 Dependências de dados (schemas Supabase)

```
core.pessoas ←── v2_condominios.condominos (FK)
core.pessoas ←── v2_new.* (FK — ADR-V11-004)
core.pessoas ←── v4_energia.contratos_energia (FK via pessoa_id)
core.imoveis ←── v2_condominios.fracoes (FK)
core.workspaces ←── v2_new.* (workspace_id em 22 tabelas)
core.activity_unified ←── system.swarm_discoveries (Source 7 — ADR-V11-005)
core.activity_unified ←── v2_new.* (Sources 1–6)
iam.* ←── todas as verticais (autenticação cross-vertical — ADR-013)
system.swarm_* ←── core.records_metadata (EMT worker — match discoveries→CRM)
```

### 5.2 Dependências de packages (frontend)

```
packages/ui ←── apps/dashboard (Drawer, DrawerContext, Cards)
packages/ui ←── apps/v2-condominios (Drawer, DrawerContext, EmployeeHeader)
packages/db ←── apps/v2-condominios (createMainClient V2 prod + createCoreClient V1)
packages/auth ←── apps/v2-condominios
```

### 5.3 Dependências de Edge Functions

```
v4-ocr-fatura ←── v4_energia.facturas_uploaded
swarm-orchestrator ←── system.swarm_niches, system.swarm_workers
swarm-worker-jina ←── system.swarm_runs, system.swarm_discoveries, core.records_metadata
v2-legacy-bridge-cron ←── eozklslwfaqujaijvdnl (V2 produção) → v2_new (V1 hub)
crm-dedup-resolve ←── core.dedup_candidates, core.records_metadata
gmail-auto-draft-batch ←── sistema email do dashboard
```

### 5.4 Verticais sem dependências formalizadas (isoladas ou não iniciadas)

- V3 Seguros: schema existe, sem app, sem integração core.* formalizada
- V5 Manutenção: usa core.staff_roles directamente (não migrou para `iam.*` — ADR-013 define migração pendente)
- V6/V7/V8/V10: inexistentes além de meta.json em `.claude/employees/`

---

## 6. Gaps de docs/ADRs

### 6.1 Decisões implementadas SEM ADR formal em git

| Implementação | Data aprox. | Gap |
|---------------|------------|-----|
| `apps/discord-bot/` (Fly.io) | 2026-05-15 | Sem ADR. Decisão arquitectural significativa: escolha Deno + Fly.io vs alternativas. |
| `apps/discord-bot-cf/` (Cloudflare Workers) | 2026-05-15 | Sem ADR. Dois deploy targets para Discord é decisão que precisa de justificação. |
| `apps/cli/` (Ink TUI) | 2026-05-14 | Sem ADR. Porque CLI? Quem usa? Que comandos sobrevivem a longo prazo? |
| ADR-V11-004 (CRM Attio) | 2026-05-17 | Apenas em triggers/state. Implementação em produção sem ficheiro .md. |
| ADR-V11-005 (Truth Engine) | 2026-05-18 | Apenas em triggers/state. Implementação em produção sem ficheiro .md. |
| ADR-V3-001 (arranque V3 Seguros) | 2026-05-16 | Apenas em triggers. Aguarda Mário — proposto mas não registado em git. |
| ADR-V4-001 (motor BD-driven V4) | 2026-05-12 | Apenas em triggers (marcado DONE). Sem ficheiro em `.claude/strategy/adrs/`. |
| `packages/ui`, `packages/db`, `packages/auth` | 2026-05-12 | Sem ADR. A decisão de criar monorepo packages partilhados é arquitecturalmente relevante. |
| `v2_new` schema + bridge cron | 2026-05-18 | Coberto por ADR-V11-004 (sem ficheiro). Relação com `v2_condominios` não documentada. |
| Nomeação `growth` vs `marketing` schema | 2026-05-13 | CLAUDE.md lista `marketing`, migration cria `growth`. Sem ADR que esclareça. |

### 6.2 ADRs em git sem implementação visível ou com implementação parcial

| ADR | Estado declarado | Implementação |
|-----|-----------------|---------------|
| ADR-011 (CookAI Catalog system.*) | Aceite | Migration 20260513_apps_surfaces.sql + 20260513_skills_lifecycle.sql aplicadas. Parcialmente implementado. |
| ADR-V2-003 (Cutover V2 legacy) | Aceite — fases A+D done | Fases B, C, E, F abertas indefinidamente. |
| ADR-014 (Billing core.*) | Aceite | Migration `20260513_core_billing.sql` aplicada. App de billing não existe. |
| ADR-015 (Growth funil) | Aceite | Migration `20260513_growth_schema.sql` aplicada. 4 routes no dashboard (GrowthFunnel.jsx, etc.) existem mas sem backend completo confirmado. |

### 6.3 ADRs referenciados mas nunca criados (nem em git, nem em triggers)

- ADR-001 a 009 (listados no baseline 2026-05-05 como "apenas em Notion") — continuam ausentes em git.
- ADR-condo-001 — continua sem ficheiro em `.claude/strategy/adrs/` apesar de referenciado desde 2026-05-05.
- ADR-012 ("PropTech Operating System" — plano centralização) — referenciado em agent state de 2026-05-13, mas não tem ficheiro em git.

---

## Apêndice — Resumo de schemas activos confirmados (V1 Core Hub)

Baseado nas migrations em `apps/v5-manutencao/supabase/migrations/`:

| Schema | Criado em | Principais tabelas / propósito |
|--------|-----------|-------------------------------|
| `core` | 2026-05-05 | pessoas, imoveis, organizations, memberships, workspaces, records_metadata, activity_unified, dedup_candidates, condominios |
| `iam` | 2026-05-13 | permission_groups, permission_sections, permission_grants, staff_login_aliases, portal_tokens, activity_logs |
| `system` | 2026-05-04 | inbox_items, approvals_queue, agent_triggers, agent_schedules, swarm_niches, swarm_workers, swarm_runs, swarm_discoveries, niche_icp_cards |
| `growth` | 2026-05-13 | leads, campanhas, segmentos, interacoes, oportunidades, cross_sell_rules (+ cron cross-sell) |
| `v2_condominios` | 2026-05-05 | 20 tabelas — condominos, fracoes, faturas, recebimentos, documentos, etc. |
| `v2_new` | 2026-05-18 | condominios, fracoes, quotas, recebimentos, documentos, actas (FKs core.*) |
| `v3_seguros` | 2026-05-05 | seguradoras, apolices, sinistros, simulacoes |
| `v4_energia` | 2026-05-05 | acordos_comercializadoras, contratos_energia, facturas_uploaded, omie_dam_horario, tarifas |
| `v5_manutencao` | ~2026-04 | ordens, prestadores, magic_links, catálogo_servicos, wishlist, cliente_moradas, etc. |
| `public` | Origem | is_staff(), helpers RLS |

---

*Produzido em modo read-only. Nenhum ficheiro de código foi alterado.*  
*Próximo: Phase 2 (DB Specialist Review) — análise detalhada por @data-engineer.*
