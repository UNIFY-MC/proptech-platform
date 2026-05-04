---
verticals:
  - id: v1
    name: "Core Hub"
    status: foundation
    color: violet
    meta: "hkmvszkpxjbxmnixzqbl"
    detail: "Hub horizontal partilhado por todas as verticais"
    longDetail: "Foundation. Tabelas: core.pessoas, core.organizations, core.imoveis. Schema v5_manutencao activo com magic_links + prestadores_parceiros + recibos_servico."
  - id: v2
    name: "Condomínios"
    status: production
    color: emerald
    meta: "~5k linhas reais"
    detail: "prataowners.pt — produção viva"
    longDetail: "Production stable. 30 tabelas, ~5000 linhas reais. Zero touch policy — nunca alterar dados. Próximo: V10 Copilot add-on Q4 2026."
  - id: v3
    name: "Seguros"
    status: planned
    color: stone
    meta: "Q1 2027"
    detail: "Relatório estratégico escrito no Notion"
    longDetail: "Planned Q1 2027. Scope: análise de portfolio de seguros + sinistros. Triggers: V5 50 owners pagantes + V4 validada."
  - id: v4
    name: "Energia"
    status: foundation
    color: amber
    meta: "Schema v4_energia criado"
    detail: "Schema pronto, produto a construir"
    longDetail: "Foundation. Schema v4_energia aplicado em V1 Core Hub. Sprint 2A Q3 2026. Relatório estratégico Notion."
  - id: v5
    name: "Manutenção"
    status: active
    color: blue
    meta: "Sprint 1D activo"
    detail: "V5 alpha deployed em proptech-v5-alpha.vercel.app"
    longDetail: "Active. Sprint 1D — Receipt Trojan Horse Alpha. Day 5/14. Gates: Day 7 owner externo, Day 14 5/5 criteria. 5 alpha owners em recrutamento."
  - id: v6
    name: "Reabilitação"
    status: planned
    color: stone
    meta: "Q1 2027"
    detail: "Prevista no roadmap"
    longDetail: "Planned. Scope TBD. Segue V5 validada + V4 energética."
  - id: v7
    name: "Real Estate"
    status: planned
    color: stone
    meta: "2027+"
    detail: "Prevista no roadmap"
    longDetail: "Planned 2027+. Scope TBD."
  - id: v8
    name: "Rentals"
    status: planned
    color: stone
    meta: "2027+"
    detail: "Prevista no roadmap"
    longDetail: "Planned 2027+. Scope TBD."
  - id: v9
    name: "BaaS / Swan"
    status: planned
    color: stone
    meta: "Q1 2027"
    detail: "Infraestrutura financeira Swan BaaS"
    longDetail: "Planned Q1 2027. Parceria Swan pendente de assinatura. Relatório estratégico Notion."
  - id: v10
    name: "Owners Club"
    status: foundation
    color: violet
    meta: "Tab V5 Sprint 1E"
    detail: "Fidelidade — tab dedicada planeada Sprint 1E"
    longDetail: "Foundation. Tab dedicada Owners Club prevista para Sprint 1E. Integração V2 condomínios + V5 histórico. Q4 2026."
---

# Estado das verticais — PropTech Platform
> Documento complementar a `.claude/current/current-sprint-state.md`
> Foco: estado de cada vertical, não sprints
> Actualizado por: architect-proptech em 2026-05-02
> Actualizar sempre que: uma vertical muda de estado, schema é criado/alterado, cliente é adicionado

---

## Legenda de estados

| Estado | Significado |
|--------|-------------|
| Foundation | Schema/infra a construir, sem produto |
| Active | Em desenvolvimento activo (sprints em curso) |
| Production | Em produção viva com dados reais de clientes |
| Standby | Desenvolvida mas não activa, aguarda decisão |
| Planned | Prevista no roadmap mas sem trabalho iniciado |
| Deprecated | Descontinuada |

---

## V1 — Core Hub (Horizontal)

