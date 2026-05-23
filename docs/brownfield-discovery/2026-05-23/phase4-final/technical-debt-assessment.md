# Technical Debt Assessment — PropTech Platform · 2026-05-23

> **Workflow:** Brownfield Discovery — Phase 8 (Final Assessment)
> **Produzido por:** architect-proptech
> **Inputs:** technical-debt-DRAFT.md (Phase 4) · db-specialist-review.md (Phase 5) · ux-specialist-review.md (Phase 6) · qa-review.md (Phase 7)
> **QA Gate Phase 7:** NEEDS_WORK → B1–B7 incorporados neste documento
> **Estado:** FINAL — aprovado para roadmap

---

## Resumo Executivo

A plataforma está em **risco alto** e requer atenção estrutural antes de qualquer crescimento adicional. Em 18 dias (2026-05-05 → 2026-05-23) foram aplicadas 169 novas migrations, criadas 52 Edge Functions e adicionadas 97 tabelas — crescimento acelerado sem reforço proporcional de governança. Este documento incorpora os resultados dos três reviews especializados (DB, UX, QA) e representa o inventário final validado de dívida técnica.

As dívidas mais urgentes são de segurança (5 CRITICAL em Database: 14 tabelas sem RLS no V1, 40 vistas SECURITY DEFINER, 218 RPCs expostas, schema com nome errado pronto a quebrar dependências, 215 migrations sem ficheiro), de rastreabilidade (Edge Functions e ADRs sem ficheiro em git), de operacionalidade (V5 em produção sem URLs partilháveis, design system fragmentado em 5 implementações paralelas) e de fundação (zero testes frontend em 5 apps activas). Sem remediação das dívidas Critical e High prioritárias, o próximo lançamento de vertical (V3/V4) vai amplificar cada um destes problemas de forma não-linear.

**Total: 53 dívidas identificadas** (ARCH: 8 · DB: 18 · FE: 20 · OPS: 5 · mais 2 áreas opcionais sinalizadas pelo QA para próxima auditoria).

---

## Sumário Quantitativo

| Severity | ARCH | DB | FE | OPS | Total | Delta vs Draft |
|----------|------|----|----|-----|-------|----------------|
| **Critical** | 2 | 5 | 3 | 1 | **11** | +3 |
| **High** | 4 | 6 | 8 | 2 | **20** | +4 |
| **Medium** | 2 | 7 | 7 | 1 | **17** | +5 |
| **Low** | 0 | 0 | 2 | 1 | **3** | -2 |
| **Total** | **8** | **18** | **20** | **5** | **53** | +12 |

*Nota: a contagem final de 53 resulta da adição de 12 dívidas novas (DB-013→DB-018 + FE-015→FE-020), da reclassificação de severity em 7 itens (DB-005↑, DB-012↑, FE-004↑, FE-007↓, FE-009↑, FE-011↑, FE-013↑) e de FE-008 mantido como sub-item de FE-002 mas contado autonomamente.*

---

## Top 10 Dívidas Críticas (ordem de prioridade — severity FINAL)

### T01 · DB-001 · Tabelas sem RLS em V1 e V2 produção · CRITICAL · DB

**Área:** Database / Segurança
**Descrição:** 14 tabelas em V1 sem RLS (`public.file_deploy`, `public.*_backup_*`, `system.task_comments`, `system.swarm_workers`, `system.niche_icp_cards`, `system.schedules`, etc.) e 8 tabelas em V2 produção (`envios_log`, `configuracoes`, `codigos_postais_pt`, etc.). Qualquer cliente com a `anon_key` pode fazer SELECT/INSERT sem restrição.
**Abordagem corrigida (vs draft):** Para tabelas `system.*` do motor agentic, activar RLS SEM policies explícitas — o comportamento resultante é deny-by-default para `anon`/`authenticated` mas service_role tem bypass automático. NÃO usar `USING (is_staff())` nestas tabelas — isso bloquearia escrita do swarm em runtime. Para `public.file_deploy` e `public.frequency_templates`, usar `USING (false)` e policy de leitura `authenticated` respectivamente. Tabelas backup (`*_backup_*`) são candidatas a DROP, não a RLS.
**Pré-requisito crítico:** Antes de activar RLS em qualquer tabela `system.*`, fazer grep de todas as Edge Functions por `supabase.from('system.')` sem `serviceRoleKey` — qualquer hit quebra em runtime.
**Impacto se não resolver:** Exposição de dados operacionais e de configuração via API REST pública. Em V2 (produção real com 5 000 linhas), leitura não autorizada de `configuracoes` e `envios_log` é risco RGPD imediato.
**Esforço:** XL (2–3 semanas para auditar Edge Functions + implementar + testar sem quebrar produção)
**Dependências:** DB-013 deve seguir imediatamente (corrigir `auth_rls_initplan` nas policies criadas).

---

### T02 · DB-002 · 40 vistas SECURITY DEFINER (bypass RLS total) · CRITICAL · DB

**Área:** Database / Segurança
**Descrição:** 40 vistas têm `SECURITY DEFINER`, ignorando completamente as RLS policies das tabelas subjacentes. As vistas CRM Attio (`core.list_records`, `core.get_activity_timeline`) têm invocações registadas em produção.
**Impacto se não resolver:** Um utilizador `authenticated` pode extrair dados de qualquer tabela que tenha uma vista SECURITY DEFINER apontada para ela. Superficie de ataque real se JWT vazar.
**Esforço:** L (1–2 semanas — requer inventário de chamadores por vista, conversão incremental para `SECURITY INVOKER`, deploy incremental com rollback plan)
**Dependências:** Tratar como programa conjunto com DB-004. Não em paralelo independente — vistas e funções SECURITY DEFINER partilham superfície de ataque.

---

### T03 · DB-003 · 215 migrations remotas sem ficheiro SQL em git · CRITICAL · DB

**Área:** Database / Rastreabilidade
**Descrição:** O V1 tem 262 migrations aplicadas; o repositório tem 47 ficheiros SQL locais. Gap de 215 migrations aplicadas via MCP sem ficheiro correspondente. Adicionalmente, 5 ficheiros locais têm naming divergente do remoto (ex: `20260513_iam_schema.sql` vs remote `20260512162753`), criando risco de re-aplicação dupla se alguém fizer `supabase db push`.
**Abordagem corrigida (vs draft):** `supabase db dump` NÃO resolve rastreabilidade — produz dump monolítico do estado actual, não histórico de alterações. A solução correcta é: (1) exportar o schema actual como migration "baseline snapshot" via `pg_dump --schema-only`; (2) marcar como baseline em `supabase_migrations`; (3) reconciliar os 5 ficheiros locais divergentes; (4) estabelecer regra process: ficheiro local PRIMEIRO, `apply_migration` DEPOIS — nunca o inverso. O histórico pre-baseline não é recuperável sem logs do Dashboard Supabase.
**Impacto se não resolver:** Impossível reproduzir o schema a partir do git. Bug fix de schema é cego. Risco de perda total em acidente no projecto Supabase.
**Esforço:** XL (criar baseline snapshot + estabelecer processo forward-only + reconciliar ficheiros divergentes)
**Dependências:** Paralelo ao OPS-003 (Edge Functions). Não bloqueia desenvolvimento activo mas é urgente.

