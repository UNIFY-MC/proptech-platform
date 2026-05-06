---
title: Dashboard — Discovery Report
date: 2026-05-04
status: finalizado
---

# Dashboard Discovery — Command Center Readiness

Auditoria completa de `apps/dashboard` antes de extensão para Command Center style Cook.ai.

---

## Stack

```
framework:    Vite 6 + React 18.3 (SPA, type: module)
bundler:      Vite com @vitejs/plugin-react
routing:      NENHUM — single-page com tab state em useState (sem react-router)
state:        React Context (DrawerContext) + useState local por componente
              Sem Zustand, Redux, Jotai, Tanstack Query, ou qualquer store global
styling:      CSS vanilla em src/index.css + CSS variables (design tokens)
              Sem Tailwind, sem CSS modules, sem styled-components
ui-library:   NENHUMA — components escritos à mão (Card, Badge, Drawer, etc.)
icons:        lucide-react 0.395
supabase:     AUSENTE — nenhuma dependência Supabase no package.json
backend:      fetch() simples para /data.json (JSON estático em public/)
              Polling automático a cada 60s via setInterval
port:         5180 (dev)
deploy:       Vercel (vercel.json com framework: vite, outputDirectory: dist)
env vars:     NENHUMA — sem .env, sem variáveis de ambiente
```

---

## Arquitectura de dados

O dashboard **não tem backend vivo**. Toda a informação vem de um ficheiro JSON estático:

```
public/data.json  ←  gerado por scripts/dashboard-data-build.js
                       (parser v3.0, lê .md files do proptech-state/)
```

Shape do `data` object (confirmado via data.json + useData.js):

```js
{
  meta:            { schemaVersion, lastSync, generatedAt, branch, worktree, generator }
  sprint:          { id, name, wave, status, day, totalDays, gates[], daysDone[], hypothesis, ... }
  verticals:       [{ id, name, status, color, description }]
  roadmap:         [{ wave, name, status, sprints: [{ id, name, status, date, tasks[] }] }]
  watchers:        [{ id, name, status, cadence, last, next, output, outputFull, link }]
  competitors:     [{ id, name, tier, country, desc, founded, funding, threatLevel, strengths[], weaknesses[], features{} }]
  featureMatrix:   [{ key, label }]
  ourProduct:      { features{} }
  recentActivity:  [{ ts, agent, action, worktree }]
  agents:          [{ id, name, type, desc, state, last, task, tools[], promptPath, nextSuggested, worktree }]
  alerts:          [{ id, level, message, since }]
  nextActions:     [{ id, priority, description, owner, source }]
  techStack:       [{ name, role, host, status, cost, sprint }]
  stackHealth:     [{ service, label, usage }]
  decisions:       [{ id, text, meta, detail, urgency }]
  _*Meta:          { _source, _status, _error }  (por cada secção — SourceTag provenance)
}
```

---

## Routes existentes

O dashboard não usa routing URL — navegação é por tab state (`useState('Overview')`).

| "Route" (tab) | Component | Descrição |
|---|---|---|
| Overview | `Overview.jsx` | Sprint hero + verticais + próximas acções + tech stack + stack health + decisões |
| Roadmap | `Roadmap.jsx` | Waves collapsíveis com filtros status, sprints com tasks no Drawer |
| Watchers | `Watchers.jsx` | Grid de watchers (GitHub Actions) com relatório full no Drawer |
| Competitors | `Competitors.jsx` | Cards por tier (1-4) + feature matrix tabela completa |
| Actividade | `Activity.jsx` | Timeline agrupada por dia de todas as acções de agentes |
| Agentes | `Agents.jsx` | Grid de agent cards (técnicos + c-suite) com estado idle/stale/never |

---

## Components reaproveitáveis para Command Center

| Component | Path | Adequado para |
|---|---|---|
| `Card` | `shared/Card.jsx` | Qualquer card no Command Center — wrapper universal |
| `Badge` | `shared/Badge.jsx` | Status labels em Inbox, Approval queue, Agent cards |
| `Drawer` | `components/Drawer.jsx` | Detail panel para qualquer item (aprovações, inbox, agente) |
| `DrawerSection` | `components/Drawer.jsx` | Secções dentro de qualquer Drawer — reutilizar directamente |
| `DrawerContext` + `useDrawer` | `context/DrawerContext.jsx` | Já funciona globalmente — apenas adicionar ao mesmo provider |
| `SourceTag` | `shared/SourceTag.jsx` | Provenance indicator em qualquer data block |
| `SprintProgress` | `shared/SprintProgress.jsx` | Progress bar para missões/tasks em andamento |
| `AgentCard` | `Agents.jsx` (inline) | Cards de "AI employees" no painel de agentes |
| `timeAgo` / `formatDate` | `utils/time.js` | Timestamps em toda a UI nova |
| `useData` | `hooks/useData.js` | Data fetching — extensível para múltiplos endpoints |
| CSS design tokens | `src/index.css` | Toda a paleta (--primary, --success, --danger, --text-dim, etc.) |

---

## Gaps para Command Center (Cook.ai style)

### Estrutura / Navegação

- **Falta: sidebar persistente 4 secções** — actualmente é tab bar horizontal no topo; Command Center precisa de sidebar vertical esquerda (estilo Cook.ai: Home / Inbox / Approvals / Agents)
- **Falta: workspace switcher top-left** — Cook.ai tem dropdown de workspace; aqui seria equivalente a "seleccionar vertical" (V2, V4, V5, ...)
- **Falta: URL routing** — sem react-router não há deep-linking, bookmarks, back/forward; adicionar `react-router-dom` é bloqueante para qualquer Command Center real
- **Falta: layout shell separada do conteúdo** — `App.jsx` mistura layout (header, tabs) com lógica de dados; Command Center precisa de `<Layout>` wrapper com `<Sidebar>` + `<MainArea>`

