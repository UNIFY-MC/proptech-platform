-- =============================================================
-- ADR-014 — Centralização Billing em core.*
-- =============================================================
-- 4 tabelas centrais:
--   core.servicos_ativos  (1 pessoa × N verticais — chave cross-sell)
--   core.subscricoes      (assinaturas recorrentes)
--   core.faturas          (documentos emitidos / saídas)
--   core.recebimentos     (entradas confirmadas)
--
-- View core.cliente_360: agrega TUDO de pessoa X cross-vertical.
-- =============================================================

-- ─────────────────────────────────────────────────────────
-- 1. Tabelas
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.servicos_ativos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id     uuid NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  vertical      text NOT NULL,  -- v2 | v3 | v4 | v5 | v10
  ref_externa   text,            -- código humano-legível (FRACAO-12-A3C, APOLICE-1234)
  ref_tabela    text,            -- schema.tabela na vertical
  ref_id        uuid,            -- FK opcional para row da vertical
  data_inicio   date NOT NULL DEFAULT CURRENT_DATE,
  data_fim      date,            -- NULL = activo
  estado        text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','pausado','cancelado')),
  valor_mensal  numeric,         -- snapshot do que paga regularmente
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pessoa_id, vertical, ref_externa)
);
CREATE INDEX IF NOT EXISTS idx_servativos_pessoa   ON core.servicos_ativos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_servativos_vertical ON core.servicos_ativos(vertical, estado);

CREATE TABLE IF NOT EXISTS core.subscricoes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         uuid NOT NULL REFERENCES core.pessoas(id) ON DELETE CASCADE,
  org_id            uuid REFERENCES core.organizations(id) ON DELETE SET NULL,
  servico_ativo_id  uuid REFERENCES core.servicos_ativos(id) ON DELETE SET NULL,
  vertical          text NOT NULL,
  plano_nome        text NOT NULL,
  valor             numeric NOT NULL,
  periodicidade     text NOT NULL DEFAULT 'mensal' CHECK (periodicidade IN ('mensal','trimestral','anual','one_shot')),
  dia_cobranca      int CHECK (dia_cobranca BETWEEN 1 AND 31),
  iban              text,
  data_inicio       date NOT NULL DEFAULT CURRENT_DATE,
  data_fim          date,
  estado            text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','suspensa','cancelada')),
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscricoes_pessoa   ON core.subscricoes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_subscricoes_vertical ON core.subscricoes(vertical, estado);

CREATE TABLE IF NOT EXISTS core.faturas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero            text UNIQUE NOT NULL,
  pessoa_id         uuid REFERENCES core.pessoas(id) ON DELETE SET NULL,
  subscricao_id    uuid REFERENCES core.subscricoes(id) ON DELETE SET NULL,
  vertical          text NOT NULL,
  data_emissao      date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento   date NOT NULL,
  valor_liquido     numeric NOT NULL DEFAULT 0,
  valor_iva         numeric NOT NULL DEFAULT 0,
  valor_total       numeric GENERATED ALWAYS AS (valor_liquido + valor_iva) STORED,
  estado            text NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida','paga','anulada','vencida')),
  pago_em           timestamptz,
  metodo_pagamento  text,
  iban_pagamento    text,
  ficheiro_pdf      text,
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_faturas_pessoa     ON core.faturas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_faturas_vertical   ON core.faturas(vertical, estado);
CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON core.faturas(data_vencimento) WHERE estado IN ('emitida','vencida');

CREATE TABLE IF NOT EXISTS core.recebimentos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         uuid REFERENCES core.pessoas(id) ON DELETE SET NULL,
  fatura_id         uuid REFERENCES core.faturas(id) ON DELETE SET NULL,
  vertical          text NOT NULL,
  data_pagamento    date NOT NULL,
  valor             numeric NOT NULL,
  referencia_banco  text,
  movimento_id      uuid,  -- FK lógico para v2_condominios.extrato_bancario.id (sem FK rígido para evitar acoplamento)
  metodo            text,
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recebs_pessoa   ON core.recebimentos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_recebs_fatura   ON core.recebimentos(fatura_id);
CREATE INDEX IF NOT EXISTS idx_recebs_vertical ON core.recebimentos(vertical, data_pagamento DESC);

