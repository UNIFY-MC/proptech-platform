# Decision Log — PropTech Platform

> Formato: `YYYY-MM-DD | Owner | Decisão | Racional | Status`
> Scope: decisões cross-functional e estratégicas. Decisões técnicas puras → ADRs em `.claude/ADRs/`.

---

## 2026-05-02 — R2 Alpha Outreach adiado indefinidamente

**Decisão:** Adiar o R2 alpha outreach (gate original 2026-05-04, Day 7 da Sprint 1D) até infra estar pronta.

**Razões (Mário, 2026-05-02 ~13h):**
1. App V5 nunca foi testada end-to-end em mobile real (apenas localhost desktop)
2. Vercel deploy V5 alpha não está executado (URL público inexistente)
3. Risco de má primeira impressão com alpha owners reais se algo falhar no onboarding

**Triggers para reagendar R2:**
1. Vercel deploy V5 alpha completo + URL público funcional
2. Self-test E2E em iOS Safari + Android Chrome com sucesso (magic-link arrives, deep-link opens, recibo upload, share-back)

**Bloqueio actual:** Sprint 1E P0 (commercial stack + deploy split) ainda não iniciado.

**Self-deadline auto-imposto:** Vercel deploy + mobile E2E até [DEFINIR]. R2 outreach até [DEFINIR depois do deploy].

**Risco assumido:** sem novo prazo concreto, esta decisão pode prolongar-se indefinidamente. Próxima sessão de planeamento (até 2026-05-04, decisão CPO ou solo) tem que definir os 2 prazos acima.

**Refs:**
- verticals-state.md (V5 Decisão pendente P0)
- current-sprint-state.md (Sprint 1D actual)
- ADR pendente: Sprint 1E P0 charter

---

## 2026-05-02 (16h) — V5 alpha + Dashboard live em Vercel

**URLs em produção:**
- V5 alpha: https://proptech-v5-alpha.vercel.app
- Dashboard agentic-ops: https://proptech-agentic-ops.vercel.app

**Configuração V5 (Vercel):**
- Framework: Vite 6 + React 19
- Root: apps/v5-manutencao
- Install: `cd ../.. && npm install` (monorepo workspaces)
- Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Auto-deploy: activo (push main → rebuild)

**Configuração Dashboard (Vercel):**
- Framework: Other (HTML estático)
- Root: docs/dashboard
- Sem build, sem env vars

**Configuração Supabase V1 (auth/url-configuration):**
- Site URL: https://proptech-v5-alpha.vercel.app (anterior: Netlify URL)
- Redirect URLs adicionados: localhost:5175 (DEV) + Vercel paths
- V4 Energia confirmado standby → URL produção V4 não adicionado (será futuro deploy separado)

**Findings importantes:**
- V5 SignupScreen usa `window.location.origin` para emailRedirectTo (boa prática — funciona em DEV e prod sem env var)
- V2 produção (prataowners.pt) NÃO afectada — Supabase diferente
- V4 fica em standby, deploy próprio quando reactivado

**Próximos passos:**
- Smoke test mobile V5 (sessão futura)
- @supabase-designer revê RLS policies V5
- Edge function /inspect-image (substituir VITE_ANTHROPIC_API_KEY exposta)
- Dashboard com dados vivos (sessão dedicada, ~3h)

---

## 2026-05-02 (15h) — Rotação SUPABASE_SERVICE_ROLE_KEY V1 adiada

**Contexto:** Durante configuração inicial Vercel, a `SUPABASE_SERVICE_ROLE_KEY` do projecto V1 (`hkmvszkpxjbxmnixzqbl`) apareceu inadvertidamente em chat Anthropic ao colar conteúdo de `.env.local`.

**Estado actual:**
- Chave NÃO está em git (gitignore confirmado, nunca commited)
- Chave NÃO está hardcoded em código (todas as edge functions lêem de `Deno.env.get()`)
- Chave está em uso em 11 ficheiros: 7 edge functions V5 + 3 edge functions raiz + 1 script seed
- Supabase está em transição para novo formato (Publishable + Secret API keys), legacy keys deprecated
- Não há botão "Regenerate" individual para legacy service_role; única opção é "Reset JWT secret" que invalida TODAS as chaves + sessões

