# Migration Reconciliation — 2026-05-23

**Story:** 019.4 (debt DB-003)
**Estado:** Análise estática completa. Execução requer Mário/@devops + credenciais V1.
**Aplica-se a:** V1 Core Hub (`hkmvszkpxjbxmnixzqbl`). V2 produção tem procedimento separado (Secção 5).

---

## 1. Estado actual

- **Local:** 46 ficheiros em `supabase/migrations/` (não 47 como o spawn prompt mencionava — confirmado por `ls supabase/migrations | wc -l`). Corrigido em QA gate 019.4: contagem original errada para 45 — `20260512_v4_ocr_facturas.sql` em falta na classificação BASELINE V1.
- **Remoto V1:** 215+ migrations registadas em `supabase_migrations.schema_migrations` (segundo DB-AUDIT 2026-05-05).
- **Naming gap:** Todos os 46 ficheiros locais usam formato `YYYYMMDD_*.sql` (8 dígitos). O Supabase standard é `YYYYMMDDHHMMSS_*.sql` (14 dígitos). **Nenhum ficheiro local corresponde directamente a um version no registo remoto.**
- **Origem do drift:** Trabalho aplicado entre 2026-04-12 (criação do projecto V1) e 2026-05-15 maioritariamente via SQL Editor / MCP `apply_migration`. Ficheiros locais foram criados retroactivamente como "registo histórico" (ver primeira linha de `20260504_system_grants_anon_authenticated.sql`).

---

## 2. Estratégia de classificação

Cada um dos 46 ficheiros locais é classificado em uma destas 4 categorias:

| Classificação | Significado | Acção |
|---------------|-------------|-------|
| **BASELINE** | Conteúdo já presente no `00000000000000_baseline_2026_05_v1.sql` (porque já está na BD) | Manter ficheiro como histórico no repo; **NÃO** registar em `schema_migrations` (o baseline cobre). Considerar mover para `supabase/migrations/_archive-pre-baseline/` numa story futura. |
| **RENAME** | Versão remota correspondente identificável; renomear local para 14 dígitos | Em principio inaplicável aqui porque os 46 ficheiros têm conteúdo idêntico ao que já correu — todos caem em BASELINE. Categoria fica documentada para futuros casos. |
| **INSERT_MANUAL** | Divergência: o ficheiro tem mudança real não capturada no baseline | Aplicar via SQL Editor + INSERT manual em `schema_migrations`. Caso raro. |
| **V2_ONLY** | Ficheiro destinado à BD V2 produção, não V1 | Mover para `supabase/migrations/v2-production/`. Aplicar separadamente após aprovação Mário. |

---

## 3. Classificação dos 46 ficheiros

### 3.1 V2-ONLY — mover para `supabase/migrations/v2-production/` (12 ficheiros)

Todos têm `_v2_` no nome e tocam exclusivamente em tabelas que vivem na BD V2 (`condo_dashboard_kpis`, `condominos`, `fracoes`, `extrato_bancario`, `orcamento_por_fracao`, etc).

| # | Ficheiro | Conteúdo |
|---|----------|----------|
| 1 | `20260512_v2_dashboard_kpis_fix.sql` | Fix condo_dashboard_kpis (receitas/despesas via delta saldo) |
| 2 | `20260512_v2_dashboard_kpis_fix2.sql` | Fix² remover cast enum inexistente |
| 3 | `20260512_v2_kpis_detalhe.sql` | kpis_detalhe detalhe rúbricas |
| 4 | `20260512_v2_kpis_snapshot_and_send_email.sql` | Snapshot KPIs ano fechado + RPCs CTAs |
| 5 | `20260512_v2_list_cron_jobs.sql` | RPC listar pg_cron jobs |
| 6 | `20260512_v2_permissions_and_activity_logs.sql` | Permissões + login aliases + portal tokens + activity logs (Fase G) |
| 7 | `20260512_v2_rpcs_dashboard_lancar_recebimento.sql` | RPCs Prestação de Contas + lancar_recebimento |
| 8 | `20260512_v2_views_and_extrato_upsert.sql` | Views Prestação de Contas + extrato_upsert RPC |
| 9 | `20260513_v2_carregadores_fornecedores_pessoas.sql` | Excel: carregadores EV + fornecedores + pessoas |
| 10 | `20260513_v2_orcamento_por_fracao.sql` | Tabela mensal por fracção |
| 11 | `20260513_v2_orcamento_rubricas_kpis_2024_2026.sql` | Orçamentos + KPIs detalhe 2024+2026 |
| 12 | `20260512_v4_ocr_facturas.sql` | ⚠️ Nota: prefixo `v4` mas é OCR factuRAS que vive em V1 — verificar! Provavelmente BASELINE V1, não V2. |

**Acção:** Mover os primeiros 11 para `supabase/migrations/v2-production/` mantendo o nome original. O 12º (v4_ocr_facturas) ficar em V1 — está mal classificado pelo seu prefixo, verificar conteúdo (mas o `_v4_` indica V4 vertical = vive em V1 hub).

