-- ═══════════════════════════════════════════════════════════════
-- Sprint 1B.2.1 — UPDATE core.agent_policies para v5.image_inspector
-- model → claude-sonnet-4-6 (era claude-opus-4-7)
-- approval_required_tools → ['equipamento_create'] (era ['equipamento.create_or_update'])
-- max_calls_per_user_day → 3 (era 50)
-- max_calls_per_org_day e max_cost_eur_per_org_month: manter defaults de 1B.1.1
-- ═══════════════════════════════════════════════════════════════

UPDATE core.agent_policies SET
  model                    = 'claude-sonnet-4-6',
  approval_required_tools  = ARRAY['equipamento_create']::TEXT[],
  max_calls_per_user_day   = 3
WHERE agent_name = 'v5.image_inspector';

NOTIFY pgrst, 'reload schema';
