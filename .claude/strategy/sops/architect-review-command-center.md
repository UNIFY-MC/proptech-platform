---
title: Architect Review · Command Center Pivot
date: 2026-05-04
status: finalizado
author: architect-proptech
---

# Architect Review · Command Center Pivot

## D6 · Supabase Phase 1

**Decisão final:** accept

**Justificação:**
O discovery report recomendou diferir Supabase porque nesse momento o dashboard era puramente read-only — e estava certo nesse contexto. A introdução da Bia muda a equação completamente. Uma approval queue é, por definição, um objecto persistente e partilhado entre processos: a Bia escreve, o Mário lê e edita, uma edge function actua. Isto não é uma questão de preferência de arquitectura — é uma restrição técnica. Tentar simular aprovações em ficheiros .md ou localStorage seria um erro de categoria, não uma simplificação. Além disso, o V1 Core Hub já tem Supabase Auth, RLS, e 80+ migrations aplicadas — não estamos a introduzir uma nova dependência, estamos a ligar o dashboard ao backend que já existe. O custo de +2h em Phase 1 é real mas trivial face ao custo de refactoring forçado em Sprint 1F quando a queue crescer.

**Schema strategy:** criar `system` como schema novo e separado — NÃO alterar `v5_manutencao.pedidos_orcamento` nem nenhuma tabela existente.

Justificação desta escolha: `v5_manutencao.pedidos_orcamento` é uma tabela de negócio do V5 — representa pedidos de clientes finais para orçamentos de manutenção. Uma approval queue de acções da Bia é uma entidade de sistema operacional interno, conceptualmente diferente. Misturar as duas em alterações à mesma tabela criaria acoplamento semântico falso: as colunas `approval_*` não fazem sentido na maioria dos pedidos V5, e uma query de negócio V5 teria de filtrar sistematicamente lixo de sistema. O schema `system` resolve isto de forma limpa — é um namespace separado para infra operacional interna, não exposto a clientes.

Tabelas propostas para `system`:

```sql
-- Itens que chegam ao inbox (read-only para Mário — escrita por agentes/edge functions)
system.inbox_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL,          -- 'bia', 'watcher', 'agent', 'manual'
  vertical      text,                   -- 'v5', 'v2', null (transversal)
  title         text NOT NULL,
  body          text,
  metadata      jsonb DEFAULT '{}',
  status        text NOT NULL DEFAULT 'unread',  -- 'unread','read','archived'
  read_at       timestamptz,
  archived_at   timestamptz
)

-- Acções que requerem aprovação humana antes de executar
system.approvals_queue (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  source_agent          text NOT NULL,          -- 'bia', 'vertical-builder', etc.
  action_type           text NOT NULL,          -- 'whatsapp_send', 'db_insert', 'deploy', etc.
  action_payload        jsonb NOT NULL,          -- payload completo para a edge function
  target_vertical       text,                   -- 'v5', 'v2', null
  composed_by           text,                   -- 'bia' ou agent id
  composed_at           timestamptz NOT NULL DEFAULT now(),
  status                text NOT NULL DEFAULT 'pending',
                        -- 'pending','approved','rejected','sent','failed'
  decision_by           uuid REFERENCES auth.users(id),  -- quem aprovou/rejeitou
  decision_at           timestamptz,
  decision_edit         text,                   -- edições feitas pelo Mário antes de aprovar
  execution_at          timestamptz,            -- quando a edge function executou
  execution_result      jsonb,                  -- resposta da edge function (WhatsApp API, etc.)
  expires_at            timestamptz             -- deadline para resposta (SLA <3min)
)
```

