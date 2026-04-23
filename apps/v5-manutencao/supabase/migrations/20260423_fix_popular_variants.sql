-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fix: garantir exactamente 1 variante Popular por grupo-pai          ║
-- ║  v5-manutencao · 23 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Contexto: o seed original da 20260422_catalogo_completo.sql         ║
-- ║  deixou 3 grupos com contagem incorrecta de variantes populares:     ║
-- ║    · cln-home    : 2 populares (cln-home-t1 E cln-home-t2)           ║
-- ║    · cln-mattress: 0 populares                                        ║
-- ║    · cln-sofa    : 0 populares                                        ║
-- ║                                                                      ║
-- ║  Consequência: VariantPickerScreen pré-selecciona 1ª variante por    ║
-- ║  fallback, que não coincide com a "mais comum" → UX errada.          ║
-- ║                                                                      ║
-- ║  Decisão (justificada por mercado PT):                               ║
-- ║    · cln-home     → T2 fica popular (apartamentos PT 60-90m²)        ║
-- ║    · cln-mattress → casal fica popular (~70% das casas)              ║
-- ║    · cln-sofa     → 3 lugares fica popular (mais vendido em salas)   ║
-- ║                                                                      ║
-- ║  Forma: UPDATE por grupo com predicate booleano — idempotente.       ║
-- ║  Reexecutar dá o mesmo resultado.                                    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Garantir exactamente 1 popular por grupo-pai nos 3 grupos problemáticos.
UPDATE servicos SET popular = (id = 'cln-home-t2')
  WHERE servico_pai_id = 'cln-home';

UPDATE servicos SET popular = (id = 'cln-mattress-d')
  WHERE servico_pai_id = 'cln-mattress';

UPDATE servicos SET popular = (id = 'cln-sofa-3')
  WHERE servico_pai_id = 'cln-sofa';

-- Verificação (correr depois):
-- Expected: todos os 11 grupos com populares=1, e IDs correctos.
-- SELECT servico_pai_id,
--        COUNT(*) AS total_variantes,
--        COUNT(*) FILTER (WHERE popular) AS populares,
--        STRING_AGG(CASE WHEN popular THEN id END, ', ') FILTER (WHERE popular) AS quais
-- FROM servicos
-- WHERE servico_pai_id IS NOT NULL
-- GROUP BY servico_pai_id
-- ORDER BY servico_pai_id;
