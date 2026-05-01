# Sprint 1D — Days 10-12 — MVP Completion + Owner Recruitment + Stripe Process

**Datas:** 2026-05-10 (Sab) → 2026-05-12 (Seg)
**Duração:** 3 dias
**Owner principal:** CEO (recrutamento + onboardings) + CTO (deploy/buffer) + COO (RGPD final + entrevista)
**Bloco success criterion:** 4 owners (excl. Mário) com flow iniciado Day 12; Stripe processo aberto; 1ª entrevista feita; gate Day 11 passado.

---

## Day 10 — 2026-05-10 (Sab) — Deploy staging + Smoke test + Stripe + ONBOARDING OWNER B

**Objectivo do dia:** produção limpa, Stripe Connect application submitted (processo, não billing), Owner B onboarded.

### Tasks

- [ ] **Deploy staging final em main**: confirmar todas edge functions deployed (`supabase functions deploy gerar-magic-link prestador-onboarding`) — Owner: CTO
- [ ] **Smoke test produção em telefone Mário**: criar link real → abrir noutro device → completar como mock-prestador → recibo aparece via realtime — Owner: CTO+CEO
- [ ] **Verificar 0 secrets no client bundle**: `grep VITE_ANTHROPIC` em `dist/` deve retornar 0 (regra inviolável CLAUDE.md) — Owner: CTO
- [ ] **Verificar política de privacidade tem valores reais** (não placeholders) na ReceiptLandingScreen footer — Owner: COO
- [ ] **STRIPE CONNECT APPLICATION** — Mário preenche formulário online (CFO recommendation):
  - [ ] PT entity (singular ou empresa conforme estrutura fiscal de Mário TOC)
  - [ ] Upload docs KYC: NIF, comprovativo morada, IBAN PT
  - [ ] Email/dashboard Stripe em aberto para resposta
  - [ ] **NÃO bloquear sprint por isto** — é tarefa paralela 1-2h — Owner: CEO
- [ ] **OWNER B ONBOARDING** (chamada 15 min, COO playbook): criar link, partilhar com Mário-as-prestador-mock — Owner: CEO+COO
- [ ] **Marcar entrevista Owner B** para Day 13 (3 dias após uso) — Owner: CEO
- [ ] **Registar em `feedback/2026-05-10-{iniciais}.md`** — Owner: CEO

### Success criterion Day 10

Produção verde, smoke test passou. Stripe application submitted (status pendente, esperar 5-10 dias). Owner B com flow completo: ≥2 linhas em `core.servicos_ativos` com `owner_id ≠ Mário` (Owner A + Owner B). Entrevista marcada Day 13.

---

## Day 11 — 2026-05-11 (Dom) — Buffer / bug fix + ONBOARDING OWNER C + GATE Day 11 às 18h

**Objectivo do dia:** absorver bugs P1 encontrados em Days 8-10. Owner C onboarded. Gate Day 11 valida que ≥1 end-to-end completo é real.

### Tasks

- [ ] **Triage de bugs registados nos `feedback/*.md` Days 8-10**: classificar P0/P1/P2 — Owner: CTO+CEO
- [ ] **Fix obrigatório de todos os P0 e P1 abertos** — Owner: CTO
- [ ] **P2 deferidos para Sprint 1E** (registar em `tasks/p2-backlog.md`) — Owner: CEO
- [ ] **OWNER C ONBOARDING** (chamada 15 min, COO playbook) — Owner: CEO+COO
- [ ] **Marcar entrevista Owner C** para Day 14 (3 dias após uso) — Owner: CEO
- [ ] **GATE 18h: CEO review 30 min** (Auditor agent ad-hoc se houver dúvida):
  - [ ] ≥1 linha em `core.servicos_ativos` com `owner_id ≠ Mário` (já visto Day 9-10 — confirmar persistência)
  - [ ] ≥1 linha em `prestadores_parceiros` linkada a esse owner
  - [ ] Realtime update funcionou nos onboardings (card mudou sem reload manual em ≥1 caso real)
  - [ ] 0 P0/P1 abertos
