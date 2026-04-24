-- § 9.1 Core — Multi-tenant + Audit
-- Aplicar contra projecto hkmvszkpxjbxmnixzqbl (V1 Core Hub)

-- Organizações (tenants)
CREATE TABLE IF NOT EXISTS core.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('individual','condominio','empresa_admin_condo','empresa_comercial','prestador')),
  nif TEXT,
  morada TEXT,
  localidade TEXT,
  concelho TEXT,
  codigo_postal TEXT,
  parent_org_id UUID REFERENCES core.organizations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON core.organizations(parent_org_id) WHERE parent_org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_tipo ON core.organizations(tipo);

-- Memberships
CREATE TABLE IF NOT EXISTS core.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member','reader')),
  permissions JSONB DEFAULT '{}'::jsonb,
  convidado_por UUID REFERENCES core.pessoas(id),
  aceite_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pessoa_id, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_pessoa ON core.memberships(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON core.memberships(organization_id);

-- Audit log
CREATE TABLE IF NOT EXISTS core.agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  session_id UUID,
  iteration INT,
  objective TEXT,
  stop_reason TEXT,
  content JSONB,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  required_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES core.pessoas(id),
  approved_at TIMESTAMPTZ,
  rejected BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  error TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_org_time ON core.agent_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_agent_time ON core.agent_audit_log(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_session ON core.agent_audit_log(session_id);

-- Policies
CREATE TABLE IF NOT EXISTS core.agent_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE UNIQUE,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES core.pessoas(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Drafts
CREATE TABLE IF NOT EXISTS core.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  agent_session_id UUID,
  tipo TEXT NOT NULL CHECK (tipo IN ('email','whatsapp','sms','carta_registada','convocatoria','rfq','fatura','orcamento')),
  conteudo JSONB NOT NULL,
  estado TEXT DEFAULT 'pending' CHECK (estado IN ('pending','approved','rejected','sent')),
  aprovado_por UUID REFERENCES core.pessoas(id),
  aprovado_em TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drafts_org_estado ON core.drafts(organization_id, estado);

-- Permissões dev (disable RLS)
GRANT USAGE ON SCHEMA core TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA core TO anon, authenticated;
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='core' LOOP
    EXECUTE format('ALTER TABLE core.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
