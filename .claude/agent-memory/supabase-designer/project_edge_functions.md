---
name: Edge Functions — Convenções e Estado
description: Convenções de naming, estrutura e estado das Edge Functions no V1 Core Hub (hkmvszkpxjbxmnixzqbl)
type: project
---

Edge Functions usam slug com dashes (ex: `core-api`, `v4-energia-lead`). Nunca underscores nos slugs.
A pasta no repo é `supabase/functions/<slug>/index.ts`.

**Why:** Convenção observada nas 7 funções existentes (core-api, core-invite, core-setup, github-deploy, github-push, auth-test, admin-ui-test).

**How to apply:** Ao criar nova Edge Function, nomear pasta e slug com dashes. Nunca `v4_energia_lead`.

## Funções existentes em hkmvszkpxjbxmnixzqbl (2026-04-19)

| Slug | Status | verify_jwt | Notas |
|---|---|---|---|
| core-api | ACTIVE | false | Função monolítica principal — CRM, staff, V2 proxy, leads, ofertas |
| core-invite | ACTIVE | false | Convites |
| core-setup | ACTIVE | false | Setup inicial |
| github-deploy | ACTIVE | false | Deploy via GitHub |
| github-push | ACTIVE | false | Push via GitHub |
| auth-test | ACTIVE | false | Testes de auth |
| admin-ui-test | ACTIVE | false | Testes de UI admin |
| v4-energia-lead | A criar | false | Lead do simulador V4 Energia — NÃO deployado ainda |

## Padrões observados na core-api

- Import: `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
- CORS: `{ 'Access-Control-Allow-Origin':'*', ... }` — * em v1
- Resposta sucesso: `{ ok: true, ... }` ou `{ error: string }`
- Cliente criado dentro do handler (não no top-level)
- Logs: `console.log(...)` / `console.error(...)`
- Env: `Deno.env.get('SUPABASE_URL')` e `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