**Estado:** Foundation
**Schema Supabase:** `core` em V1 Core Hub — `hkmvszkpxjbxmnixzqbl` (Paris eu-west-3)
**Cliente/domínio:** N/A (hub horizontal partilhado por todas as verticais)
**Schemas aplicados:** `core` + `v4_energia` + `v5_manutencao` (migration `202605010001_v5_1d_foundations.sql` aplicada 2026-05-01 + migration `v4_energia_schema_inicial` aplicada 2026-04-19)
**Tabelas core existentes:** `pessoas`, `organizations`, `memberships`, `staff_roles`, `imoveis` (com campo `tags text[]` ADR-004), `eventos_cliente`
**Última actividade:** 2026-05-02 — ADR-004 aprovado (campo `tags text[]` em `core.imoveis` com GIN index); migration Day 1 Sprint 1D aplicada (`magic_links`, `prestadores_parceiros`, `recibos_servico` em schema `v5_manutencao`)
**Próximo trabalho:** Quando V5 ou V4 precisarem de tabelas cross-vertical novas — proposta de schema `v10_owners_club` para Q3 2026; consolidar `v9_swan` quando parceria Swan for fechada
**Triggers de reactivação:** N/A (Foundation contínua — hub activo sempre que qualquer vertical está em desenvolvimento)

---

## V2 — Condomínios (Vertical)

**Estado:** Production
**Schema Supabase:** schema `public` em Supabase V2 — `eozklslwfaqujaijvdnl`
**Cliente/domínio:** `prataowners.pt` — em produção viva
**Volume de dados:** 30 tabelas, ~5.000 linhas reais
**Tabelas chave:** `condominos`, `fracoes`, `documentos` (2.733 rows), `recebimentos` (593), `extrato_bancario` (1.056), `faturas_pendentes`, `faturas_ocr`, `carregadores_contagens` (359), `documentos_drive`, `seguro_fracoes`, `utilizadores_portal` (64), `audit_log`
**Última actividade:** Estável — zero touch policy. Última intervenção: pre-2026 (setup inicial). Data exacta: desconhecida — investigar em git log se necessário
**Próximo trabalho:** V10 Copilot add-on (€15–30/mês/edifício para gestoras) — previsto Q4 2026. Migração utilizadores V2 para V1 Core Hub (V5 Fase 8)
**Triggers de reactivação:** V10 Copilot pronto para integrar (previsto Q4 2026) OU bug crítico em prataowners.pt

> ⚠️ REGRA INVIOLÁVEL: NUNCA alterar dados directamente em `eozklslwfaqujaijvdnl`. Tem dados reais de clientes. Qualquer intervenção exige plano formal aprovado e ADR.

---

## V3 — Seguros (Vertical)

**Estado:** Planned
**Schema Supabase:** `v3_seguros` — a criar em V1 Core Hub (`hkmvszkpxjbxmnixzqbl`)
**Cliente/domínio:** N/A — sem produto activo
**Última actividade:** Relatório estratégico escrito no Notion (ID: `34284147-fa60-81f2-96d0-f4f5a54b5aa6`). Data exacta: desconhecida — investigar
**Próximo trabalho:** Arranque previsto Q1 2027 (master-plan-snapshot.md). Scope inicial: análise de portfolio de seguros + sinistros
**Triggers de reactivação:** V5 atingir 50 owners pagantes (meta Q2 2026) + V4 validada (Q3 2026) — segue precedência no roadmap

---

## V4 — Energia (Vertical)

**Estado:** Foundation
**Schema Supabase:** `v4_energia` aplicado em V1 Core Hub (`hkmvszkpxjbxmnixzqbl`) — migration `v4_energia_schema_inicial` aplicada 2026-04-19
**Tabelas criadas:** `v4_energia.acordos_comercializadoras` (8 linhas seed, todas `ativa=false`) + `v4_energia.contratos_energia` (pipeline: novo → a_analisar → proposta_enviada → assinado → activo → cancelado)
**RLS aplicado:** 5 policies (public_ler_activas, staff_admin_acordos_total, auth_ler_proprios, auth_actualizar_proprios, staff_admin_contratos_total)
**Edge Function:** `v4-energia-lead` — criada em `supabase/functions/v4-energia-lead/` (index.ts + validators.ts + rate-limit.ts) mas **não deployada**
**Cliente/domínio:** N/A — sem produto activo
**Última actividade:** 2026-04-19 — migration schema aplicada + Edge Function criada (ADR-001 confirmado). Decisão Opção A fechada: simulador público → Edge Function (service_role) → INSERT contratos_energia
**Próximo trabalho:** Arranque activo previsto Q3 2026 (após validação V5). Scope v1: simulador tarifas + contratos + formulário de mudança de comercializador. Deploy Edge Function `v4-energia-lead`. Frontend React em `apps/v4-energia/`
**Decisão pendente:** P-05 — parceria operacional (EDP Comercial / Galp / outro) vs agnostic — CEO decide Q3 2026
**Triggers de reactivação:** V5 atingir gate "50 owners pagantes" (meta Q2 2026) OU Mário fechar parceria com comercializador de energia (P-05)

