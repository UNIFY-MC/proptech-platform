-- ============================================================
-- v5-manutencao · Fase 3.3.8A — Schema extensions + novas tabelas
-- Aplicar em: Supabase DEV (hkmvszkpxjbxmnixzqbl)
-- NUNCA aplicar em produção (eozklslwfaqujaijvdnl)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- EXTENSIONS: core.pessoas
-- (data_nascimento e nif já existem — IF NOT EXISTS cobre)
-- ────────────────────────────────────────────────────────────
ALTER TABLE core.pessoas
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS idioma text DEFAULT 'pt-PT',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS membro_desde timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS localizacao_ativa_id uuid;

-- ────────────────────────────────────────────────────────────
-- EXTENSIONS: v5_manutencao.localizacoes
-- (nome, tipo, codigo_postal já existem — IF NOT EXISTS cobre)
-- ────────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.localizacoes
  ADD COLUMN IF NOT EXISTS rua text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS andar text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS distrito text,
  ADD COLUMN IF NOT EXISTS pais text DEFAULT 'PT',
  ADD COLUMN IF NOT EXISTS principal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coords point;

-- ────────────────────────────────────────────────────────────
-- EXTENSIONS: v5_manutencao.catalogo_servicos
-- ────────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.catalogo_servicos
  ADD COLUMN IF NOT EXISTS descricao_longa text,
  ADD COLUMN IF NOT EXISTS incluido jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS garantia_meses int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imagem_url text;

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 1: core.sessoes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core.sessoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id     uuid NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  device        text,
  user_agent    text,
  ip            inet,
  cidade        text,
  iniciada_em   timestamptz DEFAULT now(),
  ultimo_uso_em timestamptz DEFAULT now(),
  terminada_em  timestamptz,
  ativa         boolean DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_sessoes_pessoa ON core.sessoes(pessoa_id);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 2: v5_manutencao.perfis_fiscais
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.perfis_fiscais (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id           uuid NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id     uuid REFERENCES core.organizations(id),
  nif                 text,
  nome_facturacao     text,
  morada_facturacao   text,
  iban                text,
  principal           boolean DEFAULT true,
  criado_em           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fiscais_pessoa ON v5_manutencao.perfis_fiscais(pessoa_id);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 3: v5_manutencao.codigos_referencia
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.codigos_referencia (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id           uuid UNIQUE NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id     uuid REFERENCES core.organizations(id),
  codigo              text UNIQUE NOT NULL,
  total_referidos     int DEFAULT 0,
  total_credito_ganho numeric(10,2) DEFAULT 0,
  criado_em           timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 4: v5_manutencao.referidos
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.referidos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid NOT NULL REFERENCES core.pessoas(id),
  referido_id     uuid REFERENCES core.pessoas(id),
  referido_nome   text,
  referido_email  text,
  estado          text DEFAULT 'pendente' CHECK (estado IN ('pendente','registou','primeiro_servico','completou')),
  credito_ganho   numeric(10,2) DEFAULT 0,
  data_convite    timestamptz DEFAULT now(),
  data_completou  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_referidos_referrer ON v5_manutencao.referidos(referrer_id);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 5: v5_manutencao.avaliacoes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.avaliacoes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid REFERENCES core.organizations(id),
  ordem_id            uuid REFERENCES v5_manutencao.ordens_trabalho(id),
  cliente_id          uuid NOT NULL REFERENCES core.pessoas(id),
  prestador_id        uuid REFERENCES v5_manutencao.prestadores(id),
  servico_nome        text,
  rating              int CHECK (rating BETWEEN 1 AND 5),
  texto               text,
  resposta_prestador  text,
  criado_em           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_cliente   ON v5_manutencao.avaliacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_prestador ON v5_manutencao.avaliacoes(prestador_id);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 6: v5_manutencao.metodos_pagamento
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.metodos_pagamento (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id                   uuid NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id             uuid REFERENCES core.organizations(id),
  tipo                        text CHECK (tipo IN ('cartao','mbway','sepa')),
  marca                       text,
  last4                       text,
  validade                    text,
  telefone                    text,
  iban_last4                  text,
  principal                   boolean DEFAULT false,
  stripe_payment_method_id    text,
  criado_em                   timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 7: v5_manutencao.prestadores_favoritos
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.prestadores_favoritos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       uuid NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  prestador_id    uuid NOT NULL REFERENCES v5_manutencao.prestadores(id),
  total_visitas   int DEFAULT 0,
  total_gasto     numeric(10,2) DEFAULT 0,
  rating_medio    numeric(3,2),
  is_principal    boolean DEFAULT false,
  criado_em       timestamptz DEFAULT now(),
  UNIQUE(pessoa_id, prestador_id)
);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 8: v5_manutencao.combos
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.combos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  nome            text NOT NULL,
  sub             text,
  servicos_ids    jsonb DEFAULT '[]'::jsonb,
  preco_combo     numeric(10,2),
  preco_normal    numeric(10,2),
  desconto_pct    int,
  cor_hex         text,
  emoji           text,
  ativo           boolean DEFAULT true,
  criado_em       timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 9: v5_manutencao.promocoes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.promocoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text UNIQUE NOT NULL,
  nome                  text NOT NULL,
  sub                   text,
  emoji                 text,
  cor_hex               text,
  desconto_pct          int,
  categoria_slug        text,
  servicos_aplicaveis   jsonb DEFAULT '[]'::jsonb,
  valido_de             timestamptz DEFAULT now(),
  valido_ate            timestamptz,
  ativo                 boolean DEFAULT true
);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 10: v5_manutencao.mensagens_chat
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.mensagens_chat (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id    uuid NOT NULL REFERENCES v5_manutencao.ordens_trabalho(id) ON DELETE CASCADE,
  autor_tipo  text CHECK (autor_tipo IN ('cliente','prestador','sistema')),
  autor_id    uuid,
  texto       text,
  anexo_url   text,
  lido        boolean DEFAULT false,
  criado_em   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mensagens_ordem ON v5_manutencao.mensagens_chat(ordem_id);

-- ────────────────────────────────────────────────────────────
-- NOVA TABELA 11: v5_manutencao.respostas_assessment
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.respostas_assessment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       uuid NOT NULL REFERENCES core.pessoas(id),
  localizacao_id  uuid REFERENCES v5_manutencao.localizacoes(id),
  pergunta_slug   text NOT NULL,
  resposta_text   text,
  resposta_jsonb  jsonb,
  respondido_em   timestamptz DEFAULT now(),
  UNIQUE(pessoa_id, localizacao_id, pergunta_slug)
);

-- ────────────────────────────────────────────────────────────
-- FK constraint: pessoas → localizacoes (ciclo cruzado)
-- Usa bloco DO para ser idempotente (IF NOT EXISTS não é válido para constraints)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER TABLE core.pessoas
    ADD CONSTRAINT fk_pessoa_localizacao_ativa
    FOREIGN KEY (localizacao_ativa_id) REFERENCES v5_manutencao.localizacoes(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
