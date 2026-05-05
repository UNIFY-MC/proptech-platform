-- ============================================================
-- Migration: 20260504_system_command_center_schema.sql
-- Propósito: Schema system para Command Center MVP
-- Dependências:
--   - core.staff_roles (já existe)
--   - public.is_staff() (já existe em sql/23_v5_3_4d_staff_roles.sql)
--   - v5_manutencao.pedidos_orcamento (já existe)
-- Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
-- ============================================================


-- ── 1. SCHEMA ────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS system;

COMMENT ON SCHEMA system IS
  'Infra operacional interna do Command Center. '
  'NÃO exposto a clientes — só staff via dashboard. '
  'Separado de core (dados de negócio transversal) e v5_manutencao (negócio vertical).';


-- ── 2. TABELA system.inbox_items ─────────────────────────────

CREATE TABLE IF NOT EXISTS system.inbox_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),

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

  title         text        NOT NULL CHECK (length(trim(title)) > 0),
  body          text,
  payload       jsonb       NOT NULL DEFAULT '{}'::jsonb,

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

-- Indexes inbox_items
CREATE INDEX IF NOT EXISTS idx_inbox_items_status_created
  ON system.inbox_items(status, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_inbox_items_vertical_created
  ON system.inbox_items(vertical, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_inbox_items_type
  ON system.inbox_items(item_type, created_at DESC);


-- ── 3. TABELA system.inbox_reads ─────────────────────────────

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

-- Indexes inbox_reads
CREATE INDEX IF NOT EXISTS idx_inbox_reads_user_read
  ON system.inbox_reads(user_id, read_at DESC);


-- ── 4. TABELA system.approvals_queue ─────────────────────────

CREATE TABLE IF NOT EXISTS system.approvals_queue (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),

  source_agent          text        NOT NULL
                          CHECK (source_agent IN ('bia', 'casa_advisor', 'image_inspector', 'manual')),

  action_type           text        NOT NULL
                          CHECK (action_type IN (
                            'whatsapp_send',
                            'email_send',
                            'db_insert',
                            'db_update',
                            'deploy',
                            'api_call'
                          )),

  target_vertical       text
                          CHECK (target_vertical IS NULL OR target_vertical IN ('v1', 'v2', 'v4', 'v5')),

  pedido_orcamento_id   uuid
                          REFERENCES v5_manutencao.pedidos_orcamento(id) ON DELETE CASCADE,

  action_payload        jsonb       NOT NULL DEFAULT '{}'::jsonb,

  draft_message         text        NOT NULL CHECK (length(trim(draft_message)) > 0),
  edited_message        text,

  classification        jsonb       NOT NULL DEFAULT '{}'::jsonb,

  prestador_suggested   jsonb,

  status                text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',
                            'approved',
                            'edited_approved',
                            'dismissed'
                          )),

  decision_at           timestamptz,
  decision_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  dismiss_reason        text,

  execution_at          timestamptz,
  execution_result      jsonb,

  expires_at            timestamptz,

  CONSTRAINT approvals_decision_requires_status
    CHECK (
      (decision_at IS NULL AND decision_by IS NULL) OR
      (status IN ('approved', 'edited_approved', 'dismissed'))
    ),

  CONSTRAINT approvals_dismiss_reason_only_on_dismissed
    CHECK (
      dismiss_reason IS NULL OR status = 'dismissed'
    ),

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

-- Indexes approvals_queue
CREATE INDEX IF NOT EXISTS idx_approvals_pending_vertical_created
  ON system.approvals_queue(target_vertical, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_approvals_pedido
  ON system.approvals_queue(pedido_orcamento_id, created_at DESC)
  WHERE pedido_orcamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approvals_decision_by
  ON system.approvals_queue(decision_by, decision_at DESC)
  WHERE decision_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approvals_source_agent
  ON system.approvals_queue(source_agent, created_at DESC);


-- ── 5. RLS — system.inbox_items ──────────────────────────────

ALTER TABLE system.inbox_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_inbox_items" ON system.inbox_items;
CREATE POLICY "staff_read_inbox_items"
  ON system.inbox_items FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "staff_archive_inbox_items" ON system.inbox_items;
CREATE POLICY "staff_archive_inbox_items"
  ON system.inbox_items FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

GRANT SELECT, UPDATE ON system.inbox_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.inbox_items TO service_role;


-- ── 6. RLS — system.inbox_reads ──────────────────────────────

ALTER TABLE system.inbox_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_own_reads" ON system.inbox_reads;
CREATE POLICY "staff_read_own_reads"
  ON system.inbox_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_staff());

DROP POLICY IF EXISTS "staff_insert_own_reads" ON system.inbox_reads;
CREATE POLICY "staff_insert_own_reads"
  ON system.inbox_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_staff());

DROP POLICY IF EXISTS "staff_delete_own_reads" ON system.inbox_reads;
CREATE POLICY "staff_delete_own_reads"
  ON system.inbox_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_staff());

GRANT SELECT, INSERT, DELETE ON system.inbox_reads TO authenticated;
GRANT ALL ON system.inbox_reads TO service_role;


-- ── 7. RLS — system.approvals_queue ──────────────────────────

ALTER TABLE system.approvals_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_approvals" ON system.approvals_queue;
CREATE POLICY "staff_read_approvals"
  ON system.approvals_queue FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "staff_decide_approvals" ON system.approvals_queue;
CREATE POLICY "staff_decide_approvals"
  ON system.approvals_queue FOR UPDATE TO authenticated
  USING (public.is_staff() AND status = 'pending')
  WITH CHECK (public.is_staff());

GRANT SELECT, UPDATE ON system.approvals_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.approvals_queue TO service_role;


-- ── 8. REALTIME ───────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE system.inbox_items;
ALTER PUBLICATION supabase_realtime ADD TABLE system.approvals_queue;
-- inbox_reads NÃO precisa Realtime — só read state local, não broadcast


-- ── 9. NOTIFY PostgREST ───────────────────────────────────────

NOTIFY pgrst, 'reload schema';
