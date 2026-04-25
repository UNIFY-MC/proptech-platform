-- ============================================================
-- v5-manutencao · Fase 3.3.8B — Seed multi-imóveis Maria Santos
-- Aplicar em: Supabase DEV (hkmvszkpxjbxmnixzqbl)
-- NUNCA aplicar em produção (eozklslwfaqujaijvdnl)
--
-- Maria Santos demo: 9ef5000a-827b-4486-9c5d-352545e4de91
-- Prestadores:
--   António Ferreira : da174e7d-89a1-41ac-a66b-f5f63b1a5cb7
--   Ricardo Gomes    : 5edef2be-9339-4a8e-8c7a-472199f1a4e1
--   Sandra Matos     : b70d6528-2ef0-4a43-855b-9fd6d9b45a14
-- ============================================================

DO $$
DECLARE
  v_maria_id   uuid := '9ef5000a-827b-4486-9c5d-352545e4de91';
  v_loc_coimbra uuid;
  v_loc_lisboa  uuid;
  v_loc_faro    uuid;
  v_prest_1    uuid := 'da174e7d-89a1-41ac-a66b-f5f63b1a5cb7';
  v_prest_2    uuid := '5edef2be-9339-4a8e-8c7a-472199f1a4e1';
  v_prest_3    uuid := 'b70d6528-2ef0-4a43-855b-9fd6d9b45a14';
BEGIN

-- ────────────────────────────────────────────────────────────
-- 1. Actualizar core.pessoas — Maria
-- ────────────────────────────────────────────────────────────
UPDATE core.pessoas SET
  data_nascimento = '1985-03-12',
  idioma          = 'pt-PT',
  metadata        = '{"notif_email":true,"notif_wa":false,"notif_push":true,"tema":"auto"}'::jsonb,
  membro_desde    = '2024-08-15'::timestamptz
WHERE id = v_maria_id;

-- ────────────────────────────────────────────────────────────
-- 2. Localizações (3 imóveis) — idempotente via nome+pessoa_id
-- ────────────────────────────────────────────────────────────

-- Casa Principal (Coimbra)
IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.localizacoes
  WHERE pessoa_id = v_maria_id AND nome = 'Casa Principal'
) THEN
  INSERT INTO v5_manutencao.localizacoes
    (pessoa_id, nome, tipo, rua, numero, codigo_postal, cidade, distrito, pais, principal, home_score)
  VALUES
    (v_maria_id, 'Casa Principal', 'habitacao', 'R. Palmira Bastos', '2', '3000-001', 'Coimbra', 'Coimbra', 'PT', true, 74);
END IF;

-- Apartamento Lisboa
IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.localizacoes
  WHERE pessoa_id = v_maria_id AND nome = 'Apartamento Lisboa'
) THEN
  INSERT INTO v5_manutencao.localizacoes
    (pessoa_id, nome, tipo, rua, numero, andar, codigo_postal, cidade, distrito, pais, principal, home_score)
  VALUES
    (v_maria_id, 'Apartamento Lisboa', 'segunda_habitacao', 'Av. da Liberdade', '110', '4ºE', '1250-145', 'Lisboa', 'Lisboa', 'PT', false, 62);
END IF;

-- Casa de Férias (Faro)
IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.localizacoes
  WHERE pessoa_id = v_maria_id AND nome = 'Casa de Férias'
) THEN
  INSERT INTO v5_manutencao.localizacoes
    (pessoa_id, nome, tipo, rua, numero, codigo_postal, cidade, distrito, pais, principal, home_score)
  VALUES
    (v_maria_id, 'Casa de Férias', 'segunda_habitacao', 'R. do Mar', '5', '8000-100', 'Faro', 'Faro', 'PT', false, 55);
END IF;

