---
title: Supabase Schema Design — Command Center MVP
date: 2026-05-04
status: draft
author: supabase-designer
sprint: 1E
references:
  - architect-review-command-center.md (D6 accept, D7 accept)
  - apps/v5-manutencao/sql/23_v5_3_4d_staff_roles.sql
  - apps/v5-manutencao/sql/06_v5_3_3_14_orcamentos.sql
---

# Supabase Schema Design — Command Center MVP

Schema design para as tabelas `system.inbox_items` e `system.approvals_queue` no projecto V1 Core Hub (`hkmvszkpxjbxmnixzqbl`). Baseado em D6=accept e D7=accept do architect-proptech.

---

## Hallmarks canónicos da plataforma (aplicar aqui)

- Regra W: `ENABLE ROW LEVEL SECURITY` antes de `CREATE POLICY`
- Regra FF: `GRANT` depois de `CREATE POLICY`, em bloco contíguo
- Regra X: `GRANT EXECUTE` explícito em toda função `SECURITY DEFINER`
- `DROP POLICY IF EXISTS` antes de `CREATE POLICY` (idempotência)
- `IF NOT EXISTS` em `CREATE TABLE`, `CREATE INDEX`
- `NOTIFY pgrst, 'reload schema';` no final de cada migration

---

## Descoberta crítica — is_staff() já existe

A função `public.is_staff()` foi **já criada** em `sql/23_v5_3_4d_staff_roles.sql` (Sprint 3.4D):

```sql
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = core, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.staff_roles
    WHERE auth_user_id = auth.uid()
      AND active       = true
      AND revoked_at   IS NULL
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
```

**Implicações:**

1. A tabela usada é **`core.staff_roles`** (não `core.staff` como referenciado no architect review — `core.staff` é legacy sem auth). As RLS policies da migration `system` devem usar `public.is_staff()` directamente.

2. **NÃO criar** `system.is_staff()` — seria duplicado. O architect review propôs criá-la em `system` por precaução, mas a função já existe e está correcta no schema `public`.

3. Para adicionar Mário como staff (Sprint 1E), confirmar que `mariocarvalho.biz+v5staff@gmail.com` tem entrada em `core.staff_roles` com `active=true` e `revoked_at IS NULL`. Verificar antes de testar RLS.

---

## Decisão — Read state: junction table vs jsonb

**Problema:** o dashboard precisa saber quais inbox_items foram lidos por quem. Sprint 1E tem só Mário (1 utilizador), mas Sprint 1F adiciona ops member — design deve sobreviver sem refactor.

### Opção A — jsonb array em `inbox_items.read_by`

```sql
read_by   uuid[]    DEFAULT '{}'
```

- Query "não lidos por mim": `NOT (auth.uid() = ANY(read_by))`
- Cons:
  - Array cresce sem bound à medida que staff aumenta
  - Operadores `ANY()` não usam btree — precisam GIN index
  - UPDATE é rewrite do array inteiro (versioning + MVCC bloat)
  - RLS não consegue filtrar efficiently sobre array membership
  - Cada `inbox_item` expõe quem leu a quem (coluna partilhada entre utilizadores)

### Opção B — junction table `system.inbox_reads` ✅ (escolhida)

```sql
system.inbox_reads (
  inbox_item_id   uuid REFERENCES system.inbox_items(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (inbox_item_id, user_id)
)
```

- Query "não lidos por mim": `NOT EXISTS (SELECT 1 FROM system.inbox_reads r WHERE r.inbox_item_id = i.id AND r.user_id = auth.uid())`
- Pros:
  - Índice btree na PK composta — eficiente
  - RLS por `user_id = auth.uid()` isolada e correcta
  - Sprint 1F: ops member funciona sem alterar tabela ou queries
  - INSERT atómico no momento de leitura (sem UPDATE + array concat)
  - Sem blowup de tamanho de linha com múltiplos staff

**Custo:** JOIN adicional. Para o volume esperado (<1000 inbox items/mês), irrelevante.

---

## Schema `system` — criação

O schema `system` não existe no V1 Core Hub. Deve ser criado na migration inicial antes de qualquer tabela.

```sql
CREATE SCHEMA IF NOT EXISTS system;

-- Comentário mandatório (documenta propósito e distingue de schema business)
COMMENT ON SCHEMA system IS
  'Infra operacional interna do Command Center. '
  'NÃO exposto a clientes — só staff via dashboard. '
  'Separado de core (dados de negócio transversal) e v5_manutencao (negócio vertical).';
```

---

## Tabela 1 — `system.inbox_items`

### DDL completo

