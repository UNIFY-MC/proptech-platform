-- =============================================================================
-- 1B.3 Fase 1B: adicionar coluna idioma a advisor_sessoes
-- =============================================================================
-- Motivo: agent-casa-advisor injeta idioma do perfil da pessoa no system
-- prompt e guarda na sessão para histórico e debug.
-- Coluna usada no INSERT de nova sessão em agent-casa-advisor/index.ts.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS é seguro de re-correr.
-- =============================================================================

BEGIN;

ALTER TABLE v5_manutencao.advisor_sessoes
  ADD COLUMN IF NOT EXISTS idioma text NOT NULL DEFAULT 'pt-PT';

COMMIT;

-- Verificação pós-aplicação:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'v5_manutencao'
--   AND table_name = 'advisor_sessoes'
--   AND column_name = 'idioma';
-- Espera: 1 linha com data_type='text' e column_default='pt-PT'.
