-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 1D · Day 2 — RPC transacção atómica prestador + recibo
-- Projecto Supabase ALVO: V1 Core Hub  (hkmvszkpxjbxmnixzqbl)
-- NUNCA aplicar contra V2 Condo Hub (eozklslwfaqujaijvdnl) — produção viva.
--
-- Cria função RPC SECURITY DEFINER:
--   v5_manutencao.create_prestador_and_recibo_atomic(...)
--
-- Regras aplicadas:
--   - Regra X (SECURITY DEFINER sem GRANT EXECUTE = 42501):
--     REVOKE PUBLIC + GRANT EXECUTE TO service_role explícito.
--   - FOR UPDATE em magic_links: previne race condition entre 2 prestadores
--     a usarem o mesmo link em simultâneo (window ~ms).
--   - Transacção atómica: INSERT prestador + INSERT recibo + UPDATE used_at
--     ocorrem numa única transacção — rollback total se qualquer passo falhar.
--   - Decisão 4 (06-final-plan): edge function prestador-onboarding chama
--     este RPC via service_role; cliente nunca acede directamente.
--
-- Idempotente: CREATE OR REPLACE — reaplicar não perde dados.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: v5_manutencao.create_prestador_and_recibo_atomic
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION v5_manutencao.create_prestador_and_recibo_atomic(
  p_magic_link_id UUID,
  p_prestador_data JSONB,
  p_recibo_data    JSONB,      -- reservado para extensão futura; não usado nesta versão
  p_ip_origem      INET,
  p_user_agent     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = v5_manutencao, public
AS $$
DECLARE
  v_link         RECORD;
  v_prestador_id UUID;
  v_recibo_id    UUID;
BEGIN
  -- ── 1. Lock row (FOR UPDATE previne race condition 2+ prestadores em simultâneo) ──
  SELECT * INTO v_link
  FROM v5_manutencao.magic_links
  WHERE id = p_magic_link_id
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    -- ERRCODE P0001: edge function interpreta como 410 (usado ou expirado)
    RAISE EXCEPTION 'magic_link not found, already used, or expired'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 2. INSERT prestadores_parceiros ──────────────────────────────────────
  INSERT INTO v5_manutencao.prestadores_parceiros (
    magic_link_id,
    nome_completo,
    nif,
    telefone,
    morada,
    email,
    confirmacao_valor,
    ip_origem,
    user_agent
  ) VALUES (
    p_magic_link_id,
    p_prestador_data->>'nome',
    p_prestador_data->>'nif',
    p_prestador_data->>'telefone',
    p_prestador_data->>'morada',
    p_prestador_data->>'email',
    (p_prestador_data->>'confirmacao_valor')::BOOLEAN,
    p_ip_origem,
    p_user_agent
  )
  RETURNING id INTO v_prestador_id;

  -- ── 3. INSERT recibos_servico (snapshot dos dados do magic_link) ─────────
  INSERT INTO v5_manutencao.recibos_servico (
    owner_pessoa_id,
    organization_id,
    localizacao_id,
    prestador_id,
    magic_link_id,
    tipo_servico,
    valor_eur,
    data_servico,
    notas
  ) VALUES (
    v_link.owner_pessoa_id,
    v_link.organization_id,
    v_link.localizacao_id,
    v_prestador_id,
    p_magic_link_id,
    v_link.tipo_servico,
    v_link.valor_eur,
    v_link.data_servico,
    v_link.notas
  )
  RETURNING id INTO v_recibo_id;

  -- ── 4. Marcar magic_link como utilizado ───────────────────────────────────
  UPDATE v5_manutencao.magic_links
  SET
    used_at      = now(),
    prestador_id = v_prestador_id
  WHERE id = p_magic_link_id;

  -- ── 5. Retornar IDs para audit log (edge function não expõe ao cliente) ───
  RETURN jsonb_build_object(
    'recibo_id',    v_recibo_id,
    'prestador_id', v_prestador_id,
    'status',       'recibo_emitido'
  );
END $$;

-- ── Regra X: SECURITY DEFINER precisa GRANT EXECUTE explícito ─────────────
-- Revoga acesso público (default PostgreSQL concede EXECUTE a PUBLIC)
REVOKE EXECUTE ON FUNCTION v5_manutencao.create_prestador_and_recibo_atomic(
  UUID, JSONB, JSONB, INET, TEXT
) FROM PUBLIC;

-- Concede apenas a service_role (edge function corre com service key)
GRANT EXECUTE ON FUNCTION v5_manutencao.create_prestador_and_recibo_atomic(
  UUID, JSONB, JSONB, INET, TEXT
) TO service_role;

-- ── Reload PostgREST schema cache ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO MANUAL (Mário corre depois de aplicar)
-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Função existe:
-- SELECT n.nspname, p.proname, p.prosecdef
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'v5_manutencao' AND p.proname = 'create_prestador_and_recibo_atomic';
-- Esperado: 1 linha com prosecdef = true
--
-- 2) GRANT auditado (Regra X):
-- SELECT grantee, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_schema = 'v5_manutencao'
--   AND routine_name = 'create_prestador_and_recibo_atomic';
-- Esperado: service_role com EXECUTE; PUBLIC sem nada
--
-- 3) Smoke test RPC (Day 2 gate — requer magic_link real):
-- SELECT v5_manutencao.create_prestador_and_recibo_atomic(
--   '<magic_link_uuid>',
--   '{"nome":"João Teste","nif":"123456789","telefone":"912345678","confirmacao_valor":true}'::jsonb,
--   '{}'::jsonb,
--   '127.0.0.1'::inet,
--   'smoke-test'
-- );
-- Esperado: JSON com recibo_id, prestador_id, status='recibo_emitido'
-- ─────────────────────────────────────────────────────────────────────────────