```sql
CREATE TABLE IF NOT EXISTS system.inbox_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Origem e classificação
  source        text        NOT NULL
                  CHECK (source IN ('bia', 'watcher', 'agent', 'manual', 'system')),
  vertical      text
                  CHECK (vertical IS NULL OR vertical IN ('v1', 'v2', 'v4', 'v5')),
  item_type     text        NOT NULL
                  CHECK (item_type IN (
                    'daily_roundup',
                    'alert',
                    'escalation',
                    'new_pedido',
                    'audit_report',
                    'system'
                  )),

  -- Conteúdo
  title         text        NOT NULL CHECK (length(trim(title)) > 0),
  body          text,
  payload       jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Estado do item (não do read state — esse fica em inbox_reads)
  status        text        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'archived')),
  archived_at   timestamptz,
  archived_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE system.inbox_items IS
  'Eventos e notificações gerados por agentes/watchers/sistema para atenção do staff. '
  'Read state (lido por quem) fica em system.inbox_reads.';
COMMENT ON COLUMN system.inbox_items.payload IS
  'Dados estruturados específicos do item_type. '
  'Ex: new_pedido → {pedido_id, categoria, localizacao}. '
  'Ex: alert → {severity, service, message}.';
COMMENT ON COLUMN system.inbox_items.vertical IS
  'Vertical de negócio associada. NULL = cross-vertical ou infra.';
```

### Indexes

```sql
-- Query primária do dashboard: inbox não arquivado, mais recente primeiro
CREATE INDEX IF NOT EXISTS idx_inbox_items_status_created
  ON system.inbox_items(status, created_at DESC)
  WHERE status = 'active';

-- Filtro por vertical (tabs no dashboard)
CREATE INDEX IF NOT EXISTS idx_inbox_items_vertical_created
  ON system.inbox_items(vertical, created_at DESC)
  WHERE status = 'active';

-- Filtro por type
CREATE INDEX IF NOT EXISTS idx_inbox_items_type
  ON system.inbox_items(item_type, created_at DESC);
```

### Query padrão (unread por vertical)

```sql
-- "Inbox items não lidos, por vertical, sorted by created_at desc"
SELECT i.*
FROM system.inbox_items i
WHERE i.status = 'active'
  AND i.vertical = 'v5'           -- ou IS NULL para cross-vertical
  AND NOT EXISTS (
    SELECT 1 FROM system.inbox_reads r
    WHERE r.inbox_item_id = i.id
      AND r.user_id = auth.uid()
  )
ORDER BY i.created_at DESC;
```

---

## Tabela 1b — `system.inbox_reads` (read state)

### DDL completo

```sql
CREATE TABLE IF NOT EXISTS system.inbox_reads (
  inbox_item_id   uuid        NOT NULL REFERENCES system.inbox_items(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (inbox_item_id, user_id)
);

COMMENT ON TABLE system.inbox_reads IS
  'Registo de quem leu qual inbox_item. '
  'INSERT ao marcar como lido. DELETE para marcar como não lido. '
  'Sprint 1F: multi-user funciona sem alterar esquema.';
```

### Indexes

```sql
-- Lookup "o que já li" — PK já cobre (inbox_item_id, user_id)
-- Lookup "todos os leitores de um item" — coberto por PK

-- Lookup inverso: "todos os items lidos por user X, sorted recente"
CREATE INDEX IF NOT EXISTS idx_inbox_reads_user_read
  ON system.inbox_reads(user_id, read_at DESC);
```

---

## Tabela 2 — `system.approvals_queue`

### DDL completo

