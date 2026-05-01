# Sprint 1D — Final Plan (CEO Sign-off)

**Data:** 2026-05-01
**Sprint window:** 2026-05-01 → 2026-05-15 (14 dias)
**Status:** GO (conditional — reconciliações Day 0 obrigatórias)
**Veredicto Auditor:** CONDITIONAL GO → mover para GO confiante após Day 0 closeout das 4 decisões abaixo
**Sign-off CEO:** Mário (decisão final pertence ao humano após ler este plano)

---

## Decisions taken (resolução de divergências)

CEO/agent CEO consolida divergências entre os outputs CTO/CPO/CFO/COO/Auditor e fixa as decisões para o sprint. Cada decisão tem racional de 1 linha. Mário confirma ou contradiz antes de Day 1.

### Decisão 1 — Schemas fantasma (Auditor risk #1, #4 + gaps C1, X1, X2)

**Problema:** Charter mede `core.servicos_ativos` + `v5_manutencao.recibos`. CTO architecture só cria `magic_links` + `prestadores_parceiros`. Tabelas `recibos` e `servicos_ativos` não existem nem têm migration.

**Decisão:** Criar `core.servicos_ativos` em Day 1 (mesma migration que `magic_links`). Eliminar `v5_manutencao.recibos` da medição — substituir por `prestadores_parceiros.id` + `magic_links.used_at NOT NULL` + `core.servicos_ativos.owner_id ≠ Mário`. Charter critério 2 reescrito (ver "Approved scope").

**Racional:** Custa 30 min de SQL adicional Day 1; o oposto custa sprint inteiro a falhar critério não-mensurável Day 14.

### Decisão 2 — Prestador real vs mockado (Auditor recommendation #2)

**Problema:** COO tenta recrutar prestador real Day 13 (1 dia, baixa probabilidade). Failure mode mascarra outros sinais.

**Decisão:** REMOVE FROM SCOPE prestador real em 1D. Sprint 1D testa owner-side com prestador mock (Mário noutro device/incognito). Prestador real diferido para Sprint 1E com critério "1 prestador real onboarded antes de Day 7 do 1E". COO playbook actualizado.

**Racional:** Prestador real Day 13 tem probabilidade <40% de funcionar; failure contamina interpretação dos outros critérios; mocking é honesto sobre o que é o teste.

### Decisão 3 — Entrevistas timeline (Auditor risk #2)

**Problema:** Onboardings Day 12-13 + entrevistas 3-5 dias depois = Day 15-17 (fora do sprint). Critério 4 (≥3 entrevistas) matematicamente improvável.

**Decisão:** Antecipar onboardings: Owner E (Mário) Day 8, Owner A Day 9, Owner B Day 10, Owner C Day 11, Owner D Day 12. Entrevistas Day 12-14 (3 dias após uso, sinal qualitativo aceitável). Adicionar critério: "se 3/3 entrevistas têm NPS ≥8 e zero crítica concreta, synthesis declarado inconclusivo" (Auditor Assumption 3).

**Racional:** 3 dias entre uso e entrevista perde algum sinal qualitativo mas salva o critério inteiro; alternativa (escorregar critério para 21 dias) protela aprendizagem e adia decisão Sprint 1E.

### Decisão 4 — Edge function `confirm-receipt` (Auditor risk #3 + gap T-edge)

**Problema:** CPO Flow 2 passo 5 chama `confirm-receipt` que escreve em `core.servicos_ativos`. CTO architecture não a lista — só `gerar-magic-link` e `prestador-onboarding`.

**Decisão:** NÃO criar 3ª edge function. Estender `prestador-onboarding` para também escrever `core.servicos_ativos` na mesma transacção (1 INSERT em `prestadores_parceiros` + 1 INSERT em `core.servicos_ativos` + 1 UPDATE em `magic_links`). Renomear flow CPO de "confirm-receipt" para "prestador-onboarding" para alinhar terminologia.

**Racional:** Menos superfície de erro (1 endpoint vs 2), menos race conditions (transacção atómica), menos código a manter; nome "prestador-onboarding" descreve melhor o que acontece de facto.

### Decisão 5 — Magic link TTL conflito (Auditor risk #5)

**Problema:** CTO usa `expires_at = now() + 7 days`. COO RGPD checklist diz "≤24h" citando CNPD.

**Decisão:** Manter 7 dias para magic link de PARTILHA (link owner→prestador). COO clarifica em RGPD checklist que regra ≤24h aplica-se a magic link de AUTH Supabase (login owner), não ao link de partilha. Reduzir para **48h** o link de partilha (compromisso entre realismo de uso e exposição de PII se vazado).