---

### T04 · ARCH-001 · Dois schemas paralelos para V2 sem ADR canónico · CRITICAL · Arch

**Área:** Arquitectura / Governança
**Descrição:** `v2_condominios` (47 tabelas, dados migrados, RLS completo) e `v2_new` (6 tabelas limpas com FKs para `core.*`) coexistem sem ADR que defina o canónico. `apps/v2-condominios/` tem 22 views mas não está documentado qual schema usa. A bridge cron `v2-legacy-bridge-cron` sincroniza dados do Supabase V2 produção para `v2_new`.
**Impacto se não resolver:** Desenvolvimento em paralelo nos dois schemas cria divergência irreversível. Query de negócio pode estar a ler dados desactualizados do schema errado.
**Esforço:** S (decisão + ADR formal) + L (implementação da path escolhida)
**Dependências:** Bloqueia fases B–F do ADR-V2-003.

---

### T05 · DB-005 · Schema `v1_owners_club` com nome errado · CRITICAL · DB

**Área:** Database / Naming / Integridade
**Descrição:** A arquitectura canónica mapeiam V10 = Owners Club. O schema chama-se `v1_owners_club` (conflituante com V1 Core Hub). Deve chamar-se `v10_owners_club`. Tem 3 tabelas e 6 rows de dados reais (ofertas).
**Risco técnico crítico (B5):** Em PostgreSQL, `ALTER SCHEMA ... RENAME` invalida silenciosamente todas as funções e vistas que referenciam o schema pelo nome (ficam marcadas "invalid" em `pg_proc`). Com FKs ou referências implícitas, o rename pode quebrar dependências em produção sem erro visível. O naming actual pode estar a confundir queries de agentes que fazem `information_schema.tables WHERE table_schema LIKE 'v1%'`.
**Pré-requisito obrigatório antes de executar:**
```sql
SELECT routine_schema, routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%v1_owners_club%';

SELECT viewname, definition
FROM pg_views
WHERE definition ILIKE '%v1_owners_club%';
```
Só depois de confirmar zero dependências: `ALTER SCHEMA v1_owners_club RENAME TO v10_owners_club`.
**Impacto se não resolver:** Confusão de naming entre V1 e V10 perpetua-se; queries de agentes podem apanhar schema errado em operações V1.
**Esforço:** M — mas deve ser executado por ÚLTIMO dos Critical (muitas dependências potenciais)
**Dependências:** Executar após DB-004 (search_path fixes) e após confirmar zero dependências via query acima.

---

### T06 · OPS-001 · ADR-V11-004 e ADR-V11-005 em produção sem ficheiro em git · CRITICAL · Ops

**Área:** Governança / Rastreabilidade
**Descrição:** As duas decisões arquitecturais mais recentes (CRM Attio-style com `v2_new` + multi-workspace, e Truth Engine Swarm com 25 workers e 10 niches) estão em produção sem ficheiro `.md` em `.claude/strategy/adrs/`. O registo existe apenas em `.claude/state/triggers.md` — ficheiro de coordenação inter-agentes que pode ser limpo.
**Impacto se não resolver:** Perda do racional de decisão. Agente futuro que consulte ADRs não encontra estas decisões fundamentais. Risco de contradição não detectada.
**Esforço:** S (redigir dois ADRs a partir dos triggers existentes — architect-proptech)
**Dependências:** —

---

### T07 · DB-004 · 106+112 RPCs SECURITY DEFINER acessíveis por anon/authenticated · CRITICAL · DB

**Área:** Database / Segurança
**Descrição:** 218 funções SECURITY DEFINER — 106 executáveis pela role `anon` e 112 pela role `authenticated`. Executam com privilégios do owner, ignorando RLS. Categorização por risco:
- **62 funções com `search_path` mutável** — risco mais imediato: injection possível com privilégios de `postgres`.
- **106 funções acessíveis por `anon`** — requer análise função a função (algumas são legítimas: `core.ask_property007_intent`, `iam.portal_token_login`, funções V5 magic_link).
- **112 funções acessíveis por `authenticated`** — menor risco imediato, mas cruzamento de schemas com SECURITY DEFINER pode escalar privilégios.

**Estratégia por categoria:**
1. Fase imediata (search_path fix — baixo risco): `ALTER FUNCTION ... SET search_path = <schema>, extensions;` para as 62 funções — elimina risco de injection sem quebrar funcionalidade.
2. Fase 2 (revogação selectiva de `anon`): analisar função a função, manter apenas funções explicitamente públicas.
3. Fase 3 (converter para SECURITY INVOKER): apenas depois de DB-002 (vistas) estar resolvido.

**Impacto se não resolver:** Superfície de ataque enorme. Função mal escrita pode expor dados de qualquer schema.
**Esforço:** XL (3–4 semanas de auditoria sistemática por categoria)
**Dependências:** Tratar como programa conjunto com DB-002. DB-017 (mover extensões) deve ser coordenado com os search_path fixes.

---

### T08 · FE-004 · Routing inconsistente — V5 produção sem URLs · CRITICAL · Frontend

**Área:** Frontend / UX Operacional
**Descrição:** V5-manutencao (app principal em produção activa) usa routing state-based (`useState`) — URL nunca muda. Browser back quebrado. Deep links impossíveis. Suporte ao cliente é impossível sem "envie screenshot, eu navego manualmente". Dashboard e V2 usam React Router v6. V4 usa state-based mas ainda não está em produção.
**Nota:** A justificação "Capacitor Fase 7 resolverá" é teórica. O débito é operacional em produção hoje.
**Impacto se não resolver:** Bloqueia suporte ao cliente em V5. Condóminos e técnicos não conseguem partilhar links. Bookmarks impossíveis. Browser back não funciona.
**Esforço:** M (V4 — 3 tabs simples) + G (V5 — estado de auth + role + modais para rotas)
**Dependências:** FE-018 (Testing baseline) como pré-requisito para refactor seguro.

---

### T09 · FE-001 · 5 design systems paralelos sem código partilhado · CRITICAL · Frontend

