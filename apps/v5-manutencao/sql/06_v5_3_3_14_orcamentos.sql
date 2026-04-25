-- ═══════════════════════════════════════════════════════════════════════════
-- v5 Manutenção · 3.3.14 — Orçamentos à Medida + Contexto Serviço
-- Aplica sobre tabelas existentes: pedidos_orcamento + orcamentos_recebidos
-- Cria: contexto_servico
-- Altera: ordens_trabalho (adiciona contexto_servico_snapshot)
-- Seed: 1 pedido + 2 propostas para Maria (DEMO_PESSOA_ID)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Estender pedidos_orcamento com colunas em falta ─────────────────────

ALTER TABLE v5_manutencao.pedidos_orcamento
  ADD COLUMN IF NOT EXISTS titulo                text,
  ADD COLUMN IF NOT EXISTS urgente               boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contexto_extras       jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proposta_aceite_id    uuid,
  ADD COLUMN IF NOT EXISTS propostas_recebidas   int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perfil_fiscal_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS cancelado_em          timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_motivo      text,
  ADD COLUMN IF NOT EXISTS concluido_em          timestamptz;

-- Nota: n_orcamentos_esperados = propostas_alvo; data_limite = prazo_resposta
-- Mantemos os nomes existentes — o código adapta-se

-- ─── 2. Estender orcamentos_recebidos com colunas em falta ──────────────────

ALTER TABLE v5_manutencao.orcamentos_recebidos
  ADD COLUMN IF NOT EXISTS tempo_dias       int,
  ADD COLUMN IF NOT EXISTS garantia_meses  int,
  ADD COLUMN IF NOT EXISTS descricao_curta text,
  ADD COLUMN IF NOT EXISTS inclui          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exclui          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vista_em        timestamptz,
  ADD COLUMN IF NOT EXISTS aceite_em       timestamptz,
  ADD COLUMN IF NOT EXISTS recusada_motivo text;

-- ─── 3. Contexto de serviço por localização (smart prompts persistidos) ─────

CREATE TABLE IF NOT EXISTS v5_manutencao.contexto_servico (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  localizacao_id       uuid NOT NULL REFERENCES v5_manutencao.localizacoes(id) ON DELETE CASCADE,
  categoria_slug       text NOT NULL,
  perguntas_respostas  jsonb DEFAULT '{}'::jsonb,
  ultima_atualizacao   timestamptz DEFAULT now(),
  UNIQUE(localizacao_id, categoria_slug)
);

CREATE INDEX IF NOT EXISTS idx_contexto_loc
  ON v5_manutencao.contexto_servico(localizacao_id);

-- ─── 4. Snapshot contexto nas ordens_trabalho ───────────────────────────────

ALTER TABLE v5_manutencao.ordens_trabalho
  ADD COLUMN IF NOT EXISTS contexto_servico_snapshot jsonb;

-- ─── 5. Índices em pedidos_orcamento ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ped_orc_pessoa
  ON v5_manutencao.pedidos_orcamento(pessoa_id);

CREATE INDEX IF NOT EXISTS idx_ped_orc_estado
  ON v5_manutencao.pedidos_orcamento(estado);

CREATE INDEX IF NOT EXISTS idx_ped_orc_loc
  ON v5_manutencao.pedidos_orcamento(localizacao_id);

-- ─── 6. Seed: 1 pedido + 2 propostas para Maria ─────────────────────────────
-- DEMO_PESSOA_ID = 9ef5000a-827b-4486-9c5d-352545e4de91
-- Localizacao principal (Apartamento Lisboa) = 0ac3b9f7-5dc0-4902-bfa3-31445075be8a

INSERT INTO v5_manutencao.pedidos_orcamento (
  id,
  pessoa_id,
  organization_id,
  localizacao_id,
  areas,
  titulo,
  descricao,
  formatos,
  urgente,
  estado,
  n_orcamentos_esperados,
  propostas_recebidas,
  created_at,
  data_limite
)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '9ef5000a-827b-4486-9c5d-352545e4de91'::uuid,
  'bf984bae-f6b6-42ec-a905-8d499ed12191'::uuid,
  '0ac3b9f7-5dc0-4902-bfa3-31445075be8a'::uuid,
  ARRAY['reabilitacao'],
  'Reabilitação cozinha',
  'Substituir bancada, mudar placa para indução, novos armários superiores. Cozinha actual com 12 anos.',
  ARRAY['instant', 'scheduled'],
  false,
  'em_cotacao',
  3,
  2,
  now() - interval '3 hours',
  now() + interval '21 hours'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO v5_manutencao.orcamentos_recebidos (
  pedido_id,
  prestador_id,
  formato,
  valor,
  descricao_curta,
  descricao,
  tempo_dias,
  garantia_meses,
  inclui,
  estado,
  enviado_em
) VALUES
(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'da174e7d-89a1-41ac-a66b-f5f63b1a5cb7'::uuid,  -- António Ferreira
  'instant',
  3850,
  'Cozinha completa em 8 dias úteis · bancada granito · iluminação LED',
  'Inclui desmontagem da cozinha actual, bancada granito polido, instalação placa indução, armários superiores em melamina branca, iluminação LED sob armários, ligações eléctricas e canalizações.',
  8,
  12,
  '["Bancada granito","Placa indução","Iluminação LED","Acabamentos"]'::jsonb,
  'enviado',
  now() - interval '2 hours'
),
(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'b70d6528-2ef0-4a43-855b-9fd6d9b45a14'::uuid,  -- Sandra Matos
  'instant',
  4200,
  'Premium · garantia 24 meses · bancada quartzo · acessórios top',
  'Solução premium com bancada em quartzo Silestone, placa indução de gama alta, armários com puxadores em aço inox, sistema de extracção integrado, iluminação LED programável.',
  6,
  24,
  '["Bancada quartzo","Placa premium","Sistema extracção","Acessórios inox","Garantia 24m"]'::jsonb,
  'enviado',
  now() - interval '1 hour'
)
ON CONFLICT DO NOTHING;
