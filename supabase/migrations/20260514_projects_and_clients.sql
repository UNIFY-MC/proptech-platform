-- Sprint F+G: system.projects + system.clients
-- Projects = pastas que agrupam recipes/tasks por objectivo macro de negócio.
-- Clients = tenants/clientes que tu (agência) onboards na plataforma.

CREATE TABLE IF NOT EXISTS system.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned', 'in_progress', 'completed', 'paused', 'cancelled')),
  priority      text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  vertical      text,
  verticals     text[] NOT NULL DEFAULT '{*}',
  client_id     uuid,
  owner_agent_id text,
  due_at        timestamptz,
  goals         jsonb NOT NULL DEFAULT '[]'::jsonb,
  contents      jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon          text,
  brand_color   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_status_idx    ON system.projects (status);
CREATE INDEX IF NOT EXISTS projects_verticals_idx ON system.projects USING GIN (verticals);
CREATE INDEX IF NOT EXISTS projects_client_idx    ON system.projects (client_id);

DROP VIEW IF EXISTS public.system_projects;
CREATE VIEW public.system_projects AS
SELECT
  p.*,
  (SELECT COUNT(*) FROM system.tasks t WHERE t.payload->>'project_id' = p.id::text) AS task_count,
  (SELECT COUNT(*) FROM system.recipes r WHERE r.payload_schema->>'project_id' = p.id::text) AS recipe_count
FROM system.projects p
ORDER BY
  CASE p.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
  p.created_at DESC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_projects TO authenticated;
GRANT SELECT ON public.system_projects TO anon;
GRANT ALL ON system.projects TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS system.clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  company_name  text NOT NULL,
  contact_email text NOT NULL,
  contact_name  text,
  niche         text,
  website       text,
  vertical      text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'paused', 'churned')),
  owner_staff   text,
  portal_domain text,
  flow_progress integer NOT NULL DEFAULT 0,
  grants_connected integer NOT NULL DEFAULT 0,
  branding      jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_config  jsonb NOT NULL DEFAULT '{}'::jsonb,
  reporting_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  invited_at    timestamptz,
  activated_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_status_idx   ON system.clients (status);
CREATE INDEX IF NOT EXISTS clients_vertical_idx ON system.clients (vertical);

DROP VIEW IF EXISTS public.system_clients;
CREATE VIEW public.system_clients AS
SELECT * FROM system.clients ORDER BY status, created_at DESC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_clients TO authenticated;
GRANT SELECT ON public.system_clients TO anon;
GRANT ALL ON system.clients TO authenticated, service_role;

-- Seed 5 projects + 5 clients para Mário ver dados imediatos
INSERT INTO system.projects (name, description, status, priority, vertical, icon, brand_color) VALUES
('Scaling',                         'Initiative geral de scaling cross-vertical',  'planned',     'medium', null, 'Folder',     '#3b82f6'),
('HVAC Lead Engine MVP',            'V7 — engine de leads HVAC + AI calling',      'in_progress', 'high',   'v7', 'Rocket',     '#ef4444'),
('AI Voice Agent for Inbound Calls','V5 — Vapi agente concierge V5 Manutenção',    'in_progress', 'medium', 'v5', 'Phone',      '#10b981'),
('Founder Content Sprint',          'Content org para acquisition cross-vertical', 'completed',   'medium', null, 'Megaphone',  '#ec4899'),
('Client Onboarding Automation',    'Automatiza intake + setup novos clientes',    'paused',      'low',    null, 'HandShake',  '#f59e0b')
ON CONFLICT DO NOTHING;

INSERT INTO system.clients (slug, company_name, contact_email, contact_name, niche, vertical, status, owner_staff) VALUES
('prata-owners',     'Prata Owners',                  'condominio@prataowners.pt', 'Mário Carvalho', 'Condomínio Lisboa', 'v2', 'active',  'Mário'),
('aurora-residence', 'Aurora Residence',              'admin@aurora.example',      'Ana Silva',      'Condomínio Cascais','v2', 'pending', 'Mário'),
('intego-media',     'Intego Media',                  'tom@intego.example',        'Tom Costa',      'HVAC Marketing',    'v7', 'pending', 'Mário'),
('polar-bear-hvac',  'Polar Bear Plumbing & Heating', 'dan@polar.example',         'Dan Polar',      'HVAC + Plumbing',   'v7', 'pending', 'Mário'),
('cold-front-hvac',  'Cold Front HVAC Services',      'tom@coldfront.example',     'Tom Cold',       'HVAC',              'v7', 'pending', 'Mário')
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';