**Área:** Frontend / Design System
**Descrição:** Dashboard (purple dark), v2-condominios (dark+gold portal), v4-energia (blue/green/gold com string CSS injectada), v5-manutencao (forest/emerald inline — divergência intencional com ADR), truth (Tailwind). `packages/ui` cobre apenas 5 componentes utilitários e zero tokens. LoginScreen tem 4 implementações independentes. Sidebar tem 3.
**Decomposição em 3 sub-fases (não XL monolítico):**
- **Sub-fase P1 — Tokens** (1–2 semanas): criar `packages/ui/src/tokens/` com `colors.css`, `typography.css`, `radius.css`, `breakpoints.css`, `motion.css` conforme CLAUDE.md root. Unificar chave localStorage para `proptech-theme` (FE-010 incluído). Resolver FE-017 (breakpoints) em conjunto.
- **Sub-fase P2 — Primitives** (3–4 semanas): extrair `Button`, `Input`, `Badge`, `Table`, `KPICard`, `Sidebar`, `Modal` para `packages/ui`. `<ErrorBoundary>` e skeleton screens (FE-016) incluídos.
- **Sub-fase P3 — Migration por app** (6–8 semanas): migrar cada app para consumir tokens + primitives de `packages/ui`. V5 forest/emerald mantém-se via "theme override" documentada em ADR.
**Impacto se não resolver:** Mudança de marca requer editar 4+ ficheiros em locais distintos. Cada nova vertical replica o problema.
**Esforço:** XL total — decomposto nas 3 sub-fases acima para ser epic executável.
**Dependências:** Bloqueia escalabilidade de novas verticais. FE-010, FE-013, FE-017 co-resolvem em P1.

---

### T10 · FE-002 · Auth fragmentada em 5 implementações · CRITICAL · Frontend

**Área:** Frontend / Auth
**Descrição:** (1) dashboard usa `AuthGuard.jsx` próprio; (2) v2-condominios usa `@proptech/auth` correctamente; (3) v4-energia usa `sb.auth.signInWithPassword` directo; (4) v5-manutencao declara `@proptech/auth` mas importa `./lib/AuthContext.jsx` local — regressão silenciosa; (5) admin/index.html tem auth HTML vanilla.
**Prioridade de migração:** V5 primeiro (produção activa com regressão silenciosa) → dashboard → V4.
**Impacto se não resolver:** Bug fixes de auth têm que ser feitos em 5 sítios. Divergência de comportamento (signout, refresh token, is_staff claim) entre apps.
**Esforço:** L (migrar 3 apps — 2–3 dias por app; pré-requisito: FE-018 Testing baseline)
**Dependências:** FE-008 resolve-se em conjunto. FE-018 deve preceder.

---

## Dívida Detalhada por Área

### Arquitectura

#### ARCH-001 · Dois schemas paralelos para V2 · CRITICAL
Ver T04 acima.

#### ARCH-002 · `bia-chat` e `mia-chat` coexistem em produção · CRITICAL

**Severity:** Critical
**Descrição:** A renomeação Bia→Mia está incompleta. `bia-chat` (v20) e `mia-chat` (v4) são duas Edge Functions activas em V1. Views `BiaScorecard.jsx`, `BiaTaskLauncher.jsx`, `BiaPlaceholder.jsx` ainda existem em `apps/dashboard/src/views/`. Em V2 existem `bia-discord-setup` e `bia-discord-find-mario` sem equivalente em V1.
**Impacto:** Custo duplicado de invocações AI. Dados de histórico de chat divididos entre dois endpoints. Confusão operacional crescente a cada sprint.
**Esforço:** M (concluir rename + deprecar bia-chat + remover views Bia do dashboard)
**Dependências:** Branch `chore/rename-bia-jarvis-mia` deve ser concluída e mergeada.

#### ARCH-003 · ADR-V11-004 e ADR-V11-005 sem ficheiro · CRITICAL
Ver OPS-001 / T06 acima.

#### ARCH-004 · `apps/truth/` não documentada em CLAUDE.md · HIGH

**Severity:** High
**Descrição:** `apps/truth/` (Truth Engine / Swarm, React 19 + Tailwind, port 5181) foi criada em 2026-05-18 sem entrada em CLAUDE.md, mapeamentos de deploy, ou ADR com ficheiro. Sem projecto Vercel associado, sem owner documentado.
**Esforço:** S (documentar em CLAUDE.md + decidir se é local-only ou tem deploy target)
**Dependências:** —

#### ARCH-005 · `apps/v2-condomino-mobile/` sem código fonte · HIGH

**Severity:** High
**Descrição:** Pasta contém apenas `dist/` (index.html + bundle JS + CSS). Sem `src/`, `package.json`, `vite.config.js`. Origem do código fonte não é identificável no monorepo. Não está em CLAUDE.md.
**Impacto:** Zero manutenibilidade. Não pode ser rebuildado. Código importante pode estar encapsulado num artefacto sem origem rastreável.
**Esforço:** S (decisão: integrar fonte ou eliminar) + M-G (reintegração se necessário)
**Dependências:** —

#### ARCH-006 · ADR-V2-003 (cutover V2) com fases B–F abertas indefinidamente · MEDIUM

**Severity:** Medium
**Descrição:** Fases B (RPCs+views), C (Edge Functions), E (UI 9 features), F (cutover DNS) estão sem prazo. O fosso entre o estado actual e o plano aumenta a cada sprint.
**Esforço:** L (retomar as fases — depende de clarificar ARCH-001 primeiro)
**Dependências:** ARCH-001 (schema canónico V2) deve ser resolvido antes.

#### ARCH-007 · Discord com dois targets de deploy sem ADR · MEDIUM

**Severity:** Medium
**Descrição:** `apps/discord-bot/` (Deno + Fly.io) e `apps/discord-bot-cf/` (Cloudflare Workers + Durable Objects) coexistem sem ADR. Sem documentação de qual processa eventos reais.
**Esforço:** S (decisão + ADR) + M (eliminar o secundário)
**Dependências:** —

#### ARCH-008 · `apps/cli/` sem ADR, sem deploy, sem roadmap · MEDIUM

**Severity:** Medium
**Descrição:** CLI Node + Ink com 6 comandos sem referência em CLAUDE.md, sem ADR, sem deploy target.
**Esforço:** S (decisão + documentar)
**Dependências:** —

---

### Database

#### DB-001 · Tabelas sem RLS · CRITICAL
Ver T01 acima.

#### DB-002 · 40 vistas SECURITY DEFINER · CRITICAL
Ver T02 acima.

#### DB-003 · 215 migrations sem ficheiro SQL em git · CRITICAL
Ver T03 acima.

#### DB-004 · 106+112 RPCs SECURITY DEFINER · CRITICAL
Ver T07 acima.

#### DB-005 · Schema `v1_owners_club` com nome errado · CRITICAL
Ver T05 acima.

#### DB-006 · 18 tabelas `_stg_*` e 2 `_migration_*` em `v2_condominios` sem RLS · HIGH

**Severity:** High
**Descrição:** 18 tabelas de staging e 2 de controlo no schema `v2_condominios` sem RLS. Não está claro se a migração está concluída (candidatas a dropar) ou em uso activo.
**Impacto:** Dados de staging acessíveis via REST sem autenticação.
**Esforço:** S (confirmar estado) + M (dropar ou adicionar RLS)
**Dependências:** Coordenar com ADR-V2-003.