**Riscos identificados:**
- **CORS e auth no dashboard:** o dashboard em Vercel não tem Supabase — adicionar chamadas Supabase requer `@supabase/supabase-js` no package.json do `apps/dashboard/` e variáveis de ambiente `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Sem isto nada funciona. Atenção: anon key é pública (vai para o bundle), mas a anon key do V1 está correcta por design — RLS protege o que deve ser protegido.
- **Realtime vs polling:** a approval queue é time-sensitive (<3min). Polling de 60s é inaceitável aqui. Phase 1 deve usar `supabase.channel().on('postgres_changes', ...)` para Realtime na tabela `system.approvals_queue`. Supabase Realtime já está activo no V1 (migration `day5_7` adicionou magic_links ao publication). Adicionar `approvals_queue` à publicação é uma linha de SQL.
- **RLS desde o início:** tabelas `system.*` devem ter RLS activo desde a primeira migration. Sem RLS, anon key exporia todas as approvals. Policy mínima para Phase 1 ver D7 abaixo.
- **expires_at não é auto-enforcement:** a coluna `expires_at` não cancela a aprovação sozinha — é só metadata. Se quiser SLA real, precisa de uma edge function cron (pg_cron ou Supabase Scheduled Functions) que mova `pending` para `expired` após X minutos. Diferir para Phase 1.5 ou 2.

**Conditions if any:**
- Realtime deve ser activado para `system.approvals_queue` na migration de criação (não diferir).
- RLS obrigatório na migration inicial — sem estado intermédio sem RLS.
- inbox_items e approvals_queue ficam em `system.*`; roadmap/competitors/stack-health continuam em data.json (decisão correcta, manter).

---

## D7 · Auth Phase 1.5

**Decisão final:** accept

**Stack confirmada:** Supabase Auth + magic-link via Resend — stack correcta, sem alternativa melhor neste contexto.

Justificação: o V1 já tem Supabase Auth em produção com magic-link (migrations `core_auth_jwt_hook_e_lookup_por_email`, `criar_auth_users_condominos_prata_2a`, e toda a série `v5_3_4_auth_*`). Adicionar magic-link ao dashboard é ligar um switch já instalado, não construir nova infraestrutura. Resend já é o email transaccional da plataforma. Qualquer alternativa (Clerk, Auth0, NextAuth) introduziria dependência nova desnecessária e quebraria a coerência com V5 e o resto do V1.

O timing Phase 1.5 (antes de Sprint 1F com ops member) está correcto. Sprint 1E é Mário-only mas `decision_by` sem auth vai gerar logs ambíguos que nunca se limpam — e logs de aprovações de Bia são auditoria de negócio, não debugging. Vale as 4-6h de setup agora.

**RLS strategy Sprint 1E:**

Sprint 1E é Mário-only. A policy mais simples que não precisará de refactor para Sprint 1F é basear tudo em `auth.uid()` desde o início, com um helper que verifica se o utilizador é staff:

```sql
-- Helper (já pode existir em core, verificar antes de criar)
CREATE OR REPLACE FUNCTION system.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.staff
    WHERE auth_user_id = auth.uid()
    AND active = true
  );
$$;

-- RLS em system.inbox_items
ALTER TABLE system.inbox_items ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer staff activo
CREATE POLICY "staff_read_inbox"
  ON system.inbox_items FOR SELECT
  USING (system.is_staff());

-- Escrita (INSERT): edge functions usam service_role — bypass RLS
-- Logo: anon/authenticated só lê; service_role escreve. Sem policy de INSERT para authenticated.

-- Update (marcar como lido/arquivado): staff pode fazer UPDATE nos seus campos
CREATE POLICY "staff_update_inbox_status"
  ON system.inbox_items FOR UPDATE
  USING (system.is_staff())
  WITH CHECK (system.is_staff());

-- RLS em system.approvals_queue
ALTER TABLE system.approvals_queue ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer staff activo
CREATE POLICY "staff_read_approvals"
  ON system.approvals_queue FOR SELECT
  USING (system.is_staff());

-- Update (aprovar/rejeitar/editar): staff pode actualizar decision_*
CREATE POLICY "staff_decision_approvals"
  ON system.approvals_queue FOR UPDATE
  USING (system.is_staff() AND status = 'pending')
  WITH CHECK (system.is_staff());

