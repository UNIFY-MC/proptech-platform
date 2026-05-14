-- 20260514_skills_enriched_auto_creator.sql
-- Enriquece system.skills com connectors, context_files, fallback_agent, receipt_md, usage_count
-- + RPC skill_ensure(tag) idempotente para auto-create lazy
-- + seed 7 skills core (writer / gmail-sender / calendar-scheduler / meta-publisher /
--   frontend-design / ocr-fatura / fraction-lookup)
-- + relax status check (adiciona 'pending_receipt')

ALTER TABLE system.skills
  ADD COLUMN IF NOT EXISTS connectors     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS context_files  jsonb  NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fallback_agent text,
  ADD COLUMN IF NOT EXISTS usage_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at   timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_md     text;

CREATE UNIQUE INDEX IF NOT EXISTS skills_tag_unique ON system.skills (LOWER(tag));

ALTER TABLE system.skills DROP CONSTRAINT IF EXISTS skills_status_check;
ALTER TABLE system.skills ADD CONSTRAINT skills_status_check
  CHECK (status IN ('draft', 'active', 'deprecated', 'pending_receipt'));

CREATE OR REPLACE FUNCTION system.skill_ensure(
  p_tag         text,
  p_name        text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_category    text DEFAULT 'general'
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM system.skills WHERE LOWER(tag) = LOWER(p_tag) LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE system.skills SET usage_count = usage_count + 1, last_used_at = now() WHERE id = v_id;
    RETURN v_id;
  END IF;
  INSERT INTO system.skills (tag, slug, name, description, category, status, auto_generated, proposed_at, usage_count, last_used_at)
  VALUES (
    LOWER(p_tag),
    LOWER(p_tag) || '-' || substring(gen_random_uuid()::text, 1, 6),
    COALESCE(p_name, INITCAP(REPLACE(p_tag, '-', ' '))),
    COALESCE(p_description, 'Skill auto-created — receipt pendente.'),
    p_category, 'pending_receipt', true, now(), 1, now()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION system.skill_ensure(text, text, text, text) TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.system_skills;
CREATE VIEW public.system_skills AS
SELECT
  id, tag, slug, name, description, category, code_ref, status,
  input_schema, output_schema, prompt_template, receipt_md,
  connectors, context_files, fallback_agent,
  auto_generated, proposed_by_agent, proposed_at,
  reviewed_by, reviewed_at, review_notes,
  usage_count, last_used_at,
  created_at, updated_at
FROM system.skills;

GRANT SELECT ON public.system_skills TO anon, authenticated;

-- Seed core skills com receipts + connectors + fallback agents
INSERT INTO system.skills (tag, slug, name, description, category, status, auto_generated, connectors, fallback_agent, receipt_md, prompt_template) VALUES
('writer', 'writer', 'Writer', 'Produz conteúdo escrito (emails, posts, copy, relatórios) em PT-PT.', 'content', 'active', false, ARRAY['anthropic'], 'diretor-marketing',
 E'1. Lê o briefing e contexto da task.\n2. Identifica audiência, tom, formato.\n3. Produz draft em PT-PT.\n4. Auto-revê.\n5. Devolve summary + output_md.',
 'Produz {{format}} em PT-PT sobre: {{topic}}. Audiência: {{audience}}. Tom: {{tone}}.'),
('gmail-sender', 'gmail-sender', 'Gmail Sender', 'Envia emails via Gmail API a partir de drafts revistos.', 'communication', 'active', false, ARRAY['gmail','anthropic'], 'comunicacao-condo',
 E'1. Verifica draft aprovado.\n2. Confirma to/cc/bcc.\n3. Chama Gmail messages.send.\n4. Regista message_id.\n5. Marca step done.',
 'Envia email para {{to}} com subject {{subject}}.'),
('calendar-scheduler', 'calendar-scheduler', 'Calendar Scheduler', 'Agenda reuniões no Google Calendar com deteção de conflitos.', 'productivity', 'active', false, ARRAY['google-calendar','gmail','anthropic'], 'orquestrador-condo',
 E'1. Identifica participantes + duração + janela.\n2. freebusy.query.\n3. Propõe 3 slots.\n4. Após confirmação cria evento.\n5. Regista event_id.',
 'Agenda {{subject}} com {{participants}}.'),
('meta-publisher', 'meta-publisher', 'Meta Publisher', 'Publica posts Instagram + Facebook via Meta Graph.', 'social', 'active', false, ARRAY['meta-graph','anthropic'], 'diretor-marketing',
 E'1. Recebe copy + media.\n2. Upload IG container.\n3. Publica via media_publish.\n4. Crosspost FB.\n5. Regista permalink.',
 'Publica em {{platforms}} com caption {{caption}}.'),
('frontend-design', 'frontend-design', 'Frontend Design', 'Componentes UI React seguindo design system PropTech.', 'engineering', 'active', false, ARRAY['anthropic'], 'vertical-builder',
 E'1. Lê design system.\n2. Confirma tokens.\n3. Produz JSX + inline styles.\n4. Valida acessibilidade.\n5. Devolve diff.',
 'Cria componente {{component_name}}.'),
('ocr-fatura', 'ocr-fatura', 'OCR Fatura', 'Extrai dados de faturas PT via Claude Haiku 4.5 vision.', 'data-extraction', 'active', false, ARRAY['anthropic','supabase-storage'], 'energia-condo',
 E'1. Lê PDF do bucket.\n2. Claude Haiku 4.5 vision.\n3. Extrai NIF, total, consumo.\n4. Valida formatos PT.\n5. UPSERT em facturas_uploaded.',
 'Extrai dados da fatura {{file_url}}.'),
('fraction-lookup', 'fraction-lookup', 'Fraction Lookup', 'Consulta dados de fração e proprietário no V2.', 'data-lookup', 'active', false, ARRAY['supabase'], 'atendimento-condo',
 E'1. Recebe identificador.\n2. SELECT v2_condominios.\n3. Devolve permilagem + saldo.\n4. Se ambíguo pede clarificação.',
 'Procura fração {{query}}.')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      status = EXCLUDED.status,
      auto_generated = false,
      connectors = EXCLUDED.connectors,
      fallback_agent = EXCLUDED.fallback_agent,
      receipt_md = EXCLUDED.receipt_md,
      prompt_template = EXCLUDED.prompt_template;

-- Backfill tag = slug para skills antigas sem tag
UPDATE system.skills SET tag = slug WHERE tag IS NULL;

NOTIFY pgrst, 'reload schema';
