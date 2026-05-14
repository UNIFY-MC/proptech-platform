-- =============================================================
-- Migrações Excel: carregadores EV + fornecedores + pessoas
-- =============================================================
-- Excel apps/v2-condominios/docs/PRATA2A data (2026.05).xlsx
-- =============================================================

-- 1. Permitir fracao_id NULL em carregadores_contagens (Excel tem leituras
-- com posto sem fracao mapeada; cross-match futuro vai resolver).
ALTER TABLE v2_condominios.carregadores_contagens
  ALTER COLUMN fracao_id DROP NOT NULL;

-- 2. Dados via REST (resumo):
--    carregadores_contagens: 237 leituras inseridas (79 postos × 3 incrementos
--    entre 4 períodos: 2025-02-28, 2025-08-27, 2025-11-30, 2026-03-01).
--    tarifa_kwh = 0.1861 €. Total teórico facturado ~5.283 € (próximo dos
--    6.175 € em "Valores a Devolver" da Prestação de Contas).
--
--    fornecedores: Easyfresh com dados completos (NIF 509793061, email,
--    IBAN PT50 0018 0003 2528346602087, contacto). Adicionados Lithoespaço,
--    BCP, EPAL, Schmitt como placeholders categorizados.
--
--    core.pessoas: 64 condóminos upserted via email (NIF, telemóvel, morada
--    completa, código postal, localidade).
