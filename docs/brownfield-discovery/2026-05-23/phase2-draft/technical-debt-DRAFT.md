# Technical Debt Draft — PropTech Platform · 2026-05-23

> **Workflow:** Brownfield Discovery — Phase 4 (Architect Draft)
> **Produzido por:** architect-proptech
> **Inputs:** system-architecture.md · SCHEMA.md · DB-AUDIT.md · frontend-spec.md (Phase 1)
> **Estado:** DRAFT — aguarda revisão Phase 5 (DB Specialist) e Phase 6 (UX Specialist)

---

## Resumo Executivo

A plataforma está em **risco médio-alto** e requer atenção estrutural antes de crescimento adicional. Em 18 dias (2026-05-05 → 2026-05-23) foram aplicadas 169 novas migrations, criadas 52 Edge Functions e adicionadas 97 tabelas — crescimento acelerado sem reforço proporcional de governança. As dívidas mais urgentes são de segurança (14 tabelas sem RLS no V1, 106+ RPCs acessíveis por `anon`), de rastreabilidade (215 migrations em produção sem ficheiro SQL em git) e de coerência de schema (dois schemas paralelos para V2 sem ADR que defina o canónico). O frontend tem 5 design systems paralelos e auth fragmentada em 5 implementações. Sem remediação das dívidas Critical e High prioritárias, o próximo lançamento de vertical (V3/V4) vai amplificar cada um destes problemas.

---

## Sumário Quantitativo

| Severity | Count | Áreas Afectadas |
|----------|-------|-----------------|
| **Critical** | 8 | DB (3), Arch (2), Frontend (2), Ops (1) |
| **High** | 16 | DB (4), Arch (4), Frontend (6), Ops (2) |
| **Medium** | 12 | DB (5), Arch (3), Frontend (3), Ops (1) |
| **Low** | 5 | Frontend (4), Ops (1) |
| **Total** | **41** | |

---

## Top 10 Dívidas Críticas (ordem de prioridade)

### T01 · DB-001 · Tabelas sem RLS em produção (V1 + V2) · CRITICAL · DB

**Área:** Database / Segurança
**Descrição:** 14 tabelas no V1 sem RLS (`public.file_deploy`, `public.*_backup_*`, `system.task_comments`, `system.swarm_workers`, `system.niche_icp_cards`, `system.schedules`, etc.) e 8 tabelas no V2 (`envios_log`, `configuracoes`, `codigos_postais_pt`, etc.). Qualquer cliente com a `anon_key` pode fazer SELECT/INSERT sem restrição. O advisor reporta isto como ERROR.
**Impacto se não resolver:** Exposição de dados operacionais e de configuração via API REST pública. Em V2 (produção real com 5 000 linhas), leitura não autorizada de `configuracoes` e `envios_log` é risco RGPD imediato.
**Esforço:** M (ativar RLS + policy mínima em 22 tabelas — maioria pode ser `USING (false)` ou `USING (is_staff())`)
**Dependências:** — (acção independente)

---

### T02 · DB-002 · 40 vistas SECURITY DEFINER (bypass RLS total) · CRITICAL · DB

**Área:** Database / Segurança
**Descrição:** 40 vistas no V1 têm `SECURITY DEFINER`, o que significa que qualquer role que as consulte executa com os privilégios do criador da vista, ignorando completamente as RLS policies das tabelas subjacentes. Cresceu com as vistas do CRM Attio e do Swarm Truth Engine.
**Impacto se não resolver:** Um utilizador `authenticated` pode extrair dados de qualquer tabela que tenha uma vista SECURITY DEFINER apontada para ela, independentemente das políticas RLS. Superfície de ataque real se a `anon_key` ou qualquer JWT vazar.
**Esforço:** M (converter vistas para `SECURITY INVOKER` ou adicionar filtros de segurança explícitos — requer teste de regressão por view)
**Dependências:** Coordenar com todas as apps que consumam estas vistas via REST.

---

### T03 · DB-003 · 215 migrations remotas sem ficheiro SQL em git · CRITICAL · DB

**Área:** Database / Rastreabilidade
**Descrição:** O Supabase V1 tem 262 migrations aplicadas. O repositório git tem 47 ficheiros SQL locais. Gap de 215 migrations aplicadas via MCP (`apply_migration()`) sem criação do ficheiro `.sql` correspondente. É impossível reproduzir o estado actual da base de dados a partir do repositório. As migrations das fases Sprint C1, C2, B1, B2, B3 (as mais recentes e complexas) não existem em git.
**Impacto se não resolver:** Qualquer `supabase db reset` ou novo ambiente produz um schema diferente do real. Debugging de problemas de schema é cego. Onboarding de colaborador é impossível. Risco de perda total em caso de acidente no projecto Supabase.
**Esforço:** L (exportar as 215 migrations via `supabase db dump` + organizar em ficheiros com naming canónico — trabalho de supabase-designer)
**Dependências:** Requer acesso de leitura ao projecto hkmvszkpxjbxmnixzqbl; não bloqueia desenvolvimento mas é urgente.

