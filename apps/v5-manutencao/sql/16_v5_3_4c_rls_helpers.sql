-- ─────────────────────────────────────────────────────────────────────────────
-- 3.4C · RLS helpers SECURITY DEFINER em public (padrão Supabase)
-- Executam como owner → lêem core.pessoas e core.memberships com RLS activo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_memberships_pessoa_id ON core.memberships(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_auth_user_id  ON core.pessoas(auth_user_id);

CREATE OR REPLACE FUNCTION public.current_pessoa_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM core.pessoas WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_organization_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(organization_id), '{}'::uuid[])
  FROM core.memberships
  WHERE pessoa_id = public.current_pessoa_id()
$$;

-- NOTA: coluna é "role" (não "papel")
CREATE OR REPLACE FUNCTION public.has_org_role(org_id uuid, required_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.memberships
    WHERE pessoa_id        = public.current_pessoa_id()
      AND organization_id  = org_id
      AND role             = ANY(required_roles)
  )
$$;

GRANT EXECUTE ON FUNCTION public.current_pessoa_id()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_organization_ids()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[])        TO authenticated;
