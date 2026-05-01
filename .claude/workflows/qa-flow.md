# QA Flow — Manual Browser Testing

> Inspirado em gstack `/qa` skill. Adaptado para Sprint 1D
> Receipt Trojan Horse alpha test contexto.

## Quando usar

- Após codificar mockup → React component (Day 7+)
- Antes de partilhar link com 1º alpha owner
- Antes de cada commit que toca UX

## Setup

1. `npm run dev` (porta 5173 typical Vite)
2. Open Chrome DevTools → Mobile viewport (iPhone 12 Pro 390×844)
3. Network tab → Throttle "Slow 3G" (simula owner Wi-Fi fraco)

## Test matrix Sprint 1D

### Flow 1 — Owner partilha link

- [ ] Casa screen carrega < 2s em Slow 3G
- [ ] Botão "Pedir trabalho" visível sem scroll
- [ ] Tap botão → Sheet abre com 3 opções: WhatsApp, Email, Copy link
- [ ] Tap WhatsApp → wa.me URL com mensagem pre-preenchida
- [ ] Mensagem WhatsApp tem placeholder correcto: {OWNER}, {LINK}
- [ ] Link gerado tem formato: `proptech.app/r/{TOKEN}` (TOKEN ≥ 32 chars)
- [ ] Sem console errors

### Flow 2 — Prestador onboard

- [ ] Open link em browser sem auth → land na página onboarding
- [ ] Sem login wall (magic link auth implícita via token)
- [ ] Step 1 → Step 2 transition smooth (< 300ms)
- [ ] Validation mostra red border em campos vazios
- [ ] Submit Step 3 → Success state visível
- [ ] Token re-use → erro "Link já utilizado" (1-time use)
- [ ] Token expired (TTL 48h) → erro "Link expirado"

### Flow 3 — Owner vê resposta

- [ ] Casa screen mostra card "Prestador respondeu" inline
- [ ] Pulse animation suave (não distrai)
- [ ] Tap card → modal com proposta detalhada
- [ ] Botões Accept / Decline visíveis sem scroll modal

## Bugs encontrados

Para cada bug:

1. Screenshot DevTools (Cmd+Shift+4 macOS / Win+Shift+S Windows)
2. Save em `.claude/sprints/1D-receipt-trojan-horse/qa/bug-NNN.png`
3. Add issue GitHub com label `bug, sprint-1d`
4. Body: steps to reproduce, expected, actual, screenshot link

## Test em real device (alpha owner Mário)

Antes de partilhar com amigos:

- [ ] Abre dashboard em iPhone real (não só DevTools mobile)
- [ ] Wi-Fi corte 5s → recovery comportamento ok?
- [ ] Modo escuro do device — UI legível?
- [ ] Zoom acessibilidade (3x text size) — layout não quebra?

## SLA bugs durante alpha

- P0 (bloqueia flow inteiro): fix < 2h
- P1 (degradação UX significativa): fix < 24h
- P2 (cosmético): backlog próximo sprint
