---
title: Supabase Schema Design — v2_condominios
date: 2026-05-05
status: aplicado — 2026-05-05 — V1 Core Hub hkmvszkpxjbxmnixzqbl
author: supabase-designer
sprint: v5-1b3
references:
  - .claude/strategy/command-centre-condo.md
  - .claude/employees/*-condo.md (11 employees)
  - .claude/strategy/sops/supabase-schema-command-center.md
  - V1 Core Hub: hkmvszkpxjbxmnixzqbl
---

# Schema Design — `v2_condominios`

Schema AI-native para administração de condomínios no V1 Core Hub.
16 tabelas — domains dos 11 AI employees.

**NÃO APLICAR** sem validação explícita de Mário.
Migration file a criar: `apps/v5-manutencao/supabase/migrations/YYYYMMDDHHMM_v2_condominios_schema.sql`

---

## Premissas e decisões de design

### 1. Relação com `core.*`

- `v2_condominios.fracoes.edificio_id` → FK para `core.imoveis(id)` (RESTRICT)
  Cada fracção pertence a um edifício registado no hub central.
- `v2_condominios.condominos.pessoa_id` → FK para `core.pessoas(id)` (RESTRICT)
  Condóminos são pessoas registadas no hub.
- Sem FK directa para `auth.users` — autenticação é gerida via `core.staff_roles` (staff/agentes) e `utilizadores_portal` (condóminos com acesso ao portal).

### 2. RLS — dois tipos de utilizador

- **Staff / AI employees** (`public.is_staff()` = true): acesso SELECT/INSERT/UPDATE/DELETE em todas as tabelas.
  A função `public.is_staff()` já existe (criada em Sprint 3.4D, usa `core.staff_roles`).
- **Condóminos autenticados** (via portal): leitura restrita ao seu `pessoa_id` / `edificio_id`.
  Implementado via função helper `v2_condominios.get_my_edificios()` (ver abaixo).
- **anon**: negado em tudo — sem excepção.

### 3. Tabela `utilizadores_portal`

Não está na lista pedida mas é necessária para o helper de RLS dos condóminos.
Incluída no design mas marcada como opcional — Mário decide se activa agora ou depois.

### 4. FK ON DELETE — justificação por tabela

| Relação | Estratégia | Razão |
|---|---|---|
| fracoes → core.imoveis | RESTRICT | Edifício não se apaga enquanto tem fracções |
| condominos → fracoes | RESTRICT | Fracção não se apaga enquanto tem condóminos |
| condominos → core.pessoas | RESTRICT | Pessoa não se apaga enquanto é condómino activo |
| recebimentos → fracoes | RESTRICT | Recibo histórico — nunca se perde |
| recebimentos → condominos | SET NULL | Condómino pode sair; recibo histórico fica |
| extrato_bancario → fracoes | SET NULL | Movimento pode não ter fracção identificada |
| faturas_pendentes → fracoes | SET NULL | Fatura das partes comuns não tem fracção |
| faturas_ocr → documentos | CASCADE | Dados OCR são parte do documento — apagam juntos |
| documentos_drive → documentos | CASCADE | Link Drive é extensão do registo de documento |
| seguro_fracoes → fracoes | RESTRICT | Seguro associado a fracção específica |
| atas → assembleias | RESTRICT | Ata pertence a assembleia — assembleia não apaga com ata associada |
| convocatorias → assembleias | CASCADE | Convocatória é parte da assembleia |
| comunicacoes → condominos | SET NULL | Comunicação histórica fica mesmo que condómino saia |
| historico_pedidos → condominos | SET NULL | Histórico de pedidos fica para auditoria |
| carregadores_contagens → fracoes | RESTRICT | Contagem EV tem de ter fracção identificada |
| audit_log | sem FKs | Log imutável — sem deleções em cascata |

### 5. Timestamps e triggers

Todas as tabelas têm `created_at` e `updated_at`. O trigger `set_updated_at()` é reutilizado do schema `system` (criado em Sprint 1E). Se não existir em `public`, criar aqui.

### 6. Enum types

Criados no schema `v2_condominios` para evitar poluição do `public`.

---

## DDL Completo

```sql
-- =============================================================
-- MIGRATION: v2_condominios schema — AI-native condo management
-- Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
-- Data: 2026-05-05
-- Autor: supabase-designer
-- Aprovação: PENDENTE (Mário)
-- =============================================================

-- --------------------------------------------------------
-- 0. SCHEMA + TYPES
-- --------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS v2_condominios;

-- Estado de uma fracção
DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_fracao AS ENUM (
    'activa', 'devoluta', 'obras', 'inactiva'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tipo de proprietário
DO $$ BEGIN
  CREATE TYPE v2_condominios.tipo_condomino AS ENUM (
    'proprietario', 'inquilino', 'usufrutuario', 'procurador'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de um recebimento (quota)
DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_recebimento AS ENUM (
    'pendente', 'pago', 'mora', 'acordo', 'incobravel', 'anulado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de fatura pendente
DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_fatura AS ENUM (
    'pendente', 'aprovada', 'paga', 'rejeitada', 'anulada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tipo de documento
DO $$ BEGIN
  CREATE TYPE v2_condominios.tipo_documento AS ENUM (
    'fatura', 'ata', 'contrato', 'apolice', 'extrato',
    'certidao', 'planta', 'correspondencia', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de processamento de documento OCR
DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_ocr AS ENUM (
    'processado', 'pendente_revisao', 'rejeitado', 'sem_ocr'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de assembleia
DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_assembleia AS ENUM (
    'agendada', 'realizada', 'cancelada', 'adiada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tipo de assembleia
DO $$ BEGIN
  CREATE TYPE v2_condominios.tipo_assembleia AS ENUM (
    'ordinaria', 'extraordinaria'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de ata
DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_ata AS ENUM (
    'rascunho', 'aprovada', 'arquivada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Canal de comunicação
DO $$ BEGIN
  CREATE TYPE v2_condominios.canal_comunicacao AS ENUM (
    'email', 'sms', 'carta', 'portal', 'whatsapp'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de envio
DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_envio AS ENUM (
    'enviado', 'entregue', 'bounce', 'erro', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tipo de pedido (atendimento-condo)
DO $$ BEGIN
  CREATE TYPE v2_condominios.tipo_pedido AS ENUM (
    'avaria_urgente', 'avaria_normal', 'quota', 'pagamento',
    'acordo_mora', 'documento', 'upload', 'assembleia',
    'ata', 'reclamacao', 'seguro', 'energia', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Urgência de pedido
DO $$ BEGIN
  CREATE TYPE v2_condominios.urgencia AS ENUM (
    'emergencia', 'urgente', 'normal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------
-- 0b. FUNÇÃO HELPER UPDATED_AT
-- (Reutiliza public.handle_updated_at se já existir;
--  caso contrário cria no schema v2_condominios)
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION v2_condominios.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------
-- 0c. FUNÇÃO HELPER RLS — edificios do condómino autenticado
-- Retorna os edificio_ids onde o utilizador autenticado
-- é condómino activo. Usada nas políticas RLS.
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION v2_condominios.get_my_edificios()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = v2_condominios, core, public AS $$
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT f.edificio_id),
    '{}'::uuid[]
  )
  FROM v2_condominios.condominos c
  JOIN v2_condominios.fracoes f ON f.id = c.fracao_id
  JOIN core.pessoas p ON p.id = c.pessoa_id
  WHERE p.auth_user_id = auth.uid()
    AND c.activo = true;
$$;

GRANT EXECUTE ON FUNCTION v2_condominios.get_my_edificios() TO authenticated;

-- --------------------------------------------------------
-- 1. FRACOES
-- Domínio: financeiro-condo, assembleia-condo, manutencao-condo, energia-condo
-- Cada fracção autónoma de cada edifício.
-- permilagem: sempre com 4 casas decimais (ex: 125.7500)
-- quota_base: valor mensal em euros da fracção (calculado em assembleia)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.fracoes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  codigo            text          NOT NULL,        -- ex: "1A", "2D", "Cave 1"
  descricao         text,                          -- ex: "Apartamento T3, 2º Esq."
  permilagem        numeric(10,4) NOT NULL
    CHECK (permilagem > 0 AND permilagem <= 1000), -- soma de todas deve = 1000
  quota_base        numeric(10,2) NOT NULL DEFAULT 0
    CHECK (quota_base >= 0),                       -- euros/mês — deliberado em assembleia
  estado            v2_condominios.estado_fracao NOT NULL DEFAULT 'activa',
  tem_ev            boolean       NOT NULL DEFAULT false,  -- possui posto carregador EV?
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (edificio_id, codigo)                     -- código único por edifício
);

COMMENT ON TABLE v2_condominios.fracoes IS
  'Fracções autónomas de cada edifício. permilagem com 4 casas decimais (regra Fina Standard).';
COMMENT ON COLUMN v2_condominios.fracoes.permilagem IS
  'Milésimos da fracção no total do edifício. Nunca arredondar — 4 casas decimais.';
COMMENT ON COLUMN v2_condominios.fracoes.quota_base IS
  'Quota mensal em euros deliberada em assembleia. quota_individual = quota_base × (permilagem/1000).';

CREATE TRIGGER trg_fracoes_updated_at
  BEFORE UPDATE ON v2_condominios.fracoes
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_fracoes_edificio ON v2_condominios.fracoes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_fracoes_estado ON v2_condominios.fracoes(estado);
CREATE INDEX IF NOT EXISTS idx_fracoes_tem_ev ON v2_condominios.fracoes(tem_ev) WHERE tem_ev = true;

-- RLS
ALTER TABLE v2_condominios.fracoes ENABLE ROW LEVEL SECURITY;

-- Staff vê tudo
DROP POLICY IF EXISTS fracoes_staff_all ON v2_condominios.fracoes;
CREATE POLICY fracoes_staff_all ON v2_condominios.fracoes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê só as fracções dos edifícios onde é condómino
DROP POLICY IF EXISTS fracoes_condomino_select ON v2_condominios.fracoes;
CREATE POLICY fracoes_condomino_select ON v2_condominios.fracoes
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND edificio_id = ANY(v2_condominios.get_my_edificios())
  );

-- anon: negado implicitamente (sem política = deny)


-- --------------------------------------------------------
-- 2. CONDOMINOS
-- Domínio: financeiro-condo, atendimento-condo, comunicacao-condo
-- Registo de quem é condómino em que fracção.
-- Um condómino pode ter várias fracções (vários registos).
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.condominos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         uuid          NOT NULL
    REFERENCES core.pessoas(id) ON DELETE RESTRICT,
  fracao_id         uuid          NOT NULL
    REFERENCES v2_condominios.fracoes(id) ON DELETE RESTRICT,
  tipo              v2_condominios.tipo_condomino NOT NULL DEFAULT 'proprietario',
  activo            boolean       NOT NULL DEFAULT true,
  data_inicio       date          NOT NULL,
  data_fim          date,                          -- NULL = ainda activo
  is_administrador  boolean       NOT NULL DEFAULT false, -- administrador do condomínio?
  notas             text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (pessoa_id, fracao_id, data_inicio)       -- evita duplicados de entrada
);

COMMENT ON TABLE v2_condominios.condominos IS
  'Relação entre pessoas (core.pessoas) e fracções. Um condómino pode ter várias fracções.';
COMMENT ON COLUMN v2_condominios.condominos.is_administrador IS
  'Administrador eleito do condomínio (deliberado em assembleia). Só um por edifício activo.';

CREATE TRIGGER trg_condominos_updated_at
  BEFORE UPDATE ON v2_condominios.condominos
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_condominos_pessoa ON v2_condominios.condominos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_condominos_fracao ON v2_condominios.condominos(fracao_id);
CREATE INDEX IF NOT EXISTS idx_condominos_activo ON v2_condominios.condominos(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_condominos_administrador ON v2_condominios.condominos(is_administrador) WHERE is_administrador = true;

-- RLS
ALTER TABLE v2_condominios.condominos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS condominos_staff_all ON v2_condominios.condominos;
CREATE POLICY condominos_staff_all ON v2_condominios.condominos
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê os registos do seu próprio pessoa_id
DROP POLICY IF EXISTS condominos_self_select ON v2_condominios.condominos;
CREATE POLICY condominos_self_select ON v2_condominios.condominos
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND pessoa_id IN (
      SELECT p.id FROM core.pessoas p WHERE p.auth_user_id = auth.uid()
    )
  );


-- --------------------------------------------------------
-- 3. RECEBIMENTOS
-- Domínio: financeiro-condo (principal), compliance-condo
-- Quotas emitidas (pendente) e pagas.
-- Cada quota gerada = 1 recebimento.
-- Analogia contabilística: é como um lançamento a débito
-- no diário de cada condómino — o crédito vem quando paga.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.recebimentos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fracao_id         uuid          NOT NULL
    REFERENCES v2_condominios.fracoes(id) ON DELETE RESTRICT,
  condomino_id      uuid
    REFERENCES v2_condominios.condominos(id) ON DELETE SET NULL,
  periodo           date          NOT NULL,        -- mês a que respeita (sempre dia 1 do mês)
  valor_emitido     numeric(10,2) NOT NULL
    CHECK (valor_emitido > 0),
  valor_pago        numeric(10,2) NOT NULL DEFAULT 0
    CHECK (valor_pago >= 0),
  vencimento        date          NOT NULL,        -- tipicamente dia 8 do mês
  data_pagamento    date,                          -- NULL = não pago
  estado            v2_condominios.estado_recebimento NOT NULL DEFAULT 'pendente',
  referencia_mb     text,                          -- referência Multibanco se aplicável
  observacoes       text,
  gerado_por        text          NOT NULL DEFAULT 'financeiro-condo', -- agente que gerou
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (fracao_id, periodo)                      -- uma quota por fracção por mês
);

COMMENT ON TABLE v2_condominios.recebimentos IS
  'Quotas emitidas e pagas por fracção. Uma linha por fracção por mês. Equivale a débito no diário de cada condómino.';
COMMENT ON COLUMN v2_condominios.recebimentos.periodo IS
  'Mês a que respeita a quota. Sempre o dia 1 do mês (ex: 2026-05-01 = quota de Maio 2026).';
COMMENT ON COLUMN v2_condominios.recebimentos.condomino_id IS
  'SET NULL: se condómino sair, o histórico financeiro mantém-se para auditoria.';

CREATE TRIGGER trg_recebimentos_updated_at
  BEFORE UPDATE ON v2_condominios.recebimentos
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_recebimentos_fracao ON v2_condominios.recebimentos(fracao_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_condomino ON v2_condominios.recebimentos(condomino_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_estado ON v2_condominios.recebimentos(estado);
CREATE INDEX IF NOT EXISTS idx_recebimentos_vencimento ON v2_condominios.recebimentos(vencimento);
CREATE INDEX IF NOT EXISTS idx_recebimentos_periodo ON v2_condominios.recebimentos(periodo);
-- Índice composto para a query de mora (Fina: Dia 15)
CREATE INDEX IF NOT EXISTS idx_recebimentos_mora_check
  ON v2_condominios.recebimentos(estado, vencimento)
  WHERE estado IN ('pendente', 'mora');

-- RLS
ALTER TABLE v2_condominios.recebimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recebimentos_staff_all ON v2_condominios.recebimentos;
CREATE POLICY recebimentos_staff_all ON v2_condominios.recebimentos
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê só os recebimentos das suas fracções
DROP POLICY IF EXISTS recebimentos_condomino_select ON v2_condominios.recebimentos;
CREATE POLICY recebimentos_condomino_select ON v2_condominios.recebimentos
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND fracao_id IN (
      SELECT c.fracao_id FROM v2_condominios.condominos c
      JOIN core.pessoas p ON p.id = c.pessoa_id
      WHERE p.auth_user_id = auth.uid() AND c.activo = true
    )
  );


-- --------------------------------------------------------
-- 4. EXTRATO_BANCARIO
-- Domínio: financeiro-condo
-- Movimentos bancários para reconciliação.
-- Cada movimento pode (ou não) estar associado a uma fracção.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.extrato_bancario (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id         uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  data_movimento      date          NOT NULL,
  descricao           text          NOT NULL,
  valor               numeric(12,2) NOT NULL,      -- positivo=crédito, negativo=débito
  saldo_apos          numeric(12,2),               -- saldo após movimento (se disponível)
  fracao_id           uuid
    REFERENCES v2_condominios.fracoes(id) ON DELETE SET NULL,
  recebimento_id      uuid
    REFERENCES v2_condominios.recebimentos(id) ON DELETE SET NULL,
  reconciliado        boolean       NOT NULL DEFAULT false,
  referencia_banco    text,                        -- ref. do extracto bancário original
  importado_em        timestamptz   NOT NULL DEFAULT now(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.extrato_bancario IS
  'Movimentos bancários por edifício para reconciliação com recebimentos. valor positivo=crédito, negativo=débito.';
COMMENT ON COLUMN v2_condominios.extrato_bancario.fracao_id IS
  'SET NULL: movimento pode não ter fracção identificada (ex: transferência das partes comuns).';

CREATE TRIGGER trg_extrato_bancario_updated_at
  BEFORE UPDATE ON v2_condominios.extrato_bancario
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_extrato_edificio ON v2_condominios.extrato_bancario(edificio_id);
CREATE INDEX IF NOT EXISTS idx_extrato_data ON v2_condominios.extrato_bancario(data_movimento);
CREATE INDEX IF NOT EXISTS idx_extrato_reconciliado ON v2_condominios.extrato_bancario(reconciliado) WHERE reconciliado = false;
CREATE INDEX IF NOT EXISTS idx_extrato_fracao ON v2_condominios.extrato_bancario(fracao_id);
CREATE INDEX IF NOT EXISTS idx_extrato_recebimento ON v2_condominios.extrato_bancario(recebimento_id);

-- RLS — extracto bancário é dado sensível: só staff
ALTER TABLE v2_condominios.extrato_bancario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS extrato_staff_all ON v2_condominios.extrato_bancario;
CREATE POLICY extrato_staff_all ON v2_condominios.extrato_bancario
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
-- anon e condóminos: negado (sem política = deny by default)


-- --------------------------------------------------------
-- 5. FATURAS_PENDENTES
-- Domínio: financeiro-condo, docs-condo, manutencao-condo
-- Faturas de fornecedores a pagar.
-- Análoga a uma conta a pagar no razão auxiliar de fornecedores.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.faturas_pendentes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  fracao_id         uuid
    REFERENCES v2_condominios.fracoes(id) ON DELETE SET NULL, -- NULL = partes comuns
  fornecedor_nome   text          NOT NULL,
  fornecedor_nif    text,
  numero_fatura     text,
  descricao         text          NOT NULL,
  valor             numeric(10,2) NOT NULL CHECK (valor > 0),
  iva               numeric(5,2)  NOT NULL DEFAULT 23.00 CHECK (iva >= 0),
  vencimento        date          NOT NULL,
  estado            v2_condominios.estado_fatura NOT NULL DEFAULT 'pendente',
  aprovado_em       timestamptz,
  pago_em           timestamptz,
  documento_id      uuid,                          -- FK em baixo (forward ref)
  approval_item_id  uuid,                          -- ref para system.approvals_queue
  criado_por        text          NOT NULL DEFAULT 'docs-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.faturas_pendentes IS
  'Faturas de fornecedores a pagar. Equivale ao razão auxiliar de fornecedores (contas a pagar). fracao_id NULL = partes comuns.';
COMMENT ON COLUMN v2_condominios.faturas_pendentes.fracao_id IS
  'SET NULL: fatura das partes comuns do edifício não tem fracção específica.';

CREATE TRIGGER trg_faturas_pendentes_updated_at
  BEFORE UPDATE ON v2_condominios.faturas_pendentes
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_faturas_edificio ON v2_condominios.faturas_pendentes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_faturas_estado ON v2_condominios.faturas_pendentes(estado);
CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON v2_condominios.faturas_pendentes(vencimento);
CREATE INDEX IF NOT EXISTS idx_faturas_fracao ON v2_condominios.faturas_pendentes(fracao_id);
-- Índice composto: faturas pendentes por vencimento (query de Fina: >45 dias)
CREATE INDEX IF NOT EXISTS idx_faturas_pendentes_vencimento
  ON v2_condominios.faturas_pendentes(vencimento, estado)
  WHERE estado = 'pendente';

-- RLS — só staff (dados financeiros sensíveis)
ALTER TABLE v2_condominios.faturas_pendentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faturas_pendentes_staff_all ON v2_condominios.faturas_pendentes;
CREATE POLICY faturas_pendentes_staff_all ON v2_condominios.faturas_pendentes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- --------------------------------------------------------
-- 6. DOCUMENTOS
-- Domínio: docs-condo (principal), todos os outros employees
-- Registo central de todos os documentos do sistema.
-- Cada documento tem metadata + estado OCR.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.documentos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  fracao_id         uuid
    REFERENCES v2_condominios.fracoes(id) ON DELETE SET NULL,
  tipo              v2_condominios.tipo_documento NOT NULL,
  titulo            text          NOT NULL,
  filename_original text,
  filename_norm     text,                          -- normalizado: [YYYY-MM-DD]_[tipo]_[assunto].pdf
  tamanho_bytes     bigint,
  mime_type         text,
  hash_sha256       text,                          -- para detecção de duplicados
  estado_ocr        v2_condominios.estado_ocr NOT NULL DEFAULT 'sem_ocr',
  confianca_ocr     numeric(5,2),                  -- percentagem 0-100
  processado_em     timestamptz,
  criado_por        text          NOT NULL DEFAULT 'docs-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.documentos IS
  'Registo central de todos os documentos. Dora (docs-condo) é a única a escrever. Outros employees lêem.';
COMMENT ON COLUMN v2_condominios.documentos.hash_sha256 IS
  'SHA-256 do ficheiro para detecção de duplicados (Dora Standard).';
COMMENT ON COLUMN v2_condominios.documentos.confianca_ocr IS
  'Confiança do OCR em percentagem. <90 → pendente_revisao; >=90 → processado automático.';

-- FK de faturas_pendentes → documentos (adicionar após criar documentos)
ALTER TABLE v2_condominios.faturas_pendentes
  ADD CONSTRAINT fk_faturas_documento
    FOREIGN KEY (documento_id) REFERENCES v2_condominios.documentos(id)
    ON DELETE SET NULL;

CREATE TRIGGER trg_documentos_updated_at
  BEFORE UPDATE ON v2_condominios.documentos
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_documentos_edificio ON v2_condominios.documentos(edificio_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON v2_condominios.documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_estado_ocr ON v2_condominios.documentos(estado_ocr);
CREATE INDEX IF NOT EXISTS idx_documentos_fracao ON v2_condominios.documentos(fracao_id);
CREATE INDEX IF NOT EXISTS idx_documentos_hash ON v2_condominios.documentos(hash_sha256) WHERE hash_sha256 IS NOT NULL;

-- RLS
ALTER TABLE v2_condominios.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documentos_staff_all ON v2_condominios.documentos;
CREATE POLICY documentos_staff_all ON v2_condominios.documentos
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê documentos do seu edifício (não documentos de outros edifícios)
DROP POLICY IF EXISTS documentos_condomino_select ON v2_condominios.documentos;
CREATE POLICY documentos_condomino_select ON v2_condominios.documentos
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND edificio_id = ANY(v2_condominios.get_my_edificios())
    AND tipo IN ('ata', 'convocatoria', 'correspondencia') -- documentos acessíveis ao condómino
  );


-- --------------------------------------------------------
-- 7. FATURAS_OCR
-- Domínio: docs-condo
-- Dados estruturados extraídos por OCR de faturas.
-- CASCADE: apagar documento apaga o OCR (são a mesma coisa).
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.faturas_ocr (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id      uuid          NOT NULL
    REFERENCES v2_condominios.documentos(id) ON DELETE CASCADE,
  fornecedor_nome   text,
  fornecedor_nif    text,
  numero_fatura     text,
  data_fatura       date,
  data_vencimento   date,
  valor_liquido     numeric(10,2),
  valor_iva         numeric(10,2),
  valor_total       numeric(10,2),
  descricao_servico text,
  -- Confiança por campo (permite auditoria granular)
  conf_fornecedor   numeric(5,2),
  conf_nif          numeric(5,2),
  conf_numero       numeric(5,2),
  conf_valor        numeric(5,2),
  conf_data         numeric(5,2),
  modelo_ocr        text          NOT NULL DEFAULT 'claude-vision', -- ex: 'claude-sonnet-4-6'
  raw_extraction    jsonb,                         -- output completo do modelo para debug
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.faturas_ocr IS
  'Dados estruturados extraídos por OCR. CASCADE com documentos — são a mesma entidade. Confiança por campo para auditoria.';

CREATE TRIGGER trg_faturas_ocr_updated_at
  BEFORE UPDATE ON v2_condominios.faturas_ocr
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_faturas_ocr_documento ON v2_condominios.faturas_ocr(documento_id);
CREATE INDEX IF NOT EXISTS idx_faturas_ocr_nif ON v2_condominios.faturas_ocr(fornecedor_nif) WHERE fornecedor_nif IS NOT NULL;

-- RLS — só staff (dados financeiros)
ALTER TABLE v2_condominios.faturas_ocr ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faturas_ocr_staff_all ON v2_condominios.faturas_ocr;
CREATE POLICY faturas_ocr_staff_all ON v2_condominios.faturas_ocr
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- --------------------------------------------------------
-- 8. DOCUMENTOS_DRIVE
-- Domínio: docs-condo
-- Links permanentes Google Drive por documento.
-- CASCADE: apagar documento apaga o link.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.documentos_drive (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id      uuid          NOT NULL
    REFERENCES v2_condominios.documentos(id) ON DELETE CASCADE,
  drive_file_id     text          NOT NULL,        -- ID do ficheiro no Google Drive
  drive_url         text          NOT NULL,        -- URL permanente (não de partilha)
  drive_folder_path text,                          -- ex: "/Edifício A/Faturas/2026/05/"
  versao            integer       NOT NULL DEFAULT 1, -- para gestão de versões
  activo            boolean       NOT NULL DEFAULT true,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (documento_id, versao)
);

COMMENT ON TABLE v2_condominios.documentos_drive IS
  'Links permanentes Google Drive. CASCADE com documentos. Uma linha por versão do ficheiro.';

CREATE TRIGGER trg_documentos_drive_updated_at
  BEFORE UPDATE ON v2_condominios.documentos_drive
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_docs_drive_documento ON v2_condominios.documentos_drive(documento_id);
CREATE INDEX IF NOT EXISTS idx_docs_drive_file_id ON v2_condominios.documentos_drive(drive_file_id);

-- RLS
ALTER TABLE v2_condominios.documentos_drive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS docs_drive_staff_all ON v2_condominios.documentos_drive;
CREATE POLICY docs_drive_staff_all ON v2_condominios.documentos_drive
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino pode ver links de documentos que lhe são acessíveis
DROP POLICY IF EXISTS docs_drive_condomino_select ON v2_condominios.documentos_drive;
CREATE POLICY docs_drive_condomino_select ON v2_condominios.documentos_drive
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND documento_id IN (
      SELECT d.id FROM v2_condominios.documentos d
      WHERE d.edificio_id = ANY(v2_condominios.get_my_edificios())
        AND d.tipo IN ('ata', 'convocatoria', 'correspondencia')
    )
  );


-- --------------------------------------------------------
-- 9. SEGURO_FRACOES
-- Domínio: seguros-condo (Sofia)
-- Seguros individuais das fracções (não do condomínio como um todo).
-- O seguro do condomínio fica em v3_seguros.apolices.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.seguro_fracoes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fracao_id         uuid          NOT NULL
    REFERENCES v2_condominios.fracoes(id) ON DELETE RESTRICT,
  seguradora        text          NOT NULL,
  numero_apolice    text          NOT NULL,
  coberturas        text[],                        -- ex: ['incendio', 'rc', 'multirriscos']
  capital_seguro    numeric(12,2),                 -- capital segurado em euros
  premio_anual      numeric(10,2),                 -- prémio anual em euros
  data_inicio       date          NOT NULL,
  data_fim          date          NOT NULL,
  data_renovacao    date,                          -- se diferente de data_fim
  activa            boolean       NOT NULL DEFAULT true,
  documento_id      uuid
    REFERENCES v2_condominios.documentos(id) ON DELETE SET NULL, -- apólice digitalizada
  observacoes       text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.seguro_fracoes IS
  'Seguros individuais das fracções (seguro de conteúdo, RC, etc). Diferentes das apólices do condomínio em v3_seguros.apolices.';

CREATE TRIGGER trg_seguro_fracoes_updated_at
  BEFORE UPDATE ON v2_condominios.seguro_fracoes
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_seguro_fracoes_fracao ON v2_condominios.seguro_fracoes(fracao_id);
CREATE INDEX IF NOT EXISTS idx_seguro_fracoes_activa ON v2_condominios.seguro_fracoes(activa) WHERE activa = true;
CREATE INDEX IF NOT EXISTS idx_seguro_fracoes_data_fim ON v2_condominios.seguro_fracoes(data_fim);
-- Índice para alertas de renovação (Sofia: 90/60/30 dias)
CREATE INDEX IF NOT EXISTS idx_seguro_fracoes_renovacao
  ON v2_condominios.seguro_fracoes(data_fim, activa)
  WHERE activa = true;

-- RLS
ALTER TABLE v2_condominios.seguro_fracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seguro_fracoes_staff_all ON v2_condominios.seguro_fracoes;
CREATE POLICY seguro_fracoes_staff_all ON v2_condominios.seguro_fracoes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê o seguro da sua própria fracção
DROP POLICY IF EXISTS seguro_fracoes_condomino_select ON v2_condominios.seguro_fracoes;
CREATE POLICY seguro_fracoes_condomino_select ON v2_condominios.seguro_fracoes
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND fracao_id IN (
      SELECT c.fracao_id FROM v2_condominios.condominos c
      JOIN core.pessoas p ON p.id = c.pessoa_id
      WHERE p.auth_user_id = auth.uid() AND c.activo = true
    )
  );


-- --------------------------------------------------------
-- 10. ASSEMBLEIAS
-- Domínio: assembleia-condo (Assie), compliance-condo (Clara)
-- Histórico e agendamento de assembleias por edifício.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.assembleias (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  tipo              v2_condominios.tipo_assembleia NOT NULL DEFAULT 'ordinaria',
  estado            v2_condominios.estado_assembleia NOT NULL DEFAULT 'agendada',
  data_proposta     date          NOT NULL,        -- data proposta para a assembleia
  hora_inicio       time,
  local             text,
  ordem_trabalhos   text[],                        -- lista de pontos da ordem de trabalhos
  permilagem_presentes numeric(10,4),              -- total de milésimos dos presentes
  segunda_convocatoria boolean NOT NULL DEFAULT false,
  motivo_cancelamento text,
  ano_fiscal        integer       NOT NULL          -- ex: 2026 (para assembleia ordinária de 2026)
    CHECK (ano_fiscal >= 2020),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.assembleias IS
  'Histórico e agendamento de assembleias. Assie verifica prazo mínimo 10 dias (art. 1431º CC).';
COMMENT ON COLUMN v2_condominios.assembleias.permilagem_presentes IS
  'Total de milésimos dos condóminos presentes (ou representados). Usado para validar quórum.';
COMMENT ON COLUMN v2_condominios.assembleias.segunda_convocatoria IS
  'Em 2ª convocatória, qualquer número de condóminos delibera validamente (Assie Standard).';

CREATE TRIGGER trg_assembleias_updated_at
  BEFORE UPDATE ON v2_condominios.assembleias
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_assembleias_edificio ON v2_condominios.assembleias(edificio_id);
CREATE INDEX IF NOT EXISTS idx_assembleias_estado ON v2_condominios.assembleias(estado);
CREATE INDEX IF NOT EXISTS idx_assembleias_data ON v2_condominios.assembleias(data_proposta);
-- Índice para compliance-condo: assembleias ordinárias sem realizar por ano
CREATE INDEX IF NOT EXISTS idx_assembleias_ano_tipo
  ON v2_condominios.assembleias(edificio_id, ano_fiscal, tipo);

-- RLS
ALTER TABLE v2_condominios.assembleias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assembleias_staff_all ON v2_condominios.assembleias;
CREATE POLICY assembleias_staff_all ON v2_condominios.assembleias
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê assembleias do seu edifício
DROP POLICY IF EXISTS assembleias_condomino_select ON v2_condominios.assembleias;
CREATE POLICY assembleias_condomino_select ON v2_condominios.assembleias
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND edificio_id = ANY(v2_condominios.get_my_edificios())
  );


-- --------------------------------------------------------
-- 11. ATAS
-- Domínio: assembleia-condo (Assie)
-- Atas redigidas e aprovadas.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.atas (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id     uuid          NOT NULL
    REFERENCES v2_condominios.assembleias(id) ON DELETE RESTRICT,
  estado            v2_condominios.estado_ata NOT NULL DEFAULT 'rascunho',
  conteudo          text          NOT NULL,         -- texto completo da ata
  deliberacoes      jsonb,                          -- estruturado: [{ponto, votacao, resultado, valida}]
  aprovada_em       timestamptz,
  arquivada_em      timestamptz,
  documento_id      uuid
    REFERENCES v2_condominios.documentos(id) ON DELETE SET NULL, -- PDF da ata assinada
  redigida_por      text          NOT NULL DEFAULT 'assembleia-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.atas IS
  'Atas das assembleias. RESTRICT: assembleia não se apaga enquanto tiver ata associada. deliberacoes em JSONB com validação de quórum.';
COMMENT ON COLUMN v2_condominios.atas.deliberacoes IS
  'Array de deliberações: [{ponto, votacao_favor, votacao_contra, abst, permilagem_favor, resultado, valida, requer_unanimidade}]';

CREATE TRIGGER trg_atas_updated_at
  BEFORE UPDATE ON v2_condominios.atas
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_atas_assembleia ON v2_condominios.atas(assembleia_id);
CREATE INDEX IF NOT EXISTS idx_atas_estado ON v2_condominios.atas(estado);

-- RLS
ALTER TABLE v2_condominios.atas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS atas_staff_all ON v2_condominios.atas;
CREATE POLICY atas_staff_all ON v2_condominios.atas
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê atas aprovadas do seu edifício
DROP POLICY IF EXISTS atas_condomino_select ON v2_condominios.atas;
CREATE POLICY atas_condomino_select ON v2_condominios.atas
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND estado IN ('aprovada', 'arquivada')
    AND assembleia_id IN (
      SELECT a.id FROM v2_condominios.assembleias a
      WHERE a.edificio_id = ANY(v2_condominios.get_my_edificios())
    )
  );


-- --------------------------------------------------------
-- 12. CONVOCATORIAS
-- Domínio: assembleia-condo (Assie)
-- Convocatórias geradas por assembleia.
-- CASCADE: convocatória é parte da assembleia.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.convocatorias (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id     uuid          NOT NULL
    REFERENCES v2_condominios.assembleias(id) ON DELETE CASCADE,
  conteudo          text          NOT NULL,         -- texto completo da convocatória
  data_envio_previsto date        NOT NULL,         -- deve ser >= 10 dias antes da assembleia
  data_envio_real   timestamptz,
  enviada           boolean       NOT NULL DEFAULT false,
  destinatarios_count integer     DEFAULT 0,        -- quantos condóminos foram convocados
  approval_item_id  uuid,                           -- ref para system.approvals_queue
  gerada_por        text          NOT NULL DEFAULT 'assembleia-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.convocatorias IS
  'Convocatórias geradas por assembleia. CASCADE: apagar assembleia apaga convocatória. data_envio_previsto >= data_assembleia - 10 dias (art. 1431º CC).';

CREATE TRIGGER trg_convocatorias_updated_at
  BEFORE UPDATE ON v2_condominios.convocatorias
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_convocatorias_assembleia ON v2_condominios.convocatorias(assembleia_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_enviada ON v2_condominios.convocatorias(enviada) WHERE enviada = false;

-- RLS
ALTER TABLE v2_condominios.convocatorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS convocatorias_staff_all ON v2_condominios.convocatorias;
CREATE POLICY convocatorias_staff_all ON v2_condominios.convocatorias
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê convocatórias enviadas do seu edifício
DROP POLICY IF EXISTS convocatorias_condomino_select ON v2_condominios.convocatorias;
CREATE POLICY convocatorias_condomino_select ON v2_condominios.convocatorias
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND enviada = true
    AND assembleia_id IN (
      SELECT a.id FROM v2_condominios.assembleias a
      WHERE a.edificio_id = ANY(v2_condominios.get_my_edificios())
    )
  );


-- --------------------------------------------------------
-- 13. COMUNICACOES
-- Domínio: comunicacao-condo (Cami)
-- Registo imutável de todas as comunicações enviadas.
-- Esta tabela é a prova legal de que a comunicação foi enviada.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.comunicacoes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  condomino_id      uuid
    REFERENCES v2_condominios.condominos(id) ON DELETE SET NULL,
  destinatario_email text,
  destinatario_tel  text,
  canal             v2_condominios.canal_comunicacao NOT NULL,
  tipo_comunicacao  text          NOT NULL,         -- ex: 'aviso_mora', 'quota', 'convocatoria'
  assunto           text          NOT NULL,
  conteudo          text          NOT NULL,         -- conteúdo enviado (prova legal)
  estado            v2_condominios.estado_envio NOT NULL DEFAULT 'enviado',
  enviado_em        timestamptz   NOT NULL DEFAULT now(),
  entregue_em       timestamptz,
  bounce_em         timestamptz,
  resend_message_id text,                          -- ID da mensagem Resend para tracking
  approval_item_id  uuid,                          -- ref para system.approvals_queue que autorizou
  enviado_por       text          NOT NULL DEFAULT 'comunicacao-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.comunicacoes IS
  'Registo imutável de comunicações enviadas. É a prova legal de envio (aviso de mora, convocatória). UPDATE só para tracking de entrega.';
COMMENT ON COLUMN v2_condominios.comunicacoes.condomino_id IS
  'SET NULL: histórico de comunicações mantém-se mesmo se condómino sair.';
COMMENT ON COLUMN v2_condominios.comunicacoes.conteudo IS
  'Conteúdo completo enviado — não a template, mas o conteúdo personalizado final (prova legal).';

CREATE TRIGGER trg_comunicacoes_updated_at
  BEFORE UPDATE ON v2_condominios.comunicacoes
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_comunicacoes_edificio ON v2_condominios.comunicacoes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_comunicacoes_condomino ON v2_condominios.comunicacoes(condomino_id);
CREATE INDEX IF NOT EXISTS idx_comunicacoes_estado ON v2_condominios.comunicacoes(estado);
CREATE INDEX IF NOT EXISTS idx_comunicacoes_enviado_em ON v2_condominios.comunicacoes(enviado_em);
-- Anti-spam: verificar mesmo tipo ao mesmo condómino no mesmo dia (Cami Standard)
CREATE INDEX IF NOT EXISTS idx_comunicacoes_antispam
  ON v2_condominios.comunicacoes(condomino_id, tipo_comunicacao, enviado_em);

-- RLS — comunicações são dados sensíveis (conteúdo de avisos de mora)
ALTER TABLE v2_condominios.comunicacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comunicacoes_staff_all ON v2_condominios.comunicacoes;
CREATE POLICY comunicacoes_staff_all ON v2_condominios.comunicacoes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê só as comunicações que lhe foram enviadas
DROP POLICY IF EXISTS comunicacoes_condomino_select ON v2_condominios.comunicacoes;
CREATE POLICY comunicacoes_condomino_select ON v2_condominios.comunicacoes
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND condomino_id IN (
      SELECT c.id FROM v2_condominios.condominos c
      JOIN core.pessoas p ON p.id = c.pessoa_id
      WHERE p.auth_user_id = auth.uid()
    )
  );


-- --------------------------------------------------------
-- 14. HISTORICO_PEDIDOS
-- Domínio: atendimento-condo (Ana)
-- Histórico de todos os pedidos recebidos de condóminos.
-- Equivale ao registo de correspondência recebida.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.historico_pedidos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  condomino_id      uuid
    REFERENCES v2_condominios.condominos(id) ON DELETE SET NULL,
  tipo              v2_condominios.tipo_pedido NOT NULL,
  urgencia          v2_condominios.urgencia NOT NULL DEFAULT 'normal',
  descricao         text          NOT NULL,         -- transcrição do pedido original
  canal_entrada     v2_condominios.canal_comunicacao, -- como chegou (email, portal, etc)
  remetente_email   text,
  remetente_tel     text,
  confianca_classificacao numeric(5,2),            -- confiança da Ana na classificação (0-100)
  employee_destino  text,                          -- ex: 'financeiro-condo', 'manutencao-condo'
  inbox_item_id     uuid,                          -- ref para system.inbox_items gerado
  resolvido         boolean       NOT NULL DEFAULT false,
  resolucao         text,
  resolvido_em      timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_condominios.historico_pedidos IS
  'Registo de todos os pedidos recebidos. Ana (atendimento-condo) escreve. Equivalent ao livro de correspondência recebida.';
COMMENT ON COLUMN v2_condominios.historico_pedidos.confianca_classificacao IS
  '<80% → Ana marca como "necessita verificação" (Ana Standard).';

CREATE TRIGGER trg_historico_pedidos_updated_at
  BEFORE UPDATE ON v2_condominios.historico_pedidos
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pedidos_edificio ON v2_condominios.historico_pedidos(edificio_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_condomino ON v2_condominios.historico_pedidos(condomino_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo ON v2_condominios.historico_pedidos(tipo);
CREATE INDEX IF NOT EXISTS idx_pedidos_urgencia ON v2_condominios.historico_pedidos(urgencia);
CREATE INDEX IF NOT EXISTS idx_pedidos_resolvido ON v2_condominios.historico_pedidos(resolvido) WHERE resolvido = false;
-- Para flag da Ana: >3 pedidos do mesmo condómino em <24h
CREATE INDEX IF NOT EXISTS idx_pedidos_condomino_tempo
  ON v2_condominios.historico_pedidos(condomino_id, created_at);

-- RLS
ALTER TABLE v2_condominios.historico_pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedidos_staff_all ON v2_condominios.historico_pedidos;
CREATE POLICY pedidos_staff_all ON v2_condominios.historico_pedidos
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê os seus próprios pedidos
DROP POLICY IF EXISTS pedidos_condomino_select ON v2_condominios.historico_pedidos;
CREATE POLICY pedidos_condomino_select ON v2_condominios.historico_pedidos
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND condomino_id IN (
      SELECT c.id FROM v2_condominios.condominos c
      JOIN core.pessoas p ON p.id = c.pessoa_id
      WHERE p.auth_user_id = auth.uid()
    )
  );


-- --------------------------------------------------------
-- 15. CARREGADORES_CONTAGENS
-- Domínio: energia-condo (Enzo)
-- Contagens de kWh por posto EV e por condómino.
-- Base para facturação mensal de carregadores.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.carregadores_contagens (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL
    REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  fracao_id         uuid          NOT NULL
    REFERENCES v2_condominios.fracoes(id) ON DELETE RESTRICT,
  posto_id          text          NOT NULL,         -- identificador do posto EV
  periodo           date          NOT NULL,         -- mês (sempre dia 1)
  kwh_consumidos    numeric(10,3) NOT NULL CHECK (kwh_consumidos >= 0),
  tarifa_kwh        numeric(8,4)  NOT NULL,         -- €/kWh aplicado (tarifa partes comuns)
  valor_calculado   numeric(10,2) GENERATED ALWAYS AS (
    round(kwh_consumidos * tarifa_kwh, 2)
  ) STORED,
  faturado          boolean       NOT NULL DEFAULT false,
  fatura_id         uuid
    REFERENCES v2_condominios.faturas_pendentes(id) ON DELETE SET NULL,
  leitura_inicial   numeric(10,3),
  leitura_final     numeric(10,3),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (fracao_id, posto_id, periodo)            -- uma contagem por posto por fracção por mês
);

COMMENT ON TABLE v2_condominios.carregadores_contagens IS
  'Contagens de kWh por posto EV. valor_calculado é coluna gerada (kwh × tarifa). Enzo (energia-condo) processa no Dia 1.';
COMMENT ON COLUMN v2_condominios.carregadores_contagens.fracao_id IS
  'RESTRICT: contagem EV tem de ter fracção identificada — não existe contagem "anónima".';
COMMENT ON COLUMN v2_condominios.carregadores_contagens.valor_calculado IS
  'Coluna calculada automaticamente: kwh_consumidos × tarifa_kwh. Nunca editar directamente.';

CREATE TRIGGER trg_carregadores_updated_at
  BEFORE UPDATE ON v2_condominios.carregadores_contagens
  FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_carregadores_edificio ON v2_condominios.carregadores_contagens(edificio_id);
CREATE INDEX IF NOT EXISTS idx_carregadores_fracao ON v2_condominios.carregadores_contagens(fracao_id);
CREATE INDEX IF NOT EXISTS idx_carregadores_periodo ON v2_condominios.carregadores_contagens(periodo);
CREATE INDEX IF NOT EXISTS idx_carregadores_faturado ON v2_condominios.carregadores_contagens(faturado) WHERE faturado = false;
-- Flag: posto sem leitura >30 dias (Enzo Daily Flag)
CREATE INDEX IF NOT EXISTS idx_carregadores_posto_periodo
  ON v2_condominios.carregadores_contagens(posto_id, periodo);

-- RLS
ALTER TABLE v2_condominios.carregadores_contagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS carregadores_staff_all ON v2_condominios.carregadores_contagens;
CREATE POLICY carregadores_staff_all ON v2_condominios.carregadores_contagens
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Condómino vê só as suas próprias contagens
DROP POLICY IF EXISTS carregadores_condomino_select ON v2_condominios.carregadores_contagens;
CREATE POLICY carregadores_condomino_select ON v2_condominios.carregadores_contagens
  FOR SELECT TO authenticated
  USING (
    NOT public.is_staff()
    AND fracao_id IN (
      SELECT c.fracao_id FROM v2_condominios.condominos c
      JOIN core.pessoas p ON p.id = c.pessoa_id
      WHERE p.auth_user_id = auth.uid() AND c.activo = true
    )
  );


-- --------------------------------------------------------
-- 16. AUDIT_LOG
-- Domínio: todos os employees (escrita), compliance-condo (leitura)
-- Log imutável de todas as acções dos AI employees.
-- Sem FKs para permitir registo mesmo quando entidades são apagadas.
-- Análogo ao diário de auditoria de uma contabilidade.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS v2_condominios.audit_log (
  id                bigserial     PRIMARY KEY,     -- bigserial: escrita intensa, sem need de UUID
  edificio_id       uuid,                          -- sem FK — registo sobrevive a deleções
  fracao_id         uuid,
  condomino_id      uuid,
  employee          text          NOT NULL,         -- ex: 'financeiro-condo', 'assembleia-condo'
  accao             text          NOT NULL,         -- ex: 'quota_gerada', 'mora_detectada'
  tabela_afectada   text,                          -- ex: 'recebimentos', 'faturas_pendentes'
  registo_id        uuid,                          -- ID do registo afectado (sem FK)
  dados_antes       jsonb,                         -- estado anterior (para UPDATE/DELETE)
  dados_depois      jsonb,                         -- estado novo (para INSERT/UPDATE)
  inbox_item_id     uuid,                          -- ref para system.inbox_items relacionado
  approval_item_id  uuid,                          -- ref para system.approvals_queue relacionado
  ip_origem         inet,                          -- IP da Edge Function (observabilidade)
  created_at        timestamptz   NOT NULL DEFAULT now()
  -- Sem updated_at: audit_log é IMUTÁVEL
);

COMMENT ON TABLE v2_condominios.audit_log IS
  'Log imutável de acções dos AI employees. bigserial (não UUID) pela intensidade de escrita. Sem FKs: log sobrevive a deleções de entidades. Sem updated_at: nunca se actualiza.';
COMMENT ON COLUMN v2_condominios.audit_log.id IS
  'bigserial: escrita frequente (cada acção de cada employee). UUID teria overhead desnecessário.';
COMMENT ON COLUMN v2_condominios.audit_log.dados_antes IS
  'Estado JSONB da linha antes da alteração. NULL para INSERT.';

-- Índices de observabilidade
CREATE INDEX IF NOT EXISTS idx_audit_edificio ON v2_condominios.audit_log(edificio_id);
CREATE INDEX IF NOT EXISTS idx_audit_employee ON v2_condominios.audit_log(employee);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON v2_condominios.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_accao ON v2_condominios.audit_log(accao);
-- Índice composto para Clara: mora grave por edifício no tempo
CREATE INDEX IF NOT EXISTS idx_audit_edificio_accao
  ON v2_condominios.audit_log(edificio_id, accao, created_at DESC);

-- RLS — audit_log: só staff lê, só staff escreve
ALTER TABLE v2_condominios.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_staff_all ON v2_condominios.audit_log;
CREATE POLICY audit_log_staff_all ON v2_condominios.audit_log
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
-- anon e condóminos: negado (sem política = deny by default)


-- --------------------------------------------------------
-- GRANTS — schema e tabelas
-- --------------------------------------------------------

GRANT USAGE ON SCHEMA v2_condominios TO authenticated;
GRANT USAGE ON SCHEMA v2_condominios TO anon;

-- authenticated: acesso a tabelas via RLS (as políticas controlam o que vêem)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA v2_condominios TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE v2_condominios.audit_log_id_seq TO authenticated;

-- anon: sem acesso (RLS bloqueia tudo sem policy)
-- Nota: GRANT USAGE no schema é necessário para que PostgREST consiga fazer introspection,
-- mas as políticas RLS negam tudo para anon (deny by default).

-- --------------------------------------------------------
-- RELOAD PGRST
-- --------------------------------------------------------

NOTIFY pgrst, 'reload schema';
```

---

## Diagrama de dependências (simplificado)

```
core.imoveis (edificio_id)
  └── fracoes
        ├── condominos ←── core.pessoas
        ├── recebimentos
        │     └── extrato_bancario
        ├── faturas_pendentes ←── carregadores_contagens
        │     └── documentos
        │           ├── faturas_ocr (CASCADE)
        │           └── documentos_drive (CASCADE)
        ├── seguro_fracoes
        └── carregadores_contagens

core.imoveis (edificio_id)
  ├── assembleias
  │     ├── atas (RESTRICT)
  │     └── convocatorias (CASCADE)
  ├── extrato_bancario
  ├── comunicacoes
  ├── historico_pedidos
  └── audit_log (sem FK)
```

---

## Notas de implementação — o que verificar antes de aplicar

### 1. `core.imoveis` e `core.pessoas` existem?

As FKs assumem que estas tabelas já existem. Se não existirem, a migration vai falhar com erro de FK.
Verificar com `list_tables(schemas=['core'])` antes de aplicar.

### 2. `public.is_staff()` existe?

Assumido que sim (criado em Sprint 3.4D). Se não existir, a migration cria as políticas mas vão falhar em runtime.
Verificar antes de aplicar.

### 3. `core.pessoas` tem coluna `auth_user_id`?

A função `get_my_edificios()` e várias políticas de condómino assumem `core.pessoas.auth_user_id = auth.uid()`.
Se a coluna não existir ou tiver nome diferente, ajustar as políticas.

### 4. Ordem de criação — forward reference

A tabela `faturas_pendentes` tem `documento_id` como forward reference para `documentos`.
A FK `fk_faturas_documento` é adicionada via ALTER TABLE após a criação de `documentos`. Esta sequência já está correcta no DDL.

### 5. Coluna `valor_calculado` em `carregadores_contagens`

É uma coluna GENERATED ALWAYS AS (computed). Requer Postgres 12+ (supabase usa Postgres 15 — OK).
O agente não pode fazer INSERT nesta coluna; o valor é calculado automaticamente.

### 6. bigserial em `audit_log`

Escolhido por intensidade de escrita (todos os employees escrevem aqui a cada acção).
O overhead de UUIDs aleatórios (gen_random_uuid) em tabelas write-heavy é significativo.
bigserial com índice B-tree em `created_at DESC` é o padrão para tabelas de log.

---

## Ficheiro de migration a criar

```
apps/v5-manutencao/supabase/migrations/20260505HHMM_v2_condominios_schema.sql
```

Substituir `HHMM` pela hora de aplicação após aprovação de Mário.

---

## Checklist de validação (após aplicar)

- [ ] Schema `v2_condominios` criado: `SELECT schema_name FROM information_schema.schemata WHERE schema_name='v2_condominios'`
- [ ] 16 tabelas criadas: `SELECT count(*) FROM information_schema.tables WHERE table_schema='v2_condominios'`
- [ ] RLS activo em todas: `SELECT tablename FROM pg_tables WHERE schemaname='v2_condominios' AND rowsecurity=false` (deve retornar 0 linhas)
- [ ] Função helper: `SELECT v2_condominios.get_my_edificios()` (deve retornar `{}` sem erro)
- [ ] Coluna calculada: inserir em `carregadores_contagens` e verificar `valor_calculado`
- [ ] FK circular não existe (ordem de criação correta)
- [ ] Enums criados: `SELECT typname FROM pg_type WHERE typnamespace=(SELECT oid FROM pg_namespace WHERE nspname='v2_condominios')`
```
