-- Sprint 1B.3 Fase 1A — casa_advisor schema
-- Tabelas de conversas do agente conselheiro por pessoa × localização
--
-- Regras aplicadas:
--   Regra W — GRANT antes de CREATE POLICY
--   Regra X — service_role com GRANT ALL
--   Regra Z — NOTIFY pgrst no final

BEGIN;

-- ── Sessões de conversa ──────────────────────────────────────────────────────
-- Uma sessão = um contexto de conversa (user × localização × tema)
-- Utilizador pode ter N sessões por localização (histórico)

CREATE TABLE IF NOT EXISTS v5_manutencao.advisor_sessoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id             uuid NOT NULL,
  organization_id       uuid NOT NULL,
  localizacao_id        uuid REFERENCES v5_manutencao.localizacoes(id) ON DELETE SET NULL,
  -- Metadados da sessão
  titulo                text,             -- auto-gerado da primeira mensagem (ou null)
  iniciada_em           timestamptz DEFAULT now(),
  ultima_mensagem_em    timestamptz DEFAULT now(),
  total_mensagens       integer DEFAULT 0,
  -- Cost tracking agregado
  total_tokens_input    integer DEFAULT 0,
  total_tokens_output   integer DEFAULT 0,
  custo_total_usd       numeric(10,6) DEFAULT 0,
  -- Estado
  ativa                 boolean DEFAULT true,  -- false = arquivada pelo utilizador
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_advisor_sessoes_pessoa
  ON v5_manutencao.advisor_sessoes(pessoa_id);
CREATE INDEX IF NOT EXISTS ix_advisor_sessoes_localizacao
  ON v5_manutencao.advisor_sessoes(localizacao_id);
CREATE INDEX IF NOT EXISTS ix_advisor_sessoes_ultima
  ON v5_manutencao.advisor_sessoes(ultima_mensagem_em DESC);

-- ── Mensagens da conversa ────────────────────────────────────────────────────
-- Histórico multi-turn persistido para contexto futuro

CREATE TABLE IF NOT EXISTS v5_manutencao.advisor_mensagens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id     uuid NOT NULL
                  REFERENCES v5_manutencao.advisor_sessoes(id) ON DELETE CASCADE,
  -- Mensagem
  role          text NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content       text,         -- texto do user OU resposta final markdown do assistant
  tool_calls    jsonb,        -- array de chamadas a tools (quando role='assistant')
  tool_results  jsonb,        -- resultados das tools (quando role='tool')
  -- Cost tracking por mensagem
  tokens_input  integer,
  tokens_output integer,
  custo_usd     numeric(10,6),
  -- Audit
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_advisor_mensagens_sessao
  ON v5_manutencao.advisor_mensagens(sessao_id, created_at);

-- ── GRANTs (Regra W — antes das policies) ───────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON v5_manutencao.advisor_sessoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON v5_manutencao.advisor_mensagens TO authenticated;

GRANT ALL ON v5_manutencao.advisor_sessoes TO service_role;
GRANT ALL ON v5_manutencao.advisor_mensagens TO service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.advisor_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.advisor_mensagens ENABLE ROW LEVEL SECURITY;

-- Sessões: acesso total pela própria organização
CREATE POLICY advisor_sessoes_org
  ON v5_manutencao.advisor_sessoes
  FOR ALL TO authenticated
  USING (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK (organization_id = ANY(public.current_organization_ids()));

-- Mensagens: acesso via sessão (JOIN implícito — sem FK directa a org)
CREATE POLICY advisor_mensagens_via_sessao
  ON v5_manutencao.advisor_mensagens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM v5_manutencao.advisor_sessoes s
      WHERE s.id = advisor_mensagens.sessao_id
        AND s.organization_id = ANY(public.current_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM v5_manutencao.advisor_sessoes s
      WHERE s.id = advisor_mensagens.sessao_id
        AND s.organization_id = ANY(public.current_organization_ids())
    )
  );

-- ── Notificar PostgREST para recarregar schema ───────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;