---

### T04 · ARCH-001 · Dois schemas paralelos para V2 sem ADR canónico · CRITICAL · Arch

**Área:** Arquitectura / Governança
**Descrição:** Existem dois schemas com propósito sobreposto para V2 Condomínios: `v2_condominios` (47 tabelas, dados migrados, RLS completo) e `v2_new` (6 tabelas limpas com FKs para `core.*`, criado Sprint C2, ADR-V11-004 não tem ficheiro). `apps/v2-condominios/` tem 22 views mas não está documentado qual schema usa. A bridge cron `v2-legacy-bridge-cron` sincroniza dados do Supabase V2 produção para `v2_new`. ADR-V2-003 (cutover V2) não menciona `v2_new`.
**Impacto se não resolver:** Desenvolvimento em paralelo nos dois schemas cria divergência irreversível. Qualquer query de negócio pode estar a ler dados desactualizados do schema errado. Impossível fazer cutover sem saber qual é o estado destino.
**Esforço:** S (decisão + ADR formal) + L (implementação da path escolhida)
**Dependências:** Bloqueia fases B–F do ADR-V2-003; bloqueia arranque de desenvolvimento V2 activo.

---

### T05 · OPS-001 · ADR-V11-004 e ADR-V11-005 em produção sem ficheiro em git · CRITICAL · Ops

**Área:** Governança / Rastreabilidade
**Descrição:** As duas decisões arquitecturais mais recentes e mais impactantes (CRM Attio-style com `v2_new` + multi-workspace, e Truth Engine Swarm com 25 workers e 10 niches) foram aprovadas, implementadas com 4+ migrations e 2+ Edge Functions cada, e estão em produção em `hkmvszkpxjbxmnixzqbl`. Não existem ficheiros `.md` em `.claude/strategy/adrs/`. O registo destas decisões existe apenas em `.claude/state/triggers.md` — ficheiro de coordenação inter-agentes que pode ser limpo.
**Impacto se não resolver:** Perda do racional de decisão. Qualquer agente futuro que consulte os ADRs não vai encontrar estas duas decisões fundamentais. Risco de contradição não detectada com futuras decisões.
**Esforço:** S (redigir os dois ADRs a partir dos triggers existentes — trabalho de architect-proptech)
**Dependências:** —

---

### T06 · FE-001 · 5 design systems paralelos sem código partilhado · CRITICAL · Frontend

**Área:** Frontend / Design System
**Descrição:** dashboard (purple dark), v2-condominios (dark+gold portal), v4-energia (blue/green/gold com string CSS injectada), v5-manutencao (forest/emerald inline), truth (Tailwind). `packages/ui` cobre apenas 5 componentes utilitários (drawers + cards) e zero tokens. LoginScreen tem 4 implementações independentes. Sidebar tem 3. KPI Card tem 5+.
**Impacto se não resolver:** Inconsistência visual inevitável entre verticais. Mudança de marca requer editar 4+ ficheiros em locais distintos. Onboarding de qualquer colaborador exige compreender 5 sistemas. Cada nova vertical replica o problema.
**Esforço:** XL (consolidação de tokens + extracção de primitives para `packages/ui` — trabalho de design system multi-semanas)
**Dependências:** Bloqueia escalabilidade de novas verticais com consistência visual.

---

### T07 · FE-002 · Auth fragmentada em 5 implementações · CRITICAL · Frontend

**Área:** Frontend / Auth
**Descrição:** (1) dashboard usa `AuthGuard.jsx` próprio sem `useAuth`; (2) v2-condominios usa `@proptech/auth` correctamente; (3) v4-energia usa `sb.auth.signInWithPassword` directo sem provider; (4) v5-manutencao declara `@proptech/auth` em `package.json` mas importa `./lib/AuthContext.jsx` local em runtime; (5) admin/index.html tem auth HTML vanilla. `@proptech/auth` só é genuinamente consumido por v2.
**Impacto se não resolver:** Bug fixes de auth têm que ser feitos em 5 sítios. Divergência de comportamento (signout, refresh token, `is_staff` claim) entre apps. Nova vertical herda o caos por ausência de padrão claro.
**Esforço:** L (migrar dashboard, v4, v5 para `@proptech/auth` — uma app de cada vez)
**Dependências:** T06 (design system) pode ser paralelo; T07 é independente e de maior impacto imediato.

---

### T08 · DB-004 · 106 + 112 RPCs SECURITY DEFINER acessíveis por anon/authenticated · CRITICAL · DB

