-- ============================================================
-- system.watcher_sources — Sprint γ
-- Data: 2026-05-13
-- ============================================================
-- Cada source é uma "subscrição" a conteúdo externo:
--   - kind=news_query: search query (Mediastack/NewsAPI etc)
--   - kind=instagram_user: @handle a vigiar
--   - kind=rss: feed RSS
--   - kind=competitor_site: URL para diff regular
-- Cron horário/30min lê estas sources → cria inbox_items kind=news/instagram/competitor.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS system;

CREATE TABLE IF NOT EXISTS system.watcher_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('news_query','instagram_user','rss','competitor_site','x_search')),
  label       text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  vertical    text,
  active      boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_seen_key text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN system.watcher_sources.config IS
  'kind=news_query: {query, language, country}. kind=instagram_user: {handle, account_id}. kind=rss: {feed_url}. kind=competitor_site: {url, selector}';
COMMENT ON COLUMN system.watcher_sources.last_seen_key IS
  'Última chave única vista (article URL, post id, etc) para dedup';

CREATE INDEX IF NOT EXISTS watcher_sources_kind_active_idx ON system.watcher_sources(kind, active);

-- ============================================================
-- Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION system.watcher_register_seen(
  p_source_id uuid,
  p_seen_key  text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public
AS $$
BEGIN
  UPDATE system.watcher_sources
     SET last_seen_key = p_seen_key,
         last_run_at   = now()
   WHERE id = p_source_id;
END $$;

GRANT EXECUTE ON FUNCTION system.watcher_register_seen(uuid, text) TO authenticated, service_role;

-- ============================================================
-- Seeds (placeholders — Mário acrescenta sources reais via UI)
-- ============================================================
INSERT INTO system.watcher_sources (kind, label, config, vertical, active) VALUES
  ('news_query', 'Notícias condomínios PT', '{"query":"condomínio Portugal","language":"pt","country":"pt"}'::jsonb, 'v2', false),
  ('news_query', 'Notícias energia PT',     '{"query":"tarifa eléctrica Portugal","language":"pt","country":"pt"}'::jsonb, 'v4', false),
  ('instagram_user', 'Concorrente IG (exemplo)', '{"handle":"@example_competitor"}'::jsonb, NULL, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- RLS — open internal
-- ============================================================
ALTER TABLE system.watcher_sources ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON system.watcher_sources TO authenticated, service_role;

DROP POLICY IF EXISTS watcher_sources_open_read  ON system.watcher_sources;
DROP POLICY IF EXISTS watcher_sources_open_write ON system.watcher_sources;
CREATE POLICY watcher_sources_open_read  ON system.watcher_sources FOR SELECT USING (true);
CREATE POLICY watcher_sources_open_write ON system.watcher_sources FOR ALL    USING (true) WITH CHECK (true);

-- View pública
CREATE OR REPLACE VIEW public.system_watcher_sources AS
  SELECT id, kind, label, config, vertical, active, last_run_at, last_seen_key, created_at, updated_at
  FROM system.watcher_sources;

GRANT SELECT ON public.system_watcher_sources TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
