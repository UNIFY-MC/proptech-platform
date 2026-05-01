# Sprint 1D — Days 13-14 — Entrevistas + Synthesis + Decisão Sprint 1E

**Datas:** 2026-05-13 (Ter) → 2026-05-15 (Qui — hard deadline)
**Duração:** 2 dias (Day 13 + Day 14, com Day 14 = 2026-05-15 por contagem inclusiva 14 dias)
**Owner principal:** CEO (entrevistas + synthesis + decisão), Auditor + CTO + CPO (review final Day 14)
**Bloco success criterion:** 3+ entrevistas qualitativas concluídas; synthesis.md escrito se ≥3; success criteria charter avaliados; decisão Sprint 1E documentada.

---

## Day 13 — 2026-05-13 (Ter) — Entrevistas 2 e 3 + recolha bugs residuais

**Objectivo do dia:** completar 2 entrevistas qualitativas de 30 min para chegar a 3 totais (com a de Day 12). Garantir critério 4 do charter cumprido.

### Tasks

- [ ] **2ª ENTREVISTA QUALITATIVA** (Owner A — agendada Day 9, 4 dias após uso): seguir COO script — Owner: CEO
  - [ ] Consentimento gravação escrito antes
  - [ ] 4 blocos do COO playbook
  - [ ] Registar `feedback/2026-05-13-{iniciais-A}.md`
- [ ] **3ª ENTREVISTA QUALITATIVA** (Owner B — agendada Day 10, 3 dias após uso): seguir COO script — Owner: CEO
  - [ ] Consentimento gravação escrito antes
  - [ ] 4 blocos
  - [ ] Registar `feedback/2026-05-13-{iniciais-B}.md`
- [ ] **Verificação qualitativa do auditor** (Decisão 3 — gate qualitativo): se 3/3 entrevistas têm NPS ≥8 + zero crítica concreta + zero fricção mencionada, marcar `synthesis.md` como **inconclusivo** (selection bias confirmado) e flaggar para Sprint 1E recrutar owners fora da rede pessoal — Owner: CEO+Auditor
- [ ] **Recolha de bugs residuais** dos owners B, C, D que tenham mandado mensagem entre Day 10-13 — Owner: CEO+CTO
- [ ] **Triage final P2/P3** para `tasks/p2-p3-backlog.md` (deferidos 1E) — Owner: CEO
- [ ] **Daily log update** em `tasks/daily-log.md` — Owner: CEO
- [ ] **Opcional**: 4ª entrevista (Owner C ou D) se schedule permitir e Mário tem energia — buffer para garantir critério 4 — Owner: CEO

### Success criterion Day 13

3 entrevistas qualitativas completas e arquivadas em `feedback/*.md`. Critério qualitativo do auditor avaliado (selection bias detectado ou não). 0 P0/P1 abertos.

---

## Day 14 — 2026-05-15 (Qui — hard deadline) — Synthesis + Success criteria + Decisão Sprint 1E

**Objectivo do dia:** avaliar formalmente os 5 success criteria do charter. Escrever synthesis qualitativa. Tomar decisão go/continue/pivot/kill para Sprint 1E. **Sprint termina 18h.**

### Tasks manhã (10h-13h)

- [ ] **Verificação success criterion 1** — 5 owners convidados (lista nominal): contar entradas em `tasks/alpha-owners.md` com status "convidado" — Owner: CEO
- [ ] **Verificação success criterion 2** — ≥1 owner end-to-end completo: query Supabase MCP `SELECT COUNT(*) FROM core.servicos_ativos WHERE owner_id != $mario_id` — esperado ≥1 (idealmente 4 com A, B, C, D) — Owner: CTO
- [ ] **Verificação success criterion 3** — 0 incidentes P0: review `audit_log` (se existir) + lista de bugs P0 abertos durante sprint — Owner: Auditor + CTO
- [ ] **Verificação success criterion 4** — ≥3 entrevistas: contar ficheiros `feedback/*.md` com estrutura completa (4 blocos preenchidos) — Owner: CEO
- [ ] **Verificação success criterion 5** — UX 1C-lite shipped: confirmar commit em `main` + smoke test live (Casa unificada, sem tab Início) — Owner: CPO
- [ ] **Documentar resultado em `tasks/sprint-1D-outcome.md`**: tabela 5 critérios × Sim/Não + evidência (linha SQL, hash commit, lista ficheiros) — Owner: CEO