```sql
CREATE TABLE IF NOT EXISTS system.approvals_queue (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),

  -- Agente que gerou a acção (Bia, outro agente, manual)
  source_agent          text        NOT NULL
                          CHECK (source_agent IN ('bia', 'casa_advisor', 'image_inspector', 'manual')),

  -- Tipo de acção a executar após aprovação
  action_type           text        NOT NULL
                          CHECK (action_type IN (
                            'whatsapp_send',
                            'email_send',
                            'db_insert',
                            'db_update',
                            'deploy',
                            'api_call'
                          )),

  -- Vertical de negócio associada
  target_vertical       text
                          CHECK (target_vertical IS NULL OR target_vertical IN ('v1', 'v2', 'v4', 'v5')),

  -- Referência ao pedido V5 que originou esta acção (se aplicável)
  pedido_orcamento_id   uuid
                          REFERENCES v5_manutencao.pedidos_orcamento(id) ON DELETE CASCADE,

  -- Conteúdo da acção — payload completo para a edge function executar
  action_payload        jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Mensagem de outreach composta pela Bia
  draft_message         text        NOT NULL CHECK (length(trim(draft_message)) > 0),
  edited_message        text,       -- preenchido se Mário editar antes de aprovar

  -- Classificação da Bia (estruturada, para auditoria e aprendizagem)
  classification        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Shape esperado:
  -- { "categoria": "canalização", "sub_categoria": "fuga", "confianca": 0.87 }

  -- Prestador sugerido pela Bia (snapshot — não FK para evitar coupling com prestadores table)
  prestador_suggested   jsonb,
  -- Shape esperado:
  -- { "id": "uuid", "nome": "João Pedreiro", "distancia_km": 2.3, "rating": 4.8 }

  -- Status da aprovação
  status                text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',          -- aguarda decisão de Mário
                            'approved',         -- aprovado sem edição
                            'edited_approved',  -- aprovado com edição na mensagem
                            'dismissed'         -- rejeitado/dispensado
                          )),

  -- Decisão
  decision_at           timestamptz,
  decision_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  dismiss_reason        text,       -- preenchido só quando status = 'dismissed'

  -- Execução (preenchido após edge function correr)
  execution_at          timestamptz,
  execution_result      jsonb,

  -- SLA
  expires_at            timestamptz,  -- timestamp informacional; não é auto-enforcement

  -- Consistência: campos de decisão exigem status não-pending
  CONSTRAINT approvals_decision_requires_status
    CHECK (
      (decision_at IS NULL AND decision_by IS NULL) OR
      (status IN ('approved', 'edited_approved', 'dismissed'))
    ),

  -- dismiss_reason só faz sentido quando dismissed
  CONSTRAINT approvals_dismiss_reason_only_on_dismissed
    CHECK (
      dismiss_reason IS NULL OR status = 'dismissed'
    ),

  -- edited_message só faz sentido quando edited_approved
  CONSTRAINT approvals_edited_message_on_edited_approved
    CHECK (
      edited_message IS NULL OR status IN ('pending', 'edited_approved')
    )
);

COMMENT ON TABLE system.approvals_queue IS
  'Acções compostas por agentes (Bia, etc.) que requerem aprovação humana antes de executar. '
  'Mário aprova/edita/rejeita no Command Center dashboard. '
  'Edge function executa após status = approved ou edited_approved.';

COMMENT ON COLUMN system.approvals_queue.draft_message IS
  'Mensagem composta pela Bia (WhatsApp, email, etc.). '
  'Imutável após criação — edições de Mário ficam em edited_message.';

COMMENT ON COLUMN system.approvals_queue.classification IS
  'JSON estruturado: {categoria, sub_categoria, confianca float 0-1}. '
  'Gerado pela Bia na composição. Usado para auditoria e fine-tuning.';

COMMENT ON COLUMN system.approvals_queue.prestador_suggested IS
  'Snapshot do prestador sugerido. Snapshot (não FK) porque prestador pode ser eliminado '
  'mas o histório de sugestão deve ser preservado para auditoria.';

COMMENT ON COLUMN system.approvals_queue.expires_at IS
  'SLA informacional. Não cancela a aprovação automaticamente. '
  'Auto-enforcement via pg_cron diferido para Phase 1.5.';
```

### Indexes

```sql
-- Query primária do dashboard: pending por vertical, mais antigo primeiro (FIFO)
CREATE INDEX IF NOT EXISTS idx_approvals_pending_vertical_created
  ON system.approvals_queue(target_vertical, created_at ASC)
  WHERE status = 'pending';

-- Lookup por pedido_orcamento (para mostrar histórico no drawer do pedido)
CREATE INDEX IF NOT EXISTS idx_approvals_pedido
  ON system.approvals_queue(pedido_orcamento_id, created_at DESC)
  WHERE pedido_orcamento_id IS NOT NULL;

-- Histórico de decisões por utilizador
CREATE INDEX IF NOT EXISTS idx_approvals_decision_by
  ON system.approvals_queue(decision_by, decision_at DESC)
  WHERE decision_by IS NOT NULL;

-- Lookup por source_agent (para auditoria por agente)
CREATE INDEX IF NOT EXISTS idx_approvals_source_agent
  ON system.approvals_queue(source_agent, created_at DESC);
```

### Query padrão (pending approvals por vertical)

```sql
-- "Pending approvals, V5, mais antigos primeiro (FIFO)"
SELECT *
FROM system.approvals_queue
WHERE status = 'pending'
  AND target_vertical = 'v5'
ORDER BY created_at ASC;
```

---

## RLS — ambas as tabelas

