-- Sprint D: connectors[] + permissions jsonb per recipe
-- Permite scope quais integrations a recipe pode usar + flags de approval/writes.

ALTER TABLE system.recipes
  ADD COLUMN IF NOT EXISTS connectors  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS permissions jsonb  NOT NULL DEFAULT
    '{"writes_allowed": true, "requires_approval": false, "external_email": false}'::jsonb;

DROP VIEW IF EXISTS public.system_recipes;
CREATE VIEW public.system_recipes AS
SELECT
  id, slug, name, description, category,
  (SELECT jsonb_agg(system.normalize_step(s)) FROM jsonb_array_elements(COALESCE(steps,'[]'::jsonb)) s) AS steps,
  icon, brand_color, author_name, vertical, verticals,
  trigger, cron_expr, event_pattern, payload_schema,
  active, status, run_count, last_run_at, display_order,
  employee_id, connectors, permissions,
  created_at, updated_at
FROM system.recipes
ORDER BY display_order, name;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_recipes TO authenticated;
GRANT SELECT ON public.system_recipes TO anon;

NOTIFY pgrst, 'reload schema';
