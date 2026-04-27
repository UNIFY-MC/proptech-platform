-- ═══════════════════════════════════════════════════════════════
-- Sprint 1B.1.2 — Seed v5.test_echo em core.agent_policies
-- Necessário para runAgent carregar policy sem erro de 'agent não encontrado'
-- Aplicar ANTES de fazer deploy da Edge Function agent-test
-- ═══════════════════════════════════════════════════════════════

INSERT INTO core.agent_policies
  (organization_id, agent_name, model, enabled, approval_required_tools)
SELECT
  id,
  'v5.test_echo',
  'claude-sonnet-4-6',
  true,
  ARRAY[]::TEXT[]
FROM core.organizations
ON CONFLICT (organization_id, agent_name) DO NOTHING;

NOTIFY pgrst, 'reload schema';