**Área:** Database / Segurança
**Descrição:** 106 funções SECURITY DEFINER executáveis pela role `anon` via REST e 112 pela role `authenticated`. Estas funções executam com os privilégios do owner (normalmente `postgres` ou `supabase_admin`), ignorando RLS. Cresceu com as novas RPCs do CRM Attio (`core.list_records`, `core.get_activity_timeline`, etc.) e do Swarm (`swarm_claim_next_niche`).
**Impacto se não resolver:** Superfície de ataque enorme. Uma função mal escrita pode expor dados de qualquer schema. 62 funções têm `search_path` mutável (risco adicional de injection).
**Esforço:** L (auditoria RPC a RPC — revogar `anon` onde não necessário, fixar search_path, converter para SECURITY INVOKER onde adequado)
**Dependências:** T01/T02 relacionados. Pode ser paralelo.

---

### T09 · ARCH-002 · `bia-chat` e `mia-chat` coexistem em produção · CRITICAL · Arch

**Área:** Arquitectura / Naming / Custo
**Descrição:** A renomeação Bia→Mia (branch `chore/rename-bia-jarvis-mia`, activa) está incompleta. `bia-chat` (v20) e `mia-chat` (v4) são duas Edge Functions distintas e activas em `hkmvszkpxjbxmnixzqbl`. Ficheiros `bia.md` e `mia.md` coexistem em `.claude/employees/`. Views `BiaScorecard.jsx`, `BiaTaskLauncher.jsx`, `BiaPlaceholder.jsx` ainda existem em `apps/dashboard/src/views/`. Em V2 existem `bia-discord-setup` e `bia-discord-find-mario` como funções activas.
**Impacto se não resolver:** Custo duplicado de invocações AI (cada chat que usa o endpoint errado paga duas vezes). Confusão operacional: qual endpoint é o "real"? Rename incompleto vai acumular mais divergência a cada sprint.
**Esforço:** M (concluir rename + deprecar bia-chat + remover views Bia do dashboard)
**Dependências:** Branch `chore/rename-bia-jarvis-mia` deve ser concluída e mergeada em `main`.

---

### T10 · FE-003 · Acessibilidade quase ausente — risco legal DL 83/2018 · CRITICAL · Frontend

**Área:** Frontend / Acessibilidade
**Descrição:** Dashboard tem 2 ocorrências ARIA em todo o código. V2 tem 1. Nenhuma app tem `eslint-plugin-jsx-a11y`. Nenhuma app confirmou `<html lang="pt-PT">`. Zero apps respeitam `prefers-reduced-motion`. Sem skip-to-content links. V2 Condomínios (prataowners.pt) está em produção servindo condóminos reais — pode estar sujeita ao Decreto-Lei 83/2018 (acessibilidade sector público/serviços essenciais).
**Impacto se não resolver:** Risco de não-conformidade legal. Exclusão de utilizadores com necessidades de acessibilidade. Impossibilidade de certificação WCAG 2.1 AA que pode ser exigida em contratos públicos ou de gestão condominial.
**Esforço:** G (auditoria + remediação incremental — começar por adicionar `eslint-plugin-jsx-a11y` + corrigir `<html lang>` + skip-to-content)
**Dependências:** Pode ser paralelo a tudo o resto. V2 produção é prioridade.

---

## Dívida Detalhada por Área

### Arquitectura

#### ARCH-001 · Dois schemas paralelos para V2 · CRITICAL
Ver T04 acima.

#### ARCH-002 · `bia-chat` e `mia-chat` coexistem · CRITICAL
Ver T09 acima.

#### ARCH-003 · ADR-V11-004 e ADR-V11-005 sem ficheiro · CRITICAL
Ver T05 acima (classificado como OPS-001 — impacto é também arquitectural).

#### ARCH-004 · `apps/truth/` não documentada em CLAUDE.md · HIGH

**Severity:** High
**Descrição:** `apps/truth/` (Truth Engine / Swarm, React 19 + Tailwind, port 5181) foi criada em 2026-05-18 e não aparece em CLAUDE.md, nos mapeamentos de deploy, nem em nenhum ADR com ficheiro. É uma app com 4 views (Swarm, Discoveries, Niches, Studio) sem projecto Vercel associado e sem indicação de quem é o owner ou qual o roadmap.
**Impacto:** Agentes não sabem que existe. Não entra no pipeline de deploy. Tailwind é o único outlier no monorepo (cria inconsistência de stack que tende a propagar-se).
**Esforço:** S (documentar em CLAUDE.md + criar projecto Vercel ou declarar que é local-only)
**Dependências:** —

#### ARCH-005 · `apps/v2-condomino-mobile/` sem código fonte · HIGH

**Severity:** High
**Descrição:** Pasta com apenas `dist/` (index.html + 1 bundle JS + 1 CSS). Sem `src/`, `package.json`, `vite.config.js`. A origem do código fonte não é identificável neste monorepo. O `dist/index.html` confirma `lang="pt"`. Não está em CLAUDE.md nem em nenhum ADR.
**Impacto:** Zero manutenibilidade. Não pode ser rebuildado. Pode haver código importante encapsulado num artefacto sem origem rastreável.
**Esforço:** S (decisão: integrar fonte ou eliminar) + M-G (reintegração se necessário)
**Dependências:** —

