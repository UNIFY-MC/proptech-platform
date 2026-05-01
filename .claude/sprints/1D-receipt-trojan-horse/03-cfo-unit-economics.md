# Sprint 1D — CFO Unit Economics

> Author: CFO Agent
> Date: 2026-05-01
> Depends on: 00-charter.md · 02-cto-architecture.md · master-plan-snapshot.md
> Sprint window: 2026-05-01 → 2026-05-15 (14 dias)

---

## Build cost (Sprint 1D — 14 dias)

**Premissa de base:** Mário é solo founder pré-receita. Custo de oportunidade é real mas não é caixa — não sai da conta bancária. O que sai é API + infra. Distinguir explicitamente: cash cost vs oportunidade.

### Cash costs (saem da conta)

| Item | Estimativa | Método de cálculo | Tipo |
|---|---|---|---|
| Anthropic API — C-suite ad-hoc 14 dias | €1.50 – €4.00 | 3–8 sessões CFO/CTO/CPO/Auditor × ~500k tokens input + 50k output por sessão × Sonnet 4.6 pricing ($3/$15 per 1M) | ESTIMATE |
| Supabase incremental — schema migration | €0.00 | 2 tabelas novas, ~10 SQL calls via MCP — dentro do tier free (V1 Core Hub `hkmvszkpxjbxmnixzqbl` está em free tier) | ASSUNÇÃO: free tier não excedido |
| Supabase incremental — edge functions calls durante build/test | €0.00 | ~200–500 invocações de teste durante 14 dias; free tier = 500k/mês; alpha = 5 owners ≪ limite | ASSUNÇÃO: free tier não excedido |
| Supabase incremental — storage | €0.00 | Sprint 1D não tem upload de ficheiros — magic links + onboarding são só texto/JSON | ASSUNÇÃO |
| Netlify deploy | €0.00 | Já em uso; zero incremental | VALIDADO |
| Resend SMTP | €0.00 | Confirmação de onboarding: ~10–20 emails durante sprint; free tier = 3.000/mês | ASSUNÇÃO: free tier não excedido |
| Sprint B Lite watchers (background) | $0.60/mês ≈ €0.56 | Já em produção antes deste sprint; não é custo incremental deste sprint | PRE-EXISTING |
| **Total cash cost sprint 14 dias** | **€1.50 – €4.00** | | |

### Custo de oportunidade (não é cash — é tempo Mário)

| Actividade | Horas estimadas | "True cost" | Nota |
|---|---|---|---|
| Supervisão build (review PRs, decisões técnicas, testing) | 8–14h | €0 cash, mas €0 MRR gerado nesse tempo | Tempo que não é vendas nem entrevistas |
| Alpha owner recruitment (Day 13: calls, WhatsApp, presencial) | 4–6h | €0 cash | Tempo bem investido — valida hipótese central |
| Entrevistas qualitativas (3× 30 min + prep + transcrição) | 4–6h | €0 cash | KR 3.4: obrigatório para success criteria |
| Smoke test pessoal Day 11 | 1–2h | €0 cash | CEO é alpha owner #1 — necessário |
| **Total horas Mário** | **17–28h** | **€0 cash** | Custo real = 17–28h de outro trabalho não feito |

**CFO nota:** Para um founder pré-receita, 17–28h num sprint de 14 dias é razoável (1.2–2h/dia). O risco de oportunidade é que Mário não está a fazer vendas ou V4 Energia neste período — mas a hipótese D-07 (demand-pull sem CAC) é de alta convicção, justifica o investimento de tempo.

---

## Cost per alpha owner (onboarding + 30 dias uso)

**Contexto arquitectural (CTO architecture verificado):** Ambas as edge functions (`gerar-magic-link` e `prestador-onboarding`) têm **zero LLM calls**. Não há Anthropic API no caminho crítico de um owner real. Custo por owner é puramente infra.

### Breakdown por owner (alpha — 5 owners, 30 dias)

