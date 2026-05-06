# AUDIT-ARCHITECTURE · PropTech Platform · 2026-05-05

> Produzido por: architect-proptech  
> Âmbito: read-only — sem commits, sem edições de código  
> Fonte de dados: AUDIT-RAW.md + leitura directa de ficheiros de estado  
> Data: 2026-05-05

---

## 1. Status dos ADRs

### 1.1 ADRs versionados em git

Existe **apenas 1 ficheiro ADR versionado em git**, na pasta `.claude/strategy/adrs/`:

| Ficheiro | ID | Título | Estado |
|---|---|---|---|
| `010-command-center-pivot.md` | ADR-010 | Command Center Pivot | **Accepted** |

A pasta `.claude/ADRs/` (raiz) existe mas está vazia — contém apenas `.gitkeep`. Esta pasta foi criada com intenção de ser o repositório canónico de ADRs, mas nunca foi utilizada.

### 1.2 ADRs referenciados mas NÃO versionados em git

Os seguintes ADRs existem como referências em triggers, decisions-log, ou agent state files, mas **não têm ficheiro `.md` correspondente em `.claude/strategy/adrs/`**:

| ID | Título | Onde referenciado | Localização real (se conhecida) |
|---|---|---|---|
| ADR-001 | V4 Energia React scope + Edge Function leads | triggers.md (DONE), verticals-state.md | Apenas em Notion (ID não confirmado) |
| ADR-003 | V10 Owners Club — proposta de reorganização | verticals-state.md | Estado: Proposto, aguarda Mário — sem ficheiro local |
| ADR-004 | Tags `text[]` em `core.imoveis` | triggers.md (DEFERRED), verticals-state.md | ADR no Notion: ID `35484147-fa60-8197-a198-ed427cd69668` |
| ADR-005 | Dashboard React agentic-ops | agent-state architect-proptech, triggers (DONE) | `.claude/current/ADR-005-dashboard-react.md` — fora da pasta de ADRs |
| ADR-condo-001 | Arquitectura AI-native V2 Condomínios | triggers.md (DONE), agent-state | `.claude/strategy/adrs/ADR-condo-001-ai-native-architecture.md` — **ficheiro não encontrado em git** (apenas referenciado) |

**Conclusão:** A prática actual é registar decisões em Notion (com IDs próprios), em triggers.md como linhas de texto, e no agent state file. O git é sistematicamente subaproveitado como repositório de ADRs. Existe divergência entre o que se diz que existe e o que existe em ficheiros verificáveis.

### 1.3 Estado de cada ADR conhecido

| ADR | Estado formal | Implementado? | Risco se não implementado |
|---|---|---|---|
| ADR-001 | Aceite (Abril 2026) | Parcial — schema aplicado, Edge Function criada mas não deployada | Médio — V4 standby por decisão estratégica |
| ADR-003 | Proposto — aguarda Mário | Não | Baixo — apenas afecta V10 tab Sprint 1E |
| ADR-004 | DEFERRED (triggers.md) | Não — migration não aplicada | Baixo — feature de categorização não é requisito actual |
| ADR-005 | Aceite / Done | Sim — dashboard live em Vercel | Nenhum |
| ADR-010 | Aceite (2026-05-04) | Parcialmente — Phase 1 UI concluída, Phase 1.5 auth pendente | Alto — Bia não pode ir live sem auth |
| ADR-condo-001 | Aceite (2026-05-05) | Schema aplicado (migration em worktree sprint/v5-1b3) | Médio — 9 Supabase Cron schedules ainda não configurados |

---

## 2. Riscos Arquitecturais

### 2.1 `apps/core/` vs `apps/v1-core/` — qual é canónico?

**Facto verificado via git log:** O commit `774fe4e` (2026-04-20, "renumerar Core+V1-V10, rename apps/v1-core → apps/core") criou `apps/core/` como renomeação de `apps/v1-core/`. O `v1-core` que existe hoje é uma cópia anterior ao rename que **não foi apagada**.

Ambos os ficheiros `apps/core/src/App.jsx` e `apps/v1-core/src/App.jsx` têm **exactamente 1941 linhas** com conteúdo idêntico (cabeçalho "PROPTECH · V1 CORE HUB · React Port", mesma data 18 Abril 2026, mesmas dependências).

