# ADR-017 — Dashboard Dinâmico: Evolução view→tabela, Absorção de Legados e Bridge Nirvana

> **Data:** 2026-07-02
> **Estado:** Proposto (aguarda validação do Mário antes de qualquer migration ou alteração ao bridge)
> **Owner:** Mário Carvalho
> **Branch:** `claude/v1-dashboard-replication-ohqy73` (a promover a `feat/dashboard-nirvana-bridge`)
> **Depende de:** ADR-016 (schema `dashboard` + views de transição security_invoker)
> **Impacta:** repo `v1-dashboard` (Next.js standalone), Nirvana-OS (repo `~/businesses` + `~/squads`), schema `dashboard` em V1 Core Hub (`hkmvszkpxjbxmnixzqbl`)

---

## Contexto

O ADR-016 criou o schema `dashboard` com 26 views de transição `security_invoker` sobre
`system`, `core` e `growth`/`public`. A réplica standalone (repo `v1-dashboard`, Next.js +
TS) está funcional — lê dados reais via essas views desde o arranque.

O ADR-016 previa explicitamente um ADR-017 para:

1. A estratégia de conversão gradual `view → tabela` (quando e como promover cada módulo);
2. A absorção e depreciação das tabelas legadas `public.cookai_*` / `public.system_*`;
3. A passagem de blocos estáticos (`data.json`) a tabelas vivas no schema `dashboard`;
4. O contrato de dados entre o schema e o **Nirvana-OS** (orquestrador local de agentes,
   CLI `nrv`, que vive nos repositórios `~/businesses` e `~/squads` no PC do Mário).

A decisão do Mário (2026-07-02): quer o dashboard "simples de usar e dinâmico, actualizado
recorrentemente", com o Nirvana como motor de execução e refresh — sem infraestrutura
cloud adicional (sem crons Supabase para dados de negócio do Mário, sem workers autónomos
que escrevam sem supervisão).

---

## Decisões (cinco sub-decisões interdependentes)

### D1 — Critérios e ordem de conversão view → tabela

**Princípio:** uma view converte-se em tabela quando o módulo está "graduado" — i.e., tem
escrita activa (não só leitura) ou atinge o limiar de volume/frequência que torna a view
cara de executar em cada request.

#### Critérios de graduação (qualquer um suficiente)

| Critério | Descrição |
|---|---|
| **Escrita via dashboard** | O módulo tem acções de criação/edição/eliminação no UI (não só leitura) |
| **Volume** | Tabela fonte > 10 000 linhas OU query da view demora > 200 ms no P95 |
| **Agregação pesada** | View com GROUP BY, JOINs multi-nível, ou subqueries |
| **Refresh recorrente** | Dados que o bridge Nirvana escreve periodicamente (ver D3) |
| **Depreciação de legado** | A tabela fonte é `public.cookai_*` / `public.system_*` e vai ser eliminada |

#### Ordem sugerida por módulo (da mais urgente para a mais diferível)

| Prioridade | Módulo | Motivo de urgência |
|---|---|---|
| 1 | `dashboard.sprint_state` | Dado novo, não existe em `system` — criação directa (ver D3) |
| 2 | `dashboard.employees_profile` | Escrita activa (Mário edita perfis de AI employees) |
| 3 | `dashboard.agent_runs_log` | Volume alto, crescimento diário com `nrv auto` |
| 4 | `dashboard.inbox` | Alias de `system.inbox_items` — candidato a tabela própria quando escrita divergir |
| 5 | `dashboard.approvals` | Alias de `system.approvals_queue` — idem |
| 6 | `dashboard.funil_resumo` | Agregação pesada sobre `growth.leads` — candidato a MATERIALIZED VIEW antes de tabela |
| 7 | `dashboard.clientes_activos` | JOIN multi-tabela `core` — idem |
| 8 | Restantes views de alias simples | Só quando a tabela fonte for depreciada (ver D2) |

#### Como converter (procedimento)

A conversão deve manter o mesmo nome de objecto na app — a App Next.js não sabe se está
a ler uma view ou uma tabela. O procedimento é:

