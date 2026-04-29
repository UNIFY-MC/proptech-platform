-- ═══════════════════════════════════════════════════════════════
-- Sprint 1B.2.1 — Bucket equipamentos-fotos + fn_match_existing_equipamento
-- Tarefa 1: bucket Storage privado + RLS por pessoa_id (1º segmento do path)
-- Tarefa 2: helper fuzzy-match equipamentos (pg_trgm similarity)
--
-- NOTA: pg_trgm estava disponível mas não instalado — instalado aqui.
-- Path esperado no bucket: {pessoa_id}/{eq_id}/{ts}.{ext}
-- service_role (Edge Function) bypassa RLS — policies protegem o frontend.
-- ═══════════════════════════════════════════════════════════════

-- EXTENSÃO pg_trgm (necessária para similarity() em fn_match_existing_equipamento)
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════
-- Tarefa 1 — Bucket Storage: equipamentos-fotos
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipamentos-fotos',
  'equipamentos-fotos',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: storage.objects já tem RLS activo por defeito no Supabase.
-- Policies isolam por pessoa_id (1º segmento do path).

DROP POLICY IF EXISTS "equip_fotos_insert_own" ON storage.objects;
CREATE POLICY "equip_fotos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'equipamentos-fotos'
    AND (storage.foldername(name))[1] = public.current_pessoa_id()::text
  );

DROP POLICY IF EXISTS "equip_fotos_select_own" ON storage.objects;
CREATE POLICY "equip_fotos_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'equipamentos-fotos'
    AND (storage.foldername(name))[1] = public.current_pessoa_id()::text
  );

DROP POLICY IF EXISTS "equip_fotos_delete_own" ON storage.objects;
CREATE POLICY "equip_fotos_delete_own" ON storage.objects
  FOR DELETE TO authenticatedated
  USING (
    bucket_id = 'equipamentos-fotos'
    AND (storage.foldername(name))[1] = public.current_pessoa_id()::text
  );

-- ═══════════════════════════════════════════════════════════════
-- Tarefa 2 — fn_match_existing_equipamento
-- Fuzzy-match por localizacao_id + categoria + nome.
-- Score [0,1]: 0.5 se categoria exacta + até 0.5 por similarity de nome.
-- Top 5 resultados. Só service_role pode invocar.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION v5_manutencao.fn_match_existing_equipamento(
  p_localizacao_id uuid,
  p_categoria      text,
  p_nome           text
)
RETURNS TABLE (
  id               uuid,
  nome             text,
  categoria        text,
  marca            text,
  modelo           text,
  localizacao_imovel text,
  data_instalacao  date,
  dados_ia         jsonb,
  score            real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v5_manutencao, extensions, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.categoria,
    e.marca,
    e.modelo,
    e.localizacao_imovel,
    e.data_instalacao,
    e.dados_ia,
    (
      CASE WHEN lower(e.categoria) = lower(p_categoria) THEN 0.5 ELSE 0.0 END
      + similarity(lower(e.nome), lower(p_nome)) * 0.5
    )::real AS score
  FROM v5_manutencao.equipamentos e
  WHERE
    e.localizacao_id = p_localizacao_id
    AND (
      lower(e.categoria) = lower(p_categoria)
      OR similarity(lower(e.nome), lower(p_nome)) > 0.15
    )
  ORDER BY score DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION v5_manutencao.fn_match_existing_equipamento(uuid, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION v5_manutencao.fn_match_existing_equipamento(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION v5_manutencao.fn_match_existing_equipamento(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION v5_manutencao.fn_match_existing_equipamento(uuid, text, text) FROM authenticated;

NOTIFY pgrst, 'reload schema';
