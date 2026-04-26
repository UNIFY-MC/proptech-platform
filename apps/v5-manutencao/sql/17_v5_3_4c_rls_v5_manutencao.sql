-- ─────────────────────────────────────────────────────────────────────────────
-- 3.4C · RLS v5_manutencao — todas as tabelas
-- Aplicar em 4 batches (C1→C4) + Tarefa D + Tarefa E
-- Testar HomeScreen Maria após cada batch antes de continuar
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- TAREFA C — PER_ORG (organization_id = ANY(current_organization_ids()))
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Batch C1 ──────────────────────────────────────────────────────────────

ALTER TABLE v5_manutencao.localizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "localizacoes_org" ON v5_manutencao.localizacoes
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

ALTER TABLE v5_manutencao.perfis_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis_fiscais_org" ON v5_manutencao.perfis_fiscais
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

ALTER TABLE v5_manutencao.ordens_trabalho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ordens_trabalho_org" ON v5_manutencao.ordens_trabalho
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

NOTIFY pgrst, 'reload schema';
-- TESTE C1: Maria login → HomeScreen carrega → consola sem 403

-- ── Batch C2 ──────────────────────────────────────────────────────────────

ALTER TABLE v5_manutencao.pedidos_orcamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_orcamento_org" ON v5_manutencao.pedidos_orcamento
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

ALTER TABLE v5_manutencao.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos_org" ON v5_manutencao.documentos
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

ALTER TABLE v5_manutencao.equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipamentos_org" ON v5_manutencao.equipamentos
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

NOTIFY pgrst, 'reload schema';
-- TESTE C2: Categoria + ServicosScreen abrem sem erro

-- ── Batch C3 ──────────────────────────────────────────────────────────────

ALTER TABLE v5_manutencao.subscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscricoes_org" ON v5_manutencao.subscricoes
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

ALTER TABLE v5_manutencao.metodos_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metodos_pagamento_org" ON v5_manutencao.metodos_pagamento
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

ALTER TABLE v5_manutencao.alertas_inteligentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_inteligentes_org" ON v5_manutencao.alertas_inteligentes
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

NOTIFY pgrst, 'reload schema';
-- TESTE C3: PlanoHomeDetalheScreen + subscrição Maria → sem erro

-- ── Batch C4 ──────────────────────────────────────────────────────────────

ALTER TABLE v5_manutencao.codigos_referencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codigos_referencia_org" ON v5_manutencao.codigos_referencia
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

ALTER TABLE v5_manutencao.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avaliacoes_org" ON v5_manutencao.avaliacoes
  FOR ALL TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));

-- prestadores: SELECT livre para authenticated (clientes vêem equipa);
-- writes restritos à própria org do prestador
ALTER TABLE v5_manutencao.prestadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prestadores_select" ON v5_manutencao.prestadores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "prestadores_write_org" ON v5_manutencao.prestadores
  FOR INSERT TO authenticated
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));
CREATE POLICY "prestadores_update_org" ON v5_manutencao.prestadores
  FOR UPDATE TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()))
  WITH CHECK(organization_id = ANY(public.current_organization_ids()));
CREATE POLICY "prestadores_delete_org" ON v5_manutencao.prestadores
  FOR DELETE TO authenticated
  USING     (organization_id = ANY(public.current_organization_ids()));

NOTIFY pgrst, 'reload schema';
-- TESTE C4: equipa Maria + prestador_detail → visível sem erro

-- ═══════════════════════════════════════════════════════════════════════════
-- TAREFA D — PER_PESSOA (pessoa_id = current_pessoa_id())
-- ═══════════════════════════════════════════════════════════════════════════

-- Fix tickets_suporte: substituir policy pública por per_pessoa
DROP POLICY IF EXISTS "tickets_suporte_public_rw" ON v5_manutencao.tickets_suporte;
CREATE POLICY "tickets_suporte_pessoa" ON v5_manutencao.tickets_suporte
  FOR ALL TO authenticated
  USING     (pessoa_id = public.current_pessoa_id())
  WITH CHECK(pessoa_id = public.current_pessoa_id());