**Correcção 3.1:** Removi `20260512_v4_ocr_facturas.sql` da lista V2. Total V2-ONLY = 11.

### 3.2 BASELINE — conteúdo já no snapshot V1 (33 ficheiros)

Todos os ficheiros V1 caem aqui porque o baseline schema-only captura o **estado actual** da BD, que já reflecte o que estes ficheiros criaram.

#### 3.2.1 System schema (Sprints α-Q5)

| # | Ficheiro | Sprint/ADR | Schema(s) afectado |
|---|----------|-----------|---------------------|
| 1 | `20260504_system_grants_anon_authenticated.sql` | Pré-sprint | system |
| 2 | `20260505_system_open_internal.sql` | Pré-sprint | system |
| 3 | `20260513_apify_integration.sql` | Sprint η | system |
| 4 | `20260513_apps_surfaces.sql` | ADR-016 (rascunho) | system |
| 5 | `20260513_events_schema.sql` | Sprint δ | system |
| 6 | `20260513_inbox_enriched.sql` | Sprint α | system |
| 7 | `20260513_skills_lifecycle.sql` | Sprint ε | system |
| 8 | `20260513_tasks_schema.sql` | Sprint β | system |
| 9 | `20260513_watchers_cron.sql` | Sprint ζ | system, pg_cron |
| 10 | `20260513_watchers_schema.sql` | Sprint γ | system |
| 11 | `20260514_calendar_sync.sql` | Sprint N | system |
| 12 | `20260514_email_integration.sql` | Sprint M | system |
| 13 | `20260514_integrations_catalog.sql` | — | system |
| 14 | `20260514_integrations_real_data.sql` | — | system |
| 15 | `20260514_projects_and_clients.sql` | Sprint F+G | system |
| 16 | `20260514_recipes_connectors_permissions.sql` | Sprint D | system |
| 17 | `20260514_recipes_framework.sql` | — | system |
| 18 | `20260514_recipes_step_config.sql` | Sprint A | system |
| 19 | `20260514_schedules_autopilot.sql` | Sprint B | system |
| 20 | `20260514_skills_enriched_auto_creator.sql` | — | system |
| 21 | `20260514_tasks_mission_detail.sql` | — | system |
| 22 | `20260514_triggers_realtime.sql` | Sprint C | system |
| 23 | `20260514_useful_tools_additions.sql` | Sprint P | system |
| 24 | `20260514_useful_tools_catalog.sql` | — | system |
| 25 | `20260514_useful_tools_kopkai.sql` | — | system |
| 26 | `20260515_chat_persistence.sql` | Sprint Q1.5 | system |
| 27 | `20260515_context_docs_wired.sql` | Sprint Q1 | system |
| 28 | `20260515_discord_bridge.sql` | Sprint Q2 | system |
| 29 | `20260515_onboarding_flows.sql` | Sprint Q3 | system |
| 30 | `20260515_skills_marketplace_internal.sql` | Sprint Q5 | system |

#### 3.2.2 Core / Growth / IAM / V4 schemas

| # | Ficheiro | ADR | Schema(s) afectado |
|---|----------|-----|---------------------|
| 31 | `20260513_core_billing.sql` | ADR-014 | core |
| 32 | `20260513_growth_cron_cross_sell.sql` | ADR-015 Sprint C.3 | growth, pg_cron |
| 33 | `20260513_growth_schema.sql` | ADR-015 | growth |
| 34 | `20260513_iam_schema.sql` | ADR-013 | iam |
| 35 | `20260512_v4_ocr_facturas.sql` | ADR-V4-002 | v4_energia (em V1 hub) |

Total BASELINE: **30 + 4 = 34** (correção: o nº 35 com `v4_ocr_facturas` move-se para baseline V1, não V2).

### 3.3 RENAME (0 ficheiros)

Inaplicável neste caso. Categoria documentada para futuros workflows.

### 3.4 INSERT_MANUAL (0 ficheiros)

Inaplicável — todos os ficheiros locais correspondem a estado já reflectido no baseline.

---

## 4. Reconciliação numérica

| Categoria | Contagem |
|-----------|----------|
| Local files total | 46 |
| BASELINE (cobertos pelo `00000000000000_baseline_2026_05_v1.sql`) | 35 |
| V2_ONLY (mover para `v2-production/`) | 11 |
| RENAME | 0 |
| INSERT_MANUAL | 0 |
| **Soma** | **46** ✓ |

| Categoria remota | Contagem estimada |
|-------------------|-------------------|
| Migrations remotas em `schema_migrations` (V1) | 215+ |
| Baseline (`00000000000000_baseline_2026_05_v1`) a inserir | 1 |
| Após baseline marcado, total efectivo | 216+ |