**Veredicto:** `apps/core/` é canónico (é o resultado do rename). `apps/v1-core/` é um duplicado obsoleto que escapou ao apagar. O CLAUDE.md ainda referencia `apps/v1-core/` porque não foi actualizado após o rename — isso é uma inconsistência de documentação, não de código.

**Risco:** Baixo no imediato. Risco médio se alguém editar `apps/v1-core/` a pensar que é canónico — as duas cópias ficam a divergir silenciosamente. A confusão no CLAUDE.md perpetua o risco.

**Acção recomendada:** Apagar `apps/v1-core/` e actualizar CLAUDE.md para referenciar `apps/core/`. Simples e seguro.

### 2.2 `apps/v2-condominios/` — existe mas não documentado

Este app **não consta em CLAUDE.md, não tem ADR, não está referenciado em nenhuma decisão formal**. O que se sabe pela leitura directa do código:

- Usa **React 19** (não 18 como V5)
- Consome `@proptech/auth` e `@proptech/db` (os dois packages do workspace)
- Porta 5176
- Scaffoldo mínimo: `App.jsx` tem ~30 linhas, apenas estrutura "Dashboard V2 Condomínios a construir…"
- O `packages/db/src/index.js` contém `createMainClient` e `createCoreClient` — o mesmo padrão de dois clientes Supabase (principal + core schema)

**O que é:** Um início de rebuild do frontend V2 usando a nova arquitectura de packages partilhados (`@proptech/auth`, `@proptech/db`). É uma evolução arquitectural correcta — separa a autenticação e a integração Supabase em packages reutilizáveis, em vez de ter cada app com a sua própria cópia de `createClient()`.

**O que NÃO é:** Um projecto maduro. É scaffoldo com nenhuma funcionalidade real.

**Risco:** Médio. A existência de um futuro frontend V2 em React 19 usando packages partilhados é uma decisão arquitectural importante que nunca foi formalizada. Se continuar a ser desenvolvido sem ADR e sem documentação, vai criar confusão sobre a relação com o V2 produção em `eozklslwfaqujaijvdnl` (que tem o seu próprio Supabase separado). A pergunta que ninguém fez ainda: este `apps/v2-condominios/` vai ligar-se ao Supabase V2 (`eozklslwfaqujaijvdnl`) ou ao V1 Core Hub (`hkmvszkpxjbxmnixzqbl`)?

**Acção recomendada:** Criar ADR que formaliza a existência deste app, a sua relação com V2 produção, qual Supabase usa, e quando entra em desenvolvimento activo.

### 2.3 Schemas v2_condominios, v3_seguros, v4_energia aplicados via migrations do V5

**Facto verificado:** As migrations `20260505_v2_condominios_schema.sql`, `20260505_v3_seguros_schema.sql`, e `20260505_v4_energia_schema.sql` existem no worktree `proptech-v5-1b3` em `apps/v5-manutencao/supabase/migrations/`. No worktree principal (`proptech-platform`, branch `main`), essa pasta tem apenas os 13 ficheiros de migrations até Abril 2024 — as 4 migrations de Maio 2026 (incluindo o schema `system` e os 3 schemas de outras verticais) ainda não estão mergeadas em `main`.

**O problema arquitectural real:** Migrations de schemas de outras verticais (v2, v3, v4) estão fisicamente dentro da pasta da aplicação V5 (`apps/v5-manutencao/supabase/migrations/`). Isto significa:

1. Se alguém clona o repo e segue a estrutura `supabase/migrations/` da raiz, não encontra estas migrations
2. As migrations de V2, V3, V4 ficam "reféns" do ciclo de vida de V5
3. Não é possível perceber que o projecto Supabase `hkmvszkpxjbxmnixzqbl` tem schemas de 5+ verticais apenas olhando para a raiz

**Contexto que mitiga o risco:** O projecto Supabase é um só (`hkmvszkpxjbxmnixzqbl` = V1 Core Hub), portanto faz sentido ter todas as migrations num único repositório. O problema é que esse repositório canónico é `supabase/migrations/` na raiz, mas está a ser usado `apps/v5-manutencao/supabase/migrations/` como repositório de facto para todas as migrations.

