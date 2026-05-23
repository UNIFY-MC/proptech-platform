# SCHEMA.md — PropTech Platform · Brownfield Discovery Phase 2
> Produzido por supabase-designer · 2026-05-23 · Read-only · Zero SQL executado

---

## V1 Core Hub — `hkmvszkpxjbxmnixzqbl` (eu-west-3, Paris)

### Schemas e tabelas

| Schema | Tabelas | Rows notáveis | Estado |
|---|---|---|---|
| `core` | 32 | pessoas 79, imoveis 98, codigos_postais 205 817, faturas 525, recebimentos 525, servicos_ativos 97, agent_audit_log 87 | Activo com dados reais |
| `iam` | 6 | permission_groups 4, permission_sections 27, permission_grants 84, portal_tokens 99, activity_logs 77 | Activo (ADR-013) |
| `system` | 34 | skills 92, integrations 55, recipes 51, employee_skills 87, agent_profile 27, email_messages 123, calendar_events 36, chat_messages 55, inbox_items 27, swarm_niches 10, swarm_workers 25, swarm_runs 10, tasks 51 | Activo — motor agentic |
| `marketing` | 13 | competitors 37, scraped_ads 63, scrape_jobs 11, sectors 2, kpi_snapshots 5 | Activo |
| `v2_condominios` | 47 | fracoes 97, condominos 97, recebimentos 1 254, extrato_bancario 1 056, faturas_pendentes 172, documentos 192, faturas_ocr 99, carregadores_contagens 237, seguro_fracoes 96, portal_tokens 99, orcamento_por_fracao 294, orcamento_rubricas 83, divida_2026_agregada 97, kpis_detalhe 115 | Activo (V2 migrado) — inclui 18 tabelas _stg_* e 2 tabelas _migration_* |
| `v2_new` | 6 | Todas vazias | Schema novo para cutover V2 (ADR-V11-004) |
| `v3_seguros` | 4 | Todas vazias | Schema criado, sem dados |
| `v4_energia` | 10 | acordos_comercializadoras 8, contratos_energia 7, tarifas 8, comercializadores 8, facturas_uploaded 1 | Activo parcialmente |
| `v5_manutencao` | 40 | catalogo_servicos 16, servicos_inclui_exclui 228, sub_grupos_config 38, advisor_mensagens 18, magic_links 8, subscricoes 4 | Activo — vertical V5 |
| `v1_owners_club` | 3 | ofertas 6 | Stub activo (antes v9_swan) |
| `public` | 22 | servicos 199, subcategorias 45, ordens 17 — mais 4 tabelas sem RLS (backups + file_deploy + frequency_templates) | Legacy V5 + backups |

**Total V1: ~217 tabelas activas** (incluindo staging tables e vistas)

### Contagem por schema

| Schema | #Tabelas | #Rows total estimado |
|---|---|---|
| `core` | 32 | ~208k (dom. codigos_postais) |
| `iam` | 6 | ~291 |
| `system` | 34 | ~800+ |
| `marketing` | 13 | ~130 |
| `v2_condominios` | 47 | ~4 300 (dados migrados) |
| `v2_new` | 6 | 0 |
| `v3_seguros` | 4 | 0 |
| `v4_energia` | 10 | ~32 |
| `v5_manutencao` | 40 | ~450 |
| `v1_owners_club` | 3 | ~6 |
| `public` | 22 | ~350 |

### Extensões instaladas (não-default)

| Extensão | Schema instalação | Versão | Uso principal |
|---|---|---|---|
| `pg_cron` | `pg_catalog` | 1.6.4 | Cron jobs (bridge V2, swarm, gmail sync, etc.) |
| `vector` | `extensions` | 0.8.0 | Embeddings HNSW em `system.swarm_discoveries` |
| `pg_trgm` | `extensions` | 1.6 | FTS fuzzy + dedup waterfall `core.dedup_check_pessoa` |
| `pgcrypto` | `extensions` | 1.3 | Hashing e tokens seguros |
| `uuid-ossp` | `extensions` | 1.1 | Geração de UUIDs |
| `pg_stat_statements` | `extensions` | 1.11 | Query performance monitoring |
| `pg_net` | `public` | 0.20.0 | HTTP async (notificações Discord, webhooks) |
| `supabase_vault` | `vault` | 0.3.1 | Gestão de secrets |
| `http` | `public` | 1.6 | HTTP client síncrono |
| `unaccent` | `public` | 1.1 | FTS português sem acentos |

**Nota:** `pg_net` e `unaccent` estão instalados em `public` — advisor assinala como risco (ver DB-AUDIT.md).

### Migrations aplicadas

