# DB-AUDIT.md — PropTech Platform · Brownfield Discovery Phase 2
> Auditoria de dívida técnica de BD · 2026-05-23
> Baseline de comparação: `docs/audits/2026-05-05/AUDIT-data.md`
> Produzido por supabase-designer · Read-only · Zero SQL executado

---

## Advisors de Segurança

### V1 Core Hub (`hkmvszkpxjbxmnixzqbl`)

| Tipo | Nível | Count | Descrição |
|---|---|---|---|
| `rls_disabled_in_public` | **ERROR** | 14 | 14 tabelas sem RLS (5 em `public`, 9 em `system.*`) |
| `security_definer_view` | **ERROR** | 40 | 40 vistas com SECURITY DEFINER — qualquer utilizador executa com permissões do criador |
| `rls_policy_always_true` | WARN | 35 | 35 policies com `USING (true)` — acesso irrestrito via role |
| `anon_security_definer_function_executable` | WARN | 106 | 106 funções SECURITY DEFINER executáveis por `anon` via REST |
| `authenticated_security_definer_function_executable` | WARN | 112 | 112 funções SECURITY DEFINER executáveis por `authenticated` |
| `function_search_path_mutable` | WARN | 62 | 62 funções com search_path mutável (risco de injection) |
| `extension_in_public` | WARN | 3 | `pg_net`, `unaccent`, `http` instaladas em schema `public` |
| `public_bucket_allows_listing` | WARN | 3 | 3 buckets públicos com policy SELECT ampla (listing) |
| `rls_enabled_no_policy` | INFO | 2 | 2 tabelas com RLS activo mas sem policies (deny implícito) |
| `auth_leaked_password_protection` | WARN | 1 | HaveIBeenPwned não activado em Supabase Auth |

**Tabelas sem RLS (14 total):**
- `public`: `file_deploy`, `servicos_backup_20260423`, `categorias_backup_20260423`, `subcategorias_backup_20260423`, `frequency_templates`
- `system`: `task_comments`, `useful_tools`, `schedules`, `triggers`, `projects`, `clients`, `calendar_sources`
- `system` (swarm): `swarm_workers`, `niche_icp_cards`
- `v2_condominios` (staging): `_migration_runs`, `_v2_condomino_to_pessoa`, 17 tabelas `_stg_*` e `_stg_pagamentos_agg`, `_stg_bank_payments`

**Tabelas com RLS activo mas sem policies (deny total):**
- `core.codigos_postais` — 205 817 rows, deny implícito (intencionalmente restrito a service_role)
- Uma segunda tabela não identificada pelo summary

**Policies com USING (true) — as mais críticas:**
- `marketing.*` — acesso total a `authenticated` em tabelas de marketing (competitors, scraped_ads, etc.)
- `system.*` — herança da migration `system_open_internal` (dev pragmatism, risco real se anon_key exposta)

### V2 Condo Hub (`eozklslwfaqujaijvdnl`)

| Tipo | Nível | Count | Descrição |
|---|---|---|---|
| `rls_disabled_in_public` | **ERROR** | 8 | `envios_log`, `configuracoes`, `dividas_fracoes_snapshot`, `carregadores_contagens`, `codigos_postais_pt`, `condominos_contactos`, `condominios`, `_deploy_temp` |
| `multiple_permissive_policies` | WARN | ~12 | `permissoes_grupo` (anon ALL), `portal_acessos` (anon INSERT+SELECT), `documentos` (anon SELECT), `documentos_institucionais` (anon/authenticated SELECT) |
| `auth_rls_initplan` | WARN | 5 | `fracoes`, `documentos`, `recebimentos`, `historico_proprietarios`, `condominos` — `current_setting()` reavaliado por row |
| `unindexed_foreign_keys` | INFO | 9 | `dividas_fracoes_snapshot`, `documentos`, `envios_log`, `faturas_ocr`, `faturas_pendentes`, `recebimentos` (3 FKs), `utilizadores_portal` |
| `unused_index` | INFO | ~18 | Índices `brain_*` todos sem uso (tabelas vazias), `idx_audit_*`, `idx_cond_email`, `idx_cond_nif`, `idx_ext_drive`, `idx_fp_rubrica` |