```sql
-- 1. Criar tabela com estrutura idêntica à view
CREATE TABLE dashboard.<modulo>_data (
  LIKE dashboard.<modulo> INCLUDING ALL
);

-- 2. Popular com dados actuais
INSERT INTO dashboard.<modulo>_data
  SELECT * FROM dashboard.<modulo>;

-- 3. Dropar a view e recriar como alias para a tabela nova
--    (sem alterar nome nem assinatura de colunas)
DROP VIEW dashboard.<modulo>;
CREATE VIEW dashboard.<modulo>
  WITH (security_invoker = true) AS
  SELECT * FROM dashboard.<modulo>_data;

-- NOTA: esta abordagem mantém a view como interface pública,
-- mas agora lê a partir de uma tabela — a app não vê diferença.
-- Quando a app for actualizada para apontar directamente à tabela,
-- a view pode ser dropada num sprint posterior.
```

**Alternativa "cut-over directo"** (para módulos simples sem dependências externas):

```sql
-- Dropar view, criar tabela com o mesmo nome
DROP VIEW dashboard.<modulo>;
CREATE TABLE dashboard.<modulo> ( ... );
-- Requer deployment coordenado (tabela criada antes de push da app)
```

O cut-over directo só é aceitável se: (a) a app Next.js for deployada na mesma janela de
manutenção, ou (b) não houver requests simultâneos (dev/staging). Em produção com
utilizadores activos, preferir sempre o procedimento de 3 passos.

**Rollback:** em qualquer caso, a view original é recriável sobre a tabela fonte original
em < 1 minuto — o risco de conversão é baixo.

---

### D2 — Absorção das views/tabelas legadas `public.cookai_*` / `public.system_*`

O schema `public` contém ~20 tabelas e views legadas listadas no handoff (§3-A). São a
camada anterior ao redesign de schemas (pre-ADR-013/014/015). A app Vite original aponta
a algumas delas; as views de transição do ADR-016 já mapeiam a maioria para o schema
`dashboard`.

**Decisão:** absorção faseada em 3 passos, por grupo, nunca tudo de uma vez.

#### Grupos de absorção

**Grupo A — Tabelas com equivalente real em `system.*`**

`public.system_tasks`, `public.system_clients`, `public.system_projects`,
`public.system_schedules`, `public.system_triggers`, `public.system_skills_marketplace`,
`public.system_my_skill_installs`, `public.system_chat_threads`,
`public.system_flow_templates`, `public.system_client_flow_steps`,
`public.system_email_messages`, `public.system_task_comments`,
`public.system_calendar_sources`, `public.system_apify_runs`,
`public.system_agent_channels`.

Estas tabelas são **sombras ou precursores** das tabelas em `system.*`. A absorção é:

1. Confirmar que `system.<tabela>` existe e está em uso pela app Vite (via `apps/dashboard/src/hooks/`)
2. Criar view `public.<legado>` → `system.<tabela>` (para não quebrar queries residuais)
3. Quando a réplica Next.js estiver em produção e a Vite reformada, dropar as views e as
   tabelas originais em `public`

**Grupo B — Tabelas `cookai_*`**

`public.cookai_context_docs`, `public.cookai_apps`, `public.cookai_app_routes`,
`public.cookai_watcher_profiles`, `public.cookai_employee_skills`,
`public.cookai_employee_integrations`, `public.cookai_employee_*`.

Estas tabelas representam o catálogo CookAI (skills, employees, integrations). O destino
canónico é o schema `system` (conforme ADR-011 `system-cookai-catalog`). A absorção é:

1. Verificar se ADR-011 foi aplicado (tabelas em `system` já existem?)
2. Se sim: criar views `public.cookai_<X>` → `system.<X>` para compatibilidade
3. Se não: a absorção faz parte do sprint de implementação do ADR-011

**Grupo C — Views de agregação em `public`**

`public.competitor_reports_latest`, `public.integration_usage_latest`, `public.cron_jobs_status`.

Estas views de agregação não têm equivalente em `system`. Absorver para `dashboard.*`:

```sql
CREATE VIEW dashboard.competitor_reports_latest
  WITH (security_invoker = true) AS
  SELECT * FROM public.competitor_reports_latest;
-- (e eventualmente converter em tabela alimentada pelo bridge Nirvana — ver D3)
```

