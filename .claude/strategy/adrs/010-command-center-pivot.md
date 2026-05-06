---
id: ADR-010
title: Command Center Pivot
date: 2026-05-04
status: Accepted
deciders: [architect-proptech, supabase-designer]
sprint: 1E
---

# ADR-010 · Command Center Pivot

## Status

Accepted · 2026-05-04

---

## Context

O `apps/dashboard` é uma SPA Vite 6 + React 18 intencionalmente minimalista: sem react-router (navegação por `useState` de tab), sem state global além do `DrawerContext`, sem Supabase, sem variáveis de ambiente, sem autenticação. Toda a informação vem de um ficheiro `public/data.json` estático gerado offline pelo parser `scripts/dashboard-data-build.js` e polling a cada 60s. Os componentes existentes (Card, Badge, Drawer, SourceTag, AgentCard, SprintProgress) estão bem estruturados e são reutilizáveis, mas o dashboard é completamente read-only — nenhum botão executa nada.

O pivot para Command Center Cook.ai-style é bloqueado por esta arquitectura read-only. Um Command Center operacional requer: sidebar persistente com 4 secções (Home / Inbox / Approvals / Agents), routing URL real com deep-linking, Inbox e Approvals queue funcionais e writáveis, suporte multi-user (Sprint 1F com ops member), e Realtime push para SLA <3min nas approvals. Em particular, a Bia — agente que compõe outreach WhatsApp para proprietários — entra em produção no Sprint 1E Phase 2 e precisa de infra operacional para submeter acções à queue e receber decisões de Mário. Polling de 60s sobre JSON estático é arquitecturalmente incompatível com este requisito.

A estratégia escolhida é **extensão incremental** do `apps/dashboard` existente, não rebuild. Os componentes existentes são reutilizados directamente (Card, Badge, Drawer, DrawerContext, SourceTag, AgentCard). Adicionam-se três dependências (react-router-dom, zustand, @supabase/supabase-js) e um schema Supabase novo (`system`) com três tabelas. O data.json e o hook `useData` continuam para dados estáticos (roadmap, competitors, stack-health). O Supabase entra especificamente para as entidades dinâmicas e persistentes (inbox, approvals). Auth entra em Phase 1.5, antes do go-live da Bia com alpha owners.

---

## Decisions

### D1 · Stack base mantida

**Vite 6 + React 18 + CSS vanilla com design tokens.** Sem migrar para Tailwind. O sistema de CSS variables existente (`--primary`, `--success`, `--danger`, `--text-dim`, etc.) é o mesmo design system do V1-core — migrar para Tailwind partiria a consistência visual e seria retrabalho sem ganho funcional. Novos componentes seguem o mesmo padrão CSS inline/classes vanilla.

### D2 · Routing — react-router-dom v6

Adicionar `react-router-dom` v6. **Alternativa rejeitada: wouter.** Wouter seria suficiente em tamanho mas react-router tem ecossistema superior para layouts aninhados e loader patterns. O Command Center vai ter 6-8 rotas distintas (`/`, `/inbox`, `/approvals`, `/agents/:id`, `/missions`, `/context`). Bundle overhead de react-router é ~15KB gzip — aceitável. `App.jsx` será refactorizado em `<Layout>` wrapper com `<Sidebar>` + `<MainArea>` + `<Outlet>`.

### D3 · State global — zustand

Adicionar `zustand` para slices novos: inbox, approvals, notifications, vertical filter. **DrawerContext existente mantém-se sem migração imediata** — refactor para zustand só se causar fricção Sprint 1F+. Zustand tem API simples, sem boilerplate, zero providers. A coexistência temporária (DrawerContext + zustand store) é aceitável durante a transição e não cria conflitos.

### D4 · Vertical filter, não workspace switcher