**V2 não tem advisors de segurança críticos novos** face ao baseline — as 8 tabelas sem RLS já existiam.

---

## Advisors de Performance (V1)

| Tipo | Nível | Count | Impacto |
|---|---|---|---|
| `unindexed_foreign_keys` | INFO | 110 | 110 FKs sem índice de cobertura — impacto em JOINs |
| `unused_index` | INFO | 341 | 341 índices nunca usados (incluem índices `v2_condominios._stg_*` de staging) |
| `multiple_permissive_policies` | WARN | 149 | 149 policies permissivas múltiplas — cada query avalia todas |
| `auth_rls_initplan` | WARN | 38 | 38 policies com `auth.<function>()` avaliado por row |
| `duplicate_index` | WARN | 8 | 8 pares de índices idênticos (ex: `idx_audit_agent` e `idx_audit_agent_time`) |
| `no_primary_key` | INFO | 3 | 3 tabelas sem PK: `public.subcategorias_backup_20260423` e 2 staging tables |

---

## Schemas custom expostos via PostgREST

**Diagnóstico (via ADR-V2-002):** A fonte de verdade é `pg_roles.rolconfig` da role `authenticator`.

Schemas que devem estar expostos (per CLAUDE.md):
`public, graphql_public, core, system, iam, marketing, v2_condominios, v3_seguros, v4_energia, v5_manutencao, v1_owners_club, marketing`

Schemas existentes que podem não estar expostos: `v2_new`, `v3_seguros` (sem dados mas schema criado).

**ACÇÃO PENDENTE:** Verificar `SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator'` se REST retornar `PGRST106` em chamadas a `v2_new.*` ou `iam.*`.

---

## Inconsistências de Naming (Opção C)

A convenção canónica define: tabelas limpas sem prefixo `vN_` dentro de schemas verticais.

### Cumprimento por schema

| Schema | Estado | Observação |
|---|---|---|
| `core` | Conforme | Tabelas limpas: `pessoas`, `imoveis`, etc. |
| `iam` | Conforme | Tabelas limpas: `permission_groups`, `activity_logs`, etc. |
| `system` | Conforme | Tabelas limpas — mas schema cresceu muito além do planeado |
| `v4_energia` | **VIOLAÇÃO PARCIAL** | `contratos_energia` (podia ser só `contratos`), `acordos_comercializadoras` (ok), `facturas_uploaded` (ok) |
| `v5_manutencao` | Conforme | Tabelas limpas dentro do schema |
| `v2_condominios` | **VIOLAÇÃO CRÍTICA** | 18 tabelas `_stg_*` (staging) e 2 tabelas `_migration_*` — nomenclatura de infra misturada com dados de negócio |
| `v2_new` | Conforme | 6 tabelas limpas: `condominios`, `fracoes`, `quotas`, etc. |
| `v1_owners_club` | **NOME DE SCHEMA** | Schema deveria chamar-se `v10_owners_club` per CLAUDE.md (mapeado como V10) |
| `public` | **VIOLAÇÃO** | `servicos_backup_20260423`, `categorias_backup_20260423`, `subcategorias_backup_20260423` — tabelas de backup com nome temporal |
| `marketing` | Conforme | Tabelas limpas |

---

## Tabelas sem PK ou sem timestamps

### Sem PK (V1)
- `public.subcategorias_backup_20260423` — backup sem PK (candidata a dropar)
- `v2_condominios._stg_pagamentos_agg` — tabela staging
- `v2_condominios._stg_bank_payments` — tabela staging

### Sem `updated_at` (casos relevantes conhecidos)
- `v3_seguros.simulacoes` — documentado intencionalmente (simulação imutável após criação)
- `v2_condominios.audit_log` — documentado intencionalmente (log imutável)
- Tabelas `_stg_*` e backups — sem triggers (aceitável para dados one-shot)

