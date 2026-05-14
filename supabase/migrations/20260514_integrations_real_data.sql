-- 20260514_integrations_real_data.sql
-- Limpa integrações legacy hardcoded (schemas internos a aparecer como "connected"
-- enganava o utilizador). Adiciona coluna kind para distinguir external/internal/mcp.
-- Apenas integrações com credencial real ficam 'connected'.

-- 1. Add kind column
ALTER TABLE system.integrations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'external'
    CHECK (kind IN ('external', 'internal', 'mcp'));

-- 2. Cleanup FK
DELETE FROM system.employee_integrations WHERE integration_id IN (
  SELECT id FROM system.integrations WHERE slug IN (
    'supabase-core', 'supabase-core-campanhas', 'supabase-core-leads',
    'supabase-core-pessoas', 'supabase-core-publicacoes',
    'supabase-v1', 'supabase-v2', 'supabase-v5',
    'supabase-v2-assembleias', 'supabase-v2-docs', 'supabase-v2-financeiro',
    'supabase-v2-compliance', 'supabase-v2-ev', 'supabase-v2-comunicacoes',
    'supabase-v2-fracoes', 'supabase-v2-historico', 'supabase-v2-seguros',
    'supabase-v3-seguros', 'supabase-v4-energia', 'supabase-v5-manutencao',
    'system-approvals-queue', 'system-inbox-items', 'email-webhook',
    'portal-webhook', 'docs-condo', 'email-attachments',
    'whatsapp', 'anthropic-vision'
  )
);

-- 3. Delete legacy rows (schemas/tabelas internos, duplicados, hardcoded)
DELETE FROM system.integrations WHERE slug IN (
  'supabase-core', 'supabase-core-campanhas', 'supabase-core-leads',
  'supabase-core-pessoas', 'supabase-core-publicacoes',
  'supabase-v1', 'supabase-v2', 'supabase-v5',
  'supabase-v2-assembleias', 'supabase-v2-docs', 'supabase-v2-financeiro',
  'supabase-v2-compliance', 'supabase-v2-ev', 'supabase-v2-comunicacoes',
  'supabase-v2-fracoes', 'supabase-v2-historico', 'supabase-v2-seguros',
  'supabase-v3-seguros', 'supabase-v4-energia', 'supabase-v5-manutencao',
  'system-approvals-queue', 'system-inbox-items', 'email-webhook',
  'portal-webhook', 'docs-condo', 'email-attachments',
  'whatsapp', 'anthropic-vision'
);

-- 4. Marcar MCPs reais com kind=mcp + reset status (não temos servers configurados)
UPDATE system.integrations SET kind = 'mcp', status = 'not_connected'
WHERE slug IN ('canva-mcp', 'facebook-ads-mcp', 'google-drive-mcp', 'meta-leads-mcp');

-- 5. Status='connected' apenas onde temos credencial real
UPDATE system.integrations SET status = 'not_connected'
WHERE status = 'connected'
  AND slug NOT IN ('anthropic', 'supabase', 'apify', 'vercel', 'github');

-- 6. Normalizar descrição/categoria das externas restantes (Moloni, PostHog, etc)
UPDATE system.integrations SET verticals = '{v4}',
       description = 'Preços mercado eletricidade ES+PT (Entidade Reguladora)',
       category = 'energy', brand_color = '#0066CC'
WHERE slug = 'erse-api';

UPDATE system.integrations SET verticals = '{v2}',
       description = 'Faturação online PT (alternativa Toconline)',
       category = 'finance', brand_color = '#ED1C24'
WHERE slug = 'moloni';

UPDATE system.integrations SET verticals = '{v3}',
       description = 'Agregador apólices/cotações brokers PT',
       category = 'insurance', brand_color = '#1E3A8A'
WHERE slug = 'seguradoras-api';

UPDATE system.integrations SET description = 'SMS transaccionais (Twilio alternative)',
       category = 'communication', brand_color = '#000000'
WHERE slug = 'vonage-sms';

UPDATE system.integrations SET description = 'Product analytics + session replay',
       category = 'data', brand_color = '#F9BD2B'
WHERE slug = 'posthog';

UPDATE system.integrations SET description = 'Notificações ops/alerts via Discord webhook',
       category = 'communication', brand_color = '#5865F2'
WHERE slug = 'discord-webhook';

-- 7. Refresh view com kind
DROP VIEW IF EXISTS public.system_integrations;
CREATE VIEW public.system_integrations AS
SELECT id, slug, name, description, category, kind, icon, icon_url, brand_color,
       verticals, connectors, status, auth_kind, connect_url, docs_url,
       config, display_order, type, enabled, created_at, updated_at
FROM system.integrations
ORDER BY kind, display_order, name;

GRANT SELECT ON public.system_integrations TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