> Nota: warnings de performance conhecidos na migration (auth_rls_initplan, multiple_permissive_policies, function_search_path_mutable) — documentados, não críticos nesta fase.

---

## V5 — Manutenção (Vertical)

**Estado:** Active
**Schema Supabase:** `v5_manutencao` em V1 Core Hub (`hkmvszkpxjbxmnixzqbl`)
**Frontend:** `apps/v5-manutencao/` — React 18 + Vite 5, single-file `App.jsx` (>3.000 linhas)
**Cliente/domínio:** `prataowners.pt` (partilhado com V2 durante fase dev) — domínio dedicado TBD (P-03)
**Sprint activo:** Sprint 1D — Receipt Trojan Horse Alpha (2026-05-01 → 2026-05-15)
**Hipótese em teste:** "Se proporcionarmos a um owner PT proprietário 40–65 anos com 1–3 imóveis um link partilhável (magic link) para gerar recibo digital após serviço pago fora-app, então pelo menos 1 em 5 owners convidados completa o flow end-to-end."

**Tabelas Sprint 1D aplicadas (migration `202605010001_v5_1d_foundations.sql`, 2026-05-01):**
- `v5_manutencao.magic_links` — tokens temporários owner→prestador
- `v5_manutencao.prestadores_parceiros` — prestadores onboarded via magic link
- `v5_manutencao.recibos_servico` — trust ledger de trabalhos documentados (Camada 1)

**Edge Functions live:** `gerar-magic-link` + `prestador-onboarding` + RPC pública `get_magic_link_public_info` (SECURITY DEFINER + GRANT anon)

**Progresso Sprint 1D:**
| Day | Estado |
|-----|--------|
| Day 0–5.7 | ✅ Completo |
| Day 6 | Em curso — outreach aos 5 alpha owners |
| Day 7 (gate) | ⚠️ ADIADO — gate original 2026-05-04; decisão Mário 2026-05-02: R2 outreach adiado indefinidamente até infra pronta (Vercel deploy + mobile E2E). Novo prazo: **TBD** |

**Pricing actual:** Free / Home+ €6.90 / Home Pro €12.90 / Prestador Pro €14.90 (€9.90 Founding — 200 primeiros)
**MRR actual:** €0 (pré-receita, 0 clientes pagantes)
**Meta Q2 2026:** 50 owners pagantes + MRR €1k

**Próximo sprint (1E):** Camada 2 prestador-side — dashboard Jobber-style, Stripe Connect KYC PT, Moloni/InvoiceXpress, rename `recibos_servico → trabalhos_documentados`, Owners Club tab dedicada

**Blocker pre-launch (P0):** `VITE_ANTHROPIC_API_KEY` em `App.jsx` browser-side — viola ADR-004. Resolve em Sprint 1E antes de deploy production.

**Decisão pendente (P0):** Definir novo prazo para R2 alpha outreach. Trigger: quando Vercel deploy V5 alpha estiver done + mobile test E2E completo. Bloqueio actual: Sprint 1E P0 (deploy) ainda não iniciado.

**Última actividade:** 2026-05-02 — Day 5.7 SHIPPED — mixed feed lifecycle (pending + completed + expired) + realtime 2 canais + header counter dinâmico

---

## V6 — Reabilitação (Vertical)

**Estado:** Planned
**Schema Supabase:** `v6_reabilitacao` — a criar em V1 Core Hub (não iniciado)
**Cliente/domínio:** N/A — sem produto activo
**Última actividade:** Mencionada no roadmap macro. Nenhum trabalho técnico iniciado. Data: desconhecida
**Próximo trabalho:** Scoping + ADR — previsto Q1 2027 (master-plan-snapshot.md)
**Triggers de reactivação:** V5 estabilizada com >50 owners pagantes E V4 com pelo menos 1 parceiro comercializador activo. Sinalização de interesse por gestoras de imóveis em reabilitação (potencial B2B)

---

## V7 — Real Estate (Vertical)

**Estado:** Planned
**Schema Supabase:** `v7_real_estate` — a criar em V1 Core Hub (não iniciado)
**Cliente/domínio:** N/A — sem produto activo
**Última actividade:** Mencionada no naming canónico. Nenhum trabalho técnico iniciado. Data: desconhecida
**Próximo trabalho:** Scoping — não previsto em roadmap macro até 2027
**Triggers de reactivação:** V5 + V4 em produção com receita estável. Decisão CEO sobre expansão vertical pós-2027

