# Sprint 1D — Days 5-9 — Onboarding Flow + Owner Side + E2E Testing

**Datas:** 2026-05-05 (Seg) → 2026-05-09 (Sex)
**Duração:** 5 dias
**Owner principal:** CPO+dev (Days 5-7), CTO (Day 9), CEO (Day 8 = Owner E onboarding)
**Bloco success criterion:** Owner-side completo Day 7; Owner E (Mário) faz flow E2E em produção Day 8; edge cases cobertos Day 9; Owner A onboarded Day 9.

---

## Day 5 — 2026-05-05 (Seg) — Casa+Início merge (UX 1C-lite)

**Objectivo do dia:** unificar IniciaScreen + CasaScreen numa única tab "Casa". Tab "Início" removida da bottom nav.

### Tasks

- [ ] **Backup de IniciaScreen.jsx** (não deletar — segurança gap O auditor) — Owner: dev
- [ ] **Mover componentes de IniciaScreen para CasaScreen.jsx**: saudação personalizada, score card, alertas predictivos, selector imóvel inline, weather widget — Owner: CPO+dev
- [ ] **Manter no topo da CasaScreen**: saudação > selector imóvel > score > alertas > weather > divider "MEUS PRESTADORES" (vazio neste dia) > divider "A SUA CASA" > equipamentos > documentos > histórico — Owner: CPO+dev
- [ ] **Remover tab "Início" da bottom nav** em `App.jsx` — Owner: dev
- [ ] **Routing**: rota default pós-login = `CasaScreen` — Owner: dev
- [ ] **DrawerMenu** — remover link "Início" se existir — Owner: dev
- [ ] **Smoke test mobile + desktop**: garantir que score card, weather hook, selector imóvel inline funcionam — Owner: CPO+CEO valida visualmente
- [ ] **Verificar que `useWeatherForecast` não quebra** com merge (não tocar na lógica do bug "Todos imóveis" Modo A — out of scope) — Owner: dev

### Success criterion Day 5

Tab única "Casa" em prod (staging) sem regressão. Score + alertas + weather + equipamentos + docs + histórico todos visíveis num único screen com scroll natural. Tab "Início" não aparece em bottom nav.

---

## Day 6 — 2026-05-06 (Ter) — Receipt card + ReceiptForm inline

**Objectivo do dia:** secção "MEUS PRESTADORES" em CasaScreen com card "Registar serviço" que expande inline para form de 3 campos.

### Tasks

- [ ] **Componente `ReceiptCard.jsx`** com 6 estados: idle, form_open, loading, link_ready, pending, confirmed — Owner: CPO+dev
- [ ] **Estado idle**: dashed border + ícone `+` + texto "Registar serviço · Envie link ao prestador" — Owner: CPO
- [ ] **Estado form_open** (toque expande in-place, NÃO modal): 3 campos — tipo_servico (picker 8 categorias), valor_eur (€ teclado numérico), data_servico (date picker default hoje); botões "Gerar link" + "Cancelar" — Owner: CPO+dev
- [ ] **Imóvel activo já seleccionado** via `ImovelAtivoContext` — não pedir de novo — Owner: dev
- [ ] **Estado loading**: spinner no botão "Gerar link", campos disabled — Owner: CPO
- [ ] **Validação client-side**: tipo obrigatório, valor > 0, data ≤ hoje — Owner: dev
- [ ] **Toque "Cancelar"** colapsa para idle sem perder dados (ux nice-to-have, deferir se atrasar) — Owner: dev
- [ ] **Reuse `States.jsx`** para loading/error/empty states padronizados — Owner: dev

### Success criterion Day 6

Card "Registar serviço" visível na secção "MEUS PRESTADORES" da CasaScreen. Toque expande in-place para form 3 campos. Cancelar colapsa. Validação visual em tempo real. Não navega para nova página em momento nenhum.

---

## Day 7 — 2026-05-07 (Qua) — Gerar link + Web Share + GATE Day 7 às 18h

**Objectivo do dia:** botão "Gerar link" chama edge function `gerar-magic-link` (Day 2) e mostra URL com Web Share API + Copy fallback.

### Tasks

- [ ] **Toque "Gerar link"** → fetch POST a `/functions/v1/gerar-magic-link` com `Authorization: Bearer ${session.access_token}` — Owner: dev
- [ ] **Estado link_ready**: mostrar `app.casa/r/{token}` truncado + 2 botões: "Partilhar" (Web Share API) + "Copiar link" (clipboard fallback) — Owner: CPO+dev
- [ ] **Web Share API call**: `navigator.share({ url, text: "Recibo de [tipo_servico] €[valor]" })` — Owner: dev
- [ ] **Fallback se Web Share não disponível** (gap P5 auditor): copy directo com toast "Link copiado!" 2s — Owner: dev
- [ ] **Tratamento erro 429** (rate limit 10 links/dia): toast "Já criaste o máximo de links hoje. Tenta amanhã ou apaga um link pendente." — Owner: CPO+dev
- [ ] **Persistir estado pending em CasaScreen**: card colapsa com badge cinzento "Aguarda prestador" — Owner: dev
- [ ] **GATE 18h: CEO + Auditor agent review 30 min**:
  - [ ] ≥1 owner já aceitou convite (não conta Mário)
  - [ ] Pitch script funcionou em ≥1 conversa real
  - [ ] Build em "verde" — flow funciona end-to-end em staging com prestador-mock
  - [ ] 0 P0 abertos
  - **Decisão registada em `tasks/day-07-checkpoint.md`** — Owner: CEO

