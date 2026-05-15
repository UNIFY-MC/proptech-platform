-- Sprint Q3 — Onboarding Flow Builder
--
-- Replace hardcoded 6 steps em ClientPortalPreviewPage por sistema editable:
-- 1. system.flow_templates (presets por vertical)
-- 2. system.client_flow_steps (instâncias por cliente)
-- 3. Seeds: condominio_intake, hvac_intake, seguros_onboarding
-- 4. RPC trigger: create_client_flow_from_template (uso em onboarding)

BEGIN;

-- ───────── 1. flow_templates ─────────
CREATE TABLE IF NOT EXISTS system.flow_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  vertical        text,
  description     text,
  default_steps   jsonb NOT NULL DEFAULT '[]'::jsonb,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_templates_vertical
  ON system.flow_templates (vertical) WHERE active = true;

-- ───────── 2. client_flow_steps ─────────
CREATE TABLE IF NOT EXISTS system.client_flow_steps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES system.clients(id) ON DELETE CASCADE,
  template_id     uuid REFERENCES system.flow_templates(id) ON DELETE SET NULL,
  step_index      int NOT NULL,
  label           text NOT NULL,
  type            text NOT NULL CHECK (type IN ('welcome','form','connect','watch','chat','done','custom')),
  required        boolean NOT NULL DEFAULT true,
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','done','skipped')),
  completed_at    timestamptz,
  form_responses  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, step_index)
);

CREATE INDEX IF NOT EXISTS idx_client_flow_steps_client
  ON system.client_flow_steps (client_id, step_index);

CREATE INDEX IF NOT EXISTS idx_client_flow_steps_status
  ON system.client_flow_steps (client_id, status);

-- ───────── 3. Seeds — 3 templates por vertical ─────────
INSERT INTO system.flow_templates (slug, name, vertical, description, default_steps) VALUES
('condominio_intake', 'Condomínio Intake', 'V2', 'Onboarding standard para administração de condomínio',
$j$[
  {"step_index": 1, "label": "Welcome", "type": "welcome", "required": true,
   "config": {"video_url": null, "headline": "Bem-vindo à Property007"}},
  {"step_index": 2, "label": "Dados do condomínio", "type": "form", "required": true,
   "config": {"fields": [{"name": "nif", "label": "NIF", "type": "text"}, {"name": "morada", "label": "Morada", "type": "text"}, {"name": "n_fracoes", "label": "Nº fracções", "type": "number"}]}},
  {"step_index": 3, "label": "Conectar ferramentas", "type": "connect", "required": true,
   "config": {"integrations": ["toconline","google_drive","whatsapp"]}},
  {"step_index": 4, "label": "Vê como funciona", "type": "watch", "required": false,
   "config": {"video_url": "https://property007.pt/intro-v2"}},
  {"step_index": 5, "label": "Chat com Orquestrador", "type": "chat", "required": true,
   "config": {"agent_id": "orquestrador-condo", "prompt_hint": "O que devo configurar primeiro?"}},
  {"step_index": 6, "label": "Done", "type": "done", "required": true,
   "config": {"next_url": "/dashboard"}}
]$j$::jsonb),

('hvac_intake', 'HVAC / Manutenção Intake', 'V5', 'Onboarding standard para empresa HVAC ou prestador manutenção',
$j$[
  {"step_index": 1, "label": "Welcome", "type": "welcome", "required": true,
   "config": {"headline": "Bem-vindo · Property007 V5 Manutenção"}},
  {"step_index": 2, "label": "Dados da empresa", "type": "form", "required": true,
   "config": {"fields": [{"name": "razao_social", "label": "Razão social", "type": "text"}, {"name": "especialidades", "label": "Especialidades", "type": "multiselect", "options": ["AVAC","eléctrica","canalização","pinturas","jardins"]}, {"name": "raio_acao_km", "label": "Raio de acção (km)", "type": "number"}]}},
  {"step_index": 3, "label": "Conectar WhatsApp Business", "type": "connect", "required": true,
   "config": {"integrations": ["whatsapp_business","google_calendar"]}},
  {"step_index": 4, "label": "Vê como a Bia despacha pedidos", "type": "watch", "required": false,
   "config": {"video_url": "https://property007.pt/intro-v5"}},
  {"step_index": 5, "label": "Chat com Bia", "type": "chat", "required": true,
   "config": {"agent_id": "bia", "prompt_hint": "Como posso receber pedidos?"}},
  {"step_index": 6, "label": "Done", "type": "done", "required": true,
   "config": {"next_url": "/dashboard"}}
]$j$::jsonb),