- **Total registado:** 262 migrations (versão mais antiga: `20260413015041`, mais recente: `20260518150724` — `rename_bia_to_mia_introduce_personal_assistant_v2`)
- **Delta desde baseline 2026-05-05:** +~170 migrations aplicadas em 18 dias

**Migrations locais em `supabase/migrations/` (raiz):** 47 ficheiros SQL
- As migrations locais têm nomes de data mas sem garantia de correspondência 1-para-1 com as 262 remotas (ver DB-AUDIT.md secção Divergências).

**Últimas 10 migrations (mais recentes):**

| Versão | Nome |
|---|---|
| 20260518150724 | rename_bia_to_mia_introduce_personal_assistant_v2 |
| 20260518013341 | 202605180009_b3_crons_and_jina_reactivate |
| 20260518013329 | 202605180008_swarm_find_similar_rpc |
| 20260518012828 | 202605180006_c3_lists_queries_fix |
| 20260518012537 | 202605180005_c3_lists_seeds |
| 20260518012516 | 202605180004_b3_swarm_pipeline_schema |
| 20260518012448 | 202605180003_system_inbox_sources |
| 20260518012423 | 202605180002_c3_lists_evaluate_rpc |
| 20260518012357 | 202605180001_a3_email_alias_persona |
| 20260518001820 | 20260518_swarm_b2_schema_additions |

### RPCs / Functions custom relevantes

| RPC | Schema | Tipo | Descrição |
|---|---|---|---|
| `iam.has_permission(section, action)` | `iam` | SECURITY DEFINER | Guard RLS cross-vertical |
| `iam.user_can(section, action)` | `iam` | SECURITY DEFINER | Helper RLS |
| `iam.get_my_permissions()` | `iam` | SECURITY DEFINER | Permissões do utilizador actual |
| `iam.staff_login_lookup(alias)` | `iam` | SECURITY DEFINER | Login staff por alias |
| `iam.portal_token_login(token)` | `iam` | SECURITY DEFINER | Login portal condómino |
| `core.dedup_check_pessoa(...)` | `core` | SECURITY DEFINER | Waterfall dedup 5 passos |
| `core.ask_property007_intent(...)` | `core` | SECURITY DEFINER | Intenção AI (208 instâncias anon/authenticated) |
| `swarm_claim_next_niche()` | `system` | SECURITY DEFINER | SELECT FOR UPDATE SKIP LOCKED para swarm |
| `core.list_records(...)` | `core` | SECURITY DEFINER | CRM Attio-style record listing |
| `core.get_activity_timeline(...)` | `core` | SECURITY DEFINER | Timeline unificada de actividade |

### Edge Functions deployadas (V1) — 67 funções ACTIVE

| Categoria | Slugs | verify_jwt | Nota |
|---|---|---|---|
| Core infra | `core-api` (v35), `core-invite`, `core-setup` | false | core-api é a mais iterada |
| GitHub | `github-deploy`, `github-push` | false | Não versionadas em git |
| Auth/Test | `auth-test`, `admin-ui-test`, `agent-test` | false/true | Dívida — funções de teste em produção |
| V4 Energia | `v4-energia-lead`, `v4-ingest-erse`, `v4-ingest-omie`, `v4-ocr-fatura` | true/false | Versionadas |
| V5 Manutenção | `agent-casa-advisor`, `agent-image-inspector`, `weather-forecast`, `gerar-magic-link`, `prestador-onboarding`, `delete-account` | true/false | Maioria não versionada |
| Email/Gmail | `send-email`, `gmail-inbound`, `gmail-send`, `gmail-send-google`, `gmail-sync-oauth`, `gmail-action`, `gmail-classify-batch`, `gmail-draft-reply`, `gmail-auto-draft-batch`, `email-auto-archive` | mixed | |
| Calendar | `gcal-sync`, `calendar-create`, `calendar-list`, `calendar-sync-oauth`, `calendar-update` | false | |
| Discord | `discord-send`, `discord-inbound`, `discord-morning-brief`, `discord-bot-setup`, `discord-list-channels`, `discord-attach-channel`, `notify-discord` | false | |
| Mia/Bia | `mia-chat`, `bia-chat`, `bia-discord-setup`, `bia-discord-find-mario`, `agent-chat` | true/false | Bia→Mia rename em curso |
| Google OAuth | `google-oauth-start`, `google-oauth-callback` | false | |
| Swarm/Truth | `swarm-orchestrator`, `swarm-worker-jina`, `swarm-worker-apify-idealista`, `swarm-dedupe`, `swarm-discovery-emitter`, `swarm-refiner` | false | ADR-V11-005 |
| CRM/Dedup | `crm-dedup-resolve`, `v2-legacy-bridge-cron`, `v2-recibo-pdf` | false | ADR-V11-004 |
| Marketing | `meta-leads-webhook`, `growth-track-event`, `watcher-news`, `watcher-instagram`, `watcher-x`, `watcher-competitor`, `watcher-apify-batch`, `apify-webhook`, `apify-run-actor`, `competitor-report` | false | |
| Agentic | `task-execute`, `trigger-fire`, `schedule-run`, `skill-create`, `agent-self-generate-skill`, `feed-synthesize`, `daily-roundup`, `stack-usage-fetch` | false | |
| Drive/Hermes | `drive-search`, `hermes-channel-setup` | false/true | |
| Infra | `ocr-fatura`, `pdf-proxy`, `ai-assistant` | true | Duplicados de V2 |

