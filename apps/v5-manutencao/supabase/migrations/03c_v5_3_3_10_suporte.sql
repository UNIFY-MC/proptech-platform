-- Migration 03c_v5_3_3_10_suporte.sql
-- Cria tabelas de suporte cliente↔plataforma (FIX 6, 3.3.10)
-- Aditiva e idempotente.

SET search_path = v5_manutencao, public;

-- Tickets de suporte (1 por conversa, normalmente 1 aberto por pessoa)
CREATE TABLE IF NOT EXISTS v5_manutencao.tickets_suporte (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id  uuid        NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  estado     text        NOT NULL DEFAULT 'aberto'
                         CHECK (estado IN ('aberto','em_resposta','resolvido','fechado')),
  assunto    text,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  fechado_em timestamptz
);

CREATE INDEX IF NOT EXISTS tickets_suporte_pessoa_estado
  ON v5_manutencao.tickets_suporte (pessoa_id, estado);

-- Mensagens de cada ticket
CREATE TABLE IF NOT EXISTS v5_manutencao.mensagens_suporte (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid        NOT NULL REFERENCES v5_manutencao.tickets_suporte(id) ON DELETE CASCADE,
  autor_tipo text        NOT NULL CHECK (autor_tipo IN ('cliente','suporte','sistema')),
  texto      text        NOT NULL,
  lido       boolean     NOT NULL DEFAULT false,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mensagens_suporte_ticket
  ON v5_manutencao.mensagens_suporte (ticket_id, criado_em);

-- RLS (permissivo para demo — TODO(mario): restringir com auth real na Fase 4)
ALTER TABLE v5_manutencao.tickets_suporte   ENABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.mensagens_suporte ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='v5_manutencao' AND tablename='tickets_suporte' AND policyname='tickets_suporte_public_rw'
  ) THEN
    CREATE POLICY tickets_suporte_public_rw ON v5_manutencao.tickets_suporte
      FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='v5_manutencao' AND tablename='mensagens_suporte' AND policyname='mensagens_suporte_public_rw'
  ) THEN
    CREATE POLICY mensagens_suporte_public_rw ON v5_manutencao.mensagens_suporte
      FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;