**Racional:** 48h cobre fim-de-semana típico (sex→dom) sem deixar token vivo uma semana; reconcilia terminologia entre CTO e COO.

### Decisão 6 — Day 7 checkpoint formal (Auditor recommendation #5)

**Problema:** Kill criteria Day 7 ("zero owners aceitam") não tem ritual formal. COO Day 13 admite que se isto acontecer, são 6 dias queimados antes de detectar.

**Decisão:** Adicionar gate Day 7 às 18h: CEO + Auditor agent fazem review de 30 min. Se 0 owners aceitaram convite até Day 7, sprint pára (build continua mas recrutamento é replanado antes de mais código). Documentado em "Go/no-go decision points" abaixo.

**Racional:** O custo de 30 min Day 7 é trivial; o custo de descobrir Day 13 que ninguém aceitou é catastrófico.

### Decisão 7 — alpha-owners.md Day 0 obrigatório (Auditor recommendation #3)

**Problema:** Charter exige lista nominal mas não foi escrita. Se Mário não consegue listar 5 nomes Day 0, hipótese de recrutamento já está falsificada antes do build.

**Decisão:** Mário escreve `tasks/alpha-owners.md` com 7-8 nomes reais (5 alvo + 2-3 buffer) ANTES de Day 1 começar. Se em Day 0 o ficheiro não tem 5 nomes com >70% probabilidade auto-avaliada, sprint NO-GO até resolvido.

**Racional:** É a verificação mais barata possível (1h Mário) da hipótese central de recrutamento; falhar aqui poupa 14 dias de build em direcção errada.

---

## Approved scope (final)

### IN scope (build this)

- **Schema migration Day 1:**
  - `core.servicos_ativos` (NOVO) — owner_id, imovel_id, prestador_id, tipo_servico, valor, data_servico, magic_link_id, created_at
  - `v5_manutencao.magic_links` (CTO architecture)
  - `v5_manutencao.prestadores_parceiros` (CTO architecture)
  - RLS policies + GRANT (Regra FF) em todas as tabelas
- **2 edge functions:**
  - `gerar-magic-link` (auth: JWT owner)
  - `prestador-onboarding` (público; faz INSERT prestador + INSERT servicos_ativos + UPDATE link.used_at em transacção atómica)
- **Frontend:**
  - Casa+Início merge (UX 1C-lite) — IniciaScreen deprecada, conteúdo migrado para CasaScreen unificada
  - Receipt inline form em CasaScreen (3 campos: tipo, valor, data)
  - LinkGeradoCard (Web Share API + Copy fallback)
  - 3 screens novos: ReceiptLandingScreen, PrestadorOnboardingScreen, ReceiptConfirmadoScreen
  - ReciboDetalheScreen (detalhe acessível a partir de Casa)
  - Realtime subscription em `core.servicos_ativos` para actualizar Casa screen
- **Netlify:** redirect rule `/join/*` → `/index.html` (testado em branch staging antes de merge)
- **Operações:**
  - Onboarding pessoal Mário a 4 owners alpha (Owner E + A, B, C, D) — Days 8-12
  - 3+ entrevistas qualitativas (Days 12-14)
  - synthesis.md se ≥3 entrevistas
- **Stripe Connect:** abrir processo Day 10 (não para cobrar em 1D, é só para eliminar lead time KYC para 1E)
- **RGPD pre-launch checklist (12 itens COO):** todos validados antes de Day 8 (primeiro owner real)

### OUT of scope (do NOT build, do NOT discuss)

- Prestador real onboarded em Sprint 1D (diferido para 1E)
- 3ª edge function `confirm-receipt` (mergida em `prestador-onboarding`)
- `v5_manutencao.recibos` como tabela (eliminada — usamos `prestadores_parceiros` + `servicos_ativos`)
- Stripe Connect activado para cobrar em 1D (apenas processo aberto Day 10)
- Owners Club tab dedicada (1E)
- Selector imóvel centralizado global (1E)
- Weather "Todos os imóveis" Modo A bug (deferido desde 1B.4)
- V10 Copilot V2 integration (Q3)
- Marketing platform / SEO / paid acquisition
- Prestador app dedicada / mode switcher Uber-style (Q4)
- Smart Inbox cross-channel completo (1E+)
- GDPR DPA renegociation com Resend
- V4 Energia / V3 Seguros / qualquer outra vertical
- Refactor v1-core ou prataowners.pt
- Onboarding prestador <3 min (KR 3.2 deferido)
- Capacitor/mobile builds nativos
- PDF gerado server-side
- Notificações push nativas (só Resend email + browser Notification API best-effort)

