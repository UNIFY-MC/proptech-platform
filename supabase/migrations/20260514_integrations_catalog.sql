-- 20260514_integrations_catalog.sql
-- system.integrations enriquecida (verticals[] / connectors[] / status / brand) para
-- a página /integrations CookAI-style "Connect your tools" filtrada por vertical.
--
-- Cada integração tem verticals[] (e.g. '{v2,v5}' ou '{*}' para global).
-- Status: not_connected | connected | coming_soon | disabled

-- 1. ALTER table — campos novos
ALTER TABLE system.integrations
  ADD COLUMN IF NOT EXISTS description    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category       text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS icon           text,
  ADD COLUMN IF NOT EXISTS icon_url       text,
  ADD COLUMN IF NOT EXISTS brand_color    text,
  ADD COLUMN IF NOT EXISTS verticals      text[] NOT NULL DEFAULT '{*}',
  ADD COLUMN IF NOT EXISTS connectors     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auth_kind      text DEFAULT 'oauth2',
  ADD COLUMN IF NOT EXISTS connect_url    text,
  ADD COLUMN IF NOT EXISTS docs_url       text,
  ADD COLUMN IF NOT EXISTS display_order  integer NOT NULL DEFAULT 100;

-- 2. Normalizar status legado (active→connected, draft→not_connected) ANTES do CHECK
UPDATE system.integrations SET status='connected'     WHERE status='active';
UPDATE system.integrations SET status='not_connected' WHERE status='draft';

ALTER TABLE system.integrations DROP CONSTRAINT IF EXISTS integrations_status_check;
ALTER TABLE system.integrations ADD CONSTRAINT integrations_status_check
  CHECK (status IN ('not_connected', 'connected', 'coming_soon', 'disabled'));

-- type é legacy NOT NULL — default 'api' para upsert seguro
ALTER TABLE system.integrations ALTER COLUMN type SET DEFAULT 'api';
ALTER TABLE system.integrations ALTER COLUMN enabled SET DEFAULT true;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS integrations_verticals_idx ON system.integrations USING GIN (verticals);
CREATE INDEX IF NOT EXISTS integrations_category_idx  ON system.integrations (category);
CREATE INDEX IF NOT EXISTS integrations_status_idx    ON system.integrations (status);

-- 4. View pública para PostgREST
DROP VIEW IF EXISTS public.system_integrations;
CREATE VIEW public.system_integrations AS
SELECT id, slug, name, description, category, icon, icon_url, brand_color,
       verticals, connectors, status, auth_kind, connect_url, docs_url,
       config, display_order, type, enabled, created_at, updated_at
FROM system.integrations
ORDER BY display_order, name;

GRANT SELECT ON public.system_integrations TO anon, authenticated;
GRANT ALL ON system.integrations TO service_role, authenticated;

