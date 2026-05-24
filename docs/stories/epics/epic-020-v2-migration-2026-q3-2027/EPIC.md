# Epic 020 — V2 Legacy HTML → React Migration (prataowners.pt)

**Epic ID:** epic-020-v2-migration-2026-q3-2027
**Status:** Draft → Approved (plano aprovado por Mário 2026-05-24)
**Owner:** Mário Carvalho (solo founder + dev) + AI agents (aiox-dev, supabase-designer, architect-proptech)
**Created:** 2026-05-24
**Target cutover:** 2027-02-02 (±4 semanas conforme velocity real)
**Janela de execução:** Q3 2026 → Q1 2027 (~10 meses calendário)

---

## Goal

Substituir `test-v2.html` (15.381 linhas vanilla JS deployed em `prataowners.pt` via Netlify) por **duas apps React modernas** (`apps/v2-condominios/` admin + `apps/v2-condominios-portal/` portal condómino), com **zero downtime** e **zero perda de dados**, executando cutover DNS atómico e mantendo V2 Supabase legacy em paralelo durante 30-60 dias para rollback.

## Why now

1. **Débito técnico estrutural** — `test-v2.html` monolítico (15k linhas vanilla JS num único ficheiro) bloqueia evolução, testes, manutenção e qualquer agente AI que tente trabalhar nele.
2. **Bug em produção activo** — `ReferenceError: condomino is not defined` 4×/load no legacy (OQ4 do plano), sintoma de fragilidade que só piora.
3. **Schema V1 Core Hub já tem `v2_condominios.*` provisionado** — base técnica para a migração já existe (2897 refs no codebase). Janela de oportunidade.
4. **Cliente real activo** — Property 007 LDA (€5k/mês ARR potencial) precisa de estabilidade; 64 utilizadores reais do portal condómino dependem do serviço.
5. **Unblock cross-vertical** — código admin/portal em React permite reuso de `@proptech/auth`, `@proptech/db`, `@proptech/ui` e desbloqueia futuras verticais (V3 Seguros consome dados de condóminos).

---

## Context (canónico)