**Decisão:** Adiar rotação para evitar refactor durante setup Vercel. Manter chave actual.

**Risco assumido:** chave passou por logs Anthropic (enterprise, baixa probabilidade de abuso, retenção ~30 dias). V5 ainda não tem produção real, V2 está em Supabase diferente (não afectado).

**Trigger para acção (rotação obrigatória):**
1. Antes do primeiro alpha owner real testar V5 (sessão pré-R2 outreach)
2. OU antes de migrar V5 de DEV para produção real
3. OU se vires queries anómalas em Supabase logs / billing spike

**Plano de rotação quando vier o tempo:**
- Opção A (cirúrgica): Reset JWT secret em V1 → atualizar `.env.local` + Supabase secrets → testar 11 ficheiros (~15 min)
- Opção B (refactor): Migrar para novo formato Publishable+Secret API keys → mudar 11 ficheiros para usar `SUPABASE_SECRET_KEY` em vez de `SUPABASE_SERVICE_ROLE_KEY` → ~1h

**Refs:**
- Edge Functions affected: `apps/v5-manutencao/supabase/functions/{agent-casa-advisor, agent-image-inspector, agent-test, delete-account, gerar-magic-link, prestador-onboarding, weather-forecast}` + `supabase/functions/{delete-account, gerar-magic-link, v4-energia-lead}`
- Script affected: `apps/v5-manutencao/scripts/seed-codigos-postais.ts`
- Supabase URL página API Keys: https://supabase.com/dashboard/project/hkmvszkpxjbxmnixzqbl/settings/api-keys

---

## 2026-05-01

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Day 5 SHIPPED — UI owner-side "Registar trabalho" + reposicionamento above-fold |
| **Racional** | Camada 1 funnel 100% UI-driven sem curl needed. Owner pode gerar magic link directamente do app, partilhar via WhatsApp, ver lista de trabalhos recentes acima do fold. |
| **Status** | ✅ Done |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO + Mário |
| **Decisão** | Day 5.5 SHIPPED — Linkagem equipamento_id em magic_links + recibos_servico |
| **Racional** | Owner pode linkar trabalho a equipamento existente. Schema discovery revelou equipamentos (13 rows) + intervencoes_equipamento (HomeHealth Record) já ricos. Foundation Sprint 1E muito mais pronta que esperado. |
| **Status** | ✅ Done |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Day 5.6 — Naming pivot: "registar trabalho" ≠ "emitir recibo fiscal" |
| **Racional** | Camada 1 (V5 actual) = trust ledger documentado, sem implicação fiscal. Camada 2 (Sprint 1E) = recibo fiscal real com NIF, IVA, Stripe Connect + Moloni. UI strings renomeadas; schema rename recibos_servico → trabalhos_documentados diferido para Sprint 1E (com outras migrations em voo). |
| **Status** | ✅ Done |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário + CTO |
| **Decisão** | Day 5.7 — Mixed feed lifecycle (pending + completed) à Jobber/Shipshape |
| **Racional** | Owner vê magic_links pending + recibos completed num único feed cronológico com badges. Badges: 🟡 "Aguardando prestador · há X min", 🔴 "Expirado", 🟢 "Concluído". Realtime 2 canais (recibos_servico INSERT + magic_links INSERT/UPDATE). Header counter: N pendentes (amber) > N novos 24h (green). Action buttons em pending (Cancelar/Reenviar) diferidos Sprint 1E. |
| **Status** | ✅ Done |

---

