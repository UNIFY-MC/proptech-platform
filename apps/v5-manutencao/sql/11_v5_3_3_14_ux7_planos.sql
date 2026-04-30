-- 3.3.14-fix-ux7 — Tarefa A: planos_subscricao + descontos_config
-- Aplicado via Supabase MCP em 2026-04-26
-- Fix 2026-05-01: BEGIN/COMMIT + RLS + NOTIFY pgrst

BEGIN;

CREATE TABLE IF NOT EXISTS v5_manutencao.planos_subscricao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  preco_mensal numeric(10,2),
  desconto_pct int,
  desconto_max_eur numeric(10,2),
  beneficios jsonb DEFAULT '[]'::jsonb,
  ativo boolean DEFAULT true,
  ordem int DEFAULT 100
);

-- RLS: public read, admin write (via service_role)
ALTER TABLE v5_manutencao.planos_subscricao ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON v5_manutencao.planos_subscricao TO anon, authenticated;
GRANT ALL ON v5_manutencao.planos_subscricao TO service_role;

CREATE POLICY "planos_subscricao_public_read"
  ON v5_manutencao.planos_subscricao
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS v5_manutencao.descontos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  tipo text CHECK (tipo IN ('plano','codigo_promo','sazonal','primeira_compra','referral')),
  valor_pct int,
  valor_eur numeric(10,2),
  aplica_a_categorias jsonb DEFAULT '[]'::jsonb,
  exclui_combos boolean DEFAULT false,
  exclui_orcamentos boolean DEFAULT false,
  ativo boolean DEFAULT true,
  inicio timestamptz,
  fim timestamptz,
  uso_max int,
  uso_atual int DEFAULT 0,
  ordem int DEFAULT 100
);

-- RLS: public read, admin write (via service_role)
ALTER TABLE v5_manutencao.descontos_config ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON v5_manutencao.descontos_config TO anon, authenticated;
GRANT ALL ON v5_manutencao.descontos_config TO service_role;

CREATE POLICY "descontos_config_public_read"
  ON v5_manutencao.descontos_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO v5_manutencao.planos_subscricao
  (slug, nome, descricao, preco_mensal, desconto_pct, desconto_max_eur, beneficios, ordem)
VALUES
  ('home_plus', 'Home+',
   'O plano premium para quem quer cuidado contínuo da casa',
   9.99, 5, 50,
   '["5% off em todos os serviços (até 50€/mês)","Resposta urgente prioritária","Sem custos de chamada urgente","Avaliações trimestrais grátis","AI Expert Premium · perguntas ilimitadas","Histórico completo da casa exportável"]'::jsonb,
   10),
  ('home_pro', 'Home Pro',
   'Para gestores de múltiplos imóveis',
   24.99, 10, 200,
   '["10% off em todos os serviços (até 200€/mês)","Tudo do Home+","Gestão multi-imóvel","Relatórios consolidados","Suporte dedicado"]'::jsonb,
   20)
ON CONFLICT (slug) DO UPDATE SET
  preco_mensal = EXCLUDED.preco_mensal,
  desconto_pct = EXCLUDED.desconto_pct,
  beneficios   = EXCLUDED.beneficios;

INSERT INTO v5_manutencao.descontos_config (slug, nome, tipo, valor_pct, ativo, ordem) VALUES
  ('plano_home_plus',  'Plano Home+',                    'plano',           5, true, 10),
  ('plano_home_pro',   'Plano Home Pro',                 'plano',          10, true, 20),
  ('primeira_compra',  'Bem-vindo · 10% primeira compra','primeira_compra',10, true, 30)
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';

COMMIT;