| Item | Custo por owner/mês | Método de cálculo |
|---|---|---|
| Anthropic API (LLM calls no produto) | **€0.00** | Edge functions são pure Deno/Postgres — zero AI no fluxo owner→prestador (ADR-004 cumprido: agents server-side only, mas nenhum agent activado neste sprint para o fluxo core) |
| Supabase edge function invocations | €0.00 – €0.001 | Owner activo gera ~2–5 magic links/mês × 2 edge function calls cada = 10–25 invocações; free tier = 500k/mês; 5 owners × 25 = 125 calls ≪ limite |
| Supabase DB reads/writes | €0.00 | Free tier inclui 500MB DB + queries ilimitadas; 5 owners pré-revenue não tocam em nenhum limite |
| Supabase Auth | €0.00 | Free tier: 50.000 MAU; 5 owners + 5 prestadores = 10 users |
| Resend emails (confirmação onboarding) | €0.00 | ~2–4 emails/owner/mês; 5 owners = 20 emails; free tier = 3.000/mês |
| Netlify CDN/bandwidth | €0.00 | 5 users com sessões leves — dentro de free tier (100GB/mês) |
| **Total custo infra por owner/30 dias** | **€0.00 – €0.001** | Efectivamente €0 no tier actual |

**Custo de aquisição manual (não é infra, é tempo):**
- Mário contacta 5 owners pessoalmente: ~4–6h total ÷ 5 owners = 0.8–1.2h/owner
- Cash CAC = €0 (convite directo, sem canal pago — conforme charter)
- "True CAC" em custo de oportunidade = 0.8–1.2h tempo Mário/owner

**Conclusão:** Cost per alpha owner/30 dias = **€0.00 cash**. É o proof-of-concept de D-07: zero custo de supply quando demand puxa.

---

## LTV projection (alpha → paying)

### Assunções base

| Parâmetro | Valor | Fonte |
|---|---|---|
| ICP owner: 1-3 imóveis, 40-65 anos | — | D-12 |
| Alpha pool Sprint 1D | 5 owners | 00-charter.md success criteria |
| Pricing tiers | Free / Home+ €6.90 / Home Pro €12.90 | D-03 |
| ARPU assumption (mix Home+ e Home Pro) | €8.40/mês | master-plan-snapshot.md: "24 meses × €8.40 ARPU" |
| Monthly churn assumption | 3%/mês (base) | Assunção conservadora para SaaS <€15 |
| CAC alpha (cash) | €0 | Convite directo, zero canal pago |

### Cenário Conservador — 20% converte para Home+ (€6.90/mês)

| Métrica | Cálculo | Resultado |
|---|---|---|
| Owners que convertem | 5 × 20% | 1 owner |
| Tier escolhido | Home+ | €6.90/mês |
| Retenção mensal | 97% (churn 3%) | — |
| LTV 12 meses (sem crescimento) | €6.90 × (1 – 0.97^12) / 0.03 | €68.10 |
| LTV 24 meses | €6.90 × (1 – 0.97^24) / 0.03 | €116.60 |
| CAC cash | €0 | — |
| LTV/CAC (cash) | ∞ (divisão por zero — CAC = 0) | N/A |
| LTV/CAC (custo oportunidade, proxy €0 cash) | ∞ | — |
| Payback period | Mês 1 (primeiro pagamento) | — |

**Nota CFO:** Com CAC=0 o rácio LTV/CAC é matematicamente infinito. Mas o que testamos aqui não é escala — é validade da hipótese. O número que importa: 1 owner pagante a €6.90/mês valida a willingness-to-pay.

### Cenário Base — 40% converte (mix Home+ / Home Pro)

| Métrica | Cálculo | Resultado |
|---|---|---|
| Owners que convertem | 5 × 40% | 2 owners |
| Mix tier (assunção: 50/50) | 1 × €6.90 + 1 × €12.90 | €19.80/mês total |
| ARPU efectivo | €19.80 ÷ 2 | €9.90/mês |
| LTV médio 12 meses/owner | €9.90 × (1 – 0.97^12) / 0.03 | €97.60 |
| LTV médio 24 meses/owner | €9.90 × (1 – 0.97^24) / 0.03 | €167.20 |
| LTV/CAC vs target master plan | €167.20 vs target >€200 (24m) | Ligeiramente abaixo do target — mas com CAC €0, runway é irrelevante |
| MRR gerado pelo alpha | €19.80/mês | — |

