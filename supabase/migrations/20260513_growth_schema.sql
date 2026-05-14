-- =============================================================
-- ADR-015 — Schema growth.*
-- =============================================================
-- Funil unificado de leads + tracking Meta/Google + cross-sell automatizado.
-- 7 tabelas + 5 RPCs + 1 view funnel_summary.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS growth;
GRANT USAGE ON SCHEMA growth TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────
-- 1. Tabelas
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS growth.ad_sources (
  code       text PRIMARY KEY,                -- 'meta', 'google', 'linkedin', 'organic', 'referral'
  label      text NOT NULL,
  tipo       text NOT NULL CHECK (tipo IN ('paid','organic','referral','direct')),
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS growth.ad_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_source_code  text NOT NULL REFERENCES growth.ad_sources(code),
  external_id     text,                       -- ex: Meta campaign_id, Google AdGroup id
  nome            text NOT NULL,
  vertical_alvo   text,                       -- v2|v3|v4|v5|v10 — qual vertical convertem
  objetivo        text,                       -- 'leads' | 'awareness' | 'conversion'
  budget_total    numeric,
  budget_diario   numeric,
  data_inicio     date,
  data_fim        date,
  estado          text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','pausada','terminada')),
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_source ON growth.ad_campaigns(ad_source_code, estado);

CREATE TABLE IF NOT EXISTS growth.ad_spend (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_campaign_id  uuid NOT NULL REFERENCES growth.ad_campaigns(id) ON DELETE CASCADE,
  data            date NOT NULL,
  impressoes      int NOT NULL DEFAULT 0,
  cliques         int NOT NULL DEFAULT 0,
  spend           numeric NOT NULL DEFAULT 0, -- € gasto nesse dia
  conversoes      int NOT NULL DEFAULT 0,
  cpm             numeric,                    -- custo por 1000 impressões
  cpc             numeric,                    -- custo por clique
  ctr             numeric,                    -- click-through-rate
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ad_campaign_id, data)
);
CREATE INDEX IF NOT EXISTS idx_adspend_campaign_data ON growth.ad_spend(ad_campaign_id, data DESC);

