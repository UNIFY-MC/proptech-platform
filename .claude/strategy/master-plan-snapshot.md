# Master Plan — PropTech Platform (Snapshot)

> Extracto do Notion Master Plan · Última sincronização: 2026-04-30
> Fonte canónica: https://app.notion.com/p/34c84147fa6081308a95d642b04b7798
> **NÃO EDITAR AQUI** — editar no Notion, depois sincronizar este ficheiro

---

## Sumário Executivo

Plataforma horizontal multi-vertical PropTech em Portugal. Solo founder Mário Carvalho (TOC — contabilista certificado). Modelo: Core Hub partilhado (pessoas + imóveis + CRM) + verticais independentes vendáveis por vertical.

**Princípio fundador:** "O Core (pessoas + imóveis + CRM) é o activo que nunca se vende. As verticais são produtos. O Core é a empresa."

**Estado actual:** V5 Manutenção em desenvolvimento activo (Sprint 1B). V2 Condomínios em produção viva em prataowners.pt (~5.000 linhas dados reais). V4 Energia próxima a iniciar.

**Modelo de monetização:** Subscrições proprietários (B2C) + comissão em serviços (marketplace) + licenças verticais a gestoras (B2B). Receita recorrente > one-time desde o início.

---

## Decisões Estratégicas Tomadas (12 + decisões arquitecturais)

### Decisões de Negócio

| # | Decisão | Data | Racional |
|---|---|---|---|
| D-01 | **Core é horizontal, vendido por vertical** — não construir monólito | 2025 | Vendável separadamente, composable, anti-lock-in |
| D-02 | **V2 INTOCÁVEL** — prataowners.pt não tem downtime | permanente | 5.000 linhas dados reais de clientes |
| D-03 | **Pricing V5**: Free / Home+ €6.90 / Home Pro €12.90 / 10% spending → crédito | 2026-Q1 | Hormozi: paga-se pelo resultado, não pelo acesso |
| D-04 | **Prestador Pro**: €14.90/mês (€9.90 Founding — 200 primeiros) | 2026-Q1 | Scarcity genuína + lock-in de rede |
| D-05 | **V10 Copilot add-on**: €15-30/mês/edifício para gestoras V2 | 2026-Q1 | Upsell natural, não produto separado |
| D-06 | **Founding Members programs**: primeiros 100 owners + 200 prestadores com pricing garantido forever | 2026-Q1 | Hormozi: scarcity + reciprocidade |
| D-07 | **Receipt Trojan Horse**: owner envia recibo → prestador onboarding 3 min → factura via app | 2026-03 | Demand-pulls-supply, zero CAC em prestadores |
| D-08 | **Posicionamento V5 (hipótese)**: "A tua casa, sob controlo" — owner-pragmatic, não identity-first | 2026-04 | Owner PT 40-65 não responde a identity; responde a controlo e poupança |
| D-09 | **Architecture v2 V5**: Casa = Início+Casa fundidos, Owners Club tab dedicada | 2026-04-30 | Eliminar duplicação, simplificar UX |
| D-10 | **Smart Inbox sem forçar login**: email + WhatsApp + portal + magic link + QR | 2026 | Prestadores informais não instalam apps; onboarding frictionless |
| D-11 | **Solo founder até validação**: não contratar antes de 50 owners pagantes + MRR €1k | 2026-Q2 | Runway preservation; CAC antes de headcount |
| D-12 | **ICP V5 Owner**: proprietário PT, 40-65 anos, 1-3 imóveis, usa GCal, cansado de papel | 2026-04 | Entrevistas + inferência demográfica prataowners.pt |

### Decisões Arquitecturais (ADRs)

| ADR | Título | Decisão Core |
|---|---|---|
| ADR-001 | Multi-tenant Core Hub | organizations + memberships desde dia 1 |
| ADR-002 | Auth canónico | Supabase Auth único source of truth; no custom JWT |
| ADR-003 | V10 Owners Club schema próprio | schema `v10_owners_club`, renaming `core` (não `public`) |
| ADR-004 | Agents server-side only | Anthropic API calls em Edge Functions, nunca no browser |
| ADR-005 | React monolítico por vertical | App.jsx single-file por vertical (legibilidade > modularidade prematura) |

### Decisões NOVAS (sessão 2026-04-30)