### Tabelas com RLS activo mas sem policies (deny total)
- `core.codigos_postais` (205 817 rows) — acesso via service_role apenas
- Verificar se há quebra de acesso em queries que tentam ler codigos_postais via authenticated

---

## Foreign Keys cross-vertical em risco

| FK | De | Para | Risco |
|---|---|---|---|
| `facturas_uploaded.pessoa_id` → `core.pessoas` | `v4_energia` | `core` | OK — SET NULL (RGPD) |
| `facturas_uploaded.workspace_id` → `core.workspaces` | `v4_energia` | `core` | OK — RESTRICT |
| `v2_new.condominios.core_condominio_id` → `core.condominios` | `v2_new` | `core` | OK — RESTRICT |
| `v2_new.fracoes.condomino_id` → `core.pessoas` | `v2_new` | `core` | OK — SET NULL |
| `v2_condominios.condominos.pessoa_id` → `core.pessoas` | `v2_condominios` | `core` | Verificar — a tabela V2 tem RLS própria |
| `iam.*` → `auth.users` (implícito) | `iam` | `auth` | Sem FK explícita — UUID hardcoded em alguns casos |

**Risco principal identificado:** `v2_condominios._stg_*` e `_migration_*` não têm FKs para nenhum lado — são tabelas de staging isoladas. Se a migração for abandonada, estes dados ficam orphaned.

---

## Schemas vazios ou semi-implementados

| Schema | Estado | Tabelas | Decisão recomendada |
|---|---|---|---|
| `v3_seguros` | Semi — schema criado, 0 dados | 4 tabelas (seguradoras, apolices, sinistros, simulacoes) | Aguarda arranque V3 (ADR-V3-001 em triggers, aguarda aprovação Mário) |
| `v2_new` | Semi — schema criado, 0 dados | 6 tabelas com FKs core.* | Schema destino do cutover V2; aguarda importador |
| `v1_owners_club` | Activo com dados | 3 tabelas, 6 rows | Nome de schema errado (devia ser `v10_owners_club`) |
| `v9_swan` | **NÃO EXISTE** | — | Eliminado do plano inicial, schema nunca criado |

---

## Migrations locais vs migrations remotas — Divergências

### Situação actual

**Migrations remotas (Supabase):** 262 aplicadas
**Migrations locais (`supabase/migrations/` raiz):** 47 ficheiros

**Gap:** 215 migrations remotas sem ficheiro local correspondente.

### Categorias de divergência

1. **Aplicadas via MCP sem ficheiro local** (maioria): Todas as migrations Sprint C1, C2, B1, B2, B3 e seguintes foram aplicadas directamente via `apply_migration()` MCP — sem criar ficheiro `.sql` no repositório.

2. **Ficheiros locais sem correspondência remota confirmada:** 5 ficheiros locais com nomes que não correspondem exactamente a nenhuma migration remota (diferença de naming convention entre local e remoto):
   - `supabase/migrations/20260513_iam_schema.sql` — a migration remota correspondente tem versão `20260512162753` e nome `20260512_v2_permissions_logs_schema`
   - `supabase/migrations/20260513_growth_schema.sql` — sem correspondência clara remota
   - `supabase/migrations/20260513_core_billing.sql` — sem correspondência clara remota

3. **Dívida crítica persistente desde baseline 2026-05-05 (não resolvida):** As migrations `20260505_v2_condominios_schema`, `20260505_v3_seguros_schema`, `20260505_v4_energia_schema` continuam aplicadas em produção mas **sem ficheiro SQL** local no repositório git.

**Analogia contabilística:** É como ter 215 lançamentos no livro diário (Supabase) sem o documento justificativo de suporte (ficheiro SQL). Qualquer rebuild do projecto a partir do git não reproduz o estado actual da BD.

---

## Top 10 Dívidas por Severidade