---

## Approved 14-day timeline (consolidated)

Incorpora reconciliações: schema `core.servicos_ativos` Day 1, antecipação de onboardings (Day 8 → Owner E), Stripe Day 10, gate Day 7 + Day 11 + Day 14. Deriva de CTO architecture Days 1-14 + COO ops Days 10-14, ajustado para resolver Auditor risks #1, #2, #3, #4.

| Dia | Data | Componente principal | Owner | Gate / Milestone |
|-----|------|---------------------|-------|------|
| 1 | 2026-05-01 (Qui) | Schema migration: `core.servicos_ativos` (NOVO) + `v5_manutencao.magic_links` + `v5_manutencao.prestadores_parceiros` + RLS + GRANT | CTO | Tabelas visíveis em Supabase MCP, SELECT vazio sem erro |
| 2 | 2026-05-02 (Sex) | Edge function `gerar-magic-link` (Deno + JWT + rate limit + token 64 hex) | CTO | curl POST com JWT retorna URL |
| 3 | 2026-05-03 (Sab) | Edge function `prestador-onboarding` (público + NIF mod11 + INSERT atómico em 3 tabelas) | CTO | curl POST sem JWT cria prestador + servicos_ativos + UPDATE link |
| 4 | 2026-05-04 (Dom) | Rota `/join/:token` (PrestadorOnboardingScreen 3-step) + Netlify redirect rule + smoke test admin/raiz não-quebrado | CTO+CPO | URL no browser mostra form; admin/ e index.html raiz não regrediram |
| 5 | 2026-05-05 (Seg) | Casa+Início merge (UX 1C-lite) — fundir IniciaScreen+CasaScreen, ajustar bottom nav, manter score+alertas+meteo | CPO/dev | Tab "Casa" única, "Início" removida, sem regressão visível |
| 6 | 2026-05-06 (Ter) | Receipt card em CasaScreen + ReceiptForm inline (3 campos, expansão in-place) | CPO/dev | Card "Registar serviço" visível, form abre em-lugar |
| 7 | 2026-05-07 (Qua) | Gerar link UI: chamada `gerar-magic-link` + Web Share API + Copy fallback. **Gate Day 7 às 18h** (ver decision points) | CPO/dev + CEO+Auditor | Owner preenche → recebe URL → Web Share funciona; gate Day 7 passado |
| 8 | 2026-05-08 (Qui) | Estado "link pendente" + ReceiptConfirmadoScreen (lado prestador) + Realtime subscription `core.servicos_ativos`. **Onboarding Owner E (Mário próprio)** | CPO/dev + CEO | Mário (Owner E) completa flow end-to-end no telefone; bugs registados em `feedback/2026-05-08-mc.md` |
| 9 | 2026-05-09 (Sex) | E2E testing + edge cases: token expirado, token usado, NIF inválido (5 NIFs reais), morada vazia. **Onboarding Owner A** | CTO + CEO | Todos error cases mostram mensagem amigável; Owner A com flow iniciado |
| 10 | 2026-05-10 (Sab) | Deploy staging + smoke test produção. **Stripe Connect application aberta**. **Onboarding Owner B** | CTO + CEO | Mário usa flow no telefone em produção; Stripe submitted; Owner B com flow iniciado |
| 11 | 2026-05-11 (Dom) | Buffer / bugs pós smoke test. **Onboarding Owner C**. **Gate Day 11 às 18h** (ver decision points) | CTO+CPO + CEO | 0 bugs P0/P1 abertos; Owner C com flow iniciado; gate Day 11 passado |
| 12 | 2026-05-12 (Seg) | **Onboarding Owner D**. Primeira entrevista qualitativa (Owner E ou A — 30 min). RGPD checklist final pre-deploy verificada | CEO+COO | 4 owners (excl. Mário) com flow iniciado; 1 entrevista feita |
| 13 | 2026-05-13 (Ter) | 2ª e 3ª entrevistas qualitativas (Owners A, B). Registo em `feedback/`. Recolha de bugs/fricções residuais | CEO+COO | ≥3 entrevistas no total; ficheiros `feedback/*.md` criados |
| 14 | 2026-05-15 (Qui — hard deadline) | Verificação success criteria. `feedback/synthesis.md` se ≥3 entrevistas. Brief CEO decision em `tasks/sprint-1D-outcome.md`. **Kill/continue/pivot decision às 18h** | CEO+Auditor | 5 critérios charter avaliados Sim/Não; decisão Sprint 1E documentada |

