-- Sprint B Fase B1 — System CookAI Catalog
-- Referência: .claude/strategy/adrs/011-system-cookai-catalog.md
--
-- 4 tabelas principais + 3 junctions + RLS via public.is_staff()
-- Idempotente (IF NOT EXISTS) para permitir re-aplicação segura.

-- ───────── Skills ─────────
CREATE TABLE IF NOT EXISTS system.skills (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,
  description    text,
  category       text,
  code_ref       text,
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','active','deprecated')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ───────── Integrations ─────────
CREATE TABLE IF NOT EXISTS system.integrations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,
  type           text NOT NULL CHECK (type IN ('mcp','api','webhook','cli')),
  enabled        bool NOT NULL DEFAULT false,
  config         jsonb DEFAULT '{}'::jsonb,
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','active','deprecated')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ───────── Recipes ─────────
CREATE TABLE IF NOT EXISTS system.recipes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,
  employee_id    text NOT NULL CHECK (employee_id ~ '^v[0-9]+\.[a-z_]+$'),
  trigger        text NOT NULL CHECK (trigger IN ('cron','event','manual')),
  cron_expr      text,
  event_pattern  text,
  payload_schema jsonb DEFAULT '{}'::jsonb,
  active         bool NOT NULL DEFAULT false,
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','active','deprecated')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  CONSTRAINT cron_requires_expr CHECK (trigger != 'cron' OR cron_expr IS NOT NULL)
);

-- ───────── Context docs ─────────
CREATE TABLE IF NOT EXISTS system.context_docs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    text CHECK (employee_id IS NULL OR employee_id ~ '^v[0-9]+\.[a-z_]+$'),
  title          text NOT NULL,
  type           text NOT NULL
                 CHECK (type IN ('sop','icp','call_recap','adr','never_rule')),
  source_url     text,
  content        text,
  tags           text[] DEFAULT '{}',
  updated_at     timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);

-- ───────── Junctions ─────────
CREATE TABLE IF NOT EXISTS system.recipe_skills (
  recipe_id      uuid NOT NULL REFERENCES system.recipes(id) ON DELETE CASCADE,
  skill_id       uuid NOT NULL REFERENCES system.skills(id) ON DELETE RESTRICT,
  step_order     int NOT NULL DEFAULT 0,
  PRIMARY KEY (recipe_id, skill_id)
);

CREATE TABLE IF NOT EXISTS system.employee_skills (
  employee_id    text NOT NULL CHECK (employee_id ~ '^v[0-9]+\.[a-z_]+$'),
  skill_id       uuid NOT NULL REFERENCES system.skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (employee_id, skill_id)
);

CREATE TABLE IF NOT EXISTS system.employee_integrations (
  employee_id    text NOT NULL CHECK (employee_id ~ '^v[0-9]+\.[a-z_]+$'),
  integration_id uuid NOT NULL REFERENCES system.integrations(id) ON DELETE RESTRICT,
  PRIMARY KEY (employee_id, integration_id)
);

-- ───────── Indexes ─────────
CREATE INDEX IF NOT EXISTS idx_recipes_employee_id ON system.recipes(employee_id);
CREATE INDEX IF NOT EXISTS idx_context_docs_employee_id ON system.context_docs(employee_id);
CREATE INDEX IF NOT EXISTS idx_skills_status ON system.skills(status);
CREATE INDEX IF NOT EXISTS idx_recipes_active_status ON system.recipes(active, status);

-- ───────── updated_at trigger ─────────
CREATE OR REPLACE FUNCTION system.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_skills_updated_at ON system.skills;
CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON system.skills
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_recipes_updated_at ON system.recipes;
CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON system.recipes
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_integrations_updated_at ON system.integrations;
CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON system.integrations
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_context_docs_updated_at ON system.context_docs;
CREATE TRIGGER trg_context_docs_updated_at
  BEFORE UPDATE ON system.context_docs
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

-- ───────── RLS ─────────
ALTER TABLE system.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.context_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.recipe_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.employee_integrations ENABLE ROW LEVEL SECURITY;

-- GRANTs antes de POLICY (Regra W + FF)
GRANT SELECT ON system.skills, system.recipes, system.integrations, system.context_docs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON system.skills, system.recipes, system.integrations, system.context_docs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  system.recipe_skills, system.employee_skills, system.employee_integrations TO authenticated;
GRANT ALL ON system.skills, system.recipes, system.integrations, system.context_docs,
              system.recipe_skills, system.employee_skills, system.employee_integrations TO service_role;

-- Skills: authenticated lê active, staff CRUD
DROP POLICY IF EXISTS "skills_read_active" ON system.skills;
CREATE POLICY "skills_read_active" ON system.skills
  FOR SELECT TO authenticated
  USING (status = 'active' OR public.is_staff());

DROP POLICY IF EXISTS "skills_staff_write" ON system.skills;
CREATE POLICY "skills_staff_write" ON system.skills
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Recipes
DROP POLICY IF EXISTS "recipes_read" ON system.recipes;
CREATE POLICY "recipes_read" ON system.recipes
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "recipes_staff_write" ON system.recipes;
CREATE POLICY "recipes_staff_write" ON system.recipes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Integrations
DROP POLICY IF EXISTS "integrations_read" ON system.integrations;
CREATE POLICY "integrations_read" ON system.integrations
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "integrations_staff_write" ON system.integrations;
CREATE POLICY "integrations_staff_write" ON system.integrations
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Context docs: NULL employee_id = global (authenticated lê), específico = só staff
DROP POLICY IF EXISTS "context_docs_read" ON system.context_docs;
CREATE POLICY "context_docs_read" ON system.context_docs
  FOR SELECT TO authenticated
  USING (employee_id IS NULL OR public.is_staff());

DROP POLICY IF EXISTS "context_docs_staff_write" ON system.context_docs;
CREATE POLICY "context_docs_staff_write" ON system.context_docs
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Junctions
DROP POLICY IF EXISTS "recipe_skills_staff" ON system.recipe_skills;
CREATE POLICY "recipe_skills_staff" ON system.recipe_skills
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "employee_skills_staff" ON system.employee_skills;
CREATE POLICY "employee_skills_staff" ON system.employee_skills
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "employee_integrations_staff" ON system.employee_integrations;
CREATE POLICY "employee_integrations_staff" ON system.employee_integrations
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

COMMENT ON TABLE system.skills IS 'CookAI catalog · skills atómicas (ADR-011)';
COMMENT ON TABLE system.recipes IS 'CookAI catalog · workflows (sequência de skills) (ADR-011)';
COMMENT ON TABLE system.integrations IS 'CookAI catalog · MCPs/APIs/webhooks/CLIs (ADR-011)';
COMMENT ON TABLE system.context_docs IS 'CookAI catalog · SOPs, ICPs, calls, ADRs, NEVER rules (ADR-011)';