O dropdown top-left **filtra por vertical** (V1/V2/V4/V5) dentro do mesmo workspace operacional de Mário. Não é um workspace switcher multi-tenant Cook.ai-style. Workspaces independentes (isolamento total por tenant, billing separado, subdomain por cliente) só justificam Year 2 com Tier 2 white-label. Implementar workspace switcher agora seria over-engineering para um utilizador com 5 verticais numa única instância. A coluna `target_vertical` em `system.approvals_queue` já prepara o terreno para filtrar por vertical sem refactor de schema.

### D5 · Supabase Phase 1

**Introduzir Supabase desde Phase 1**, não diferir. O discovery report (D3 original) recomendou diferir porque o dashboard era puramente read-only — estava correcto nesse contexto. A introdução da Bia muda a equação: uma approval queue é por definição um objecto persistente e partilhado entre processos (Bia escreve, Mário lê e edita, edge function executa). Isto não é preferência arquitectural — é restrição técnica. Simular aprovações em ficheiros `.md` ou localStorage seria erro de categoria. O V1 Core Hub já tem Supabase Auth, RLS e 80+ migrations aplicadas — não se introduz nova dependência, liga-se o dashboard ao backend que já existe. Três dependências novas: `@supabase/supabase-js`, `react-router-dom`, `zustand`.

### D6 · Realtime activado na migration de criação

`ALTER PUBLICATION supabase_realtime ADD TABLE` incluído na **migration inicial** para `system.inbox_items` e `system.approvals_queue`. Não diferir. Polling de 60s é inaceitável para SLA <3min nas approvals da Bia. O Supabase Realtime já está activo no V1 (migration `day5_7` adicionou `magic_links` à publication). Adicionar as tabelas `system.*` é uma linha de SQL. O hook `useSupabase()` usa `supabase.channel().on('postgres_changes', ...)` para notificações instantâneas sem polling.

### D7 · Auth Phase 1.5

**Supabase Auth + magic-link via Resend** (V1 já tem infra — migrations `core_auth_jwt_hook_e_lookup_por_email` e série `v5_3_4_auth_*`). Phase 1.5 é uma fase dedicada entre Phase 1 UI done e Sprint 1E P2 go-live da Bia. Não faz parte do MVP da UI (Phase 1), mas é **obrigatória antes de Bia ir live com alpha owners** — a coluna `approval_decision_by uuid REFERENCES auth.users(id)` não pode ficar `null` em produção; logs de aprovações são auditoria de negócio, não debugging. Phase 1.5 requer: refactor de `App.jsx` para envolver tudo em `<AuthGuard>`, criação de página `/login`, `supabase.auth.onAuthStateChange()` para gestão de expiração de sessão, e redirect pós-login para `/approvals`.

### D8 · RLS via `public.is_staff()` existente

A função `public.is_staff()` foi **descoberta pelo supabase-designer** como já existente desde Sprint 3.4D (`sql/23_v5_3_4d_staff_roles.sql`). Consulta `core.staff_roles` (não `core.staff` — esse é legacy sem auth awareness). É `STABLE SECURITY DEFINER` com `GRANT EXECUTE TO authenticated`. **Não criar `system.is_staff()` — seria duplicado.** O architect review referenciou `core.staff` por engano; a tabela correcta é `core.staff_roles` com colunas `auth_user_id`, `active`, `revoked_at`. Todas as policies do schema `system` usam `public.is_staff()` directamente. Sprint 1F multi-user resolve-se com um único `INSERT INTO core.staff_roles` — sem migration de RLS.

### D9 · Schema `system` com 3 tabelas

Criar schema `system` como namespace separado para infra operacional interna. **Não alterar `v5_manutencao.pedidos_orcamento`** — approvals é orthogonal ao lifecycle do pedido de negócio. As 3 tabelas:

- **`system.inbox_items`** — eventos/notificações de agentes e watchers. Colunas: `source` CHECK (bia/watcher/agent/manual/system), `vertical` CHECK (v1/v2/v4/v5/null), `item_type` CHECK (daily_roundup/alert/escalation/new_pedido/audit_report/system), `payload jsonb`, `status` CHECK (active/archived).
- **`system.inbox_reads`** — junction table para read state por utilizador. PK composta `(inbox_item_id, user_id)`. Escala para multi-user sem refactor.
- **`system.approvals_queue`** — acções compostas por agentes que requerem aprovação. FK `pedidos_orcamento_id REFERENCES v5_manutencao.pedidos_orcamento(id) ON DELETE CASCADE`. Colunas: `draft_message`, `edited_message`, `classification jsonb`, `prestador_suggested jsonb` (snapshot, não FK — preserva histórico se prestador for removido), status CHECK (pending/approved/edited_approved/dismissed), `decision_by uuid REFERENCES auth.users(id)`, `dismiss_reason`.

RLS: READ para `authenticated` via `public.is_staff()`. INSERT apenas via `service_role` (agentes/edge functions bypass RLS). UPDATE para staff em items pending.

### D10 · Read state via junction table

**`jsonb array` rejeitado** como mecanismo de read state em `inbox_items`. Problemas:

- Array cresce sem bound à medida que staff aumenta
- Operadores `ANY()` não usam btree — requerem GIN index com overhead de manutenção
- UPDATE é rewrite da linha inteira (MVCC bloat)
- RLS não consegue filtrar eficientemente sobre array membership por user
- Uma coluna partilhada entre utilizadores expõe quem leu o quê (surface de privacidade desnecessária)

**Junction table `system.inbox_reads`** com PK composta `(inbox_item_id, user_id)` resolve todos estes problemas. Custo: JOIN adicional por query. Para o volume esperado (<1000 inbox items/mês), negligível. Sprint 1F (ops member) funciona sem alterar tabela, queries ou RLS.

---

## Consequences

### Pros

- Estimativa 6-8h de trabalho total para Phase 1 + Phase 1.5
- `public.is_staff()` já existe — zero trabalho de RLS function
- Realtime resolve SLA <3min da Bia nativamente sem polling
- 60-70% dos componentes existentes reutilizados directamente (Card, Badge, Drawer, SourceTag, AgentCard)
- Sprint 1F multi-user resolve-se com um `INSERT` em `core.staff_roles`, sem migration de schema
- Schema `system` isolado — não contamina tabelas de negócio V5 com colunas operacionais
- Junction table `inbox_reads` escala para N utilizadores sem refactor

### Cons

- 3 dependências novas (react-router-dom ~15KB, zustand ~3KB, @supabase/supabase-js ~80KB) aumentam bundle ~70KB gzip total
- Dois contextos de state em paralelo durante transição (DrawerContext legado + zustand store novo)
- Phase 1.5 (auth) bloqueia go-live da Bia com alpha owners se não for entregue a tempo
- Realtime publication adiciona load à instância Supabase V1 — negligível ao volume actual mas relevante a escalar
- `expires_at` em `approvals_queue` é informacional; enforcement real de SLA requer pg_cron (diferido para Phase 1.5+)

### Migration path

- `useData.js` divide-se em `useStaticData()` (mantém fetch/polling data.json) + `useSupabase()` (auth + queries Supabase + Realtime)
- `App.jsx` refactorizado em `<Layout>` + `<Sidebar>` + routes — tab state `useState` substituído por react-router
- Sprint 1F: ops member entra com `INSERT INTO core.staff_roles` — sem breaking change
- Year 2: se Tier 2 white-label chegar, vertical filter refactora para workspace switcher com `core.memberships` já existente

---

## References

- `.claude/strategy/sops/dashboard-discovery.md` — auditoria completa do dashboard antes do pivot
- `.claude/strategy/sops/architect-review-command-center.md` — revisão D6 (Supabase Phase 1) e D7 (Auth Phase 1.5)
- `.claude/strategy/sops/supabase-schema-command-center.md` — DDL completo das 3 tabelas, RLS, indexes, Realtime
- `.claude/strategy/sops/command-center-pivot-plan.md`
- `.claude/employees/bia.md`
- `.claude/strategy/references/frameworks/business-harness.md`
- `.claude/strategy/references/platforms/cookai.md`