> **Nota calendário:** Day 14 é 2026-05-15 (Qui) por contagem inclusiva 2026-05-01 → 2026-05-15 = 14 dias. CTO architecture e COO playbook tinham desalinhamento Day 14 vs Day 15 — fixado aqui.

---

## Approved budget

### Build cash (Sprint 1D, 14 dias)

- **Mín:** €1.50 (3 sessões C-suite leves, sem retros)
- **Máx:** €15.00 (10-15 sessões, conforme Auditor gap F4 — esta sessão de 5 outputs paralelos já consumiu equivalente a 1 sessão; com retros, postmortem e syntheses sobe)
- **Realista CEO:** **€8-€12** para o sprint inteiro

### Monthly burn incremental (pós-sprint, recorrente)

- **€0/mês** incremental no produto: ambas edge functions são pure Deno/Postgres (zero LLM no path crítico do owner). Confirmado por CTO architecture + CFO unit economics.
- Watchers Sprint B Lite background mantêm-se em $0.60/mês ≈ €0.56 (pre-existente, não conta como incremento 1D).

### Cap headroom

- Cap Anthropic: **€100/mês**
- Total estimado Maio 2026 (baseline + 1D): **€5.00–€15.00**
- Headroom: **85–95%** do cap intacto
- Threshold alerta €80: não atingido em 1D sozinho. Risco real desloca-se para Sprint 1E quando agentes LLM começam a correr para owners reais (CFO pre-condição: tracking tokens por owner_id em 1E).

### Stripe Connect

- **Activar processo Day 10** (2026-05-10).
- Não cobrar em 1D — é só para eliminar lead time KYC.
- KYC PT típico: 8–15 dias úteis → aprovação esperada 2026-05-18 a 2026-05-25.
- 1ª cobrança real candidata: Sprint 1E (após 2026-05-16).

### Tempo Mário (não cash)

- 17–28h ao longo de 14 dias (≈1.2–2h/dia)
- Custo de oportunidade: 1.2h/dia que não é vendas nem V4 Energia. Aceitável dada hipótese D-07 alta convicção.

---

## Risks acknowledged + mitigations (top 5)

Top 5 do ranking Auditor (P×I) com mitigação específica adoptada por este plano. Todos os 10 riscos do auditor foram lidos; estes são os accionáveis com plano concreto para 14 dias.

| # | Risco | P×I | Mitigação adoptada neste plano |
|---|-------|-----|-------------------------------|
| 1 | Schemas fantasma — charter mede tabelas que CTO não cria | 25 | **Decisão 1**: criar `core.servicos_ativos` Day 1; eliminar `v5_manutencao.recibos` (substituído por `prestadores_parceiros` + `servicos_ativos`). Migration completa Day 1 antes de qualquer outro trabalho. |
| 2 | Critério 4 inviável no calendário (entrevistas Day 15-17) | 20 | **Decisão 3**: antecipar onboardings para Day 8 (Owner E) → Day 12 (Owner D). Entrevistas Day 12-14, 3 dias após uso. Critério qualitativo: synthesis declarado inconclusivo se 3/3 NPS ≥8 sem crítica concreta. |
| 3 | Edge function `confirm-receipt` no CPO mas ausente no CTO | 20 | **Decisão 4**: mergir em `prestador-onboarding` (1 endpoint, transacção atómica em 3 tabelas). Renomear referências CPO. |
| 4 | Schema `core` não existe em V1 Core Hub | 20 | Coberto pela **Decisão 1** + Day 1 migration explícita: `CREATE SCHEMA IF NOT EXISTS core` antes de `CREATE TABLE servicos_ativos`. |
| 5 | Magic link TTL 7 dias vs RGPD ≤24h | 16 | **Decisão 5**: 48h para link de partilha (compromisso). Clarificar em COO RGPD checklist que ≤24h é para magic link AUTH (Supabase), não link de partilha. |

