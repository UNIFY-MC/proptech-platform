-- =============================================================================
-- Schema: v5_manutencao
-- Descrição: Gestão de manutenção de imóveis — prestadores, serviços,
--            ordens de trabalho, carteira e levantamentos SEPA.
-- Criado em: 2026-04-20
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS v5_manutencao;

GRANT USAGE ON SCHEMA v5_manutencao TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Helper: função para atualizar updated_at automaticamente
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v5_manutencao.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Tabelas
-- ---------------------------------------------------------------------------

-- 3.1 Prestadores (rede de confiança)
CREATE TABLE v5_manutencao.prestadores (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id        UUID,
  nome             TEXT        NOT NULL,
  nif              TEXT,
  iban             TEXT,
  localidade       TEXT,
  estado           TEXT        DEFAULT 'candidato',       -- candidato | activo | suspenso
  recomendado_por  UUID        REFERENCES v5_manutencao.prestadores(id),
  verificado_at    TIMESTAMPTZ,
  nivel            TEXT        DEFAULT 'base',            -- base | silver | gold | elite
  taxa_plataforma  NUMERIC(4,2) DEFAULT 22.00,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 3.2 Serviços contratados
CREATE TABLE v5_manutencao.servicos_mant (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id     UUID         NOT NULL,
  imovel_id     UUID,
  tipo          TEXT         NOT NULL,                   -- limpeza_mensal | plano_anual | jardim | piscina | canalização | urgencia
  periodicidade TEXT         DEFAULT 'mensal',
  valor         NUMERIC(10,2) NOT NULL,
  prestador_id  UUID         REFERENCES v5_manutencao.prestadores(id),
  estado        TEXT         DEFAULT 'activo',           -- activo | pausado | cancelado
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

-- 3.3 Ordens de trabalho
CREATE TABLE v5_manutencao.ordens_trabalho (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id    UUID         REFERENCES v5_manutencao.servicos_mant(id),
  data_agendada TIMESTAMPTZ  NOT NULL,
  data_execucao TIMESTAMPTZ,
  estado        TEXT         DEFAULT 'agendada',         -- agendada | em_curso | concluida | cancelada
  notas         TEXT,
  fotos_urls    TEXT[],
  assinada      BOOLEAN      DEFAULT false,
  avaliacao     INTEGER      CHECK (avaliacao BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

-- 3.4 Carteira do prestador
CREATE TABLE v5_manutencao.carteira_prestador (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id     UUID         REFERENCES v5_manutencao.prestadores(id) UNIQUE NOT NULL,
  saldo_disponivel NUMERIC(10,2) DEFAULT 0 CHECK (saldo_disponivel >= 0),
  saldo_pendente   NUMERIC(10,2) DEFAULT 0 CHECK (saldo_pendente >= 0),
  total_ganho      NUMERIC(10,2) DEFAULT 0,
  total_levantado  NUMERIC(10,2) DEFAULT 0,
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

-- 3.5 Movimentos da carteira
CREATE TABLE v5_manutencao.movimentos_carteira (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id UUID         REFERENCES v5_manutencao.prestadores(id) NOT NULL,
  tipo         TEXT         NOT NULL,                    -- credito_servico | levantamento | ajuste | beneficio
  valor        NUMERIC(10,2) NOT NULL,
  descricao    TEXT,
  ordem_id     UUID         REFERENCES v5_manutencao.ordens_trabalho(id),
  estado       TEXT         DEFAULT 'pendente',          -- pendente | disponivel | processado
  created_at   TIMESTAMPTZ  DEFAULT now()
);

-- 3.6 Levantamentos Swan SEPA CT
CREATE TABLE v5_manutencao.levantamentos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id    UUID         REFERENCES v5_manutencao.prestadores(id) NOT NULL,
  valor           NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  iban_destino    TEXT         NOT NULL,
  estado          TEXT         DEFAULT 'solicitado',     -- solicitado | processando | concluido | falhado
  swan_payment_id TEXT,
  created_at      TIMESTAMPTZ  DEFAULT now(),
  processado_at   TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- 4. Triggers updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_prestadores_updated_at
  BEFORE UPDATE ON v5_manutencao.prestadores
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.set_updated_at();

CREATE TRIGGER trg_servicos_mant_updated_at
  BEFORE UPDATE ON v5_manutencao.servicos_mant
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.set_updated_at();

CREATE TRIGGER trg_ordens_trabalho_updated_at
  BEFORE UPDATE ON v5_manutencao.ordens_trabalho
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.set_updated_at();

CREATE TRIGGER trg_carteira_prestador_updated_at
  BEFORE UPDATE ON v5_manutencao.carteira_prestador
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.set_updated_at();

-- (movimentos_carteira e levantamentos não têm updated_at — sem trigger)

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE v5_manutencao.prestadores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.servicos_mant        ENABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.ordens_trabalho      ENABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.carteira_prestador   ENABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.movimentos_carteira  ENABLE ROW LEVEL SECURITY;
ALTER TABLE v5_manutencao.levantamentos        ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5.1 Policies — prestadores
-- ---------------------------------------------------------------------------

-- service_role: acesso total
CREATE POLICY "prestadores_service_role_all"
  ON v5_manutencao.prestadores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: SELECT/INSERT/UPDATE nos próprios dados
CREATE POLICY "prestadores_authenticated_select"
  ON v5_manutencao.prestadores
  FOR SELECT
  TO authenticated
  USING (pessoa_id = auth.uid());

CREATE POLICY "prestadores_authenticated_insert"
  ON v5_manutencao.prestadores
  FOR INSERT
  TO authenticated
  WITH CHECK (pessoa_id = auth.uid());

CREATE POLICY "prestadores_authenticated_update"
  ON v5_manutencao.prestadores
  FOR UPDATE
  TO authenticated
  USING (pessoa_id = auth.uid())
  WITH CHECK (pessoa_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5.2 Policies — servicos_mant
-- ---------------------------------------------------------------------------

-- service_role: acesso total
CREATE POLICY "servicos_mant_service_role_all"
  ON v5_manutencao.servicos_mant
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: SELECT/INSERT/UPDATE nos próprios dados
CREATE POLICY "servicos_mant_authenticated_select"
  ON v5_manutencao.servicos_mant
  FOR SELECT
  TO authenticated
  USING (pessoa_id = auth.uid());

CREATE POLICY "servicos_mant_authenticated_insert"
  ON v5_manutencao.servicos_mant
  FOR INSERT
  TO authenticated
  WITH CHECK (pessoa_id = auth.uid());

CREATE POLICY "servicos_mant_authenticated_update"
  ON v5_manutencao.servicos_mant
  FOR UPDATE
  TO authenticated
  USING (pessoa_id = auth.uid())
  WITH CHECK (pessoa_id = auth.uid());

-- anon: só INSERT (leads sem login)
CREATE POLICY "servicos_mant_anon_insert"
  ON v5_manutencao.servicos_mant
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5.3 Policies — ordens_trabalho
-- ---------------------------------------------------------------------------

-- service_role: acesso total
CREATE POLICY "ordens_trabalho_service_role_all"
  ON v5_manutencao.ordens_trabalho
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: SELECT/INSERT/UPDATE via serviço associado ao utilizador
CREATE POLICY "ordens_trabalho_authenticated_select"
  ON v5_manutencao.ordens_trabalho
  FOR SELECT
  TO authenticated
  USING (
    servico_id IN (
      SELECT id FROM v5_manutencao.servicos_mant
      WHERE pessoa_id = auth.uid()
    )
  );

CREATE POLICY "ordens_trabalho_authenticated_insert"
  ON v5_manutencao.ordens_trabalho
  FOR INSERT
  TO authenticated
  WITH CHECK (
    servico_id IN (
      SELECT id FROM v5_manutencao.servicos_mant
      WHERE pessoa_id = auth.uid()
    )
  );

CREATE POLICY "ordens_trabalho_authenticated_update"
  ON v5_manutencao.ordens_trabalho
  FOR UPDATE
  TO authenticated
  USING (
    servico_id IN (
      SELECT id FROM v5_manutencao.servicos_mant
      WHERE pessoa_id = auth.uid()
    )
  )
  WITH CHECK (
    servico_id IN (
      SELECT id FROM v5_manutencao.servicos_mant
      WHERE pessoa_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5.4 Policies — carteira_prestador
-- ---------------------------------------------------------------------------

-- service_role: acesso total
CREATE POLICY "carteira_prestador_service_role_all"
  ON v5_manutencao.carteira_prestador
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: SELECT/INSERT/UPDATE nos próprios dados
CREATE POLICY "carteira_prestador_authenticated_select"
  ON v5_manutencao.carteira_prestador
  FOR SELECT
  TO authenticated
  USING (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

CREATE POLICY "carteira_prestador_authenticated_insert"
  ON v5_manutencao.carteira_prestador
  FOR INSERT
  TO authenticated
  WITH CHECK (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

CREATE POLICY "carteira_prestador_authenticated_update"
  ON v5_manutencao.carteira_prestador
  FOR UPDATE
  TO authenticated
  USING (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  )
  WITH CHECK (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5.5 Policies — movimentos_carteira
-- ---------------------------------------------------------------------------

-- service_role: acesso total
CREATE POLICY "movimentos_carteira_service_role_all"
  ON v5_manutencao.movimentos_carteira
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: SELECT/INSERT/UPDATE nos próprios dados
CREATE POLICY "movimentos_carteira_authenticated_select"
  ON v5_manutencao.movimentos_carteira
  FOR SELECT
  TO authenticated
  USING (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

CREATE POLICY "movimentos_carteira_authenticated_insert"
  ON v5_manutencao.movimentos_carteira
  FOR INSERT
  TO authenticated
  WITH CHECK (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

CREATE POLICY "movimentos_carteira_authenticated_update"
  ON v5_manutencao.movimentos_carteira
  FOR UPDATE
  TO authenticated
  USING (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  )
  WITH CHECK (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5.6 Policies — levantamentos
-- ---------------------------------------------------------------------------

-- service_role: acesso total
CREATE POLICY "levantamentos_service_role_all"
  ON v5_manutencao.levantamentos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: SELECT/INSERT/UPDATE nos próprios dados
CREATE POLICY "levantamentos_authenticated_select"
  ON v5_manutencao.levantamentos
  FOR SELECT
  TO authenticated
  USING (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

CREATE POLICY "levantamentos_authenticated_insert"
  ON v5_manutencao.levantamentos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

CREATE POLICY "levantamentos_authenticated_update"
  ON v5_manutencao.levantamentos
  FOR UPDATE
  TO authenticated
  USING (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  )
  WITH CHECK (
    prestador_id IN (
      SELECT id FROM v5_manutencao.prestadores
      WHERE pessoa_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Grants de tabelas para os roles
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA v5_manutencao TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA v5_manutencao TO authenticated;
GRANT INSERT ON v5_manutencao.servicos_mant TO anon;

-- ---------------------------------------------------------------------------
-- 7. Seed de exemplo (só comentário — não inserir dados em produção)
-- ---------------------------------------------------------------------------

-- Exemplos de serviços que podem ser criados via aplicação:
--
-- Serviço 1 — Limpeza mensal
-- INSERT INTO v5_manutencao.servicos_mant (pessoa_id, imovel_id, tipo, periodicidade, valor, estado)
-- VALUES ('<uuid-cliente>', '<uuid-imovel>', 'limpeza_mensal', 'mensal', 80.00, 'activo');
--
-- Serviço 2 — Plano anual de manutenção
-- INSERT INTO v5_manutencao.servicos_mant (pessoa_id, imovel_id, tipo, periodicidade, valor, estado)
-- VALUES ('<uuid-cliente>', '<uuid-imovel>', 'plano_anual', 'anual', 950.00, 'activo');
--
-- Serviço 3 — Urgência de canalização
-- INSERT INTO v5_manutencao.servicos_mant (pessoa_id, imovel_id, tipo, periodicidade, valor, estado)
-- VALUES ('<uuid-cliente>', '<uuid-imovel>', 'urgencia', 'pontual', 250.00, 'activo');

-- =============================================================================
-- Fim da migration v5_manutencao
-- =============================================================================