| # | Decisão | Data | Racional |
|---|---|---|---|
| 19 | **Brain cost discipline**: cap €100/mês até 1º pagante, alerta automático aos €80 | 2026-04-30 | Runway preservation; agents escalam custo se não disciplinados |
| 20 | **Receipt Trojan Horse: build directo + alpha test amigos** (5 owners convidados) em vez de smoke test pre-build | 2026-04-30 | Demand-pulls-supply é core insight; build é validation real — alta convicção estratégica |
| 21 | ~~Sprint A commit em feat/1b5a-foundations-analysis~~ **SUPERSEDED por #22** | 2026-04-30 | Branch foi merged antes desta decisão; trabalho commit directo em main |
| 22 | **Sprint A commit directo em main** (branch `feat/1b5a-foundations-analysis` estava merged via `f9fea5c`) | 2026-04-30 | Diagnostic Claude Code descobriu branch fechada; commits atómicos = melhor git hygiene |
| 23 | **Atomic commits**: Sprint A (`.claude/`) e 1B.5A Phase 2 (SQLs Supabase) commits separados, mesmo sendo na mesma sessão | 2026-04-30 | Concerns diferentes (agents infra vs database schema); revert independente possível |
| 24 | **Competitive monitoring** com 4-tier structure: Tier 1 weekly (5 critical), Tier 2 bi-weekly (5 direct + 2 inspirations), Tier 3 monthly deep-dive (5 inspirations rotativas), Tier 4 quarterly mention-only (8) | 2026-05-01 | CMO v3 spec output após context expansion (Notion analysis); FIXO escalated CRÍTICO devido Fidelidade backing |
| 25 | **Live Dashboard HTML via GitHub Pages** + 2 gstack-style files (qa-flow + review-pr). Skip gstack inteiro install. | 2026-05-01 | Mário pediu dashboard concentrado; gstack adoption durante Sprint 1D = scope creep risk; rouba 20% que dá 80% valor |

---

## Roadmap Macro — 12 Meses (Maio 2026 → Abril 2027)

### Q2 2026 (Maio–Junho) — Validação V5

| Sprint | Âmbito | Estado |
|---|---|---|
| 1B.4 | Weather Open-Meteo (Fase 2A+2B) | ✅ COMPLETO |
| 1B.5A | Foundations schema + CLAUDE.md hierarchy | ✅ COMPLETO |
| 1C | Architecture v2 (Casa=Início+Casa, Owners Club tab) | ⏳ PRÓXIMO |
| 1D | Receipt Trojan Horse MVP | ⏳ PLANEADO |
| — | 50 owners pagantes + validação willingness-to-pay | META Q2 |

### Q3 2026 (Julho–Setembro) — Escala V5 + Arranque V4

| Fase | Âmbito |
|---|---|
| V5 Fase 4 | Backoffice staff panel |
| V5 Fase 5 | IA features reais (poupanças, Home Intelligence score) |
| V4 Energia | Arranque (simulador tarifas + contratos + mudança comercializador) |
| V10 Copilot | Schema multi-tenant Core aplicado |

### Q4 2026 (Outubro–Dezembro) — Prestadores + Mobile

| Fase | Âmbito |
|---|---|
| V5 Fase 6 | Prestador app + mode switcher Uber-style |
| V5 Fase 7 | Mobile Capacitor (iOS + Android) |
| V5 Fase 8 | Migração utilizadores V2 reais |
| V2 Copilot | Integração V10 Copilot em prataowners.pt |

### Q1 2027 (Janeiro–Março) — Expansão Vertical

| Vertical | Âmbito |
|---|---|
| V3 Seguros | Arranque (análise + portfolio + sinistros) |
| V6 Reabilitação | Scoping + ADR |
| V9 BaaS Swan | Integração pagamentos nativa |

---

## Streams de Receita (Projectadas)

### V5 Manutenção

| Stream | Modelo | Target Q4 2026 |
|---|---|---|
| Owner subscrições | SaaS: €0/€6.90/€12.90/mês | €5k MRR |
| Prestador Pro | SaaS: €14.90/mês (€9.90 Founding) | €2k MRR |
| Comissão serviços | Marketplace: 10-15% GMV | €3k MRR |
| **Total V5** | | **€10k MRR** |

### V2 Condomínios (Copilot add-on)

| Stream | Modelo | Target Q4 2026 |
|---|---|---|
| V10 Copilot | SaaS: €15-30/mês/edifício | €2k MRR |

### Unit Economics Target (Q2 2026)

| Métrica | Target |
|---|---|
| CAC Owner | <€30 |
| CAC Prestador | <€50 (via Receipt Trojan Horse → zero) |
| LTV Owner | >€200 (24 meses × €8.40 ARPU) |
| LTV/CAC | >6x |
| Payback period | <4 meses |

---

## Estado Actual (2026-04-30)

### V5 Manutenção — Sprint 1B

**Concluído:**
- Auth completa (Supabase + onboarding wizard 5 steps)
- RLS em 62 tabelas (core + v5_manutencao)
- Catálogo 199 serviços + combos + subscrições
- Agents infra (Onda 1B): image_inspector + casa_advisor
- Weather integration Open-Meteo (Modo A geo + Modo B casa)
- SMTP Resend configurado (prataowners.pt)
- GDPR anonimização implementada

**Em curso:**
- 1B.5A Foundations Phase 2 (schema migration)

**Bloqueadores:**
- Nenhum crítico
- "Todos os imóveis" bug weather (Modo A no modo global) — deferred Sprint 1C

### V2 Condomínios — Produção

- URL: prataowners.pt
- Supabase: `eozklslwfaqujaijvdnl`
- 30 tabelas, ~5.000 linhas dados reais
- Status: ESTÁVEL — zero touch policy

### V4 Energia — Pré-arranque