---

## V8 — Rentals (Vertical)

**Estado:** Planned
**Schema Supabase:** `v8_rentals` — a criar em V1 Core Hub (não iniciado)
**Cliente/domínio:** N/A — sem produto activo
**Nota:** Lisbeyond (rentals PT) identificado como potencial B2B partner candidate para V8, não como concorrente (decisão 2026-05-01)
**Última actividade:** Mencionada no naming canónico. Nenhum trabalho técnico iniciado. Data: desconhecida
**Próximo trabalho:** Scoping — não previsto em roadmap macro até 2027
**Triggers de reactivação:** V5 Fase 6 (prestador app + mode switcher) entregue E V5 com >100 utilizadores activos. Possível parceria com operadores de arrendamento de curta duração

---

## V9 — BaaS / Swan (Horizontal)

**Estado:** Planned
**Schema Supabase:** `v9_swan` — a criar em V1 Core Hub (não iniciado)
**Cliente/domínio:** N/A — infraestrutura financeira horizontal
**Parceiro:** Swan BaaS — em negociação (custo TBD, risco ALTO identificado no master-plan)
**Última actividade:** Relatório estratégico escrito no Notion (ID: `34384147-fa60-810e-bd37-f3a99de9500c`). Data exacta: desconhecida — investigar
**Próximo trabalho:** Integração pagamentos nativa — previsto Q1 2027 (master-plan-snapshot.md). Pré-requisito: Stripe Connect implementado em V5 Sprint 1E (Q3 2026) para validar modelo de pagamentos antes de Swan
**Triggers de reactivação:** Stripe Connect V5 Sprint 1E validado com >10 transacções reais E parceria Swan formalizada com contrato assinado

---

## V10 — Owners Club (Horizontal)

**Estado:** Foundation
**Schema Supabase:** `v10_owners_club` — a criar em V1 Core Hub (ADR-003 proposto, aguarda confirmação Mário)
**Cliente/domínio:** N/A — horizontal de fidelidade
**Nota ADR-003:** Reorganização V10 Owners Club proposta (estado: Proposto, não Aceite) — aguarda validação Mário
**Nota decisões:** Architecture v2 V5 (2026-04-30) define Owners Club como tab dedicada no V5 — diferido de Sprint 1C para Sprint 1E. Pricing add-on: €15–30/mês/edifício para gestoras V2 (D-05 master-plan)
**Última actividade:** 2026-04-30 — decisão de architecture v2 V5 com Owners Club tab dedicada; ADR-003 proposto
**Próximo trabalho:** Owners Club tab em V5 Sprint 1E (diferido de 1C). Schema `v10_owners_club` em V1 Core Hub — Q3 2026 (master-plan-snapshot.md)
**Triggers de reactivação:** Sprint 1E início (pós 2026-05-15) para tab V5. Schema completo quando V5 atingir 50 owners pagantes e gamification for requisito real

---

## Mapa de dependências cross-vertical

```
V1 Core Hub (pessoas + imoveis + CRM)
    ├── V2 Condomínios (produção viva, independente)
    ├── V5 Manutenção (usa core.pessoas + core.imoveis + core.memberships)
    │       └── → V10 Owners Club (tab dedicada Sprint 1E)
    ├── V4 Energia (usa core.pessoas + core.imoveis — schema pronto, produto a construir)
    ├── V3 Seguros (futuro — Q1 2027)
    ├── V9 BaaS/Swan (futuro — Q1 2027 — infra pagamentos para V5 + V4)
    ├── V6 Reabilitação (futuro)
    ├── V7 Real Estate (futuro)
    └── V8 Rentals (futuro)
```

---

## Notas de manutenção

**Fontes deste documento:**
- `CLAUDE.md` (raiz) — naming canónico, Supabase IDs, stack
- `.claude/current/current-sprint-state.md` — sprint activo V5
- `.claude/current/decisions-log.md` — decisões cross-functional
- `.claude/strategy/master-plan-snapshot.md` — roadmap macro + decisões estratégicas
- `.claude/agent-memory/supabase-designer/project_v4_energia_schema.md` — schema V4 aplicado
- `apps/v5-manutencao/CLAUDE.md` — estado técnico V5

**Próxima revisão sugerida:** quando R2 outreach gate for redefinido (Vercel deploy + mobile E2E done) ou quando Sprint 1E iniciar.