-- Guardar IDs das localizações
SELECT id INTO v_loc_coimbra FROM v5_manutencao.localizacoes WHERE pessoa_id = v_maria_id AND nome = 'Casa Principal';
SELECT id INTO v_loc_lisboa  FROM v5_manutencao.localizacoes WHERE pessoa_id = v_maria_id AND nome = 'Apartamento Lisboa';
SELECT id INTO v_loc_faro    FROM v5_manutencao.localizacoes WHERE pessoa_id = v_maria_id AND nome = 'Casa de Férias';

-- ────────────────────────────────────────────────────────────
-- 3. localizacao_ativa_id → Casa Principal
-- ────────────────────────────────────────────────────────────
UPDATE core.pessoas SET localizacao_ativa_id = v_loc_coimbra WHERE id = v_maria_id;

-- ────────────────────────────────────────────────────────────
-- 4. Perfil fiscal
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.perfis_fiscais WHERE pessoa_id = v_maria_id
) THEN
  INSERT INTO v5_manutencao.perfis_fiscais (pessoa_id, nif, nome_facturacao, principal)
  VALUES (v_maria_id, '258741369', 'Maria Santos', true);
END IF;

-- ────────────────────────────────────────────────────────────
-- 5. Código de referência
-- ────────────────────────────────────────────────────────────
INSERT INTO v5_manutencao.codigos_referencia (pessoa_id, codigo, total_referidos, total_credito_ganho)
VALUES (v_maria_id, 'MARIA-2025', 2, 50.00)
ON CONFLICT (pessoa_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 6. Referidos (3 amigos)
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.referidos WHERE referrer_id = v_maria_id AND referido_email = 'joao.s@example.pt'
) THEN
  INSERT INTO v5_manutencao.referidos (referrer_id, referido_nome, referido_email, estado, credito_ganho, data_convite, data_completou)
  VALUES (v_maria_id, 'João S.', 'joao.s@example.pt', 'completou', 25.00, '2026-03-15'::timestamptz, '2026-03-18'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.referidos WHERE referrer_id = v_maria_id AND referido_email = 'ana.m@example.pt'
) THEN
  INSERT INTO v5_manutencao.referidos (referrer_id, referido_nome, referido_email, estado, credito_ganho, data_convite)
  VALUES (v_maria_id, 'Ana M.', 'ana.m@example.pt', 'pendente', 0, '2026-04-10'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.referidos WHERE referrer_id = v_maria_id AND referido_email = 'pedro.l@example.pt'
) THEN
  INSERT INTO v5_manutencao.referidos (referrer_id, referido_nome, referido_email, estado, credito_ganho, data_convite, data_completou)
  VALUES (v_maria_id, 'Pedro L.', 'pedro.l@example.pt', 'completou', 25.00, '2026-02-28'::timestamptz, '2026-03-05'::timestamptz);
END IF;

-- ────────────────────────────────────────────────────────────
-- 7. Métodos de pagamento (2)
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.metodos_pagamento WHERE pessoa_id = v_maria_id AND tipo = 'cartao'
) THEN
  INSERT INTO v5_manutencao.metodos_pagamento (pessoa_id, tipo, marca, last4, validade, principal)
  VALUES (v_maria_id, 'cartao', 'Visa', '4242', '12/27', true);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.metodos_pagamento WHERE pessoa_id = v_maria_id AND tipo = 'mbway'
) THEN
  INSERT INTO v5_manutencao.metodos_pagamento (pessoa_id, tipo, telefone, principal)
  VALUES (v_maria_id, 'mbway', '+351 912 345 678', false);
END IF;