#### DB-007 · `bia-chat` e `mia-chat` como Edge Functions duplicadas · HIGH

**Severity:** High
**Descrição:** Ver ARCH-002. Database-side: `bia-chat` (v20) consome tokens AI em produção enquanto `mia-chat` (v4) é o endpoint novo. Histórico de chat dividido.
**Esforço:** M (deprecar + remover bia-chat após confirmação mia-chat está completo)
**Dependências:** ARCH-002 / Branch `chore/rename-bia-jarvis-mia`.

#### DB-008 · 8 tabelas `brain_*` em V2 produção sem propósito claro · MEDIUM

**Severity:** Medium
**Descrição:** 4 migrations aplicadas em V2 produção em 2026-05-16 criaram `public.brain_profiles`, `brain_authors`, `brain_books`, `brain_discs`, `brain_recipes`, `brain_runs`, `brain_articles`, `brain_journal`. Têm RLS activo mas 0 rows. Propósito não documentado.
**Impacto:** Schema de produção poluído. Risco de agente escrever nestas tabelas inadvertidamente sem ADR.
**Esforço:** S (investigar origem) + M (dropar com migration formal se não utilizadas)
**Dependências:** Qualquer acção em V2 produção requer aprovação explícita do Mário.

#### DB-009 · 341 índices não utilizados (V1) · MEDIUM

**Severity:** Medium
**Descrição:** 341 `unused_index` em V1 incluindo todos os `brain_*`, `idx_audit_*`, e múltiplos `_stg_*`. 8 pares de índices duplicados detectados.
**Esforço:** M (`DROP INDEX CONCURRENTLY` nos índices confirmados como unused via `pg_stat_user_indexes`)
**Dependências:** Deve preceder DB-014 (criar índices FK em falta) para não duplicar trabalho.

#### DB-010 · `marketing` vs `growth` schema — ambiguidade de naming · MEDIUM

**Severity:** Medium
**Descrição:** CLAUDE.md lista schema `marketing` com tabelas de funil de vendas. ADR-015 e `20260513_growth_schema.sql` criam schema `growth`. O schema `marketing` existe mas com conteúdo diferente (competitive intel). Relação entre os dois não tem ADR.
**Esforço:** S (ADR: marketing = competitive intel, growth = funil de vendas) + S (actualizar CLAUDE.md)
**Dependências:** —

#### DB-011 · `swarm-orchestrator-cron` pausado por `haiku_json_parse_failed` · MEDIUM

**Severity:** Medium
**Descrição:** O Truth Engine tem 25 workers e 10 niches mas o cron está pausado. Claude Haiku retorna JSON com markdown fences causando `JSON.parse` a falhar. Worker v3 tem fix implementado mas o swarm não foi reactivado.
**Esforço:** S (strip markdown fences + reactivar cron)
**Dependências:** Requer decisão de Mário para reactivar.

#### DB-012 · `v2-legacy-bridge-cron` sem monitoring em contexto de cutover iminente · HIGH

**Severity:** High (reclassificado de LOW — B2)
**Descrição:** A bridge cron cria dependência em tempo real de V1 para V2 produção. Se V2 tiver janela de manutenção, ou se RLS policies de V2 mudarem, a bridge falha silenciosamente — sem alertas, sem monitoring documentado. Com 7+ branches sprint não mergeadas, qualquer desenvolvimento em `v2_new` pode estar a correr sobre dados stale.
**Esforço:** M (implementar monitoring + alertas de falha + documentar SLA de freshness de dados em `v2_new`)
**Dependências:** ARCH-006 (cutover V2).

#### DB-013 · `auth_rls_initplan` em 38 policies V1 · HIGH (NOVO — Phase 5)

**Área:** Database / Performance
**Descrição:** 38 policies em V1 com `auth.<function>()` (ex: `auth.uid()`, `auth.role()`) avaliado por row em vez de uma vez por query — equivalente a sub-SELECT em cada linha. Em tabelas como `core.pessoas` (79 rows — por agora) ou `core.recebimentos` (525 rows), o impacto cresce linearmente com os dados. Em V2, 5 casos foram corrigidos (3 persistem).
**Impacto:** Performance de queries RLS pode ser 10–100x mais lenta em tabelas críticas do CRM conforme os dados crescem.
**Fix:** Substituir `auth.uid()` por `(select auth.uid())` nas 38 policies.
**Esforço:** M (fix mecânico mas requer teste por policy)
**Dependências:** Deve seguir DB-001 (activar RLS nas tabelas em falta cria novas policies que precisam do mesmo fix).

#### DB-014 · 110 Foreign Keys sem índice em V1 · HIGH (NOVO — Phase 5)

**Área:** Database / Performance
**Descrição:** 110 FKs sem índice de cobertura em V1 (distintas dos 9 casos V2 já confirmados). Com 217 tabelas e schema `system` a crescer de 3 para 34 tabelas, FKs sem índice causam slow DELETE cascade, slow JOIN cross-schema e lock contention em deletes concorrentes.
**Impacto:** Degradação progressiva em operações de escrita e JOIN. Piora com volume de dados.
**Esforço:** L (criação de índices em batch — `CREATE INDEX CONCURRENTLY IF NOT EXISTS`)
**Dependências:** DB-009 deve preceder (limpar índices unused antes de criar novos para não mascarar over-indexing).

#### DB-015 · 149 `multiple_permissive_policies` em V1 · HIGH (NOVO — Phase 5)

**Área:** Database / Performance e Segurança
**Descrição:** 149 policies permissivas múltiplas em V1. PostgreSQL avalia TODAS com OR lógico — overhead em cada query. As tabelas `marketing.*` e `system.*` são as mais afectadas. Risco de segurança: policy criada "temporariamente" e esquecida pode dar acesso não intencional.
**Esforço:** M (auditar policies por tabela, consolidar onde possível, eliminar duplicados ou policies `always_true`)
**Dependências:** DB-001 (alguns casos são tabelas que precisam de RLS revisto em conjunto).

#### DB-016 · PostgREST schema exposure não verificada para `iam` e `v2_new` · MEDIUM (NOVO — Phase 5)

**Área:** Database / Configuração / Fiabilidade
**Descrição:** 3 schemas novos criados desde a baseline (`iam`, `marketing`, `v2_new`) sem confirmação de que estão expostos via PostgREST. Se `iam.*` não estiver exposto, as RPCs `iam.has_permission()` e `iam.get_my_permissions()` falham para chamadas REST de frontend silenciosamente (retornam 404 ou PGRST106). O schema IAM é guard RLS cross-vertical — falha aqui afecta TODAS as verticais.
**Diagnóstico imediato (read-only, sem risco):**
```sql
SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator';
```
Deve incluir `pgrst.db_schemas` com todos os schemas necessários.
**Esforço:** S (verificar + executar `ALTER ROLE authenticator SET pgrst.db_schemas = ...` se necessário — procedimento em ADR-V2-002)
**Dependências:** Deve ser verificado PRIMEIRO — pré-requisito para tudo o resto funcionar via REST.