#### ARCH-006 · ADR-V2-003 (cutover V2) com fases B–F abertas indefinidamente · MEDIUM

**Severity:** Medium
**Descrição:** ADR-V2-003 define 6 fases de cutover do V2 legado (prataowners.pt em Netlify) para V1 Core Hub. Fases A (sync de dados) e D (storage read-only) estão concluídas. Fases B (RPCs+views), C (Edge Functions), E (UI 9 features), F (cutover DNS) estão sem prazo. Entretanto, `apps/v2-condominios/` cresceu para 22 views e foram criados dois schemas paralelos.
**Impacto:** O fosso entre o estado actual e o plano de cutover aumenta a cada sprint. Quanto mais tarde, mais custosa a convergência.
**Esforço:** L (retomar as fases — depende de clarificar ARCH-001 primeiro)
**Dependências:** ARCH-001 (schema canónico V2) deve ser resolvido antes de continuar este ADR.

#### ARCH-007 · Discord com dois targets de deploy sem ADR · MEDIUM

**Severity:** Medium
**Descrição:** `apps/discord-bot/` (Deno + Fly.io) e `apps/discord-bot-cf/` (Cloudflare Workers + Durable Objects) coexistem. Sem ADR que justifique a escolha de dois targets ou qual é o primário. Sem documentação de qual está a processar eventos reais.
**Impacto:** Custo duplo de infraestrutura. Risco de eventos processados duas vezes ou nenhuma vez se um falhar e o outro não compensar.
**Esforço:** S (decisão + ADR) + M (eliminar o secundário)
**Dependências:** —

#### ARCH-008 · `apps/cli/` sem ADR, sem deploy, sem roadmap · MEDIUM

**Severity:** Medium
**Descrição:** CLI Node + Ink com 6 comandos (tasks/recipes/inbox/chat). Sem referência em CLAUDE.md, sem ADR, sem deploy target definido. Não se sabe se é ferramenta interna, produto, ou experimento descartável.
**Impacto:** Baixo imediato. Risco de crescer sem governança e tornar-se legado não documentado.
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

#### DB-004 · 106+112 RPCs SECURITY DEFINER acessíveis por anon/authenticated · CRITICAL
Ver T08 acima.

#### DB-005 · Schema `v1_owners_club` com nome errado · HIGH

**Severity:** High
**Descrição:** CLAUDE.md e a arquitectura canónica mapeiam V10 = Owners Club. O schema chama-se `v1_owners_club` (nome conflituante com V1 Core Hub). Deve chamar-se `v10_owners_club`. Tem 3 tabelas e 6 rows de dados reais (ofertas).
**Impacto:** Confusão de naming entre V1 (Core Hub) e o prefixo do schema. Qualquer query cross-vertical que filtre por `v1_*` vai apanhar o schema errado.
**Esforço:** M (migration `ALTER SCHEMA v1_owners_club RENAME TO v10_owners_club` + actualizar todas as referências nas apps e edge functions)
**Dependências:** —

#### DB-006 · 18 tabelas `_stg_*` e 2 `_migration_*` em `v2_condominios` sem RLS · HIGH

**Severity:** High
**Descrição:** A migração V2 criou 18 tabelas de staging (`_stg_*`) e 2 tabelas de controlo (`_migration_runs`, `_v2_condomino_to_pessoa`) no schema `v2_condominios`. Estas tabelas não têm RLS. Não está claro se a migração está concluída (se sim, são candidatas a dropar) ou se estão em uso activo.
**Impacto:** Dados de staging acessíveis via API REST sem autenticação. Se a migração terminou, ocupam espaço e criam ruído; se ainda estão em uso, precisam de RLS urgente.
**Esforço:** S (confirmar estado) + M (dropar ou adicionar RLS)
**Dependências:** Coordenar com ADR-V2-003 estado de migração.

#### DB-007 · `bia-chat` e `mia-chat` como Edge Functions duplicadas · HIGH

**Severity:** High (duplicação DB-side da ARCH-002)
**Descrição:** Além do impacto arquitectural, `bia-chat` (v20) consome tokens AI em produção enquanto `mia-chat` (v4) é o endpoint novo. Cada invocação ao endpoint errado é custo real. Em V2 existem ainda `bia-discord-setup` e `bia-discord-find-mario` sem equivalente em V1.
**Impacto:** Custo duplicado. Dados de histórico de chat divididos entre dois endpoints.
**Esforço:** M (deprecar + remover bia-chat após confirmação de que mia-chat está completo)
**Dependências:** Branch `chore/rename-bia-jarvis-mia`.

#### DB-008 · 8 tabelas `brain_*` em V2 produção sem propósito claro · MEDIUM

