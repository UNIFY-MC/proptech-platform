-- ============================================================
-- system.skills — Sprint ε
-- Data: 2026-05-13
-- ============================================================
-- Skill lifecycle:
--   draft     → criado automaticamente por agent quando precisa
--                de capability que não existe
--   review    → submetido para aprovação do Mário
--   active    → activa, pode ser usada por agents
--   archived  → desactivada (não apagada)
--
-- Idempotente: ALTER aditivo sobre o que existe (cookai_skills).
-- Cria tabela se não existe.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS system;

CREATE TABLE IF NOT EXISTS system.skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  category    text,
  tag         text,
  input_schema  jsonb,
  output_schema jsonb,
  prompt_template text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system.skills
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','review','active','archived')),
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proposed_by_agent text,
  ADD COLUMN IF NOT EXISTS proposed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text;

CREATE INDEX IF NOT EXISTS skills_status_idx ON system.skills(status);

-- ============================================================
-- RPCs
-- ============================================================

-- skill_propose — usado por edge fn agent-self-generate-skill
CREATE OR REPLACE FUNCTION system.skill_propose(
  p_slug        text,
  p_name        text,
  p_description text,
  p_category    text DEFAULT NULL,
  p_tag         text DEFAULT NULL,
  p_input_schema  jsonb DEFAULT NULL,
  p_output_schema jsonb DEFAULT NULL,
  p_prompt_template text DEFAULT NULL,
  p_proposed_by_agent text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO system.skills
    (slug, name, description, category, tag,
     input_schema, output_schema, prompt_template,
     status, auto_generated, proposed_by_agent, proposed_at)
  VALUES
    (p_slug, p_name, p_description, p_category, p_tag,
     p_input_schema, p_output_schema, p_prompt_template,
     'review', true, p_proposed_by_agent, now())
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        proposed_at = now()
  RETURNING id INTO v_id;

  -- Cria approval em system.approvals_queue se a tabela existir
  BEGIN
    INSERT INTO system.approvals_queue
      (source_agent, action_type, draft_message, classification, status, target_vertical)
    VALUES
      (COALESCE(p_proposed_by_agent, 'unknown'),
       'skill_propose',
       format('Nova skill proposta: "%s" — %s', p_name, COALESCE(p_description, '')),
       jsonb_build_object('skill_id', v_id, 'slug', p_slug),
       'pending',
       NULL);
  EXCEPTION WHEN OTHERS THEN
    -- approvals_queue pode não existir ou ter shape diferente; ignora
    NULL;
  END;

  -- Inbox notification para Mário
  BEGIN
    INSERT INTO system.inbox_items
      (title, body, kind, source, payload, actions, expandable, status)
    VALUES
      (format('Skill proposta: %s', p_name),
       COALESCE(p_description, ''),
       'alert',
       'agent',
       jsonb_build_object('skill_id', v_id, 'slug', p_slug, 'proposed_by', p_proposed_by_agent),
       ARRAY['mark_read', 'archive'],
       true,
       'active');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION system.skill_propose(text, text, text, text, text, jsonb, jsonb, text, text)
  TO authenticated, service_role;

-- skill_activate
CREATE OR REPLACE FUNCTION system.skill_activate(p_skill_id uuid, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public, auth
AS $$
BEGIN
  UPDATE system.skills
     SET status = 'active',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_notes = p_notes
   WHERE id = p_skill_id;
END $$;

GRANT EXECUTE ON FUNCTION system.skill_activate(uuid, text) TO authenticated, service_role;

-- skill_archive
CREATE OR REPLACE FUNCTION system.skill_archive(p_skill_id uuid, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = system, public, auth
AS $$
BEGIN
  UPDATE system.skills
     SET status = 'archived',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_notes = p_notes
   WHERE id = p_skill_id;
END $$;

GRANT EXECUTE ON FUNCTION system.skill_archive(uuid, text) TO authenticated, service_role;

-- ============================================================
-- RLS open internal + GRANT
-- ============================================================
ALTER TABLE system.skills ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON system.skills TO authenticated, service_role;

DROP POLICY IF EXISTS skills_open_read  ON system.skills;
DROP POLICY IF EXISTS skills_open_write ON system.skills;
CREATE POLICY skills_open_read  ON system.skills FOR SELECT USING (true);
CREATE POLICY skills_open_write ON system.skills FOR ALL    USING (true) WITH CHECK (true);

-- ============================================================
-- View pública — actualiza/cria
-- ============================================================
CREATE OR REPLACE VIEW public.cookai_skills AS
  SELECT id, slug, name, description, category, tag,
         input_schema, output_schema, prompt_template,
         status, auto_generated, proposed_by_agent, proposed_at,
         reviewed_by, reviewed_at, review_notes,
         created_at, updated_at
  FROM system.skills;

GRANT SELECT ON public.cookai_skills TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