CREATE TABLE IF NOT EXISTS growth.leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       uuid REFERENCES core.pessoas(id) ON DELETE SET NULL,
  vertical_alvo   text NOT NULL,              -- v2|v3|v4|v5|v10
  -- Dados do lead
  nome            text,
  email           text,
  telefone        text,
  empresa         text,
  -- Atribuição
  ad_source_code  text REFERENCES growth.ad_sources(code),
  ad_campaign_id  uuid REFERENCES growth.ad_campaigns(id),
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text,
  referrer_url    text,
  landing_page    text,
  -- Estado funnel
  estado          text NOT NULL DEFAULT 'novo' CHECK (estado IN ('novo','qualificado','em_negociacao','convertido','perdido')),
  qualificado_em  timestamptz,
  convertido_em   timestamptz,
  perdido_em      timestamptz,
  motivo_perda    text,
  -- Dados vertical-específicos (json livre)
  dados_extra     jsonb,
  -- Score
  lead_score      int CHECK (lead_score BETWEEN 0 AND 100),
  -- Owner
  staff_owner_id  uuid,                       -- quem está a tratar
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_pessoa     ON growth.leads(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_leads_vertical   ON growth.leads(vertical_alvo, estado);
CREATE INDEX IF NOT EXISTS idx_leads_campaign   ON growth.leads(ad_campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_email      ON growth.leads(lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_created    ON growth.leads(created_at DESC);

CREATE TABLE IF NOT EXISTS growth.interacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES growth.leads(id) ON DELETE CASCADE,
  pessoa_id       uuid REFERENCES core.pessoas(id) ON DELETE SET NULL,
  vertical        text,
  tipo            text NOT NULL,              -- 'email_enviado'|'email_aberto'|'link_clicado'|'pagina_visita'|'simulador_completo'|'demo_agendada'|'whatsapp_enviado'
  canal           text,                       -- 'email'|'sms'|'whatsapp'|'web'|'meta_pixel'|'google_analytics'
  detalhe         text,
  url             text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interacoes_lead     ON growth.interacoes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interacoes_pessoa   ON growth.interacoes(pessoa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interacoes_tipo     ON growth.interacoes(tipo, created_at DESC);

CREATE TABLE IF NOT EXISTS growth.oportunidades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES growth.leads(id) ON DELETE SET NULL,
  pessoa_id       uuid REFERENCES core.pessoas(id) ON DELETE SET NULL,
  vertical        text NOT NULL,
  origem          text,                       -- 'lead'|'cross_sell'|'manual'|'rule_engine'
  cross_sell_rule_id uuid,                    -- se origem='cross_sell'
  valor_estimado  numeric,
  probabilidade   int CHECK (probabilidade BETWEEN 0 AND 100),
  estado          text NOT NULL DEFAULT 'qualificado' CHECK (estado IN ('qualificado','proposta','negociacao','ganha','perdida')),
  data_fecho_prevista date,
  data_fecho_real    date,
  motivo_perda    text,
  notas           text,
  staff_owner_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oportunidades_pessoa ON growth.oportunidades(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estado ON growth.oportunidades(vertical, estado);

CREATE TABLE IF NOT EXISTS growth.cross_sell_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text UNIQUE NOT NULL,
  descricao       text,
  vertical_origem text NOT NULL,              -- pessoa tem esta vertical
  vertical_alvo   text NOT NULL,              -- ofertar esta vertical
  -- Condições (DSL JSON)
  if_clause       jsonb NOT NULL,             -- ex: {"months_since_signup":{">=":6}, "no_vertical":"v4"}
  -- Acções
  then_clause     jsonb NOT NULL,             -- ex: {"create_oportunidade":{"valor":50}, "send_email":{"template":"x"}}
  -- Estado
  active          boolean NOT NULL DEFAULT true,
  priority        int NOT NULL DEFAULT 100,
  -- Métricas
  total_disparos  int NOT NULL DEFAULT 0,
  total_conversoes int NOT NULL DEFAULT 0,
  ultima_execucao timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cs_rules_active ON growth.cross_sell_rules(active, priority);

CREATE TABLE IF NOT EXISTS growth.segmentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text UNIQUE NOT NULL,
  descricao       text,
  query_sql       text,                       -- SQL que devolve pessoa_id (ex: cross-sell candidates)
  query_jsonb     jsonb,                      -- alternativa: DSL JSON convertida em SQL
  pessoa_count    int,                        -- snapshot cached
  ultima_actualizacao timestamptz,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- 2. Seeds
-- ─────────────────────────────────────────────────────────

INSERT INTO growth.ad_sources (code, label, tipo) VALUES
  ('meta',     'Meta Ads (Facebook + Instagram)', 'paid'),
  ('google',   'Google Ads',                     'paid'),
  ('linkedin', 'LinkedIn Ads',                   'paid'),
  ('organic',  'Tráfego orgânico (SEO)',         'organic'),
  ('referral', 'Indicação cliente / parceria',   'referral'),
  ('direct',   'Acesso directo',                 'direct'),
  ('email',    'Campanha email',                 'organic')
ON CONFLICT (code) DO NOTHING;

-- 3 cross_sell_rules iniciais
INSERT INTO growth.cross_sell_rules (nome, descricao, vertical_origem, vertical_alvo, if_clause, then_clause, priority) VALUES
  (
    'V2_to_V4_after_6_months',
    'Condóminos V2 com mais de 6 meses → ofertar simulador V4 Energia',
    'v2', 'v4',
    '{"months_since_signup": {">=": 6}, "no_vertical": "v4"}'::jsonb,
    '{"create_oportunidade": {"vertical": "v4", "valor_estimado": 120, "probabilidade": 30}, "send_email": {"template": "v2_to_v4_simulador"}}'::jsonb,
    10
  ),
  (
    'V2_to_V5_premium_condos',
    'Condóminos V2 em condomínios premium → ofertar plano V5 Manutenção',
    'v2', 'v5',
    '{"months_since_signup": {">=": 3}, "no_vertical": "v5", "permilagem_min": 8}'::jsonb,
    '{"create_oportunidade": {"vertical": "v5", "valor_estimado": 240, "probabilidade": 25}, "send_email": {"template": "v2_to_v5_manutencao_premium"}}'::jsonb,
    20
  ),
  (
    'V4_to_V3_after_signup',
    'Novos clientes V4 Energia → ofertar V3 Seguro com 10% desconto',
    'v4', 'v3',
    '{"days_since_signup": {">=": 14, "<=": 90}, "no_vertical": "v3"}'::jsonb,
    '{"create_oportunidade": {"vertical": "v3", "valor_estimado": 400, "probabilidade": 20}, "send_email": {"template": "v4_to_v3_seguro_combo", "desconto_pct": 10}}'::jsonb,
    30
  )
ON CONFLICT (nome) DO NOTHING;

-- 2 segmentos iniciais
INSERT INTO growth.segmentos (nome, descricao, query_sql) VALUES
  (
    'condominos_premium_sem_v5',
    'Condóminos V2 com permilagem >= 8 e SEM V5 Manutenção',
    'SELECT DISTINCT sa.pessoa_id FROM core.servicos_ativos sa JOIN v2_condominios.condominos c ON c.id = sa.ref_id LEFT JOIN v2_condominios.fracoes f ON f.id = c.fracao_id WHERE sa.vertical = ''v2'' AND sa.estado = ''activo'' AND f.permilagem >= 8 AND NOT EXISTS (SELECT 1 FROM core.servicos_ativos s2 WHERE s2.pessoa_id = sa.pessoa_id AND s2.vertical = ''v5'' AND s2.estado = ''activo'')'
  ),
  (
    'leads_v4_quentes',
    'Leads V4 qualificados nos últimos 30 dias com lead_score >= 70',
    'SELECT id FROM growth.leads WHERE vertical_alvo = ''v4'' AND estado = ''qualificado'' AND created_at > now() - interval ''30 days'' AND lead_score >= 70'
  )
ON CONFLICT (nome) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 3. RPCs
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION growth.criar_lead(
  p_vertical text,
  p_nome text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL,
  p_ad_source text DEFAULT NULL,
  p_ad_campaign_id uuid DEFAULT NULL,
  p_landing_page text DEFAULT NULL,
  p_dados_extra jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketing, public
AS $$
DECLARE v_id uuid; v_pessoa_id uuid;
BEGIN
  -- Auto-link a core.pessoas se email já existe
  IF p_email IS NOT NULL THEN
    SELECT id INTO v_pessoa_id FROM core.pessoas WHERE lower(email) = lower(p_email) LIMIT 1;
  END IF;

  INSERT INTO growth.leads (
    pessoa_id, vertical_alvo, nome, email, telefone,
    ad_source_code, ad_campaign_id,
    utm_source, utm_medium, utm_campaign, utm_content,
    landing_page, dados_extra
  ) VALUES (
    v_pessoa_id, p_vertical, p_nome, p_email, p_telefone,
    p_ad_source, p_ad_campaign_id,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content,
    p_landing_page, p_dados_extra
  )
  RETURNING id INTO v_id;

  PERFORM iam.log_activity('lead_criado',
    format('%s · %s · %s', p_vertical, p_email, COALESCE(p_utm_source, 'direct')),
    'ok', 'system', 'growth',
    jsonb_build_object('lead_id', v_id, 'ad_source', p_ad_source));

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION growth.qualificar_lead(
  p_lead_id uuid,
  p_lead_score int DEFAULT NULL,
  p_notas text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketing, public
AS $$
BEGIN
  IF NOT iam.has_permission('growth.leads', 'edit') AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE growth.leads
  SET estado = 'qualificado',
      qualificado_em = now(),
      lead_score = COALESCE(p_lead_score, lead_score),
      updated_at = now()
  WHERE id = p_lead_id AND estado = 'novo';

  PERFORM iam.log_activity('lead_qualificado', p_lead_id::text, 'ok', 'staff', 'growth');
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION growth.converter_lead(
  p_lead_id uuid,
  p_pessoa_id uuid DEFAULT NULL,
  p_valor_servico numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketing, public
AS $$
DECLARE v_lead record; v_servico_id uuid;
BEGIN
  IF NOT iam.has_permission('growth.leads', 'edit') AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_lead FROM growth.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;

  UPDATE growth.leads
  SET estado = 'convertido',
      convertido_em = now(),
      pessoa_id = COALESCE(p_pessoa_id, pessoa_id),
      updated_at = now()
  WHERE id = p_lead_id;

  -- Cria servico activo se ainda não existe
  INSERT INTO core.servicos_ativos (pessoa_id, vertical, ref_externa, estado, valor_mensal)
  SELECT COALESCE(p_pessoa_id, v_lead.pessoa_id), v_lead.vertical_alvo,
         'lead-' || p_lead_id::text, 'activo', p_valor_servico
  WHERE COALESCE(p_pessoa_id, v_lead.pessoa_id) IS NOT NULL
  ON CONFLICT (pessoa_id, vertical, ref_externa) DO NOTHING
  RETURNING id INTO v_servico_id;

  PERFORM iam.log_activity('lead_convertido',
    format('%s · valor %s', v_lead.vertical_alvo, COALESCE(p_valor_servico::text, '?')),
    'ok', 'staff', 'growth',
    jsonb_build_object('lead_id', p_lead_id, 'servico_id', v_servico_id));

  RETURN v_servico_id;
END; $$;

-- Engine cross-sell rules (cron diário)
CREATE OR REPLACE FUNCTION growth.executar_cross_sell_rules()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketing, public
AS $$
DECLARE v_rule record; v_count_total int := 0; v_count_per_rule int; v_results jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires staff role';
  END IF;

  FOR v_rule IN SELECT * FROM growth.cross_sell_rules WHERE active = true ORDER BY priority LOOP
    v_count_per_rule := 0;

    -- Para cada pessoa elegível, criar oportunidade
    INSERT INTO growth.oportunidades (pessoa_id, vertical, origem, cross_sell_rule_id, valor_estimado, probabilidade, estado)
    SELECT
      sa.pessoa_id,
      v_rule.vertical_alvo,
      'cross_sell',
      v_rule.id,
      COALESCE((v_rule.then_clause->'create_oportunidade'->>'valor_estimado')::numeric, 0),
      COALESCE((v_rule.then_clause->'create_oportunidade'->>'probabilidade')::int, 20),
      'qualificado'
    FROM core.servicos_ativos sa
    WHERE sa.vertical = v_rule.vertical_origem
      AND sa.estado = 'activo'
      AND NOT EXISTS (
        SELECT 1 FROM core.servicos_ativos s2
        WHERE s2.pessoa_id = sa.pessoa_id AND s2.vertical = v_rule.vertical_alvo AND s2.estado = 'activo'
      )
      AND NOT EXISTS (
        SELECT 1 FROM growth.oportunidades op
        WHERE op.pessoa_id = sa.pessoa_id
          AND op.vertical = v_rule.vertical_alvo
          AND op.cross_sell_rule_id = v_rule.id
          AND op.estado NOT IN ('perdida')
      )
      AND (CASE
        WHEN v_rule.if_clause ? 'months_since_signup'
        THEN sa.data_inicio <= CURRENT_DATE - ((v_rule.if_clause->'months_since_signup'->>'>=')::int || ' months')::interval
        ELSE TRUE END);

    GET DIAGNOSTICS v_count_per_rule = ROW_COUNT;

    UPDATE growth.cross_sell_rules
    SET total_disparos = total_disparos + v_count_per_rule,
        ultima_execucao = now()
    WHERE id = v_rule.id;

    v_results := v_results || jsonb_build_object('rule', v_rule.nome, 'novas_oportunidades', v_count_per_rule);
    v_count_total := v_count_total + v_count_per_rule;
  END LOOP;

  PERFORM iam.log_activity('cross_sell_rules_executed',
    format('%s oportunidades criadas em %s regras', v_count_total, jsonb_array_length(v_results)),
    'ok', 'system', 'growth',
    jsonb_build_object('total', v_count_total, 'breakdown', v_results));

  RETURN jsonb_build_object('total_oportunidades', v_count_total, 'breakdown', v_results, 'executed_at', now());
END; $$;

-- View funnel summary
CREATE OR REPLACE VIEW growth.funnel_summary AS
SELECT
  l.vertical_alvo as vertical,
  COALESCE(l.ad_source_code, 'direct') as ad_source,
  COALESCE(c.nome, 'sem campanha') as campanha,
  count(*) as leads_total,
  count(*) FILTER (WHERE l.estado = 'novo') as leads_novos,
  count(*) FILTER (WHERE l.estado = 'qualificado') as leads_qualificados,
  count(*) FILTER (WHERE l.estado = 'em_negociacao') as leads_em_negociacao,
  count(*) FILTER (WHERE l.estado = 'convertido') as leads_convertidos,
  count(*) FILTER (WHERE l.estado = 'perdido') as leads_perdidos,
  ROUND(count(*) FILTER (WHERE l.estado = 'convertido') * 100.0 / NULLIF(count(*), 0), 1) as conversion_rate_pct,
  (SELECT COALESCE(SUM(spend), 0) FROM growth.ad_spend WHERE ad_campaign_id = c.id) as total_spend,
  CASE WHEN count(*) > 0 THEN
    ROUND((SELECT COALESCE(SUM(spend), 0) FROM growth.ad_spend WHERE ad_campaign_id = c.id) / count(*), 2)
  ELSE NULL END as cpl
FROM growth.leads l
LEFT JOIN growth.ad_campaigns c ON c.id = l.ad_campaign_id
GROUP BY l.vertical_alvo, l.ad_source_code, c.id, c.nome;

-- ─────────────────────────────────────────────────────────
-- 4. GRANTs + RLS
-- ─────────────────────────────────────────────────────────

GRANT SELECT ON
  growth.ad_sources, growth.ad_campaigns, growth.ad_spend,
  growth.leads, growth.interacoes, growth.oportunidades,
  growth.cross_sell_rules, growth.segmentos, growth.funnel_summary
TO authenticated;

GRANT ALL ON
  growth.ad_sources, growth.ad_campaigns, growth.ad_spend,
  growth.leads, growth.interacoes, growth.oportunidades,
  growth.cross_sell_rules, growth.segmentos
TO service_role;

REVOKE ALL ON FUNCTION growth.criar_lead(text,text,text,text,text,text,text,text,text,uuid,text,jsonb) FROM public;
REVOKE ALL ON FUNCTION growth.qualificar_lead(uuid,int,text) FROM public;
REVOKE ALL ON FUNCTION growth.converter_lead(uuid,uuid,numeric) FROM public;
REVOKE ALL ON FUNCTION growth.executar_cross_sell_rules() FROM public;

GRANT EXECUTE ON FUNCTION growth.criar_lead(text,text,text,text,text,text,text,text,text,uuid,text,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION growth.qualificar_lead(uuid,int,text) TO authenticated;
GRANT EXECUTE ON FUNCTION growth.converter_lead(uuid,uuid,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION growth.executar_cross_sell_rules() TO authenticated;

ALTER TABLE growth.leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.interacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.oportunidades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.ad_campaigns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.ad_spend       ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.cross_sell_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.segmentos      ENABLE ROW LEVEL SECURITY;

CREATE POLICY mlead_read ON growth.leads FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY mint_read  ON growth.interacoes FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY mop_read   ON growth.oportunidades FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY mac_read   ON growth.ad_campaigns FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY mas_read   ON growth.ad_spend FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY mcs_read   ON growth.cross_sell_rules FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY mseg_read  ON growth.segmentos FOR SELECT TO authenticated USING (public.is_staff());

-- ─────────────────────────────────────────────────────────
-- 5. Adicionar schema marketing ao PostgREST
-- ─────────────────────────────────────────────────────────
ALTER ROLE authenticator SET pgrst.db_schemas =
  'public, graphql_public, core, system, iam, growth, v2_condominios, v3_seguros, v4_energia, v5_manutencao, v1_owners_club';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
