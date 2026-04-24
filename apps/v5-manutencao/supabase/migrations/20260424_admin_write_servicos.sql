-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Admin pode escrever em servicos                                     ║
-- ║  v5-manutencao · 24 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Contexto: até aqui a tabela servicos só tinha policies de SELECT    ║
-- ║  (activo=true para anon e authenticated). Qualquer INSERT/UPDATE     ║
-- ║  vindo do AdminServicos falhava com 401 "new row violates row-level  ║
-- ║  security policy". Depois da Fase 2d ter auth real, admin faz signin ║
-- ║  com admin@demov5.pt → perfis.role='admin'.                          ║
-- ║                                                                      ║
-- ║  Policy nova: "servicos_admin_all" — FOR ALL autenticados cujo       ║
-- ║  perfil tem role='admin'. Permite SELECT (incluindo inactivos),      ║
-- ║  INSERT, UPDATE e DELETE sem restrições.                             ║
-- ║                                                                      ║
-- ║  O mesmo padrão aplica-se a categorias e subcategorias quando essas  ║
-- ║  passarem a ser editáveis no painel — deixado para follow-up.        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "servicos_admin_all" ON servicos;

CREATE POLICY "servicos_admin_all"
  ON servicos
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM perfis WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM perfis WHERE id = auth.uid()) = 'admin');