-- ────────────────────────────────────────────────────────────
-- 8. Sessões activas (2)
-- (pontos_historico.data é timestamp sem zona — usar timestamp)
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM core.sessoes WHERE pessoa_id = v_maria_id AND device = 'iPhone 14 Pro · Safari'
) THEN
  INSERT INTO core.sessoes (pessoa_id, device, user_agent, cidade, ativa)
  VALUES (v_maria_id, 'iPhone 14 Pro · Safari', 'Mozilla/5.0 (iPhone)', 'Coimbra', true);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM core.sessoes WHERE pessoa_id = v_maria_id AND device = 'Chrome · Windows'
) THEN
  INSERT INTO core.sessoes (pessoa_id, device, user_agent, cidade, iniciada_em, ultimo_uso_em, ativa)
  VALUES (v_maria_id, 'Chrome · Windows', 'Mozilla/5.0 (Windows)', 'Lisboa',
    now() - interval '3 days', now() - interval '3 days', true);
END IF;

-- ────────────────────────────────────────────────────────────
-- 9. Pontos histórico (5 entradas novas)
-- Esquema real: id, pessoa_id, pontos, motivo, ref_tipo, ref_id, data
-- NOTA: sem coluna metadata — coluna do plano não existe
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.pontos_historico WHERE pessoa_id = v_maria_id AND motivo = 'Subscrição Home+ activada'
) THEN
  INSERT INTO v5_manutencao.pontos_historico (pessoa_id, pontos, motivo, data)
  VALUES (v_maria_id, 500, 'Subscrição Home+ activada', '2026-04-01'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.pontos_historico WHERE pessoa_id = v_maria_id AND motivo = 'Streak 14 dias'
) THEN
  INSERT INTO v5_manutencao.pontos_historico (pessoa_id, pontos, motivo, data)
  VALUES (v_maria_id, 140, 'Streak 14 dias', '2026-04-15'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.pontos_historico WHERE pessoa_id = v_maria_id AND motivo = 'Avaliei João Ferreira'
) THEN
  INSERT INTO v5_manutencao.pontos_historico (pessoa_id, pontos, motivo, data)
  VALUES (v_maria_id, 50, 'Avaliei João Ferreira', '2026-04-18'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.pontos_historico WHERE pessoa_id = v_maria_id AND motivo = 'Upload garantia caldeira'
) THEN
  INSERT INTO v5_manutencao.pontos_historico (pessoa_id, pontos, motivo, data)
  VALUES (v_maria_id, 30, 'Upload garantia caldeira', '2026-04-20'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.pontos_historico WHERE pessoa_id = v_maria_id AND motivo = 'Missão Verificar caleiras'
) THEN
  INSERT INTO v5_manutencao.pontos_historico (pessoa_id, pontos, motivo, data)
  VALUES (v_maria_id, 200, 'Missão Verificar caleiras', '2026-04-22'::timestamptz);
END IF;

