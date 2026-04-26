-- 22_v5_3_4d_nome_split.sql
-- Sprint 3.4D fix-ux #1: primeiro_nome + apelidos em core.pessoas
-- Aplicar: 2026-04-26

-- Passo 1: Adicionar colunas
ALTER TABLE core.pessoas
  ADD COLUMN IF NOT EXISTS primeiro_nome text,
  ADD COLUMN IF NOT EXISTS apelidos      text;

-- Passo 2: Backfill conservador de rows existentes
UPDATE core.pessoas
SET
  primeiro_nome = split_part(trim(nome), ' ', 1),
  apelidos      = NULLIF(trim(regexp_replace(trim(nome), '^\S+\s*', '')), '')
WHERE nome IS NOT NULL
  AND primeiro_nome IS NULL;

COMMENT ON COLUMN core.pessoas.nome IS
  'Nome completo legal. Usado em recibos/contratos. primeiro_nome + apelidos é display.';

-- Passo 3: Actualizar fn_complete_onboarding para aceitar e guardar primeiro_nome + apelidos
CREATE OR REPLACE FUNCTION core.fn_complete_onboarding(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_auth_user_id   uuid    := (payload->>'auth_user_id')::uuid;
  v_tipo           text    := payload->>'tipo';
  -- Novo formato: primeiro_nome + apelidos. Fallback: campo nome legacy.
  v_primeiro_nome  text    := NULLIF(trim(payload->>'primeiro_nome'), '');
  v_apelidos       text    := NULLIF(trim(payload->>'apelidos'), '');
  v_nome_legacy    text    := NULLIF(trim(payload->>'nome'), '');
  v_nome           text;
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

  -- Compor nome completo e derivar primeiro_nome/apelidos
  IF v_primeiro_nome IS NOT NULL THEN
    -- Novo formato: vem explícito do wizard
    v_nome := trim(v_primeiro_nome || CASE WHEN v_apelidos IS NOT NULL THEN ' ' || v_apelidos ELSE '' END);
  ELSE
    -- Legacy: só nome completo
    v_nome          := COALESCE(v_nome_legacy, '');
    v_primeiro_nome := split_part(v_nome, ' ', 1);
    v_apelidos      := NULLIF(trim(regexp_replace(v_nome, '^\S+\s*', '')), '');
  END IF;

  IF v_tipo = 'individual' THEN
    v_ent_nome := COALESCE(v_ent_nome, v_nome);
    v_ent_nif  := COALESCE(v_ent_nif,  v_nif_pessoal);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_auth_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'auth_user_id inválido: %', v_auth_user_id;
  END IF;

  INSERT INTO core.pessoas (
    auth_user_id, nome, primeiro_nome, apelidos,
    email, nif, telemovel, telefone_indicativo,
    foto_url, email_verified, source
  )
  VALUES (
    v_auth_user_id, v_nome, v_primeiro_nome, v_apelidos,
    v_email, v_nif_pessoal, v_telemovel, v_tel_indicativo,
    v_foto_url, true, 'v5_signup'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET nome                = EXCLUDED.nome,
        primeiro_nome       = EXCLUDED.primeiro_nome,
        apelidos            = EXCLUDED.apelidos,
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

NOTIFY pgrst, 'reload schema';
