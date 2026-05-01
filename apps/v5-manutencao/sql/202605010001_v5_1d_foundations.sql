-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 1D · Day 1 — Receipt Trojan Horse foundations
-- Projecto Supabase ALVO: V1 Core Hub  (hkmvszkpxjbxmnixzqbl)
-- NUNCA aplicar contra V2 Condo Hub (eozklslwfaqujaijvdnl) — produção viva.
--
-- Cria 3 tabelas em schema v5_manutencao:
--   1) magic_links            (token partilhável owner→prestador, TTL 48h, 1-shot)
--   2) prestadores_parceiros  (cadastro mínimo do prestador onboarded)
--   3) recibos_servico        (registo final do recibo arquivado em Casa)
--
-- Decisão R1 (.claude/sprints/1D-receipt-trojan-horse/decisions/r1-schema-resolved.md):
--   Opção B — recibos_servico fica em v5_manutencao (NÃO em core), evita colisão
--   futura com core.servicos_ativos do V2 Condo Hub e respeita schema vertical.
--
-- Regras aplicadas:
--   - Regra W (RLS sem GRANT = null silencioso) → GRANT antes de POLICY... mas
--     CLAUDE.md raiz Sprint 1D obriga a Regra FF (GRANT depois de POLICY).
--     Cumpro Regra FF (system prompt + 06-final-plan): GRANT depois de POLICY,
--     em bloco contíguo, com NOTIFY pgrst no final.
--   - Regra X (SECURITY DEFINER sem GRANT EXECUTE = 42501) — não há funções aqui.
--   - Regra FF (CREATE POLICY service_role precisa GRANT a service_role).
--   - Decisão 4 (06-final-plan): prestador-onboarding faz INSERT em 3 tabelas
--     em transacção atómica → service_role precisa INSERT/UPDATE em todas.
--   - Decisão 5 (06-final-plan): TTL = 48h (não 7d, não 24h).
--   - Auditor gap T5: prestador_id em magic_links é UUID nullable SEM FK
--     para auth.users — prestadores não criam conta Auth nesta iteração.
--
-- Idempotente: usa IF NOT EXISTS / DROP POLICY IF EXISTS para reaplicar
-- sem perder dados. Migrations são SEMPRE aditivas (Guard-rail #4 V5).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 1 — v5_manutencao.magic_links
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS v5_manutencao.magic_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner que gerou o link (autenticado via Supabase Auth)
  owner_pessoa_id UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  localizacao_id  UUID REFERENCES v5_manutencao.localizacoes(id) ON DELETE SET NULL,

  -- Token único 64 hex chars (32 bytes random) — gerado em edge function
  token           TEXT NOT NULL UNIQUE
                    CHECK (token ~ '^[0-9a-f]{64}$'),

  -- Conteúdo declarado pelo owner ANTES de partilhar (informacional, valida com prestador)
  tipo_servico    TEXT NOT NULL,
  valor_eur       NUMERIC(10,2) NOT NULL CHECK (valor_eur > 0),
  data_servico    DATE NOT NULL,
  notas           TEXT,

  -- Ciclo de vida
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  -- Auditor gap T5: prestador_id é UUID sem FK para auth.users
  -- (prestadores não têm conta Auth nesta iteração; preenchido pela edge function
  --  prestador-onboarding com prestadores_parceiros.id após onboarding)
  prestador_id    UUID,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Auditor gap T4: TTL e usage consistency em SQL, não apenas em código
  CONSTRAINT magic_links_expires_after_create
    CHECK (expires_at > created_at),
  CONSTRAINT magic_links_used_after_create
    CHECK (used_at IS NULL OR used_at >= created_at)
);

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_magic_links_token
  ON v5_manutencao.magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_owner_created
  ON v5_manutencao.magic_links(owner_pessoa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_links_active
  ON v5_manutencao.magic_links(expires_at)
  WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_magic_links_org
  ON v5_manutencao.magic_links(organization_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 2 — v5_manutencao.prestadores_parceiros
-- ═══════════════════════════════════════════════════════════════════════════
-- Cadastro mínimo do prestador que foi onboarded via magic link.
-- DIFERENTE de v5_manutencao.prestadores (já existe — equipa prestadora interna
-- da V5 com membership/onboarding completo). "_parceiros" sinaliza vínculo leve:
-- prestador convidado pelo owner, sem conta Auth, dados captados pelo owner
-- de forma indirecta (trojan horse).

CREATE TABLE IF NOT EXISTS v5_manutencao.prestadores_parceiros (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Magic link de onboarding (qual link foi usado para criar este prestador)
  magic_link_id       UUID NOT NULL UNIQUE
                        REFERENCES v5_manutencao.magic_links(id) ON DELETE RESTRICT,

  -- Dados captados pelo prestador no formulário de 3 steps (CPO spec Flow 2)
  nome_completo       TEXT NOT NULL CHECK (length(trim(nome_completo)) >= 3),
  nif                 TEXT NOT NULL CHECK (nif ~ '^[0-9]{9}$'),
  telefone            TEXT NOT NULL CHECK (telefone ~ '^(\+351)?[0-9 ]{9,15}$'),
  morada              TEXT,        -- opcional (CPO spec Step 2)
  email               TEXT,        -- opcional (CPO spec Step 2)
  confirmacao_valor   BOOLEAN NOT NULL DEFAULT false,

  -- Status do prestador no funil
  status              TEXT NOT NULL DEFAULT 'onboarded'
                        CHECK (status IN (
                          'onboarded',          -- preencheu form, recibo emitido
                          'onboarding_deferido',-- soft CTA "criar conta" recusado
                          'conta_criada',       -- futuro: criou auth.users
                          'desactivado'         -- soft-delete por owner
                        )),

  -- Auditoria
  ip_origem           INET,        -- preencher pela edge function (gap T2 mitigation)
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Não permitir 2 prestadores com mesmo NIF a colidir em magic links diferentes
  -- mas permitir mesmo NIF em magic links diferentes (mesmo prestador, vários owners)
  -- — uniqueness vem do magic_link_id (1 link → 1 prestador).
  CONSTRAINT prestadores_parceiros_nif_format CHECK (nif ~ '^[0-9]{9}$')
);

CREATE INDEX IF NOT EXISTS idx_prestadores_parceiros_nif
  ON v5_manutencao.prestadores_parceiros(nif);
CREATE INDEX IF NOT EXISTS idx_prestadores_parceiros_magic
  ON v5_manutencao.prestadores_parceiros(magic_link_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_parceiros_status
  ON v5_manutencao.prestadores_parceiros(status)
  WHERE status = 'onboarded';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 3 — v5_manutencao.recibos_servico
-- ═══════════════════════════════════════════════════════════════════════════
-- Registo final do recibo confirmado pelo prestador. Aparece em Casa screen
-- do owner (Realtime subscription). Substitui ambos core.servicos_ativos e
-- v5_manutencao.recibos da spec original (R1 decision).

CREATE TABLE IF NOT EXISTS v5_manutencao.recibos_servico (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner que arquivou o recibo
  owner_pessoa_id     UUID NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  localizacao_id      UUID REFERENCES v5_manutencao.localizacoes(id) ON DELETE SET NULL,

  -- Prestador parceiro (vínculo leve, NÃO auth.users)
  prestador_id        UUID NOT NULL REFERENCES v5_manutencao.prestadores_parceiros(id) ON DELETE RESTRICT,

  -- Magic link de origem — 1:1 (cada link confirmado gera exactamente 1 recibo)
  magic_link_id       UUID NOT NULL UNIQUE
                        REFERENCES v5_manutencao.magic_links(id) ON DELETE RESTRICT,

  -- Snapshot dos dados no momento da confirmação (para histórico legal)
  tipo_servico        TEXT NOT NULL,
  valor_eur           NUMERIC(10,2) NOT NULL CHECK (valor_eur > 0),
  data_servico        DATE NOT NULL,
  notas               TEXT,

  -- Status do recibo
  status              TEXT NOT NULL DEFAULT 'recibo_emitido'
                        CHECK (status IN (
                          'recibo_emitido',     -- confirmado pelo prestador
                          'arquivado',          -- owner arquivou na Casa screen (default visible)
                          'disputado',          -- futuro: owner contesta o recibo
                          'anulado'             -- futuro: GDPR delete / erro
                        )),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recibos_servico_owner_data
  ON v5_manutencao.recibos_servico(owner_pessoa_id, data_servico DESC);
CREATE INDEX IF NOT EXISTS idx_recibos_servico_prestador
  ON v5_manutencao.recibos_servico(prestador_id);
CREATE INDEX IF NOT EXISTS idx_recibos_servico_org
  ON v5_manutencao.recibos_servico(organization_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY  +  POLICIES  +  GRANTS
-- ═══════════════════════════════════════════════════════════════════════════
-- Regra FF: GRANT depois de POLICY. Sem GRANT, mesmo policy correcta dá
-- "permission denied" silencioso. Auditado em information_schema antes de
-- considerar a fase fechada (Regra Z, ponto 8).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── magic_links ───────────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.magic_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magic_links_owner_select" ON v5_manutencao.magic_links;
CREATE POLICY "magic_links_owner_select" ON v5_manutencao.magic_links
  FOR SELECT TO authenticated
  USING (owner_pessoa_id = public.current_pessoa_id());

DROP POLICY IF EXISTS "magic_links_service_all" ON v5_manutencao.magic_links;
CREATE POLICY "magic_links_service_all" ON v5_manutencao.magic_links
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- GRANT (Regra FF — depois de POLICY)
GRANT SELECT                            ON v5_manutencao.magic_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE    ON v5_manutencao.magic_links TO service_role;


-- ── prestadores_parceiros ────────────────────────────────────────────────
ALTER TABLE v5_manutencao.prestadores_parceiros ENABLE ROW LEVEL SECURITY;

-- Owner SÓ vê prestadores que onboarded a partir de UM magic link seu
DROP POLICY IF EXISTS "prestadores_parceiros_owner_select" ON v5_manutencao.prestadores_parceiros;
CREATE POLICY "prestadores_parceiros_owner_select" ON v5_manutencao.prestadores_parceiros
  FOR SELECT TO authenticated
  USING (
    magic_link_id IN (
      SELECT id FROM v5_manutencao.magic_links
      WHERE owner_pessoa_id = public.current_pessoa_id()
    )
  );

DROP POLICY IF EXISTS "prestadores_parceiros_service_all" ON v5_manutencao.prestadores_parceiros;
CREATE POLICY "prestadores_parceiros_service_all" ON v5_manutencao.prestadores_parceiros
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- GRANT (Regra FF)
GRANT SELECT                            ON v5_manutencao.prestadores_parceiros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE    ON v5_manutencao.prestadores_parceiros TO service_role;


-- ── recibos_servico ──────────────────────────────────────────────────────
ALTER TABLE v5_manutencao.recibos_servico ENABLE ROW LEVEL SECURITY;

-- Owner vê só os seus recibos (success criterion 2 binário depende desta query)
DROP POLICY IF EXISTS "recibos_servico_owner_select" ON v5_manutencao.recibos_servico;
CREATE POLICY "recibos_servico_owner_select" ON v5_manutencao.recibos_servico
  FOR SELECT TO authenticated
  USING (owner_pessoa_id = public.current_pessoa_id());

-- INSERT só via service_role (edge function prestador-onboarding em transacção atómica)
-- Auditor: anon NÃO pode inserir directamente — todo INSERT passa por edge function.
DROP POLICY IF EXISTS "recibos_servico_service_all" ON v5_manutencao.recibos_servico;
CREATE POLICY "recibos_servico_service_all" ON v5_manutencao.recibos_servico
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- GRANT (Regra FF)
GRANT SELECT                            ON v5_manutencao.recibos_servico TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE    ON v5_manutencao.recibos_servico TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOG (gap C3 do Auditor — 0 incidentes P0 auditáveis)
-- ═══════════════════════════════════════════════════════════════════════════
-- Reusa core.agent_audit_log já existente (01_core_multitenant.sql linhas 39-62).
-- Edge functions registam aí com agent_name='gerar-magic-link' e
-- 'prestador-onboarding'. Sem tabela nova — reusa infra de auditoria.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER updated_at (apenas em prestadores_parceiros e recibos_servico)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION v5_manutencao.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_prestadores_parceiros_updated_at ON v5_manutencao.prestadores_parceiros;
CREATE TRIGGER tg_prestadores_parceiros_updated_at
  BEFORE UPDATE ON v5_manutencao.prestadores_parceiros
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.tg_set_updated_at();

DROP TRIGGER IF EXISTS tg_recibos_servico_updated_at ON v5_manutencao.recibos_servico;
CREATE TRIGGER tg_recibos_servico_updated_at
  BEFORE UPDATE ON v5_manutencao.recibos_servico
  FOR EACH ROW EXECUTE FUNCTION v5_manutencao.tg_set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME publication (Casa screen subscribe — CPO spec Flow 3 passo 2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Só recibos_servico precisa de realtime no client (card muda
-- "Aguarda prestador" → "Recibo arquivado" sem reload).
-- magic_links e prestadores_parceiros NÃO entram em realtime — são gerados
-- server-side e o client só lê via JOIN do recibo.
ALTER PUBLICATION supabase_realtime ADD TABLE v5_manutencao.recibos_servico;


-- ═══════════════════════════════════════════════════════════════════════════
-- Reload PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO MANUAL (Mário corre depois de aplicar)
-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Tabelas existem com RLS activa:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'v5_manutencao'
--   AND tablename IN ('magic_links','prestadores_parceiros','recibos_servico');
-- Esperado: 3 linhas, todas com rowsecurity = true
--
-- 2) GRANTs auditados (Regra FF):
-- SELECT table_name, grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'v5_manutencao'
--   AND table_name IN ('magic_links','prestadores_parceiros','recibos_servico')
-- ORDER BY table_name, grantee, privilege_type;
-- Esperado: cada tabela tem GRANT SELECT TO authenticated +
--                          GRANT SELECT/INSERT/UPDATE/DELETE TO service_role
--
-- 3) Indexes:
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'v5_manutencao'
--   AND tablename IN ('magic_links','prestadores_parceiros','recibos_servico')
-- ORDER BY tablename, indexname;
-- Esperado: idx_magic_links_token (UNIQUE), idx_magic_links_owner_created,
--           idx_magic_links_active, idx_magic_links_org,
--           idx_prestadores_parceiros_nif, idx_prestadores_parceiros_magic,
--           idx_prestadores_parceiros_status,
--           idx_recibos_servico_owner_data, idx_recibos_servico_prestador,
--           idx_recibos_servico_org
--
-- 4) SELECT vazio sem erro (Day 1 gate):
-- SELECT count(*) FROM v5_manutencao.magic_links;
-- SELECT count(*) FROM v5_manutencao.prestadores_parceiros;
-- SELECT count(*) FROM v5_manutencao.recibos_servico;
-- Esperado: 0, 0, 0
-- ─────────────────────────────────────────────────────────────────────────────