## 2026-04-30

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | CEO (Mário) |
| **Decisão** | V5 Architecture v2: Casa tab = Início+Casa fundidos; Owners Club = tab dedicada |
| **Racional** | Duplicação Início/Casa cria confusão em UX; owners precisam de um "comando central" claro. Owners Club merece tab própria para monetizar gamification. |
| **Status** | ✅ APROVADA → Sprint 1C |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | CEO + CTO |
| **Decisão** | Setup C-Suite agents (7 personas) em `.claude/agents/` para orquestração de decisões |
| **Racional** | Solo founder precisa de sounding boards especializados. Agents reduzem viés de confirmação e forçam análise multi-perspectiva antes de decisões críticas. |
| **Status** | ✅ APROVADA → Sprint A executado |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | Mário |
| **Decisão** | Brain cost discipline: cap €100/mês Anthropic API até 1º owner pagante, alerta automático aos €80 |
| **Racional** | Runway preservation — agents escalam custo se não disciplinados; sem clientes pagantes não há receita para cobrir |
| **Status** | ✅ APROVADA |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | Mário |
| **Decisão** | Receipt Trojan Horse: build directo + alpha 5 owners convidados (não smoke pre-build) |
| **Racional** | Alta convicção estratégica — build é validation real; demand-pulls-supply é core insight, não hipótese a validar com mock |
| **Status** | ✅ APROVADA → Sprint 1D |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | Mário |
| **Decisão** | ~~Sprint A em `feat/1b5a-foundations-analysis`~~ → **Sprint A em `main`** (branch already merged via `f9fea5c`) |
| **Racional** | Diagnostic descobriu branch fechada |
| **Status** | ⚠️ Superseded por entrada abaixo |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-04-30 |
| **Owner** | CTO |
| **Decisão** | Sprint A commit directo em `main` + atomic commits (Sprint A separado de 1B.5A Phase 2) |
| **Racional** | Concerns diferentes (agents infra vs database schema); melhor git hygiene; revert independente possível |
| **Status** | ✅ APROVADA |

---

## 2026-05-01

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | 1B.5A Phase 2 Path A: NÃO re-aplicar SQLs (já aplicados via dashboard, IF NOT EXISTS protege mas risk > benefit) |
| **Racional** | SQLs descobertos como already-applied via Supabase MCP diagnostic — re-aplicar seria inócuo mas introduz risco desnecessário |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Pricing alignment 2.B: master plan correcto (€6.90/€12.90), DB tinha valores antigos (€9.99/€24.99). UPDATE aplicado |
| **Racional** | Master plan = source of truth para pricing estratégico; DB estava desalinhado por ter sido seedado antes da decisão de pricing final |
| **Status** | ✅ Approved & Applied |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Migration tracking gap reconhecido: SQL 1 (equipamento_extras) aplicado via Supabase dashboard sem registo em `schema_migrations` |
| **Racional** | Aceitar gap e documentar; futuro: usar sempre `apply_migration` MCP em vez de SQL editor manual |
| **Status** | ✅ Acknowledged |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CMO v3 |
| **Decisão** | Competitor monitoring 4-tier structure aprovado (25 entidades, custo ~€0.76/mês) |
| **Racional** | Context expansion via Notion analysis revelou FIXO como threat CRÍTICO (Fidelidade-owned); TaskRabbit activo em PT desde 2017; coverage completa exige 4 cadências distintas |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Lisbeyond removido de competitor scope (rentals diferente do owner maintenance) |
| **Racional** | Scope rentals/Airbnb não compete com V5 owner maintenance; future B2B partner candidate para V8 Imobiliário ou partnership rental managers |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | P0 security audit: `VITE_ANTHROPIC_API_KEY` em `App.jsx` (browser-side) viola ADR-004. Risk actual LOW (não deployed), risk futuro CRITICAL |
| **Racional** | Audit pre-Sprint B build revelou 7 referências a direct Anthropic fetch do browser em `apps/v5-manutencao/src/App.jsx`. Key value não está em git. |
| **Status** | ⚠️ TODO pre-launch — blocker para V5 production deploy |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Sprint B build aprovado: usa workspace key `ci-watchers` separada (sem `VITE_` prefix), zero overlap com `App.jsx` |
| **Racional** | `App.jsx` refactor é pre-launch concern, não bloqueia Sprint B — os watchers correm em CI server-side, não no browser |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | 7 architecture decisions Sprint B aprovadas: 3 workflows separados, healthcheck 4º, hybrid output (artifact + Issue), `ANTHROPIC_API_KEY` sem `VITE_` |
| **Racional** | Ver `.claude/strategy/sprint-b-architecture.md` — matrix não suporta crons mistos; hybrid output resolve mobile sync sem poluir git history |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Sprint B Lite COMPLETE: 3 watchers (competitor-monitor weekly, daily-brief, weekly-recap) + healthcheck activos, todos crons ON |
| **Racional** | Validated end-to-end: 4 issues criadas, outputs CMO-grade quality |
| **Status** | ✅ Done |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Token economics validated: $0.60/mês total (cap €5/mês = 8x margin) |
| **Racional** | Cost discipline preserved |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CEO via weekly-recap #8 |
| **Decisão** | "W18 must shift energy from building to recruiting 5 alpha owners" — strategic priority Sprint 1D > Sprint 1C |
| **Racional** | Platform technically strong, zero real users = validation gap dominates |
| **Status** | ⚠️ Decisão Mário pendente |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Hubbent (hubbent.com) added Tier 1 weekly competitor monitoring |
| **Racional** | Identificado em rodapé observação Mário; entrante recente PT, dual-app architecture |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CMO |
| **Decisão** | Hubbent threat=ALTO classification provisional pending W18 investigation (founders, capital, tracção) |
| **Racional** | Insufficient public data hoje, but dual-app + "maior plataforma" claim warrants Tier 1 |
| **Status** | ⚠️ Reassess W18 |

