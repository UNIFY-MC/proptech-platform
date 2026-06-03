-- =============================================================================
-- Migration: 202605241300_v2_bridge_fix_extrato_configuracoes.sql
-- Fix 2 bloqueadores descobertos no smoke test v10:
--   - extrato_bancario.edificio_id NOT NULL impedia UPSERT do bridge
--   - configuracoes faltava GRANT para service_role (permission denied)
-- =============================================================================

BEGIN;

-- Fix 1: extrato_bancario.edificio_id era NOT NULL em V1 mas V2 não tem essa col
ALTER TABLE v2_condominios.extrato_bancario
  ALTER COLUMN edificio_id DROP NOT NULL;

-- Fix 2: configuracoes — GRANT explicit para service_role + anon/authenticated
GRANT ALL    ON v2_condominios.configuracoes TO service_role;
GRANT SELECT ON v2_condominios.configuracoes TO anon, authenticated;

-- Add tracking cols (padrão das outras bridge tables)
ALTER TABLE v2_condominios.configuracoes
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS source      text DEFAULT 'v2_legacy_bridge';

COMMIT;
