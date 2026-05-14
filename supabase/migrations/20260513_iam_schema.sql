-- =============================================================
-- ADR-013 — Schema iam (Identity and Access Management)
-- =============================================================
-- Centraliza permissões cross-vertical em V1 Core Hub.
-- Substitui v2_condominios.permission_* + activity_logs + portal_tokens.
-- Naming convention de secções: <prefixo_vertical>.<seccao_slug>
--   ex: v2.fracoes, v5.ordens, v4.simulador, marketing.leads, system.inbox
-- =============================================================

CREATE SCHEMA IF NOT EXISTS iam;
GRANT USAGE ON SCHEMA iam TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────
-- 1. Tabelas
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS iam.permission_groups (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  color       text NOT NULL DEFAULT 'grey',
  ordem       int  NOT NULL DEFAULT 100,
  descricao   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS iam.permission_sections (
  code      text PRIMARY KEY,  -- ex: v2.fracoes, v5.ordens, marketing.leads
  label     text NOT NULL,
  vertical  text NOT NULL,     -- v2 | v3 | v4 | v5 | v10 | marketing | system | core
  ordem     int  NOT NULL DEFAULT 100,
  descricao text
);
CREATE INDEX IF NOT EXISTS idx_iam_sections_vertical ON iam.permission_sections(vertical, ordem);

CREATE TABLE IF NOT EXISTS iam.permission_grants (
  group_code    text NOT NULL REFERENCES iam.permission_groups(code) ON DELETE CASCADE,
  section_code  text NOT NULL REFERENCES iam.permission_sections(code) ON DELETE CASCADE,
  can_view      boolean NOT NULL DEFAULT false,
  can_edit      boolean NOT NULL DEFAULT false,
  can_create    boolean NOT NULL DEFAULT false,
  can_delete    boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_code, section_code)
);