| # | Severity | Dívida | Projecto | Delta desde baseline |
|---|---|---|---|---|
| 1 | **CRÍTICO** | **35 tabelas sem RLS** no V1 (14) e V2 (8) — anon_key exposta implica acesso livre a dados | V1 + V2 | **PIOROU** (V1: era 5, agora 14) |
| 2 | **CRÍTICO** | **40 vistas SECURITY DEFINER** no V1 — qualquer role executa com privilégios do owner, bypassa RLS | V1 | **NOVO** (era 54 ERRORs security_definer mencionados, agora confirmado count) |
| 3 | **ALTO** | **215 migrations sem ficheiro local** — impossível reproduzir BD a partir do git | V1 | **PIOROU** (era gap de ~3 migrations, agora 215) |
| 4 | **ALTO** | **67 Edge Functions no V1, maioria não versionada** em git — baseline era 15 EFs com 12 não versionadas | V1 | **PIOROU** (era 12 não versionadas de 15, agora ~50 de 67) |
| 5 | **ALTO** | **106+112 funções SECURITY DEFINER executáveis por anon/authenticated** — superfície de ataque enorme | V1 | **NOVO** (cresceu com as 7 RPCs CRM e swarm) |
| 6 | **ALTO** | **`bia-chat` e `mia-chat` coexistem** — rename incompleto, dois endpoints de chat activos, possível duplicação de custo AI | V1 | **NOVO** (rename Bia→Mia em 2026-05-18, ainda não limpo) |
| 7 | **MÉDIO** | **18 tabelas `_stg_*` e 2 `_migration_*` em `v2_condominios`** sem RLS — staging residual da migração V2 | V1 | **NOVO** (criadas durante migração V2 em Maio) |
| 8 | **MÉDIO** | **62 funções com `search_path` mutável** — risco de search_path injection em funções SECURITY DEFINER | V1 | PIOROU (cresceu com novas funções CRM/swarm) |
| 9 | **MÉDIO** | **Schema `v1_owners_club` com nome errado** (devia ser `v10_owners_club` per CLAUDE.md) | V1 | Persistente desde baseline |
| 10 | **MÉDIO** | **8 tabelas `brain_*` em V2** (produção) sem propósito claro — possível residual funcionalidade Mia, 0 dados mas ocupam schema | V2 | **NOVO** (criadas 2026-05-16) |

---

## Análise de Deltas face ao Baseline 2026-05-05

### Resolvido desde baseline

- `function_search_path_mutable` em `set_updated_at` (V2) — corrigido em migration `20260512_v2_condominios_audit_p1_p2_p3`
- `auth_rls_initplan` em V2 (8 casos) — 5 corrigidos (3 persistem)
- 4 FKs sem índice em V2 (`atas`, `carregadores`, `faturas_pendentes`, `seguro_fracoes`) — corrigidos
- `anon_security_definer` em `get_my_edificios` (V2) — REVOKE aplicado

### Piorado desde baseline

- Tabelas sem RLS no V1: de 5 para 14 (+9 tabelas `system.*` e swarm)
- Edge Functions não versionadas: de 12/15 para ~50/67
- Gap migrations local/remoto: de ~3 para ~215

### Novo desde baseline (não existia em 2026-05-05)

- Schema `iam` (ADR-013) — 6 tabelas, policies via `iam.has_permission()`
- Schema `marketing` — 13 tabelas, advisors de policies always_true
- Schema `v2_new` — 6 tabelas destino do cutover
- Schema `system` cresceu de 3 para 34 tabelas
- 40 vistas SECURITY DEFINER (cresceram com CRM e swarm views)
- `system.swarm_workers` e `system.niche_icp_cards` sem RLS (intencional — acesso service_role)
- Tabelas `_stg_*` em `v2_condominios` (staging migração)
- Tabelas `brain_*` em V2 (propósito incerto)
- `bia-chat` + `mia-chat` coexistentes

---

*Produzido por supabase-designer · 2026-05-23 · Read-only audit · Zero SQL executado*
*Baseline: docs/audits/2026-05-05/AUDIT-data.md*
