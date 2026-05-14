# CookAI 3.0 vs Property007 Platform — Comparação & Roadmap

> **Data:** 2026-05-14
> **Fonte:** [cookai-walkthrough.md](research/cookai-walkthrough.md) (transcrição 3274 linhas do Serge Gattari) + 7 screenshots /skills, /recipes, /schedule, /trigger.
> **Objectivo:** alinhar a nossa proposta de skills/recipes/agents com o framework CookAI e definir roadmap das gaps.

---

## 1. Hierarquia conceptual CookAI

Da transcrição (timestamps `[01:18:04]` em diante), Serge define a estrutura assim:

```
Skills (como fazer trabalho) — Step 1: codificar
   ↓
Recipes (sequenciar skills num workflow) — Step 2: compor
   ↓
Schedule  OU  Trigger (executar) — Step 3: automatizar
   ↓
AI Employee (executor atribuído) — Step 4: delegar
   ↓
Mission (instância runtime de uma recipe a correr) — observable
```

**Citação chave** `[01:18:09]`:
> "You first need to codify skills. How do you actually do the work? Write a VSL, qualify a lead, close a client. Once you have all the skills, you need to then create recipes. This is sequencing the skills."

**Citação chave** `[01:37:01]`:
> "These recipes come pre-built with, either for an agent or for a human, with the skills connected to them. And then all you have to do is schedule them so that assign it to an AI employee, pick how often they do the work, tell it what to do in plain English, and let it start doing the work. Or if you want it to be triggered, let's say you have a new lead coming in, you can add that trigger."

---

## 2. Matriz comparativa — Property007 vs CookAI 3.0

| Conceito | CookAI 3.0 | Property007 (actual) | Estado |
|---|---|---|---|
| **Skills** (units of work) | `sales-assets`, `writer`, etc. com prompt + tools | `system.skills` 92 rows com `receipt_md` + `connectors[]` + `fallback_agent` + `prompt_template` | ✅ OK · mais rico |
| **Skill training** | "Get AI to learn the skill" — auto-discovery | `skill_ensure` RPC + `skill-create` edge fn + Edit/Test/Promote UI | ✅ OK · workflow claro |
| **Recipes** (sequência) | Steps com type Agent/Human, input com `{{vars}}`, skills[], retry, jump | `system.recipes` 49 rows com `steps[]` JSONB simples `{name, skill_tag}` | ⚠ **Step config incompleta** |
| **Step type Agent vs Human** | Toggle no UI; 1º step sempre agent | ❌ Não há campo `type` | ❌ FALTA |
| **Step input com `{{variáveis}}`** | Textarea com `{{offer}}` `{{price}}` injectáveis | ❌ Não há campo `input` | ❌ FALTA |
| **Step retry + jump back** | `If it fails, retry up to N` + `Then jump back to` | ❌ Sem retry/branch | ❌ FALTA |
| **Multi-skill por step** | Array de skill badges (ex: `sales-assets`) | ⚠ Apenas 1 `skill_tag` | ❌ FALTA |
| **Schedule (autopilot)** | Página dedicada "Run on autopilot" · Create modal · CLOCK→BOT→DONE | ⚠ `recipes.trigger='cron'` + `cron_expr` na BD mas **sem UI** | ❌ FALTA UI |
| **Trigger (real-time)** | Página dedicada "React in real time" · EVENT→BOT→ACTION · basic/agentic modes | ⚠ `recipes.trigger='event'` + `event_pattern` mas **sem UI** | ❌ FALTA UI |
| **Connectors per recipe** | "All connected by default. Remove what you don't need" · 4 connectors mostrados | ❌ Sem campo `connectors[]` por recipe | ❌ FALTA |
| **Permissions per recipe** | Aba "Permissions" · "writes allowed without asking" | ❌ Sem flags | ❌ FALTA |
| **No recipe — use prompt** | Schedule pode rodar com prompt apenas (sem recipe) | ❌ Recipe é obrigatória | ❌ FALTA |
| **Visual flow chart** | Steps em chart com setas (screenshot 1) | ⚠ Lista numerada vertical | ⚪ Nice-to-have |
| **AI Employee assign** | "Assign to..." dropdown na Schedule + na Recipe | ⚠ `employee_id` na BD mas sem UI assign | ❌ FALTA UI |
| **Mission (runtime)** | "Schedule the mission. It goes ahead and does it" — observable em tempo real | ✅ `system.tasks` + `task_comments` + MissionDetail page | ✅ **Mais rico que CookAI** |
| **Mission Review/Approve** | "Just approve or request a revision" | ✅ Review output block + Approve/Request revision | ✅ OK |
| **Centralized Context** | "Context system allows agents to know everything" | ⚠ `system.context_docs` + FilesPage mas **não wired aos agents** | ⚠ Parcial |
| **Multi-tenant Workspaces** | "Workspace per client" | ✅ **Verticals[] + activeVertical filter** em Tasks/Inbox/Calendar/Integrations | ✅ **Melhor** (vertical-aware) |
| **Skill marketplace** | "Buy recipes from other agents" `[02:51:33]` | ❌ Sem | ⚪ Futuro |
| **Discord/Slack bridge** | "Agents live on Discord, report at 7am" | ❌ Sem | ⚪ Futuro |
| **CLI** | "We built TriCook CLI for agents to use without UI" | ❌ Sem | ⚪ Futuro |