('seguros_onboarding', 'Seguros Onboarding', 'V3', 'Onboarding para mediadora de seguros',
$j$[
  {"step_index": 1, "label": "Welcome", "type": "welcome", "required": true,
   "config": {"headline": "Bem-vindo · V3 Seguros"}},
  {"step_index": 2, "label": "Dados do mediador", "type": "form", "required": true,
   "config": {"fields": [{"name": "cmvm", "label": "Nº CMVM", "type": "text"}, {"name": "companhias", "label": "Companhias representadas", "type": "multiselect", "options": ["Fidelidade","Tranquilidade","Lusitania","Generali","Allianz"]}]}},
  {"step_index": 3, "label": "Conectar Toconline + email", "type": "connect", "required": true,
   "config": {"integrations": ["toconline","gmail"]}},
  {"step_index": 4, "label": "Vê fluxo de renovações", "type": "watch", "required": false,
   "config": {"video_url": "https://property007.pt/intro-v3"}},
  {"step_index": 5, "label": "Chat com Compliance", "type": "chat", "required": true,
   "config": {"agent_id": "compliance-condo", "prompt_hint": "Quais os requisitos legais para mediação?"}},
  {"step_index": 6, "label": "Done", "type": "done", "required": true,
   "config": {"next_url": "/dashboard"}}
]$j$::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  vertical = EXCLUDED.vertical,
  description = EXCLUDED.description,
  default_steps = EXCLUDED.default_steps;

-- ───────── 4. RPC: create_client_flow_from_template ─────────
-- Copia default_steps de um template para client_flow_steps de um client.
CREATE OR REPLACE FUNCTION system.client_flow_create_from_template(
  p_client_id uuid,
  p_template_slug text
)
RETURNS int  -- número de steps criados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public
AS $$
DECLARE
  v_template_id uuid;
  v_default_steps jsonb;
  v_step jsonb;
  v_count int := 0;
BEGIN
  SELECT id, default_steps INTO v_template_id, v_default_steps
  FROM system.flow_templates
  WHERE slug = p_template_slug AND active = true
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'template_not_found: %', p_template_slug;
  END IF;

  -- Limpa steps existentes do cliente (re-init)
  DELETE FROM system.client_flow_steps WHERE client_id = p_client_id;

  -- Copia cada step
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_default_steps)
  LOOP
    INSERT INTO system.client_flow_steps (
      client_id, template_id, step_index, label, type, required, config
    ) VALUES (
      p_client_id, v_template_id,
      (v_step->>'step_index')::int,
      v_step->>'label',
      v_step->>'type',
      coalesce((v_step->>'required')::boolean, true),
      coalesce(v_step->'config', '{}'::jsonb)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION system.client_flow_create_from_template(uuid, text) TO authenticated, service_role;

-- ───────── 5. RPC update step ─────────
CREATE OR REPLACE FUNCTION system.client_flow_step_update(
  p_step_id uuid,
  p_status text DEFAULT NULL,
  p_form_responses jsonb DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_config jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = system, public
AS $$
DECLARE v_done boolean;
BEGIN
  v_done := (p_status = 'done');
  UPDATE system.client_flow_steps SET
    status = coalesce(p_status, status),
    form_responses = coalesce(p_form_responses, form_responses),
    label = coalesce(p_label, label),
    config = coalesce(p_config, config),
    completed_at = CASE WHEN v_done THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = p_step_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION system.client_flow_step_update(uuid, text, jsonb, text, jsonb) TO authenticated, service_role;

-- ───────── 6. RLS + grants ─────────
ALTER TABLE system.flow_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.client_flow_steps ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON system.flow_templates, system.client_flow_steps TO authenticated;
GRANT ALL ON system.flow_templates, system.client_flow_steps TO service_role;

DROP POLICY IF EXISTS "flow_templates_staff" ON system.flow_templates;
CREATE POLICY "flow_templates_staff" ON system.flow_templates
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "client_flow_steps_staff" ON system.client_flow_steps;
CREATE POLICY "client_flow_steps_staff" ON system.client_flow_steps
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS trg_flow_templates_updated_at ON system.flow_templates;
CREATE TRIGGER trg_flow_templates_updated_at
  BEFORE UPDATE ON system.flow_templates
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_client_flow_steps_updated_at ON system.client_flow_steps;
CREATE TRIGGER trg_client_flow_steps_updated_at
  BEFORE UPDATE ON system.client_flow_steps
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

-- ───────── 7. Views públicas ─────────
DROP VIEW IF EXISTS public.system_flow_templates;
CREATE VIEW public.system_flow_templates WITH (security_invoker = on) AS
SELECT id, slug, name, vertical, description, default_steps, active, created_at, updated_at,
       jsonb_array_length(default_steps) AS step_count
FROM system.flow_templates;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_flow_templates TO authenticated;

DROP VIEW IF EXISTS public.system_client_flow_steps;
CREATE VIEW public.system_client_flow_steps WITH (security_invoker = on) AS
SELECT id, client_id, template_id, step_index, label, type, required, config,
       status, completed_at, form_responses, created_at, updated_at
FROM system.client_flow_steps;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_client_flow_steps TO authenticated;

COMMIT;