-- ─────────────────────────────────────────────────────────
-- 2. RPCs (SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION core.criar_subscricao(
  p_pessoa_id uuid,
  p_vertical text,
  p_plano text,
  p_valor numeric,
  p_periodicidade text DEFAULT 'mensal',
  p_dia_cobranca int DEFAULT 1,
  p_servico_ativo_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT iam.has_permission(p_vertical || '.subscricoes', 'create')
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires %.subscricoes:create or staff', p_vertical;
  END IF;

  INSERT INTO core.subscricoes (pessoa_id, vertical, plano_nome, valor, periodicidade, dia_cobranca, servico_ativo_id)
  VALUES (p_pessoa_id, p_vertical, p_plano, p_valor, p_periodicidade, p_dia_cobranca, p_servico_ativo_id)
  RETURNING id INTO v_id;

  PERFORM iam.log_activity('subscricao_criada',
    format('%s · %s · %s €/%s', p_vertical, p_plano, p_valor, p_periodicidade),
    'ok', 'staff', p_vertical);
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION core.emitir_fatura(
  p_pessoa_id uuid,
  p_vertical text,
  p_numero text,
  p_valor_liquido numeric,
  p_valor_iva numeric DEFAULT 0,
  p_data_vencimento date DEFAULT NULL,
  p_subscricao_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT iam.has_permission(p_vertical || '.faturas', 'create')
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires %.faturas:create or staff', p_vertical;
  END IF;

  INSERT INTO core.faturas (pessoa_id, vertical, numero, valor_liquido, valor_iva,
                             data_vencimento, subscricao_id, estado)
  VALUES (p_pessoa_id, p_vertical, p_numero, p_valor_liquido, p_valor_iva,
          COALESCE(p_data_vencimento, CURRENT_DATE + INTERVAL '30 days'),
          p_subscricao_id, 'emitida')
  RETURNING id INTO v_id;

  PERFORM iam.log_activity('fatura_emitida',
    format('%s · %s · %s €', p_vertical, p_numero, p_valor_liquido + p_valor_iva),
    'ok', 'staff', p_vertical);
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION core.registar_recebimento(
  p_fatura_id uuid,
  p_valor numeric,
  p_data date DEFAULT CURRENT_DATE,
  p_referencia text DEFAULT NULL,
  p_metodo text DEFAULT 'transferencia'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE v_id uuid; v_fatura record;
BEGIN
  SELECT * INTO v_fatura FROM core.faturas WHERE id = p_fatura_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'fatura_not_found'; END IF;

  IF NOT iam.has_permission(v_fatura.vertical || '.recebimentos', 'create')
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'unauthorized: requires %.recebimentos:create or staff', v_fatura.vertical;
  END IF;

  INSERT INTO core.recebimentos (pessoa_id, fatura_id, vertical, data_pagamento, valor,
                                  referencia_banco, metodo)
  VALUES (v_fatura.pessoa_id, p_fatura_id, v_fatura.vertical, p_data, p_valor, p_referencia, p_metodo)
  RETURNING id INTO v_id;

  -- Marcar fatura como paga se valor recebido >= valor_total
  IF p_valor >= v_fatura.valor_total THEN
    UPDATE core.faturas SET estado = 'paga', pago_em = now(), metodo_pagamento = p_metodo
    WHERE id = p_fatura_id;
  END IF;

  PERFORM iam.log_activity('recebimento_registado',
    format('%s · fatura %s · %s €', v_fatura.vertical, v_fatura.numero, p_valor),
    'ok', 'staff', v_fatura.vertical);
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION core.cliente_360(p_pessoa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_staff() AND auth.uid() != (SELECT auth_user_id FROM core.pessoas WHERE id = p_pessoa_id) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'pessoa', (SELECT row_to_json(p) FROM core.pessoas p WHERE id = p_pessoa_id),
    'servicos_ativos', (
      SELECT jsonb_agg(jsonb_build_object(
        'vertical', sa.vertical, 'ref', sa.ref_externa, 'estado', sa.estado,
        'valor_mensal', sa.valor_mensal, 'data_inicio', sa.data_inicio
      ))
      FROM core.servicos_ativos sa WHERE sa.pessoa_id = p_pessoa_id AND sa.estado = 'activo'
    ),
    'subscricoes_activas', (
      SELECT jsonb_agg(jsonb_build_object(
        'vertical', s.vertical, 'plano', s.plano_nome,
        'valor', s.valor, 'periodicidade', s.periodicidade
      ))
      FROM core.subscricoes s WHERE s.pessoa_id = p_pessoa_id AND s.estado = 'activa'
    ),
    'mora_total', (
      SELECT COALESCE(SUM(valor_total), 0)
      FROM core.faturas
      WHERE pessoa_id = p_pessoa_id
        AND estado = 'emitida'
        AND data_vencimento < CURRENT_DATE
    ),
    'faturas_pendentes', (
      SELECT count(*) FROM core.faturas
      WHERE pessoa_id = p_pessoa_id AND estado = 'emitida'
    ),
    'ultimo_pagamento', (
      SELECT max(data_pagamento) FROM core.recebimentos WHERE pessoa_id = p_pessoa_id
    ),
    'receita_recorrente_mes', (
      SELECT COALESCE(SUM(
        CASE periodicidade
          WHEN 'mensal' THEN valor
          WHEN 'trimestral' THEN valor / 3
          WHEN 'anual' THEN valor / 12
          ELSE 0 END
      ), 0)
      FROM core.subscricoes
      WHERE pessoa_id = p_pessoa_id AND estado = 'activa'
    ),
    'verticais_activas', (
      SELECT jsonb_agg(DISTINCT vertical) FROM core.servicos_ativos
      WHERE pessoa_id = p_pessoa_id AND estado = 'activo'
    )
  ) INTO v_result;

  RETURN v_result;
END; $$;

-- ─────────────────────────────────────────────────────────
-- 3. GRANTs
-- ─────────────────────────────────────────────────────────

GRANT SELECT ON
  core.servicos_ativos, core.subscricoes, core.faturas, core.recebimentos
TO authenticated;

GRANT ALL ON
  core.servicos_ativos, core.subscricoes, core.faturas, core.recebimentos
TO service_role;

REVOKE ALL ON FUNCTION core.criar_subscricao(uuid,text,text,numeric,text,int,uuid) FROM public;
REVOKE ALL ON FUNCTION core.emitir_fatura(uuid,text,text,numeric,numeric,date,uuid)  FROM public;
REVOKE ALL ON FUNCTION core.registar_recebimento(uuid,numeric,date,text,text)        FROM public;
REVOKE ALL ON FUNCTION core.cliente_360(uuid)                                         FROM public;

GRANT EXECUTE ON FUNCTION core.criar_subscricao(uuid,text,text,numeric,text,int,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION core.emitir_fatura(uuid,text,text,numeric,numeric,date,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION core.registar_recebimento(uuid,numeric,date,text,text)       TO authenticated;
GRANT EXECUTE ON FUNCTION core.cliente_360(uuid)                                       TO authenticated;

-- ─────────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────────

ALTER TABLE core.servicos_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.subscricoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.faturas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.recebimentos     ENABLE ROW LEVEL SECURITY;

-- Staff vê tudo; user só vê próprios
DROP POLICY IF EXISTS sa_read ON core.servicos_ativos;
CREATE POLICY sa_read ON core.servicos_ativos FOR SELECT TO authenticated
  USING (public.is_staff() OR pessoa_id = (SELECT id FROM core.pessoas WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS sub_read ON core.subscricoes;
CREATE POLICY sub_read ON core.subscricoes FOR SELECT TO authenticated
  USING (public.is_staff() OR pessoa_id = (SELECT id FROM core.pessoas WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS fat_read ON core.faturas;
CREATE POLICY fat_read ON core.faturas FOR SELECT TO authenticated
  USING (public.is_staff() OR pessoa_id = (SELECT id FROM core.pessoas WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS rec_read ON core.recebimentos;
CREATE POLICY rec_read ON core.recebimentos FOR SELECT TO authenticated
  USING (public.is_staff() OR pessoa_id = (SELECT id FROM core.pessoas WHERE auth_user_id = auth.uid()));