- Relatório estratégico completo (Notion)
- Decisão: arrancar Q3 2026 após validação V5
- Scope v1: simulador tarifas + contratos + formulário mudança comercializador

---

## Cost discipline (decisão sessão 2026-04-30)

- **Anthropic API cap mensal:** €100/mês até 1º owner pagante
- **Alerta automático:** aos €80/mês
- **Quando reavaliar:** após 50 owners pagantes ou 6 meses (o que vier primeiro)
- **Brain budget breakdown:**
  - 7 C-suite agents (manual ad-hoc): ~€10/mês
  - 6 watcher agents (scheduled, Sprint B): ~€5/mês
  - **Total estimado: €15/mês**

---

## Competitive landscape (referência rápida)

> Fonte completa: `.claude/strategy/competitive-references-context.md`
> Notion: `https://www.notion.so/34c84147fa60817ba602c03201873e31`
> Monitor spec: `.claude/strategy/competitor-monitor-spec.md` (v3)

### Bucket A — Direct Competitors

| Entidade | Threat | Nota |
|---|---|---|
| **FIXO** | CRÍTICO | B2C PT on-demand, Fidelidade-owned. Capital + base clientes seguros + bundling potential = ameaça existencial PT |
| **Jobber** | CRÍTICO | SaaS SMB EU-funded, expansão EU activa — ameaça supply side |
| OSCAR | ALTO (PT/ES) | Benchmark de clareza operacional; standard de pricing WTP |
| ServiceTitan | ALTO long-term | Define envelope de features; telegrafeia roadmap de players menores |
| Fixando | ALTO local | Único player PT com tráfego real hoje |
| **Hubbent** | ALTO (entrante recente PT) | Dual-app (cliente + Pro) marketplace home services. Identificado 2026-05-01. Funding/tracção desconhecidos — investigation backlog Tier 1 W18 |
| Samba | MÉDIO (US) | Não Europa ainda; tracking de ICP language pivot (identity vs outcome) |
| Housecall Pro | MÉDIO long-term | US; funding + EU HQ = janela 6 meses |
| TaskRabbit | MÉDIO (PT activo) | IKEA scope actual; escalation trigger: non-IKEA PT partnership |
| ZasFácil | MÉDIO (ES) | Home services ES; expansão ibérica possível |
| Timpla | MÉDIO local | PT, orçamentos online |

### Bucket B — Inspirations (feature mining ofensivo)

AppFolio Realm-X · Shipshape.ai · InstaService · pinto-app · MRI PMX · HomeTend · Hippo Insurance

Features já adoptadas: Home Health Score (Shipshape), RFQ 4 passos (InstaService), gamification streak (pinto-app), meteorologia trigger (HomeTend).

### Bucket C — Long-range watch (quarterly only)

Buildium · Yardi · Property Meld · Opendoor · Rocket Homes · Betterview · BH HomeServices PT · Fixa Aí (BR)

### Out of scope

Lisbeyond — rentals scope diferente (future B2B partner candidate V8)

### Gaps competitivos (oportunidade)

1. Única plataforma B2B condomínio (V2) + B2C individual (V5)
2. Agentic AI em ptPT (todos os players em inglês)
3. Integração Moloni/InvoiceXpress nativa
4. IPMA como data source meteorologia (vantagem local)
5. Câmaras Municipais sync (licenças, RGEU)

---

## Próximas Decisões Pendentes (CEO decide)

| # | Decisão | Prazo | Info necessária |
|---|---|---|---|
| P-01 | Pricing test: €9.90 vs €12.90 vs €19.90 owner | Q2 2026 | Willingness-to-pay interviews (5+ owners) |
| P-02 | Canal aquisição principal: Meta vs Google vs Orgânico vs Referral | Q2 2026 | CAC estimado por canal + budget disponível |
| P-03 | V5 domain dedicated: v5casa.pt ou manter prataowners.pt umbrella | Q2 2026 | Brand clarity decision + SMTP impact |
| P-04 | Capacitor (mobile) — timing: Q4 2026 ou aguardar 100 usuarios activos | Q3 2026 | DAU/MAU ratio + user requests |
| P-05 | V4 Energia: parceria operacional (EDP Comercial / Galp / outro) vs agnostic | Q3 2026 | Relatório estratégico V4 Notion |

---

## Vendors Críticos

| Vendor | Serviço | Custo Mensal | Risco |
|---|---|---|---|
| Supabase | DB + Auth + Storage + Edge Functions | ~€25 (Pro plan) | MÉDIO — vendor lock-in mitigado por SQL standard |
| Netlify | Deploy + CDN | €0 (free tier) | BAIXO |
| Resend | SMTP transacional | €0 (free tier até 3k/mês) | BAIXO |
| Open-Meteo | Weather API | €0 (open source) | BAIXO — sem SLA |
| BigDataCloud | Reverse geocoding | €0 (free tier) | BAIXO |
| Anthropic | Claude API (agents) | ~€5-20 (uso actual) | MÉDIO — custo escala com uso |
| Swan | BaaS pagamentos (V9) | TBD | ALTO — em negociação |

**Budget target:** <€100/mês total (V5 only) até MRR €1k.