```sql
-- ── system.inbox_items ────────────────────────────────────────────────────
ALTER TABLE system.inbox_items ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer staff activo lê tudo
DROP POLICY IF EXISTS "staff_read_inbox_items" ON system.inbox_items;
CREATE POLICY "staff_read_inbox_items"
  ON system.inbox_items FOR SELECT TO authenticated
  USING (public.is_staff());

-- UPDATE (arquivar): staff pode arquivar
DROP POLICY IF EXISTS "staff_archive_inbox_items" ON system.inbox_items;
CREATE POLICY "staff_archive_inbox_items"
  ON system.inbox_items FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- INSERT: apenas service_role (agentes/edge functions) — sem policy authenticated
-- service_role bypassa RLS por design Supabase

-- GRANT (Regra FF — depois das POLICIES)
GRANT SELECT, UPDATE ON system.inbox_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.inbox_items TO service_role;


-- ── system.inbox_reads ────────────────────────────────────────────────────
ALTER TABLE system.inbox_reads ENABLE ROW LEVEL SECURITY;

-- SELECT: staff vê apenas os seus próprios reads
DROP POLICY IF EXISTS "staff_read_own_reads" ON system.inbox_reads;
CREATE POLICY "staff_read_own_reads"
  ON system.inbox_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_staff());

-- INSERT: staff insere apenas as suas próprias leituras
DROP POLICY IF EXISTS "staff_insert_own_reads" ON system.inbox_reads;
CREATE POLICY "staff_insert_own_reads"
  ON system.inbox_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_staff());

-- DELETE: staff pode "desmarcar como lido" os seus próprios
DROP POLICY IF EXISTS "staff_delete_own_reads" ON system.inbox_reads;
CREATE POLICY "staff_delete_own_reads"
  ON system.inbox_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_staff());

-- GRANT (Regra FF)
GRANT SELECT, INSERT, DELETE ON system.inbox_reads TO authenticated;
GRANT ALL ON system.inbox_reads TO service_role;


-- ── system.approvals_queue ────────────────────────────────────────────────
ALTER TABLE system.approvals_queue ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer staff activo lê tudo
DROP POLICY IF EXISTS "staff_read_approvals" ON system.approvals_queue;
CREATE POLICY "staff_read_approvals"
  ON system.approvals_queue FOR SELECT TO authenticated
  USING (public.is_staff());

-- UPDATE: staff pode decidir (aprovar/rejeitar) apenas items pending
DROP POLICY IF EXISTS "staff_decide_approvals" ON system.approvals_queue;
CREATE POLICY "staff_decide_approvals"
  ON system.approvals_queue FOR UPDATE TO authenticated
  USING (public.is_staff() AND status = 'pending')
  WITH CHECK (public.is_staff());

-- INSERT: apenas service_role (Bia/edge functions)
-- GRANT (Regra FF)
GRANT SELECT, UPDATE ON system.approvals_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.approvals_queue TO service_role;
```

---

## Realtime — publication

```sql
-- Adicionar ambas as tabelas à publication do Supabase Realtime
-- (activado em migration de criação — não diferir)
ALTER PUBLICATION supabase_realtime ADD TABLE system.inbox_items;
ALTER PUBLICATION supabase_realtime ADD TABLE system.approvals_queue;

-- inbox_reads não precisa de Realtime (dashboard re-query após marcar lido é suficiente)
```

---

## Ordenação das migrations

A migration do schema `system` deve respeitar esta ordem de dependências:

```
1. [EXISTENTE] core.pessoas, core.organizations, core.staff_roles — já aplicadas
2. [EXISTENTE] v5_manutencao.pedidos_orcamento — já aplicada (sql/02_v5_casa_schema.sql + 06_orcamentos.sql)
3. [EXISTENTE] public.is_staff() — já aplicada (sql/23_v5_3_4d_staff_roles.sql)
4. [NOVA] Migration system schema: criar schema + inbox_items + inbox_reads + approvals_queue
```

Nome sugerido para a migration (formato timestamp):
`20260504_system_command_center_schema.sql`

---

## Checklist pré-aplicação (Regra Z)

- [ ] Confirmar que `public.is_staff()` existe: `SELECT public.is_staff();` (retorna true para staff)
- [ ] Confirmar que `v5_manutencao.pedidos_orcamento` existe: `SELECT count(*) FROM v5_manutencao.pedidos_orcamento;`
- [ ] Confirmar que `mariocarvalho.biz+v5staff@gmail.com` tem `active=true` e `revoked_at IS NULL` em `core.staff_roles`
- [ ] Verificar que `supabase_realtime` publication existe: `SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime';`
- [ ] Após aplicar: `GRANT` auditado via `information_schema.role_table_grants`
- [ ] Após aplicar: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'system';` — esperar `rowsecurity = true` nas 3 tabelas
- [ ] Smoke test: query `SELECT count(*) FROM system.inbox_items;` retorna 0 sem erro

---

## Verificação pós-aplicação

```sql
-- 1. Tabelas criadas com RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'system';
-- Esperar: inbox_items(true), inbox_reads(true), approvals_queue(true)