- **Repository:** `c:\Users\mario\dev\proptech-platform\`
- **App legacy a substituir:** [`test-v2.html`](../../../../test-v2.html) (15.381 linhas, deployed `prataowners.pt` via Netlify, schema Supabase `eozklslwfaqujaijvdnl`)
- **App React substituta admin:** [`apps/v2-condominios/`](../../../../apps/v2-condominios/) (24 views, 4256 linhas actuais, build OK, já liga a V1 Core Hub `hkmvszkpxjbxmnixzqbl`)
- **App React substituta portal:** `apps/v2-condominios-portal/` (a criar na Story 020.6)
- **Documentos canónicos (não duplicar conteúdo — referenciar):**
  - [`docs/v2-migration/V2-INVENTORY-COMPLETE-2026-05-24.md`](../../../v2-migration/V2-INVENTORY-COMPLETE-2026-05-24.md) — 480 linhas, matriz exaustiva 50+ features
  - [`docs/v2-migration/V2-MIGRATION-PLAN.md`](../../../v2-migration/V2-MIGRATION-PLAN.md) — 541 linhas, 7 fases + Gantt + custos (**source canónica de scope/effort/risco**)
  - [`docs/v2-migration/V2-LEGACY-AUDIT-2026-05-24.md`](../../../v2-migration/V2-LEGACY-AUDIT-2026-05-24.md) — audit inicial
- **Screenshots evidência:** 20 PNGs em [`docs/v2-migration/screenshots/`](../../../v2-migration/screenshots/) (4 públicos + 16 internal gitignored)

---

## Stakeholders

| Stakeholder | Papel | Interesse |
|---|---|---|
| **Mário Carvalho** | Decisor + dev único + TOC | Validar workflow daily, custos, prazos, aprovação de cada Fase mergeada a `main` |
| **Property 007 LDA** | Cliente real (€5k/mês potencial ARR) | Zero perda de dados, zero downtime, mesma qualidade ou melhor que legacy |
| **64 condóminos reais** | Utilizadores do portal `apps/v2-condomino-mobile/dist/` | Magic-link continua a funcionar, Conta Corrente bate, recibos PDF idênticos ao legacy |
| **AI agents (squad)** | Co-execução autónoma | Plano claro, gates por Fase, decisões registadas, rollback documentado |

---

## Scope (in)

7 Fases conforme [`V2-MIGRATION-PLAN.md`](../../../v2-migration/V2-MIGRATION-PLAN.md) §3, decompostas em **8 Stories** (incluindo Story 020.0 Pre-flight):

| # | Story | Fase do plano | Effort |
|---|---|---|---|
| 020.0 | Pre-flight — OPEN QUESTIONS + Vercel setup + KPI parity smoke test | Fase 0 | 3-5d |
| 020.1 | Foundations — Auth completa + i18n + Multi-condomínio + Charts | Fase 1 | 8-12d |
| 020.2 | Admin core — Condóminos, Fracções, Faturas, Bancos, Configurações | Fase 2 | 12-15d |
| 020.3 | Upload XLSX extrato + reconciliação manual | Fase 3 | 5-7d |
| 020.4 | OCR Faturas workflow completo | Fase 4 | 8-12d |
| 020.5 | Centro de Automações (8 cards) | Fase 5 | 12-15d |
| 020.6 | Portal Condómino completo (Conta Corrente, Recibos, EV, Mapas) | Fase 6 | 15-20d |
| 020.7 | Cutover DNS + 30d observação + Sunset V2 Supabase | Fase 7 | 1d + 30d obs |

**Total effort:** 75-100 dias-dev (P0+P1) ≡ 6-9 meses calendário a 20h/sem.

## Scope (out)

- **Nova vertical V3 Seguros, V4 Energia, V5 Manutenção** — projectos paralelos, com squad próprio; este epic não bloqueia nem é bloqueado.
- **Refactor design system `@proptech/ui`** — assume-se que tokens / primitivas já estão prontos (Story 019.6 P1 done). Se P2 atrasar, criamos workarounds locais; não inflar este epic.
- **Mobile-native (iOS/Android)** — portal React PWA-ready, mas app nativa fica fora.
- **Multi-tenant futuro (Owners Club V10)** — fora; manter scope em 1 cliente (Property 007 LDA · 1 condomínio Prata 2A).
- **Reescrita de Edge Functions** — só migrar/recriar as estritamente necessárias (OQ3: `migrar-fatura`, `send-login-link`). Resto fica no V1 actual.

---

## Effort & Schedule

- **Effort P0 (cutover-ready mínimo):** 43-60 dias-dev ≡ 4-6 meses
- **Effort P0 + P1 (paridade completa):** 75-100 dias-dev ≡ 6-9 meses
- **Cutover target:** 2027-02-02 (Story 020.7)
- **Sunset V2 Supabase:** +30-60 dias post-cutover (gated, decisão Mário)

Gantt detalhado em [`V2-MIGRATION-PLAN.md §4`](../../../v2-migration/V2-MIGRATION-PLAN.md#4-calendarização-realista-gantt-simplificado).

---

## Success criteria

1. **`prataowners.pt` servido por Vercel React deploy** (apex + `portal.prataowners.pt`), Netlify legacy desactivado.
2. **V2 Supabase legacy (`eozklslwfaqujaijvdnl`) pausado** após 30+ dias zero-incidents (decisão Mário Story 020.7).
3. **Diff V2↔V1 das 10 tabelas críticas = 0** no cutover (`extrato_bancario`, `recebimentos`, `faturas_pendentes`, `condominos`, `fracoes`, `documentos`, `seguro_fracoes`, `carregadores_contagens`, `orcamentos`, `audit_log`).
4. **64 condóminos reais acedem ao portal novo** sem reclamações nos primeiros 7 dias (≤5 emails/mês target).
5. **Mário valida workflow daily** como "igual ou melhor que legacy" (auto-poll semanal pós-cutover).
6. **Custo Supabase desce** de 50€/mês (V1+V2) para 25€/mês (só V1) após sunset.
7. **Zero bugs P0 nos primeiros 7 dias** pós-cutover; ≤3 bugs P2.
8. **Smoke tests por Fase passam todos** (definidos em cada Story; ver `V2-MIGRATION-PLAN.md` §3 por Fase).

---

## Risks (top 5)

| # | Risco | Severity | Mitigação |
|---|---|---|---|
| R1 | Quebrar 64 utilizadores reais do portal condómino no cutover | **Critical** | Paralelismo prolongado (30-60d), magic-link continua igual, comms T-30/T-7/T-0, opt-in switch possível |
| R2 | Dessincronia entre V2 legacy Supabase e V1 Core Hub (`v2_condominios.*` populado por bridge) | **High** | OQ1 fechada na Story 020.0; diff diário automatizado pré-cutover; Fase 7 §7.1 exige delta=0 |
| R3 | Regressão no workflow OCR Faturas (Mário usa diariamente) | **High** | EF `ocr-fatura` já existe em V1; review modal + dedup waterfall + smoke test Fase 4 com fatura real |
| R4 | Perda de features pequenas (i18n EN, export CSV, drill-down resumo, transferência fracção) | **Medium** | Inventário exaustivo já feito (`V2-INVENTORY-COMPLETE-2026-05-24.md` mapeia 50+ features); cada Story tem AC explícito por feature |
| R5 | Capacidade Mário (~20h/sem) insuficiente para 75-100 dias-dev em 10 meses | **Medium** | Story 020.0 calibra velocity; aceleração possível cortando P1 features (sequência alternativa em `V2-MIGRATION-PLAN.md §4`) |

Riscos detalhados por Fase em [`V2-MIGRATION-PLAN.md`](../../../v2-migration/V2-MIGRATION-PLAN.md) (R1–R16).

---

## Constraints invioláveis

1. **V2 produção (`prataowners.pt` + Supabase `eozklslwfaqujaijvdnl`) é INTOCÁVEL** até cutover validado por Mário (**Regra D4** do `CLAUDE.md` raiz).
2. **App React vai para Vercel** — Preview por branch, Production só após merge a `main` por Mário (**Regra D2**).
3. **Smoke test obrigatório antes de merge a `main`** (**Regra D3**).
4. **Forward-only migrations** — qualquer alteração de schema V1 precisa de ficheiro `.sql` em `supabase/migrations/` PRIMEIRO, apply DEPOIS (Story 019.4 policy).
5. **Schema V1 IAM** — toda a auth/permissões via `iam.*` (ADR-013); não criar tabelas próprias de permissões.
6. **Português PT-PT** em UI, comments, docs (Mário PT, cliente Property 007 PT).
7. **Cada Story standalone** — pode ser executada por dev sem reler o plano completo, mas referencia secções específicas para detalhe.

---

## References (ADRs + docs vinculativos)

- **ADR-V11-004** — Attio CRM `workspace_id` Day 1 (multi-tenant futuro respeitado em todas as queries V1)
- **ADR-013** — `iam.staff_login_aliases` + `iam.has_permission` (auth canónica)
- **ADR-014** — Billing per-vertical (Property 007 = customer V2 condomínios)
- **ADR-V2-002** — PostgREST schema exposure (V1 já expõe `v2_condominios` via `pgrst.db_schemas`)
- **Regra D2/D3/D4** — Deploy protocol (`CLAUDE.md` raiz §"Protocolo de Deploy")
- **Story 019.1** — RLS V1 100% (pré-requisito implícito: dados v2_condominios.* protegidos)
- **Story 019.4** — Forward-only migrations policy (qualquer DDL V1 nesta epic respeita)
- **Story 019.6 P1** — Tokens `@proptech/ui` (Stories 020.1+ consomem)
- **Story 019.7** — `@proptech/auth` centralizado (Story 020.1 depende)
- **`V2-MIGRATION-PLAN.md`** — source canónica de scope, effort, smoke tests, rollback por Fase
- **`V2-INVENTORY-COMPLETE-2026-05-24.md`** — matriz 50+ features (cada Story referencia secções)
- **Notion V2 Arquitectura** — `34184147-fa60-810e-8c85-d750d2623ece` (consultar antes de decisões arquitecturais)
- **Notion V2 Relatório Estratégico** — `34484147-fa60-8128-9286-c013a28075d3`

---

## Stories (links)

- [Story 020.0 — Pre-flight](stories/020.0-pre-flight.md)
- [Story 020.1 — Foundations](stories/020.1-foundations.md)
- [Story 020.2 — Admin core](stories/020.2-admin-core.md)
- [Story 020.3 — Upload XLSX](stories/020.3-upload-xlsx.md)
- [Story 020.4 — OCR Faturas](stories/020.4-ocr-faturas.md)
- [Story 020.5 — Automações](stories/020.5-automacoes.md)
- [Story 020.6 — Portal Condómino](stories/020.6-portal-condomino.md)
- [Story 020.7 — Cutover + Sunset](stories/020.7-cutover-sunset.md)

---

## Change Log

| Data | Autor | Alteração |
|---|---|---|
| 2026-05-24 | aiox-pm (Bob) | Epic criado em Draft → Approved. Plano aprovado por Mário 2026-05-24 conforme `V2-MIGRATION-PLAN.md`. 8 stories esqueleto criadas em paralelo. |
