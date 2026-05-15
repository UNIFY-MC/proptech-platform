-- Sprint Q5 — Skill Marketplace interno
--
-- Bia (V5) cria skill 'triagem-avaria' → publica visibility='team'
-- Diretor Marketing (V7) vê em /skills/marketplace → Install → adiciona à sua lista
-- Cross-vertical knowledge sharing dentro da equipa Property007.

BEGIN;

-- ───────── 1. ALTER skills: ownership + visibility ─────────
ALTER TABLE system.skills
  ADD COLUMN IF NOT EXISTS owner_employee_id text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'team'
                          CHECK (visibility IN ('private','team','public')),
  ADD COLUMN IF NOT EXISTS verticals_scope text[] NOT NULL DEFAULT '{*}';

CREATE INDEX IF NOT EXISTS idx_skills_visibility_team
  ON system.skills (visibility) WHERE visibility = 'team';

CREATE INDEX IF NOT EXISTS idx_skills_owner
  ON system.skills (owner_employee_id) WHERE owner_employee_id IS NOT NULL;

-- ───────── 2. skill_installs ─────────
CREATE TABLE IF NOT EXISTS system.skill_installs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id                    uuid NOT NULL REFERENCES system.skills(id) ON DELETE CASCADE,
  installed_by_employee_id    text NOT NULL,
  installed_at                timestamptz NOT NULL DEFAULT now(),
  active                      boolean NOT NULL DEFAULT true,
  UNIQUE (skill_id, installed_by_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_installs_employee
  ON system.skill_installs (installed_by_employee_id) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_skill_installs_skill
  ON system.skill_installs (skill_id) WHERE active = true;

-- ───────── 3. RPC skill_install ─────────
CREATE OR REPLACE FUNCTION system.skill_install(
  p_skill_id uuid,
  p_employee_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public
AS $$
DECLARE
  v_install_id uuid;
BEGIN
  INSERT INTO system.skill_installs (skill_id, installed_by_employee_id)
  VALUES (p_skill_id, p_employee_id)
  ON CONFLICT (skill_id, installed_by_employee_id) DO UPDATE
    SET active = true, installed_at = now()
  RETURNING id INTO v_install_id;

  -- Incrementa usage hint
  UPDATE system.skills SET usage_count = coalesce(usage_count, 0) + 1
  WHERE id = p_skill_id;

  RETURN v_install_id;
END;
$$;

GRANT EXECUTE ON FUNCTION system.skill_install(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION system.skill_uninstall(p_skill_id uuid, p_employee_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = system, public AS $$
BEGIN
  UPDATE system.skill_installs SET active = false
  WHERE skill_id = p_skill_id AND installed_by_employee_id = p_employee_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION system.skill_uninstall(uuid, text) TO authenticated, service_role;

-- ───────── 4. View public.system_skills_marketplace ─────────
-- Acrescenta install count + boolean installed_by_me
DROP VIEW IF EXISTS public.system_skills_marketplace;
CREATE VIEW public.system_skills_marketplace
  WITH (security_invoker = on)
AS
SELECT
  s.id,
  s.tag,
  s.slug,
  s.name,
  s.description,
  s.category,
  s.status,
  s.connectors,
  s.fallback_agent,
  s.usage_count,
  s.owner_employee_id,
  s.visibility,
  s.verticals_scope,
  s.created_at,
  s.updated_at,
  (SELECT count(*) FROM system.skill_installs si WHERE si.skill_id = s.id AND si.active = true) AS install_count
FROM system.skills s
WHERE s.visibility IN ('team','public') AND s.status = 'active';

GRANT SELECT ON public.system_skills_marketplace TO authenticated, service_role;

-- View para "minhas installs" (joined)
DROP VIEW IF EXISTS public.system_my_skill_installs;
CREATE VIEW public.system_my_skill_installs
  WITH (security_invoker = on)
AS
SELECT
  si.id, si.skill_id, si.installed_by_employee_id, si.installed_at, si.active,
  s.tag, s.slug, s.name, s.description, s.category, s.status,
  s.connectors, s.fallback_agent, s.usage_count
FROM system.skill_installs si
JOIN system.skills s ON s.id = si.skill_id
WHERE si.active = true;

GRANT SELECT ON public.system_my_skill_installs TO authenticated, service_role;

-- ───────── 5. RLS ─────────
ALTER TABLE system.skill_installs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON system.skill_installs TO authenticated;
GRANT ALL ON system.skill_installs TO service_role;

DROP POLICY IF EXISTS "skill_installs_staff" ON system.skill_installs;
CREATE POLICY "skill_installs_staff" ON system.skill_installs
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

COMMIT;