**Nota crítica:** `bia-chat` (v20) e `mia-chat` (v4) coexistem — rename em curso. `ocr-fatura`, `pdf-proxy`, `ai-assistant` são duplicados de funções existentes em V2.

---

## V2 Condo Hub — `eozklslwfaqujaijvdnl` (produção — NÃO ALTERAR)

### Schemas e tabelas

| Schema | Tabelas | Rows notáveis | Estado |
|---|---|---|---|
| `public` | 39 | documentos 2 733, codigos_postais_pt 205 817, recebimentos 593, extrato_bancario 1 056, faturas_pendentes 172, faturas_ocr 99, condominos 65, fracoes 97, historico_proprietarios 97, orcamentos 83, orcamento_por_fracao 294, portal_acessos 50, utilizadores_portal 64, seguro_fracoes 98, audit_log 157 | PRODUÇÃO VIVA |

**Total V2: 39 tabelas em `public` (schema único)**

### Extensões instaladas (não-default)

| Extensão | Schema | Versão | Uso |
|---|---|---|---|
| `pgcrypto` | `extensions` | 1.3 | Hashing passwords portal |
| `uuid-ossp` | `extensions` | 1.1 | UUIDs |
| `pg_trgm` | `extensions` | 1.6 | Busca fuzzy OCR |
| `pg_stat_statements` | `extensions` | 1.11 | Monitoring |
| `http` | `public` | 1.6 | HTTP client (OCR calls) |
| `supabase_vault` | `vault` | 0.3.1 | Secrets |

**V2 NÃO tem:** `pg_cron`, `vector`, `pg_net`, `unaccent` — stack mais simples que V1.

### Migrations aplicadas (V2)

- **Total registado:** ~195 migrations (mais antiga: `20260329142218`, mais recente: `20260516172604` — `brain_profile_data_blob`)
- **Nota inesperada:** Foram aplicadas 4 migrations de schema `brain_*` em V2 (2026-05-16): `brain_schema_initial`, `brain_schema_hardening`, `brain_external_unique`, `brain_profile_data_blob` — com 8 tabelas `public.brain_*` (profiles, authors, books, discs, recipes, runs, articles, journal). Estas tabelas têm RLS activo mas 0 rows. Propósito não claro — possível residual de funcionalidade Mia.

### Edge Functions deployadas (V2) — 9 funções ACTIVE

| Slug | verify_jwt | Versão | Nota |
|---|---|---|---|
| `send-email` | false | v18 | Email condóminos |
| `ocr-fatura` | false | v22 | OCR faturas (original V2) |
| `migrar-faturas` | false | v7 | Migração one-shot (legacy) |
| `migrar-fatura` | false | v8 | Migração one-shot (legacy) |
| `send-login-link` | false | v11 | Magic link portal |
| `ocr-batch` | false | v5 | OCR em lote |
| `pdf-proxy` | false | v3 | Proxy PDFs |
| `ai-assistant` | false | v7 | AI genérico |
| `core-api` | false | v3 | API bridge (versão muito mais antiga que V1 v35) |

**Funções de migração (`migrar-faturas`, `migrar-fatura`) deveriam ser desactivadas** — são one-shot e estão em produção.

---

## Comparação V1 vs V2 (delta desde baseline 2026-05-05)

| Métrica | Baseline (2026-05-05) | Actual (2026-05-23) | Delta |
|---|---|---|---|
| Schemas V1 | 8 activos | 11 activos (+ `iam`, `marketing`, `v2_new`) | +3 schemas |
| Tabelas V1 | ~120 | ~217 | +~97 tabelas |
| Migrations V1 | ~93 | 262 | +169 migrations |
| Edge Functions V1 | 15 | 67 | +52 funções |
| Edge Functions V2 | 9 | 9 | sem alteração |
| Schemas vazios V1 | v9_swan, v10_owners_club | v2_new, v3_seguros (dados 0) | v9/v10 eliminados, v2_new criado |

---

*Produzido por supabase-designer · 2026-05-23T~14:00Z · Read-only · Zero SQL executado*
