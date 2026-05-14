-- Sprint A: Step config rico (agent/human + input + skills[] + retry + jump)
-- Cada step em recipes.steps[] passa a ter forma rica retrocompatível com legacy.

CREATE OR REPLACE FUNCTION system.normalize_step(step jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'name',          COALESCE(step->>'name', 'Unnamed'),
    'type',          COALESCE(step->>'type', 'agent'),
    'input',         COALESCE(step->>'input', ''),
    'skills',        COALESCE(
                       step->'skills',
                       CASE WHEN step->>'skill_tag' IS NOT NULL
                            THEN jsonb_build_array(step->>'skill_tag')
                            ELSE '[]'::jsonb END
                     ),
    'retry_max',     COALESCE((step->>'retry_max')::int, 2),
    'jump_back_to',  COALESCE(step->>'jump_back_to', 'stop'),
    'skill_tag',     step->>'skill_tag'
  );
$$;

DROP VIEW IF EXISTS public.system_recipes;
CREATE VIEW public.system_recipes AS
SELECT
  id, slug, name, description, category,
  (SELECT jsonb_agg(system.normalize_step(s)) FROM jsonb_array_elements(COALESCE(steps,'[]'::jsonb)) s) AS steps,
  icon, brand_color, author_name, vertical, verticals,
  trigger, cron_expr, event_pattern, payload_schema,
  active, status, run_count, last_run_at, display_order,
  employee_id, created_at, updated_at
FROM system.recipes
ORDER BY display_order, name;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_recipes TO authenticated;
GRANT SELECT ON public.system_recipes TO anon;

-- Promote 2 recipes seed para usar novo shape rico (demo)
UPDATE system.recipes SET steps = '[
  {"name":"Importar dados edifício","type":"agent","input":"Importa edifício {{building_id}} do V2 legacy. Inclui condóminos, fracções, mandatos.","skills":["importador-v2"],"retry_max":3,"jump_back_to":"stop"},
  {"name":"Gerar utilizadores portal","type":"agent","input":"Para cada condómino, gera credenciais portal e magic link expiry 7d.","skills":["compose-welcome-email"],"retry_max":2,"jump_back_to":"stop"},
  {"name":"Aprovar lote mandatos SEPA","type":"human","input":"Revê {{mandate_count}} mandatos antes de envio para o banco.","skills":[],"retry_max":0,"jump_back_to":"stop"},
  {"name":"Enviar welcome batch","type":"agent","input":"Envia email welcome para {{recipient_list}} usando template welcome-v2-2026.","skills":["gmail-sender","writer"],"retry_max":2,"jump_back_to":"stop"}
]'::jsonb WHERE slug = 'launch-condo-onboarding';

UPDATE system.recipes SET steps = '[
  {"name":"Identificar moras > 60d","type":"agent","input":"Lista condóminos com saldo devedor > 60 dias na vertical {{vertical}}.","skills":["verificar-mora"],"retry_max":1,"jump_back_to":"stop"},
  {"name":"Calcular juros legais","type":"agent","input":"Para cada caso, calcula juros legais PT (taxa actual + IRC art. 559).","skills":["calcular-juros-mora"],"retry_max":1,"jump_back_to":"stop"},
  {"name":"Redigir carta interpelação","type":"agent","input":"Carta formal PT-PT com NIF, saldo, juros, prazo 30 dias.","skills":["draft-aviso-mora","writer"],"retry_max":2,"jump_back_to":"stop"},
  {"name":"Aprovar batch antes envio","type":"human","input":"Revê {{letter_count}} cartas antes de envio em massa.","skills":[],"retry_max":0,"jump_back_to":"stop"},
  {"name":"Enviar batch","type":"agent","input":"Envia via Gmail + registo entrega.","skills":["enviar-email-batch","gmail-sender"],"retry_max":2,"jump_back_to":"stop"}
]'::jsonb WHERE slug = 'weekly-mora-batch';

NOTIFY pgrst, 'reload schema';