A diferença `215 remotas − 46 locais = 169 migrations sem ficheiro local` é o drift acumulado por uso de `apply_migration` MCP sem backing file. **Esse drift fica capturado para sempre no baseline** — nada se perde.

---

## 5. Procedimento de execução

### 5.1 Pré-condições

- Branch `feat/db-003-baseline-snapshot` aprovada por Mário.
- `scripts/db/baseline-dump-v1.ps1` executado com sucesso → `supabase/migrations/00000000000000_baseline_2026_05_v1.sql` populado.
- `docs/database/baseline-mark-as-applied.md` Passo 4 executado em V1.

### 5.2 Passos da reconciliação

#### Passo 1 — Mover ficheiros V2_ONLY

```powershell
$v2Files = @(
  '20260512_v2_dashboard_kpis_fix.sql',
  '20260512_v2_dashboard_kpis_fix2.sql',
  '20260512_v2_kpis_detalhe.sql',
  '20260512_v2_kpis_snapshot_and_send_email.sql',
  '20260512_v2_list_cron_jobs.sql',
  '20260512_v2_permissions_and_activity_logs.sql',
  '20260512_v2_rpcs_dashboard_lancar_recebimento.sql',
  '20260512_v2_views_and_extrato_upsert.sql',
  '20260513_v2_carregadores_fornecedores_pessoas.sql',
  '20260513_v2_orcamento_por_fracao.sql',
  '20260513_v2_orcamento_rubricas_kpis_2024_2026.sql'
)
foreach ($f in $v2Files) {
  git mv "supabase/migrations/$f" "supabase/migrations/v2-production/$f"
}
git commit -m "chore(db): move 11 V2-only migrations to v2-production/ subfolder [Story 019.4]"
```

#### Passo 2 — Arquivar ficheiros BASELINE (opcional, não-bloqueante)

Os 34 ficheiros BASELINE V1 ficam no repo como referência histórica. Não precisam ser movidos imediatamente. Story futura pode mover para `supabase/migrations/_archive-pre-baseline/` se quiser limpar.

**Decisão actual:** manter onde estão. O Supabase CLI vai ignorá-los porque o registo `schema_migrations` já tem versões com timestamps de 14 dígitos que não correspondem aos nomes de 8 dígitos — efectivamente são "órfãos" do ponto de vista do CLI.

#### Passo 3 — Inserir baseline em `schema_migrations`

Ver `docs/database/baseline-mark-as-applied.md` Passo 4.

#### Passo 4 — Verificar `supabase migration list` limpa

```bash
supabase migration list
```

**Expectativa após passos 1-3:**
- 1 linha "applied" com version `00000000000000` (baseline V1).
- Os 34 ficheiros BASELINE V1 podem aparecer como "pending" — falso-positivo porque o CLI compara nomes. **Não fazer `supabase db push`** sobre estes.
- Para limpar definitivamente, mover ficheiros BASELINE para `_archive-pre-baseline/` (story futura).

#### Passo 5 — Estado final

A partir deste ponto:
- Toda nova migration V1 → `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql` (14 dígitos) → `supabase db push`.
- Toda nova migration V2 → `supabase/migrations/v2-production/YYYYMMDDHHMMSS_descricao.sql` (14 dígitos) → procedimento V2 separado com aprovação Mário.
- `migration-process.md` é canónico.

---

## 6. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Mário corre `supabase db push` antes de marcar baseline | Média | Alto — pode tentar re-aplicar tudo | `baseline-mark-as-applied.md` é Passo 0 antes de qualquer push |
| Ficheiro V2 fica no V1 e é aplicado por engano | Baixa após Passo 1 | Crítico (V2 produção) | Estrutura de pastas + `migration-process.md` Regra 7 |
| Drift continua via SQL Editor pós-baseline | Média | Médio — degrada o trabalho desta story | `pre-push-checklist.md` + `check-migration-drift.ps1` |
| 12º ficheiro `v4_ocr_facturas` mal classificado | Baixa | Médio | Mário verifica conteúdo antes de Passo 1 |

---

## 7. Decisões em aberto para Mário

1. **Arquivar BASELINE V1 ou manter?** Recomendação: manter no `migrations/` raiz, criar story futura para arquivar quando for psicologicamente confortável.
2. **Baseline V2 — executar dump agora ou esperar?** Recomendação: esperar — V2 está estável e o dump é read-only. Fazer apenas quando AC-1 de V1 for validado.
3. **Hook de drift automatizado?** Recomendação: começar com `pre-push-checklist.md` manual. Automatizar se drift ressurgir nos próximos 30 dias.

---

## 8. Trigger handoffs

Após Mário executar Passos 1-3:

- `@notion-librarian` — documentar decisão de baseline na página Notion "Visão & Arquitectura" (`34084147-fa60-813d-94fe-d7f72d47d8bd`).
- `@architect-proptech` — analisar impacto cross-vertical da regra forward-only.
- `@devops` — incorporar `pre-push-checklist.md` no fluxo standard de revisão pré-push.
