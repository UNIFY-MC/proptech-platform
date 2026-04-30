-- Sprint 1B.2.3c — Equipamento extras: edição + multi-foto + fatura compra
-- Timestamp: 202604281530
-- Aplicar via Supabase SQL editor (V1 Core Hub hkmvszkpxjbxmnixzqbl)

BEGIN;

-- ── ALTER equipamentos: campos preparatórios + edição ──────────────────────────
ALTER TABLE v5_manutencao.equipamentos
  ADD COLUMN IF NOT EXISTS data_compra date,
  ADD COLUMN IF NOT EXISTS data_compra_precisao text
    CHECK (data_compra_precisao IN ('exact','year_only','estimated','unknown')),
  ADD COLUMN IF NOT EXISTS fatura_compra_path text,
  ADD COLUMN IF NOT EXISTS modelo_catalogo_id uuid;
  -- TODO Onda 2: ADD CONSTRAINT fk_modelo_catalogo
  --   FOREIGN KEY (modelo_catalogo_id)
  --   REFERENCES v5_manutencao.equipamento_modelos_catalogo(id);

-- ── Tabela equipamento_fotos (multi-foto sem custo IA) ────────────────────────
CREATE TABLE IF NOT EXISTS v5_manutencao.equipamento_fotos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id  uuid        NOT NULL
    REFERENCES v5_manutencao.equipamentos(id) ON DELETE CASCADE,
  pessoa_id       uuid        NOT NULL,
  organization_id uuid        NOT NULL,
  foto_path       text        NOT NULL,
  legenda         text,
  origem          text        NOT NULL DEFAULT 'manual_user'
    CHECK (origem IN (
      'manual_user',        -- cliente fez upload manual
      'agente_ia',          -- IA inspeccionou (image_inspector)
      'catalogo_oficial',   -- foto fabricante via match (Onda 2)
      'catalogo_curado'     -- Mario curou manualmente (Onda 2)
    )),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_equipamento_fotos_equipamento
  ON v5_manutencao.equipamento_fotos(equipamento_id);

-- ── RLS (Regra W: GRANT antes de CREATE POLICY) ───────────────────────────────
ALTER TABLE v5_manutencao.equipamento_fotos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON v5_manutencao.equipamento_fotos TO authenticated;
GRANT ALL
  ON v5_manutencao.equipamento_fotos TO service_role;

CREATE POLICY equipamento_fotos_org ON v5_manutencao.equipamento_fotos
  FOR ALL TO authenticated
  USING  (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK (organization_id = ANY(public.current_organization_ids()));

-- ── Notificar PostgREST (schema reload) ──────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;
