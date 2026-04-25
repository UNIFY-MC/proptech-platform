-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Migration: sub_grupo em public.servicos                             ║
-- ║  v5-manutencao · 25 Abr 2026 · 3.3.14-fix-ux1                       ║
-- ║                                                                      ║
-- ║  Adiciona coluna sub_grupo TEXT à tabela public.servicos.            ║
-- ║  Backfill via JOIN com subcategorias.nome (cobre ~166 serviços).     ║
-- ║  Serviços personalizados ficam com sub_grupo = 'Personalizado'.      ║
-- ║  Idempotente: ADD COLUMN IF NOT EXISTS; UPDATE só onde NULL.         ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- 1. Adicionar coluna
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS sub_grupo TEXT;

-- 2. Backfill principal via FK join (cobre todos os serviços com subcategoria_id)
UPDATE public.servicos s
SET sub_grupo = sc.nome
FROM public.subcategorias sc
WHERE s.subcategoria_id = sc.id
  AND s.sub_grupo IS NULL;

-- 3. Serviços personalizados (subcategoria_id IS NULL, tipo='personalizado')
UPDATE public.servicos
SET sub_grupo = 'Personalizado'
WHERE tipo = 'personalizado'
  AND sub_grupo IS NULL;

-- 4. Índice para filtragem por sub_grupo na CategoriaScreen
CREATE INDEX IF NOT EXISTS idx_servicos_sub_grupo
  ON public.servicos(sub_grupo)
  WHERE activo = TRUE;
