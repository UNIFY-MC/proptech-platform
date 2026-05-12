-- Sprint A Fase A1 — Bia employee runtime setup
-- Pre-requisito para edge function `bia-chat`:
--   1. Garantir pg_cron disponível para Fase A4 (daily roundup 07h30 PT)
--   2. Registar agent policy v5.bia em todas as orgs activas
--      (padrão idêntico a v5.casa_advisor, ver core.agent_policies)
--
-- Reutilizações:
--   - core.agent_audit_log    (audit de cada iteration + tool execution)
--   - core.agent_policies     (rate limit + modelo + approval_required_tools)
--   - system.approvals_queue  (CHECK source_agent já aceita 'bia')
--   - system.inbox_items      (destino do daily roundup)
--   - public.is_staff()       (RLS guard)
--
-- ADR de referência: 010-command-center-pivot.md
-- Decisões: reutilizar core.agent_audit_log (não criar system.task_invocations),
-- approval_required_tools = ['submit_approval','db_insert'] para garantir
-- human-in-the-loop em qualquer side-effect externo.

-- 1. pg_cron (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Agent policy v5.bia para todas as orgs activas
--    Modelo: claude-sonnet-4-6 (alinhado com bia.md frontmatter)
--    Rate limits: 50 calls/user/dia, 50 EUR/org/mês (default agent_policies)
--    Tools que requerem aprovação: submit_approval (cria approvals_queue row)
INSERT INTO core.agent_policies (
  organization_id,
  agent_name,
  enabled,
  model,
  max_calls_per_user_day,
  max_calls_per_org_day,
  max_cost_eur_per_org_month,
  approval_required_tools,
  rules
)
SELECT
  o.id,
  'v5.bia',
  true,
  'claude-sonnet-4-6',
  50,
  1000,
  50.00,
  ARRAY['submit_approval']::text[],
  '[]'::jsonb
FROM core.organizations o
WHERE o.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM core.agent_policies p
    WHERE p.organization_id = o.id AND p.agent_name = 'v5.bia'
  );

-- 3. Comment para audit
COMMENT ON EXTENSION pg_cron IS 'Job scheduler. Sprint 1E: daily_roundup Bia 07h30 PT.';
