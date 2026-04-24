-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fase 3a.1 — Wishlist (listas_cliente + lista_items)                ║
-- ║  v5-manutencao · 24 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Cliente mantém uma "lista aberta" com items (fixos e personalizados)║
-- ║  que vai acumulando sem friccção. Quando satisfeito, submete tudo    ║
-- ║  como ordem agrupada (o submit — 3a.4 — ficará para depois com as   ║
-- ║  decisões de multi-especialidade/slots/cotação).                     ║
-- ║                                                                      ║
-- ║  Tabelas:                                                            ║
-- ║    listas_cliente (id, cliente_id, estado, morada_id, …)             ║
-- ║    lista_items    (id, lista_id, tipo, servico_id | descricao, …)    ║
-- ║                                                                      ║
-- ║  Constraints:                                                        ║
-- ║    - estado ∈ ('aberta','submetida','concluida') default 'aberta'    ║
-- ║    - tipo ∈ ('fixo','personalizado')                                 ║
-- ║    - max 1 lista aberta por cliente (unique partial index)           ║
-- ║                                                                      ║
-- ║  RLS:                                                                ║
-- ║    - cliente vê/gere só as suas (cliente_id = auth.uid())            ║
-- ║    - lista_items junta via lista_cliente.cliente_id                  ║
-- ║    - admin tem FOR ALL para suporte                                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS listas_cliente (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  estado        TEXT NOT NULL DEFAULT 'aberta'
                   CHECK (estado IN ('aberta','submetida','concluida')),
  morada_id     UUID REFERENCES cliente_moradas(id) ON DELETE SET NULL,
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  submetida_at  TIMESTAMPTZ,
  concluida_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listas_cliente_cliente
  ON listas_cliente(cliente_id);
-- Garantir que só há 1 lista aberta por cliente
CREATE UNIQUE INDEX IF NOT EXISTS idx_listas_cliente_unica_aberta
  ON listas_cliente(cliente_id) WHERE estado = 'aberta';

CREATE TABLE IF NOT EXISTS lista_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id        UUID NOT NULL REFERENCES listas_cliente(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('fixo','personalizado')),
  servico_id      TEXT REFERENCES servicos(id),   -- NULL quando personalizado
  descricao       TEXT,                           -- NULL quando fixo
  categoria_id    TEXT,
  preco_estimado  NUMERIC,
  horas_estimadas NUMERIC,                        -- só relevante para personalizado
  fotos           JSONB DEFAULT '[]'::jsonb,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lista_items_lista
  ON lista_items(lista_id);

ALTER TABLE listas_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_items    ENABLE ROW LEVEL SECURITY;

-- ── listas_cliente: scoped por cliente_id ─────────────────────────────
DROP POLICY IF EXISTS "listas_select_own"   ON listas_cliente;
DROP POLICY IF EXISTS "listas_insert_own"   ON listas_cliente;
DROP POLICY IF EXISTS "listas_update_own"   ON listas_cliente;
DROP POLICY IF EXISTS "listas_delete_own"   ON listas_cliente;
DROP POLICY IF EXISTS "listas_admin_all"    ON listas_cliente;

CREATE POLICY "listas_select_own" ON listas_cliente FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "listas_insert_own" ON listas_cliente FOR INSERT TO authenticated
  WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "listas_update_own" ON listas_cliente FOR UPDATE TO authenticated
  USING (cliente_id = auth.uid())
  WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "listas_delete_own" ON listas_cliente FOR DELETE TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "listas_admin_all" ON listas_cliente FOR ALL TO authenticated
  USING ((SELECT role FROM perfis WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM perfis WHERE id = auth.uid()) = 'admin');

-- ── lista_items: scoped via lista_id → listas_cliente.cliente_id ──────
DROP POLICY IF EXISTS "items_select_own"   ON lista_items;
DROP POLICY IF EXISTS "items_insert_own"   ON lista_items;
DROP POLICY IF EXISTS "items_update_own"   ON lista_items;
DROP POLICY IF EXISTS "items_delete_own"   ON lista_items;
DROP POLICY IF EXISTS "items_admin_all"    ON lista_items;

CREATE POLICY "items_select_own" ON lista_items FOR SELECT TO authenticated
  USING (lista_id IN (SELECT id FROM listas_cliente WHERE cliente_id = auth.uid()));

CREATE POLICY "items_insert_own" ON lista_items FOR INSERT TO authenticated
  WITH CHECK (lista_id IN (SELECT id FROM listas_cliente WHERE cliente_id = auth.uid()));

CREATE POLICY "items_update_own" ON lista_items FOR UPDATE TO authenticated
  USING (lista_id IN (SELECT id FROM listas_cliente WHERE cliente_id = auth.uid()))
  WITH CHECK (lista_id IN (SELECT id FROM listas_cliente WHERE cliente_id = auth.uid()));

CREATE POLICY "items_delete_own" ON lista_items FOR DELETE TO authenticated
  USING (lista_id IN (SELECT id FROM listas_cliente WHERE cliente_id = auth.uid()));

CREATE POLICY "items_admin_all" ON lista_items FOR ALL TO authenticated
  USING ((SELECT role FROM perfis WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM perfis WHERE id = auth.uid()) = 'admin');
