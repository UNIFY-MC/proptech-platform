# Competitor Monitor — Watcher Agent Spec

> Version: 3.0
> Author: CMO Agent + Mário (respostas Q1-Q5)
> Date: 2026-05-01
> Replaces: v2.0 (2026-04-30)
> Output dir: `.claude/outputs/competitor-watches/`
> Model: claude-sonnet (Sonnet)
> Source context: `.claude/strategy/competitive-references-context.md` (18+ entities, 3 buckets)

---

## Changelog v2 → v3

- **FIXO** promovido de "?" standby para **Tier 1 weekly** — CRÍTICO (Fidelidade-backed, B2C PT on-demand)
- **TaskRabbit** adicionado a **Tier 2A bi-weekly** — MÉDIO com escalation trigger "non-IKEA PT partnership"
- **Lisbeyond** removido de monitoring completamente — rentals scope diferente; reclassificado como future B2B partner candidate (ver secção "Out of scope")
- **ZasFácil** confirmado Tier 2A com URL `zasfacil.com` (watcher valida na 1ª run)
- **AppFolio + Shipshape** confirmados em Tier 2B bi-weekly (Mário aprovou proposta CMO)
- **Fixa Aí** mantido Tier 4 (Brasil only confirmado)
- Tier 1 passa de 4 para **5 entidades**
- Tier 2A passa de 4 para **5 entidades**
- Open Questions secção 7: todas resolvidas → substituída por "Entidades resolvidas"
- Cost estimate actualizado para 5 entidades Tier 1

---

## 1. Competitors Monitor List (Tiered)

### Tier 1 — Weekly (every Monday run)

5 entities. All from Bucket A with threat level ALTO or CRÍTICO.

