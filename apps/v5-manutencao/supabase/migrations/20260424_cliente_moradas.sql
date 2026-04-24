-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fase 2f.1 — cliente_moradas                                         ║
-- ║  v5-manutencao · 24 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Tabela para guardar moradas de serviço múltiplas por cliente        ║
-- ║  (Casa, Escritório, Casa da mãe, …). Serve o address selector do     ║
-- ║  checkout (2f.4) e prepara o app do técnico para navegar com GPS.    ║
-- ║                                                                      ║
-- ║  RLS: cada cliente vê/gere apenas as suas próprias moradas. Admin    ║
-- ║  tem policy `cliente_moradas_admin_all` para suporte. Prestador não  ║
-- ║  tem acesso directo — a morada do serviço é exposta pela ordem.      ║
-- ║                                                                      ║
-- ║  Seed: 1 morada default para o cliente demo                          ║
-- ║  (Rua Palmira Bastos, 4 — Caldas da Rainha).                         ║
-- ║  Idempotente via ON CONFLICT DO NOTHING em (cliente_id, morada).     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS cliente_moradas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,              -- "Casa", "Escritório", etc.
  morada        TEXT NOT NULL,
  cp            TEXT,
  cidade        TEXT,
  lat           NUMERIC,
  lng           NUMERIC,
  notas_acesso  TEXT,                       -- "porteiro R/C, código 1234"
  tipologia     TEXT,                       -- "T2", "Moradia", "Escritório"
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_moradas_cliente
  ON cliente_moradas(cliente_id);

-- Só uma morada default por cliente
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_moradas_default_per_client
  ON cliente_moradas(cliente_id) WHERE is_default;

-- Unicidade lógica (cliente_id + morada normalizada) para o ON CONFLICT do seed
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_moradas_unique_morada
  ON cliente_moradas(cliente_id, morada);

ALTER TABLE cliente_moradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cliente_moradas_select_own"   ON cliente_moradas;
DROP POLICY IF EXISTS "cliente_moradas_insert_own"   ON cliente_moradas;
DROP POLICY IF EXISTS "cliente_moradas_update_own"   ON cliente_moradas;
DROP POLICY IF EXISTS "cliente_moradas_delete_own"   ON cliente_moradas;
DROP POLICY IF EXISTS "cliente_moradas_admin_all"    ON cliente_moradas;

CREATE POLICY "cliente_moradas_select_own"
  ON cliente_moradas FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "cliente_moradas_insert_own"
  ON cliente_moradas FOR INSERT TO authenticated
  WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "cliente_moradas_update_own"
  ON cliente_moradas FOR UPDATE TO authenticated
  USING (cliente_id = auth.uid())
  WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "cliente_moradas_delete_own"
  ON cliente_moradas FOR DELETE TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "cliente_moradas_admin_all"
  ON cliente_moradas FOR ALL TO authenticated
  USING ((SELECT role FROM perfis WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM perfis WHERE id = auth.uid()) = 'admin');

-- Seed: cliente demo (Maria Santos) tem 1 morada default
INSERT INTO cliente_moradas (cliente_id, label, morada, cp, cidade, is_default)
VALUES (
  '351c1e38-9be5-4420-8b03-7cb53f05a21a',
  'Casa',
  'Rua Palmira Bastos, 4',
  '2500-296',
  'Caldas da Rainha',
  TRUE
)
ON CONFLICT (cliente_id, morada) DO NOTHING;