### Success criterion Day 7

Owner em CasaScreen: preenche form → toque "Gerar link" → recebe URL → Web Share abre folha nativa OU clipboard funciona → card colapsa para estado pending. **+ Gate Day 7 passado: ≥3/4 critérios OK ou kill criteria activado.**

---

## Day 8 — 2026-05-08 (Qui) — Realtime + ReceiptConfirmadoScreen + ONBOARDING OWNER E

**Objectivo do dia:** owner vê em tempo real quando prestador completa onboarding. Mário (Owner E) faz flow E2E pessoal em produção.

### Tasks

- [ ] **Realtime subscription em CasaScreen** para `core.servicos_ativos` filtrado por `owner_id = current_user_id` — Owner: dev
- [ ] **Quando subscription dispara**: card muda de "Aguarda prestador" (cinzento) para "Recibo arquivado" (verde) com nome prestador — Owner: CPO+dev
- [ ] **ReciboDetalheScreen.jsx**: novo screen mostra nome prestador + NIF + valor + data + tipo + imóvel + botão "Partilhar recibo" (Web Share text) + botão "Guardar em Drive" (disabled tooltip "Em breve") — Owner: CPO+dev
- [ ] **Notificação browser** (best-effort): se permission concedida, push "Recibo de [tipo] confirmado por [nome]" — Owner: dev
- [ ] **Email Resend backup** (gap auditor #10): edge function dispara email para `auth.users.email` com link de volta a Casa — Owner: CTO
- [ ] **OWNER E — MÁRIO ONBOARDING PESSOAL** em produção (não staging): criar link real, abrir noutro device/incognito, completar onboarding como prestador-mock, verificar realtime update, ver recibo arquivado — Owner: CEO
- [ ] **Registar todos os bugs/fricções** em `feedback/2026-05-08-mc.md` (Mário owner #1) — Owner: CEO
- [ ] **Se P0 detectado**: STOP, não avançar Day 9 com owners reais até resolvido — Owner: CEO+CTO

### Success criterion Day 8

Mário completa flow E2E em produção: gera link, prestador-mock completa onboarding noutro device, recibo aparece em Casa screen via realtime sem reload manual. ≥1 linha em `core.servicos_ativos` com `owner_id = Mário` (não conta para critério 2 mas valida pipeline). 0 P0 abertos.

---

## Day 9 — 2026-05-09 (Sex) — E2E testing + ONBOARDING OWNER A

**Objectivo do dia:** edge cases cobertos com mensagens amigáveis. Owner A (primeiro owner real ≠ Mário) onboarded.

### Tasks

- [ ] **Teste edge case: token expirado** — owner abre `/join/{token-expirado}` → mensagem "Este link expirou. Pede ao proprietário um novo link." — Owner: CTO
- [ ] **Teste edge case: token já usado** — segunda abertura do mesmo link → 409 com mensagem "Este link já foi usado. Pede ao proprietário um novo link." — Owner: CTO
- [ ] **Teste edge case: NIF inválido** (mod11 falha) — feedback tempo-real no campo + Submit bloqueado — Owner: CTO
- [ ] **Teste 5 NIFs reais** (Auditor risk #9): 1 singular Mário, 1 singular conhecido, 1 empresa Mário, 1 sociedade unipessoal, 1 cooperativa. Confirmar zero falsos negativos. Se ≥1 falha sendo válido → fix imediato — Owner: CTO+CEO
- [ ] **Teste edge case: morada vazia** — campo opcional aceita NULL, recibo é emitido na mesma — Owner: CTO
- [ ] **Teste landing page com link expirado** (Cenário 3 do auditor): GET em `/join/{token}` valida `expires_at` ANTES de mostrar dados; se expirado, mostra erro genérico "Link inválido", NÃO expõe owner_nome ou valor — Owner: CTO
- [ ] **OWNER A ONBOARDING** (chamada 15 min com Mário guiado pelo COO playbook): criar link real, partilhar com Mário-as-prestador noutro device — Owner: CEO+COO
- [ ] **Marcar entrevista qualitativa** com Owner A para Day 13 (4 dias após uso) — Owner: CEO
- [ ] **Registar em `feedback/2026-05-09-{iniciais}.md`** (só iniciais — RGPD) — Owner: CEO

### Success criterion Day 9

Todos os edge cases testados mostram mensagem amigável sem stack trace. NIF mod11 valida corretamente os 5 NIFs reais (ou fix aplicado). Owner A com flow completo em produção: ≥1 linha em `core.servicos_ativos` com `owner_id = Owner A` (≠ Mário) — **critério 2 do charter potencialmente cumprido**.

---

## Bloco Days 5-9 — Success criterion final

- [ ] UX 1C-lite shipped (Casa+Início merged, sem feature flag)
- [ ] ReceiptForm inline funcional em CasaScreen
- [ ] Web Share API + Copy fallback operacionais
- [ ] Realtime subscription faz card mudar sem reload
- [ ] ReceiptLandingScreen + PrestadorOnboardingScreen + ReceiptConfirmadoScreen + ReciboDetalheScreen criadas
- [ ] Edge cases (expirado, usado, NIF inválido, morada vazia) cobertos
- [ ] Mário (Owner E) e Owner A com flow completo em produção
- [ ] ≥1 linha em `core.servicos_ativos` com `owner_id ≠ Mário`

**Próximo bloco:** Days 10-12 — MVP completion (deploy + Stripe processo + Owners B, C, D + 1ª entrevista).
