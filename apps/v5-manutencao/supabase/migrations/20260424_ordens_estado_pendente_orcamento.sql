-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fase 3a.4 — novo estado 'pendente_orcamento' em ordens              ║
-- ║  v5-manutencao · 24 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Contexto: o submit da wishlist cria 1 ordem por categoria com       ║
-- ║  valor_cobrado=NULL (preço a confirmar pelo prestador). O estado    ║
-- ║  inicial deixa de ser 'pendente_pagamento' e passa a ser             ║
-- ║  'pendente_orcamento' — sinaliza que falta orçamento antes de       ║
-- ║  seguir para agendamento.                                            ║
-- ║                                                                      ║
-- ║  Pipeline esperada:                                                  ║
-- ║    pendente_orcamento → proposta_hora → agendado → em_curso → …     ║
-- ║                                                                      ║
-- ║  Não quebra fluxos actuais: ordens directas (checkout) continuam a   ║
-- ║  arrancar em 'pendente_pagamento' / 'pendente'.                      ║
-- ╚══════════════════════════════════════════════════════════════════════╝

ALTER TABLE ordens DROP CONSTRAINT IF EXISTS ordens_estado_check;

ALTER TABLE ordens ADD CONSTRAINT ordens_estado_check CHECK (estado = ANY (ARRAY[
  'pendente_pagamento',
  'pendente_orcamento',
  'pendente',
  'proposta_hora',
  'agendado',
  'em_curso',
  'aguarda_validacao',
  'concluida',
  'faturada',
  'paga',
  'cancelada'
]));
