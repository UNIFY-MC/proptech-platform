-- ═══════════════════════════════════════════════════════════════
-- V5 CASA · Fase 3.4 — Bucket v5-casa-docs + policy DEV
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('v5-casa-docs', 'v5-casa-docs', true, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "dev_all_v5_casa_docs" ON storage.objects;

CREATE POLICY "dev_all_v5_casa_docs" ON storage.objects
  FOR ALL TO anon, authenticated
  USING (bucket_id = 'v5-casa-docs')
  WITH CHECK (bucket_id = 'v5-casa-docs');
