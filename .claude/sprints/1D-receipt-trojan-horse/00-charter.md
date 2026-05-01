# Sprint 1D Charter — Receipt Trojan Horse Alpha

> **Sprint window:** 2026-05-01 → 2026-05-15 (14 dias calendário, hard limit)
> **Sprint owner:** CEO (Mário) · **Tech lead:** CTO agent · **UX lead:** CPO agent
> **Status:** ACTIVE — D-Day 0
> **Reference docs:** `.claude/strategy/master-plan-snapshot.md` (D-07, D-20) · `.claude/current/q2-2026-okrs.md` (Objective 3) · `.claude/strategy/competitor-monitor-spec.md` (FIXO/Hubbent/Jobber threat profile)

---

## Objective

Provar em 14 dias que um owner real prefere partilhar um link de recibo com o seu prestador habitual a continuar a usar papel/email — convertendo demanda existente em supply digital sem CAC pago.

---

## Hypothesis (Hormozi-grade testable claim)

"Se proporcionarmos a um **owner PT proprietário 40-65 anos com 1-3 imóveis (ICP D-12)** um **link partilhável que dispara recibo digital + ficha mínima do prestador** para ele entregar ao seu **canalizador/electricista/jardineiro habitual** após um serviço pago fora-app, então **pelo menos 1 em 5 owners convidados completa o fluxo end-to-end (link gerado → entregue → recibo emitido → arquivado em Casa)** medido por **registos em `core.servicos_ativos` + entrada correspondente em `v5_manutencao.recibos` dentro da janela de 14 dias**."

A hipótese só é falsificada se 0/5 owners completarem o fluxo *apesar* de aceitarem o convite. Owners que recusam o convite falsificam uma hipótese diferente (recruiting/positioning), não esta.

---

## Success criteria (binary)

1. **5 owners alpha convidados** com convite enviado por canal directo (Mário pessoalmente: WhatsApp, chamada, ou presencial). Mário próprio conta como owner #1. Sim/Não medido por lista nominal em `tasks/alpha-owners.md`.
2. **≥1 owner completa o fluxo end-to-end** — gera link, entrega ao prestador (mock ou real), recibo aparece arquivado em Casa screen. Sim/Não medido por linha em `core.servicos_ativos` + linha em `v5_manutencao.recibos` com `owner_id ≠ Mário`.
3. **0 incidentes P0** (data loss, RLS leak, auth bypass, billing/factura emitida com NIF errado). Sim/Não medido por audit de `audit_log` + Auditor agent review final.
4. **≥3 entrevistas qualitativas owner** de 20-30 min, gravadas ou transcritas, cobrindo: contexto do uso real, fricção observada, willingness-to-pay (€6.90 vs €12.90 plug). Sim/Não medido por 3 ficheiros em `tasks/interviews/`.
5. **UX 1C-lite shipped em prod** — Casa+Início merge funcional + Receipt flow inline em Casa screen acessível sem feature flag para owners alpha. Sim/Não medido por commit em `main` + smoke test live.

---

## Kill criteria (binary)

1. **Day 7 zero owners aceitam o convite** (Mário não conta) — significa que o pitch/posicionamento não funciona mesmo com proximidade pessoal. Pivot: reavaliar hipótese de recruitment antes de continuar build.
2. **Day 14 zero owners completam o fluxo end-to-end** apesar de ≥3 terem aceitado — significa que demand-pull existe em palavras mas não em comportamento. Pivot: ou parar Receipt Trojan Horse e voltar a UX puro, ou refazer com prestador real recrutado upfront.
3. **P0 incident não-trivial detectado em produção** (RLS leak, dados de outro owner visíveis, NIF cruzado em recibo) — abortar smoke test, congelar branch, postmortem antes de qualquer push novo. CTO + Auditor decidem se sprint continua ou termina aqui.

---

## Strategic alignment

Serve directamente **Objective 3** dos OKRs Q2 (Receipt Trojan Horse MVP funcional) — fecha KRs 3.1 (flow), 3.2 (onboarding <3 min, deferido para 1E), 3.3 (1ª factura) e 3.4 (5 owners smoke test). Contribui para **Objective 1** (willingness-to-pay) via critério 4 (entrevistas qualitativas com pricing question). Avança **Objective 2** parcialmente via UX 1C-lite (KR 2.1 Casa+Início merge), mas Owners Club tab (KR 2.2) e selector centralizado (KR 2.3) ficam diferidos para 1E. Materializa as decisões canónicas D-07 (Receipt Trojan Horse) e D-20 (build directo + alpha test em vez de smoke test pre-build) do master plan.

---

## Competitive context

Por que AGORA, não daqui a 4 semanas:

- **Hubbent** (lançamento PT recente, dual-app cliente+Pro, claim "a maior plataforma de serviços e profissionais em Portugal") — Tier 1 weekly, deep-dive W18. Se conseguirem tracção real antes de termos 1 owner activo, o nosso claim de demand-pull perde diferenciação narrativa. Janela de telling our story first ≤30 dias.
- **FIXO** (Fidelidade-backed, B2C on-demand PT, preços fixos upfront) — ameaça existencial Tier 1 CRÍTICO. Capital + base seguros + bundling potential. Cada semana sem owners reais é semana em que FIXO consolida mind-share owner-side em PT enquanto temos plataforma vazia.
- **Jobber EU expansion** (CRÍTICO, SaaS SMB EU-funded) — pressão supply-side. Se Jobber abrir PT antes de termos 5 prestadores reais, Receipt Trojan Horse torna-se mais caro (prestadores já têm ferramenta concorrente quando os abordamos).
- **Receipt/demand-pull feature** está marcado como Priority A immediate alert no monitor — moat narrativo é a originalidade. Cada semana adicional de build sem alpha = janela menor para o claim "primeiros em PT".
- **CEO weekly recap (W18):** "platform technically strong but zero real users — must shift energy from building to recruiting." Sprint 1D é a operacionalização literal desse pivot.

---

## Emenda — Tese 2-camadas (2026-05-01)

> Adicionado após clarificação estratégica de Mário. O charter mantém-se inalterado.

Sprint 1D constrói a **Camada 1** (owner envia magic link → prestador confirma → recibo arquivado). A **Camada 2** (dashboard Jobber-style para o prestador: clientes, agenda, facturas, Stripe Connect, Moloni/InvoiceXpress) é **Sprint 1E** — fora de scope aqui.

Soft CTA pós-confirmação "Criar conta gratuita" adicionado ao spec UX (post-Day 3 review): aparece no ecrã de confirmação do prestador após emissão do recibo, com copy "Quer gerir todos os seus clientes e recibos num só lugar?". É um CTA não-bloqueante — o recibo é emitido independentemente. O `status` do prestador permanece `'onboarded'`; só passa a `'conta_criada'` em 1E quando o prestador completa onboarding completo.

---

## Out of scope (explicit)

Lista do que **não se constrói nem se discute** durante este sprint. Qualquer item desta lista que apareça em PR ou planeamento é motivo para Auditor flag.

1. **Stripe Connect / payment processing in-app** — pagamentos continuam fora-app na 1ª iteração (D-04). Recibo é informacional + contacto. Marketplace fee/escrow é Sprint 1F+.
2. **Owners Club tab dedicada** (KR 2.2) — diferida para Sprint 1E. Charter actual usa Casa screen como container único do Receipt flow.
3. **Selector imóvel centralizado** (KR 2.3) — diferido para 1E.
4. **Weather "Todos os imóveis" Modo A bug fix** — bloqueador conhecido em modo global, deferido desde 1B.4. Não tocar.
5. **V10 Copilot V2 integration** (`prataowners.pt`) — Q3 trabalho, fora de scope.
6. **Marketing platform / SEO / paid acquisition** — alpha é convite directo Mário, zero spend canal pago. CMO actions diferidas até pós-sprint.
7. **Prestador app dedicada / mode switcher Uber-style** — Q4 (Fase 6). Prestadores na 1ª iteração são mockados ou contactados fora-app por Mário.
8. **Smart Inbox cross-channel completo** (email + WhatsApp + portal + magic link + QR — D-10) — só uma via na 1ª iteração: link partilhável directo. Resto fica para 1E+.
9. **GDPR DPA renegociation com Resend** e qualquer trabalho RGPD não-bloqueante. COO mantém o que existe.
10. **V4 Energia / V3 Seguros / qualquer outra vertical** — congelado durante o sprint.
11. **Refactor de v1-core ou prataowners.pt** — V2 INTOCÁVEL (D-02), v1-core não recebe trabalho não-essencial neste sprint.
12. **Onboarding prestador <3 min** (KR 3.2) — alvo deferido. Esta iteração mede flow, não tempo.
13. **Capacitor/mobile builds** — desktop+mobile web responsive only.

---

## Decision rights

| Domínio | Quem decide | Escalation |
|---|---|---|
| Scope changes (adicionar ou remover items do charter) | **CEO/Mário** | — |
| Kill criteria activation (Day 7, Day 14) | **CEO/Mário** após input CTO+CPO+Auditor | — |
| Technical implementation (schema, RLS, edge functions, branching, deploy strategy) | **CTO agent** | CEO se tradeoff afecta runway, vendor cost ou success criteria |
| UX flow specifics (Casa screen layout, Receipt inline form, link share UI, copy PT) | **CPO agent** | CEO se choice afecta success criteria (ex: copy que muda hipótese testada) |
| P0 risk identification e flag | **Auditor agent** | Escala directo a CEO; CTO informado em paralelo |
| Vendor / RGPD / contratos | **COO agent** | CEO se custo > €20/mês incremental |
| Recruitment alpha owners (lista nominal, ordem, abordagem) | **CEO/Mário** exclusivamente | — |
| Entrevistas qualitativas (script, condução, transcrição) | **CEO/Mário** conduz; **CPO agent** prepara script | — |

**Regra de ouro do sprint:** se uma decisão demora >2h a resolver entre agents, escala a CEO em vez de bloquear. 14 dias não tolera deadlock.