| # | Competitor | Bucket A Threat | Why Tier 1 |
|---|---|---|---|
| 1 | **OSCAR** | ALTO (PT/ES) | Benchmark de clareza operacional ("home services in 30 min"). Qualquer mudança de pricing ou posicionamento é sinal directo de willingness-to-pay no nosso ICP. Operam em ES — mercado adjacente a PT. |
| 2 | **Jobber** | CRÍTICO | SaaS SMB EU-funded, activamente a expandir em EU. Se abrirem PT ou ES, CAC do lado prestador aumenta imediatamente. Ameaça mais urgente ao supply-side. |
| 3 | **ServiceTitan** | ALTO long-term | Define o tecto de features e o chão de pricing no enterprise field service. O roadmap deles telegrafeia o que Jobber e Housecall Pro vão lançar em 12-18 meses. |
| 4 | **Fixando** | ALTO local | Player PT activo, comparador de orçamentos. Se adicionarem subscrição ou produto owner-facing, sobreposição directa. Único player PT com tráfego real hoje. |
| 5 | **FIXO** | CRÍTICO | B2C on-demand home services PT. Owned by Fidelidade (#1 seguradora PT). Preços fixos upfront — modelo mais próximo do nosso do que Fixando. Capital ilimitado + base clientes seguros + bundling potential (seguro+serviço) é a combinação mais perigosa no mercado PT. |

Rationale Tier 1: OSCAR é o benchmark de posicionamento. Jobber é a ameaça EU mais imediata ao lado prestador. ServiceTitan define o envelope de features a 18 meses. Fixando é o único player PT com tráfego real hoje. FIXO é a ameaça existencial PT — Fidelidade tem capital, distribuição e cross-sell que nenhum startup pode replicar. Os 5 cobrem: (1) PT local duplo (Fixando + FIXO), (2) EU expansion risk (Jobber), (3) feature roadmap benchmarking (ServiceTitan), (4) pricing WTP benchmark (OSCAR).

Samba descido de Tier 1 para Tier 2: operam em US (Boston), não Europa; threat level MÉDIO. Continua monitorizado bi-weekly para tracking de ICP language pivot.

---

### Tier 2 — Bi-weekly (semanas 1 e 3 de cada mês)

5 entidades Bucket A (threat MÉDIO) + 2 Bucket B (inspiração ofensiva).

#### Tier 2A — Bucket A (defensive, threat MÉDIO)

| # | Competitor | Threat | Why Tier 2 |
|---|---|---|---|
| 6 | **Samba** | MÉDIO (US, não Europa) | PT market awareness, identity-first positioning. Monitorizar ICP language pivot — se H1 mudar de identity para outcome, é Priority A. |
| 7 | **Housecall Pro** | MÉDIO long-term | US SMB; não está em PT. Um funding round + EU HQ = janela de 6 meses. |
| 8 | **ZasFácil** | MÉDIO (vizinho PT) | Home services ES. Mercado adjacente a PT — qualquer expansão ibérica é sinal relevante. URL a confirmar na 1ª run. |
| 9 | **Timpla** | MÉDIO local | PT, orçamentos online. Threat directo no mesmo segmento que Fixando mas menor tráfego. |
| 10 | **TaskRabbit** | MÉDIO (IKEA, PT activo) | Operação PT activa desde 2017 (IKEA Ingka Group). 8858 reviews PT Trustpilot (4 estrelas). Actualmente scope = IKEA assembly + handyman. Fev 2025: expansão Partner API a retailers diversos. **ESCALATION TRIGGER**: se "non-IKEA PT retail partnership announced" → escalate para Tier 1 imediato. |

#### Tier 2B — Bucket B (offensive, feature mining)

| # | Competitor | O que extraímos | Why Tier 2 |
|---|---|---|---|
| 11 | **AppFolio (Realm-X)** | Agentic AI dispatcher (V5 Matchmaker + V10 Dispatcher), Auditing Center | Roadmap mais sofisticado do mercado para property mgmt AI. |
| 12 | **Shipshape.ai** | Home Health Score (já adoptado V5), AlertActions humano, SAM mascot | B2C homeowner focus — ICP mais próximo do nosso owner side. |

---

### Tier 3 — Monthly deep-dive (1 player rotativo por mês)

1 entidade do Bucket B por mês, em rotação. Análise mais profunda (5+ sources, changelog, App Store reviews). Produz relatório standalone.

Rotação sugerida (6 meses):

| Mês | Player | Ângulo principal |
|---|---|---|
| Mai 2026 | **InstaService** | RFQ flow, signup bonus model — comparar com Receipt Trojan Horse |
| Jun 2026 | **pinto-app** | Gamification streaks/points — extrair para V5 loyalty layer |
| Jul 2026 | **MRI PMX (Ask Agora)** | Natural language queries, Page Assistant — V5 AI query interface |
| Ago 2026 | **HomeTend** | IA + meteorologia trigger — validar vs nossa implementação Open-Meteo |
| Set 2026 | **Hippo Insurance** | Score-based discount cross-sell — benchmark para V5↔V3 Seguros |
| Out 2026 | **AppFolio (Realm-X)** | Deep-dive anual — feature delta vs Maio |

Output: `.claude/outputs/competitor-watches/deep-dive-YYYY-MM-<player>.md`

---

### Tier 4 — Quarterly mention-only (sem scraping activo)

Bucket C. Sem runs dedicados. Mencionados apenas no Q-summary se houver major news.

Entidades: Buildium · Yardi · Property Meld · Opendoor Services · Rocket Homes · Betterview · Berkshire Hathaway HomeServices PT · Fixa Aí (BR only — confirmar sem expansão ibérica) · ZasFácil (Tier 4 fallback se URL inválido ou sem presença digital)

Critério de major news: funding >$10M, aquisição, lançamento em PT ou ES, pivot de modelo.

---

### Out of scope (não monitorizar)

| Entidade | Razão | Nota futura |
|---|---|---|
| **Lisbeyond** | Scope rentals (Airbnb/short-stay) — diferente do V5 owner maintenance | Future B2B partner candidate para V8 Imobiliário ou partnership rental managers |

---

## 2. Signals — Diferenciados por Bucket

### Bucket A — Signals defensivos (Tier 1 + Tier 2A)

| Signal | Prioridade | O que observar |
|---|---|---|
| **Pricing change** | Priority A | Qualquer mudança em pricing page — novo tier, aumento/descida, remoção de free plan |
| **PT/ES market entry** | Priority A | Novo domínio .pt/.es, site em português, cobertura de imprensa PT, hiring PT |
| **Funding round** | Priority A | Series A+ para Tier 1; qualquer ronda para Samba ou players PT |
| **M&A envolvendo player PT** | Priority A | Aquisição de Fixando, FIXO, Timpla, ou qualquer player PT home services |
| **Receipt/demand-pull feature** | Priority A | Qualquer competitor a lançar owner-initiated onboarding de prestador — moat em risco |
| **Samba ICP pivot** | Priority A | H1 muda de identity ("o teu lar") para outcome framing — valida/invalida hipótese V5 |
| **TaskRabbit non-IKEA PT partnership** | Priority A | Escalation trigger → promover para Tier 1 imediatamente |
| **FIXO bundling seguro+serviço** | Priority A | Fidelidade lança pacote integrado seguro + manutenção — core threat ao nosso modelo |
| **New feature announcement** | Priority B | Blog posts, changelog, Product Hunt launches |
| **Key hiring PT/ES** | Priority B | Country Manager PT, Head of Growth PT/ES, VP Europe |
| **Partnership announcement** | Priority B | Utilities, seguros, property management groups |
| **Positioning shift** | Priority B | Homepage H1/tagline change — indica ICP pivot |
| **App store rating shift** | Priority B | ±0.3 estrelas ou 50+ reviews novas numa semana |
| **Social/PR sem contexto estratégico** | Priority C | Regista mas sem acção |

### Bucket B — Signals ofensivos (Tier 2B + Tier 3)

| Signal | Prioridade | O que extraímos |
|---|---|---|
| **Novo feature announcement** | Priority A | Changelog, blog, App Store release notes — copiar ângulo de UX se aplicável a V5 |
| **Roadmap teaser** | Priority A | Conference talks, CEO tweets, beta invites — telegrafeia o que precisamos de ter antes |
| **User reviews que pedem features** | Priority B | App Store / Play Store 1-3 estrelas — pain points que podemos resolver melhor |
| **Pricing model change** | Priority B | Mudança de freemium → paid ou nova tier — benchmark para nossa decisão de pricing |
| **Partnership com provider de dados** | Priority B | Integrações com APIs que podemos também integrar (ex: IPMA, catálogos municipais) |

### Bucket C — Awareness-only (Tier 4, quarterly)

| Signal | Threshold para menção |
|---|---|
| Funding | >$10M ou Strategic (ex: IKEA, Santander) |
| Acquisition | Qualquer — se envolve player PT/ES prioritário |
| Market entry PT/ES | Qualquer evidência |
| Pivot de modelo | Saída de B2B para B2C ou vice-versa |

---

## 3. Sources Per Competitor

Regra: todas as sources devem ser scrapeable sem auth complexa. LinkedIn public pages: só post titles e job count visible sem login. Crunchbase: flaggar se throttled (fallback = Google News "[competitor] funding"). Páginas SPA sem SSR: flaggar como "fetch-degraded" se HTML vazio.

### Tier 1 sources

#### OSCAR

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.oscar.co.uk` | Pricing, positioning H1 | Nenhuma |
| Pricing page | `https://www.oscar.co.uk/pricing` | Pricing changes | Nenhuma |
| Blog | `https://www.oscar.co.uk/blog` | Feature announcements | Nenhuma |
| Press room | `https://www.oscar.co.uk/press` | Funding, expansion | Nenhuma |
| Crunchbase | `https://www.crunchbase.com/organization/oscar-home` | Funding, M&A | Nenhuma (public) — throttle possível |

Note: verificar se há subsite ES ou PT na 1ª run.

#### Jobber

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://getjobber.com` | Positioning, target market | Nenhuma |
| Pricing | `https://getjobber.com/pricing` | Pricing tiers (SMB benchmark) | Nenhuma |
| Blog | `https://getjobber.com/blog` | Feature releases | Nenhuma |
| Changelog | `https://getjobber.com/changelog` | Feature cadência | Nenhuma (verificar se existe) |
| Crunchbase | `https://www.crunchbase.com/organization/jobber` | Funding, EU expansion | Nenhuma (public) |

#### ServiceTitan

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.servicetitan.com` | Positioning, enterprise vs SMB shift | Nenhuma |
| Pricing | `https://www.servicetitan.com/pricing` | SMB pricing floor benchmark | Nenhuma |
| Blog | `https://www.servicetitan.com/blog` | Feature announcements | Nenhuma |
| Press room | `https://www.servicetitan.com/news` | EU expansion, M&A | Nenhuma |
| Crunchbase | `https://www.crunchbase.com/organization/servicetitan` | Funding, M&A | Nenhuma (public) |

#### Fixando

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.fixando.pt` | Model change (lead gen vs subscription) | Nenhuma |
| Blog | `https://www.fixando.pt/blog` | Product announcements | Nenhuma |
| Imprensa PT | Google News: `"Fixando" site:dn.pt OR site:jn.pt OR site:publico.pt` | Funding, partnerships | Nenhuma |

#### FIXO

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.fixo.pt` | Serviços, pricing fixo, ICP language | Nenhuma |
| App Store | Search "FIXO Fidelidade" — Apple App Store web | Rating, reviews, novas categorias | Nenhuma |
| Google Play | Search "FIXO serviços casa" | Rating, reviews | Nenhuma |
| Fidelidade press | `https://www.fidelidade.pt/PT/sobre-fidelidade/sala-imprensa` | Bundling anúncios, integração FIXO+seguro | Nenhuma |
| Imprensa PT | Google News: `"FIXO" "Fidelidade" casa OR serviços` | Funding adicional, novos serviços, expansão | Nenhuma |

Note estratégica FIXO: monitorizar especificamente qualquer anúncio de bundling seguro+serviço. Se Fidelidade lançar "seguro casa inclui manutenção preventiva grátis via FIXO", é alerta Priority A imediato — core business model threat.

---

### Tier 2A sources (bi-weekly)

#### Samba

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.samba.pt` | ICP language (H1 verbatim) | Nenhuma |
| App Store | Search "Samba Portugal" via App Store web | Rating, reviews | Nenhuma |
| Crunchbase | `https://www.crunchbase.com/organization/samba-pt` | Funding | Nenhuma (public) |
| LinkedIn (public) | `https://www.linkedin.com/company/samba-pt` | Job postings count, announcements | Auth-limited — só público visível |

Nota crítica: sempre quote H1 verbatim. Se H1 muda de identity-first ("o teu lar", "a tua comunidade") para outcome-first ("serviços em 30 min", "casa resolvida"), emite Priority A imediato.

#### Housecall Pro

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.housecallpro.com` | EU expansion signals | Nenhuma |
| Blog | `https://www.housecallpro.com/blog` | Feature / market news | Nenhuma |
| Crunchbase | `https://www.crunchbase.com/organization/housecall-pro` | Funding | Nenhuma (public) |

#### ZasFácil

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.zasfacil.com` | Serviços, pricing, expansão | Nenhuma (confirmar URL na 1ª run — tentar também zasfacil.es) |
| Imprensa ES | Google News: `"ZasFácil" funding OR expansion OR Portugal` | Funding, PT entry | Nenhuma |

Note: se ambos os URLs falharem, descer para Tier 4 e reportar no output.

#### Timpla

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.timpla.pt` | Model, pricing | Nenhuma |
| Blog / press | Verificar se existe blog | Product announcements | Nenhuma |

#### TaskRabbit

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage PT | `https://www.taskrabbit.pt` | Scope, categorias, non-IKEA expansion | Nenhuma |
| Blog | `https://www.taskrabbit.com/blog` | Partner API announcements, expansão | Nenhuma |
| Trustpilot PT | `https://www.trustpilot.com/review/taskrabbit.pt` | Volume reviews, categorias mencionadas | Nenhuma |
| Imprensa | Google News: `"TaskRabbit" Portugal OR Portugal OR "non-IKEA" OR "retail partner"` | Escalation trigger signals | Nenhuma |

**ESCALATION TRIGGER**: se qualquer source mencionar TaskRabbit PT a aceitar pedidos fora do contexto IKEA (non-IKEA retailer, handyman geral, etc.) → Priority A imediato → promover para Tier 1 semana seguinte.

---

### Tier 2B sources (bi-weekly, feature mining)

#### AppFolio (Realm-X)

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Blog | `https://www.appfolio.com/blog` | AI feature announcements | Nenhuma |
| Press | `https://www.appfolio.com/press` | Roadmap, partnerships | Nenhuma |
| Product changelog | Verificar se existe página pública | Feature cadência | Nenhuma |

#### Shipshape.ai

| Source | URL | Signal type | Auth needed |
|---|---|---|---|
| Homepage | `https://www.shipshape.ai` | Home Health Score changes, new features | Nenhuma |
| Blog | `https://www.shipshape.ai/blog` | Feature announcements | Nenhuma |
| App Store | Search "Shipshape home" | Reviews, rating, feature requests | Nenhuma |

---

## 4. Output Format

### 4.1 Weekly Digest (Tier 1 detalhe + Tier 2 highlights)

Ficheiro: `.claude/outputs/competitor-watches/YYYY-MM-DD.md`

```markdown
# Competitor Watch — YYYY-MM-DD

**Run by:** competitor-monitor watcher
**Covers:** semana de YYYY-MM-DD a YYYY-MM-DD
**Cadência desta run:** [WEEKLY ONLY / WEEKLY + BI-WEEKLY]
**Tier 1 checked:** OSCAR · Jobber · ServiceTitan · Fixando · FIXO
**Tier 2 checked:** [Samba · Housecall Pro · ZasFácil · Timpla · TaskRabbit · AppFolio · Shipshape / SKIPPED — bi-weekly não activa esta semana]

---

## Tier 1 — Detail

### OSCAR
**Status:** NO CHANGE | CHANGED | ALERT
**Homepage H1:** "[quote verbatim]"
**Pricing:** [last known + any delta]
**Changes detected:** [descrição ou "none"]
**Sources checked:** [URLs]

### Jobber
**Status:** NO CHANGE | CHANGED | ALERT
**EU expansion signals:** none | weak | strong
**Pricing change:** none | [descrição]
**Changes detected:** [descrição ou "none"]
**Sources checked:** [URLs]

### ServiceTitan
**Status:** NO CHANGE | CHANGED | ALERT
**Changes detected:** [descrição ou "none"]
**Sources checked:** [URLs]

### Fixando
**Status:** NO CHANGE | CHANGED | ALERT
**Model change signal:** none | [descrição]
**Changes detected:** [descrição ou "none"]
**Sources checked:** [URLs]

### FIXO
**Status:** NO CHANGE | CHANGED | ALERT
**Bundling signal (seguro+serviço):** none | weak | ALERT
**New categories detected:** none | [descrição]
**Changes detected:** [descrição ou "none"]
**Sources checked:** [URLs]

---

## Tier 2 — Highlights (bi-weekly runs only)

### Samba
**Status:** NO CHANGE | CHANGED | ALERT
**Homepage H1 verbatim:** "[quote]"
**ICP language:** identity-first | outcome-first | mixed
**Changes detected:** [descrição ou "none"]

### Housecall Pro
**Status:** NO CHANGE | CHANGED | ALERT
**Changes detected:** [descrição ou "none"]

### ZasFácil
**Status:** NO CHANGE | CHANGED | ALERT
**Changes detected:** [descrição ou "none"]

### Timpla
**Status:** NO CHANGE | CHANGED | ALERT
**Changes detected:** [descrição ou "none"]

### TaskRabbit
**Status:** NO CHANGE | CHANGED | ALERT
**Scope:** IKEA-only | non-IKEA signals detected
**ESCALATION TRIGGER:** not fired | FIRED — [descrição]
**Changes detected:** [descrição ou "none"]

### AppFolio (Realm-X) — Feature Mining
**New features extractable for V5/V10:** [list ou "none"]
**Changes detected:** [descrição]

### Shipshape.ai — Feature Mining
**New features extractable for V5:** [list ou "none"]
**App Store pain points (1-3 stars):** [themes ou "none"]
**Changes detected:** [descrição]

---

## Top 3 Strategic Implications

1. [Implicação em outcome language]
2. [Implicação 2]
3. [Implicação 3]

---

## Recommended CMO Actions

| Priority | Action | Deadline | Owner |
|---|---|---|---|
| HIGH | [specific action] | [date] | CMO |
| MEDIUM | [specific action] | [date] | CMO/CEO |
| LOW | monitor / no action | — | — |

---

## Sources degraded this run

| Competitor | Source | Issue |
|---|---|---|
| [nome] | [URL] | auth-blocked / SPA-empty / throttled / 404 |

---

## Raw Notes

[Observações adicionais. Feature mining detalhado para Bucket B.]
```

### 4.2 Monthly Deep-dive (Tier 3)

Ficheiro: `.claude/outputs/competitor-watches/deep-dive-YYYY-MM-<player>.md`

Estrutura: 5-10 sections. Cobre — business model, pricing, features actuais, roadmap sinais, user pain points (App Store 1-3 stars), gap analysis vs V5, 3 extractable actions.

### 4.3 Quarterly Summary

Ficheiro: `.claude/outputs/competitor-watches/quarterly-YYYY-QN.md`

Inclui: estado do mercado PT/ES, Tier 4 major news only, trend summary (pricing pressure, EU expansion pace, AI feature arms race), 3 strategic adjustments recomendadas ao CEO.

---

## 5. Rules for Watcher

- **NO CHANGE** = zero diferença detectável vs run anterior.
- **CHANGED** = diferença não urgente (novo blog post, minor copy update).
- **ALERT** = Priority A signal — emite também notificação imediata (ver secção 6).
- Sempre quote H1 verbatim para Samba (tracking de ICP language).
- Implicações estratégicas em outcome language, nunca feature language.
  - Mau: "Jobber adicionou invoicing". Bom: "Jobber invoicing EU reduz pricing power do nosso prestador-side — pre-empt com Founding Member lock-in push."
- Bucket B: implicações em feature language É correcto — objetivo é extracção, não defesa.
  - "AppFolio lançou Auditing Center — extrair para V5 casa_report module Q3 2026."
- Se >50% dos fetches falharem: reportar como `DEGRADED`, não como "no change".
- Se source é auth-blocked: marcar como `[AUTH-BLOCKED]`, não tentar login.
- Bi-weekly gate: activar Tier 2 se run é semana 1 (dias 1-7) ou semana 3 (dias 15-21).
- **FIXO bundling watch**: se Fidelidade press ou Google News mencionar "seguro + serviço" ou "manutenção preventiva" → Priority A imediato.
- **TaskRabbit escalation**: se qualquer source indica non-IKEA partnership PT → Priority A imediato + flag para Tier 1 na semana seguinte.

---

## 6. Alerting Thresholds

### Immediate alert (não esperar segunda-feira seguinte)

| Trigger | Threshold | Urgência |
|---|---|---|
| Funding round | Series A+ para OSCAR, Jobber, Housecall Pro, Samba | Janela 6-12 meses antes de acelerarem PT/EU acquisition |
| PT market entry | Qualquer evidência (domínio, imprensa, hiring PT) | CAC aumenta imediatamente |
| Receipt/demand-pull feature | Qualquer competitor a lançar owner-initiated prestador onboarding | Moat em risco |
| Samba positioning pivot | H1 muda de identity para outcome framing | Valida/invalida hipótese V5 |
| Pricing undercut PT | Free ou <€5/mês owner plan em PT | Ameaça credibilidade de preços Founding Member |
| M&A PT player | Aquisição de Fixando, FIXO, Timpla, ou qualquer player home services PT | Consolidação comprime janela de lançamento |
| FIXO bundling seguro+serviço | Qualquer anúncio Fidelidade de pacote integrado | Core business model threat — responder imediatamente |
| TaskRabbit escalation | Non-IKEA PT partnership announced | Promover para Tier 1; CAC supply-side em risco |

### Weekly digest only

- Novos features sem especificidade PT/ES
- Blog posts, case studies, content geral
- Minor copy updates
- Social media
- Hiring não-estratégico (engineering, support)
- App store rating ±0.2 estrelas ou menos

### Regra de decisão

"Esta mudança afecta o CAC, o posicionamento, ou o timing do nosso lançamento PT?" Se sim, alerta imediato. Se não, digest.

### Alert channel

- Phase 1 (Sprint B Lite): linha `ALERT:` no output + log em `.claude/pending-approval/` para review CEO
- Phase 2: GitHub Issues (out of scope Sprint B Lite)

---

## 7. Entidades Resolvidas (ex-Open Questions)

Todas as 5 questions abertas em v2 foram respondidas por Mário em 2026-05-01:

| Entidade | Decisão | Tier final |
|---|---|---|
| **Fixo** | B2C on-demand PT, Fidelidade-owned, preços fixos upfront — threat CRÍTICO | **Tier 1 weekly** |
| **TaskRabbit** | Operação PT activa (IKEA), 8858 reviews PT, escopo IKEA actual mas Partner API em expansão | **Tier 2A bi-weekly** com escalation trigger |
| **Lisbeyond** | Scope rentals (Airbnb) — diferente do V5; future B2B partner candidate | **Out of scope** (ver secção dedicada) |
| **ZasFácil** | Manter Tier 2A com URL `zasfacil.com` (watcher confirma na 1ª run) | **Tier 2A bi-weekly** |
| **Fixa Aí** | Brasil only confirmado — sem expansão ibérica conhecida | **Tier 4 quarterly** |

---

## 8. Effort & Cost Estimate

### Por run — Tier 1 only (semanas 2 e 4, weekly-only)

| Step | Acção | Tokens estimados |
|---|---|---|
| Fetch 5x homepages | WebFetch, ~3k chars cada | ~15k input |
| Fetch 5x pricing/blog/press | WebFetch, ~2k chars cada | ~10k input |
| Fetch 5x Crunchbase/imprensa | WebFetch, ~1k chars cada | ~5k input |
| Prior run context | Read último ficheiro MD | ~2k input |
| Output (MD report) | ~1.8k words | ~2.5k output |
| **Total Tier 1 only** | | **~34.5k tokens** |

### Por run — Tier 1 + Tier 2 (semanas 1 e 3, bi-weekly)

| Step | Tokens |
|---|---|
| Tier 1 (como acima) | ~34.5k |
| Tier 2A: 5 competitors × 3 sources × ~2k chars | ~30k input |
| Tier 2B: 2 competitors × 3 sources × ~2k chars | ~12k input |
| Output adicional Tier 2 | ~1.5k output |
| **Total bi-weekly run** | **~78k tokens** |

### Por run — Tier 3 deep-dive (1 por mês, standalone)

| Step | Tokens |
|---|---|
| 5-7 sources × ~3k chars | ~21k input |
| App Store reviews parsing | ~5k input |
| Prior deep-dive context (se existe) | ~3k input |
| Output standalone report (~3k words) | ~4k output |
| **Total deep-dive** | **~33k tokens** |

### Cost estimate mensal (Sonnet — $3/$15 por M input/output)

| Run type | Cadência | Tokens/run | Custo/run | Runs/mês | Custo/mês |
|---|---|---|---|---|---|
| Tier 1 only (weekly-only weeks) | Semanas 2 e 4 | ~34.5k | ~$0.11 | 2 | ~$0.22 |
| Tier 1 + Tier 2 (bi-weekly weeks) | Semanas 1 e 3 | ~78k | ~$0.25 | 2 | ~$0.50 |
| Tier 3 deep-dive | 1/mês | ~33k | ~$0.11 | 1 | ~$0.11 |
| **Total mensal** | | | | | **~$0.83 (~€0.76)** |

### Projecção anual

~€9/ano. Dentro do envelope €100/mês brain budget (contribui <1% do cap).

### Execution time per run

- Tier 1 only: ~25-35 segundos (10-15 fetches)
- Tier 1 + Tier 2: ~55-75 segundos (25-35 fetches)
- Deep-dive: ~30-40 segundos (5-7 fetches, mais processamento)

---

## 9. Implementation Notes

- **Cron expression:** `0 9 * * 1` (Monday 09:00 UTC = Lisboa 10:00 WEST)
- **Agent file:** `.claude/agents/competitor-monitor.md`
- **Output naming:** `YYYY-MM-DD.md` para weekly; `deep-dive-YYYY-MM-<slug>.md` para Tier 3; `quarterly-YYYY-QN.md` para Q-summary
- **Prior run context:** sempre ler ficheiro mais recente em `competitor-watches/` como baseline de change detection
- **Bi-weekly gate:** activar Tier 2 se `day-of-month <= 7 OR (day-of-month >= 15 AND day-of-month <= 21)`
- **Tier 3 gate:** activar deep-dive se primeira segunda-feira do mês (`day-of-month <= 7`)
- **Alert channel Phase 1:** linha `ALERT:` no output + log em `.claude/pending-approval/<YYYY-MM-DD>-alert.md` para CEO review
- **Failure behaviour:** se >50% dos fetches falharem, output com `[FETCH FAILED]` markers e status global `DEGRADED` — não produzir "no change" silencioso em dados ruins
- **Auth-blocked sources:** marcar como `[AUTH-BLOCKED]` no output, usar fallback Google News para funding intel
- **SPA-empty pages:** marcar como `[FETCH-DEGRADED]`, não inferir "no change"
- **TaskRabbit escalation:** se trigger fired, adicionar nota em `.claude/pending-approval/` com recomendação de Tier 1 promotion para aprovação CEO

---

## 10. Competitive Context Source

Context file completo (18+ entities, categorização, gaps competitivos):
`.claude/strategy/competitive-references-context.md`

Sincronizar quando Notion "Análise Competidores PropTech AI" tiver major updates.
Notion source: `https://www.notion.so/34c84147fa60817ba602c03201873e31`

---

*Spec v3 final. Open questions resolvidas. Tier structure: 5 Tier 1 · 7 Tier 2 (5A+2B) · 5 Tier 3 rotativos · 9+ Tier 4. Pronto para build do agent `.claude/agents/competitor-monitor.md`.*
