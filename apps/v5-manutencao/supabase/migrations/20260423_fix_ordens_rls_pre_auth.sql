-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Pre-auth RLS para ordens — desbloquear INSERT/SELECT em modo demo   ║
-- ║  v5-manutencao · 23 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Contexto: os botões demo (Cliente/Prestador/Admin) não fazem signin ║
-- ║  real Supabase. Todas as requests REST são com anon key. RLS bloqueia║
-- ║  porque policies anteriores (ordens_participantes, temp_anon_insert) ║
-- ║  dependiam de auth.uid() ou role matching que não produziam match    ║
-- ║  esperado no pathway do PostgREST.                                   ║
-- ║                                                                      ║
-- ║  Solução nuclear: simplificar RLS em ordens para TO public (todos    ║
-- ║  os roles, incluindo anon/authenticated) com WITH CHECK(true) para   ║
-- ║  INSERT e USING(true) para SELECT. UPDATE/DELETE ficam sem policy    ║
-- ║  — bloqueados por default em todos os roles não-bypass. Seguro.      ║
-- ║                                                                      ║
-- ║  TODO(Fase X: auth real): quando os 3 demo users passarem a fazer    ║
-- ║  signin real Supabase, REMOVER estas 2 policies e substituir por:    ║
-- ║                                                                      ║
-- ║    CREATE POLICY ordens_select_participantes ON ordens               ║
-- ║      FOR SELECT TO authenticated                                     ║
-- ║      USING (cliente_id = auth.uid() OR prestador_id = auth.uid()     ║
-- ║             OR (SELECT role FROM perfis WHERE id = auth.uid())='admin');║
-- ║                                                                      ║
-- ║    CREATE POLICY ordens_insert_cliente ON ordens                     ║
-- ║      FOR INSERT TO authenticated                                     ║
-- ║      WITH CHECK (cliente_id = auth.uid());                           ║
-- ║                                                                      ║
-- ║    CREATE POLICY ordens_update_participantes ON ordens               ║
-- ║      FOR UPDATE TO authenticated                                     ║
-- ║      USING (cliente_id = auth.uid() OR prestador_id = auth.uid()     ║
-- ║             OR (SELECT role FROM perfis WHERE id=auth.uid())='admin');║
-- ║                                                                      ║
-- ║  Risco actual: pré-lançamento, app não pública. Qualquer anon pode   ║
-- ║  inserir/ler ordens. Não há dados reais em risco.                    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Remover todas as policies existentes (idempotente)
DROP POLICY IF EXISTS "ordens_participantes"      ON ordens;
DROP POLICY IF EXISTS "temp_anon_insert_ordens"   ON ordens;
DROP POLICY IF EXISTS "temp_public_insert_ordens" ON ordens;
DROP POLICY IF EXISTS "pre_auth_select_ordens"    ON ordens;
DROP POLICY IF EXISTS "pre_auth_insert_ordens"    ON ordens;

-- Policy 1: SELECT aberto — necessário para o frontend ler próprias ordens
-- (filtragem real feita no client por nome do cliente no state local até
-- auth real estar implementada).
CREATE POLICY "pre_auth_select_ordens"
  ON ordens
  FOR SELECT
  TO public
  USING (true);

-- Policy 2: INSERT aberto — permite submeter ordens no modo demo.
CREATE POLICY "pre_auth_insert_ordens"
  ON ordens
  FOR INSERT
  TO public
  WITH CHECK (true);

-- UPDATE e DELETE: sem policy → bloqueado por default.
-- Só service_role (admin via MCP/dashboard) consegue actualizar/eliminar.

-- Verificação (correr depois):
-- SELECT policyname, roles::text, cmd FROM pg_policies
-- WHERE tablename='ordens' ORDER BY policyname;
-- Expected: 2 rows — pre_auth_insert_ordens {public} INSERT
--                    pre_auth_select_ordens {public} SELECT