**Regra de ouro:** nunca dropar uma tabela `public.*` sem primeiro confirmar que nenhuma
query activa (Vite ou Next.js) a referencia. Usar `grep -r "cookai_apps\|system_tasks"
apps/dashboard/src/` antes de cada drop.

---

### D3 — Dados estáticos → tabelas vivas alimentadas pelo bridge Nirvana

O `data.json` do dashboard original contém blocos estáticos que representam estado real
da plataforma. Estes blocos passam a tabelas no schema `dashboard`, alimentadas
recorrentemente pelo bridge Nirvana.

#### Mapeamento `data.json` → tabela `dashboard.*`

| Bloco `data.json` | Tabela destino | Tipo | Refresh |
|---|---|---|---|
| `sprint` | `dashboard.sprint_state` | Tabela simples (1 linha activa) | Manual / por sprint |
| `verticals` | `dashboard.verticals_status` | Tabela (1 linha por vertical) | Manual / por sprint |
| `roadmap` | `dashboard.roadmap_items` | Tabela (N items) | Manual / por sprint |
| `agents` | `dashboard.employees_profile` | Tabela (1 linha por agente) | Semi-automático (nrv agents) |
| `employees` | `dashboard.employees_profile` (mesma tabela, campo `type`) | Tabela | Semi-automático |
| `competitors` | `dashboard.competitor_reports` | Tabela (N reports) | Automático (squad `competitor-radar`) |
| `stackHealth` | `dashboard.stack_health` | Tabela (1 linha por componente) | Automático (squad `data-quality-guardian`) |
| `techStack` | `dashboard.tech_stack_items` | Tabela (N items) | Manual / raramente muda |
| `recentActivity` | `system.inbox_items` já existente | — | Já dinâmico via agentes |

**Nota sobre `recentActivity`:** este bloco já tem equivalente dinâmico em
`system.inbox_items`. A view de transição `dashboard.inbox` (ADR-016) cobre-o. Não criar
tabela duplicada.

#### Schema das tabelas novas (definição mínima — migration a cargo do `supabase-designer`)

```sql
-- dashboard.sprint_state: estado do sprint activo
CREATE TABLE dashboard.sprint_state (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_name   text NOT NULL,           -- ex: "Sprint 7 · Dashboard Dinâmico"
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  status        text NOT NULL DEFAULT 'active', -- active | closed | planning
  goals         jsonb,                   -- lista de objectivos do sprint
  metrics       jsonb,                   -- KPIs actuais (tasks_done, etc.)
  updated_at    timestamptz DEFAULT now(),
  updated_by    text                     -- 'nirvana' ou user id
);

-- dashboard.verticals_status: estado por vertical V1-V10
CREATE TABLE dashboard.verticals_status (
  vertical_id   text PRIMARY KEY,        -- 'v1', 'v2', ... 'v10'
  name          text NOT NULL,
  stage         text NOT NULL,           -- 'producao' | 'construcao' | 'futuro'
  health        text NOT NULL DEFAULT 'ok', -- 'ok' | 'atencao' | 'critico'
  kpis          jsonb,                   -- métricas chave da vertical
  updated_at    timestamptz DEFAULT now()
);

-- dashboard.roadmap_items: items do roadmap estratégico
CREATE TABLE dashboard.roadmap_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id   text REFERENCES dashboard.verticals_status(vertical_id),
  title         text NOT NULL,
  quarter       text,                    -- ex: 'Q3-2026'
  status        text NOT NULL DEFAULT 'planned', -- planned | in_progress | done | dropped
  priority      int DEFAULT 50,          -- 0-100
  tags          text[],
  updated_at    timestamptz DEFAULT now()
);

-- dashboard.employees_profile: perfis de AI employees + staff humano
CREATE TABLE dashboard.employees_profile (
  id            text PRIMARY KEY,        -- slug: 'bia', 'zeus', 'mario'
  display_name  text NOT NULL,
  type          text NOT NULL,           -- 'ai_employee' | 'staff' | 'squad'
  role          text,
  avatar_url    text,
  status        text DEFAULT 'active',   -- active | paused | archived
  capabilities  text[],
  metadata      jsonb,
  updated_at    timestamptz DEFAULT now()
);

-- dashboard.competitor_reports: relatórios de competidores
CREATE TABLE dashboard.competitor_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor    text NOT NULL,
  vertical_id   text,
  report_date   date NOT NULL DEFAULT current_date,
  summary       text,
  details       jsonb,
  source        text,                    -- 'competitor-radar-squad' | 'manual'
  created_at    timestamptz DEFAULT now()
);

-- dashboard.stack_health: saúde dos componentes da stack
CREATE TABLE dashboard.stack_health (
  component     text PRIMARY KEY,        -- 'supabase-v1', 'vercel', 'netlify', ...
  status        text NOT NULL DEFAULT 'ok', -- ok | degraded | down
  last_check    timestamptz DEFAULT now(),
  details       jsonb,
  source        text DEFAULT 'nirvana'
);

-- dashboard.tech_stack_items: catálogo de tecnologias usadas
CREATE TABLE dashboard.tech_stack_items (
  id            text PRIMARY KEY,        -- slug: 'nextjs', 'supabase', ...
  name          text NOT NULL,
  category      text,                    -- 'frontend' | 'backend' | 'infra' | 'ai'
  version       text,
  status        text DEFAULT 'active',
  notes         text
);
```