**Score**: 13 ✅ · 5 ⚠ · 8 ❌ · 4 ⚪ futuro

---

## 3. Gaps prioritizados — Roadmap implementação

### 🔴 Sprint A — Step Configuration (estimado 2h)

**Porquê**: sem `input`, `retry`, `type=human`, as recipes não são reutilizáveis fora do contexto. Variáveis `{{vars}}` é o que permite **uma recipe servir N clientes**.

**Schema delta**:
```sql
-- Cada step na recipes.steps[] passa a ter:
{
  "name": "Framework",
  "type": "agent" | "human",         -- NOVO
  "input": "Define call framework for {{offer}} at {{price}}...",  -- NOVO
  "skills": ["sales-assets", "writer"],                            -- NOVO (multi)
  "retry_max": 2,                                                  -- NOVO
  "jump_back_to": "stop" | <step_idx>,                             -- NOVO
  "skill_tag": "sales-assets"  -- DEPRECATED (compat 1 sprint)
}
```

**UI**: CreateRecipeModal step composer ganha:
- Toggle type=agent/human (1º step trava em agent)
- Textarea input multi-linha com syntax highlight `{{vars}}`
- Skill picker multi-select (badges)
- Number input retry (0-5)
- Select jump-back ("stop" ou step name)

### 🔴 Sprint B — Schedules "Run on Autopilot" (estimado 3h)

**Porquê**: a maior parte do valor CookAI vem daqui — "set it and forget it" significa cron jobs que executam recipes diariamente sem intervenção.

**Schema**:
```sql
CREATE TABLE system.schedules (
  id              uuid PRIMARY KEY,
  name            text NOT NULL,
  recipe_id       uuid REFERENCES system.recipes(id),  -- opcional
  prompt          text,                                 -- se sem recipe, prompt directo
  bot_id          text NOT NULL,                        -- employee_id assigned
  cron_expr       text NOT NULL,                        -- "0 9 * * 1" (Mon 9am)
  connectors      text[] NOT NULL DEFAULT '{}',
  permissions     jsonb DEFAULT '{"writes_allowed": true}'::jsonb,
  vertical        text,
  active          boolean DEFAULT true,
  last_run_at     timestamptz,
  next_run_at     timestamptz,
  run_count       integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
```

**UI** nova `/schedules`:
- Empty state "Run on autopilot" (replica screenshot 2)
- CLOCK → BOT → DONE visual
- "+ Create your first schedule"
- Modal (replica screenshot 3): Name + Recipe (opt dropdown) ou Prompt + Assign to + Schedule cron picker + Connectors aba + Permissions aba