-- Fix mensagens_suporte: substituir policy pública por via ticket da pessoa
DROP POLICY IF EXISTS "mensagens_suporte_public_rw" ON v5_manutencao.mensagens_suporte;
CREATE POLICY "mensagens_suporte_via_ticket" ON v5_manutencao.mensagens_suporte
  FOR ALL TO authenticated
  USING (ticket_id IN (
    SELECT id FROM v5_manutencao.tickets_suporte
    WHERE pessoa_id = public.current_pessoa_id()
  ))
  WITH CHECK (ticket_id IN (
    SELECT id FROM v5_manutencao.tickets_suporte
    WHERE pessoa_id = public.current_pessoa_id()
  ));

-- Novas tabelas per_pessoa

ALTER TABLE v5_manutencao.missoes_utilizador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missoes_utilizador_pessoa" ON v5_manutencao.missoes_utilizador
  FOR ALL TO authenticated
  USING     (pessoa_id = public.current_pessoa_id())
  WITH CHECK(pessoa_id = public.current_pessoa_id());

ALTER TABLE v5_manutencao.pontos_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pontos_historico_pessoa" ON v5_manutencao.pontos_historico
  FOR ALL TO authenticated
  USING     (pessoa_id = public.current_pessoa_id())
  WITH CHECK(pessoa_id = public.current_pessoa_id());

ALTER TABLE v5_manutencao.prestadores_equipa_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prestadores_equipa_cliente_pessoa" ON v5_manutencao.prestadores_equipa_cliente
  FOR ALL TO authenticated
  USING     (pessoa_id = public.current_pessoa_id())
  WITH CHECK(pessoa_id = public.current_pessoa_id());

ALTER TABLE v5_manutencao.prestadores_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prestadores_favoritos_pessoa" ON v5_manutencao.prestadores_favoritos
  FOR ALL TO authenticated
  USING     (pessoa_id = public.current_pessoa_id())
  WITH CHECK(pessoa_id = public.current_pessoa_id());

ALTER TABLE v5_manutencao.respostas_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "respostas_assessment_pessoa" ON v5_manutencao.respostas_assessment
  FOR ALL TO authenticated
  USING     (pessoa_id = public.current_pessoa_id())
  WITH CHECK(pessoa_id = public.current_pessoa_id());

ALTER TABLE v5_manutencao.servicos_contratados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicos_contratados_pessoa" ON v5_manutencao.servicos_contratados
  FOR ALL TO authenticated
  USING     (pessoa_id = public.current_pessoa_id())
  WITH CHECK(pessoa_id = public.current_pessoa_id());

-- contexto_servico: via localizacao_id → localizacoes da org do user
ALTER TABLE v5_manutencao.contexto_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contexto_servico_via_loc" ON v5_manutencao.contexto_servico
  FOR ALL TO authenticated
  USING (localizacao_id IN (
    SELECT id FROM v5_manutencao.localizacoes
    WHERE organization_id = ANY(public.current_organization_ids())
  ))
  WITH CHECK (localizacao_id IN (
    SELECT id FROM v5_manutencao.localizacoes
    WHERE organization_id = ANY(public.current_organization_ids())
  ));

-- referidos: ver os que se referiu E os que foram referidos
ALTER TABLE v5_manutencao.referidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referidos_pessoa" ON v5_manutencao.referidos
  FOR ALL TO authenticated
  USING (
    referrer_id = public.current_pessoa_id()
    OR referido_id = public.current_pessoa_id()
  )
  WITH CHECK (referrer_id = public.current_pessoa_id());

NOTIFY pgrst, 'reload schema';
-- TESTE D: tickets_suporte + equipa_cliente → Maria vê só os seus

-- ═══════════════════════════════════════════════════════════════════════════
-- TAREFA E — PUBLICO (SELECT livre para anon + authenticated)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE v5_manutencao.catalogo_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalogo_servicos_public_read" ON v5_manutencao.catalogo_servicos
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.categorias_landing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_landing_public_read" ON v5_manutencao.categorias_landing
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combos_public_read" ON v5_manutencao.combos
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.combo_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combo_servicos_public_read" ON v5_manutencao.combo_servicos
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.descontos_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "descontos_config_public_read" ON v5_manutencao.descontos_config
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.planos_subscricao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_subscricao_public_read" ON v5_manutencao.planos_subscricao
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.platform_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_stats_public_read" ON v5_manutencao.platform_stats
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.promocoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promocoes_public_read" ON v5_manutencao.promocoes
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.servicos_faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicos_faq_public_read" ON v5_manutencao.servicos_faq
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.servicos_inclui_exclui ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicos_inclui_exclui_public_read" ON v5_manutencao.servicos_inclui_exclui
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.sub_grupos_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_grupos_config_public_read" ON v5_manutencao.sub_grupos_config
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE v5_manutencao.alertas_meteo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_meteo_public_read" ON v5_manutencao.alertas_meteo
  FOR SELECT TO anon, authenticated USING (true);