-- INSERT: só service_role (Bia/edge functions) — sem policy authenticated
```

**Migration path Sprint 1F multi-user:**

A policy `system.is_staff()` já suporta múltiplos utilizadores desde Sprint 1E — qualquer `auth_user_id` na tabela `core.staff` com `active = true` terá acesso. Para Sprint 1F, quando entrar o ops member:

1. `INSERT INTO core.staff (auth_user_id, nome, role, active) VALUES (<uid_ops>, 'Nome', 'ops', true)` — sem migration necessária.
2. Se quiser separar o que cada role vê (ex: ops vê só inbox, não approvals): criar coluna `role` check na policy `system.is_staff()` ou policies separadas por role. Isso é uma migration aditiva, não uma reescrita.
3. Não há breaking change porque a função `is_staff()` abstrai a lógica de autorização — o resto das policies não muda.

Aviso: verificar antes de criar `is_staff()` se já existe uma função equivalente no schema `core` (a migration `core_rls_policies_e_api_rpc` pode tê-la definido). Se existir, usar essa e não criar duplicado em `system`.

**Riscos identificados:**
- **Magic-link delivery timing:** Resend entrega em <5s normalmente mas pode atrasar. Para Command Center time-sensitive, o flow de login não deve ser no critical path de uma aprovação. Mário deve estar logado antes de a Bia submeter — não há "login agora para aprovar". Implementar redirect pós-login para `/approvals` com estado preservado.
- **Session expiry:** Supabase Auth por defeito expira tokens JWT a cada hora (refresh automático). No dashboard Vercel sem SSR, o refresh client-side deve ser gerido por `supabase.auth.onAuthStateChange()`. Se não implementado, sessão morre silenciosamente e as queries Supabase falham sem aviso ao utilizador. Obrigatório implementar handler de expiração.
- **Anon key no bundle vs auth:** após Phase 1.5 o dashboard tem auth, mas o anon key continua visível no bundle JS (normal e esperado). A protecção real vem de RLS. Não há segredo aqui — é o modelo Supabase by design.

---

## Implicações para o pivot plan

1. **Prompt de instalação de dependências deve incluir `@supabase/supabase-js`** além de `react-router-dom` e `zustand`. São três dependências novas em Phase 1, não duas.

2. **Variáveis de ambiente obrigatórias em Vercel:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` têm de ser configuradas no projecto Vercel `proptech-agentic-ops` antes do primeiro deploy com Supabase. Sem isto, o build passa mas as chamadas falham em runtime. Adicionar ao checklist de Phase 1.

3. **Migration de schema `system`** deve preceder qualquer implementação de Inbox ou Approvals. O supabase-designer deve receber trigger com DDL completo das duas tabelas (ver D6 acima) antes de o vertical-builder tocar nos componentes.

4. **Realtime publication:** adicionar linha a migration de criação do schema:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE system.approvals_queue;
   ```
   Isto é o que permite notificações instantâneas no browser sem polling — crítico para SLA <3min.

5. **useData.js terá de dividir em dois hooks distintos:**
   - `useStaticData()` — mantém o fetch/polling actual para data.json (roadmap, competitors, etc.)
   - `useSupabase()` — handle de auth + queries para inbox_items + approvals_queue com Realtime
   Misturar os dois no mesmo hook vai tornar-se difícil de testar e debugar.

6. **Approvals UI é writable — requer gestão de optimistic updates:** quando Mário clica "Aprovar", o estado local deve mudar imediatamente (optimistic) antes de a response do Supabase chegar, caso contrário a UI parece lenta. Isto não é trivial com useState simples — reforça a necessidade de Zustand para estado de approvals.

7. **Auth Phase 1.5 deve ser Prompt separado** no pivot plan (ex: Prompt 4.5 ou Phase 1.5 dedicada). Não pode ser adicionado a meio de outro prompt — requer refactor de App.jsx para envolver tudo em `<AuthGuard>` e criar página `/login`.

---

## Open questions

- **Schema `system` vs `core` para inbox/approvals:** coloquei em `system` porque é infra operacional interna. Mas `core` já tem `agent_audit_log` — há argumento para colocar `inbox_items` também em `core`. A distinção é: `core` é dados de negócio transversal (CRM, pessoas, imoveis), `system` é infra de operação do Command Center. Manter separados é mais limpo a longo prazo. Rever em Sprint 1F se o `core` acabar por absorver mais responsabilidades operacionais.

- **expires_at enforcement:** decidido diferir para Phase 1.5 ou 2, mas se o SLA de <3min for hard requirement desde Sprint 1E, deve subir de prioridade. Depende de quantas approvals a Bia vai gerar — se for 2-3/dia, SLA é informal e expires_at é só auditoria. Se escalar, precisa de cron.

- **Workspace switcher:** o discovery menciona workspace switcher (seleccionar vertical). Com Supabase Auth e `core.memberships` já existentes, isto torna-se possível em Sprint 1F. A coluna `target_vertical` em `system.approvals_queue` já prepara o terreno para filtrar approvals por vertical. Nenhuma acção agora, mas vale ter em conta ao desenhar a UI de Approvals.

- **Bia como auth.user vs service_role:** decidi implicitamente que Bia usa service_role para escrever em `system.approvals_queue` (bypass RLS). Alternativa seria criar um `auth.user` para a Bia com role próprio — mais auditável mas mais complexo. Para Sprint 1E, service_role é suficiente e mais simples. Reavaliar quando houver múltiplos agentes a escrever.