**RLS:** todas estas tabelas devem ter RLS activado. Leitura: `anon` e `authenticated`.
Escrita: `service_role` only (o bridge Nirvana escreve via service_role — nunca via anon
key).

---

### D4 — Contrato do bridge Nirvana com o schema `dashboard`

O bridge Nirvana é o processo local (no PC do Mário) que executa tarefas via `nrv auto`,
lê e escreve no Supabase via service_role key, e faz o refresh recorrente das tabelas D3.

Este ADR define o **contrato de dados** — a implementação vive no repo `v1-dashboard`
(ficheiro `bridge/nirvana-bridge.ts` ou similar, a definir pelo implementador).

#### D4-a — Execução de tarefas: `system.tasks` como bus de pedidos

O dashboard cria tasks em `system.tasks` com campo `owner_agent_id = 'nirvana'` ou tag
`'nirvana'` no array `tags`. O bridge poll/subscreve estas tasks e executa-as via harness
`nrv`.

```sql
-- Tasks dirigidas ao bridge Nirvana:
-- owner_agent_id = 'nirvana' OU 'nirvana' IN (tags)
-- status = 'pending'
SELECT * FROM system.tasks
WHERE (owner_agent_id = 'nirvana' OR 'nirvana' = ANY(tags))
  AND status = 'pending'
ORDER BY created_at ASC;
```

O resultado de execução volta a `system.task_comments` (campo `body` com output)
e/ou `payload` (jsonb com resultado estruturado). O bridge actualiza `system.tasks.status`
para `done` ou `failed`.

```sql
-- Bridge actualiza status da task após execução:
UPDATE system.tasks
  SET status = 'done',             -- ou 'failed'
      updated_at = now()
WHERE id = $task_id;

INSERT INTO system.task_comments (task_id, body, author, metadata)
VALUES ($task_id, $output_text, 'nirvana', $structured_payload);
```

#### D4-b — Escalações: `system.approvals_queue` como gate humano

Quando o bridge Nirvana detecta uma acção que requer aprovação do Mário (ex: enviar email,
publicar conteúdo, executar migration destrutiva), não executa — cria um item em
`system.approvals_queue`.

```sql
INSERT INTO system.approvals_queue (
  title,
  description,
  requested_by,     -- 'nirvana'
  action_type,      -- 'send_email' | 'apply_migration' | 'publish_content' | ...
  payload,          -- JSON com os parâmetros da acção
  status            -- 'pending' (aguarda decisão no dashboard)
) VALUES (...);
```

O dashboard exibe estes pedidos na vista `/approvals`. Mário aprova/rejeita no UI. O bridge
subscreve `system.approvals_queue` (Supabase Realtime ou poll) e só executa após
`status = 'approved'`.

**Regra de ouro:** o bridge nunca executa acções irreversíveis sem aprovação prévia em
`system.approvals_queue`. A lista de acções que requerem aprovação é configurável no bridge
(env var ou ficheiro de config local).

#### D4-c — Refresh recorrente: squads escrevem nas tabelas D3