---

## 2026-05-01 (Sprint 1D debate)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CEO via debate multi-agent |
| **Decisão** | Sprint 1D charter approved: Receipt Trojan Horse Alpha owner-first 14-day MVP |
| **Racional** | Hubbent+FIXO+Jobber pressure forces validation-first; CEO weekly-recap #8 "shift energy from building to recruiting 5 alpha owners" |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | No Stripe Connect MVP iteration 1 — info/contacto flow only |
| **Racional** | KYC PT compliance 2-3 weeks dilui sprint focus; validate demand first; Stripe process initiated Day 10 para eliminar lead time para 1E |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CPO |
| **Decisão** | UX 1C-lite scope: Casa+Início merge + Receipt flow inline only |
| **Racional** | Other 1C items (Owners Club tab, weather bug) adiados — focus discipline; 8 screens definidos com reuse inventory |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Auditor |
| **Decisão** | Top 3 risks P×I: (1) Schema mismatch CPO vs CTO — tabela recibos não existe P×I=25; (2) Entrevistas Day 15-17 fora do sprint P×I=20; (3) Edge fn confirm-receipt ausente no CTO plan P×I=20 — todos resolvidos em 06-final-plan.md |
| **Racional** | Pre-mortem standard practice; CONDITIONAL GO → GO após Day 0 reconciliações |
| **Status** | ⚠️ Mitigations approved via 06-final-plan.md Decisions 1-7 |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | COO |
| **Decisão** | Alpha recruitment: 5 owners (Mário + 4 rede pessoal) + prestador outreach manual (fora-app) |
| **Racional** | Demand-pulls-supply Receipt Trojan Horse strategy; prestador real diferido para 1E por Auditor recommendation |
| **Status** | ✅ Approved |

---

## 2026-05-01 (Sprint 1D Day 0.5)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Live Dashboard HTML em `docs/dashboard/` via GitHub Pages |
| **Racional** | Auto-refresh 5min, GitHub API client-side, zero backend, mobile-friendly. Setup one-time: repo Settings → Pages → /docs |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Skip gstack full install durante Sprint 1D |
| **Racional** | Scope creep risk num sprint de 14 dias; conflito potencial com `.claude/agents/` existentes; muitos commands para apps deployed que não se aplicam |
| **Status** | ✅ Approved |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Adoptar 2 gstack-style files: `qa-flow.md` + `review-pr.md` em `.claude/workflows/` |
| **Racional** | 80% do valor de gstack com 5% do setup overhead; checklists adaptadas ao contexto Sprint 1D (magic links, RLS, VITE_ anti-pattern) |
| **Status** | ✅ Approved |