-- ────────────────────────────────────────────────────────────
-- 10. Combos (3)
-- ────────────────────────────────────────────────────────────
INSERT INTO v5_manutencao.combos (slug, nome, sub, preco_combo, preco_normal, desconto_pct, cor_hex, emoji)
VALUES
  ('pack-inverno',    'Pack Inverno',    'Caldeira + caleiras + cobertura', 185.00, 229.00, 19, '#E6F1FB', '❄️'),
  ('reset-primavera', 'Reset Primavera', 'Limpeza profunda + jardim',       129.00, 175.00, 26, '#FCEBEB', '🌸'),
  ('pre-venda-casa',  'Pré-venda casa',  'Tudo em 48h',                     399.00, 520.00, 23, '#D8F3DC', '🏡')
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 11. Promoções (3)
-- ────────────────────────────────────────────────────────────
INSERT INTO v5_manutencao.promocoes (slug, nome, sub, emoji, cor_hex, desconto_pct, categoria_slug, valido_ate)
VALUES
  ('reset-primavera-50', 'Reset de Primavera',  'Até 50% OFF em limpezas profundas',    '🌸', '#FCEBEB', 50, 'limpeza',     '2026-05-31'::timestamptz),
  ('pack-inverno-19',    'Pack Inverno',         'Caldeira+caleiras+cobertura -19%',     '❄️', '#E6F1FB', 19, 'manutencao',  '2026-06-30'::timestamptz),
  ('canalizacao-30',     'Canalização -30%',     'Desentupimentos urgentes',             '💧', '#E0E8FA', 30, 'canalizacao', '2026-05-15'::timestamptz)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 12. Avaliações (5 — sem ordem_id pois Maria não tem ordens concluídas)
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.avaliacoes WHERE cliente_id = v_maria_id AND prestador_id = v_prest_1 AND servico_nome = 'Revisão caldeira'
) THEN
  INSERT INTO v5_manutencao.avaliacoes (cliente_id, prestador_id, servico_nome, rating, texto, criado_em)
  VALUES (v_maria_id, v_prest_1, 'Revisão caldeira', 5, 'Profissional impecável, chegou a horas e explicou tudo.', '2026-04-18'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.avaliacoes WHERE cliente_id = v_maria_id AND prestador_id = v_prest_2 AND servico_nome = 'Limpeza profunda'
) THEN
  INSERT INTO v5_manutencao.avaliacoes (cliente_id, prestador_id, servico_nome, rating, texto, criado_em)
  VALUES (v_maria_id, v_prest_2, 'Limpeza profunda', 4, 'Muito bom trabalho, ficou tudo impecável.', '2026-03-20'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.avaliacoes WHERE cliente_id = v_maria_id AND prestador_id = v_prest_3 AND servico_nome = 'Desentupimento'
) THEN
  INSERT INTO v5_manutencao.avaliacoes (cliente_id, prestador_id, servico_nome, rating, texto, criado_em)
  VALUES (v_maria_id, v_prest_3, 'Desentupimento', 5, 'Resolveu em 30 minutos, muito eficiente.', '2026-02-10'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.avaliacoes WHERE cliente_id = v_maria_id AND prestador_id = v_prest_1 AND servico_nome = 'Instalação torneira'
) THEN
  INSERT INTO v5_manutencao.avaliacoes (cliente_id, prestador_id, servico_nome, rating, texto, criado_em)
  VALUES (v_maria_id, v_prest_1, 'Instalação torneira', 4, 'Rápido e sem sujidade nenhuma.', '2026-01-25'::timestamptz);
END IF;

IF NOT EXISTS (
  SELECT 1 FROM v5_manutencao.avaliacoes WHERE cliente_id = v_maria_id AND prestador_id = v_prest_2 AND servico_nome = 'Manutenção ar condicionado'
) THEN
  INSERT INTO v5_manutencao.avaliacoes (cliente_id, prestador_id, servico_nome, rating, texto, criado_em)
  VALUES (v_maria_id, v_prest_2, 'Manutenção ar condicionado', 5, 'Fantástico, o AC está como novo.', '2025-12-05'::timestamptz);
END IF;

-- ────────────────────────────────────────────────────────────
-- 13. Prestadores favoritos (3)
-- ────────────────────────────────────────────────────────────
INSERT INTO v5_manutencao.prestadores_favoritos (pessoa_id, prestador_id, total_visitas, rating_medio, is_principal)
VALUES
  (v_maria_id, v_prest_1, 12, 4.9, false),
  (v_maria_id, v_prest_2,  8, 5.0, false),
  (v_maria_id, v_prest_3, 15, 4.9, true)
ON CONFLICT (pessoa_id, prestador_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 14. Mensagens chat
-- TODO(mario): Maria não tem ordens em_curso na BD de dev.
-- Activar quando existir uma ordem em_curso com prestador atribuído:
--   INSERT INTO v5_manutencao.mensagens_chat (ordem_id, autor_tipo, texto, criado_em)
--   VALUES (<ordem_em_curso_id>, 'prestador', 'Olá Maria! Já saí. Chego em ~20 min ✌️', now() - interval '15 min');
-- ────────────────────────────────────────────────────────────

RAISE NOTICE 'Seed 3.3.8B concluído para Maria ID=%', v_maria_id;
END $$;