Os squads do Nirvana (`market-intelligence`, `competitor-radar`, `data-quality-guardian`)
correm via `nrv auto` num cron local (ex: cron do Windows Task Scheduler ou loop do
bridge). Quando terminam, escrevem nas tabelas correspondentes via upsert:

| Squad | Tabela alvo | Frequência sugerida |
|---|---|---|
| `competitor-radar` | `dashboard.competitor_reports` | Semanal |
| `market-intelligence` | `dashboard.verticals_status` (campo `kpis`) | Quinzenal |
| `data-quality-guardian` | `dashboard.stack_health` | Diária |
| Bridge manual (`nrv sprint sync`) | `dashboard.sprint_state` | Por sprint (manual) |

Os upserts são **idempotentes** por design — usar `ON CONFLICT DO UPDATE` com
`updated_at = now()`. Nunca fazer DELETE + INSERT (risco de janela vazia visível no UI).

```sql
-- Exemplo de upsert idempotente (stack_health):
INSERT INTO dashboard.stack_health (component, status, last_check, details, source)
VALUES ($component, $status, now(), $details, 'nirvana')
ON CONFLICT (component)
DO UPDATE SET
  status     = EXCLUDED.status,
  last_check = EXCLUDED.last_check,
  details    = EXCLUDED.details,
  source     = EXCLUDED.source;
```

#### D4-d — Segurança: service_role key nunca sai do processo local

```
┌─────────────────────────────────────────────────────┐
│  PC do Mário (processo bridge Nirvana local)        │
│                                                     │
│  SUPABASE_SERVICE_ROLE_KEY (env local, .env.local)  │
│  → upserts em dashboard.*, system.tasks/comments    │
│  → subscriptions Realtime (approvals_queue)         │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS / WSS
┌────────────────▼────────────────────────────────────┐
│  Supabase V1 Core Hub (hkmvszkpxjbxmnixzqbl)       │
│                                                     │
│  App Next.js (Vercel) usa ANON KEY + JWT do staff   │
│  RLS: anon pode ler; service_role pode escrever     │
└─────────────────────────────────────────────────────┘
```

A `service_role` key **nunca** entra no código da app Next.js, nunca vai para o Vercel
como env var pública (`NEXT_PUBLIC_*`), e nunca entra no repo `v1-dashboard`. Existe apenas
no processo local do bridge, em `.env.local` do bridge (fora do repo, ou em `.gitignore`
explícito).

**Alternativa futura (não implementar agora):** criar um staff JWT dedicado para o Nirvana
com permissões granulares (`iam.staff_login_lookup('nirvana-bridge')`), substituindo a
service_role key. Reduz superfície de risco se a key for comprometida. Documentar como
decisão futura sem data.

---

### D5 — Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | **Dupla escrita durante transição** (view aponta a `system.*`, bridge escreve em `dashboard.*`) — dados divergem | Médio | Médio | Só promover módulo para tabela própria quando a escrita via bridge estiver implementada e testada. Nunca ter duas fontes de verdade activas para o mesmo módulo. |
| R2 | **Idempotência quebrada em upserts** — bridge corre duas vezes em sobreposição, cria duplicados ou corrompe estado | Baixo | Alto | Todos os upserts com `ON CONFLICT DO UPDATE`. Chaves primárias naturais (ex: `component` em `stack_health`, `vertical_id` em `verticals_status`) evitam duplicados. Bridge deve ter lock local (ficheiro `.lock` ou mutex) para prevenir execuções simultâneas. |
| R3 | **Custo de execução dos squads** — `competitor-radar` pode gastar tokens em excesso se correr com demasiada frequência | Médio | Baixo | Frequência conservadora no início (semanal). Adicionar `--dry-run` flag ao bridge para simular sem escrever. Monitorizar custo no Anthropic dashboard. |
| R4 | **Loop task→task** — bridge cria task para si próprio em loop infinito | Baixo | Alto | Bridge não deve criar tasks com `owner_agent_id = 'nirvana'` no output. Validação no bridge: se task output tenta criar task Nirvana, rejeitar e escalar para `approvals_queue`. |
| R5 | **Bridge offline = dados estáticos** — se o PC do Mário estiver desligado, o dashboard não recebe refresh | Alta | Baixo | Aceitável na fase actual (solo founder, não há SLA). Datas `updated_at` visíveis no dashboard informam o Mário da frescura dos dados. Futuro: migrar squads periódicos para Supabase Edge Functions quando o custo justificar. |
| R6 | **Depreciação prematura de `public.*`** — dropar tabela legada antes de a app Next.js estar pronta quebra a Vite original | Alta (se não gerida) | Alto | Nunca dropar `public.*` sem: (a) confirmar grep sem hits na app Vite, E (b) app Next.js em produção a substituir. |
| R7 | **Exposição acidental da service_role key** — commit acidental no repo v1-dashboard | Baixo | Crítico | `.gitignore` explícito para `.env.local` no repo bridge. Pre-commit hook com detecção de secrets (ex: `git-secrets` ou `gitleaks`). Aviso no README do bridge. |