**Severity:** Medium
**Descrição:** 4 migrations aplicadas em V2 produção em 2026-05-16 criaram `public.brain_profiles`, `brain_authors`, `brain_books`, `brain_discs`, `brain_recipes`, `brain_runs`, `brain_articles`, `brain_journal`. Têm RLS activo mas 0 rows. Propósito não documentado — possível residual de funcionalidade Mia/Bia.
**Impacto:** Schema de produção poluído. Em V2 produção (intocável), dropar estas tabelas requer plano formal.
**Esforço:** S (investigar origem) + M (dropar com migration formal se não utilizadas)
**Dependências:** Qualquer acção em V2 produção requer aprovação explícita do Mário.

#### DB-009 · 341 índices não utilizados (V1) · MEDIUM

**Severity:** Medium
**Descrição:** Advisor reporta 341 `unused_index` em V1, incluindo todos os índices `brain_*` (tabelas vazias), `idx_audit_*`, e múltiplos índices das tabelas de staging `v2_condominios._stg_*`. 8 pares de índices duplicados detectados.
**Impacto:** Overhead em writes (cada insert/update mantém índices mortos). Espaço desperdiçado. Performance degradada em tabelas com muitas policies permissivas (149 `multiple_permissive_policies`).
**Esforço:** M (executar `DROP INDEX CONCURRENTLY` nos índices confirmados como unused — requer análise de `pg_stat_user_indexes`)
**Dependências:** Deve ser feito após DB-006 (staging tables) para não duplicar trabalho.

#### DB-010 · `marketing` vs `growth` schema — ambiguidade de naming · MEDIUM

**Severity:** Medium
**Descrição:** CLAUDE.md lista schema `marketing` com tabelas `leads`, `campanhas`, `segmentos`, `interacoes`, `oportunidades`, `cross_sell_rules`. ADR-015 e `20260513_growth_schema.sql` criam schema `growth`. O schema `marketing` existe (13 tabelas: competitors, scraped_ads, scrape_jobs, sectors, kpi_snapshots, etc.) mas com conteúdo diferente do documentado em CLAUDE.md. Não existe ADR que esclareça a relação entre os dois schemas.
**Impacto:** Qualquer developer que leia CLAUDE.md vai criar tabelas em `marketing` que deviam ir para `growth` (ou vice-versa). Queries de CRM podem ir ao schema errado.
**Esforço:** S (clarificar em ADR: marketing = competitive intel, growth = funil de vendas) + S (actualizar CLAUDE.md)
**Dependências:** —

#### DB-011 · `swarm-orchestrator-cron` pausado por bug `haiku_json_parse_failed` · MEDIUM

**Severity:** Medium
**Descrição:** O Truth Engine (ADR-V11-005) está deployado com 25 workers e 10 niches mas o cron principal está pausado. O Claude Haiku retorna JSON com markdown fences que causam `JSON.parse` a falhar. O worker v3 tem fix implementado mas o swarm não foi reactivado.
**Impacto:** A funcionalidade central do Truth Engine não está operacional. Investments em ADR-V11-005 estão bloqueados.
**Esforço:** S (strip markdown fences + reactivar cron — trigger activo `TO mario` já documentado)
**Dependências:** Requer decisão de Mário para reactivar.

#### DB-012 · `v2-legacy-bridge-cron` mantém dependência de V2 produção activa · LOW

**Severity:** Low
**Descrição:** A cron `v2-legacy-bridge-cron` sincroniza dados do Supabase V2 produção (`eozklslwfaqujaijvdnl`) para `v2_new` em V1. Enquanto esta cron existir, qualquer problema no projecto V2 afecta V1. É uma dependência cross-projecto não monitorizada.
**Impacto:** Baixo a curto prazo — a bridge faz parte do plano de cutover. A longo prazo, deve ser desactivada após cutover completo (fase F do ADR-V2-003).
**Esforço:** S (adicionar alerta de falha da cron) + resolução ligada ao ADR-V2-003.
**Dependências:** ARCH-006 (cutover V2).

---

### Frontend

#### FE-001 · 5 design systems paralelos · CRITICAL
Ver T06 acima.

#### FE-002 · Auth fragmentada em 5 implementações · CRITICAL
Ver T07 acima.

#### FE-003 · Acessibilidade quase ausente · CRITICAL
Ver T10 acima.

#### FE-004 · Routing inconsistente (React Router vs state-based) · HIGH

**Severity:** High
**Descrição:** dashboard e v2-condominios usam React Router v6 (maduro). v4-energia e v5-manutencao (a app em produção!) usam routing state-based (`useState`). URL nunca muda em v4/v5. Browser back quebrado. Deep links impossíveis. v5 documenta que Capacitor (Fase 7) resolverá — mas é produção hoje.
**Impacto:** UX prejudicada em v5 (app mais usada). Suporte a clientes impossibilita "partilha de link". Browser back não funciona como esperado.
**Esforço:** M-G por app (migrar v4 + v5 para React Router)
**Dependências:** v4 é mais simples (apenas 3 tabs). v5 é mais complexa (estado de auth + role).

#### FE-005 · Zero apps usam React Query / SWR · HIGH

