-- ═══════════════════════════════════════════════════════════════
-- 02b_v5_casa_seed_demo.sql
-- V5 Casa — Seed demo Família Santos (Fase 3.1)
-- Aplicar DEPOIS de 02_v5_casa_schema.sql
-- Idempotente: pode correr várias vezes sem criar duplicados.
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_pessoa_id         UUID;
  v_org_id            UUID;
  v_loc_id            UUID;
  v_eq_caldeira_id    UUID;
  v_eq_ac_id          UUID;
  v_eq_solar_id       UUID;
  v_eq_frigorifico_id UUID;
  v_sub_id            UUID;
BEGIN

  -- ── Maria Santos ───────────────────────────────────────────
  INSERT INTO core.pessoas (nome, email)
  VALUES ('Maria Santos', 'maria.santos+demo@example.pt')
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO v_pessoa_id
  FROM core.pessoas
  WHERE email = 'maria.santos+demo@example.pt';

  -- ── Organização Família Santos ─────────────────────────────
  SELECT id INTO v_org_id
  FROM core.organizations
  WHERE nome = 'Família Santos' AND tipo = 'individual'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO core.organizations (nome, tipo)
    VALUES ('Família Santos', 'individual')
    RETURNING id INTO v_org_id;
  END IF;

  -- ── Membership — Maria como owner ─────────────────────────
  INSERT INTO core.memberships (pessoa_id, organization_id, role)
  VALUES (v_pessoa_id, v_org_id, 'owner')
  ON CONFLICT (pessoa_id, organization_id) DO NOTHING;

  -- ── Localização: T2 Lisboa ─────────────────────────────────
  -- home_score=65, scores por categoria variados
  SELECT id INTO v_loc_id
  FROM v5_manutencao.localizacoes
  WHERE organization_id = v_org_id AND nome = 'Apartamento Lisboa'
  LIMIT 1;

  IF v_loc_id IS NULL THEN
    INSERT INTO v5_manutencao.localizacoes (
      organization_id, nome, tipo,
      morada, localidade, concelho, codigo_postal,
      ano_construcao, tipologia, area_m2,
      home_score,
      score_avac, score_canaliz, score_eletrica,
      score_estrutura, score_agua, score_cobertura, score_limpeza,
      assessment_completo
    ) VALUES (
      v_org_id, 'Apartamento Lisboa', 'habitacao',
      'Rua Américo Durão, 45, 3.º Dto', 'Lisboa', 'Lisboa', '1900-273',
      2004, 'T2', 85,
      65,
      82, 91, 70, 60, 88, 72, 68,
      false
    ) RETURNING id INTO v_loc_id;
  END IF;

  -- ── Equipamento 1: Caldeira Junkers ZWC 24 ────────────────
  -- 8 anos, classe C, garantia expirada, health 55
  SELECT id INTO v_eq_caldeira_id
  FROM v5_manutencao.equipamentos
  WHERE localizacao_id = v_loc_id AND nome = 'Caldeira Junkers ZWC 24'
  LIMIT 1;

  IF v_eq_caldeira_id IS NULL THEN
    INSERT INTO v5_manutencao.equipamentos (
      localizacao_id, organization_id, categoria,
      nome, marca, modelo, localizacao_imovel,
      data_instalacao, data_garantia_fim,
      data_ultima_revisao, data_proxima_revisao,
      classe_energetica, potencia_kw, consumo_estimado_kwh_mes,
      eficiencia_estimada, health_score
    ) VALUES (
      v_loc_id, v_org_id, 'aquecimento',
      'Caldeira Junkers ZWC 24', 'Junkers', 'ZWC 24-2 DH',
      'Rés-do-chão — compartimento técnico',
      '2016-03-15', '2021-03-15',
      '2023-11-14', '2024-11-14',
      'C', 24, 220, 72, 55
    ) RETURNING id INTO v_eq_caldeira_id;
  END IF;

  -- ── Equipamento 2: AC Daikin FTXC25 ───────────────────────
  -- 2022, A++, 3 anos garantia, health 82
  SELECT id INTO v_eq_ac_id
  FROM v5_manutencao.equipamentos
  WHERE localizacao_id = v_loc_id AND nome = 'AC Daikin FTXC25'
  LIMIT 1;

  IF v_eq_ac_id IS NULL THEN
    INSERT INTO v5_manutencao.equipamentos (
      localizacao_id, organization_id, categoria,
      nome, marca, modelo, localizacao_imovel,
      data_instalacao, data_garantia_fim,
      data_ultima_revisao, data_proxima_revisao,
      classe_energetica, potencia_kw, consumo_estimado_kwh_mes,
      eficiencia_estimada, health_score
    ) VALUES (
      v_loc_id, v_org_id, 'climatizacao',
      'AC Daikin FTXC25', 'Daikin', 'FTXC25B9',
      'Sala de estar',
      '2022-06-20', '2025-06-20',
      '2024-08-10', '2025-08-10',
      'A++', 2.5, 26, 94, 82
    ) RETURNING id INTO v_eq_ac_id;
  END IF;

  -- ── Equipamento 3: Painel Solar Solius ────────────────────
  -- 2022, A+, 3 anos garantia, health 90
  SELECT id INTO v_eq_solar_id
  FROM v5_manutencao.equipamentos
  WHERE localizacao_id = v_loc_id AND nome = 'Painel Solar Solius'
  LIMIT 1;

  IF v_eq_solar_id IS NULL THEN
    INSERT INTO v5_manutencao.equipamentos (
      localizacao_id, organization_id, categoria,
      nome, marca, modelo, localizacao_imovel,
      data_instalacao, data_garantia_fim, data_proxima_revisao,
      classe_energetica, potencia_kw, health_score
    ) VALUES (
      v_loc_id, v_org_id, 'solar',
      'Painel Solar Solius', 'Solius', 'SLIM200 2.0 XS',
      'Cobertura — terraço',
      '2022-04-05', '2025-04-05', '2025-04-05',
      'A+', 2.0, 90
    ) RETURNING id INTO v_eq_solar_id;
  END IF;

  -- ── Equipamento 4: Frigorífico Bosch KGN36 ────────────────
  -- 2021, A++, 4 anos garantia, health 75
  SELECT id INTO v_eq_frigorifico_id
  FROM v5_manutencao.equipamentos
  WHERE localizacao_id = v_loc_id AND nome = 'Frigorífico Bosch KGN36'
  LIMIT 1;

  IF v_eq_frigorifico_id IS NULL THEN
    INSERT INTO v5_manutencao.equipamentos (
      localizacao_id, organization_id, categoria,
      nome, marca, modelo, localizacao_imovel,
      data_instalacao, data_garantia_fim,
      classe_energetica, potencia_kw, consumo_estimado_kwh_mes,
      health_score
    ) VALUES (
      v_loc_id, v_org_id, 'eletrodomestico',
      'Frigorífico Bosch KGN36', 'Bosch', 'KGN36VIED',
      'Cozinha',
      '2021-09-12', '2025-09-12',
      'A++', 0.12, 18, 75
    ) RETURNING id INTO v_eq_frigorifico_id;
  END IF;

  -- ── 5 Documentos mock ─────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.documentos
                 WHERE equipamento_id = v_eq_caldeira_id AND tipo = 'garantia') THEN
    INSERT INTO v5_manutencao.documentos
      (organization_id, localizacao_id, equipamento_id, tipo, nome, url)
    VALUES
      (v_org_id, v_loc_id, v_eq_caldeira_id, 'garantia',
       'Garantia Caldeira Junkers 2016', 'https://demo.example.pt/docs/garantia-caldeira.pdf');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.documentos
                 WHERE equipamento_id = v_eq_ac_id AND tipo = 'garantia') THEN
    INSERT INTO v5_manutencao.documentos
      (organization_id, localizacao_id, equipamento_id, tipo, nome, url)
    VALUES
      (v_org_id, v_loc_id, v_eq_ac_id, 'garantia',
       'Garantia AC Daikin 2022', 'https://demo.example.pt/docs/garantia-ac.pdf');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.documentos
                 WHERE equipamento_id = v_eq_solar_id AND tipo = 'contrato') THEN
    INSERT INTO v5_manutencao.documentos
      (organization_id, localizacao_id, equipamento_id, tipo, nome, url)
    VALUES
      (v_org_id, v_loc_id, v_eq_solar_id, 'contrato',
       'Contrato instalação painéis Solius', 'https://demo.example.pt/docs/contrato-solar.pdf');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.documentos
                 WHERE equipamento_id = v_eq_frigorifico_id AND tipo = 'fatura') THEN
    INSERT INTO v5_manutencao.documentos
      (organization_id, localizacao_id, equipamento_id, tipo, nome, url)
    VALUES
      (v_org_id, v_loc_id, v_eq_frigorifico_id, 'fatura',
       'Fatura Frigorífico Bosch 2021', 'https://demo.example.pt/docs/fatura-frigorifico.pdf');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.documentos
                 WHERE localizacao_id = v_loc_id AND tipo = 'planta' AND equipamento_id IS NULL) THEN
    INSERT INTO v5_manutencao.documentos
      (organization_id, localizacao_id, tipo, nome, url)
    VALUES
      (v_org_id, v_loc_id, 'planta',
       'Planta do Apartamento T2', 'https://demo.example.pt/docs/planta-t2.pdf');
  END IF;

  -- ── 2 Intervenções históricas ─────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.intervencoes_equipamento
                 WHERE equipamento_id = v_eq_caldeira_id AND data = '2023-11-14') THEN
    INSERT INTO v5_manutencao.intervencoes_equipamento
      (equipamento_id, tipo, descricao, data, custo_total, notas_tecnico)
    VALUES
      (v_eq_caldeira_id, 'revisao',
       'Revisão anual caldeira — limpeza queimador, ajuste pressão, verificação de segurança',
       '2023-11-14', 95.00,
       'Caldeira com 7 anos. Eficiência a baixar. Considerar substituição em 2-3 anos.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.intervencoes_equipamento
                 WHERE equipamento_id = v_eq_ac_id AND data = '2024-08-10') THEN
    INSERT INTO v5_manutencao.intervencoes_equipamento
      (equipamento_id, tipo, descricao, data, custo_total, notas_tecnico)
    VALUES
      (v_eq_ac_id, 'revisao',
       'Limpeza filtros e revisão sistema AC Daikin',
       '2024-08-10', 65.00,
       'Filtros com acumulação moderada. Próxima revisão recomendada: Ago 2025.');
  END IF;

  -- ── Subscrição Home+ ──────────────────────────────────────
  SELECT id INTO v_sub_id
  FROM v5_manutencao.subscricoes
  WHERE pessoa_id = v_pessoa_id AND organization_id = v_org_id
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    INSERT INTO v5_manutencao.subscricoes (
      pessoa_id, organization_id, plano, preco_mensal,
      estado, data_inicio, data_renovacao,
      pontos_total, nivel
    ) VALUES (
      v_pessoa_id, v_org_id, 'home_plus', 14.99,
      'ativo', CURRENT_DATE, CURRENT_DATE + interval '1 month',
      100, 'bronze'
    ) RETURNING id INTO v_sub_id;
  END IF;

  -- ── 100 pontos onboarding ─────────────────────────────────
  INSERT INTO v5_manutencao.pontos_historico
    (pessoa_id, pontos, motivo, ref_tipo, ref_id)
  SELECT v_pessoa_id, 100, 'onboarding_bonus', 'subscricao', v_sub_id
  WHERE NOT EXISTS (
    SELECT 1 FROM v5_manutencao.pontos_historico
    WHERE pessoa_id = v_pessoa_id AND motivo = 'onboarding_bonus'
  );

  -- ── 3 Missões abertas ─────────────────────────────────────
  INSERT INTO v5_manutencao.missoes_utilizador
    (pessoa_id, titulo, descricao, pontos, urgente, estado, gerada_por)
  SELECT v_pessoa_id, m.titulo, m.descricao, m.pontos, m.urgente, 'aberta', 'seed'
  FROM (VALUES
    ('Completar Home Assessment',
     'Responde a 12 perguntas rápidas sobre a tua casa e recebe o teu Home Score detalhado.',
     300, false),
    ('Registar equipamento via câmara IA',
     'Fotografa a etiqueta de um equipamento e deixa a IA preencher os dados automaticamente.',
     100, false),
    ('Fazer upload de 5 documentos da casa',
     'Carrega garantias, faturas ou contratos para teres tudo centralizado.',
     150, false)
  ) AS m(titulo, descricao, pontos, urgente)
  WHERE NOT EXISTS (
    SELECT 1 FROM v5_manutencao.missoes_utilizador
    WHERE pessoa_id = v_pessoa_id AND titulo = m.titulo
  );

  -- ── 2 Alertas activos ─────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.alertas_inteligentes
                 WHERE organization_id = v_org_id
                   AND titulo = 'Caldeira com 8 anos — eficiência reduzida') THEN
    INSERT INTO v5_manutencao.alertas_inteligentes
      (organization_id, pessoa_id, localizacao_id, equipamento_id,
       tipo, nivel, titulo, descricao, dados_tecnicos, acoes, gerado_por)
    VALUES (
      v_org_id, v_pessoa_id, v_loc_id, v_eq_caldeira_id,
      'eficiencia', 'atencao',
      'Caldeira com 8 anos — eficiência reduzida',
      'A tua caldeira Junkers ZWC 24 tem 8 anos. Caldeiras desta idade perdem até 20% de eficiência. Uma revisão pode reduzir o consumo de gás.',
      '{"idade_anos": 8, "classe": "C", "health_score": 55, "poupanca_estimada_pct": 20}'::jsonb,
      '[{"label": "Agendar revisão", "acao": "book_service", "categoria": "aquecimento"}, {"label": "Ver técnicos", "acao": "view_prestadores"}]'::jsonb,
      'regra'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v5_manutencao.alertas_inteligentes
                 WHERE organization_id = v_org_id
                   AND titulo = 'Filtro AC Daikin — revisão anual recomendada') THEN
    INSERT INTO v5_manutencao.alertas_inteligentes
      (organization_id, pessoa_id, localizacao_id, equipamento_id,
       tipo, nivel, titulo, descricao, dados_tecnicos, acoes, gerado_por)
    VALUES (
      v_org_id, v_pessoa_id, v_loc_id, v_eq_ac_id,
      'manutencao', 'info',
      'Filtro AC Daikin — revisão anual recomendada',
      'O AC Daikin FTXC25 não tem revisão registada há quase 1 ano. Uma limpeza de filtros mantém a eficiência e a qualidade do ar.',
      '{"ultima_revisao": "2024-08-10", "meses_sem_revisao": 8, "health_score": 82}'::jsonb,
      '[{"label": "Agendar limpeza AC", "acao": "book_service", "categoria": "climatizacao"}]'::jsonb,
      'regra'
    );
  END IF;

END $$;
