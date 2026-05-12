-- =============================================================
-- Fase G — Permissões, login aliases, portal tokens, activity logs
-- =============================================================
-- Recria sistema de permissões do legacy V2 (prataowners.pt) no V1 Core Hub.
--
-- Tabelas (todas em v2_condominios):
--   - permission_groups    : 4 grupos (condomino, operacional, administrador, developer)
--   - portal_sections      : 14 secções (mora, fracoes, faturas, etc)
--   - permission_grants    : matriz grupo × secção com 4 booleans (view/edit/create/delete)
--   - staff_login_aliases  : alias text → auth_user_id (login com utilizador, não email)
--   - portal_tokens        : UUID privado por condómino para acesso read-only ao portal
--   - activity_logs        : rasto auditável de toda a actividade
--
-- RPCs:
--   - has_permission(section, action)            : current_user pode fazer X?
--   - get_my_permissions()                       : devolve mapa completo de permissões
--   - set_permission_grant(group, section, action, value) : toggle célula da matriz
--   - log_activity(tipo, detalhe, resultado, origem, extra) : insere linha
--   - staff_login_lookup(alias)                  : alias → email (para LoginScreen)
--   - portal_token_login(token)                  : UUID → perfil (anon-callable)
-- =============================================================

-- ─────────────────────────────────────────────────────────
-- 1. Tabelas
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v2_condominios.permission_groups (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  color       text NOT NULL DEFAULT 'grey',
  ordem       int  NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_condominios.portal_sections (
  code   text PRIMARY KEY,
  label  text NOT NULL,
  ordem  int  NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS v2_condominios.permission_grants (
  group_code    text NOT NULL REFERENCES v2_condominios.permission_groups(code) ON DELETE CASCADE,
  section_code  text NOT NULL REFERENCES v2_condominios.portal_sections(code)   ON DELETE CASCADE,
  can_view      boolean NOT NULL DEFAULT false,
  can_edit      boolean NOT NULL DEFAULT false,
  can_create    boolean NOT NULL DEFAULT false,
  can_delete    boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_code, section_code)
);

CREATE TABLE IF NOT EXISTS v2_condominios.staff_login_aliases (
  login                  text PRIMARY KEY,
  auth_user_id           uuid NOT NULL,
  permission_group_code  text NOT NULL REFERENCES v2_condominios.permission_groups(code),
  email                  text,
  nome                   text,
  active                 boolean NOT NULL DEFAULT true,
  last_login_at          timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_condominios.portal_tokens (
  token                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fracao_id              uuid REFERENCES v2_condominios.fracoes(id) ON DELETE SET NULL,
  condomino_id           uuid REFERENCES v2_condominios.condominos(id) ON DELETE SET NULL,
  email_legacy           text,
  nome_legacy            text,
  permission_group_code  text NOT NULL REFERENCES v2_condominios.permission_groups(code) DEFAULT 'condomino',
  active                 boolean NOT NULL DEFAULT true,
  last_used_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_condominios.activity_logs (
  id          bigserial PRIMARY KEY,
  ts          timestamptz NOT NULL DEFAULT now(),
  user_email  text,
  user_label  text,
  origem      text NOT NULL,                   -- staff, portal, agent, system, api
  tipo        text NOT NULL,                   -- login, view, edit, create, delete, error, etc.
  detalhe     text,
  resultado   text NOT NULL DEFAULT 'ok',      -- ok, denied, error
  ip          text,
  user_agent  text,
  extra_data  jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_ts        ON v2_condominios.activity_logs (ts DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_origem    ON v2_condominios.activity_logs (origem);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tipo      ON v2_condominios.activity_logs (tipo);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user      ON v2_condominios.activity_logs (user_email);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_active    ON v2_condominios.portal_tokens (active);
CREATE INDEX IF NOT EXISTS idx_staff_aliases_authuid   ON v2_condominios.staff_login_aliases (auth_user_id);

-- ─────────────────────────────────────────────────────────
-- 2. Seeds
-- ─────────────────────────────────────────────────────────

INSERT INTO v2_condominios.permission_groups (code, label, color, ordem) VALUES
  ('condomino',     'Condómino',     'green',  10),
  ('operacional',   'Operacional',   'blue',   20),
  ('administrador', 'Administrador', 'gold',   30),
  ('developer',     'Developer',     'purple', 99)
ON CONFLICT (code) DO NOTHING;

INSERT INTO v2_condominios.portal_sections (code, label, ordem) VALUES
  ('inicio',           'Início',                10),
  ('prestacao_contas', 'Prestação de Contas',   20),
  ('fracoes',          'Frações',               30),
  ('condominos',       'Condóminos',            40),
  ('mora',             'Mora',                  50),
  ('recebimentos',     'Recebimentos',          60),
  ('bancos',           'Bancos / Extrato',      70),
  ('faturas',          'Faturas',               80),
  ('documentos',       'Documentos',            90),
  ('energia',          'EV / Energia',         100),
  ('seguros',          'Seguros',              110),
  ('comunicacao',      'Comunicação',          120),
  ('automacoes',       'Automações',           130),
  ('permissoes',       'Permissões & Logs',    140)
ON CONFLICT (code) DO NOTHING;

-- Grants por defeito (43 entradas).
-- Condómino: ver inicio + portal-condomino (handled by separate logic).
-- Operacional: vê tudo operacional, edita faturas/documentos/comunicacao.
-- Administrador: full edit em tudo excepto permissoes.
-- Developer: full em tudo.

INSERT INTO v2_condominios.permission_grants (group_code, section_code, can_view, can_edit, can_create, can_delete) VALUES
  -- developer: tudo
  ('developer', 'inicio',           true, true, true, true),
  ('developer', 'prestacao_contas', true, true, true, true),
  ('developer', 'fracoes',          true, true, true, true),
  ('developer', 'condominos',       true, true, true, true),
  ('developer', 'mora',             true, true, true, true),
  ('developer', 'recebimentos',     true, true, true, true),
  ('developer', 'bancos',           true, true, true, true),
  ('developer', 'faturas',          true, true, true, true),
  ('developer', 'documentos',       true, true, true, true),
  ('developer', 'energia',          true, true, true, true),
  ('developer', 'seguros',          true, true, true, true),
  ('developer', 'comunicacao',      true, true, true, true),
  ('developer', 'automacoes',       true, true, true, true),
  ('developer', 'permissoes',       true, true, true, true),
  -- administrador: full edit excepto permissoes
  ('administrador', 'inicio',           true, true, true, true),
  ('administrador', 'prestacao_contas', true, true, true, true),
  ('administrador', 'fracoes',          true, true, true, true),
  ('administrador', 'condominos',       true, true, true, true),
  ('administrador', 'mora',             true, true, true, true),
  ('administrador', 'recebimentos',     true, true, true, true),
  ('administrador', 'bancos',           true, true, true, true),
  ('administrador', 'faturas',          true, true, true, true),
  ('administrador', 'documentos',       true, true, true, true),
  ('administrador', 'energia',          true, true, true, true),
  ('administrador', 'seguros',          true, true, true, true),
  ('administrador', 'comunicacao',      true, true, true, true),
  ('administrador', 'automacoes',       true, false, false, false),
  ('administrador', 'permissoes',       true, false, false, false),
  -- operacional: vê tudo, edita faturas/documentos/comunicacao
  ('operacional', 'inicio',           true, false, false, false),
  ('operacional', 'prestacao_contas', true, false, false, false),
  ('operacional', 'fracoes',          true, false, false, false),
  ('operacional', 'condominos',       true, false, false, false),
  ('operacional', 'mora',             true, false, false, false),
  ('operacional', 'recebimentos',     true, false, false, false),
  ('operacional', 'bancos',           true, false, false, false),
  ('operacional', 'faturas',          true, true,  true,  false),
  ('operacional', 'documentos',       true, true,  true,  false),
  ('operacional', 'energia',          true, false, false, false),
  ('operacional', 'seguros',          true, false, false, false),
  ('operacional', 'comunicacao',      true, true,  true,  false),
  -- condomino: só inicio
  ('condomino', 'inicio',           true, false, false, false),
  ('condomino', 'prestacao_contas', true, false, false, false),
  ('condomino', 'mora',             true, false, false, false)
ON CONFLICT (group_code, section_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 3. RPCs
-- ─────────────────────────────────────────────────────────

-- has_permission(section, action)
CREATE OR REPLACE FUNCTION v2_condominios.has_permission(p_section text, p_action text DEFAULT 'view')
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
DECLARE v_group text; v_has boolean;
BEGIN
  SELECT permission_group_code INTO v_group
  FROM v2_condominios.staff_login_aliases
  WHERE auth_user_id = auth.uid() AND active = true LIMIT 1;

  IF v_group IS NULL THEN
    IF public.is_staff() THEN v_group := 'administrador';
    ELSE v_group := 'condomino'; END IF;
  END IF;

  SELECT
    CASE p_action
      WHEN 'view'   THEN can_view
      WHEN 'edit'   THEN can_edit
      WHEN 'create' THEN can_create
      WHEN 'delete' THEN can_delete
      ELSE false END
  INTO v_has
  FROM v2_condominios.permission_grants
  WHERE group_code = v_group AND section_code = p_section;

  RETURN COALESCE(v_has, false);
END; $$;

-- get_my_permissions()
CREATE OR REPLACE FUNCTION v2_condominios.get_my_permissions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
DECLARE v_group text; v_grants jsonb;
BEGIN
  SELECT permission_group_code INTO v_group
  FROM v2_condominios.staff_login_aliases
  WHERE auth_user_id = auth.uid() AND active = true LIMIT 1;

  IF v_group IS NULL THEN
    IF public.is_staff() THEN v_group := 'administrador';
    ELSE v_group := 'condomino'; END IF;
  END IF;

  SELECT jsonb_object_agg(section_code, jsonb_build_object(
    'view', can_view, 'edit', can_edit, 'create', can_create, 'delete', can_delete
  )) INTO v_grants
  FROM v2_condominios.permission_grants
  WHERE group_code = v_group;

  RETURN jsonb_build_object(
    'group_code', v_group,
    'auth_user_id', auth.uid(),
    'grants', COALESCE(v_grants, '{}'::jsonb)
  );
END; $$;

-- log_activity(tipo, detalhe, resultado, origem, extra)
CREATE OR REPLACE FUNCTION v2_condominios.log_activity(
  p_tipo      text,
  p_detalhe   text DEFAULT NULL,
  p_resultado text DEFAULT 'ok',
  p_origem    text DEFAULT 'staff',
  p_extra     jsonb DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
DECLARE v_email text; v_label text; v_id bigint;
BEGIN
  SELECT p.email, p.nome INTO v_email, v_label
  FROM core.pessoas p WHERE p.auth_user_id = auth.uid() LIMIT 1;

  INSERT INTO v2_condominios.activity_logs
    (user_email, user_label, origem, tipo, detalhe, resultado, extra_data)
  VALUES
    (v_email, v_label, p_origem, p_tipo, p_detalhe, p_resultado, p_extra)
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

-- set_permission_grant(group, section, action, value)
CREATE OR REPLACE FUNCTION v2_condominios.set_permission_grant(
  p_group_code   text,
  p_section_code text,
  p_action       text,
  p_value        boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
BEGIN
  IF NOT v2_condominios.has_permission('permissoes', 'edit') THEN
    PERFORM v2_condominios.log_activity('permission_denied',
      'set_permission_grant ' || p_group_code || '/' || p_section_code || '/' || p_action,
      'unauthorized');
    RAISE EXCEPTION 'unauthorized: requires permissoes:edit';
  END IF;

  INSERT INTO v2_condominios.permission_grants
    (group_code, section_code, can_view, can_edit, can_create, can_delete)
  VALUES (p_group_code, p_section_code,
    p_action = 'view', p_action = 'edit', p_action = 'create', p_action = 'delete')
  ON CONFLICT (group_code, section_code) DO UPDATE SET
    can_view   = CASE WHEN p_action = 'view'   THEN p_value ELSE permission_grants.can_view END,
    can_edit   = CASE WHEN p_action = 'edit'   THEN p_value ELSE permission_grants.can_edit END,
    can_create = CASE WHEN p_action = 'create' THEN p_value ELSE permission_grants.can_create END,
    can_delete = CASE WHEN p_action = 'delete' THEN p_value ELSE permission_grants.can_delete END,
    updated_at = now();

  PERFORM v2_condominios.log_activity('permission_changed',
    p_group_code || '/' || p_section_code || '/' || p_action || '=' || p_value::text, 'ok');
  RETURN true;
END; $$;

-- staff_login_lookup(alias) — anon-callable
CREATE OR REPLACE FUNCTION v2_condominios.staff_login_lookup(p_alias text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
DECLARE v_row record;
BEGIN
  SELECT login, email, nome, permission_group_code INTO v_row
  FROM v2_condominios.staff_login_aliases
  WHERE lower(login) = lower(p_alias) AND active = true LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'alias_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'login', v_row.login,
    'email', v_row.email,
    'nome',  v_row.nome,
    'group', v_row.permission_group_code
  );
END; $$;

-- portal_token_login(token) — anon-callable, regista activity_logs
CREATE OR REPLACE FUNCTION v2_condominios.portal_token_login(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v2_condominios, public
AS $$
DECLARE v_row record;
BEGIN
  SELECT token, fracao_id, condomino_id, email_legacy, nome_legacy, permission_group_code
  INTO v_row
  FROM v2_condominios.portal_tokens
  WHERE token = p_token AND active = true LIMIT 1;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO v2_condominios.activity_logs (origem, tipo, detalhe, resultado, extra_data)
      VALUES ('portal', 'login', 'token inválido ou inactivo', 'denied',
              jsonb_build_object('token_prefix', substring(p_token::text, 1, 8)));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('ok', false, 'error', 'token_not_found_or_inactive');
  END IF;

  UPDATE v2_condominios.portal_tokens SET last_used_at = now() WHERE token = v_row.token;

  INSERT INTO v2_condominios.activity_logs (origem, tipo, user_email, user_label, detalhe, resultado, extra_data)
  VALUES ('portal', 'login', v_row.email_legacy, v_row.nome_legacy, 'portal_token_login', 'ok',
          jsonb_build_object('fracao_id', v_row.fracao_id, 'condomino_id', v_row.condomino_id, 'group', v_row.permission_group_code));

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_row.token,
    'fracao_id', v_row.fracao_id,
    'condomino_id', v_row.condomino_id,
    'nome',  v_row.nome_legacy,
    'email', v_row.email_legacy,
    'group', v_row.permission_group_code
  );
END; $$;

-- ─────────────────────────────────────────────────────────
-- 4. GRANTs
-- ─────────────────────────────────────────────────────────

-- Tabelas: SELECT a authenticated (sob is_staff() via RLS); INSERT/UPDATE só via RPCs
GRANT USAGE ON SCHEMA v2_condominios TO anon, authenticated;
GRANT SELECT ON
  v2_condominios.permission_groups,
  v2_condominios.portal_sections,
  v2_condominios.permission_grants,
  v2_condominios.staff_login_aliases,
  v2_condominios.portal_tokens,
  v2_condominios.activity_logs
TO authenticated;

-- RPCs
REVOKE ALL ON FUNCTION v2_condominios.has_permission(text, text)          FROM public;
REVOKE ALL ON FUNCTION v2_condominios.get_my_permissions()                FROM public;
REVOKE ALL ON FUNCTION v2_condominios.log_activity(text,text,text,text,jsonb) FROM public;
REVOKE ALL ON FUNCTION v2_condominios.set_permission_grant(text,text,text,boolean) FROM public;
REVOKE ALL ON FUNCTION v2_condominios.staff_login_lookup(text)            FROM public;
REVOKE ALL ON FUNCTION v2_condominios.portal_token_login(uuid)            FROM public;

GRANT EXECUTE ON FUNCTION v2_condominios.has_permission(text, text)          TO authenticated;
GRANT EXECUTE ON FUNCTION v2_condominios.get_my_permissions()                TO authenticated;
GRANT EXECUTE ON FUNCTION v2_condominios.log_activity(text,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION v2_condominios.set_permission_grant(text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION v2_condominios.staff_login_lookup(text)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION v2_condominios.portal_token_login(uuid)            TO anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 5. RLS policies (basic — só staff vê activity_logs e tokens)
-- ─────────────────────────────────────────────────────────

ALTER TABLE v2_condominios.permission_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_condominios.portal_sections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_condominios.permission_grants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_condominios.staff_login_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_condominios.portal_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_condominios.activity_logs       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pg_read_all   ON v2_condominios.permission_groups;
DROP POLICY IF EXISTS ps_read_all   ON v2_condominios.portal_sections;
DROP POLICY IF EXISTS pgr_read_all  ON v2_condominios.permission_grants;
DROP POLICY IF EXISTS sla_read_staff ON v2_condominios.staff_login_aliases;
DROP POLICY IF EXISTS pt_read_staff  ON v2_condominios.portal_tokens;
DROP POLICY IF EXISTS al_read_staff  ON v2_condominios.activity_logs;

CREATE POLICY pg_read_all    ON v2_condominios.permission_groups   FOR SELECT TO authenticated USING (true);
CREATE POLICY ps_read_all    ON v2_condominios.portal_sections     FOR SELECT TO authenticated USING (true);
CREATE POLICY pgr_read_all   ON v2_condominios.permission_grants   FOR SELECT TO authenticated USING (true);
CREATE POLICY sla_read_staff ON v2_condominios.staff_login_aliases FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY pt_read_staff  ON v2_condominios.portal_tokens       FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY al_read_staff  ON v2_condominios.activity_logs       FOR SELECT TO authenticated USING (public.is_staff());