**Severity:** High
**Descrição:** 100% das chamadas Supabase são `useEffect + fetch manual + setState`. Dashboard tem 40+ hooks custom que reinventam cache, dedup e retry. Sem stale-while-revalidate, loading flashes em cada navegação, possíveis race conditions em fetches paralelos.
**Impacto:** Performance degradada. UX com loading states desnecessários. Bugs difíceis de reproduzir (race conditions). Custo de manutenção crescente com novos hooks.
**Esforço:** G por app (introduzir React Query + migrar hooks críticos — não é big bang, pode ser incremental)
**Dependências:** —

#### FE-006 · `apps/v2-condomino-mobile/` artefacto órfão · HIGH
Ver ARCH-005 acima.

#### FE-007 · `apps/core/` e `apps/v1-core/` ainda no filesystem · HIGH
**Severity:** High
**Descrição:** CLAUDE.md declara remoção em 2026-05-13. Confirmado: apenas `node_modules/` presente, sem código source. Mas o cleanup físico não ocorreu — directórios ainda existem e aparecem em `ls apps/`. Confundem scripts de build, agentes AI que façam glob de `apps/*`, e qualquer colaborador que leia o filesystem.
**Impacto:** Risco de edição acidental. Inconsistência entre documentação e realidade. Scripts de build podem incluir apps vazias.
**Esforço:** P (remover os dois directórios + actualizar CLAUDE.md para confirmar remoção)
**Dependências:** —

#### FE-008 · `@proptech/auth` declarado mas não usado em v5 · HIGH
Ver T07 / FE-002 (detalhe específico da v5).

#### FE-009 · Demo accounts hardcoded ainda importados em v5 (`@deprecated 3.4A`) · MEDIUM

**Severity:** Medium
**Descrição:** `App.jsx:6` de v5 ainda importa `DEMO_PESSOA_ID` e `DEMO_ORGANIZATION_ID` apesar de marcados `@deprecated 3.4A`. Dados demo hardcoded em código de produção.
**Impacto:** Risco de dados demo aparecerem em produção por erro de routing. Indicador de que limpeza de v5 está incompleta.
**Esforço:** P (remover import + confirmar que nenhum flow usa estes IDs)
**Dependências:** —

#### FE-010 · 3 chaves `localStorage` diferentes para tema (dark/light) · MEDIUM

**Severity:** Medium
**Descrição:** `v1theme` (v4-energia), `v2theme` (v2-condominios), `dashboard-theme` (dashboard). Se as apps forem embeddable ou usadas em sequência, a preferência de tema não persiste cross-app.
**Impacto:** UX inconsistente. Utilizador que muda para light em dashboard fica em dark se abrir v2.
**Esforço:** P (unificar para `proptech-theme` em todas as apps)
**Dependências:** FE-001 (design system) — idealmente resolver em conjunto.

#### FE-011 · TODOs operacionais da baseline 2026-05-05 sem evidência de resolução · MEDIUM

**Severity:** Medium
**Descrição:** Baseline documentou 15+ TODOs em v5: writes para tabela errada (`servicos` vs `catalogo_servicos`), `pontos_historico`/`missoes_utilizador` possivelmente inexistentes, NIF sem checkdigit, ETA hardcoded 18min em chat, FAQ hardcoded, `suporte@exemplo.pt` placeholder, `app.exemplo.pt` em referral, links V2 com `alert('TODO')`. Nenhum foi confirmado como resolvido.
**Impacto:** Bugs de produção visíveis em v5 (app activa). Dados podem estar a ir para schema errado. Placeholders expostos a utilizadores finais.
**Esforço:** M (re-scan + fix por fix — catalogar estado actual)
**Dependências:** —

#### FE-012 · Nomes inconsistentes de packages workspace · LOW

**Severity:** Low
**Descrição:** `@proptech/dashboard`, `@proptech/ui`, `@proptech/db`, `@proptech/auth` vs `@property007/truth` vs `v2-condominios` (sem prefixo) vs `v4-energia` (sem prefixo). Três convenções de naming em coexistência no mesmo workspace.
**Impacto:** Confusão em novos packages. `@property007` é prefixo diferente de `@proptech` — podem colidir se publicados num registry.
**Esforço:** S (decisão de convenção) + P por package (renomear)
**Dependências:** —

#### FE-013 · Fontes inconsistentes (Inter / DM Sans / Fraunces+Outfit / sistema) · LOW

**Severity:** Low
**Descrição:** CLAUDE.md declara Inter + JetBrains Mono como canónico. Realidade: v5 usa Fraunces+Outfit (decisão V5 CLAUDE.md), v2 usa DM Sans, v4 usa Inter, dashboard usa sistema (`-apple-system`). 4 font stacks diferentes. Se apps forem embedded, todas as fontes carregam em simultâneo.
**Impacto:** Bundle inflado, FOUT (flash of unstyled text), inconsistência visual menor.
**Esforço:** S (decisão) + M (implementação por app)
**Dependências:** FE-001 (design system) — resolver em conjunto.

