-- ============================================================
-- Apify integration — Sprint η
-- Data: 2026-05-13
-- ============================================================
-- Estende system.watcher_sources com kind='apify_actor' para
-- delegar scraping ao Apify (cobre IG + X + LinkedIn + sites).
--
-- Config schema (jsonb) por kind=apify_actor:
--   {
--     "actor_id":      "apify/instagram-scraper",
--     "input":         { ... actor-specific input ... },
--     "output_mapper": "instagram_post" | "twitter_post" | "linkedin_post" | "page_content",
--     "schedule":      "0 8 * * *",   // Apify-side schedule (opcional)
--     "platform":      "instagram" | "x" | "linkedin" | "web"
--   }
--
-- Tabela auxiliar system.apify_runs para tracking de runs em curso
-- (Apify dispara webhook quando termina; correlacionamos por run_id).
-- ============================================================

-- 1. Permitir kind=apify_actor (rebuild CHECK constraint)
ALTER TABLE system.watcher_sources DROP CONSTRAINT IF EXISTS watcher_sources_kind_check;
ALTER TABLE system.watcher_sources ADD CONSTRAINT watcher_sources_kind_check
  CHECK (kind IN ('news_query', 'instagram_user', 'rss', 'competitor_site', 'x_search',
                  'apify_actor', 'linkedin_user', 'youtube_channel'));

-- 2. Tabela de runs (correlaciona webhook callbacks com source)
CREATE TABLE IF NOT EXISTS system.apify_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid NOT NULL REFERENCES system.watcher_sources(id) ON DELETE CASCADE,
  apify_run_id    text UNIQUE NOT NULL,
  actor_id        text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'aborted', 'timed-out')),
  dataset_id      text,
  items_imported  integer DEFAULT 0,
  error_message   text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz
);

CREATE INDEX IF NOT EXISTS apify_runs_source_idx ON system.apify_runs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS apify_runs_status_idx ON system.apify_runs(status) WHERE status IN ('pending', 'running');

-- 3. RLS
ALTER TABLE system.apify_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON system.apify_runs TO authenticated, service_role;

DROP POLICY IF EXISTS apify_runs_open_read  ON system.apify_runs;
DROP POLICY IF EXISTS apify_runs_open_write ON system.apify_runs;
CREATE POLICY apify_runs_open_read  ON system.apify_runs FOR SELECT USING (true);
CREATE POLICY apify_runs_open_write ON system.apify_runs FOR ALL    USING (true) WITH CHECK (true);

-- 4. View pública (para UI mostrar histórico)
CREATE OR REPLACE VIEW public.system_apify_runs AS
  SELECT r.id, r.source_id, r.apify_run_id, r.actor_id,
         r.status, r.dataset_id, r.items_imported, r.error_message,
         r.started_at, r.finished_at,
         s.label AS source_label, s.vertical
  FROM system.apify_runs r
  JOIN system.watcher_sources s ON s.id = r.source_id;

GRANT SELECT ON public.system_apify_runs TO anon, authenticated, service_role;

-- 5. Seeds: 4 actor presets exemplo (active=false, Mário activa após config)
INSERT INTO system.watcher_sources (kind, label, config, vertical, active) VALUES
  ('apify_actor', 'Apify · IG Instagram (concorrência)',
    '{"actor_id":"apify/instagram-scraper","platform":"instagram","output_mapper":"instagram_post","input":{"username":["exemplo_concorrente"],"resultsLimit":5}}'::jsonb,
    NULL, false),
  ('apify_actor', 'Apify · X / Twitter handles',
    '{"actor_id":"apidojo/twitter-scraper","platform":"x","output_mapper":"twitter_post","input":{"handle":"exemplo_handle","tweetsDesired":10}}'::jsonb,
    NULL, false),
  ('apify_actor', 'Apify · LinkedIn perfis',
    '{"actor_id":"apify/linkedin-profile-scraper","platform":"linkedin","output_mapper":"linkedin_post","input":{"profileUrls":["https://linkedin.com/in/exemplo"]}}'::jsonb,
    NULL, false),
  ('apify_actor', 'Apify · Site concorrente (page content)',
    '{"actor_id":"apify/web-scraper","platform":"web","output_mapper":"page_content","input":{"startUrls":[{"url":"https://exemplo.pt"}]}}'::jsonb,
    NULL, false)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
