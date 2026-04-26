-- ══════════════════════════════════════════════════════════════
-- Fase 3.4A — Auth core: core.pessoas ↔ auth.users
-- Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
-- ══════════════════════════════════════════════════════════════

-- A1: Colunas de auth em core.pessoas
ALTER TABLE core.pessoas
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimo_login timestamptz;

-- Índice para lookup rápido auth_user_id → pessoa
CREATE INDEX IF NOT EXISTS idx_pessoas_auth_user ON core.pessoas(auth_user_id);

-- ══════════════════════════════════════════════════════════════
-- Verificação (executar após aplicar)
-- ══════════════════════════════════════════════════════════════
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'core' AND table_name = 'pessoas'
--   AND column_name IN ('auth_user_id', 'email_verified', 'ultimo_login');
