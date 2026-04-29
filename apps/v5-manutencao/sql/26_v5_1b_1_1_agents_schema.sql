-- ═══════════════════════════════════════════════════════════════
-- Sprint 1B.1.1 — Schema agents infraestrutura (Onda 1B)
-- core.agent_audit_log  (ALTER — tabela existia com schema diferente)
-- core.agent_policies   (ALTER — tabela existia com schema JSONB stub)
-- core.api_usage        (CREATE)
-- core.fn_can_use_api   (CREATE — gatekeeper SECURITY DEFINER)
-- core.fn_cleanup_api_usage (CREATE — auto-limpeza 30 dias)
--
-- Regra W: GRANT EXECUTE TO <role> + REVOKE FROM PUBLIC/anon
-- Regra X: RLS ENABLE + GRANT antes de CREATE POLICY
--
-- Helpers em schema 'public' (não 'auth'):
--   public.current_pessoa_id()
--   public.current_organization_ids()
--   public.is_staff()
--
-- Aplicado em: 2026-04-27
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────
-- TAREFA 1 — core.agent_audit_log
-- Tabela existia com schema diferente (0 dados) — ALTER para
-- adicionar colunas em falta + corrigir GRANTs + criar policies
-- ─────────────────────────────────────────────────────────────

ALTER TABLE core.agent_audit_log
  ADD COLUMN IF NOT EXISTS pessoa_id     UUID        REFERENCES core.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tool_error    TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens  INT,
  ADD COLUMN IF NOT EXISTS output_tokens INT,
  ADD COLUMN IF NOT EXISTS cost_eur      NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS model         TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_session ON core.agent_audit_log(session_id, iteration);
