-- 23_v5_3_4d_staff_roles.sql
-- Sprint 3.4D Task E: core.staff_roles + public.is_staff()
-- Aplicar: 2026-04-26
--
-- Separação deliberada de core.staff (legacy, email-only, gestão interna)
-- e core.staff_roles (auth-aware, liga auth.users para RLS/guards).

-- ─── Tabela ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.staff_roles (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text        NOT NULL CHECK (role IN ('admin','support','readonly')),
  active       boolean     NOT NULL DEFAULT true,
  granted_by   uuid        REFERENCES auth.users(id),
  granted_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,
  notes        text,
  UNIQUE (auth_user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_staff_roles_auth_user_id
  ON core.staff_roles(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_staff_roles_active
  ON core.staff_roles(active) WHERE active = true;

COMMENT ON TABLE core.staff_roles IS
  'Papéis de staff da plataforma V5. Liga auth.users para guards RLS. '
  'Separado de core.staff (legacy) para não quebrar consistência.';

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE core.staff_roles ENABLE ROW LEVEL SECURITY;

-- GRANT obrigatório antes da POLICY (sem GRANT, PostgREST devolve null silenciosamente)
GRANT SELECT ON core.staff_roles TO authenticated;

-- Utilizador vê apenas o seu próprio registo
CREATE POLICY "staff_roles: authenticated lê o seu"
  ON core.staff_roles FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Writes apenas via service_role (Edge Functions / migrations)

-- ─── Helper público (para RLS policies em outras tabelas) ──────────────────

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.staff_roles
    WHERE auth_user_id = auth.uid()
      AND active       = true
      AND revoked_at   IS NULL
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
COMMENT ON FUNCTION public.is_staff() IS
  'true se o utilizador autenticado tem entrada activa em core.staff_roles.';

NOTIFY pgrst, 'reload schema';
