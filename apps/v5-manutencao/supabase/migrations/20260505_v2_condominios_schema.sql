-- =============================================================
-- MIGRATION: v2_condominios schema — AI-native condo management
-- Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
-- Data: 2026-05-05
-- Autor: supabase-designer
-- Aprovação: Mário Carvalho (aprovação explícita sessão 2026-05-05)
-- Aplicado com sucesso: 2026-05-05
-- =============================================================
-- 16 tabelas: fracoes, condominos, recebimentos, extrato_bancario,
--   faturas_pendentes, documentos, faturas_ocr, documentos_drive,
--   seguro_fracoes, assembleias, atas, convocatorias, comunicacoes,
--   historico_pedidos, carregadores_contagens, audit_log
-- 13 enum types em v2_condominios
-- Funções helper: set_updated_at(), get_my_edificios()
-- RLS: staff ALL, condómino SELECT por edificio/pessoa, anon NEGADO
-- Nota técnica: get_my_edificios() em plpgsql (não sql) para evitar
--   binding antecipado de referências a tabelas não existentes ainda.
--   tipo_documento inclui 'convocatoria' (adicionado vs design original).
-- =============================================================

CREATE SCHEMA IF NOT EXISTS v2_condominios;

-- ENUM TYPES
DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_fracao AS ENUM ('activa', 'devoluta', 'obras', 'inactiva');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.tipo_condomino AS ENUM ('proprietario', 'inquilino', 'usufrutuario', 'procurador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_recebimento AS ENUM ('pendente', 'pago', 'mora', 'acordo', 'incobravel', 'anulado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_fatura AS ENUM ('pendente', 'aprovada', 'paga', 'rejeitada', 'anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- tipo_documento inclui 'convocatoria' (documentos de convocatórias de assembleia)
DO $$ BEGIN
  CREATE TYPE v2_condominios.tipo_documento AS ENUM ('fatura', 'ata', 'convocatoria', 'contrato', 'apolice', 'extrato', 'certidao', 'planta', 'correspondencia', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_ocr AS ENUM ('processado', 'pendente_revisao', 'rejeitado', 'sem_ocr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_assembleia AS ENUM ('agendada', 'realizada', 'cancelada', 'adiada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.tipo_assembleia AS ENUM ('ordinaria', 'extraordinaria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_ata AS ENUM ('rascunho', 'aprovada', 'arquivada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.canal_comunicacao AS ENUM ('email', 'sms', 'carta', 'portal', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.estado_envio AS ENUM ('enviado', 'entregue', 'bounce', 'erro', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.tipo_pedido AS ENUM ('avaria_urgente', 'avaria_normal', 'quota', 'pagamento', 'acordo_mora', 'documento', 'upload', 'assembleia', 'ata', 'reclamacao', 'seguro', 'energia', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE v2_condominios.urgencia AS ENUM ('emergencia', 'urgente', 'normal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TRIGGER HELPER (sem referências a tabelas — seguro criar antes)
CREATE OR REPLACE FUNCTION v2_condominios.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. FRACOES
CREATE TABLE IF NOT EXISTS v2_condominios.fracoes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL REFERENCES core.imoveis(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  codigo            text          NOT NULL,
  descricao         text,
  permilagem        numeric(10,4) NOT NULL CHECK (permilagem > 0 AND permilagem <= 1000),
  quota_base        numeric(10,2) NOT NULL DEFAULT 0 CHECK (quota_base >= 0),
  estado            v2_condominios.estado_fracao NOT NULL DEFAULT 'activa',
  tem_ev            boolean       NOT NULL DEFAULT false,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (edificio_id, codigo)
);
COMMENT ON TABLE v2_condominios.fracoes IS 'Fracções autónomas de cada edifício. permilagem com 4 casas decimais (regra Fina Standard).';
COMMENT ON COLUMN v2_condominios.fracoes.permilagem IS 'Milésimos da fracção no total do edifício. Nunca arredondar — 4 casas decimais.';
COMMENT ON COLUMN v2_condominios.fracoes.quota_base IS 'Quota mensal em euros deliberada em assembleia. quota_individual = quota_base × (permilagem/1000).';
CREATE TRIGGER trg_fracoes_updated_at BEFORE UPDATE ON v2_condominios.fracoes FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_fracoes_edificio ON v2_condominios.fracoes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_fracoes_estado ON v2_condominios.fracoes(estado);
CREATE INDEX IF NOT EXISTS idx_fracoes_tem_ev ON v2_condominios.fracoes(tem_ev) WHERE tem_ev = true;

-- 2. CONDOMINOS
CREATE TABLE IF NOT EXISTS v2_condominios.condominos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         uuid          NOT NULL REFERENCES core.pessoas(id) ON DELETE RESTRICT,
  fracao_id         uuid          NOT NULL REFERENCES v2_condominios.fracoes(id) ON DELETE RESTRICT,
  tipo              v2_condominios.tipo_condomino NOT NULL DEFAULT 'proprietario',
  activo            boolean       NOT NULL DEFAULT true,
  data_inicio       date          NOT NULL,
  data_fim          date,
  is_administrador  boolean       NOT NULL DEFAULT false,
  notas             text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (pessoa_id, fracao_id, data_inicio)
);
COMMENT ON TABLE v2_condominios.condominos IS 'Relação entre pessoas (core.pessoas) e fracções. Um condómino pode ter várias fracções.';
COMMENT ON COLUMN v2_condominios.condominos.is_administrador IS 'Administrador eleito do condomínio (deliberado em assembleia). Só um por edifício activo.';
CREATE TRIGGER trg_condominos_updated_at BEFORE UPDATE ON v2_condominios.condominos FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_condominos_pessoa ON v2_condominios.condominos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_condominos_fracao ON v2_condominios.condominos(fracao_id);
CREATE INDEX IF NOT EXISTS idx_condominos_activo ON v2_condominios.condominos(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_condominos_administrador ON v2_condominios.condominos(is_administrador) WHERE is_administrador = true;

-- get_my_edificios() criada APÓS fracoes e condominos existirem
-- plpgsql (não sql) para evitar binding antecipado de referências a tabelas
CREATE OR REPLACE FUNCTION v2_condominios.get_my_edificios()
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = v2_condominios, core, public AS $$
DECLARE
  result uuid[];
BEGIN
  SELECT COALESCE(ARRAY_AGG(DISTINCT f.edificio_id), '{}'::uuid[])
  INTO result
  FROM v2_condominios.condominos c
  JOIN v2_condominios.fracoes f ON f.id = c.fracao_id
  JOIN core.pessoas p ON p.id = c.pessoa_id
  WHERE p.auth_user_id = auth.uid()
    AND c.activo = true;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION v2_condominios.get_my_edificios() TO authenticated;

-- RLS fracoes
ALTER TABLE v2_condominios.fracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fracoes_staff_all ON v2_condominios.fracoes;
CREATE POLICY fracoes_staff_all ON v2_condominios.fracoes FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS fracoes_condomino_select ON v2_condominios.fracoes;
CREATE POLICY fracoes_condomino_select ON v2_condominios.fracoes FOR SELECT TO authenticated USING (NOT public.is_staff() AND edificio_id = ANY(v2_condominios.get_my_edificios()));

-- RLS condominos
ALTER TABLE v2_condominios.condominos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS condominos_staff_all ON v2_condominios.condominos;
CREATE POLICY condominos_staff_all ON v2_condominios.condominos FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS condominos_self_select ON v2_condominios.condominos;
CREATE POLICY condominos_self_select ON v2_condominios.condominos FOR SELECT TO authenticated USING (NOT public.is_staff() AND pessoa_id IN (SELECT p.id FROM core.pessoas p WHERE p.auth_user_id = auth.uid()));

-- 3. RECEBIMENTOS
CREATE TABLE IF NOT EXISTS v2_condominios.recebimentos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fracao_id         uuid          NOT NULL REFERENCES v2_condominios.fracoes(id) ON DELETE RESTRICT,
  condomino_id      uuid          REFERENCES v2_condominios.condominos(id) ON DELETE SET NULL,
  periodo           date          NOT NULL,
  valor_emitido     numeric(10,2) NOT NULL CHECK (valor_emitido > 0),
  valor_pago        numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_pago >= 0),
  vencimento        date          NOT NULL,
  data_pagamento    date,
  estado            v2_condominios.estado_recebimento NOT NULL DEFAULT 'pendente',
  referencia_mb     text,
  observacoes       text,
  gerado_por        text          NOT NULL DEFAULT 'financeiro-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (fracao_id, periodo)
);
COMMENT ON TABLE v2_condominios.recebimentos IS 'Quotas emitidas e pagas por fracção. Uma linha por fracção por mês. Equivale a débito no diário de cada condómino.';
COMMENT ON COLUMN v2_condominios.recebimentos.periodo IS 'Mês a que respeita a quota. Sempre o dia 1 do mês (ex: 2026-05-01 = quota de Maio 2026).';
COMMENT ON COLUMN v2_condominios.recebimentos.condomino_id IS 'SET NULL: se condómino sair, o histórico financeiro mantém-se para auditoria.';
CREATE TRIGGER trg_recebimentos_updated_at BEFORE UPDATE ON v2_condominios.recebimentos FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_recebimentos_fracao ON v2_condominios.recebimentos(fracao_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_condomino ON v2_condominios.recebimentos(condomino_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_estado ON v2_condominios.recebimentos(estado);
CREATE INDEX IF NOT EXISTS idx_recebimentos_vencimento ON v2_condominios.recebimentos(vencimento);
CREATE INDEX IF NOT EXISTS idx_recebimentos_periodo ON v2_condominios.recebimentos(periodo);
CREATE INDEX IF NOT EXISTS idx_recebimentos_mora_check ON v2_condominios.recebimentos(estado, vencimento) WHERE estado IN ('pendente', 'mora');
ALTER TABLE v2_condominios.recebimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recebimentos_staff_all ON v2_condominios.recebimentos;
CREATE POLICY recebimentos_staff_all ON v2_condominios.recebimentos FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS recebimentos_condomino_select ON v2_condominios.recebimentos;
CREATE POLICY recebimentos_condomino_select ON v2_condominios.recebimentos FOR SELECT TO authenticated USING (NOT public.is_staff() AND fracao_id IN (SELECT c.fracao_id FROM v2_condominios.condominos c JOIN core.pessoas p ON p.id = c.pessoa_id WHERE p.auth_user_id = auth.uid() AND c.activo = true));

-- 4. EXTRATO_BANCARIO
CREATE TABLE IF NOT EXISTS v2_condominios.extrato_bancario (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id         uuid          NOT NULL REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  data_movimento      date          NOT NULL,
  descricao           text          NOT NULL,
  valor               numeric(12,2) NOT NULL,
  saldo_apos          numeric(12,2),
  fracao_id           uuid          REFERENCES v2_condominios.fracoes(id) ON DELETE SET NULL,
  recebimento_id      uuid          REFERENCES v2_condominios.recebimentos(id) ON DELETE SET NULL,
  reconciliado        boolean       NOT NULL DEFAULT false,
  referencia_banco    text,
  importado_em        timestamptz   NOT NULL DEFAULT now(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.extrato_bancario IS 'Movimentos bancários por edifício para reconciliação com recebimentos. valor positivo=crédito, negativo=débito.';
COMMENT ON COLUMN v2_condominios.extrato_bancario.fracao_id IS 'SET NULL: movimento pode não ter fracção identificada (ex: transferência das partes comuns).';
CREATE TRIGGER trg_extrato_bancario_updated_at BEFORE UPDATE ON v2_condominios.extrato_bancario FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_extrato_edificio ON v2_condominios.extrato_bancario(edificio_id);
CREATE INDEX IF NOT EXISTS idx_extrato_data ON v2_condominios.extrato_bancario(data_movimento);
CREATE INDEX IF NOT EXISTS idx_extrato_reconciliado ON v2_condominios.extrato_bancario(reconciliado) WHERE reconciliado = false;
CREATE INDEX IF NOT EXISTS idx_extrato_fracao ON v2_condominios.extrato_bancario(fracao_id);
CREATE INDEX IF NOT EXISTS idx_extrato_recebimento ON v2_condominios.extrato_bancario(recebimento_id);
ALTER TABLE v2_condominios.extrato_bancario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS extrato_staff_all ON v2_condominios.extrato_bancario;
CREATE POLICY extrato_staff_all ON v2_condominios.extrato_bancario FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 5. FATURAS_PENDENTES (sem FK para documentos ainda — forward ref)
CREATE TABLE IF NOT EXISTS v2_condominios.faturas_pendentes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  fracao_id         uuid          REFERENCES v2_condominios.fracoes(id) ON DELETE SET NULL,
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
  documento_id      uuid,
  approval_item_id  uuid,
  criado_por        text          NOT NULL DEFAULT 'docs-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.faturas_pendentes IS 'Faturas de fornecedores a pagar. Equivale ao razão auxiliar de fornecedores (contas a pagar). fracao_id NULL = partes comuns.';
COMMENT ON COLUMN v2_condominios.faturas_pendentes.fracao_id IS 'SET NULL: fatura das partes comuns do edifício não tem fracção específica.';
CREATE TRIGGER trg_faturas_pendentes_updated_at BEFORE UPDATE ON v2_condominios.faturas_pendentes FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_faturas_edificio ON v2_condominios.faturas_pendentes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_faturas_estado ON v2_condominios.faturas_pendentes(estado);
CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON v2_condominios.faturas_pendentes(vencimento);
CREATE INDEX IF NOT EXISTS idx_faturas_fracao ON v2_condominios.faturas_pendentes(fracao_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pendentes_vencimento ON v2_condominios.faturas_pendentes(vencimento, estado) WHERE estado = 'pendente';
ALTER TABLE v2_condominios.faturas_pendentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS faturas_pendentes_staff_all ON v2_condominios.faturas_pendentes;
CREATE POLICY faturas_pendentes_staff_all ON v2_condominios.faturas_pendentes FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 6. DOCUMENTOS
CREATE TABLE IF NOT EXISTS v2_condominios.documentos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  fracao_id         uuid          REFERENCES v2_condominios.fracoes(id) ON DELETE SET NULL,
  tipo              v2_condominios.tipo_documento NOT NULL,
  titulo            text          NOT NULL,
  filename_original text,
  filename_norm     text,
  tamanho_bytes     bigint,
  mime_type         text,
  hash_sha256       text,
  estado_ocr        v2_condominios.estado_ocr NOT NULL DEFAULT 'sem_ocr',
  confianca_ocr     numeric(5,2),
  processado_em     timestamptz,
  criado_por        text          NOT NULL DEFAULT 'docs-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.documentos IS 'Registo central de todos os documentos. Dora (docs-condo) é a única a escrever. Outros employees lêem.';
COMMENT ON COLUMN v2_condominios.documentos.hash_sha256 IS 'SHA-256 do ficheiro para detecção de duplicados (Dora Standard).';
COMMENT ON COLUMN v2_condominios.documentos.confianca_ocr IS 'Confiança do OCR em percentagem. <90 → pendente_revisao; >=90 → processado automático.';

-- Forward FK: faturas_pendentes → documentos (agora que documentos existe)
ALTER TABLE v2_condominios.faturas_pendentes ADD CONSTRAINT fk_faturas_documento FOREIGN KEY (documento_id) REFERENCES v2_condominios.documentos(id) ON DELETE SET NULL;

CREATE TRIGGER trg_documentos_updated_at BEFORE UPDATE ON v2_condominios.documentos FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_documentos_edificio ON v2_condominios.documentos(edificio_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON v2_condominios.documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_estado_ocr ON v2_condominios.documentos(estado_ocr);
CREATE INDEX IF NOT EXISTS idx_documentos_fracao ON v2_condominios.documentos(fracao_id);
CREATE INDEX IF NOT EXISTS idx_documentos_hash ON v2_condominios.documentos(hash_sha256) WHERE hash_sha256 IS NOT NULL;
ALTER TABLE v2_condominios.documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documentos_staff_all ON v2_condominios.documentos;
CREATE POLICY documentos_staff_all ON v2_condominios.documentos FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS documentos_condomino_select ON v2_condominios.documentos;
CREATE POLICY documentos_condomino_select ON v2_condominios.documentos FOR SELECT TO authenticated USING (NOT public.is_staff() AND edificio_id = ANY(v2_condominios.get_my_edificios()) AND tipo IN ('ata', 'convocatoria', 'correspondencia'));

-- 7. FATURAS_OCR
CREATE TABLE IF NOT EXISTS v2_condominios.faturas_ocr (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id      uuid          NOT NULL REFERENCES v2_condominios.documentos(id) ON DELETE CASCADE,
  fornecedor_nome   text,
  fornecedor_nif    text,
  numero_fatura     text,
  data_fatura       date,
  data_vencimento   date,
  valor_liquido     numeric(10,2),
  valor_iva         numeric(10,2),
  valor_total       numeric(10,2),
  descricao_servico text,
  conf_fornecedor   numeric(5,2),
  conf_nif          numeric(5,2),
  conf_numero       numeric(5,2),
  conf_valor        numeric(5,2),
  conf_data         numeric(5,2),
  modelo_ocr        text          NOT NULL DEFAULT 'claude-vision',
  raw_extraction    jsonb,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.faturas_ocr IS 'Dados estruturados extraídos por OCR. CASCADE com documentos — são a mesma entidade. Confiança por campo para auditoria.';
CREATE TRIGGER trg_faturas_ocr_updated_at BEFORE UPDATE ON v2_condominios.faturas_ocr FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_faturas_ocr_documento ON v2_condominios.faturas_ocr(documento_id);
CREATE INDEX IF NOT EXISTS idx_faturas_ocr_nif ON v2_condominios.faturas_ocr(fornecedor_nif) WHERE fornecedor_nif IS NOT NULL;
ALTER TABLE v2_condominios.faturas_ocr ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS faturas_ocr_staff_all ON v2_condominios.faturas_ocr;
CREATE POLICY faturas_ocr_staff_all ON v2_condominios.faturas_ocr FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 8. DOCUMENTOS_DRIVE
CREATE TABLE IF NOT EXISTS v2_condominios.documentos_drive (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id      uuid          NOT NULL REFERENCES v2_condominios.documentos(id) ON DELETE CASCADE,
  drive_file_id     text          NOT NULL,
  drive_url         text          NOT NULL,
  drive_folder_path text,
  versao            integer       NOT NULL DEFAULT 1,
  activo            boolean       NOT NULL DEFAULT true,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (documento_id, versao)
);
COMMENT ON TABLE v2_condominios.documentos_drive IS 'Links permanentes Google Drive. CASCADE com documentos. Uma linha por versão do ficheiro.';
CREATE TRIGGER trg_documentos_drive_updated_at BEFORE UPDATE ON v2_condominios.documentos_drive FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_docs_drive_documento ON v2_condominios.documentos_drive(documento_id);
CREATE INDEX IF NOT EXISTS idx_docs_drive_file_id ON v2_condominios.documentos_drive(drive_file_id);
ALTER TABLE v2_condominios.documentos_drive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS docs_drive_staff_all ON v2_condominios.documentos_drive;
CREATE POLICY docs_drive_staff_all ON v2_condominios.documentos_drive FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS docs_drive_condomino_select ON v2_condominios.documentos_drive;
CREATE POLICY docs_drive_condomino_select ON v2_condominios.documentos_drive FOR SELECT TO authenticated USING (NOT public.is_staff() AND documento_id IN (SELECT d.id FROM v2_condominios.documentos d WHERE d.edificio_id = ANY(v2_condominios.get_my_edificios()) AND d.tipo IN ('ata', 'convocatoria', 'correspondencia')));

-- 9. SEGURO_FRACOES
CREATE TABLE IF NOT EXISTS v2_condominios.seguro_fracoes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fracao_id         uuid          NOT NULL REFERENCES v2_condominios.fracoes(id) ON DELETE RESTRICT,
  seguradora        text          NOT NULL,
  numero_apolice    text          NOT NULL,
  coberturas        text[],
  capital_seguro    numeric(12,2),
  premio_anual      numeric(10,2),
  data_inicio       date          NOT NULL,
  data_fim          date          NOT NULL,
  data_renovacao    date,
  activa            boolean       NOT NULL DEFAULT true,
  documento_id      uuid          REFERENCES v2_condominios.documentos(id) ON DELETE SET NULL,
  observacoes       text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.seguro_fracoes IS 'Seguros individuais das fracções (seguro de conteúdo, RC, etc). Diferentes das apólices do condomínio em v3_seguros.apolices.';
CREATE TRIGGER trg_seguro_fracoes_updated_at BEFORE UPDATE ON v2_condominios.seguro_fracoes FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_seguro_fracoes_fracao ON v2_condominios.seguro_fracoes(fracao_id);
CREATE INDEX IF NOT EXISTS idx_seguro_fracoes_activa ON v2_condominios.seguro_fracoes(activa) WHERE activa = true;
CREATE INDEX IF NOT EXISTS idx_seguro_fracoes_data_fim ON v2_condominios.seguro_fracoes(data_fim);
CREATE INDEX IF NOT EXISTS idx_seguro_fracoes_renovacao ON v2_condominios.seguro_fracoes(data_fim, activa) WHERE activa = true;
ALTER TABLE v2_condominios.seguro_fracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS seguro_fracoes_staff_all ON v2_condominios.seguro_fracoes;
CREATE POLICY seguro_fracoes_staff_all ON v2_condominios.seguro_fracoes FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS seguro_fracoes_condomino_select ON v2_condominios.seguro_fracoes;
CREATE POLICY seguro_fracoes_condomino_select ON v2_condominios.seguro_fracoes FOR SELECT TO authenticated USING (NOT public.is_staff() AND fracao_id IN (SELECT c.fracao_id FROM v2_condominios.condominos c JOIN core.pessoas p ON p.id = c.pessoa_id WHERE p.auth_user_id = auth.uid() AND c.activo = true));

-- 10. ASSEMBLEIAS
CREATE TABLE IF NOT EXISTS v2_condominios.assembleias (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  tipo              v2_condominios.tipo_assembleia NOT NULL DEFAULT 'ordinaria',
  estado            v2_condominios.estado_assembleia NOT NULL DEFAULT 'agendada',
  data_proposta     date          NOT NULL,
  hora_inicio       time,
  local             text,
  ordem_trabalhos   text[],
  permilagem_presentes numeric(10,4),
  segunda_convocatoria boolean NOT NULL DEFAULT false,
  motivo_cancelamento text,
  ano_fiscal        integer       NOT NULL CHECK (ano_fiscal >= 2020),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.assembleias IS 'Histórico e agendamento de assembleias. Assie verifica prazo mínimo 10 dias (art. 1431º CC).';
COMMENT ON COLUMN v2_condominios.assembleias.permilagem_presentes IS 'Total de milésimos dos condóminos presentes (ou representados). Usado para validar quórum.';
COMMENT ON COLUMN v2_condominios.assembleias.segunda_convocatoria IS 'Em 2ª convocatória, qualquer número de condóminos delibera validamente (Assie Standard).';
CREATE TRIGGER trg_assembleias_updated_at BEFORE UPDATE ON v2_condominios.assembleias FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_assembleias_edificio ON v2_condominios.assembleias(edificio_id);
CREATE INDEX IF NOT EXISTS idx_assembleias_estado ON v2_condominios.assembleias(estado);
CREATE INDEX IF NOT EXISTS idx_assembleias_data ON v2_condominios.assembleias(data_proposta);
CREATE INDEX IF NOT EXISTS idx_assembleias_ano_tipo ON v2_condominios.assembleias(edificio_id, ano_fiscal, tipo);
ALTER TABLE v2_condominios.assembleias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assembleias_staff_all ON v2_condominios.assembleias;
CREATE POLICY assembleias_staff_all ON v2_condominios.assembleias FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS assembleias_condomino_select ON v2_condominios.assembleias;
CREATE POLICY assembleias_condomino_select ON v2_condominios.assembleias FOR SELECT TO authenticated USING (NOT public.is_staff() AND edificio_id = ANY(v2_condominios.get_my_edificios()));

-- 11. ATAS
CREATE TABLE IF NOT EXISTS v2_condominios.atas (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id     uuid          NOT NULL REFERENCES v2_condominios.assembleias(id) ON DELETE RESTRICT,
  estado            v2_condominios.estado_ata NOT NULL DEFAULT 'rascunho',
  conteudo          text          NOT NULL,
  deliberacoes      jsonb,
  aprovada_em       timestamptz,
  arquivada_em      timestamptz,
  documento_id      uuid          REFERENCES v2_condominios.documentos(id) ON DELETE SET NULL,
  redigida_por      text          NOT NULL DEFAULT 'assembleia-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.atas IS 'Atas das assembleias. RESTRICT: assembleia não se apaga enquanto tiver ata associada. deliberacoes em JSONB com validação de quórum.';
COMMENT ON COLUMN v2_condominios.atas.deliberacoes IS 'Array de deliberações: [{ponto, votacao_favor, votacao_contra, abst, permilagem_favor, resultado, valida, requer_unanimidade}]';
CREATE TRIGGER trg_atas_updated_at BEFORE UPDATE ON v2_condominios.atas FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_atas_assembleia ON v2_condominios.atas(assembleia_id);
CREATE INDEX IF NOT EXISTS idx_atas_estado ON v2_condominios.atas(estado);
ALTER TABLE v2_condominios.atas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS atas_staff_all ON v2_condominios.atas;
CREATE POLICY atas_staff_all ON v2_condominios.atas FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS atas_condomino_select ON v2_condominios.atas;
CREATE POLICY atas_condomino_select ON v2_condominios.atas FOR SELECT TO authenticated USING (NOT public.is_staff() AND estado IN ('aprovada', 'arquivada') AND assembleia_id IN (SELECT a.id FROM v2_condominios.assembleias a WHERE a.edificio_id = ANY(v2_condominios.get_my_edificios())));

-- 12. CONVOCATORIAS
CREATE TABLE IF NOT EXISTS v2_condominios.convocatorias (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id     uuid          NOT NULL REFERENCES v2_condominios.assembleias(id) ON DELETE CASCADE,
  conteudo          text          NOT NULL,
  data_envio_previsto date        NOT NULL,
  data_envio_real   timestamptz,
  enviada           boolean       NOT NULL DEFAULT false,
  destinatarios_count integer     DEFAULT 0,
  approval_item_id  uuid,
  gerada_por        text          NOT NULL DEFAULT 'assembleia-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.convocatorias IS 'Convocatórias geradas por assembleia. CASCADE: apagar assembleia apaga convocatória. data_envio_previsto >= data_assembleia - 10 dias (art. 1431º CC).';
CREATE TRIGGER trg_convocatorias_updated_at BEFORE UPDATE ON v2_condominios.convocatorias FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_convocatorias_assembleia ON v2_condominios.convocatorias(assembleia_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_enviada ON v2_condominios.convocatorias(enviada) WHERE enviada = false;
ALTER TABLE v2_condominios.convocatorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS convocatorias_staff_all ON v2_condominios.convocatorias;
CREATE POLICY convocatorias_staff_all ON v2_condominios.convocatorias FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS convocatorias_condomino_select ON v2_condominios.convocatorias;
CREATE POLICY convocatorias_condomino_select ON v2_condominios.convocatorias FOR SELECT TO authenticated USING (NOT public.is_staff() AND enviada = true AND assembleia_id IN (SELECT a.id FROM v2_condominios.assembleias a WHERE a.edificio_id = ANY(v2_condominios.get_my_edificios())));

-- 13. COMUNICACOES
CREATE TABLE IF NOT EXISTS v2_condominios.comunicacoes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  condomino_id      uuid          REFERENCES v2_condominios.condominos(id) ON DELETE SET NULL,
  destinatario_email text,
  destinatario_tel  text,
  canal             v2_condominios.canal_comunicacao NOT NULL,
  tipo_comunicacao  text          NOT NULL,
  assunto           text          NOT NULL,
  conteudo          text          NOT NULL,
  estado            v2_condominios.estado_envio NOT NULL DEFAULT 'enviado',
  enviado_em        timestamptz   NOT NULL DEFAULT now(),
  entregue_em       timestamptz,
  bounce_em         timestamptz,
  resend_message_id text,
  approval_item_id  uuid,
  enviado_por       text          NOT NULL DEFAULT 'comunicacao-condo',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.comunicacoes IS 'Registo imutável de comunicações enviadas. É a prova legal de envio (aviso de mora, convocatória). UPDATE só para tracking de entrega.';
COMMENT ON COLUMN v2_condominios.comunicacoes.condomino_id IS 'SET NULL: histórico de comunicações mantém-se mesmo se condómino sair.';
COMMENT ON COLUMN v2_condominios.comunicacoes.conteudo IS 'Conteúdo completo enviado — não a template, mas o conteúdo personalizado final (prova legal).';
CREATE TRIGGER trg_comunicacoes_updated_at BEFORE UPDATE ON v2_condominios.comunicacoes FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_comunicacoes_edificio ON v2_condominios.comunicacoes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_comunicacoes_condomino ON v2_condominios.comunicacoes(condomino_id);
CREATE INDEX IF NOT EXISTS idx_comunicacoes_estado ON v2_condominios.comunicacoes(estado);
CREATE INDEX IF NOT EXISTS idx_comunicacoes_enviado_em ON v2_condominios.comunicacoes(enviado_em);
CREATE INDEX IF NOT EXISTS idx_comunicacoes_antispam ON v2_condominios.comunicacoes(condomino_id, tipo_comunicacao, enviado_em);
ALTER TABLE v2_condominios.comunicacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comunicacoes_staff_all ON v2_condominios.comunicacoes;
CREATE POLICY comunicacoes_staff_all ON v2_condominios.comunicacoes FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS comunicacoes_condomino_select ON v2_condominios.comunicacoes;
CREATE POLICY comunicacoes_condomino_select ON v2_condominios.comunicacoes FOR SELECT TO authenticated USING (NOT public.is_staff() AND condomino_id IN (SELECT c.id FROM v2_condominios.condominos c JOIN core.pessoas p ON p.id = c.pessoa_id WHERE p.auth_user_id = auth.uid()));

-- 14. HISTORICO_PEDIDOS
CREATE TABLE IF NOT EXISTS v2_condominios.historico_pedidos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  condomino_id      uuid          REFERENCES v2_condominios.condominos(id) ON DELETE SET NULL,
  tipo              v2_condominios.tipo_pedido NOT NULL,
  urgencia          v2_condominios.urgencia NOT NULL DEFAULT 'normal',
  descricao         text          NOT NULL,
  canal_entrada     v2_condominios.canal_comunicacao,
  remetente_email   text,
  remetente_tel     text,
  confianca_classificacao numeric(5,2),
  employee_destino  text,
  inbox_item_id     uuid,
  resolvido         boolean       NOT NULL DEFAULT false,
  resolucao         text,
  resolvido_em      timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.historico_pedidos IS 'Registo de todos os pedidos recebidos. Ana (atendimento-condo) escreve. Equivalente ao livro de correspondência recebida.';
COMMENT ON COLUMN v2_condominios.historico_pedidos.confianca_classificacao IS '<80% → Ana marca como "necessita verificação" (Ana Standard).';
CREATE TRIGGER trg_historico_pedidos_updated_at BEFORE UPDATE ON v2_condominios.historico_pedidos FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_pedidos_edificio ON v2_condominios.historico_pedidos(edificio_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_condomino ON v2_condominios.historico_pedidos(condomino_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo ON v2_condominios.historico_pedidos(tipo);
CREATE INDEX IF NOT EXISTS idx_pedidos_urgencia ON v2_condominios.historico_pedidos(urgencia);
CREATE INDEX IF NOT EXISTS idx_pedidos_resolvido ON v2_condominios.historico_pedidos(resolvido) WHERE resolvido = false;
CREATE INDEX IF NOT EXISTS idx_pedidos_condomino_tempo ON v2_condominios.historico_pedidos(condomino_id, created_at);
ALTER TABLE v2_condominios.historico_pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pedidos_staff_all ON v2_condominios.historico_pedidos;
CREATE POLICY pedidos_staff_all ON v2_condominios.historico_pedidos FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS pedidos_condomino_select ON v2_condominios.historico_pedidos;
CREATE POLICY pedidos_condomino_select ON v2_condominios.historico_pedidos FOR SELECT TO authenticated USING (NOT public.is_staff() AND condomino_id IN (SELECT c.id FROM v2_condominios.condominos c JOIN core.pessoas p ON p.id = c.pessoa_id WHERE p.auth_user_id = auth.uid()));

-- 15. CARREGADORES_CONTAGENS
CREATE TABLE IF NOT EXISTS v2_condominios.carregadores_contagens (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id       uuid          NOT NULL REFERENCES core.imoveis(id) ON DELETE RESTRICT,
  fracao_id         uuid          NOT NULL REFERENCES v2_condominios.fracoes(id) ON DELETE RESTRICT,
  posto_id          text          NOT NULL,
  periodo           date          NOT NULL,
  kwh_consumidos    numeric(10,3) NOT NULL CHECK (kwh_consumidos >= 0),
  tarifa_kwh        numeric(8,4)  NOT NULL,
  valor_calculado   numeric(10,2) GENERATED ALWAYS AS (round(kwh_consumidos * tarifa_kwh, 2)) STORED,
  faturado          boolean       NOT NULL DEFAULT false,
  fatura_id         uuid          REFERENCES v2_condominios.faturas_pendentes(id) ON DELETE SET NULL,
  leitura_inicial   numeric(10,3),
  leitura_final     numeric(10,3),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (fracao_id, posto_id, periodo)
);
COMMENT ON TABLE v2_condominios.carregadores_contagens IS 'Contagens de kWh por posto EV. valor_calculado é coluna gerada (kwh × tarifa). Enzo (energia-condo) processa no Dia 1.';
COMMENT ON COLUMN v2_condominios.carregadores_contagens.fracao_id IS 'RESTRICT: contagem EV tem de ter fracção identificada — não existe contagem "anónima".';
COMMENT ON COLUMN v2_condominios.carregadores_contagens.valor_calculado IS 'Coluna calculada automaticamente: kwh_consumidos × tarifa_kwh. Nunca editar directamente.';
CREATE TRIGGER trg_carregadores_updated_at BEFORE UPDATE ON v2_condominios.carregadores_contagens FOR EACH ROW EXECUTE FUNCTION v2_condominios.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_carregadores_edificio ON v2_condominios.carregadores_contagens(edificio_id);
CREATE INDEX IF NOT EXISTS idx_carregadores_fracao ON v2_condominios.carregadores_contagens(fracao_id);
CREATE INDEX IF NOT EXISTS idx_carregadores_periodo ON v2_condominios.carregadores_contagens(periodo);
CREATE INDEX IF NOT EXISTS idx_carregadores_faturado ON v2_condominios.carregadores_contagens(faturado) WHERE faturado = false;
CREATE INDEX IF NOT EXISTS idx_carregadores_posto_periodo ON v2_condominios.carregadores_contagens(posto_id, periodo);
ALTER TABLE v2_condominios.carregadores_contagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS carregadores_staff_all ON v2_condominios.carregadores_contagens;
CREATE POLICY carregadores_staff_all ON v2_condominios.carregadores_contagens FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS carregadores_condomino_select ON v2_condominios.carregadores_contagens;
CREATE POLICY carregadores_condomino_select ON v2_condominios.carregadores_contagens FOR SELECT TO authenticated USING (NOT public.is_staff() AND fracao_id IN (SELECT c.fracao_id FROM v2_condominios.condominos c JOIN core.pessoas p ON p.id = c.pessoa_id WHERE p.auth_user_id = auth.uid() AND c.activo = true));

-- 16. AUDIT_LOG (bigserial — escrita intensa, sem UUID overhead)
CREATE TABLE IF NOT EXISTS v2_condominios.audit_log (
  id                bigserial     PRIMARY KEY,
  edificio_id       uuid,
  fracao_id         uuid,
  condomino_id      uuid,
  employee          text          NOT NULL,
  accao             text          NOT NULL,
  tabela_afectada   text,
  registo_id        uuid,
  dados_antes       jsonb,
  dados_depois      jsonb,
  inbox_item_id     uuid,
  approval_item_id  uuid,
  ip_origem         inet,
  created_at        timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE v2_condominios.audit_log IS 'Log imutável de acções dos AI employees. bigserial (não UUID) pela intensidade de escrita. Sem FKs: log sobrevive a deleções de entidades. Sem updated_at: nunca se actualiza.';
COMMENT ON COLUMN v2_condominios.audit_log.id IS 'bigserial: escrita frequente (cada acção de cada employee). UUID teria overhead desnecessário.';
COMMENT ON COLUMN v2_condominios.audit_log.dados_antes IS 'Estado JSONB da linha antes da alteração. NULL para INSERT.';
CREATE INDEX IF NOT EXISTS idx_audit_edificio ON v2_condominios.audit_log(edificio_id);
CREATE INDEX IF NOT EXISTS idx_audit_employee ON v2_condominios.audit_log(employee);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON v2_condominios.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_accao ON v2_condominios.audit_log(accao);
CREATE INDEX IF NOT EXISTS idx_audit_edificio_accao ON v2_condominios.audit_log(edificio_id, accao, created_at DESC);
ALTER TABLE v2_condominios.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_staff_all ON v2_condominios.audit_log;
CREATE POLICY audit_log_staff_all ON v2_condominios.audit_log FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- GRANTS
GRANT USAGE ON SCHEMA v2_condominios TO authenticated;
GRANT USAGE ON SCHEMA v2_condominios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA v2_condominios TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE v2_condominios.audit_log_id_seq TO authenticated;

NOTIFY pgrst, 'reload schema';