#### FE-014 · `apps/truth/` usa Tailwind como outlier único do monorepo · LOW

**Severity:** Low
**Descrição:** `apps/truth/` é a única app com Tailwind 3.4.17 + PostCSS. Todas as outras usam CSS files ou inline styles. Se `truth` servir de referência, Tailwind vai propagar-se sem decisão formal.
**Impacto:** Inconsistência de stack. Nova vertical pode ser criada em Tailwind sem contexto (FE-001 não foi resolvido).
**Esforço:** S (decisão: Tailwind é o futuro padrão ou exception?)
**Dependências:** FE-001 (design system — definir padrão único).

---

### Ops / Governança

#### OPS-001 · ADR-V11-004 e ADR-V11-005 sem ficheiro em git · CRITICAL
Ver T05 acima.

#### OPS-002 · ADR-V3-001, ADR-V4-001, ADR-condo-001 sem ficheiro em git · HIGH

**Severity:** High
**Descrição:** ADR-V3-001 (arranque V3 Seguros), ADR-V4-001 (motor BD-driven V4), ADR-condo-001 (referenciado desde 2026-05-05) — todos referenciados em triggers.md ou state files mas sem ficheiro `.md` em `.claude/strategy/adrs/`. ADRs 001–009 continuam apenas em Notion (nunca chegaram a git). ADR-012 (PropTech Operating System) referenciado em agent state sem ficheiro.
**Impacto:** Base de conhecimento da plataforma está dividida entre Notion, triggers.md e git — sem fonte única de verdade acessível a todos os agentes.
**Esforço:** M (criar ficheiros ADR retroactivamente para os 4+ ADRs em falta)
**Dependências:** OPS-001 deve ser feito primeiro (os dois ADRs mais urgentes).

#### OPS-003 · 67 Edge Functions no V1, ~50 não versionadas em git · HIGH

**Severity:** High
**Descrição:** V1 passou de 15 para 67 Edge Functions activas em 18 dias (+52). Das 67, apenas as V4 (`v4-energia-lead`, `v4-ingest-erse`, etc.) e algumas core estão versionadas em `supabase/functions/`. As restantes (~50) foram deployadas via MCP sem ficheiro local correspondente em `supabase/functions/`.
**Impacto:** Impossível reproduzir o estado das functions a partir do git. Bug fix numa function não versionada exige edição directa no Supabase Dashboard. `auth-test`, `admin-ui-test`, `agent-test` são funções de teste em produção.
**Esforço:** L (exportar todas as functions + organizar em `supabase/functions/` + remover funções de teste)
**Dependências:** Paralelo ao DB-003 (migrations sem ficheiro).

#### OPS-004 · 7+ branches sprint não mergeadas em `main` · MEDIUM

**Severity:** Medium
**Descrição:** `sprint/crm-attio-week1`, `sprint/crm-attio-week2`, `sprint/truth-week1`, `sprint/truth-week2`, `sprint/truth-week3`, `sprint/cookai3-week1`, `sprint/cookai3-week2` (e possivelmente mais) nunca foram mergeadas em `main`. 221 commits em 18 dias. O fosso entre `main` e o estado real de desenvolvimento aumenta o risco de conflitos e torna o estado de produção opaco.
**Impacto:** Estado de `main` diverge cada vez mais do estado real. Merge tardio = conflitos maiores. Preview deployments acumulam sem validação.
**Esforço:** M (merge sequencial com testes, começar pelas branches mais antigas)
**Dependências:** Mário deve validar cada Preview antes do merge.

#### OPS-005 · Funções de migração one-shot (`migrar-faturas`, `migrar-fatura`) em V2 produção · LOW

**Severity:** Low
**Descrição:** Duas Edge Functions de migração one-shot continuam activas em V2 produção (`migrar-faturas` v7, `migrar-fatura` v8). Foram usadas durante a migração inicial de dados. Devem ser desactivadas — representam operações destrutivas/críticas acessíveis via endpoint.
**Impacto:** Risco baixo mas real: endpoint activo para operação de migração em produção.
**Esforço:** P (desactivar as duas functions no Dashboard Supabase V2)
**Dependências:** Qualquer acção em V2 requer aprovação explícita do Mário.

---

## Riscos a Curto Prazo (próximos 30 dias)

Estas dívidas têm probabilidade elevada de materializar-se em incidente ou divergência irreversível se não tratadas até 2026-06-22:

