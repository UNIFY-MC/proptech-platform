-- ============================================================
-- v5_manutencao · 3.3.11 · Faturação por imóvel
-- Perfis fiscais reutilizáveis + snapshot em ordens
-- ============================================================

-- 1. perfis_fiscais ganha label 'nome'
ALTER TABLE v5_manutencao.perfis_fiscais
  ADD COLUMN IF NOT EXISTS nome text;

-- 2. Backfill nome para perfis existentes
UPDATE v5_manutencao.perfis_fiscais
SET nome = COALESCE(nome_facturacao, 'Pessoal')
WHERE nome IS NULL;

-- 3. localizacoes aponta opcionalmente para perfil fiscal
ALTER TABLE v5_manutencao.localizacoes
  ADD COLUMN IF NOT EXISTS perfil_fiscal_id uuid
  REFERENCES v5_manutencao.perfis_fiscais(id) ON DELETE SET NULL;

-- 4. ordens_trabalho guarda snapshot do perfil no momento da criação
ALTER TABLE v5_manutencao.ordens_trabalho
  ADD COLUMN IF NOT EXISTS perfil_fiscal_snapshot jsonb;
-- Estrutura: {"nif":"...","nome_facturacao":"...","morada_facturacao":"...","iban":"...","nome":"..."}

-- 5. Index para queries comuns
CREATE INDEX IF NOT EXISTS idx_localizacoes_perfil_fiscal
  ON v5_manutencao.localizacoes(perfil_fiscal_id);

-- 6. Seed: perfil empresa AL para Maria
INSERT INTO v5_manutencao.perfis_fiscais
  (pessoa_id, nome, nif, nome_facturacao, morada_facturacao, principal)
SELECT
  p.id,
  'Empresa AL Lisboa',
  '509876543',
  'Maria Santos AL Unipessoal Lda',
  'Av. da Liberdade, 110, 4ºE, 1250-145 Lisboa',
  false
FROM core.pessoas p
WHERE p.email ILIKE '%maria%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 7. Apartamento Lisboa usa o perfil empresa AL
UPDATE v5_manutencao.localizacoes
SET perfil_fiscal_id = (
  SELECT id FROM v5_manutencao.perfis_fiscais
  WHERE nome = 'Empresa AL Lisboa'
  LIMIT 1
)
WHERE nome = 'Apartamento Lisboa';

-- Casa Principal e Casa de Férias ficam com perfil_fiscal_id = NULL
-- → fallback automático para perfil principal da pessoa