### Páginas / Views novas

- **Falta: Inbox page** — lista de eventos/triggers pendentes que requerem atenção humana (equivalente ao "20 pending reports" do Cook.ai)
- **Falta: Approvals queue page** — acções de agentes que precisam aprovação antes de executar (push, deploy, INSERT produção)
- **Falta: Missions page** — tasks agendadas ou em execução por agentes (equivalente ao Mission Scheduler do Cook.ai)
- **Falta: Context / Recipes page** — gestão de CLAUDE.md e state files de forma visual
- **Falta: Agent detail page** — página própria por agente (agora é só Drawer com info básica)

### Funcionalidades

- **Falta: autenticação** — dashboard é público sem qualquer auth; Command Center real precisa de pelo menos magic-link ou sessão Supabase
- **Falta: WebSocket / Realtime** — polling de 60s não é suficiente para Command Center operacional; precisaria de Supabase Realtime ou SSE para push de eventos
- **Falta: acções interactivas** — nenhum botão executa nada; tudo é read-only; Command Center precisa de "Approve", "Reject", "Run now", "Cancel"
- **Falta: notificações / toast** — sem sistema de feedback para acções executadas
- **Falta: search global** — sem capacidade de pesquisar agentes, actividade, decisões
- **Falta: filtros avançados na Actividade** — actualmente só agrupado por dia, sem filtro por agente/worktree

---

## Decisões de stack que precisam de fechar

### 1. Routing — react-router-dom vs wouter

**Recomendação: `react-router-dom` v6.**
Razão: Command Center vai ter 6-8 rotas distintas (/, /inbox, /approvals, /agents/:id, /missions, /context). `wouter` seria suficiente em tamanho mas react-router tem melhor ecossistema para layouts aninhados e loader patterns. Bundle overhead mínimo (~15KB gzip).

### 2. State global — Context vs Zustand

**Recomendação: adicionar `zustand`.**
Actualmente `DrawerContext` é o único state global. Com Inbox + Approvals + Realtime events, gerir tudo com Context aninhados vai tornar-se difícil. Zustand tem API simples, sem boilerplate, zero providers. A migração do `DrawerContext` existente pode ser gradual.

### 3. Data fetching — fetch() polling vs Supabase Realtime

**Recomendação a curto prazo: manter fetch()/polling mas reduzir intervalo para 15-20s.**
Supabase Realtime requer auth + schema próprio para eventos — isso é trabalho de sprint inteiro. O polling funciona para o Command Center MVP. Reavaliar quando `agents` começarem a reportar eventos em tempo real.

### 4. Auth — adicionar Supabase Auth ou não?

**Recomendação: diferir para depois do MVP do Command Center.**
O dashboard está em Vercel com URL pública mas sem dados sensíveis (só estado de agentes e roadmap). Adicionar auth agora bloquearia a extensão do Command Center por 1-2 dias. Prioridade baixa enquanto não há dados de clientes ou credenciais expostas.

### 5. CSS vs Tailwind

**Recomendação: manter CSS vanilla.**
O sistema de CSS variables existente está bem estruturado e é o mesmo design system de V1-core. Migrar para Tailwind partiria a consistência visual e seria retrabalho sem ganho funcional. Novos componentes devem seguir o mesmo padrão.

---

## Estrutura de ficheiros actual

```
apps/dashboard/
├── public/
│   └── data.json              ← JSON estático gerado pelo parser
├── src/
│   ├── main.jsx               ← createRoot entry
│   ├── index.css              ← design tokens + todas as classes
│   ├── App.jsx                ← layout + tab routing (tudo num único componente)
│   ├── context/
│   │   └── DrawerContext.jsx  ← único store global (openDrawer/closeDrawer)
│   ├── hooks/
│   │   └── useData.js         ← fetch + polling /data.json
│   ├── utils/
│   │   └── time.js            ← timeAgo, formatDate, isoDateLabel
│   └── components/
│       ├── Overview.jsx       ← tab mais complexo (sprint + verticais + acções + stack)
│       ├── Roadmap.jsx        ← waves collapsíveis + filtros
│       ├── Watchers.jsx       ← grid de watchers
│       ├── Competitors.jsx    ← tier cards + feature matrix
│       ├── Activity.jsx       ← timeline agrupada por dia
│       ├── Agents.jsx         ← grid técnicos + c-suite
│       ├── Drawer.jsx         ← side panel (480px) com animação
│       └── shared/
│           ├── Badge.jsx      ← status pill com level props
│           ├── Card.jsx       ← wrapper universal (title + fullWidth)
│           ├── SourceTag.jsx  ← provenance footer por secção
│           └── SprintProgress.jsx ← progress bar de sprint
├── vite.config.js             ← plugins: [react()], port: 5180
├── vercel.json                ← framework: vite, rewrites SPA
└── package.json               ← sem router, sem state, só lucide-react
```

---

## Resumo executivo

O dashboard é uma SPA React bem estruturada mas **intencionalmente minimalista**: sem router, sem store global, sem Supabase, sem auth. Tudo read-only alimentado por um JSON estático gerado offline.

Para virar um Command Center operacional são precisas **3 adições críticas**:
1. `react-router-dom` — routing URL para páginas independentes
2. `zustand` — state global para inbox/approvals/notifications
3. Novas páginas: Inbox, Approvals, Missions (+ refactor de App.jsx em Layout shell)

Os components existentes (Card, Badge, Drawer, SourceTag, AgentCard) são sólidos e **reutilizáveis directamente** — não há razão para os reescrever.