---

## 2026-05-01 (Tese estratégica)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Tese 2-camadas clarificada: V5 owner-side + V5-pro prestador-side, magic-link como ponte |
| **Racional** | Diferenciação vs Hubbent/OSCAR (single-side marketplaces) — cada owner activo é funil de supply; aquisição prestadores custo €0 |
| **Status** | ✅ Approved |

---

## 2026-05-02 (Sprint 1D Day 2)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-02 |
| **Owner** | CTO |
| **Decisão** | RPC `create_prestador_and_recibo_atomic` deployed + 4/4 smoke tests PASS |
| **Racional** | Day 2 gate cleared, edge functions live |
| **Status** | ✅ Done |

---

## 2026-05-02 (Sprint 1D Day 3)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-02 |
| **Owner** | CTO |
| **Decisão** | Day 3 `PrestadorOnboardingFlow` + 6 sub-components + RPC pública `get_magic_link_public_info` aplicada via Supabase MCP |
| **Racional** | Frontend prestador onboard end-to-end pronto; `/join/:token` routing state-based (sem react-router); RPC SECURITY DEFINER com GRANT anon — landing mostra owner_primeiro_nome + tipo_servico + valor antes do submit |
| **Status** | ✅ Done |

---

## 2026-05-01 (Sprint 1D Day 3 — E2E PASS)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Day 3 SHIPPED — E2E PASS browser modo anónimo, recibo a0869efc emitido, IP capturado |
| **Racional** | Camada 1 Receipt Trojan Horse functionally complete end-to-end. Backend + edge fns + frontend + RPC pública all green. |
| **Status** | ✅ Done |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Princípio Sprint 1E "consolidar máximo funções para revisão" + reuso magic-link como ponte permanente owner↔prestador |
| **Racional** | Defer to Sprint 1E charter; captado em camada-2-prestador-app-spec-v2-delta.md |
| **Status** | ✅ Approved |

---

## 2026-05-01 (Sprint 1D Day 4 — Owner-side UX PASS)

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | CTO |
| **Decisão** | Day 4 SHIPPED — Trabalhos recentes secção + realtime channel + 2 recibos visíveis |
| **Racional** | Camada 1 owner-side complete: owner vê em tempo real quando prestador completa magic-link onboarding. Bug fix documented (authUser.pessoa_id → useAuth() hook). |
| **Status** | ✅ Done |

---

| Campo | Valor |
|---|---|
| **Data** | 2026-05-01 |
| **Owner** | Mário |
| **Decisão** | Feedback Day 4: posicionamento "Trabalhos recentes" deve ser above-the-fold (não no final) + linkagem trabalho ↔ equipamento |
| **Racional** | Defer to Day 5 polish (mover posição) + Sprint 1E (equipamento_id FK). Captado em camada-2-prestador-app-spec-v2-delta.md. |
| **Status** | ✅ Approved |

---

## Template para novas entradas

```
---

| Campo | Valor |
|---|---|
| **Data** | YYYY-MM-DD |
| **Owner** | CEO / CFO / CTO / CMO / CPO / COO |
| **Decisão** | [Descrição clara da decisão — o que foi escolhido] |
| **Alternativas rejeitadas** | [O que foi considerado e descartado] |
| **Racional** | [Porquê esta opção] |
| **Dependências** | [O que esta decisão bloqueia ou desbloqueia] |
| **Status** | ✅ APROVADA / 🟡 PENDENTE / ❌ REJEITADA |
| **Review date** | YYYY-MM-DD (quando rever se assumo reversível) |

```
