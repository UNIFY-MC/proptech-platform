# Camada 2 — Prestador App Spec v2 (delta v1)

**Data:** 2026-05-01 (update v1)
**Owner:** CPO + CTO
**Status:** Research delta — adicionar a `.claude/strategy/camada-2-prestador-app-spec-v1.md`
**Sources adicionados:** AppFolio Property Manager (Realm-X)

Este documento é DELTA do v1. Combinar com v1 para spec completa.

---

## Adições v2

### 1. Novo source: AppFolio (USA, B2B property management)

**Positioning:** "From Property Management to Performance Management."

**Modelo de negócio:**
- B2B SaaS property management (NÃO consumer)
- Targeting 50-5000 units (mid-market property managers)
- Per-unit pricing (annual contracts, 50-unit minimum)
- NASDAQ:APPF (public 2015)
- $11-month ROI payback
- 89% user adoption rate
- #1 G2 Property Management 2026

**Stack AI Realm-X:**
- **Realm-X Leasing Performer** — AI agent automates lead inquiry response, scheduling, lead nurturing
- **Realm-X Maintenance Performer** — image-based diagnose: foto issue → AI diagnose + work order automatic + vendor dispatch
- **Realm-X Messages** — auto-reply communications (saves 26s/message)
- **Realm-X Flows** — automation workflows (73% higher lead-to-showing conversion)
- **Lisa AI Leasing Assistant** — 24/7 prospect responses
- **AppFolio Stack Marketplace** — open ecosystem com Lula (maintenance lifecycle), Second Nature, etc.

**Métricas reportadas:**
- 10.3 hours/semana saved em to-do tasks
- 11.9 hours/semana saved em communication
- AI adopters: 31% portfolio growth vs 12% non-users
- 78% reportam que NÃO confiam em AI features de legacy software (ainda)

**Pontos fortes (relevantes para nós):**
- **AI-native architecture** — não AI bolted-on, AI embedded em workflows
- **Maintenance Performer image-based diagnose** ⭐⭐⭐ — directamente alinha com Casa Advisor V5 + Magic Image Analyzer Shipshape
- **Open Stack ecosystem** — partners especializados (Lula = maintenance hub) integram-se
- **Performance metrics tied to AI** — vendor articula AI ROI em métricas de negócio (vacant units 5.2 days faster, NOI +2.8%)

**Pontos fracos (PT context):**
- **B2B mid-market** — não target consumer owners (V5 ICP)
- **USA-only** — PT compliance + Moloni não existem
- **Per-unit pricing** — modelo errado para single owner
- **50-unit minimum** — exclui ICP V5 (1 casa)

**Aplicabilidade PropTech V5:**

| Layer | Relevância AppFolio | Comments |
|-------|---------------------|----------|
| **V5 manutencao (cliente owners)** | Baixa-média | Patterns UX maintenance request flow |
| **V2 condomínios** | **ALTA** | AppFolio é exactly o competitor de V2 condomínios em larger PT/EU buildings (50+ units) |
| **Camada 2 prestador app** | Média | Maintenance Performer image-diagnose pattern replicável |

**Conclusão:** AppFolio mostra que **AI agents embedded in workflows** funciona em B2B property management. Para PropTech V5, isto valida a tese "Casa Advisor + V2 condomínios" como categoria — mas implementação tem que ser PT-first (Moloni, IPMA, ptPT).

---

### 2. Adicionar à matrix funcional v1 (secção 2.1)

| Dimensão | OSCAR | Hubbent | Fixando | FIXO | Jobber | Shipshape | InstaService | **AppFolio** | **PropTech V5** |
|----------|-------|---------|---------|------|--------|-----------|--------------|--------------|-----------------|
| **Cliente app rica** | parcial | parcial | parcial | sim | não | sim | parcial | (resident) | **sim Camada 1** |
| **Prestador app rica** | parcial | parcial | não | parcial | sim | não | parcial | (vendor portal) | **sim Camada 2** |
| **Multi-tenant cliente** | não | não | não | não | não | não | não | sim B2B | **sim (V2 cond.)** |
| **Magic-link bridge** | não | não | não | não | não | não | não | não | **sim (1D)** |
| **Moloni/InvoiceXpress PT** | não | ? | não | sim | não | não | não | não (USA) | **sim P0 1E** |
| **Agentic AI ptPT** | não | não | parcial | não | só EN | só EN | não | só EN | **sim (live)** |
| **AI image-based diagnose** | não | não | não | não | não | sim (Magic Image) | não | sim (Maintenance Performer) | **partial (Casa Advisor)** |
| **IPMA meteorologia** | não | não | não | não | não | não | não | não | **sim (1B.4 live)** |
| **Manutenção preventiva** | não | não | não | parcial | não | sim | não | parcial | **sim** |
| **Multi-vertical schema** | não | não | não | não | não | não | não | não | **sim (4 verticals)** |