| ID | Dívida | Risco específico | Probabilidade |
|----|--------|-----------------|---------------|
| DB-001 | 14 tabelas sem RLS em V1 | Leitura de dados de sistema via anon_key — pode ser explorado se a chave vazar | Alta |
| DB-003 | 215 migrations sem ficheiro SQL | Próxima migration de qualquer agente vai aumentar o gap. Rollback/debug fica cego | Alta |
| ARCH-001 | Dois schemas V2 paralelos | Nova feature para V2 será desenvolvida no schema errado | Alta |
| OPS-001 | ADR-V11-004/V11-005 sem ficheiro | triggers.md pode ser limpo em qualquer cleanup de agentes — decisões perdem-se | Alta |
| ARCH-002 + DB-007 | `bia-chat`/`mia-chat` coexistentes | Custo AI duplicado a crescer por dia enquanto não resolvido | Média-Alta |
| OPS-004 | Branches sprint não mergeadas | Próximo sprint vai criar conflitos de merge significativos | Média |
| DB-011 | swarm-orchestrator-cron pausado | Truth Engine continua inoperacional — investimento não rende | Alta |

---

## Recomendações Estratégicas

### Fase 1 — Quick Wins (1–2 semanas, baixo risco)

Estas acções têm impacto imediato com esforço e risco baixos:

1. **OPS-001** — Redigir ADR-V11-004 e ADR-V11-005 (architect-proptech, 1 dia)
2. **OPS-005** — Desactivar `migrar-faturas` e `migrar-fatura` em V2 produção (autorização Mário, 30 min)
3. **FE-007** — Eliminar `apps/core/` e `apps/v1-core/` do filesystem (vertical-builder, 1h)
4. **FE-009** — Remover demo accounts hardcoded de v5 (vertical-builder, 30 min)
5. **DB-011** — Reactivar swarm-orchestrator-cron com fix haiku JSON parse (supabase-designer, 2h)
6. **DB-010** — Clarificar `marketing` vs `growth` em ADR + actualizar CLAUDE.md (architect-proptech, 2h)
7. **FE-010** — Unificar chave localStorage de tema para `proptech-theme` (vertical-builder, 1h)
8. **ARCH-004** — Documentar `apps/truth/` em CLAUDE.md (architect-proptech, 30 min)
9. **OPS-002** — Criar ficheiros ADR retroactivos para V3-001, V4-001, condo-001, ADR-012 (architect-proptech, meio dia)

### Fase 2 — Structural (2–6 semanas, médio risco)

Requerem planeamento e testes mas são críticas para continuar a escalar:

1. **DB-001** — Activar RLS nas 14 tabelas V1 (supabase-designer, 3–5 dias)
2. **DB-002** — Converter vistas SECURITY DEFINER para SECURITY INVOKER (supabase-designer, 1 semana)
3. **DB-003** + **OPS-003** — Exportar 215 migrations + 50 Edge Functions para git (supabase-designer, 1 semana)
4. **ARCH-001** — Decidir schema canónico V2 + ADR formal + actualizar ADR-V2-003 (architect-proptech + Mário, 2 dias de decisão + 2 semanas implementação)
5. **ARCH-002** — Concluir rename Bia→Mia, deprecar bia-chat, limpar views Bia do dashboard (vertical-builder, 3 dias)
6. **DB-005** — Renomear `v1_owners_club` → `v10_owners_club` (supabase-designer, 1 dia)
7. **DB-006** — Limpar staging tables `_stg_*` em `v2_condominios` (supabase-designer, 2 dias)
8. **FE-002** (parcial) — Migrar v5 para `@proptech/auth` (eliminar dual auth) (vertical-builder, 2–3 dias)
9. **FE-004** — Adicionar React Router a v4-energia (vertical-builder, 1 dia)
10. **OPS-004** — Merge sequencial das branches sprint em `main` (devops, 1 semana)

### Fase 3 — Long-Term (6+ semanas, alto esforço)

Investimentos estruturais que melhoram a plataforma a longo prazo:

1. **DB-008** — Auditoria e remoção das RPCs SECURITY DEFINER desnecessárias (supabase-designer, 2–3 semanas)
2. **FE-001** — Consolidar design system em `packages/ui` com tokens partilhados (design-system agent, 4–6 semanas)
3. **FE-002** (completo) — Migrar dashboard e v4 para `@proptech/auth` (vertical-builder, 1–2 semanas)
4. **FE-003** — Auditoria WCAG + remediação incremental de acessibilidade (design-system + vertical-builder, ongoing)
5. **FE-005** — Introduzir React Query nas apps críticas (dashboard, v2) (vertical-builder, 2–3 semanas por app)
6. **ARCH-006** — Retomar cutover V2 (fases B–F do ADR-V2-003) (architect-proptech + supabase-designer, 4–8 semanas)
7. **DB-009** — Cleanup de 341 índices não utilizados (supabase-designer, 1 semana)
8. **ARCH-005 + ARCH-007 + ARCH-008** — Decisões sobre mobile, Discord e CLI (architect-proptech, 1 semana de decisão)

---

*Produzido por architect-proptech · 2026-05-23 · Phase 4 Brownfield Discovery*
*Inputs: system-architecture.md + SCHEMA.md + DB-AUDIT.md + frontend-spec.md*
*Próximo: Phase 5 — DB Specialist Review (supabase-designer valida secção Database)*
*Próximo: Phase 6 — UX Specialist Review (aiox-ux valida secção Frontend)*