NOTIFY pgrst, 'reload schema';
-- TESTE E: ServicoDetailScreen + CombosScreen → catálogo aparece sem auth

-- ═══════════════════════════════════════════════════════════════════════════
-- TAREFA F — SISTEMA/indirect (RLS activo, service_role contorna)
-- Sem policies authenticated — acesso só via service_role ou funções SECURITY DEFINER
-- ═══════════════════════════════════════════════════════════════════════════

-- intervencoes_equipamento: via equipamento_id → equipamentos da org
ALTER TABLE v5_manutencao.intervencoes_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intervencoes_equip_via_equip" ON v5_manutencao.intervencoes_equipamento
  FOR ALL TO authenticated
  USING (equipamento_id IN (
    SELECT id FROM v5_manutencao.equipamentos
    WHERE organization_id = ANY(public.current_organization_ids())
  ))
  WITH CHECK (equipamento_id IN (
    SELECT id FROM v5_manutencao.equipamentos
    WHERE organization_id = ANY(public.current_organization_ids())
  ));

-- mensagens_chat: via ordem_id → ordens_trabalho da org
ALTER TABLE v5_manutencao.mensagens_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensagens_chat_via_ordem" ON v5_manutencao.mensagens_chat
  FOR ALL TO authenticated
  USING (ordem_id IN (
    SELECT id FROM v5_manutencao.ordens_trabalho
    WHERE organization_id = ANY(public.current_organization_ids())
  ))
  WITH CHECK (ordem_id IN (
    SELECT id FROM v5_manutencao.ordens_trabalho
    WHERE organization_id = ANY(public.current_organization_ids())
  ));

-- consumos_energia: via equipamento_id → equipamentos da org
ALTER TABLE v5_manutencao.consumos_energia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consumos_energia_via_equip" ON v5_manutencao.consumos_energia
  FOR ALL TO authenticated
  USING (equipamento_id IN (
    SELECT id FROM v5_manutencao.equipamentos
    WHERE organization_id = ANY(public.current_organization_ids())
  ))
  WITH CHECK (equipamento_id IN (
    SELECT id FROM v5_manutencao.equipamentos
    WHERE organization_id = ANY(public.current_organization_ids())
  ));

-- creditos_mensais: via subscricao_id → subscricoes da org
ALTER TABLE v5_manutencao.creditos_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creditos_mensais_via_sub" ON v5_manutencao.creditos_mensais
  FOR ALL TO authenticated
  USING (subscricao_id IN (
    SELECT id FROM v5_manutencao.subscricoes
    WHERE organization_id = ANY(public.current_organization_ids())
  ))
  WITH CHECK (subscricao_id IN (
    SELECT id FROM v5_manutencao.subscricoes
    WHERE organization_id = ANY(public.current_organization_ids())
  ));

-- orcamentos_recebidos: via pedido_id → pedidos_orcamento da org
ALTER TABLE v5_manutencao.orcamentos_recebidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orcamentos_recebidos_via_pedido" ON v5_manutencao.orcamentos_recebidos
  FOR ALL TO authenticated
  USING (pedido_id IN (
    SELECT id FROM v5_manutencao.pedidos_orcamento
    WHERE organization_id = ANY(public.current_organization_ids())
  ))
  WITH CHECK (pedido_id IN (
    SELECT id FROM v5_manutencao.pedidos_orcamento
    WHERE organization_id = ANY(public.current_organization_ids())
  ));

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificação final
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'v5_manutencao'
-- ORDER BY tablename;
-- Esperado: rowsecurity = true em todas as 39 tabelas