-- 2. GRANTs correctos (Regra FF)
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'system'
ORDER BY table_name, grantee, privilege_type;
-- Esperar: SELECT+UPDATE a authenticated; ALL a service_role (excepto inbox_reads que é SELECT+INSERT+DELETE)

-- 3. Realtime activo
SELECT pubname, tablename
FROM pg_publication_tables
WHERE schemaname = 'system'
ORDER BY tablename;
-- Esperar: inbox_items e approvals_queue em supabase_realtime

-- 4. Índices
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'system'
ORDER BY tablename, indexname;
```

---

## Sprint 1F — path sem breaking changes

Quando entrar ops member em Sprint 1F:

1. Criar `auth.user` para ops member via Supabase Auth
2. `INSERT INTO core.staff_roles (auth_user_id, role, active) VALUES ('<uid_ops>', 'support', true);`
3. Zero alterações a tabelas `system.*` — `public.is_staff()` já suporta múltiplos utilizadores
4. Se quiser separar visibilidade por role (ex: ops só vê inbox, não approvals): adicionar coluna `required_role text` a cada tabela e actualizar `WITH CHECK` na policy — migration aditiva

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `public.is_staff()` retorna `false` se staff account não configurado | Verificar `core.staff_roles` antes de smoke test |
| Schema `system` conflito com schema reservado Postgres | `system` não é reservado em Postgres ≥14; confirmar em dashboard antes de criar |
| `ALTER PUBLICATION ... ADD TABLE` falha se tabela não existe ainda | Executar APÓS `CREATE TABLE` na mesma migration |
| FK `pedidos_orcamento_id ON DELETE CASCADE` pode eliminar approvals inesperadamente | CASCADE é intencional: se pedido for eliminado, as approvals associadas perdem sentido |
| `expires_at` não impede aprovações tardias | Por design — enforcement via pg_cron diferido para Phase 1.5 |
| Realtime para `inbox_items` pode gerar noise no dashboard | Filtrar no cliente: subscibe apenas a `status = 'active'` e `source_agent` relevantes |

---

## Dependências para o vertical-builder (Phase 1)

Após migration aplicada, o vertical-builder pode:

1. Adicionar `@supabase/supabase-js` + `react-router-dom` + `zustand` a `apps/dashboard/package.json`
2. Criar `useSupabase()` hook que:
   - Inicializa cliente com `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
   - Subscreve `system.approvals_queue` via `supabase.channel().on('postgres_changes', ...)`
   - Subscreve `system.inbox_items` para badge de não lidos
3. Criar `useStaticData()` hook (mantém lógica actual de `/data.json` polling)
4. Criar páginas `/inbox` e `/approvals` com queries nas novas tabelas

Variáveis de ambiente obrigatórias em Vercel (`proptech-agentic-ops`) antes de deploy:
- `VITE_SUPABASE_URL` = URL do V1 Core Hub
- `VITE_SUPABASE_ANON_KEY` = anon key do V1 Core Hub

---

## Sample INSERT (para seed de teste)

```sql
-- Item de inbox (inserido por service_role / edge function)
INSERT INTO system.inbox_items (source, vertical, item_type, title, body, payload)
VALUES (
  'bia',
  'v5',
  'new_pedido',
  'Novo pedido de canalização — Lisboa Belém',
  'Maria Santos pediu orçamento urgente para fuga na cozinha.',
  '{"pedido_id": "...", "categoria": "canalização", "urgente": true, "localizacao": "Lisboa Belém"}'::jsonb
);

-- Approval (inserida pela Bia via edge function)
INSERT INTO system.approvals_queue (
  source_agent, action_type, target_vertical, pedido_orcamento_id,
  draft_message, classification, prestador_suggested, action_payload
)
VALUES (
  'bia',
  'whatsapp_send',
  'v5',
  '<uuid-pedido>',
  'Olá João! Tenho um cliente em Belém com fuga urgente na cozinha. Disponível esta semana? 🔧',
  '{"categoria": "canalização", "sub_categoria": "fuga", "confianca": 0.91}'::jsonb,
  '{"id": "<uuid>", "nome": "João Pedreiro", "distancia_km": 1.8, "rating": 4.9}'::jsonb,
  '{"to": "+351910000000", "template": "prestador_outreach_v1"}'::jsonb
);
```