**Dívida técnica identificada:** A raiz `supabase/migrations/` tem apenas 2 ficheiros (GRANTs do schema `system`). A pasta V5 tem 17. Esta separação não reflecte nenhuma decisão consciente — aconteceu porque o Supabase CLI foi ligado (`supabase link`) dentro de `apps/v5-manutencao/`, não na raiz.

**Risco:** Médio-alto. O `supabase/.temp/linked-project.json` dentro de V5 aponta para `hkmvszkpxjbxmnixzqbl`. Se algum outro agente ou colaborador tentar usar o Supabase CLI da raiz, vai aplicar migrations para um projecto diferente (ou nenhum — link não feito). A inconsistência entre as duas localizações de migrations vai piorar com o tempo.

### 2.4 V1 Core Hub como hub único — riscos de contenção

Actualmente, o projecto Supabase `hkmvszkpxjbxmnixzqbl` aloja:
- Schema `core` (pessoas, imoveis, organizations, memberships, staff_roles)
- Schema `v4_energia` (acordos_comercializadoras, contratos_energia)
- Schema `v5_manutencao` (magic_links, prestadores_parceiros, recibos_servico, pedidos_orcamento, e ~30 outras tabelas)
- Schema `v2_condominios` (novo — 16 tabelas)
- Schema `v3_seguros` (novo — 4 tabelas)
- Schema `system` (inbox_items, inbox_reads, approvals_queue)

**Riscos de contenção identificados:**

1. **Limites de Supabase Free/Pro:** O projecto está em Paris (eu-west-3). O plano free tem 500MB de base de dados, 2GB de storage, 50k MAU. Com 6+ schemas e múltiplas verticais, o crescimento de dados pode pressionar estes limites mais cedo do que o esperado.

2. **RLS cruzada entre schemas:** A função `public.is_staff()` é usada pelo schema `system`. Se um utilizador é staff de V5, tem acesso a operações internas de todos os schemas que usem a mesma função? Esta ambiguidade não está documentada.

3. **Isolamento de backups:** Não é possível fazer backup apenas de V5 ou apenas de V2_condominios — o backup é do projecto inteiro. Se uma migration de V3 ou V4 correr mal, afecta a instância que tem V5 em produção (mesmo que V5 e V2 condominios estejam em schemas separados).

4. **Performance multi-schema:** Queries com JOINs cross-schema (ex: V5 a V1 core.pessoas) são mais lentas porque o Postgres tem de resolver o contexto de segurança por schema. Com RLS activa em todos os schemas, o `SECURITY DEFINER` em funções críticas torna-se um gargalo se mal configurado.

**Avaliação actual:** O risco é **baixo no presente** (volume mínimo, 0 clientes pagantes). Torna-se **médio** quando V5 tiver 50+ owners e V4 for activada. A contenção real só é problema com centenas de utilizadores concorrentes — ainda distante. A decisão Opção C (schemas por vertical num único projecto) foi consciente e está correcta para esta fase.

### 2.5 Duas localizações de migrations — 53 ficheiros SQL em dois sistemas de numeração

A situação real verificada é:

| Localização | Ficheiros | Sistema de numeração |
|---|---|---|
| `supabase/migrations/` (raiz) | 2 | Datas `YYYYMMDD_` |
| `apps/v5-manutencao/supabase/migrations/` | 13 (worktree main) / 17 (worktree sprint) | Datas `YYYYMMDD_` |
| `apps/v5-manutencao/sql/` | 40 | Misto: `NN_v5_*` (legado) + datas (recente) |

O total no AUDIT-RAW de "53 ficheiros SQL" é a soma de todos. Os 40 em `sql/` são históricos — aplicados manualmente via dashboard Supabase em fases anteriores do projecto, antes de o Supabase CLI ser adoptado. Este gap de tracking foi reconhecido e documentado em decisions-log.md (entrada 2026-05-01: "Migration tracking gap reconhecido").