---

## Alternativas consideradas

### Alt-A — Crons Supabase Edge Functions para refresh (sem bridge local)

Criar Edge Functions agendadas (pg_cron ou Supabase Scheduled Functions) que chamam APIs
externas e escrevem nas tabelas D3.

**Rejeitado** para a fase actual. Razões: (1) os squads Nirvana têm estado e ferramentas
locais (acesso ao filesystem, ao CLI `nrv`, aos repos `~/businesses`) que não são
replicáveis numa Edge Function stateless; (2) custo mensal de execução não trivial se os
squads forem pesados; (3) complexidade de gestão de secrets em produção Supabase. Fica
como opção futura (R5) quando o volume justificar.

### Alt-B — Materializar todas as views imediatamente (MATERIALIZED VIEW com cron pg_cron)

Converter todas as 26 views de transição em `MATERIALIZED VIEW` com refresh automático
por pg_cron (ex: a cada 5 minutos).

**Rejeitado** parcialmente. Para views de agregação pesada (funil, clientes activos) é
a abordagem correcta — e está prevista na prioridade 6/7 da tabela D1. Para views de
alias simples (1:1 sem transformação), a materialização adiciona latência desnecessária
(dados ficam até 5 minutos desactualizados para uma query que já é rápida). A decisão é
granular: materializar só as views que justificam.

### Alt-C — Múltiplos schemas por tipo de dado dinâmico

Criar `dashboard_live` (dados do bridge) separado de `dashboard` (views + UI state).

**Rejeitado.** Aumenta a complexidade sem benefício claro — a app teria de lidar com dois
schemas. O namespace `dashboard` é suficientemente expressivo. O campo `source` em cada
tabela já distingue `'nirvana'` de `'manual'` ou `'system'`.

### Alt-D — Manter `data.json` como fonte estática, editar manualmente

Não criar tabelas vivas — o Mário edita `data.json` à mão quando algo muda.

**Rejeitado.** Contradiz a decisão do Mário ("simples de usar e dinâmica, actualizada
recorrentemente"). O objectivo declarado é eliminar a manutenção manual de dados estáticos.

---

## Próximos passos (fora do scope deste ADR)

1. **`supabase-designer`**: migration `20260702_dashboard_dynamic_tables.sql` com as 7
   tabelas da secção D3, RLS policies, índices e GRANTs.
2. **`supabase-designer`**: migration `20260702_public_legado_views.sql` — criar views de
   compatibilidade `public.system_* → system.*` (Grupo A, secção D2) para proteger a Vite
   durante transição.
3. **Bridge Nirvana** (implementação no repo `v1-dashboard`, fora do scope deste ADR):
   ficheiro `bridge/nirvana-bridge.ts` ou `bridge/nirvana-bridge.py` com:
   - Poll/Realtime de `system.tasks WHERE owner_agent_id = 'nirvana'`
   - Upserts idempotentes para tabelas D3
   - Integração com `system.approvals_queue` para escalações
   - Lock local anti-loop
4. **App Next.js**: adicionar queries a `dashboard.sprint_state`, `dashboard.verticals_status`,
   `dashboard.employees_profile` (substituindo leitura do `data.json`).
5. **Depreciação progressiva** de `public.*`: executar Grupo A após Passo 2 validado,
   Grupo B após ADR-011 confirmado, Grupo C integrado no Passo 4.
6. **ADR-018** (quando necessário): decisão sobre migração dos squads periódicos de bridge
   local → Edge Functions (quando o Mário tiver PC offline com frequência ou escala exigir).
