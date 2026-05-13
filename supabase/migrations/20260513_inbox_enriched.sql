-- ============================================================
-- system.inbox_items — cards enriquecidos (Sprint α)
-- Data: 2026-05-13
-- ============================================================
-- Adiciona campos para suportar:
--  kind: 'roundup' | 'news' | 'instagram' | 'op' | 'alert' | 'task' | 'mention'
--  payload jsonb: dados específicos do tipo (url, image_url, content_md, ...)
--  actions text[]: CTAs disponíveis no card ('create_task', 'archive', ...)
--  expandable bool: card pode expandir inline com conteúdo completo
--  read_at timestamptz: marcado como lido pelo user
-- Idempotente.

ALTER TABLE system.inbox_items
  ADD COLUMN IF NOT EXISTS kind        text NOT NULL DEFAULT 'op',
  ADD COLUMN IF NOT EXISTS payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actions     text[] NOT NULL DEFAULT ARRAY['archive'],
  ADD COLUMN IF NOT EXISTS expandable  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at     timestamptz,
  ADD COLUMN IF NOT EXISTS source_url  text,
  ADD COLUMN IF NOT EXISTS source_name text;

COMMENT ON COLUMN system.inbox_items.kind IS
  'roundup | news | instagram | op | alert | task | mention | competitor';
COMMENT ON COLUMN system.inbox_items.payload IS
  'Dados do tipo. Ex roundup: {summary_md, stats:{...}}. news: {title, image_url, source, content_md}. instagram: {post_id, image_url, caption, author}';
COMMENT ON COLUMN system.inbox_items.actions IS
  'CTAs disponíveis: archive | create_task_idea | create_task_employee | mark_read | share_with_agent | open_external';
COMMENT ON COLUMN system.inbox_items.expandable IS
  'true → click no card abre conteúdo inline abaixo (sem side panel)';

CREATE INDEX IF NOT EXISTS inbox_items_kind_idx     ON system.inbox_items(kind);
CREATE INDEX IF NOT EXISTS inbox_items_read_at_idx  ON system.inbox_items(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS inbox_items_created_idx  ON system.inbox_items(created_at DESC);

-- RPC: mark_read
CREATE OR REPLACE FUNCTION system.inbox_mark_read(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public
AS $$
BEGIN
  UPDATE system.inbox_items
     SET read_at = COALESCE(read_at, now())
   WHERE id = p_item_id;
END $$;

GRANT EXECUTE ON FUNCTION system.inbox_mark_read(uuid) TO authenticated, service_role;

-- RPC: archive
CREATE OR REPLACE FUNCTION system.inbox_archive(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public
AS $$
BEGIN
  UPDATE system.inbox_items
     SET status = 'archived'
   WHERE id = p_item_id;
END $$;

GRANT EXECUTE ON FUNCTION system.inbox_archive(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