### Tasks tarde (14h-17h)

- [ ] **Escrever `feedback/synthesis.md`** se ≥3 entrevistas, seguindo estrutura COO playbook:
  - [ ] Padrões (≥2 entrevistas)
  - [ ] Surpresas (contra-hipóteses)
  - [ ] Top 3 fricções
  - [ ] Sinais willingness-to-pay (€6.90 — X/3, €12.90 — X/3)
  - [ ] NPS médio uso + NPS médio recomendação
  - [ ] Acções recomendadas Sprint 1E
- [ ] **Se synthesis declarado inconclusivo** (gate qualitativo Day 13): flag explícito + recomendação Sprint 1E recrutar fora-rede — Owner: CEO

### Tasks 18h — DECISÃO FINAL Sprint 1E

- [ ] **Ritual 60 min**: CEO + Auditor + CPO + CTO conjunto. Não é assíncrono. — Owner: CEO orquestra
- [ ] **Avaliar 5 critérios** binariamente:
  - 5/5 verde + sinal positivo → **CONTINUE**
  - 3-4/5 com 1+ critério crítico fallback → **CONTINUE COM AJUSTES**
  - ≤2/5 ou critério 3 (P0) falhou → **PIVOT/KILL**
- [ ] **Decisão registada** em `tasks/sprint-1D-outcome.md` com:
  - [ ] Resultado (CONTINUE / CONTINUE COM AJUSTES / PIVOT / KILL)
  - [ ] Aprendizagens top 3 (do synthesis.md)
  - [ ] Scope proposto Sprint 1E (1 página)
  - [ ] Sprint 1E start date (provavelmente 2026-05-16 ou 2026-05-18 conforme weekend)
- [ ] **Entrada em `.claude/current/decisions-log.md`** — entrada nova com decisão Sprint 1E — Owner: CEO
- [ ] **Update `.claude/current/q2-2026-okrs.md`**: KR 3.1, 3.3, 3.4 status + KR 2.1 status (UX 1C-lite shipped) — Owner: CEO
- [ ] **Stripe Connect status check**: KYC respondeu? Se sim, billing operacional para Sprint 1E. Se não, follow-up email Stripe — Owner: CEO

### Success criterion Day 14 — sprint inteiro

- [ ] 5 success criteria avaliados Sim/Não com evidência documentada
- [ ] synthesis.md escrito ou marcado inconclusivo com justificação
- [ ] Decisão Sprint 1E tomada (CONTINUE / CONTINUE COM AJUSTES / PIVOT / KILL)
- [ ] decisions-log.md actualizado
- [ ] OKRs Q2 2026 actualizados com progresso real
- [ ] Stripe status conhecido (aprovado/pendente)
- [ ] **Sprint encerrado às 18h, hard deadline respeitado**

---

## Bloco Days 13-14 — Success criterion final

- [ ] 3+ entrevistas qualitativas em `feedback/*.md`
- [ ] synthesis.md escrito (ou inconclusivo justificado)
- [ ] sprint-1D-outcome.md com 5 critérios avaliados + decisão Sprint 1E
- [ ] decisions-log.md + OKRs actualizados
- [ ] Sprint encerrado dentro do hard deadline

---

## Pós-sprint (não conta para 14 dias)

Itens a executar nos primeiros 2-3 dias de Sprint 1E (não bloqueiam o encerramento de 1D):

- 4ª entrevista (Owner C ou D, agendada Day 14-15) se não conseguida em Day 13
- Stripe Connect approval landing (se KYC ainda pendente)
- Postmortem de qualquer P0/P1 que tenha aparecido durante sprint
- Limpeza de magic_links expirados (cron job ou manual em Sprint 1E)
- Email follow-up aos 4 alpha owners: "obrigado, em breve mais novidades" (assumption 4 do auditor — evitar ghost de alpha→pagante)

**Sprint 1D fim. Sprint 1E começa.**
