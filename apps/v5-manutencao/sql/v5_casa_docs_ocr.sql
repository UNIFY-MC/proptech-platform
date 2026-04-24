-- ═══════════════════════════════════════════════════════════════
-- V5 CASA · Fatura OCR — extensão de documentos com dados extraídos
-- Data: 24 Abr 2026
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE v5_manutencao.documentos
  ADD COLUMN IF NOT EXISTS dados_ocr JSONB;

-- Index parcial para queries de "faturas OCR'd" por localização
CREATE INDEX IF NOT EXISTS idx_docs_ocr_tipo
  ON v5_manutencao.documentos(localizacao_id, tipo)
  WHERE dados_ocr IS NOT NULL;
