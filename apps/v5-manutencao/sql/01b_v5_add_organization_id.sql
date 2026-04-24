-- § 9.2 (parcial) — Adicionar organization_id às tabelas V5 existentes
-- Aplicar contra projecto hkmvszkpxjbxmnixzqbl (V1 Core Hub)
--
-- Apenas as tabelas que já existem na BD são alteradas aqui.
-- listas_cliente, cliente_moradas, perfis_fiscais NÃO existem ainda —
-- serão criadas nas fases respectivas com organization_id desde o dia 1
-- (ver MASTER.md § 5).

ALTER TABLE v5_manutencao.ordens_trabalho
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);

ALTER TABLE v5_manutencao.prestadores
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core.organizations(id);
