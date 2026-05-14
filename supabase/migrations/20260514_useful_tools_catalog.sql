-- 20260514_useful_tools_catalog.sql
-- system.useful_tools — catálogo "discover / integrate later"
-- Diferente de integrations: links externos para inspiração/avaliação.
-- Workflow: discover → evaluating → shortlisted → integrated (ou rejected)

CREATE TABLE IF NOT EXISTS system.useful_tools (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  description   text NOT NULL,
  category      text NOT NULL DEFAULT 'general',
  url           text NOT NULL,
  domain        text,
  brand_color   text,
  icon          text,
  verticals     text[] NOT NULL DEFAULT '{*}',
  status        text NOT NULL DEFAULT 'discover'
                CHECK (status IN ('discover', 'evaluating', 'shortlisted', 'integrated', 'rejected')),
  priority      text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  notes         text,
  source        text,
  added_by      text,
  display_order integer NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS useful_tools_category_idx  ON system.useful_tools (category);
CREATE INDEX IF NOT EXISTS useful_tools_status_idx    ON system.useful_tools (status);
CREATE INDEX IF NOT EXISTS useful_tools_verticals_idx ON system.useful_tools USING GIN (verticals);

CREATE OR REPLACE VIEW public.system_useful_tools AS
SELECT * FROM system.useful_tools ORDER BY display_order, name;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_useful_tools TO authenticated;
GRANT SELECT ON public.system_useful_tools TO anon;
GRANT ALL ON system.useful_tools TO authenticated, service_role;

-- Seed 41 tools curadas em 9 categorias (AI Coding, AI Content, AI Media, Design,
-- Data, Dev Infra, Workflow, Marketing, PropTech PT)
INSERT INTO system.useful_tools (slug, name, description, category, url, domain, brand_color, verticals, status, display_order) VALUES
('cursor','Cursor','IDE com AI nativo — pair programming Claude + GPT','ai-coding','https://cursor.com','cursor.com','#000000','{*}','integrated',10),
('claude-code','Claude Code','CLI agent da Anthropic — terminal + IDE plugin','ai-coding','https://claude.ai/code','claude.com','#D97757','{*}','integrated',11),
('lovable','Lovable','Build full-stack apps com prompts (v0 alternative)','ai-coding','https://lovable.dev','lovable.dev','#FF6F61','{*}','discover',12),
('v0','v0 by Vercel','Generate React UI components com Tailwind','ai-coding','https://v0.dev','v0.dev','#000000','{*}','discover',13),
('bolt-new','Bolt.new','Stackblitz AI — full stack apps in browser','ai-coding','https://bolt.new','bolt.new','#1389FD','{*}','discover',14),
('replit','Replit Agent','AI agents que constroem apps + deploy em 1 click','ai-coding','https://replit.com','replit.com','#F26207','{*}','discover',15),
('windsurf','Windsurf','Codeium IDE — AI flow + Cascade mode','ai-coding','https://windsurf.com','windsurf.com','#1FBA9C','{*}','discover',16),
('github-copilot','GitHub Copilot','AI pair programming directo no editor','ai-coding','https://github.com/copilot','github.com','#181717','{*}','evaluating',17),
('chatgpt','ChatGPT','AI assistant generalista (GPT-4o, o3)','ai-content','https://chatgpt.com','openai.com','#10A37F','{*}','integrated',20),
('perplexity','Perplexity','AI search com fontes citadas (deep research)','ai-content','https://perplexity.ai','perplexity.ai','#22B5BF','{*}','discover',21),
('notebooklm','NotebookLM','Google AI notebooks — sumarizar docs + audio','ai-content','https://notebooklm.google.com','google.com','#FFD43B','{*}','discover',22),
('jasper','Jasper','Marketing copy AI para campanhas + emails','ai-content','https://jasper.ai','jasper.ai','#A77BCA','{*}','discover',23),
('midjourney','Midjourney','Image generation premium (best quality)','ai-media','https://midjourney.com','midjourney.com','#000000','{*}','discover',30),
('dall-e','DALL·E','OpenAI image generation integrada com GPT','ai-media','https://openai.com/dall-e-3','openai.com','#10A37F','{*}','discover',31),
('runway','Runway','AI video generation + editing (Gen-3)','ai-media','https://runwayml.com','runwayml.com','#000000','{*}','discover',32),
('synthesia','Synthesia','AI avatars que falam (vídeo training/marketing)','ai-media','https://synthesia.io','synthesia.io','#FF6B6B','{*}','discover',33),
('elevenlabs','ElevenLabs','AI voice cloning + TTS profissional','ai-media','https://elevenlabs.io','elevenlabs.io','#000000','{*}','discover',34),
('heygen','HeyGen','AI avatar video — clone voice + face','ai-media','https://heygen.com','heygen.com','#3B82F6','{*}','discover',35),
('figma','Figma','UI/UX design colaborativo (industry standard)','design','https://figma.com','figma.com','#F24E1E','{*}','integrated',40),
('canva','Canva','Design rápido + templates (marketing material)','design','https://canva.com','canva.com','#00C4CC','{*}','integrated',41),
('framer','Framer','Web design + publish (Figma-style → live site)','design','https://framer.com','framer.com','#0055FF','{*}','discover',42),
('penpot','Penpot','Open-source design tool (Figma alternative)','design','https://penpot.app','penpot.app','#1F1F1F','{*}','discover',43),
('metabase','Metabase','Dashboards SQL self-hosted (open-source)','data','https://metabase.com','metabase.com','#509EE3','{*}','discover',50),
('plausible','Plausible','Privacy-friendly analytics (Google Analytics alt)','data','https://plausible.io','plausible.io','#5850EC','{*}','discover',51),
('hex','Hex','Collaborative SQL notebooks + Python data viz','data','https://hex.tech','hex.tech','#F5C842','{*}','discover',52),
('n8n','n8n','Open-source Zapier alternative (self-hosted)','workflow','https://n8n.io','n8n.io','#EA4B71','{*}','evaluating',60),
('windmill','Windmill','Workflow engine + scripts + UIs internos','workflow','https://windmill.dev','windmill.dev','#3B82F6','{*}','discover',61),
('temporal','Temporal','Durable execution (long-running workflows)','workflow','https://temporal.io','temporal.io','#000000','{*}','discover',62),
('railway','Railway','Deploy apps + databases (Vercel-like para backend)','dev-infra','https://railway.com','railway.com','#0B0D0E','{*}','discover',70),
('fly-io','Fly.io','Edge deploy global + máquinas mais rápidas','dev-infra','https://fly.io','fly.io','#7B3FE4','{*}','discover',71),
('clerk','Clerk','Auth-as-a-service (alternativa Supabase Auth)','dev-infra','https://clerk.com','clerk.com','#6C47FF','{*}','discover',72),
('upstash','Upstash','Serverless Redis + Kafka + Vector DB','dev-infra','https://upstash.com','upstash.com','#00E9A3','{*}','discover',73),
('inngest','Inngest','Reliable background jobs + workflows for Node','dev-infra','https://inngest.com','inngest.com','#3E62FE','{*}','discover',74),
('mailchimp','Mailchimp','Email marketing tradicional','marketing','https://mailchimp.com','mailchimp.com','#FFE01B','{v2,v10}','discover',80),
('beehiiv','Beehiiv','Newsletter platform (Substack alternative)','marketing','https://beehiiv.com','beehiiv.com','#FFC93C','{*}','discover',81),
('typeform','Typeform','Forms conversacionais (lead gen + surveys)','marketing','https://typeform.com','typeform.com','#262627','{*}','discover',82),
('tally','Tally','Forms grátis (Typeform alternative open)','marketing','https://tally.so','tally.so','#000000','{*}','discover',83),
('reform','Reform','Beautiful forms com lógica condicional','marketing','https://reform.app','reform.app','#5B5BD6','{*}','discover',84),
('sajt','SAJT','Sistema Apoio Judiciário Telemático (cobrança PT)','proptech','https://sajt.justica.gov.pt','justica.gov.pt','#003D7E','{v2}','discover',90),
('predial-online','Predial Online','Registo Predial PT (certidões + averbamentos)','proptech','https://predialonline.justica.gov.pt','justica.gov.pt','#003D7E','{v2,v7}','discover',91),
('caleida','Caleida','BIM colaborativo PT (reabilitação)','proptech','https://caleida.pt','caleida.pt','#0066CC','{v6}','discover',92)
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';