**Implicação:** AppFolio entra como **competidor B2B** (relevante mais para V2 condomínios do que V5 owners). Não muda o diagnóstico do v1 — apenas confirma que **AI-native + open ecosystem** é o caminho certo.

---

### 3. Feedback Mário (2026-05-01) — "Resumo do trabalho" requirement

**Origem:** Pós-test E2E Day 3, Mário identificou gap importante:

> *"O prestador tem de preencher um resumo do trabalho que fez e o que encontrou para ficar junto à ficha do equipamento, falta informação que ele tem de preencher."*

**Análise:**
Esta requirement não é um feature isolated — **é estrutural para a tese 2-camadas**:

- **Camada 1 (cliente):** "ficha do equipamento" implica que cada job fica anexado ao **equipamento específico** da casa (ex: "Caldera Vulcano sala — substituição válvula 3 vias, 28 Abr 2026, José Silva canalizador, €80")
- **Camada 2 (prestador):** "resumo do trabalho" alimenta histórico do prestador sobre cada cliente — **diferenciador vs OSCAR** (que só regista transação)

**Onde isto aparece em outros sources:**
- **Shipshape:** HomeHealth Record™ tracks "every system, every component, every service visit" — exactly isto
- **AppFolio:** Maintenance Performer "logs summaries" automatically
- **Jobber:** Job forms / checklists customizáveis com photos — implementação da mesma ideia

**Validação:** Os 3 melhores competitors (cada um na sua categoria) já têm isto. Confirma que é table-stakes para Camada 2.

---

### 4. Feature priorization update — Sprint 1E

#### P0 (Sprint 1E launch) — adicionado

| Feature | Source | Justification |
|---------|--------|---------------|
| **Resumo do trabalho + ficha equipamento** | Mário 1D feedback + Shipshape HomeHealth Record + AppFolio Maintenance Performer | Sem isto, recibo é só transacção; com isto, é histórico cumulativo do equipamento |
| **Photo upload antes/depois** | Jobber + Shipshape | Visual proof + future AI diagnose input |
| **Equipamento link** (job → equipamento_id na casa) | Schema PT-PT | Histórico por equipamento (caldeira, frigorífico, telhado) |

#### P1 (Sprint 1E iteration 2) — adicionado

| Feature | Source |
|---------|--------|
| **AI auto-summarize "resumo do trabalho"** | AppFolio Maintenance Performer | Foto + voice note → AI gera summary draft, prestador edita |
| **Image-based diagnose pré-job** | Shipshape Magic Image Analyzer + AppFolio Maintenance Performer | Owner tira foto, AI sugere serviço + prestador match |

---

### 5. Schema additions Sprint 1E (delta v1)

Adicionar ao `v5_manutencao` (não criar `v5_pro` ainda — schema actual chega):

```sql
-- Adicionar ao schema v5_manutencao
ALTER TABLE v5_manutencao.recibos_servico ADD COLUMN equipamento_id UUID;
-- FK soft (não enforce ainda) para core.equipamentos quando essa table existir

ALTER TABLE v5_manutencao.recibos_servico ADD COLUMN resumo_trabalho TEXT;
ALTER TABLE v5_manutencao.recibos_servico ADD COLUMN diagnostico_encontrado TEXT;
ALTER TABLE v5_manutencao.recibos_servico ADD COLUMN fotos_urls TEXT[];  -- array de URLs storage

-- Indices para query "todos jobs deste equipamento" (HomeHealth Record)
CREATE INDEX recibos_servico_equipamento_idx ON v5_manutencao.recibos_servico(equipamento_id) WHERE equipamento_id IS NOT NULL;
```

**Decisão diferida:** Tabela `core.equipamentos` (caldeira, frigorífico, telhado por casa) é tarefa Sprint 1E charter. Não criar agora.

**Para Sprint 1D (curto prazo):** Adicionar campo `notas_prestador` opcional ao Step 2 (já existe coluna `recibos_servico.notas`). Implementação 30 min, captura informação rica desde alpha sem schema changes.

---

### 6. Next Actions update

**Sprint 1D Day 4-7 (sugerido, não compromisso):**
- [ ] Adicionar campo opcional "Notas / Resumo do trabalho" ao PrestadorStep2 (charter minor amendment)
- [ ] Capture mesmo se vazio (don't enforce) — recolhe sinal sobre adopção

**Sprint 1E charter additions:**
- [ ] Schema migrations para `equipamento_id` + `resumo_trabalho` + `diagnostico_encontrado` + `fotos_urls`
- [ ] `core.equipamentos` table design (caldeira, frigorífico, telhado, jardim)
- [ ] Image upload flow + Supabase Storage bucket setup
- [ ] AI auto-summarize via Casa Advisor (já temos infra agentic)

---

**Fim v2 delta. Combinar com v1.**

Sources adicionais:
- appfolio.com/blog (multiple 2026 posts)
- stocktitan.net Realm-X Performers launch
- redirectconsulting.com AI in Property Management 2026 blueprint
- showdigs.com Best AI Property Management Tools 2026
