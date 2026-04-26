-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 3.4C fix-ux
-- A) core.pessoas: ADD COLUMN telefone_indicativo TEXT DEFAULT '+351'
--    + CHECK constraint formato +DIGITS (1-4 dígitos)
-- B) fn_complete_onboarding: aceita telefone_indicativo no payload
--    + INSERT subscricao 'gratis' por defeito (corrige 406 em PerfilDrawer)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── A: coluna telefone_indicativo ─────────────────────────────────────────
ALTER TABLE core.pessoas
  ADD COLUMN IF NOT EXISTS telefone_indicativo TEXT DEFAULT '+351';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pessoas_telefone_indicativo_format'
  ) THEN
    ALTER TABLE core.pessoas
      ADD CONSTRAINT pessoas_telefone_indicativo_format
      CHECK (telefone_indicativo IS NULL OR telefone_indicativo ~ '^\+\d{1,4}$');
  END IF;
END $$;

-- Backfill: utilizadores existentes sem indicativo ficam com +351
UPDATE core.pessoas
  SET telefone_indicativo = '+351'
  WHERE telemovel IS NOT NULL AND telefone_indicativo IS NULL;

-- ── B: fn_complete_onboarding actualizada ─────────────────────────────────
CREATE OR REPLACE FUNCTION core.fn_complete_onboarding(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, v5_manutencao, auth, public
AS $$
DECLARE
  v_auth_user_id   uuid    := (payload->>'auth_user_id')::uuid;
  v_tipo           text    := payload->>'tipo';
  v_nome           text    := payload->>'nome';
  v_nif_pessoal    text    := NULLIF(trim(payload->>'nif_pessoal'), '');
  v_telemovel      text    := NULLIF(trim(payload->>'telemovel'), '');
  v_tel_indicativo text    := COALESCE(NULLIF(trim(payload->>'telefone_indicativo'), ''), '+351');
  v_foto_url       text    := NULLIF(payload->>'foto_url', '');
  v_ent_nome       text    := NULLIF(trim(payload->>'ent_nome'), '');
  v_ent_nif        text    := NULLIF(trim(payload->>'ent_nif'), '');
  v_ent_morada     text    := NULLIF(trim(payload->>'ent_morada'), '');
  v_ent_localidade text    := NULLIF(trim(payload->>'ent_localidade'), '');
  v_ent_cp         text    := NULLIF(trim(payload->>'ent_cp'), '');
  v_ent_iban       text    := NULLIF(trim(payload->>'ent_iban'), '');
  v_loc_nome       text    := NULLIF(trim(payload->>'loc_nome'), '');
  v_loc_tipo       text    := COALESCE(NULLIF(payload->>'loc_tipo', ''), 'habitacao');
  v_loc_morada     text    := NULLIF(trim(payload->>'loc_morada'), '');
  v_loc_localidade text    := NULLIF(trim(payload->>'loc_localidade'), '');
  v_loc_cp         text    := NULLIF(trim(payload->>'loc_cp'), '');
  v_loc_area       numeric;
  v_pessoa_id      uuid;
  v_org_id         uuid;
  v_perfil_id      uuid;
  v_email          text;
BEGIN
  BEGIN v_loc_area := (payload->>'loc_area')::numeric; EXCEPTION WHEN OTHERS THEN v_loc_area := NULL; END;

  IF v_tipo = 'individual' THEN
    v_ent_nome := COALESCE(v_ent_nome, v_nome);
    v_ent_nif  := COALESCE(v_ent_nif,  v_nif_pessoal);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_auth_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'auth_user_id inválido: %', v_auth_user_id;
  END IF;

  INSERT INTO core.pessoas (
    auth_user_id, nome, email, nif, telemovel, telefone_indicativo,
    foto_url, email_verified, source
  )
  VALUES (
    v_auth_user_id, v_nome, v_email, v_nif_pessoal, v_telemovel, v_tel_indicativo,
    v_foto_url, true, 'v5_signup'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET nome                = EXCLUDED.nome,
        nif                 = EXCLUDED.nif,
        telemovel           = EXCLUDED.telemovel,
        telefone_indicativo = EXCLUDED.telefone_indicativo,
        foto_url            = COALESCE(EXCLUDED.foto_url, core.pessoas.foto_url),
        updated_at          = now()
  RETURNING id INTO v_pessoa_id;

  INSERT INTO core.organizations (tipo, nome, nif, morada, localidade, codigo_postal, metadata)
  VALUES (
    v_tipo,
    COALESCE(v_ent_nome, v_nome),
    v_ent_nif,
    v_ent_morada,
    v_ent_localidade,
    v_ent_cp,
    jsonb_build_object('iban', v_ent_iban, 'criado_via', 'onboarding_v5')
  )
  RETURNING id INTO v_org_id;

  INSERT INTO core.memberships (pessoa_id, organization_id, role, aceite_em)
  VALUES (v_pessoa_id, v_org_id, 'owner', now());

  INSERT INTO v5_manutencao.perfis_fiscais (
    pessoa_id, organization_id, nome, nome_facturacao, nif, morada_facturacao, iban, principal
  )
  VALUES (
    v_pessoa_id,
    v_org_id,
    COALESCE(v_ent_nome, v_nome),
    COALESCE(v_ent_nome, v_nome),
    v_ent_nif,
    CASE
      WHEN v_ent_morada IS NOT NULL AND v_ent_cp IS NOT NULL AND v_ent_localidade IS NOT NULL
        THEN v_ent_morada || ', ' || v_ent_cp || ' ' || v_ent_localidade
      WHEN v_ent_morada IS NOT NULL
        THEN v_ent_morada
      ELSE NULL
    END,
    v_ent_iban,
    true
  )
  RETURNING id INTO v_perfil_id;

  IF v_tipo != 'gestor_imoveis' AND v_loc_nome IS NOT NULL THEN
    INSERT INTO v5_manutencao.localizacoes (
      pessoa_id, organization_id, perfil_fiscal_id,
      nome, tipo, morada, localidade, codigo_postal, area_m2,
      principal, categoria, origem
    )
    VALUES (
      v_pessoa_id, v_org_id, v_perfil_id,
      v_loc_nome,  v_loc_tipo,
      v_loc_morada, v_loc_localidade, v_loc_cp, v_loc_area,
      true, 'habitacional', 'v5_cliente'
    );
  END IF;

  -- Subscricao gratis por defeito (garante que PerfilDrawer não recebe 406)
  INSERT INTO v5_manutencao.subscricoes
    (pessoa_id, organization_id, plano, preco_mensal, estado, nivel, pontos_total)
  VALUES
    (v_pessoa_id, v_org_id, 'gratis', 0.00, 'ativo', 'bronze', 0);

  RETURN jsonb_build_object(
    'ok',        true,
    'pessoa_id', v_pessoa_id::text,
    'org_id',    v_org_id::text
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- GRANT mantido igual ao SQL 18 — restringir para authenticated só em 3.4D (SMTP estável)
GRANT EXECUTE ON FUNCTION core.fn_complete_onboarding(jsonb) TO authenticated, anon;
