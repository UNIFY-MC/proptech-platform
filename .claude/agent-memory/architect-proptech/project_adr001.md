---
name: ADR-001 — Scope V4 Energia + Edge Function para leads
description: Decisão confirmada em 2026-04-19: Opção A (Edge Function) para captura de leads do simulador V4, scope v1 da app React V4 Energia
type: project
---

ADR-001 foi confirmado pelo founder Mário Carvalho em 2026-04-19 após review da página filha "Decisões Finais".

**Notion ID do ADR-001:** `34784147-fa60-81f1-9bb4-ff7aee1306f4`
**URL:** https://www.notion.so/34784147fa6081f19bb4ff7aee1306f4

**Decisão central:** Opção A — Edge Function pattern para captura de leads do simulador público V4 Energia. O simulador (anon) nunca escreve directamente na BD; passa sempre por `/functions/v1/v4-energia/lead` com `service_role`.

**Scope v1 da app React V4 aprovado:**
- Login screen (reutilizado do v1-core)
- Dashboard admin com 4 KPIs
- Simulador cliente público (4 passos, port do HTML existente)
- Pipeline admin com filtros e modal de detalhe
- Schema Supabase: `v4_energia.contratos_energia` + `v4_energia.acordos_comercializadoras`

**Páginas filhas relevantes do ADR-001:**
- "Decisões Finais": `34784147-fa60-8137-8944-ec5f5d04b822`
- "Fecho Opção A": `34784147-fa60-81e6-bbd1-f774fccc3aa9` (contém SQL completo + spec Edge Function)

**Delegação:**
- supabase-designer: schema `v4_energia` em `hkmvszkpxjbxmnixzqbl`, RLS, seed 8 comercializadoras, Edge Function
- vertical-builder: `apps/v4-energia/` Vite + React 18, rotas `/`, `/login`, `/simulador`, `/pipeline`

**Why:** Segurança (sem escrita directa com anon key), rate limiting nativo, consistência com padrão V2, auditabilidade via código versionado.

**How to apply:** Quando supabase-designer ou vertical-builder perguntarem sobre V4, o SQL canónico e a spec da Edge Function estão na página "Fecho Opção A". O último ADR criado é ADR-001 — próximo será ADR-002.