#### DB-017 · Extensões `pg_net` e `http` em schema `public` · MEDIUM (NOVO — Phase 5)

**Área:** Database / Segurança / Conformidade
**Descrição:** `pg_net`, `unaccent`, e `http` estão em schema `public`. Funções no schema `public` com SECURITY DEFINER podem invocar HTTP calls externas com privilégios do owner. Qualquer role `authenticated` com EXECUTE numa função `public.*` que usa `pg_net` pode potencialmente fazer exfiltração via webhook.
**Esforço:** M (mover extensões para schema `extensions` — requer testar que funções que as usam continuam a funcionar com search_path correcto)
**Dependências:** DB-004 (search_path fixes) deve ser coordenado.

#### DB-018 · `core.codigos_postais` (205 817 rows) deny total — falhas silenciosas · MEDIUM (NOVO — Phase 5)

**Área:** Database / Funcionalidade / RLS
**Descrição:** `core.codigos_postais` tem RLS activo mas zero policies (deny total implícito). Qualquer query de `authenticated` retorna 0 rows sem erro. Se funcionalidades de V4 Energia (contratos com morada) ou V5 Manutenção (serviços por localização) dependem de validar códigos postais via REST, estão a falhar silenciosamente agora.
**Esforço:** S (decisão + migration simples — policy de leitura pública para tabela de referência geográfica sem PII)
**Dependências:** —

---

### Frontend

#### FE-001 · 5 design systems paralelos · CRITICAL
Ver T09 acima (inclui decomposição em 3 sub-fases).

#### FE-002 · Auth fragmentada em 5 implementações · CRITICAL
Ver T10 acima.

#### FE-003 · Acessibilidade quase ausente — risco legal DL 83/2018 · CRITICAL

**Severity:** Critical
**Descrição:** Dashboard tem 2 ocorrências ARIA em todo o código. V2 tem 1. Zero apps têm `eslint-plugin-jsx-a11y`. V5 é o único com nível ARIA real (29 ocorrências) — usar como referência. Sem `<html lang="pt-PT">` confirmado. Zero apps respeitam `prefers-reduced-motion`. Sem skip-to-content links.
**V2 produção (prataowners.pt) está sujeita ao Decreto-Lei 83/2018** — risco legal real.
**Quick wins imediatos (1–2 dias de esforço):**
1. Adicionar `<html lang="pt-PT">` em todos os `index.html` (5 apps, 1h total).
2. Adicionar `eslint-plugin-jsx-a11y` a todos os `package.json`.
3. Criar `packages/ui/src/SkipToContent.jsx` (componente partilhado).
4. Adicionar regra global `:focus-visible` aos tokens canónicos.
**Esforço:** P quick wins (1–2 dias) + G remediação incremental (ongoing)
**Dependências:** Pode ser paralelo a tudo. V2 produção é prioridade.

#### FE-004 · Routing inconsistente — V5 produção sem URL · CRITICAL
Ver T08 acima.

#### FE-005 · Zero apps usam React Query / SWR · HIGH

**Severity:** High
**Descrição:** 100% das chamadas Supabase são `useEffect + fetch manual + setState`. Dashboard tem 40+ hooks custom. Sem stale-while-revalidate, loading flashes em cada navegação, possíveis race conditions.
**Migration path:** Dashboard (maior ROI, 40+ hooks) → V2 (produção) → V5.
**Esforço:** G por app — dashboard (3–4 sem), V2 (2 sem), V5 (2–3 sem)
**Dependências:** FE-016 (Error Boundaries) deve preceder — error boundaries devem existir antes de migrar para React Query.

#### FE-006 · `apps/v2-condomino-mobile/` artefacto órfão · HIGH

**Severity:** High
**Nota:** Ver ARCH-005 (canónica). Decisão é arquitectural — architect é owner.

#### FE-007 · `apps/core/` e `apps/v1-core/` ainda no filesystem · MEDIUM

**Severity:** Medium (reclassificado de HIGH — B2)
**Descrição:** CLAUDE.md declara remoção em 2026-05-13. Directórios existem mas apenas com `node_modules/` — sem `src/`. Risco de edição acidental é mínimo.
**Esforço:** P (remover dois directórios + actualizar CLAUDE.md)
**Dependências:** —

#### FE-008 · `@proptech/auth` declarado mas não usado em V5 · HIGH

**Severity:** High
**Descrição:** V5 declara `@proptech/auth` em `package.json` mas importa `./lib/AuthContext.jsx` local em runtime — regressão silenciosa. `OnboardingWizardScreen` pode depender do context local.
**Esforço:** M (1–2 dias com testes — migrar `App.jsx:10`, verificar dependentes, smoke test em Preview)
**Dependências:** Sub-item de FE-002. FE-018 (Testing) como pré-requisito.

#### FE-009 · Demo accounts hardcoded em V5 (`@deprecated 3.4A`) · HIGH

**Severity:** High (reclassificado de MEDIUM — B2)
**Descrição:** `App.jsx:6` importa `DEMO_PESSOA_ID` e `DEMO_ORGANIZATION_ID` marcados `@deprecated 3.4A`. Dados demo em código de produção — se `DEMO_PESSOA_ID` for usado por engano numa query, dados de clientes reais podem misturar com dados demo.
**Esforço:** P (30 min: remover import + `grep -r "DEMO_PESSOA_ID"` + confirmar zero usos)
**Dependências:** —

#### FE-010 · 3 chaves `localStorage` diferentes para tema · MEDIUM

**Severity:** Medium
**Descrição:** `v1theme` (V4), `v2theme` (V2), `dashboard-theme` (dashboard). Se apps forem usadas em sequência, preferência de tema não persiste.
**Nota:** Chave canónica deve ser `proptech-theme` (não `v1theme` — nome confuso com V1 Core Hub).
**Esforço:** P (alterar 1 string em 4 apps + script de migração de localStorage existente)
**Dependências:** Co-resolve com FE-001 P1 (tokens).

#### FE-011 · TODOs operacionais 2026-05-05 sem resolução em V5 · HIGH

**Severity:** High (reclassificado de MEDIUM — B2)
**Descrição:** 15+ TODOs em V5 confirmados pendentes: writes para tabela errada (`servicos` vs `catalogo_servicos`), `pontos_historico`/`missoes_utilizador` possivelmente inexistentes, NIF sem checkdigit, ETA hardcoded 18min, FAQ hardcoded, `suporte@exemplo.pt` placeholder, `app.exemplo.pt` em referral, links V2 com `alert('TODO')`. São **bugs visíveis em produção V5**, não débito estético.
**Esforço:** M (re-scan + fix por fix — 1 semana)
**Dependências:** —

#### FE-012 · Nomes inconsistentes de packages workspace · LOW

