-- 20260514_recipes_framework.sql
-- Enriquece system.recipes para framework executável que compõe skills.
-- Cada recipe tem steps[] onde cada step invoca uma skill_tag.

ALTER TABLE system.recipes
  ADD COLUMN IF NOT EXISTS description    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category       text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS steps          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS icon           text,
  ADD COLUMN IF NOT EXISTS brand_color    text,
  ADD COLUMN IF NOT EXISTS author_name    text,
  ADD COLUMN IF NOT EXISTS vertical       text,
  ADD COLUMN IF NOT EXISTS verticals      text[] NOT NULL DEFAULT '{*}',
  ADD COLUMN IF NOT EXISTS run_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_run_at    timestamptz,
  ADD COLUMN IF NOT EXISTS display_order  integer NOT NULL DEFAULT 100;

-- Relaxa NOT NULL em campos legacy para permitir creates da UI
ALTER TABLE system.recipes ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE system.recipes ALTER COLUMN trigger     DROP NOT NULL;

CREATE INDEX IF NOT EXISTS recipes_category_idx  ON system.recipes (category);
CREATE INDEX IF NOT EXISTS recipes_verticals_idx ON system.recipes USING GIN (verticals);

DROP VIEW IF EXISTS public.system_recipes;
CREATE VIEW public.system_recipes AS
SELECT id, slug, name, description, category, steps, icon, brand_color,
       author_name, vertical, verticals, trigger, cron_expr, event_pattern,
       payload_schema, active, status, run_count, last_run_at, display_order,
       employee_id, created_at, updated_at
FROM system.recipes
ORDER BY display_order, name;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_recipes TO authenticated;
GRANT SELECT ON public.system_recipes TO anon;
GRANT ALL ON system.recipes TO authenticated, service_role;

-- 6 recipes canónicas PropTech compostas por skills
INSERT INTO system.recipes (slug, name, description, category, icon, brand_color, author_name, verticals, status, active, display_order, steps, trigger) VALUES
('launch-condo-onboarding','Onboarding de condomínio novo','Onboarding end-to-end: importa edifício, gera utilizadores portal, cria mandatos SEPA, envia welcome emails.','setup','Building','#3b82f6','Mário Carvalho','{v2}','active',true,10,
 '[{"name":"Importar dados edifício","skill_tag":"importador-v2"},{"name":"Gerar utilizadores portal","skill_tag":"compose-welcome-email"},{"name":"Criar mandatos SEPA","skill_tag":"writer"},{"name":"Enviar welcome batch","skill_tag":"gmail-sender"}]'::jsonb,'manual'),
('weekly-mora-batch','Aviso de mora mensal','Identifica condóminos com saldo devedor > 60 dias, calcula juros, gera carta + email + WhatsApp.','finance','AlertTriangle','#f59e0b','Mário Carvalho','{v2}','active',true,11,
 '[{"name":"Identificar moras > 60d","skill_tag":"verificar-mora"},{"name":"Calcular juros legais","skill_tag":"calcular-juros-mora"},{"name":"Redigir carta interpelação","skill_tag":"draft-aviso-mora"},{"name":"Enviar batch","skill_tag":"enviar-email-batch"}]'::jsonb,'manual'),
('publish-listing-multichannel','Publicar imóvel multi-canal','Publica simultaneamente em Idealista + Imovirtual + IG + LinkedIn com copy adaptado por canal.','growth','Megaphone','#ec4899','Mário Carvalho','{v7,v8}','active',true,12,
 '[{"name":"Gerar copy por canal","skill_tag":"adaptacao-multiplataforma"},{"name":"Carregar fotos otimizadas","skill_tag":"vision-analyse-foto"},{"name":"Publicar listings","skill_tag":"meta-publisher"},{"name":"Track entregue","skill_tag":"track-entrega"}]'::jsonb,'manual'),
('analyse-energy-bill','Análise factura energia','OCR factura → extrai consumo → simula tarifas alternativas → propõe mudança comercializador.','energy','Zap','#FFD60A','Mário Carvalho','{v4}','active',true,13,
 '[{"name":"OCR factura","skill_tag":"ocr-fatura"},{"name":"Simular tarifas","skill_tag":"simular-tarifas"},{"name":"Comparar poupança","skill_tag":"analisar-poupanca"},{"name":"Propor switch","skill_tag":"iniciar-mudanca-comercializador"}]'::jsonb,'manual'),
('daily-maintenance-triage','Triagem diária de avarias','Recebe pedidos do portal/WhatsApp, classifica urgência, score prestador, abre OT.','maintenance','Wrench','#10b981','Mário Carvalho','{v5}','active',true,14,
 '[{"name":"Classificar urgência","skill_tag":"triage-avaria"},{"name":"Match prestador","skill_tag":"match-prestador-geo"},{"name":"Score histórico","skill_tag":"score-prestador"},{"name":"Abrir OT","skill_tag":"abrir-ot"},{"name":"Notificar prestador","skill_tag":"compose-pedido-msg"}]'::jsonb,'manual'),
('insurance-renewal-check','Auditoria renovação seguros','Verifica seguros a renovar nos próximos 60 dias, simula 3 brokers, propõe mudança se poupança > 15%.','insurance','ShieldCheck','#1E3A8A','Mário Carvalho','{v3}','active',true,15,
 '[{"name":"Listar seguros a renovar","skill_tag":"alertar-renovacao"},{"name":"Auditar cobertura","skill_tag":"auditar-cobertura"},{"name":"Simular 3 brokers","skill_tag":"simular-seguro"},{"name":"Propor switch","skill_tag":"writer"}]'::jsonb,'manual')
ON CONFLICT (slug) DO NOTHING;

-- Backfill recipes legacy sem descrição/categoria
UPDATE system.recipes SET description = COALESCE(name, slug) || ' — recipe automatizada.',
                          author_name = COALESCE(author_name, 'Mário Carvalho')
WHERE description = '' OR description IS NULL;

UPDATE system.recipes SET category = CASE
  WHEN slug LIKE '%email%' OR slug LIKE '%comunica%'    THEN 'communication'
  WHEN slug LIKE '%mora%'  OR slug LIKE '%fatur%' OR slug LIKE '%cobr%' THEN 'finance'
  WHEN slug LIKE '%lead%'  OR slug LIKE '%ads%'   OR slug LIKE '%campanh%' THEN 'growth'
  WHEN slug LIKE '%seguro%'                       THEN 'insurance'
  WHEN slug LIKE '%energi%' OR slug LIKE '%tarif%' THEN 'energy'
  WHEN slug LIKE '%manut%' OR slug LIKE '%prestad%' OR slug LIKE '%avari%' THEN 'maintenance'
  WHEN slug LIKE '%assembleia%' OR slug LIKE '%ata%' OR slug LIKE '%convoca%' THEN 'governance'
  WHEN slug LIKE '%onboard%' OR slug LIKE '%setup%' THEN 'setup'
  ELSE category
END WHERE category = 'general';

NOTIFY pgrst, 'reload schema';