**Riscos secundários (não-top-5 mas com mitigação adoptada):**
- Risco #6 (Mário-as-prestador invalida critério 2): Decisão 2 (REMOVE prestador real) + uso de browser incognito + dispositivo separado para Owner E é OBRIGATÓRIO; "owner_id ≠ Mário" cumpre-se via Owner A-D em Days 9-12.
- Risco #7 (Netlify redirect quebra produção): smoke test admin/index.html + raiz/index.html em branch staging Day 4, ANTES de merge. Regra `[[redirects]] from = "/join/*"` específica, NÃO catch-all.
- Risco #8 (0 owners aceitam): mitigado por **Decisão 7** (alpha-owners.md Day 0 com 7-8 nomes) + **Decisão 6** (gate Day 7 obrigatório).
- Risco #10 (Resend deliverability): backup WhatsApp manual de Mário ao owner quando vir push de prestador-onboarding completo.

---

## Daily standup format

Mário precisa de cadência diária sustentável para 14 dias sem overhead. Decisão: **standup assíncrono em 1 ficheiro único, 1-line por dia, sem agents auxiliares.**

- **Canal:** ficheiro único `tasks/daily-log.md` em `.claude/sprints/1D-receipt-trojan-horse/tasks/`
- **Formato:** 1 linha por dia + 1 linha por bug/fricção encontrado, escritas pelo próprio Mário em <2 min
- **Estrutura por entrada:**
  ```
  ### Day N — YYYY-MM-DD
  - Done: [o que ficou feito]
  - Blocker: [se houver, e a quem precisa de escalar — CTO/CPO/COO/Auditor]
  - Tomorrow: [próxima acção concreta]
  ```
- **Quem lê:** Mário próprio (revisão pessoal Day 7, Day 11, Day 14). NÃO há daily-brief agent activado neste sprint para evitar gastos C-suite redundantes.
- **Frequência:** 1× por dia, fim do dia (5 min antes de fechar laptop). Se Mário falha o registo num dia, escreve no dia seguinte (skip ok, deficit não acumulável).
- **Trigger Auditor:** se 3 dias consecutivos sem entrada no log, Auditor agent activado para flag (sprint perde visibilidade).

---

## Go/no-go decision points

Gates formais com critérios binários e accionáveis. Cada gate tem owner explícito e output documentado.

### Day 0 (HOJE — 2026-05-01) — RECONCILIAÇÕES OBRIGATÓRIAS

Sprint NÃO entra em Day 1 sem estes 4 itens fechados. CEO confirma cada um por checkbox.

- [ ] **R1 — Schemas reconciliados**: Mário confirma decisão 1 (criar `core.servicos_ativos`, eliminar `v5_manutencao.recibos`). Migration plan Day 1 escrito. Owner: CEO+CTO.
- [ ] **R2 — Lista alpha owners**: ficheiro `tasks/alpha-owners.md` com 7-8 nomes reais (off-record, sem nomes completos no git — só iniciais ou códigos). Cada nome com avaliação Mário 1-10 de probabilidade de aceitar. ≥5 nomes com score ≥7. Owner: CEO exclusivamente.
- [ ] **R3 — Edge function unification**: Mário confirma decisão 4 (`prestador-onboarding` faz INSERT em 3 tabelas, NÃO criar `confirm-receipt` separada). CPO actualiza spec linguagem. Owner: CEO+CTO+CPO.
- [ ] **R4 — Onboardings antecipados**: Mário confirma decisão 3 (Owner E Day 8 vs Day 11; A-D Days 9-12 vs 12-13). COO playbook actualizado para reflectir. Owner: CEO+COO.

**Critério gate:** 4/4 boxes ticked → GO Day 1. <4 → NO-GO, sprint pára aqui.

### Day 3 (2026-05-03 Sab) — Foundations done?

**Pergunta:** Schema + 2 edge functions deployed em staging Supabase?

- [ ] `core.servicos_ativos` existe e é seleccionável via Supabase MCP
- [ ] `v5_manutencao.magic_links` + `prestadores_parceiros` existem com RLS activa
- [ ] `gerar-magic-link` responde a curl POST com JWT (token 64 hex retornado)
- [ ] `prestador-onboarding` responde a curl POST público (cria prestador + servicos_ativos + UPDATE link)

**Critério gate:** 4/4 → continuar Day 4. ≤3/4 → CTO arruma Day 4 antes de avançar Frontend; aceitar slip de 1 dia (Day 5 Frontend em vez de Day 4).

### Day 7 (2026-05-07 Qua, 18h) — Alpha owners committed? + Foundations validated

**Ritual:** CEO + Auditor agent, 30 min. CEO traz `tasks/alpha-owners.md` actualizado.