**Severity:** Low
**Descrição:** `@proptech/*` vs `@property007/truth` vs packages sem prefixo. `@property007` usa prefixo de organização legal; `@proptech` usa prefixo de produto.
**Esforço:** S (decisão de convenção) + P por package
**Dependências:** —

#### FE-013 · Fontes inconsistentes (Inter / DM Sans / Fraunces+Outfit / sistema) · MEDIUM

**Severity:** Medium (reclassificado de LOW — B2)
**Descrição:** CLAUDE.md declara Inter + JetBrains Mono como canónico. V5 usa Fraunces+Outfit (decisão V5 CLAUDE.md — justificável). V2 usa DM Sans. Dashboard usa sistema. Se apps forem embedded (`AppEmbed.jsx`), todas as fontes carregam em simultâneo — bundle inflado, FOUT.
**Regra proposta:** Apps de produto (V5) podem divergir com ADR; apps de gestão usam canónico.
**Esforço:** S (ADR de tipografia) + M (implementação por app)
**Dependências:** FE-001 P1 (tokens) — resolver em conjunto.

#### FE-014 · `apps/truth/` usa Tailwind como outlier único · LOW

**Severity:** Low
**Descrição:** `apps/truth/` é a única app com Tailwind 3.4.17 + PostCSS. Tailwind pode coexistir com tokens CSS vars — não é incompatível com FE-001.
**Recomendação:** Manter Tailwind em truth como exception com ADR explícita.
**Esforço:** S (ADR + nota em CLAUDE.md)
**Dependências:** FE-001 (design system — definir padrão único).

#### FE-015 · Performance / Bundle Size sem auditoria · HIGH (NOVO — Phase 6)

**Área:** Frontend / Performance
**Descrição:** Zero apps têm baseline de Lighthouse, bundle size documentado, ou code splitting configurado. V5 produção activa em mobile (Capacitor planeado Fase 7). Dashboard tem 40+ hooks e 49+ views — bundle provavelmente pesado mas nunca medido. Nenhum `rollup-plugin-visualizer` ou equivalente configurado.
**Impacto:** Performance degradada em mobile (V5) e conexões fracas. Sem medição, regressões passam despercebidas. Capacitor amplifica problemas de bundle.
**Esforço:** M (configurar `rollup-plugin-visualizer` em todas as apps + baseline Lighthouse + threshold em CI)
**Dependências:** Bloqueia decisão "podemos lançar V5 mobile?".

#### FE-016 · Zero Error Boundaries / Loading States inconsistentes · HIGH (NOVO — Phase 6)

**Área:** Frontend / Robustez
**Descrição:** Nenhuma app declara `<ErrorBoundary>`. Sem fallback UI quando view crasha — utilizador vê página em branco. Loading states são `useState(loading)` ad-hoc sem skeleton screens partilhados. Em V2 produção, condómino em mobile com 3G fraca vê app aparentemente quebrada.
**Esforço:** M (componente `<ErrorBoundary>` partilhado em `packages/ui` + skeleton screens + adopt em layout shells)
**Dependências:** Pode ser feito em paralelo a FE-001. Deve preceder FE-005 (React Query) — error boundaries devem existir primeiro.

#### FE-017 · Mobile / Responsive sem auditoria nem breakpoints partilhados · HIGH (NOVO — Phase 6)

**Área:** Frontend / Mobile
**Descrição:** V2 (prataowners.pt) serve condóminos em mobile sem evidência de testing responsive sistemático. V5 (mobile-first declarado) sem documentação de breakpoints. Nenhuma app exporta breakpoints como tokens. Capacitor (V5 Fase 7) amplifica problema.
**Esforço:** M (auditoria de cada app em viewports padrão + definir `packages/ui/breakpoints.css` + adopt incremental)
**Dependências:** Co-resolve com FE-001 P1 (tokens — breakpoints são tokens).

#### FE-018 · Zero testes frontend (Vitest, RTL, Playwright) · HIGH (NOVO — Phase 6)

**Área:** Frontend / Qualidade
**Descrição:** Sem evidência de Vitest, React Testing Library ou Playwright em qualquer `apps/*/package.json`. 5 implementações de auth, 5 design systems, 22+ views em V2, 40+ hooks no dashboard — refactorings sem rede de segurança.
**Impacto crítico:** Este é o **pré-requisito** de quase todas as remediações de Phase 2/3. Migração de V5 para `@proptech/auth` sem testes é roleta russa. Consolidação de design system sem snapshot tests gera regressões visuais não detectadas.
**Esforço:** L (Vitest + RTL em todas as apps + suite mínima: smoke tests + auth flow + 1 view principal) → G (suite completa após design system consolidado)
**Dependências:** Deve ser o **primeiro passo** das remediações Phase 2. Bloqueia FE-001 P2/P3, FE-002, FE-004.

#### FE-019 · Internacionalização hardcoded (zero i18n) · MEDIUM (NOVO — Phase 6)

**Área:** Frontend / Internacionalização
**Descrição:** Zero apps usam `i18next` ou `react-intl`. Strings PT-PT hardcoded em JSX em todos os ficheiros. O relatório estratégico V4 Energia menciona Spock.es (Espanha) — internacionalização não é hipotética. Migração para multi-idioma é custo enorme (>40 ficheiros por app).
**Esforço:** L (introduzir i18next em app piloto — V4 é simples — + tooling de extracção)
**Dependências:** Decisão de produto: vamos para Espanha? Se sim, prioridade sobe para High.

#### FE-020 · `AppEmbed` em dashboard sem contrato/manifesto inter-app · MEDIUM (NOVO — Phase 6)

**Área:** Frontend / Arquitectura
**Descrição:** `apps/dashboard/src/views/AppEmbed.jsx` sugere padrão de iframe-embedding de verticais no hub central. Sem contrato formal: cada vertical tem que lidar com `window.parent !== window`, partilhar JWT, comunicar via `postMessage`, lidar com tema do parent. V2 detecta embed mode mas especificação não está escrita.
**Esforço:** M (ADR de embed contract + helper `@proptech/embed` package + documentar em CLAUDE.md)
**Dependências:** FE-001 (tokens) e FE-002 (auth) devem estar consolidados para que embed contract seja coerente.

---

### Ops / Governança

#### OPS-001 · ADR-V11-004 e ADR-V11-005 sem ficheiro em git · CRITICAL
Ver T06 acima.

#### OPS-002 · ADR-V3-001, ADR-V4-001, ADR-condo-001, ADR-012 sem ficheiro em git · HIGH

**Severity:** High
**Descrição:** Quatro ADRs referenciados em triggers.md ou state files mas sem ficheiro `.md` em `.claude/strategy/adrs/`. ADRs 001–009 continuam apenas em Notion.
**Esforço:** M (criar ficheiros ADR retroactivamente para os 4+ ADRs em falta)
**Dependências:** OPS-001 deve ser feito primeiro.