### Cenário Optimista — 60% converte (maioria Home Pro)

| Métrica | Cálculo | Resultado |
|---|---|---|
| Owners que convertem | 5 × 60% | 3 owners |
| Mix tier (assunção: 1/3 Home+, 2/3 Home Pro) | 1 × €6.90 + 2 × €12.90 | €32.70/mês total |
| ARPU efectivo | €32.70 ÷ 3 | €10.90/mês |
| LTV médio 12 meses/owner | €10.90 × (1 – 0.97^12) / 0.03 | €107.45 |
| LTV médio 24 meses/owner | €10.90 × (1 – 0.97^24) / 0.03 | €184.10 |
| MRR gerado pelo alpha | €32.70/mês | — |
| % caminho para target €10k MRR Q4 2026 | €32.70 ÷ €10.000 | 0.33% — é um alpha, não é escala |

**CFO warning no cenário optimista:** €32.70/mês com 3 owners pagantes é excelente como sinal qualitativo mas não é KPI operacional. O KPI real neste sprint é a taxa de conversão comportamental (owners que usam o flow) — não o MRR gerado. MRR do alpha é ruído estatístico. O que muda decisões: as entrevistas qualitativas e a taxa de conclusão do flow.

---

## Cap status actual

### Mapa de gastos Anthropic API (2026-05-01)

| Item | Custo mensal estimado | Estado |
|---|---|---|
| Sprint B Lite watchers (scheduled) | $0.60 ≈ €0.56/mês | VALIDADO — em produção |
| C-suite agents ad-hoc (sessões como esta) | €3.00 – €8.00/mês | ESTIMATE (7 agents × 1–2 sessões médias/mês) |
| **Total baseline pré-Sprint 1D** | **€3.56 – €8.56/mês** | — |
| Sprint 1D build adicional (14 dias) | €1.50 – €4.00 (todo o sprint, não/mês) | ESTIMATE |
| Custo mensal recorrente pós-Sprint 1D | €0.00 incremental | Edge functions sem LLM — zero custo Anthropic em prod |
| **Total estimado Maio 2026** | **€5.00 – €12.56** | — |

### Headroom vs cap €100/mês

| Cenário | Custo Maio | Headroom | % do cap |
|---|---|---|---|
| Mín | €5.00 | €95.00 | 5% |
| Base | €8.80 | €91.20 | 9% |
| Máx | €12.56 | €87.44 | 13% |

### Threshold alerta €80 — em que cenário é atingido?

**Resposta directa:** Sprint 1D sozinho nunca atinge €80. Para atingir €80/mês seria necessário:
- 15–20 sessões C-suite intensivas no mesmo mês, OU
- Activar LLM calls em produção para owners reais (não está no scope deste sprint — ADR-004 + CTO architecture confirmam zero LLM no fluxo 1D), OU
- Expandir watchers de 6 para 40+ agentes scheduled simultâneos

**Cenário de risco real para €80:** Sprint 1E ou 1F, quando agentes de IA começam a ser activados para owners reais (casa_advisor, image_inspector). Esse momento exige revisão de custo por owner antes de qualquer expansão. Recomendação: criar tracking de tokens por owner_id logo em Sprint 1E.

---

## Risk: Stripe Connect deferral

### Timeline estimado KYC PT

| Etapa | Duração estimada | Notas |
|---|---|---|
| Stripe Connect application (PT entity) | 1–2 dias | Formulário online; Mário tem NIF + actividade declarada como TOC |
| KYC document review (Stripe) | 3–7 dias úteis | Stripe PT entity review típica; pode ser mais rápido com entidade estabelecida |
| Conta activada e testável | 5–10 dias úteis total | Assunção: sem pedidos de documentação adicional |
| **Timeline total pessimista** | **3 semanas** | Se Stripe pedir esclarecimentos adicionais |
| **Timeline total optimista** | **8 dias** | Entidade limpa, sem flags |