**Risco real:** Médio. A `sql/` folder é um arquivo histórico, não um pipeline activo. O risco concreto é que `supabase db reset` (se algum agente tentar reconstruir o schema) não incluiria os 40 ficheiros históricos e o estado da base de dados ficaria incompleto. Esta divergência entre estado real em Supabase e o que está em migrations é uma dívida conhecida e aceite.

---

## 3. Decisões Pendentes

### 3.1 Decisões explicitamente abertas

| Decisão | Abertura | Urgência | Bloqueador |
|---|---|---|---|
| R2 alpha outreach — definir novo prazo | 2026-05-02 | P0 | Vercel deploy V5 + mobile E2E test |
| Rotação `SUPABASE_SERVICE_ROLE_KEY` V1 | 2026-05-02 | P0 (antes de 1º alpha real) | Antes do R2 outreach |
| `VITE_ANTHROPIC_API_KEY` em `App.jsx` browser-side | 2026-05-01 | P0 (pre-launch blocker) | Antes de deploy production V5 |
| Sprint 1E charter — prestador-app Camada 2 | 2026-05-02 | P1 | Depende de gate Day 7 Sprint 1D |
| ADR-003 V10 Owners Club — confirmar ou rejeitar | 2026-04-30+ | P2 | Aguarda Mário (>14 dias sem resposta) |
| Parceria operacional V4 (EDP / Galp / agnostic) | Anterior | P3 (trigger Q3 2026) | Decisão CEO |
| Domínio dedicado V5 (P-03) | Anterior | P3 | Trigger: 50 owners pagantes |

### 3.2 ADR-004 (tags imoveis) — ainda relevante?

**Contexto:** ADR-004 propõe adicionar campo `tags text[]` com índice GIN em `core.imoveis`. Foi marcado DEFERRED em triggers.md com nota: "ADR-004 mantém-se no Notion como referência futura para quando categorização livre for requisito real (V5 alpha+ ou V6+)."

**Avaliação actual:** O deferred está correcto. A categorização livre de imóveis não é requisito de Sprint 1D nem 1E. O campo `tags` só faz sentido quando houver volume suficiente de imóveis para filtrar (dezenas, não a meia dúzia actual). Não há utilizadores reais que precisem desta feature. O ADR existe, a decisão está documentada, não há urgência.

**Recomendação:** Manter DEFERRED. Rever quando V5 atingir 25+ owners ativos com múltiplos imóveis (trigger natural para necessidade de categorização).

### 3.3 ADR-condo-001 — implementação incompleta

O ADR foi aceite mas a implementação está a 50%: o schema foi aplicado (migration em sprint), mas os 9 Supabase Cron schedules referenciados no ADR não estão configurados. Enquanto não houver utilizadores reais em V2 AI-native, não é bloqueador — mas a decisão fica "aceite mas não totalmente executada".

### 3.4 Phase 1.5 do Command Center (ADR-010) — auth pendente

O ADR-010 D7 define Auth Phase 1.5 como **obrigatória antes de Bia ir live com alpha owners**. A Phase 1 UI está concluída (commit `7617bed` implementou magic-link + AuthGuard + logout), mas:
- A coluna `approval_decision_by` em `system.approvals_queue` só tem valor real com auth funcional
- O `<AuthGuard>` foi implementado mas depois retirado ("remove auth guard for internal use", commit `6d4478d`)

Há uma regressão: auth foi adicionada e removida. A justificação do commit é "internal use" — o que faz sentido para uso por Mário sozinho mas contraria o ADR-010 D7 que exige auth antes de Bia interagir com owners reais.

---

## 4. Próximas Acções Recomendadas

### Acção 1 — Apagar `apps/v1-core/` (prioridade: Alta)

`apps/v1-core/` é um duplicado exacto de `apps/core/` que ficou esquecido após o rename de Abril. Nenhum Vercel, nenhum ADR, nenhum agente aponta para ele. Apagar e actualizar CLAUDE.md é seguro e elimina uma fonte de confusão permanente.

### Acção 2 — Criar ADR para `apps/v2-condominios/` e os packages `@proptech/*` (prioridade: Alta)

