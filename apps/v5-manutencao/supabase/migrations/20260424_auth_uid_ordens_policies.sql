-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fase 2d.3 — RLS real em ordens (auth.uid() = cliente_id/prestador_id)║
-- ║  v5-manutencao · 24 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Contexto: Fase 2d.1 criou 3 contas demo no Supabase Auth. Fase 2d.2 ║
-- ║  alterou os botões demo para signInWithPassword, portanto auth.uid() ║
-- ║  passa a devolver um UUID válido. Esta migração substitui as policies║
-- ║  permissivas `pre_auth_*` (TO public, WITH CHECK true) por policies  ║
-- ║  baseadas em auth.uid() + role em perfis.                            ║
-- ║                                                                      ║
-- ║  Passos:                                                             ║
-- ║    1. Actualizar perfis.role dos 3 demo users para reflectir role    ║
-- ║       do botão correspondente (o trigger handle_new_user dá default  ║
-- ║       'cliente' a todos).                                            ║
-- ║    2. DROP pre_auth_select_ordens + pre_auth_insert_ordens.          ║
-- ║    3. Criar policies proper: SELECT/UPDATE para participantes + admin║
-- ║       INSERT só para cliente com cliente_id = auth.uid().            ║
-- ║                                                                      ║
-- ║  Idempotente: todas as operações usam IF EXISTS / ON CONFLICT.       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── Passo 1: Roles correctos nas 3 contas demo ────────────────────────
UPDATE perfis SET role='admin'     WHERE email='admin@demov5.pt';
UPDATE perfis SET role='prestador' WHERE email='prestador@demov5.pt';
UPDATE perfis SET role='cliente'   WHERE email='cliente@demov5.pt';

-- ── Passo 2: Remover policies permissivas de pre_auth ─────────────────
DROP POLICY IF EXISTS "pre_auth_select_ordens"       ON ordens;
DROP POLICY IF EXISTS "pre_auth_insert_ordens"       ON ordens;
-- Defensive: policies anteriores que podem ter sobrado
DROP POLICY IF EXISTS "ordens_participantes"         ON ordens;
DROP POLICY IF EXISTS "temp_anon_insert_ordens"      ON ordens;
DROP POLICY IF EXISTS "temp_public_insert_ordens"    ON ordens;
DROP POLICY IF EXISTS "ordens_select_participantes"  ON ordens;
DROP POLICY IF EXISTS "ordens_insert_cliente"        ON ordens;
DROP POLICY IF EXISTS "ordens_update_participantes"  ON ordens;

-- ── Passo 3: Policies proper baseadas em auth.uid() ───────────────────

-- SELECT: cliente vê as suas, prestador vê as suas atribuídas, admin vê tudo
CREATE POLICY "ordens_select_participantes"
  ON ordens
  FOR SELECT
  TO authenticated
  USING (
    cliente_id = auth.uid()
    OR prestador_id = auth.uid()
    OR (SELECT role FROM perfis WHERE id = auth.uid()) = 'admin'
  );

-- INSERT: só cliente autenticado, e só para si próprio
CREATE POLICY "ordens_insert_cliente"
  ON ordens
  FOR INSERT
  TO authenticated
  WITH CHECK (cliente_id = auth.uid());

-- UPDATE: participantes + admin (cliente cancela, prestador progride estado)
CREATE POLICY "ordens_update_participantes"
  ON ordens
  FOR UPDATE
  TO authenticated
  USING (
    cliente_id = auth.uid()
    OR prestador_id = auth.uid()
    OR (SELECT role FROM perfis WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    cliente_id = auth.uid()
    OR prestador_id = auth.uid()
    OR (SELECT role FROM perfis WHERE id = auth.uid()) = 'admin'
  );

-- DELETE fica sem policy → bloqueado por default. Intencional: no MVP
-- não há flow de delete. Cancelamentos são UPDATE com estado='cancelado'.