**Execução**:
- pg_cron job a cada 5min faz `SELECT id FROM system.schedules WHERE next_run_at <= now() AND active=true`
- Para cada schedule, chama edge fn `schedule-run` que cria `system.tasks` ligada à recipe + assigna ao bot

### 🟡 Sprint C — Triggers "React in Real Time" (estimado 3h)

**Porquê**: complementa schedules — alguns workflows são event-driven (novo lead, fatura recebida, evento Apify).

**Schema**:
```sql
CREATE TABLE system.triggers (
  id              uuid PRIMARY KEY,
  name            text NOT NULL,
  bot_id          text NOT NULL,
  event_kind      text NOT NULL,        -- inbox_item|apify_run_done|task_status|webhook
  event_filter    jsonb DEFAULT '{}',   -- ex: {"vertical":"v2","kind":"lead"}
  recipe_id       uuid REFERENCES system.recipes(id),
  prompt          text,                  -- se sem recipe
  mode            text DEFAULT 'agentic' CHECK (mode IN ('basic','agentic')),
  vertical        text,
  active          boolean DEFAULT true,
  last_fired_at   timestamptz,
  fire_count      integer DEFAULT 0
);
```

**UI** nova `/triggers`:
- Empty state "React in real time" (replica screenshot 5)
- EVENT → BOT → ACTION visual
- Add Trigger modal: Bot + Event type dropdown + Filter JSON + Recipe/Prompt

**Execução**:
- pg_listen na tabela `inbox_items` + outras event sources
- Edge fn `trigger-fire` recebe payload e dispatch para schedule-run

### 🟢 Sprint D — Connectors + Permissions per Recipe (estimado 1h)

**Schema**:
```sql
ALTER TABLE system.recipes
  ADD COLUMN connectors  text[] DEFAULT '{}',
  ADD COLUMN permissions jsonb  DEFAULT '{"writes_allowed": true, "requires_approval": false}';
```

**UI**: RecipeDetailModal + CreateModal ganham 2 abas extra:
- **Connectors**: lista das integrations active filtrável (remover = recipe não usa)
- **Permissions**: toggle writes/approval

### 🟢 Sprint E — Visual Flow Chart (opcional, 2h)

**UI**: substituir lista vertical por chart com:
- Nós (cards) ligados por linhas SVG
- Drag-drop reorder
- Click no nó abre "View step" sidebar (replica screenshot 1)

Library sugerida: `reactflow` ou custom SVG (~200 linhas).

---

## 4. O que já temos MELHOR que CookAI

**1. Multi-tenant nativo via verticals**
CookAI usa "workspaces" mas exige troca manual. A nossa solução tem `activeVertical` no dropdown topo que filtra **transversalmente** (Inbox, Tasks, Calendar, Integrations, Useful Tools) — mais elegante para founder que opera 10 verticais.

**2. Skill fallback_agent + multi-vertical receipts**
CookAI tem skills atómicas. Nós temos skills com:
- `fallback_agent` (delegação se connector falta)
- `verticals[]` (skill pode estar disponível só em V4)
- `usage_count` + `last_used_at` (telemetry built-in)

**3. Mission detail page (CookAI mostra-o mas menos rico)**
Temos Review output + Comment stream + Realtime updates + Status timeline + Skills used + Context files read. CookAI mostra só comments lineares.

**4. Task→Recipe traceability** (parcial)
`task.skills_used` em payload.execution permite saber **que skills** correram. Falta `task.recipe_id` para fechar o loop.

---

## 5. Book / Handbook — Estrutura proposta

> **Formato**: site Docusaurus ou MDX em `apps/dashboard/src/views/help/` · também exportável para PDF.

### Capítulos

**Parte I — Getting Started (5 min)**
1. O que é o Property007 — multi-vertical AI ops para PropTech PT
2. Primeiro login: tour 60s pela dashboard
3. Glossário rápido: Skill · Recipe · Schedule · Trigger · Mission · Employee