A existência de um novo frontend V2 com packages partilhados é uma decisão arquitectural significativa que não está documentada. Este ADR deve responder a três questões:
1. Qual Supabase usa este app (`eozklslwfaqujaijvdnl` de produção, ou `hkmvszkpxjbxmnixzqbl` de V1)?
2. Os packages `@proptech/auth` e `@proptech/db` são o padrão para todos os apps futuros (V3, V4...)?
3. Quando é que este app entra em desenvolvimento activo?

Sem este ADR, qualquer agente que trabalhe em V2 vai ter de deduzir estas respostas a partir do código — com risco de contradições.

### Acção 3 — Consolidar localização de migrations (prioridade: Média)

Há três opções:

**Opção A (recomendada):** Mover o Supabase CLI link para a raiz do repo. Todas as migrations ficam em `supabase/migrations/`. As migrations actuais em `apps/v5-manutencao/supabase/migrations/` são movidas para a raiz. `apps/v5-manutencao/sql/` fica como arquivo histórico (não executado pelo CLI). Esta é a abordagem correcta para um projecto multi-vertical num único Supabase.

**Opção B:** Manter a situação actual e documentar explicitamente que o Supabase CLI corre a partir de `apps/v5-manutencao/`. Menos trabalho, mais confusão a longo prazo.

**Opção C:** Criar um `supabase/migrations/` consolidado manualmente sem mover o link. Risco de double-apply.

A Opção A requer um sprint de 1-2h de reorganização sem impacto em produção (migrations já aplicadas têm timestamps que o Supabase rastreia — não re-aplicam). Recomendada para antes de Sprint 2A.

### Acção 4 — Versionar ADRs 001 a 009 em git (prioridade: Média)

Actualmente só ADR-010 existe em git. ADRs 001-005 e ADR-condo-001 existem em Notion ou apenas referenciados em texto. Isto viola o princípio de que "Notion é fonte de verdade" porque o Notion não está integrado com git — se o Notion for perdido ou uma página for acidentalmente alterada, os ADRs desaparecem.

Recomendação: criar ficheiros `.md` para os ADRs existentes em `.claude/strategy/adrs/`, numerados sequencialmente, com estado e conteúdo essencial. O Notion mantém a versão rica (texto completo, comentários), o git mantém a versão auditável.

### Acção 5 — Resolver divergência auth em Command Center antes de Bia ir live (prioridade: Alta)

O commit `6d4478d` removeu o AuthGuard "para uso interno". Mas o ADR-010 D7 é explícito: auth é obrigatória antes de Bia interagir com alpha owners. Quando Bia começar a submeter acções à `system.approvals_queue`, sem auth a coluna `approval_decision_by` fica NULL e o audit trail de aprovações fica inutilizável.

Esta não é uma questão de preferência — é um requisito de integridade de dados. O AuthGuard deve ser reintroduzido antes de Sprint 1E Phase 2 (Bia live).

---

## Apêndice — Inventário completo de apps e estado

| App | Canónico? | Stack | Supabase | Vercel | Estado |
|---|---|---|---|---|---|
| `apps/core/` | Sim | React 19 + Vite + Chart.js | hkmvszkpxjbxmnixzqbl | Não deployado | Port do admin legado — estável |
| `apps/v1-core/` | **NÃO** (duplicado) | React 19 + Vite + Chart.js | hkmvszkpxjbxmnixzqbl | Não deployado | Duplicado obsoleto — apagar |
| `apps/v2-condominios/` | Sem ADR | React 19 + `@proptech/*` | Indefinido | Não deployado | Scaffoldo — sem funcionalidade |
| `apps/dashboard/` | Sim (ADR-010) | React 18 + Vite | hkmvszkpxjbxmnixzqbl | proptech-agentic-ops | Activo — Command Center |
| `apps/v4-energia/` | Sim | React + Vite | hkmvszkpxjbxmnixzqbl | Não deployado | Scaffoldo — standby Q3 2026 |
| `apps/v5-manutencao/` | Sim | React 18 + Vite | hkmvszkpxjbxmnixzqbl | proptech-v5-alpha | Activo — Sprint 1D em curso |

---

*Produzido em modo read-only. Nenhum ficheiro de código foi alterado.*
