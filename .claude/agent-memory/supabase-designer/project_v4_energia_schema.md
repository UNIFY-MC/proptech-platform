---
name: V4 Energia — Schema e Edge Function
description: Schema v4_energia aplicado + Edge Function v4-energia-lead criada (não deployada) no V1 Core Hub. Decisão Opção A fechada em 2026-04-19.
type: project
---

Migration `v4_energia_schema_inicial` aplicada em 2026-04-19 no V1 Core Hub (`hkmvszkpxjbxmnixzqbl`).

**O que foi criado:**
- Schema `v4_energia` com comentário descritivo
- Função trigger `v4_energia.tg_set_updated_at()`
- Tabela `v4_energia.acordos_comercializadoras` — parceiros/comercializadoras com spread_kwh, prioridade, tipo_comissao, ativa
- Tabela `v4_energia.contratos_energia` — pedidos de mudança de comercializador; FK para `core.pessoas` (RESTRICT) e `core.imoveis` (SET NULL)
- 6 índices em contratos_energia (pessoa, imovel, estado, created_at DESC, cpe+data)
- 1 índice composto em acordos_comercializadoras (ativa, prioridade)
- 8 linhas seed de comercializadoras (todas com ativa=false)
- 5 RLS policies: public_ler_activas, staff_admin_acordos_total, auth_ler_proprios, auth_actualizar_proprios, staff_admin_contratos_total

**Why:** Base de dados para o scope v1 da vertical energia — simulador + contratos + formulário de mudança.

**How to apply:** Qualquer trabalho futuro na v4_energia parte deste schema. Pipeline de estados em contratos_energia: novo → a_analisar → proposta_enviada → assinado → activo → cancelado.

**Warnings conhecidos (não críticos para esta fase):**
- `auth_rls_initplan` (WARN/PERF): 4 policies usam `auth.uid()` e `auth.jwt()` directamente — recomendável envolver em `(select ...)` em iteração futura para performance a escala.
- `multiple_permissive_policies` (WARN/PERF): sobreposição de policies SELECT/UPDATE para authenticated — padrão aceitável enquanto o volume é baixo; consolidar com políticas condicionais quando necessário.
- `function_search_path_mutable` (WARN/SEC): afecta `v4_energia.tg_set_updated_at` — adicionar `SET search_path = v4_energia` à função em iteração futura.
- Warnings pré-existentes do schema `core` (views SECURITY DEFINER, FKs sem índice) — não introduzidos por esta migration.

## Edge Function v4-energia-lead (criada 2026-04-19, NÃO deployada)

Ficheiros em `supabase/functions/v4-energia-lead/`:
- `index.ts` — handler principal (Deno + TS)
- `validators.ts` — validação de payload sem libs externas
- `rate-limit.ts` — rate limiting in-memory (2 Maps)

**Decisão arquitectural (Opção A — fechada):** simulador público → Edge Function (service_role) → INSERT contratos_energia.

**Dedup pessoa:** upsert em `core.pessoas` com `onConflict: 'email'`.
**Rate limit:** IP 3req/10min + email+CPE 1req/24h (in-memory, aceitável v1).
**Evento pós-insert:** `core.eventos_cliente` tipo `v4_energia_lead_criado` (falha silenciosa).

Referências Notion:
- Decisões Finais: `34784147-fa60-8137-8944-ec5f5d04b822`
- Fecho Opção A: `34784147-fa60-81e6-bbd1-f774fccc3aa9`
