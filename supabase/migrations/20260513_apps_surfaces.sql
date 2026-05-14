-- ============================================================
-- system.apps — multi-surface por vertical (ADR-016 a documentar)
-- Data: 2026-05-13
-- Projecto: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
-- ============================================================
-- Modelo: cada vertical (v2, v3, v4, v5, v10) tem N "surfaces"
-- (form-factor × role): desktop_web + mobile_web + ...
-- Idempotente: cria tabela se não existir, alter aditivo, upsert
-- de seeds.

-- ------------------------------------------------------------
-- 1. SCHEMA + TABELA (criada se não existir — defensivo)
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS system;

CREATE TABLE IF NOT EXISTS system.apps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  label           text NOT NULL,
  icon            text,
  embed           boolean NOT NULL DEFAULT true,
  dev_url         text,
  prod_url        text,
  active          boolean NOT NULL DEFAULT true,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. ALTER aditivo: novos campos para multi-surface
-- ------------------------------------------------------------
ALTER TABLE system.apps
  ADD COLUMN IF NOT EXISTS vertical    text,
  ADD COLUMN IF NOT EXISTS surface     text,
  ADD COLUMN IF NOT EXISTS role        text,
  ADD COLUMN IF NOT EXISTS coming_soon boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN system.apps.vertical    IS 'v1..v10 — agrupa surfaces por produto';
COMMENT ON COLUMN system.apps.surface     IS 'desktop_web | mobile_web | tablet_web | mobile_native_ios | mobile_native_android';
COMMENT ON COLUMN system.apps.role        IS 'staff | cliente | prestador | owner | guest (nullable)';
COMMENT ON COLUMN system.apps.coming_soon IS 'true → placeholder no UI sem iframe (sem deploy ainda)';

CREATE INDEX IF NOT EXISTS apps_vertical_idx     ON system.apps(vertical);
CREATE INDEX IF NOT EXISTS apps_surface_role_idx ON system.apps(surface, role);

-- ------------------------------------------------------------
-- 3. BACKFILL — apps já existentes recebem vertical/surface/role
-- ------------------------------------------------------------
UPDATE system.apps SET vertical='v2', surface='desktop_web', role='staff'   WHERE slug='v2'   AND vertical IS NULL;
UPDATE system.apps SET vertical='v4', surface='desktop_web', role='staff'   WHERE slug='v4'   AND vertical IS NULL;
UPDATE system.apps SET vertical='v5', surface='mobile_web',  role='cliente' WHERE slug='v5'   AND vertical IS NULL;
-- Dashboard fica sem vertical (é a app meta, não pertence a uma vertical)
UPDATE system.apps SET surface='desktop_web' WHERE slug='dashboard' AND surface IS NULL;

-- ------------------------------------------------------------
-- 4. SEEDS — novas surfaces placeholder (coming-soon)
-- ------------------------------------------------------------
INSERT INTO system.apps (slug, label, icon, embed, active, display_order, vertical, surface, role, coming_soon, dev_url, prod_url) VALUES
  ('v2-condomino-mobile', 'V2 Condómino (mobile)',  'Smartphone', true, true, 11, 'v2', 'mobile_web',  'cliente',   true,  NULL, NULL),
  ('v2-prestador-mobile', 'V2 Prestador (mobile)',  'HardHat',    true, true, 12, 'v2', 'mobile_web',  'prestador', true,  NULL, NULL),
  ('v3-broker',           'V3 Broker (desktop)',    'Briefcase',  true, true, 15, 'v3', 'desktop_web', 'staff',     true,  NULL, NULL),
  ('v3-cliente-mobile',   'V3 Cliente (mobile)',    'Shield',     true, true, 16, 'v3', 'mobile_web',  'cliente',   true,  NULL, NULL),
  ('v4-cliente-web',      'V4 Simulador público',   'Zap',        true, true, 21, 'v4', 'mobile_web',  'cliente',   true,  NULL, NULL),
  ('v5-prestador',        'V5 Prestador (mobile)',  'Wrench',     true, true, 31, 'v5', 'mobile_web',  'prestador', false, 'http://localhost:5175', NULL),
  ('v5-staff',            'V5 Staff (desktop)',     'Briefcase',  true, true, 32, 'v5', 'desktop_web', 'staff',     true,  NULL, NULL),
  ('v10-owner-mobile',    'V10 Owners Club',        'Crown',      true, true, 41, 'v10','mobile_web', 'owner',     true,  NULL, NULL)
ON CONFLICT (slug) DO UPDATE SET
  label         = EXCLUDED.label,
  icon          = EXCLUDED.icon,
  vertical      = EXCLUDED.vertical,
  surface       = EXCLUDED.surface,
  role          = EXCLUDED.role,
  coming_soon   = EXCLUDED.coming_soon,
  display_order = EXCLUDED.display_order,
  updated_at    = now();

-- ------------------------------------------------------------
-- 5. GRANTS + RLS (read-only via view pública cookai_apps)
-- ------------------------------------------------------------
ALTER TABLE system.apps ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA system TO anon, authenticated, service_role;
GRANT SELECT ON system.apps TO anon, authenticated, service_role;

DROP POLICY IF EXISTS apps_read_all ON system.apps;
CREATE POLICY apps_read_all ON system.apps FOR SELECT USING (true);

-- View pública (PostgREST não expõe schemas custom por default;
-- a view em public é o que useApps() lê)
CREATE OR REPLACE VIEW public.cookai_apps AS
  SELECT id, slug, label, icon, embed, dev_url, prod_url,
         active, display_order, vertical, surface, role, coming_soon,
         created_at, updated_at
  FROM system.apps
  WHERE active = true;

GRANT SELECT ON public.cookai_apps TO anon, authenticated, service_role;

-- Reload PostgREST schema cache (necessário após CREATE VIEW)
NOTIFY pgrst, 'reload schema';
