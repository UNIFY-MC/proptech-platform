-- ─────────────────────────────────────────────────────────────────────────────
-- 3.4B · Onboarding wizard — schema patch + RPC atómica
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adicionar 'gestor_imoveis' ao CHECK de core.organizations.tipo
ALTER TABLE core.organizations DROP CONSTRAINT IF EXISTS organizations_tipo_check;
ALTER TABLE core.organizations ADD CONSTRAINT organizations_tipo_check
  CHECK (tipo = ANY(ARRAY[
    'individual', 'condominio', 'empresa_admin_condo',
    'empresa_comercial', 'prestador', 'gestor_imoveis'
  ]));

-- 2. RPC atómica — cria pessoa + org + membership + perfil_fiscal + localizacao
-- SECURITY DEFINER: executa como owner (postgres), ultrapassa RLS actual.
-- TODO(mario 3.4C): restringir a auth.uid() = payload->>'auth_user_id' depois de RLS estar activo.
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
  v_foto_url       text    := NULLIF(payload->>'foto_url', '');
  -- entidade (individual usa dados pessoais como fallback)
  v_ent_nome       text    := NULLIF(trim(payload->>'ent_nome'), '');
  v_ent_nif        text    := NULLIF(trim(payload->>'ent_nif'), '');
  v_ent_morada     text    := NULLIF(trim(payload->>'ent_morada'), '');
  v_ent_localidade text    := NULLIF(trim(payload->>'ent_localidade'), '');
  v_ent_cp         text    := NULLIF(trim(payload->>'ent_cp'), '');
  v_ent_iban       text    := NULLIF(trim(payload->>'ent_iban'), '');
  -- localização
  v_loc_nome       text    := NULLIF(trim(payload->>'loc_nome'), '');
  v_loc_tipo       text    := COALESCE(NULLIF(payload->>'loc_tipo', ''), 'habitacao');
  v_loc_morada     text    := NULLIF(trim(payload->>'loc_morada'), '');
  v_loc_localidade text    := NULLIF(trim(payload->>'loc_localidade'), '');
  v_loc_cp         text    := NULLIF(trim(payload->>'loc_cp'), '');
  v_loc_area       numeric;
  -- result
  v_pessoa_id      uuid;
  v_org_id         uuid;
  v_perfil_id      uuid;
  v_email          text;
BEGIN
  -- área opcional
  BEGIN v_loc_area := (payload->>'loc_area')::numeric; EXCEPTION WHEN OTHERS THEN v_loc_area := NULL; END;

  -- Para individual: entidade usa dados pessoais
  IF v_tipo = 'individual' THEN
    v_ent_nome := COALESCE(v_ent_nome, v_nome);
    v_ent_nif  := COALESCE(v_ent_nif,  v_nif_pessoal);
  END IF;

  -- Buscar email do auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_auth_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'auth_user_id inválido: %', v_auth_user_id;
  END IF;

  -- 1. Criar/actualizar core.pessoas
  INSERT INTO core.pessoas (auth_user_id, nome, email, nif, telemovel, foto_url, email_verified, source)
  VALUES (v_auth_user_id, v_nome, v_email, v_nif_pessoal, v_telemovel, v_foto_url, true, 'v5_signup')
  ON CONFLICT (auth_user_id) DO UPDATE
    SET nome       = EXCLUDED.nome,
        nif        = EXCLUDED.nif,
        telemovel  = EXCLUDED.telemovel,
        foto_url   = COALESCE(EXCLUDED.foto_url, core.pessoas.foto_url),
        updated_at = now()
  RETURNING id INTO v_pessoa_id;

  -- 2. Criar organization
  INSERT INTO core.organizations (tipo, nome, nif, morada, localidade, codigo_postal, metadata)
  VALUES (
    v_tipo,
    COALESCE(v_ent_nome, v_nome),
    v_ent_nif,
    v_ent_morada,
    v_ent_localidade,
    v_ent_cp,
    jsonb_build_object(
      'iban',       v_ent_iban,
      'criado_via', 'onboarding_v5'
    )
  )
  RETURNING id INTO v_org_id;

  -- 3. Criar membership (owner)
  INSERT INTO core.memberships (pessoa_id, organization_id, role, aceite_em)
  VALUES (v_pessoa_id, v_org_id, 'owner', now());

  -- 4. Criar perfil fiscal
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

  -- 5. Criar localização (skip para gestor_imoveis ou sem nome)
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
      true, 'habitacional', 'v5_onboarding'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',        true,
    'pessoa_id', v_pessoa_id::text,
    'org_id',    v_org_id::text
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- TODO(mario 3.4C): revogar anon após RLS estar activo
GRANT EXECUTE ON FUNCTION core.fn_complete_onboarding(jsonb) TO authenticated, anon;
