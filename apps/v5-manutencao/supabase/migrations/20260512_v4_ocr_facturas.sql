-- ============================================================
-- ADR-V4-002 · Upload Fatura + OCR Claude Haiku 4.5 Vision
-- Data: 2026-05-12
-- Projecto: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
-- Versão Supabase: 20260512164330
-- ============================================================

-- ============================================================
-- 1. STORAGE BUCKET v4-facturas (privado)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'v4-facturas',
  'v4-facturas',
  false,
  10485760,                                                   -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. STORAGE RLS POLICIES (3 policies)
-- ============================================================
DROP POLICY IF EXISTS "facturas_owner_read" ON storage.objects;
CREATE POLICY "facturas_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'v4-facturas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "facturas_owner_insert" ON storage.objects;
CREATE POLICY "facturas_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'v4-facturas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "facturas_staff_all" ON storage.objects;
CREATE POLICY "facturas_staff_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'v4-facturas' AND is_staff())
  WITH CHECK (bucket_id = 'v4-facturas' AND is_staff());

-- ============================================================
-- 3. TABELA v4_energia.facturas_uploaded
-- ============================================================
CREATE TABLE IF NOT EXISTS v4_energia.facturas_uploaded (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id                UUID REFERENCES core.pessoas(id) ON DELETE SET NULL,
  contrato_energia_id      UUID REFERENCES v4_energia.contratos_energia(id) ON DELETE SET NULL,
  uploaded_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_path                TEXT NOT NULL,
  file_size_bytes          INTEGER,
  file_size_original_bytes INTEGER,
  mime_type                TEXT
    CONSTRAINT ck_facturas_mime
    CHECK (mime_type IS NULL OR mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  ocr_status               TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT ck_facturas_status
    CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_data                 JSONB,
  ocr_model                TEXT,
  ocr_attempts             SMALLINT DEFAULT 0,
  ocr_confidence           NUMERIC(3,2)
    CONSTRAINT ck_facturas_confidence
    CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1)),
  erro_mensagem            TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  ocr_started_at           TIMESTAMPTZ,
  ocr_completed_at         TIMESTAMPTZ,
  apagado_em               TIMESTAMPTZ
);

COMMENT ON TABLE v4_energia.facturas_uploaded IS
  'Facturas de electricidade carregadas pelos clientes para OCR via Claude Haiku 4.5 Vision. '
  'Original mantido em Storage v4-facturas (comprimido). Dados extraídos em ocr_data jsonb. '
  'Soft-delete via apagado_em.';

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_facturas_pessoa
  ON v4_energia.facturas_uploaded(pessoa_id)
  WHERE apagado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_contrato
  ON v4_energia.facturas_uploaded(contrato_energia_id)
  WHERE apagado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_status
  ON v4_energia.facturas_uploaded(ocr_status, created_at DESC);

-- ============================================================
-- 5. TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION v4_energia.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_facturas_updated_at ON v4_energia.facturas_uploaded;
CREATE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON v4_energia.facturas_uploaded
  FOR EACH ROW EXECUTE FUNCTION v4_energia.set_updated_at();

-- ============================================================
-- 6. RLS na tabela (3 policies)
-- ============================================================
ALTER TABLE v4_energia.facturas_uploaded ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v4_facturas_owner_select" ON v4_energia.facturas_uploaded;
CREATE POLICY "v4_facturas_owner_select"
  ON v4_energia.facturas_uploaded FOR SELECT
  USING (uploaded_by = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "v4_facturas_owner_insert" ON v4_energia.facturas_uploaded;
CREATE POLICY "v4_facturas_owner_insert"
  ON v4_energia.facturas_uploaded FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "v4_facturas_staff_update" ON v4_energia.facturas_uploaded;
CREATE POLICY "v4_facturas_staff_update"
  ON v4_energia.facturas_uploaded FOR UPDATE
  USING (is_staff()) WITH CHECK (is_staff());

-- ============================================================
-- 7. FUNÇÃO apagar_factura(UUID) — soft-delete com validação
-- ============================================================
CREATE OR REPLACE FUNCTION v4_energia.apagar_factura(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v4_energia, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v4_energia.facturas_uploaded
    WHERE id = p_id
    AND (uploaded_by = auth.uid() OR is_staff())
    AND apagado_em IS NULL
  ) THEN
    RAISE EXCEPTION 'permissão negada ou fatura inexistente';
  END IF;

  UPDATE v4_energia.facturas_uploaded
  SET apagado_em = now()
  WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION v4_energia.apagar_factura(UUID) IS
  'Soft-delete de fatura. Valida ownership (uploaded_by = auth.uid()) ou staff antes de marcar apagado_em. '
  'Hard-delete do Storage será gerido por cron job separado quando implementado.';

-- ============================================================
-- 8. GRANTS (migration adicional 20260512164633 — descoberta em runtime)
-- service_role precisa GRANT USAGE no schema v4_energia
-- authenticated precisa SELECT/INSERT/UPDATE na tabela
-- ============================================================
GRANT USAGE ON SCHEMA v4_energia TO service_role, authenticated;

GRANT SELECT, INSERT, UPDATE ON v4_energia.facturas_uploaded TO service_role, authenticated;

GRANT EXECUTE ON FUNCTION v4_energia.apagar_factura(UUID) TO authenticated;