-- 5. Seed canónico — 35 integrações com mapping para verticais
INSERT INTO system.integrations (slug, name, description, category, icon, brand_color, verticals, connectors, status, auth_kind, display_order) VALUES
('github','GitHub','Repos, issues, pull requests','engineering','Github','#181717','{*}','{github}','connected','oauth2',10),
('vercel','Vercel','Projects, deployments, runtime logs','engineering','Triangle','#000000','{*}','{vercel}','connected','oauth2',11),
('supabase','Supabase','Database, auth, storage, edge functions','engineering','Database','#3ECF8E','{*}','{supabase,supabase-storage}','connected','api_key',12),
('anthropic','Anthropic Claude','LLM para agents (Haiku 4.5, Opus 4.7)','ai','Sparkles','#D97757','{*}','{anthropic}','connected','api_key',13),
('openai','OpenAI','Vision fallback, embeddings, GPT-4','ai','Brain','#10A37F','{*}','{openai-vision}','not_connected','api_key',14),
('notion','Notion','Pages, databases, blocks (fonte de verdade)','docs','BookOpen','#000000','{*}','{notion}','connected','api_key',15),
('google-drive','Google Drive','Docs, sheets, slides, ficheiros','docs','FolderKanban','#4285F4','{*}','{drive}','not_connected','oauth2',16),
('gmail','Gmail','Email read & send','communication','Mail','#EA4335','{*}','{gmail}','connected','oauth2',17),
('google-calendar','Google Calendar','Agendamentos + freebusy + invites','productivity','Calendar','#4285F4','{*}','{google-calendar}','not_connected','oauth2',18),
('resend','Resend','Email transacional (api-first)','communication','Send','#000000','{*}','{resend}','connected','api_key',19),
('apify','Apify','Scraping IG/X/LinkedIn/TikTok (concorrência + leads)','data','Bot','#FF6B35','{*}','{apify}','connected','api_key',20),
('meta-graph','Meta Graph','Instagram + Facebook publishing + leads','social','Instagram','#E4405F','{*}','{meta-graph}','connected','oauth2',21),
('linkedin','LinkedIn','Posts orgânicos + ads + outreach','social','Linkedin','#0A66C2','{*}','{linkedin}','not_connected','oauth2',22),
('x-twitter','X (Twitter)','Posts + scraping competitor signals','social','Twitter','#000000','{*}','{x-search}','not_connected','oauth2',23),
('whatsapp-business','WhatsApp Business','Mensagens transaccionais condóminos/prestadores','communication','MessageSquare','#25D366','{v2,v5,v8,v10}','{whatsapp}','not_connected','api_key',24),
('twilio','Twilio','SMS + WhatsApp fallback + voice','communication','Phone','#F22F46','{v2,v5,v10}','{twilio}','not_connected','api_key',25),
('toconline','Toconline','Faturação AT (TOC) — emissão faturas + recibos','finance','Receipt','#E63946','{v2}','{toconline}','connected','api_key',30),
('banco-bcp','BCP / Extrato Banc.','Reconciliação extracto bancário automatizada','finance','Banknote','#00549F','{v2}','{banking}','not_connected','manual',31),
('generali','Generali Brokers','API broker — cotações + apólices building insurance','insurance','ShieldCheck','#C70039','{v3}','{generali}','coming_soon','api_key',40),
('liberty','Liberty Seguros','API broker — cotações multi-risco','insurance','ShieldCheck','#FFC72C','{v3}','{liberty}','coming_soon','api_key',41),
('spock-es','Spock.es','Switching comercializador eletricidade/gás ES+PT','energy','Zap','#FFD60A','{v4}','{spock-es}','connected','api_key',50),
('repsol-eletric','Repsol Eletricidade','API tarifas + iniciar mudança comercializador','energy','Plug','#FF6B00','{v4}','{repsol}','coming_soon','api_key',51),
('galp','Galp Energia','API tarifas + iniciar mudança comercializador','energy','Plug','#FF6900','{v4}','{galp}','coming_soon','api_key',52),
('google-maps','Google Maps','Geo prestadores + routing + ETA','productivity','MapPin','#4285F4','{v5,v7,v8}','{google-maps}','not_connected','api_key',60),
('idealista','Idealista','Listings PT — fix-and-flip + investment scouting','realestate','Home','#E2001A','{v7}','{idealista}','coming_soon','manual',70),
('imovirtual','Imovirtual','Listings PT alternativos','realestate','Building','#005EB8','{v7}','{imovirtual}','coming_soon','manual',71),
('booking','Booking.com','Channel manager — bookings + payouts','rentals','BedDouble','#003580','{v8}','{booking}','coming_soon','oauth2',80),
('airbnb','Airbnb','Listings + bookings + payouts','rentals','BedDouble','#FF5A5F','{v8}','{airbnb}','coming_soon','oauth2',81),
('swan-baas','Swan','BaaS — IBAN + contas + cartões + pagamentos SEPA','banking','CreditCard','#000000','{v9}','{swan-baas}','coming_soon','oauth2',90),
('stripe','Stripe','Pagamentos cartão + payouts + subscriptions','banking','CreditCard','#635BFF','{v9,v8,v10}','{stripe}','not_connected','api_key',91),
('zapier','Zapier','Zaps, actions, automations cross-tool','automation','Workflow','#FF4F00','{*}','{zapier}','coming_soon','oauth2',99),
('make','Make','Scenarios, automations, blueprints visuais','automation','Workflow','#6D02D8','{*}','{make}','coming_soon','oauth2',99),
('gohighlevel','GoHighLevel','CRM + pipelines + automações agency-style','crm','Briefcase','#0E2032','{v7,v8}','{ghl}','coming_soon','api_key',99),
('clickup','ClickUp','Tasks, lists, spaces, time tracking','productivity','CheckSquare','#7B68EE','{*}','{clickup}','coming_soon','oauth2',99),
('asana','Asana','Tasks, projects, workspaces, teams','productivity','CheckSquare','#F06A6A','{*}','{asana}','coming_soon','oauth2',99)
ON CONFLICT (slug) DO UPDATE
  SET name=EXCLUDED.name, description=EXCLUDED.description, category=EXCLUDED.category,
      icon=EXCLUDED.icon, brand_color=EXCLUDED.brand_color, verticals=EXCLUDED.verticals,
      connectors=EXCLUDED.connectors, status=EXCLUDED.status, auth_kind=EXCLUDED.auth_kind,
      display_order=EXCLUDED.display_order;

NOTIFY pgrst, 'reload schema';