CREATE TABLE IF NOT EXISTS iam.staff_login_aliases (
  login                  text PRIMARY KEY,
  auth_user_id           uuid NOT NULL,
  permission_group_code  text NOT NULL REFERENCES iam.permission_groups(code),
  email                  text,
  nome                   text,
  active                 boolean NOT NULL DEFAULT true,
  last_login_at          timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_iam_aliases_authuid ON iam.staff_login_aliases(auth_user_id);

CREATE TABLE IF NOT EXISTS iam.portal_tokens (
  token                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id              uuid,  -- liga a core.pessoas (futuro: FK quando todas as verticais migrarem)
  vertical               text,  -- v2 | v3 | v4 ... (qual portal este token serve)
  fracao_id              uuid,  -- contexto vertical-específico (ex: V2 condomínios)
  email_legacy           text,
  nome_legacy            text,
  permission_group_code  text NOT NULL REFERENCES iam.permission_groups(code) DEFAULT 'condomino',
  active                 boolean NOT NULL DEFAULT true,
  last_used_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_iam_tokens_active ON iam.portal_tokens(active);

CREATE TABLE IF NOT EXISTS iam.activity_logs (
  id          bigserial PRIMARY KEY,
  ts          timestamptz NOT NULL DEFAULT now(),
  user_email  text,
  user_label  text,
  vertical    text,                              -- v2 | v3 | v4 | v5 | marketing | system
  origem      text NOT NULL,                     -- staff | portal | agent | system | api
  tipo        text NOT NULL,                     -- login | view | edit | create | delete | error
  detalhe     text,
  resultado   text NOT NULL DEFAULT 'ok',        -- ok | denied | error
  ip          text,
  user_agent  text,
  extra_data  jsonb
);
CREATE INDEX IF NOT EXISTS idx_iam_logs_ts       ON iam.activity_logs (ts DESC);
CREATE INDEX IF NOT EXISTS idx_iam_logs_vertical ON iam.activity_logs (vertical, ts DESC);
CREATE INDEX IF NOT EXISTS idx_iam_logs_origem   ON iam.activity_logs (origem);
CREATE INDEX IF NOT EXISTS idx_iam_logs_tipo     ON iam.activity_logs (tipo);
CREATE INDEX IF NOT EXISTS idx_iam_logs_user     ON iam.activity_logs (user_email);

-- ─────────────────────────────────────────────────────────
-- 2. Seeds (copiar do legacy v2_condominios.* + acrescentar V3/V4/V5)
-- ─────────────────────────────────────────────────────────

INSERT INTO iam.permission_groups (code, label, color, ordem, descricao) VALUES
  ('condomino',     'Condómino',     'green',  10, 'Condóminos com acesso ao portal-só-leitura'),
  ('operacional',   'Operacional',   'blue',   20, 'Equipa interna operacional (ver tudo, editar limitado)'),
  ('administrador', 'Administrador', 'gold',   30, 'Gestores com edição completa'),
  ('developer',     'Developer',     'purple', 99, 'Acesso total — para Mário e desenvolvimento')
ON CONFLICT (code) DO NOTHING;

-- V2 sections (14, migradas de v2_condominios.portal_sections)
INSERT INTO iam.permission_sections (code, label, vertical, ordem, descricao) VALUES
  ('v2.inicio',           'V2 · Início',                'v2', 100, 'Dashboard inicial V2'),
  ('v2.prestacao_contas', 'V2 · Prestação de Contas',   'v2', 110, 'Relatório anual + KPIs financeiros'),
  ('v2.fracoes',          'V2 · Frações',               'v2', 120, 'Lista de fracções do condomínio'),
  ('v2.condominos',       'V2 · Condóminos',            'v2', 130, 'Lista de condóminos'),
  ('v2.mora',             'V2 · Mora',                  'v2', 140, 'Quotas em dívida'),
  ('v2.recebimentos',     'V2 · Recebimentos',          'v2', 150, 'Pagamentos recebidos'),
  ('v2.bancos',           'V2 · Bancos / Extrato',      'v2', 160, 'Movimentos bancários'),
  ('v2.faturas',          'V2 · Faturas',               'v2', 170, 'Faturas de fornecedores'),
  ('v2.documentos',       'V2 · Documentos',            'v2', 180, 'Arquivo documental'),
  ('v2.energia',          'V2 · EV / Energia',          'v2', 190, 'Carregadores eléctricos'),
  ('v2.seguros',          'V2 · Seguros',               'v2', 200, 'Apólices V2 (legacy)'),
  ('v2.comunicacao',      'V2 · Comunicação',           'v2', 210, 'Emails e SMS enviados'),
  ('v2.automacoes',       'V2 · Automações',            'v2', 220, 'Cron jobs e triggers'),
  ('v2.permissoes',       'V2 · Permissões & Logs',     'v2', 230, 'Esta vista — gestão acessos')
ON CONFLICT (code) DO NOTHING;

-- V5 Manutenção sections (placeholder — refactor V5 RLS na Sprint A.3)
INSERT INTO iam.permission_sections (code, label, vertical, ordem, descricao) VALUES
  ('v5.catalogo',     'V5 · Catálogo de Serviços', 'v5', 510, '199 serviços de manutenção'),
  ('v5.ordens',       'V5 · Ordens de Trabalho',   'v5', 520, 'Pipeline OT'),
  ('v5.prestadores',  'V5 · Prestadores',          'v5', 530, 'Empresas de serviço'),
  ('v5.subscricoes',  'V5 · Subscrições',          'v5', 540, 'Planos de manutenção')
ON CONFLICT (code) DO NOTHING;

-- V4 Energia sections (a usar quando V4 ficar pronta)
INSERT INTO iam.permission_sections (code, label, vertical, ordem, descricao) VALUES
  ('v4.simulador',  'V4 · Simulador Tarifas', 'v4', 410, 'Comparador'),
  ('v4.leads',      'V4 · Leads',             'v4', 420, 'Pipeline comercial'),
  ('v4.contratos',  'V4 · Contratos Energia', 'v4', 430, 'Contratos activos')
ON CONFLICT (code) DO NOTHING;

-- Marketing + System cross-vertical
INSERT INTO iam.permission_sections (code, label, vertical, ordem, descricao) VALUES
  ('marketing.leads',     'Marketing · Leads',      'marketing', 710, 'Funil unificado leads'),
  ('marketing.campanhas', 'Marketing · Campanhas',  'marketing', 720, 'Email/SMS broadcast'),
  ('marketing.cross_sell','Marketing · Cross-sell', 'marketing', 730, 'Regras automáticas'),
  ('system.inbox',        'System · Inbox',         'system',    810, 'Tarefas de agentes'),
  ('system.approvals',    'System · Approvals',     'system',    820, 'Fila de aprovações Mário'),
  ('system.agents',       'System · Agentes IA',    'system',    830, 'Skills e recipes')
ON CONFLICT (code) DO NOTHING;

-- Grants: developer tem tudo
INSERT INTO iam.permission_grants (group_code, section_code, can_view, can_edit, can_create, can_delete)
SELECT 'developer', code, true, true, true, true FROM iam.permission_sections
ON CONFLICT (group_code, section_code) DO NOTHING;

-- Grants: administrador tem tudo excepto delete em permissoes/automacoes
INSERT INTO iam.permission_grants (group_code, section_code, can_view, can_edit, can_create, can_delete)
SELECT 'administrador', code,
       true,
       CASE WHEN code IN ('v2.permissoes','v2.automacoes') THEN false ELSE true END,
       CASE WHEN code IN ('v2.permissoes','v2.automacoes') THEN false ELSE true END,
       CASE WHEN code IN ('v2.permissoes','v2.automacoes') THEN false ELSE true END
FROM iam.permission_sections
ON CONFLICT (group_code, section_code) DO NOTHING;

-- Grants: operacional vê tudo, edita faturas/documentos/comunicacao
INSERT INTO iam.permission_grants (group_code, section_code, can_view, can_edit, can_create, can_delete)
SELECT 'operacional', code,
       true,
       CASE WHEN code IN ('v2.faturas','v2.documentos','v2.comunicacao','v5.ordens','marketing.leads') THEN true ELSE false END,
       CASE WHEN code IN ('v2.faturas','v2.documentos','v2.comunicacao','v5.ordens','marketing.leads') THEN true ELSE false END,
       false
FROM iam.permission_sections
ON CONFLICT (group_code, section_code) DO NOTHING;

-- Grants: condomino só vê inicio + prestacao_contas + mora (V2)
INSERT INTO iam.permission_grants (group_code, section_code, can_view, can_edit, can_create, can_delete) VALUES
  ('condomino', 'v2.inicio',           true, false, false, false),
  ('condomino', 'v2.prestacao_contas', true, false, false, false),
  ('condomino', 'v2.mora',             true, false, false, false)
ON CONFLICT (group_code, section_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 3. RPCs (SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION iam.has_permission(p_section text, p_action text DEFAULT 'view')
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = iam, public
AS $$
DECLARE v_group text; v_has boolean;
BEGIN
  -- Resolve grupo via alias staff > fallback core.staff_roles > condomino default
  SELECT permission_group_code INTO v_group
  FROM iam.staff_login_aliases
  WHERE auth_user_id = auth.uid() AND active = true LIMIT 1;

  IF v_group IS NULL THEN
    IF public.is_staff() THEN v_group := 'administrador';
    ELSE v_group := 'condomino'; END IF;
  END IF;

  SELECT CASE p_action
           WHEN 'view'   THEN can_view
           WHEN 'edit'   THEN can_edit
           WHEN 'create' THEN can_create
           WHEN 'delete' THEN can_delete
           ELSE false END
  INTO v_has
  FROM iam.permission_grants
  WHERE group_code = v_group AND section_code = p_section;

  RETURN COALESCE(v_has, false);
END; $$;

-- Helper para RLS policies: iam.user_can('v5.ordens', 'view')
CREATE OR REPLACE FUNCTION iam.user_can(p_section text, p_action text DEFAULT 'view')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT iam.has_permission(p_section, p_action);
$$;

CREATE OR REPLACE FUNCTION iam.get_my_permissions()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = iam, public
AS $$
DECLARE v_group text; v_grants jsonb;
BEGIN
  SELECT permission_group_code INTO v_group
  FROM iam.staff_login_aliases
  WHERE auth_user_id = auth.uid() AND active = true LIMIT 1;

  IF v_group IS NULL THEN
    IF public.is_staff() THEN v_group := 'administrador';
    ELSE v_group := 'condomino'; END IF;
  END IF;

  SELECT jsonb_object_agg(section_code, jsonb_build_object(
    'view', can_view, 'edit', can_edit, 'create', can_create, 'delete', can_delete
  )) INTO v_grants
  FROM iam.permission_grants
  WHERE group_code = v_group;

  RETURN jsonb_build_object(
    'group_code', v_group,
    'auth_user_id', auth.uid(),
    'grants', COALESCE(v_grants, '{}'::jsonb)
  );
END; $$;

CREATE OR REPLACE FUNCTION iam.log_activity(
  p_tipo      text,
  p_detalhe   text DEFAULT NULL,
  p_resultado text DEFAULT 'ok',
  p_origem    text DEFAULT 'staff',
  p_vertical  text DEFAULT NULL,
  p_extra     jsonb DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = iam, public
AS $$
DECLARE v_email text; v_label text; v_id bigint;
BEGIN
  SELECT p.email, p.nome INTO v_email, v_label
  FROM core.pessoas p WHERE p.auth_user_id = auth.uid() LIMIT 1;

  INSERT INTO iam.activity_logs
    (user_email, user_label, vertical, origem, tipo, detalhe, resultado, extra_data)
  VALUES
    (v_email, v_label, p_vertical, p_origem, p_tipo, p_detalhe, p_resultado, p_extra)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION iam.set_permission_grant(
  p_group_code   text,
  p_section_code text,
  p_action       text,
  p_value        boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = iam, public
AS $$
BEGIN
  IF NOT iam.has_permission('v2.permissoes', 'edit') THEN
    PERFORM iam.log_activity('permission_denied',
      'set_permission_grant ' || p_group_code || '/' || p_section_code || '/' || p_action,
      'unauthorized', 'staff', 'iam');
    RAISE EXCEPTION 'unauthorized: requires v2.permissoes:edit';
  END IF;

  INSERT INTO iam.permission_grants (group_code, section_code, can_view, can_edit, can_create, can_delete)
  VALUES (p_group_code, p_section_code,
    p_action = 'view', p_action = 'edit', p_action = 'create', p_action = 'delete')
  ON CONFLICT (group_code, section_code) DO UPDATE SET
    can_view   = CASE WHEN p_action = 'view'   THEN p_value ELSE iam.permission_grants.can_view END,
    can_edit   = CASE WHEN p_action = 'edit'   THEN p_value ELSE iam.permission_grants.can_edit END,
    can_create = CASE WHEN p_action = 'create' THEN p_value ELSE iam.permission_grants.can_create END,
    can_delete = CASE WHEN p_action = 'delete' THEN p_value ELSE iam.permission_grants.can_delete END,
    updated_at = now();

  PERFORM iam.log_activity('permission_changed',
    p_group_code || '/' || p_section_code || '/' || p_action || '=' || p_value::text,
    'ok', 'staff', 'iam');
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION iam.staff_login_lookup(p_alias text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = iam, public
AS $$
DECLARE v_row record;
BEGIN
  SELECT login, email, nome, permission_group_code INTO v_row
  FROM iam.staff_login_aliases
  WHERE lower(login) = lower(p_alias) AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'alias_not_found');
  END IF;
  RETURN jsonb_build_object('ok', true, 'login', v_row.login, 'email', v_row.email,
                            'nome', v_row.nome, 'group', v_row.permission_group_code);
END; $$;

CREATE OR REPLACE FUNCTION iam.portal_token_login(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = iam, public
AS $$
DECLARE v_row record;
BEGIN
  SELECT token, pessoa_id, vertical, fracao_id, email_legacy, nome_legacy, permission_group_code
  INTO v_row
  FROM iam.portal_tokens
  WHERE token = p_token AND active = true LIMIT 1;
  IF NOT FOUND THEN
    BEGIN
      INSERT INTO iam.activity_logs (origem, tipo, detalhe, resultado, extra_data)
      VALUES ('portal', 'login', 'token inválido', 'denied',
              jsonb_build_object('token_prefix', substring(p_token::text, 1, 8)));
    EXCEPTION WHEN OTHERS THEN NULL; END;
    RETURN jsonb_build_object('ok', false, 'error', 'token_not_found_or_inactive');
  END IF;

  UPDATE iam.portal_tokens SET last_used_at = now() WHERE token = v_row.token;
  INSERT INTO iam.activity_logs (origem, tipo, user_email, user_label, vertical, detalhe, resultado, extra_data)
  VALUES ('portal', 'login', v_row.email_legacy, v_row.nome_legacy, v_row.vertical,
          'portal_token_login', 'ok',
          jsonb_build_object('pessoa_id', v_row.pessoa_id, 'fracao_id', v_row.fracao_id, 'group', v_row.permission_group_code));

  RETURN jsonb_build_object('ok', true, 'token', v_row.token, 'pessoa_id', v_row.pessoa_id,
                            'vertical', v_row.vertical, 'fracao_id', v_row.fracao_id,
                            'nome', v_row.nome_legacy, 'email', v_row.email_legacy,
                            'group', v_row.permission_group_code);
END; $$;

-- ─────────────────────────────────────────────────────────
-- 4. GRANTs
-- ─────────────────────────────────────────────────────────

GRANT SELECT ON
  iam.permission_groups,
  iam.permission_sections,
  iam.permission_grants
TO authenticated;

GRANT SELECT ON iam.staff_login_aliases TO authenticated;
GRANT SELECT ON iam.portal_tokens       TO authenticated;
GRANT SELECT ON iam.activity_logs       TO authenticated;

GRANT ALL ON
  iam.permission_groups,
  iam.permission_sections,
  iam.permission_grants,
  iam.staff_login_aliases,
  iam.portal_tokens,
  iam.activity_logs
TO service_role;

REVOKE ALL ON FUNCTION iam.has_permission(text, text)              FROM public;
REVOKE ALL ON FUNCTION iam.user_can(text, text)                    FROM public;
REVOKE ALL ON FUNCTION iam.get_my_permissions()                    FROM public;
REVOKE ALL ON FUNCTION iam.log_activity(text,text,text,text,text,jsonb) FROM public;
REVOKE ALL ON FUNCTION iam.set_permission_grant(text,text,text,boolean) FROM public;
REVOKE ALL ON FUNCTION iam.staff_login_lookup(text)                FROM public;
REVOKE ALL ON FUNCTION iam.portal_token_login(uuid)                FROM public;

GRANT EXECUTE ON FUNCTION iam.has_permission(text, text)           TO authenticated;
GRANT EXECUTE ON FUNCTION iam.user_can(text, text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION iam.get_my_permissions()                 TO authenticated;
GRANT EXECUTE ON FUNCTION iam.log_activity(text,text,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION iam.set_permission_grant(text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION iam.staff_login_lookup(text)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION iam.portal_token_login(uuid)             TO anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 5. RLS policies
-- ─────────────────────────────────────────────────────────

ALTER TABLE iam.permission_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.permission_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.permission_grants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.staff_login_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.portal_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.activity_logs       ENABLE ROW LEVEL SECURITY;

CREATE POLICY iam_pg_read   ON iam.permission_groups   FOR SELECT TO authenticated USING (true);
CREATE POLICY iam_ps_read   ON iam.permission_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY iam_pgr_read  ON iam.permission_grants   FOR SELECT TO authenticated USING (true);
CREATE POLICY iam_sla_read  ON iam.staff_login_aliases FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY iam_pt_read   ON iam.portal_tokens       FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY iam_al_read   ON iam.activity_logs       FOR SELECT TO authenticated USING (public.is_staff());

-- ─────────────────────────────────────────────────────────
-- 6. Expor schema iam ao PostgREST
-- (ADR-V2-002: alterar pg_roles.rolconfig é a fonte de verdade)
-- ─────────────────────────────────────────────────────────
ALTER ROLE authenticator SET pgrst.db_schemas =
  'public, graphql_public, core, system, v2_condominios, v3_seguros, v4_energia, v5_manutencao, v1_owners_club, marketing, iam';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
