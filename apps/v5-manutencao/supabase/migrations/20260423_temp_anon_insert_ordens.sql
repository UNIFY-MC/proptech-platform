-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  TEMP — Permitir INSERT a role anon em ordens                        ║
-- ║  v5-manutencao · 23 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Contexto: os botões demo (Cliente/Prestador/Admin) no login não     ║
-- ║  fazem signin real Supabase — o estado local tem um authUser mock    ║
-- ║  mas o token enviado ao PostgREST não produz auth.uid() válido.      ║
-- ║  Consequência: a policy única `ordens_participantes`                 ║
-- ║    USING (auth.uid() = cliente_id OR auth.uid() = prestador_id)      ║
-- ║  aplica-se também ao INSERT (cmd=ALL + with_check=NULL herda USING)  ║
-- ║  e rejeita silenciosamente qualquer inserção.                        ║
-- ║                                                                      ║
-- ║  Esta migração desbloqueia INSERT para role anon com WITH CHECK(true)║
-- ║  permitindo validação end-to-end do fluxo V2 em pré-lançamento.      ║
-- ║                                                                      ║
-- ║  SELECT/UPDATE/DELETE continuam restritos — ninguém lê ordens        ║
-- ║  alheias sem auth, e alterações só via service_role do admin.        ║
-- ║                                                                      ║
-- ║  TODO(Fase X: auth real): quando os 3 demo users passarem a fazer    ║
-- ║  signin real Supabase (auth.users linhas reais com role metadata),   ║
-- ║  REMOVER esta policy e substituir por:                               ║
-- ║                                                                      ║
-- ║    CREATE POLICY ordens_insert_authenticated ON ordens               ║
-- ║      FOR INSERT TO authenticated                                     ║
-- ║      WITH CHECK (cliente_id = auth.uid());                           ║
-- ║                                                                      ║
-- ║  Risco actual: pré-lançamento, app não pública, anon key é ANON      ║
-- ║  padrão (não service_role), o pior que acontece é criação de ordens  ║
-- ║  falsas que não conseguem ser lidas depois (SELECT continua RLS'd).  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "temp_anon_insert_ordens" ON ordens;

CREATE POLICY "temp_anon_insert_ordens"
  ON ordens
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Verificação (correr depois):
-- SELECT policyname, roles::text, cmd, qual::text, with_check::text
-- FROM pg_policies WHERE schemaname='public' AND tablename='ordens'
-- ORDER BY policyname;
--
-- Expected: 2 rows
--   ordens_participantes    | {authenticated} | ALL    | (auth.uid()=cliente_id OR ...) | null
--   temp_anon_insert_ordens | {anon}          | INSERT | null                           | true