- [ ] ≥1 owner já aceitou convite (não conta Mário como Owner E — owners A-D)
- [ ] Pitch script funcionou em ≥1 conversa real
- [ ] Build em "verde" — flow funciona end-to-end em staging com prestador-mock-Mário
- [ ] 0 P0 abertos

**Critério gate:**
- 4/4 → continuar Day 8 sem alterações.
- 3/4 → continuar mas registar risco identificado em decisions-log.
- ≤2/4 ou (item 1 = 0 owners aceitaram) → **kill criteria Day 7 ACTIVATED**. Sprint pausa o build novo. CEO + COO refazem pitch antes de continuar. Postmortem mini em `tasks/day-07-checkpoint.md`.

### Day 11 (2026-05-11 Dom, 18h) — 1+ end-to-end completo?

**Pergunta:** ≥1 owner real (não-Mário) gerou link, prestador (mock OK) completou onboarding, recibo aparece arquivado?

- [ ] ≥1 linha em `core.servicos_ativos` com `owner_id ≠ Mário`
- [ ] ≥1 linha em `prestadores_parceiros` linkada a esse owner
- [ ] Realtime update funcionou: card mudou de "Aguarda prestador" para "Recibo arquivado" sem reload manual
- [ ] 0 P0/P1 abertos

**Critério gate:**
- 4/4 → continuar para fase de entrevistas Days 12-14.
- 3/4 → continuar mas accionar fix prioritário Day 12.
- ≤2/4 → activar **kill criteria Day 14 antecipado**: avaliar se sprint salva-se com Owner A em Day 12 ou se já é Day 14 borderline.

### Day 14 (2026-05-15 Qui, 18h) — Kill / continue / pivot decision

**Ritual:** CEO + Auditor + CPO + CTO, 60 min. Output: `tasks/sprint-1D-outcome.md`.

**Avaliação dos 5 success criteria do charter (binário):**

1. [ ] 5 owners convidados (Mário Owner E + A, B, C, D)
2. [ ] ≥1 owner com flow end-to-end completo (linha em `core.servicos_ativos` com `owner_id ≠ Mário`)
3. [ ] 0 incidentes P0
4. [ ] ≥3 entrevistas qualitativas com NPS + pricing question + sinal accionável (≥1 NPS ≤7 ou crítica concreta)
5. [ ] UX 1C-lite shipped em prod (Casa+Início merged, sem feature flag)

**Decisão:**
- **5/5 verde + sinal positivo** → **CONTINUE**: Sprint 1E activado, scope 1E inclui prestador real (deferido de 1D), Stripe billing, Owners Club tab.
- **3-4/5 com 1+ critério crítico FALLBACK** → **CONTINUE COM AJUSTES**: 1E começa mas com replano específico do que falhou.
- **≤2/5 ou critério 3 falhou (P0)** → **PIVOT/KILL**: parar Receipt Trojan Horse na forma actual, voltar a discussão hipótese D-07 com dados.

---

## Tasks files (gerados)

Os 4 ficheiros de tarefas seguintes foram criados em paralelo ao plano:

- `.claude/sprints/1D-receipt-trojan-horse/tasks/day-01-04-foundations.md` (Days 1-4: schema + edge functions + rota /join)
- `.claude/sprints/1D-receipt-trojan-horse/tasks/day-05-09-onboarding-flow.md` (Days 5-9: UX merge + Receipt flow + E2E testing + Owner E + Owner A)
- `.claude/sprints/1D-receipt-trojan-horse/tasks/day-10-12-mvp-completion.md` (Days 10-12: deploy + smoke test + Stripe + Owners B, C, D + 1ª entrevista)
- `.claude/sprints/1D-receipt-trojan-horse/tasks/day-13-14-alpha-recruit-feedback.md` (Days 13-14: entrevistas 2-3 + synthesis + decisão 1E)

Adicionalmente, `tasks/alpha-owners.md` e `tasks/daily-log.md` devem ser criados por Mário em Day 0 (não gerados aqui — conteúdo off-record / pessoal).

---

## Próxima decisão Mário

**Pergunta clara para CEO humano:**

Confirmas as 4 reconciliações Day 0 (R1 schemas, R2 lista 7-8 owners reais com score ≥7, R3 unificação edge function, R4 antecipação onboardings para Day 8) — ou queres que mude alguma decisão antes de Day 1 começar amanhã?

Se confirmas: sprint entra em GO. Se queres ajustar uma das 4: sprint fica em CONDITIONAL até resolver. Se queres adiar 1D inteiro: NO-GO e replanear.