- [ ] **Decisão gate**: 4/4 → continuar; 3/4 → fix prioritário Day 12; ≤2/4 → kill criteria Day 14 antecipado activado, replanear — Owner: CEO
- [ ] **Registar em `tasks/day-11-checkpoint.md`** — Owner: CEO

### Success criterion Day 11

3 owners (A, B, C) excluindo Mário com flow iniciado. Gate Day 11 passado. ≥3 linhas em `core.servicos_ativos` com `owner_id ≠ Mário`. 0 P0/P1 abertos.

---

## Day 12 — 2026-05-12 (Seg) — ONBOARDING OWNER D + 1ª entrevista qualitativa + RGPD final check

**Objectivo do dia:** quarto owner real onboarded. Primeira entrevista qualitativa de 30 min concluída e arquivada.

### Tasks

- [ ] **OWNER D ONBOARDING** (chamada 15 min, COO playbook) — Owner: CEO+COO
- [ ] **Marcar entrevista Owner D** para Day 14 ou Day 15 (assumir slip 1 dia se necessário, ver Decisão 3) — Owner: CEO
- [ ] **1ª ENTREVISTA QUALITATIVA** (30 min) — escolher Owner E (Mário próprio, auto-entrevista honesta) ou Owner A (3 dias após uso, sinal mais limpo) — Owner: CEO
  - [ ] Pedir consentimento gravação ESCRITO (gap O7 auditor): mensagem WhatsApp curta "Consentes que grave esta conversa?" + "Sim" do owner — guardar print/cópia
  - [ ] Bloco 1 (8 min): comportamento antes
  - [ ] Bloco 2 (10 min): experiência com a app
  - [ ] Bloco 3 (5 min): NPS uso + NPS recomendação
  - [ ] Bloco 4 (5 min): pricing €6.90 e €12.90
  - [ ] Encerramento (2 min)
- [ ] **Registar entrevista** em `feedback/2026-05-12-{iniciais}.md` (estrutura COO playbook) — Owner: CEO
- [ ] **RGPD CHECKLIST FINAL PRE-DEPLOY** (todos 12 itens COO validados):
  - [ ] Magic link AUTH ≤24h confirmado (NÃO o link partilha que é 48h — clarificação Decisão 5)
  - [ ] Data minimization no onboarding 3-min: só campos obrigatórios pedidos
  - [ ] Right to delete documentado em SOP (mesmo se manual)
  - [ ] Política privacidade visível no link público com valores reais
  - [ ] Termos uso alpha visíveis no Step 3
  - [ ] Checkbox consentimento prestador NÃO pre-checked
  - [ ] Consentimento owner recolhido no primeiro login
  - [ ] RLS isolamento testado entre owners (smoke test cross-owner)
  - [ ] NIF não exposto em URL/logs
  - [ ] DPA Resend confirmado (não renegociar)
  - [ ] Prazo retenção 5 anos documentado
  - [ ] Região eu-west-3 Paris confirmada
- [ ] Owner: COO+CEO

### Success criterion Day 12

4 owners (A, B, C, D) + Mário com flow iniciado. ≥4 linhas em `core.servicos_ativos` com `owner_id ≠ Mário`. 1 entrevista qualitativa completa arquivada. RGPD 12/12 itens verde.

---

## Bloco Days 10-12 — Success criterion final

- [ ] Produção verde, smoke test passou
- [ ] Stripe Connect application submitted Day 10 (não bloqueia sprint)
- [ ] 4 owners (excluindo Mário) com flow iniciado em produção real
- [ ] ≥4 linhas em `core.servicos_ativos` com `owner_id ≠ Mário`
- [ ] 1ª entrevista qualitativa completa em `feedback/`
- [ ] Gate Day 11 passado (≥3/4 critérios)
- [ ] 0 P0/P1 abertos
- [ ] RGPD checklist 12/12 verde

**Próximo bloco:** Days 13-14 — Entrevistas 2-3 + synthesis + decisão Sprint 1E.