**ASSUNÇÃO CRÍTICA:** Timeline baseado em Stripe Connect PT experience reportada em fóruns e documentação Stripe (2024–2025). Mário tem CLAUDE/contabilista certificado — é vantagem para KYC. Não há dados proprietários desta empresa.

### Custo de oportunidade do delay

| Cenário | Duração sem Stripe | Owners que validam demand | Revenue não capturada |
|---|---|---|---|
| Optimista (KYC 8 dias) | Days 1–8 do sprint | 0 (alpha ainda a recrutar) | €0 — Stripe não fazia diferença em Days 1-8 mesmo se activo |
| Base (KYC 15 dias) | Todo o sprint | 2–3 owners interessados | €6.90–€25.80 potenciais — mas estes owners são alpha sem expectativa de pagar em Day 14 |
| Pessimista (KYC 21 dias) | Sprint + 1 semana | 5 owners com demand validado | €34.50–€64.50 máximo — se todos quisessem pagar imediatamente |

**CFO assessment:** O custo de oportunidade do Stripe deferral em Sprint 1D é **baixo-a-nulo**. Porquê:

1. O charter (out of scope item #1) explicitamente exclui pagamentos in-app em 1D. Esta é uma decisão estratégica correcta — testar demand-pull antes de activar billing é sequência de validação ortodoxa.
2. Alpha de 5 owners não é uma base de pagamento — é uma base de entrevista. Cobrar no alpha contamina dados de willingness-to-pay (owners pagam para ser simpáticos, não porque querem pagar).
3. Revenue máxima perdida no cenário pessimista: €64.50 em 3 semanas. Custo de activar Stripe antes de validar demand: correr o risco de construir billing para zero pagantes.

### Recomendação: activar Stripe Connect processo em que dia?

**Recomendação CFO:** Iniciar processo Stripe Connect no **Day 10 do sprint** (2026-05-10).

**Racional:**
- Day 10 é quando o flow está testado em staging (CTO architecture: Day 10 = E2E testing + edge cases)
- KYC típico de 8–15 dias úteis significa aprovação ~2026-05-18 a 2026-05-25
- Sprint 1E começa imediatamente após 1D — se Stripe aprovado na semana pós-sprint, billing pode ser ligado em Sprint 1E sem delay
- Não iniciar antes do Day 10 porque até aí ainda há risco de pivot técnico que poderia mudar o produto antes de ter billing integrado
- Custo de iniciar o processo Day 10: 1–2h de Mário para preencher formulário Stripe — low cost, high optionality

**Sequência concreta Day 10:**
1. Mário preenche Stripe Connect application (PT, individual ou empresa conforme estrutura fiscal)
2. Upload docs KYC básicos (NIF, comprovativo morada, IBAN PT)
3. Slack/email Stripe em aberto — resposta em 3–7 dias úteis
4. Não bloquear o resto do sprint nisto — é tarefa paralela

---

## CFO recommendation

Sprint 1D está aprovado financeiramente sem condições. O cash burn incremental é €1.50–€4.00 nos 14 dias de build, com custo de produção por owner efectivamente zero (zero LLM no caminho crítico confirmado pelo CTO). A estrutura é correcta: validar demand antes de activar billing evita desperdício de runway em infrastructure de pagamento para base de utilizadores ainda não provada. A única acção time-sensitive com implicação financeira é iniciar o processo Stripe Connect no Day 10 — não para cobrar durante o alpha (que deliberadamente não o faz), mas para eliminar o lead time de KYC e ter billing operacional em Sprint 1E quando a primeira conversão for tentada. O risco financeiro real não está neste sprint — está em Sprint 1E, quando agentes LLM começam a correr para owners reais e o custo por owner deixa de ser zero. Antes de Sprint 1E começar, o CFO exige um custo-por-owner-LLM calculado com dados reais de tokens consumidos pelos alpha owners neste sprint.

---

*Documento gerado por CFO Agent · 2026-05-01 · Baseado em 00-charter.md + 02-cto-architecture.md + master-plan-snapshot.md*