CREATE INDEX IF NOT EXISTS idx_audit_pessoa  ON core.agent_audit_log(pessoa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_agent   ON core.agent_audit_log(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_cost    ON core.agent_audit_log(organization_id, created_at)
  WHERE cost_eur IS NOT NULL;

-- Corrigir GRANTs: anon tinha ALL — risco de segurança
REVOKE ALL ON core.agent_audit_log FROM anon;
-- authenticated não precisa de UPDATE/DELETE/TRUNCATE
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON core.agent_audit_log FROM authenticated;
GRANT SELECT, INSERT ON core.agent_audit_log TO authenticated;
GRANT ALL            ON core.agent_audit_log TO service_role;

-- Policies (DROP IF EXISTS porque CREATE POLICY não suporta IF NOT EXISTS)
DROP POLICY IF EXISTS "Pessoa vê apenas suas execuções" ON core.agent_audit_log;
DROP POLICY IF EXISTS "Staff vê tudo da sua org"        ON core.agent_audit_log;
DROP POLICY IF EXISTS "Service role escreve"            ON core.agent_audit_log;

CREATE POLICY "Pessoa vê apenas suas execuções"
  ON core.agent_audit_log FOR SELECT TO authenticated
  USING (pessoa_id = public.current_pessoa_id());

CREATE POLICY "Staff vê tudo da sua org"
  ON core.agent_audit_log FOR SELECT TO authenticated
  USING (public.is_staff() AND organization_id = ANY(public.current_organization_ids()));

CREATE POLICY "Service role escreve"
  ON core.agent_audit_log FOR INSERT TO service_role
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- TAREFA 2 — core.agent_policies
-- Tabela existia com schema JSONB stub (0 dados) — ALTER para
-- adicionar colunas granulares + UNIQUE composta + GRANTs + policy + seeds
-- ─────────────────────────────────────────────────────────────

ALTER TABLE core.agent_policies
  ADD COLUMN IF NOT EXISTS agent_name                 TEXT,
  ADD COLUMN IF NOT EXISTS enabled                    BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_calls_per_user_day     INT           DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_calls_per_org_day      INT           DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS max_cost_eur_per_org_month NUMERIC(10,2) DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS approval_required_tools    TEXT[]        DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS approval_threshold_eur     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS model                      TEXT          DEFAULT 'claude-sonnet-4-6',
  ADD COLUMN IF NOT EXISTS created_at                 TIMESTAMPTZ   DEFAULT NOW();

-- Substituir UNIQUE (organization_id) por UNIQUE (organization_id, agent_name)
-- A constraint original era agent_policies_organization_id_key (uma policy por org — errado)
ALTER TABLE core.agent_policies
  DROP CONSTRAINT IF EXISTS agent_policies_organization_id_key;
ALTER TABLE core.agent_policies
  DROP CONSTRAINT IF EXISTS agent_policies_org_agent_unique;
ALTER TABLE core.agent_policies
  ADD CONSTRAINT agent_policies_org_agent_unique UNIQUE (organization_id, agent_name);

-- Corrigir GRANTs: anon tinha ALL
REVOKE ALL ON core.agent_policies FROM anon;
-- authenticated só SELECT (gestão reservada a backoffice via service_role)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON core.agent_policies FROM authenticated;
GRANT SELECT ON core.agent_policies TO authenticated;
GRANT ALL    ON core.agent_policies TO service_role;

DROP POLICY IF EXISTS "Pessoa vê policies da sua org" ON core.agent_policies;

CREATE POLICY "Pessoa vê policies da sua org"
  ON core.agent_policies FOR SELECT TO authenticated
  USING (organization_id = ANY(public.current_organization_ids()));

-- Seeds default por org
-- v5.image_inspector → Opus 4.7 (Vision precisa precisão; custo justificado)
INSERT INTO core.agent_policies
  (organization_id, agent_name, model, approval_required_tools)
SELECT id,
       'v5.image_inspector',
       'claude-opus-4-7',
       ARRAY['equipamento.create_or_update']::TEXT[]
FROM core.organizations
ON CONFLICT (organization_id, agent_name) DO NOTHING;

-- v5.casa_advisor → Sonnet 4.6 (cost-effective para conversação)
INSERT INTO core.agent_policies
  (organization_id, agent_name, model, approval_required_tools)
SELECT id,
       'v5.casa_advisor',
       'claude-sonnet-4-6',
       ARRAY['pedidos.create_rfq_draft']::TEXT[]
FROM core.organizations
ON CONFLICT (organization_id, agent_name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- TAREFA 3 — core.api_usage (tabela nova)
-- Rate limit tracker · auto-cleanup 30 dias
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.api_usage (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID        NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  endpoint  TEXT        NOT NULL,
  used_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_lookup
  ON core.api_usage(pessoa_id, endpoint, used_at DESC);

ALTER TABLE core.api_usage ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON core.api_usage TO authenticated;
GRANT ALL            ON core.api_usage TO service_role;

DROP POLICY IF EXISTS "Pessoa só vê o seu uso"        ON core.api_usage;
DROP POLICY IF EXISTS "Pessoa insere seu próprio uso"  ON core.api_usage;

CREATE POLICY "Pessoa só vê o seu uso"
  ON core.api_usage FOR SELECT TO authenticated
  USING (pessoa_id = public.current_pessoa_id());

CREATE POLICY "Pessoa insere seu próprio uso"
  ON core.api_usage FOR INSERT TO authenticated
  WITH CHECK (pessoa_id = public.current_pessoa_id());

-- Cleanup function (invocar via pg_cron ou Edge Function de manutenção)
CREATE OR REPLACE FUNCTION core.fn_cleanup_api_usage()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE v_deleted INT;
BEGIN
  DELETE FROM core.api_usage WHERE used_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $$;

REVOKE EXECUTE ON FUNCTION core.fn_cleanup_api_usage() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION core.fn_cleanup_api_usage() TO service_role;


-- ─────────────────────────────────────────────────────────────
-- TAREFA 4 — core.fn_can_use_api
-- Gatekeeper chamado por cada Edge Function de agent antes de
-- executar. Verifica quota + regista em api_usage numa transacção.
--
-- Convenção free tier (documentada aqui — sem mudança SQL):
--   image_inspector: Edge Fn chama fn_can_use_api 2×:
--     fn_can_use_api('agent.image_inspector', 3, 24)   → 3/dia
--     fn_can_use_api('agent.image_inspector', 10, 720) → 10/mês
--   Bloqueia se qualquer devolver allowed=false.
--
--   Home+: Edge Fn passa p_limit=999999 se
--     core.pessoas.metadata->>'tier' = 'home_plus'
--   (Stripe + tier real: Onda 2)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION core.fn_can_use_api(
  p_endpoint     TEXT,
  p_limit        INT DEFAULT 10,
  p_window_hours INT DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_pessoa_id UUID;
  v_used      INT;
BEGIN
  v_pessoa_id := public.current_pessoa_id();
  IF v_pessoa_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_used
  FROM core.api_usage
  WHERE pessoa_id = v_pessoa_id
    AND endpoint  = p_endpoint
    AND used_at   > NOW() - (p_window_hours || ' hours')::INTERVAL;

  IF v_used >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed',      false,
      'used',         v_used,
      'limit',        p_limit,
      'remaining',    0,
      'window_hours', p_window_hours,
      'message',      'Limite atingido. Faz upgrade para Home+ para uso ilimitado.'
    );
  END IF;

  INSERT INTO core.api_usage (pessoa_id, endpoint)
  VALUES (v_pessoa_id, p_endpoint);

  RETURN jsonb_build_object(
    'allowed',      true,
    'used',         v_used + 1,
    'limit',        p_limit,
    'remaining',    p_limit - v_used - 1,
    'window_hours', p_window_hours
  );
END $$;

REVOKE EXECUTE ON FUNCTION core.fn_can_use_api(TEXT, INT, INT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION core.fn_can_use_api(TEXT, INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';