**Parte II — Conceitos Fundamentais**
4. **Skills** — como uma skill encapsula know-how
   - Anatomia (receipt + connectors + fallback)
   - Workflow training: Discover → Test → Refine → Promote
   - Quando criar nova vs reutilizar existente
5. **Recipes** — sequenciar skills em workflows
   - Step types: Agent vs Human
   - Variáveis `{{slot}}` para reutilização
   - Retry + branching
6. **Automatizar — Schedule vs Trigger**
   - Schedule (autopilot): trabalho recorrente "todas as segundas às 9h"
   - Trigger (real-time): reagir a eventos "novo lead → email follow-up"
   - Quando usar cada um
7. **Missions** — observar execução em tempo real
   - Review output / Approve / Request revision
   - Comment stream
   - Steps with PROMPT/OUTPUT inline

**Parte III — Multi-tenant (verticais)**
8. Como funciona o dropdown vertical no topo direito
9. Cliente Prata Owners (V2) — caso prático
10. Adicionar nova vertical (V11+)

**Parte IV — Workflows por vertical**
11. V2 Condomínios — onboarding · mora · assembleias · documentos
12. V3 Seguros — renovação · sinistros · cotações
13. V4 Energia — OCR fatura · switching · monitorização
14. V5 Manutenção — triagem · prestadores · OT
15. V7 Real Estate · V8 Rentals (futuras)

**Parte V — Integrações**
16. Connect your tools — OAuth flow por integração
17. Useful Tools — descobrir + adicionar tools
18. MCP servers — quando usar

**Parte VI — Operações diárias**
19. **Dia típico** do Mário com Property007 (rotina passo-a-passo)
20. Inbox Daily Roundup às 08:00
21. Approvals queue
22. Criar tasks a partir de inbox items

**Parte VII — Equipa AI**
23. AI Employees — cada employee é um agent com skills
24. Departments — Marketing · Sales · Operations · Finance · …
25. Org Chart — hierarquia visual
26. Onboard new employee

**Parte VIII — Avançado**
27. Edge functions — task-execute · skill-create · schedule-run · trigger-fire
28. Schema Supabase — system / core / iam / verticals
29. Adicionar nova skill custom (developer guide)
30. CLI (futuro)

**Parte IX — Troubleshooting + FAQ**
31. Skill não funciona — debug Test panel
32. Schedule não disparou — pg_cron logs
33. Comum: needs_human stuck

**Apêndices**
- A. Glossário completo PT-PT / EN
- B. Atalhos teclado
- C. ADRs (decisões arquitecturais importantes)
- D. Mudanças por release

### Onde viver

3 opções (ordenadas por preferência):

| Opção | Pros | Contras |
|---|---|---|
| **MDX inline em `/help`** | Live com a app, links directos para /recipes etc. funcionam | Build aumenta size |
| **Docusaurus standalone (docs.prataowners.pt)** | Search built-in, versionável | Deploy separado |
| **Notion público** | Edição rápida, sem build | Não tem ligação directa às UIs |

**Recomendação**: começa com **opção A (MDX em /help)** porque os links profundos (`[/skills](http://localhost:5180/skills)`) tornam-no interactivo — clica-se da doc directamente para a UI.

---

## 6. Próximos passos recomendados (ordem)

1. **Validar este feedback** comigo — confirmar prioridade Sprint A→E
2. **Implementar Sprint A** (Step config — agent/human + input + retry) — base para tudo o resto
3. **Implementar Sprint B** (Schedules UI + execução pg_cron)
4. **Implementar Sprint C** (Triggers UI + execução pg_listen)
5. **Implementar Sprint D** (Connectors + Permissions per recipe)
6. **Começar Book** (Parte I-II) em paralelo aos sprints — usar próprias features como exemplos
7. **Sprint E (flow chart)** opcional se houver tempo

**ETA total Sprints A-D**: ~9h de implementação. Book Parte I-II: ~3h. Total: ~12h para alinhamento completo com CookAI 3.0.
