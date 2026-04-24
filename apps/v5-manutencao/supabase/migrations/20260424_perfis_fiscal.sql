-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fase 2f.2 — perfis com dados fiscais (NIF + morada fiscal)          ║
-- ║  v5-manutencao · 24 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Contexto: o FinalizarPedidoV2 hoje recolhe billing (nome, NIF,      ║
-- ║  morada, CP, localidade) por ordem — cada ordem guarda os campos     ║
-- ║  faturacao_* de forma redundante. Na Fase 2f mudamos o contracto:    ║
-- ║    • perfis guarda os dados fiscais persistentes do cliente          ║
-- ║    • cliente_moradas guarda as moradas de serviço (uma ou mais)      ║
-- ║    • as colunas faturacao_* das ordens ficam apenas como snapshot    ║
-- ║      histórico do que foi usado no momento daquele pedido            ║
-- ║                                                                      ║
-- ║  Columns novas (todas nullable — só preenchidas quando o cliente     ║
-- ║  passa pelo wizard de perfil):                                       ║
-- ║    nif                TEXT   — NIF pt-PT                             ║
-- ║    morada_fiscal      TEXT                                           ║
-- ║    cp_fiscal          TEXT                                           ║
-- ║    cidade_fiscal      TEXT                                           ║
-- ║                                                                      ║
-- ║  Seed: não preencher — o wizard 2f.3 fá-lo por interacção. Ficam     ║
-- ║  NULL até o cliente preencher.                                       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

ALTER TABLE perfis ADD COLUMN IF NOT EXISTS nif            TEXT;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS morada_fiscal  TEXT;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS cp_fiscal      TEXT;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS cidade_fiscal  TEXT;