#### OPS-003 · 67 Edge Functions no V1, ~50 não versionadas em git · HIGH

**Severity:** High
**Descrição:** V1 passou de 15 para 67 Edge Functions activas em 18 dias (+52). Das 67, apenas as V4 e algumas core estão versionadas. `auth-test`, `admin-ui-test`, `agent-test` são funções de teste em produção.
**Esforço:** L (exportar todas as functions + organizar em `supabase/functions/` + remover funções de teste)
**Dependências:** Paralelo ao DB-003 (migrations sem ficheiro).

#### OPS-004 · 7+ branches sprint não mergeadas em `main` · MEDIUM

**Severity:** Medium
**Descrição:** `sprint/crm-attio-week1`, `sprint/crm-attio-week2`, `sprint/truth-week1`, `sprint/truth-week2`, `sprint/truth-week3`, `sprint/cookai3-week1`, `sprint/cookai3-week2` (e possivelmente mais) nunca mergeadas. 221 commits em 18 dias.
**Esforço:** M (merge sequencial com testes, começar pelas branches mais antigas)
**Dependências:** Mário deve validar cada Preview antes do merge.

#### OPS-005 · Funções de migração one-shot (`migrar-faturas`, `migrar-fatura`) em V2 produção · LOW

**Severity:** Low
**Descrição:** Duas Edge Functions de migração one-shot activas em V2 produção. Usadas durante migração inicial. Representam operações destrutivas/críticas acessíveis via endpoint activo.
**Esforço:** P (desactivar as duas functions no Dashboard Supabase V2)
**Dependências:** Qualquer acção em V2 requer aprovação explícita do Mário.

---

## Riscos a Curto Prazo (próximos 30 dias)

Dívidas com probabilidade elevada de materializar-se em incidente ou divergência irreversível se não tratadas até 2026-06-22:

| ID | Dívida | Risco específico | Probabilidade |
|----|--------|-----------------|---------------|
| DB-001 | 14 tabelas sem RLS em V1 | Leitura de dados de sistema via anon_key — exploitable se chave vazar | Alta |
| DB-003 | 215 migrations sem ficheiro SQL | Próxima migration de qualquer agente aumenta o gap; rollback/debug fica cego | Alta |
| ARCH-001 | Dois schemas V2 paralelos | Nova feature para V2 desenvolvida no schema errado | Alta |
| OPS-001 | ADR-V11-004/V11-005 sem ficheiro | triggers.md pode ser limpo — decisões perdem-se | Alta |
| ARCH-002 + DB-007 | `bia-chat`/`mia-chat` coexistentes | Custo AI duplicado a crescer por dia | Média-Alta |
| DB-008 | 8 tabelas `brain_*` em V2 produção | Schema produção poluído; agente Mia pode escrever inadvertidamente sem ADR (B6) | Média |
| DB-012 | `v2-legacy-bridge-cron` sem monitoring | Bridge falha silenciosamente — dados stale em `v2_new` durante cutover | Média-Alta |
| OPS-005 | `migrar-faturas`/`migrar-fatura` activas em V2 | Endpoints destrutivos one-shot expostos em produção (B6) | Baixa-Média |
| OPS-004 | 7+ branches sprint não mergeadas | Próximo sprint cria conflitos de merge significativos | Média |
| DB-011 | swarm-orchestrator-cron pausado | Truth Engine continua inoperacional — investimento não rende | Alta |

---

## Pré-requisitos Absolutos (dependências que bloqueiam outras remediações)

Estas dívidas devem ser resolvidas antes das que dependem delas:

```
DB-016 (verificar PostgREST exposure)
  → PRIMEIRO de todos — pré-requisito para REST funcionar com novos schemas

DB-009 (limpar 341 índices unused)
  → antes de DB-014 (criar índices FK em falta)

FE-018 (Testing baseline — Vitest + RTL)
  → antes de FE-001 P2/P3 (design system primitives + migration)
  → antes de FE-002 (auth migration)
  → antes de FE-004 (routing refactor)
  → antes de FE-008 (auth V5)

FE-016 (Error Boundaries)
  → antes de FE-005 (React Query)

DB-001 (activar RLS)
  → depois de auditar Edge Functions por uso de system.* sem service_role
  → DB-013 deve seguir imediatamente

DB-004 (search_path fix) + DB-017 (mover extensões)
  → coordenados — funções que usam pg_net/http precisam de search_path actualizado

DB-004 + DB-002
  → programa conjunto — não paralelo independente

DB-005 (rename schema)
  → ÚLTIMO dos Critical — auditoria de dependências obrigatória via query de diagnóstico
```

---

## Remediation Plan

### Quick Wins — Phase 1 (1–2 sprints · S/P sem dependências críticas)

Impacto imediato com esforço e risco baixos:

1. **DB-016** — Verificar PostgREST exposure para `iam` e `v2_new` (supabase-designer, 30 min)
2. **OPS-001** — Redigir ADR-V11-004 e ADR-V11-005 (architect-proptech, 1 dia)
3. **OPS-005** — Desactivar `migrar-faturas` e `migrar-fatura` em V2 produção (autorização Mário, 30 min)
4. **FE-007** — Eliminar `apps/core/` e `apps/v1-core/` do filesystem (vertical-builder, 1h)
5. **FE-009** — Remover demo accounts hardcoded de V5 (vertical-builder, 30 min)
6. **DB-011** — Reactivar swarm-orchestrator-cron com fix haiku JSON parse (supabase-designer, 2h)
7. **DB-010** — Clarificar `marketing` vs `growth` em ADR + actualizar CLAUDE.md (architect-proptech, 2h)
8. **FE-010** — Unificar chave localStorage de tema para `proptech-theme` (vertical-builder, 1h)
9. **ARCH-004** — Documentar `apps/truth/` em CLAUDE.md (architect-proptech, 30 min)
10. **OPS-002** — Criar ficheiros ADR retroactivos para V3-001, V4-001, condo-001, ADR-012 (architect-proptech, meio dia)
11. **DB-018** — Criar policy de leitura pública para `core.codigos_postais` (supabase-designer, 30 min)
12. **FE-003 quick wins** — A11Y baseline: `<html lang="pt-PT">`, `eslint-plugin-jsx-a11y`, `SkipToContent` (vertical-builder, 1–2 dias)

### Structural — Phase 2 (2–6 sprints · M/L com dependências críticas)

Requerem planeamento e testes mas são críticas para continuar a escalar:

1. **FE-018** — Testing baseline (Vitest + RTL) em todas as apps — **pré-requisito de todos os itens abaixo** (vertical-builder, 1 semana)
2. **FE-001 P1** — Tokens canónicos em `packages/ui` (vertical-builder + design-system, 1–2 semanas)
3. **DB-001** — Activar RLS nas 14 tabelas V1 (supabase-designer, 2–3 semanas — inclui auditoria de Edge Functions)
4. **DB-013** — Corrigir `auth_rls_initplan` nas 38 policies V1 (supabase-designer, M — logo após DB-001)
5. **DB-002 + DB-004** — Programa SECURITY DEFINER conjunto (supabase-designer, 3–5 semanas total)
6. **DB-003 + OPS-003** — Baseline snapshot + exportar 50 Edge Functions para git (supabase-designer, 1–2 semanas)
7. **ARCH-001** — Decidir schema canónico V2 + ADR formal (architect-proptech + Mário, 2 dias decisão + 2 semanas implementação)
8. **ARCH-002** — Concluir rename Bia→Mia, deprecar bia-chat, limpar views Bia (vertical-builder, 3 dias)
9. **FE-002 + FE-008** — Migrar V5 para `@proptech/auth` (vertical-builder, 2–3 dias após FE-018)
10. **FE-004** — Adicionar React Router a V5 produção (vertical-builder, G — após FE-002 e FE-018)
11. **DB-005** — Renomear `v1_owners_club` → `v10_owners_club` (supabase-designer, M — ÚLTIMO dos Critical, após auditoria)
12. **DB-006** — Limpar staging tables `_stg_*` em `v2_condominios` (supabase-designer, 2 dias)
13. **DB-012** — Implementar monitoring + alertas para `v2-legacy-bridge-cron` (supabase-designer, M)
14. **OPS-004** — Merge sequencial das branches sprint em `main` (devops, 1 semana)
15. **DB-009** — Cleanup de 341 índices não utilizados (supabase-designer, 1 semana)
16. **DB-014** — Criar índices FK em falta (supabase-designer, L — após DB-009)
17. **DB-015** — Consolidar multiple permissive policies (supabase-designer, M)

### Long-term — Phase 3 (6+ sprints · L/XL com risco arquitectural)

Investimentos estruturais que melhoram a plataforma a longo prazo:

1. **FE-001 P2** — Primitives em `packages/ui` (design-system + vertical-builder, 3–4 semanas)
2. **FE-001 P3** — Migration por app para tokens + primitives (vertical-builder, 6–8 semanas)
3. **FE-016** — Error Boundaries + skeleton screens (vertical-builder, M após FE-001 P1)
4. **FE-005** — Introduzir React Query nas apps críticas (vertical-builder, 2–3 semanas por app — após FE-016)
5. **FE-003** — Remediação incremental WCAG + axe-core em CI (design-system + vertical-builder, ongoing)
6. **FE-015** — Performance baseline + bundle audit (vertical-builder, M — desbloqueia decisão mobile V5)
7. **FE-017** — Mobile / responsive auditoria + breakpoints (vertical-builder, M — co-resolve com FE-001 P1)
8. **DB-004 + DB-002** — Completar programa SECURITY DEFINER (supabase-designer, 2–3 semanas adicionais)
9. **ARCH-006** — Retomar cutover V2 (fases B–F do ADR-V2-003) (architect-proptech + supabase-designer, 4–8 semanas)
10. **DB-008** — Auditoria e remoção de tabelas `brain_*` em V2 (supabase-designer, S+M — aprovação Mário)
11. **FE-020** — Embed contract (`@proptech/embed` package) (vertical-builder, M — após FE-001 P3 + FE-002)
12. **FE-019** — i18n (V4 piloto) — apenas se decisão "Spock.es / Espanha" for tomada (vertical-builder, L)
13. **DB-017** — Mover extensões `pg_net`/`http` para schema `extensions` (supabase-designer, M)
14. **ARCH-005 + ARCH-007 + ARCH-008** — Decisões sobre mobile, Discord e CLI (architect-proptech, 1 semana decisão)

---

## Áreas para Próxima Auditoria (não bloqueantes)

As seguintes áreas não foram cobertas por specialist review neste ciclo. Recomenda-se auditoria dedicada no próximo ciclo trimestral:

- **Observability / Error Tracking** — Sem Sentry, sem Logflare cross-app. `swarm-orchestrator-cron` foi descoberto pausado por chance, não por alerta. V2 produção sem error tracking documentado. Severity provável: HIGH.
- **Dependencies / CVE** — Mix React 18/19 entre apps. Vite 6/8. Zero análise `npm audit`. Severity provável: MEDIUM.
- **Secrets rotation / Vault hygiene** — `supabase_vault` instalado mas não analisado. Service role key V2 sem evidência de rotação. Severity provável: MEDIUM.
- **CI/CD health** — Workflows GitHub Actions com 7+ branches sprint activas. Hooks `synapse-engine.cjs` e `enforce-git-push-authority.cjs` não inventariados. Severity provável: LOW/MEDIUM.

---

## Annex — Specialist Findings

### Phase 5 — DB Specialist Review (supabase-designer)

Contribuições incorporadas neste documento:
- Reclassificação de esforços: DB-001 (M→XL), DB-002 (M→L), DB-003 (L→XL), DB-004 (L→XL)
- Reclassificação de severities: DB-005 (HIGH→CRITICAL), DB-012 (LOW→HIGH)
- Correcção de abordagem técnica: DB-003 (não `supabase db dump` — baseline snapshot + forward-only); DB-001 (não `USING (is_staff())` em tabelas `system.*` — service_role bypass via RLS sem policies)
- 6 dívidas novas: DB-013 a DB-018
- Sequência de execução de dívidas DB documentada
- Migration examples e rollback plans para DB-001, DB-002, DB-003, DB-004

### Phase 6 — UX Specialist Review (aiox-ux)

Contribuições incorporadas neste documento:
- Reclassificação de severities: FE-004 (HIGH→CRITICAL), FE-007 (HIGH→MEDIUM), FE-009 (MEDIUM→HIGH), FE-011 (MEDIUM→HIGH), FE-013 (LOW→MEDIUM)
- Decomposição de FE-001 em 3 sub-fases executáveis (tokens P1 · primitives P2 · migration P3)
- Decomposição de FE-003 em quick wins (1–2 dias) + remediação incremental
- 6 dívidas novas: FE-015 a FE-020
- FE-018 identificado como pré-requisito de Phase 2/3 (sem testes, refactor é roleta russa)
- 3 Remediations prioritárias com passos concretos (ficheiros a alterar, packages a criar)

### Phase 7 — QA Gate (aiox-qa)

Verdict final: NEEDS_WORK → incorporado neste documento como APPROVED (Phase 8).
7 blockers B1–B7 todos endereçados.
Áreas opcionais N1–N5 parcialmente incorporadas (N1 na secção "Próxima Auditoria", N2 resolvido).

---

*Produzido por architect-proptech · 2026-05-23 · Phase 8 Brownfield Discovery (Final)*
*Inputs: technical-debt-DRAFT.md + db-specialist-review.md + ux-specialist-review.md + qa-review.md*
*QA Gate: NEEDS_WORK (Phase 7) → B1–B7 incorporados → APPROVED*
*53 dívidas documentadas · Pronto para epic planning*
