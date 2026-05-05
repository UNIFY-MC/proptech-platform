# ADR-005 — Dashboard Agentic-Ops React

Date: 2026-05-03
Status: Accepted
Deciders: Mario Carvalho + architect-proptech

---

## Decisao

O dashboard agentic-ops e construido como app React 18 + Vite em `apps/dashboard/`, com design tokens extraidos do HTML aprovado em `docs/dashboard/index.html`. Dados servidos via `apps/dashboard/public/data.json` gerado por script Node que parsa os state files com markdown estruturado (regex key: value). Deploy no projecto Vercel `proptech-agentic-ops.vercel.app` com root `apps/dashboard`.

---

## Contexto

O dashboard existe hoje como HTML estatico em `docs/dashboard/index.html`, ligado directamente a GitHub API (issues, commits, actions). O Mario aprovou o design visual (dark theme `--bg: #0a0e1a`, purple primary `#534AB7`, cards border-radius 12px, grid auto-fit 300px+).

O problema: dados de GitHub API nao reflectem o estado real da plataforma. O estado real vive em `.claude/state/` (ficheiros Markdown) e em `.claude/current/`. Para gerir 6 verticais + prestador-app + GTM sem perder contexto, o Mario precisa de uma "central de comando vivo" — re-prioritizado de P3 para P1 em 2026-05-02.

Requisitos:
1. Mostrar estado real dos agentes, sprints, alertas, actividade
2. Actualizar automaticamente (hook SubagentStop gera data.json e commita)
3. Mobile-friendly (Mário usa frequentemente no telefone)
4. Sem backend dedicado — frontend puro que le data.json estatico

---

## Alternativas consideradas

### 1. `packages/dashboard/` vs `apps/dashboard/` (REJEITADA)

`packages/` e reservado para packages partilhados entre verticais (ex: `@proptech/auth`, `@proptech/db`). O dashboard nao e um package reutilizavel — e uma app deployada com UI propria. Usar `packages/` criaria confusao semantica no monorepo e exigiria configuracao adicional (sem Vite por default, sem `npm run dev` standalone).

`apps/dashboard/` mantem consistencia com `apps/v5-manutencao/`, `apps/v4-energia/`, etc. O Vercel ja sabe deployar apps deste directorio (ver decisao 2026-05-02 Vercel setup).

**Decisao: `apps/dashboard/`.**

### 2. Frontmatter YAML vs markdown estruturado (REJEITADA para YAML)

Opcao A — migrar todos os state files para frontmatter YAML:
```
---
name: architect-proptech
lastRun: 2026-05-03T11:30Z
status: idle
---
body livre...
```
Pros: parseamento trivial com bibliotecas YAML.
Contras: implica migrar TODOS os ficheiros existentes (12+ state files, formato estavel e util), introduz fricao nos hooks (escrita de YAML e mais verbosa), e rompe com o padrao estabelecido do protocolo inter-agentes.

Opcao B (ADOPTADA) — manter markdown estruturado, parser regex:
- Os ficheiros JA usam `key: value` no cabecalho (ex: `Last run: 2026-05-03T11:30Z`)
- Parser extrai linhas `^(\w[\w\s]+):\s*(.+)$` do inicio do ficheiro, depois body livre
- Tabelas Markdown extraidas com regex de linha `| col | col |`
- Entradas de log extraidas com regex `^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)\]\s+(.+)$`

**Decisao: markdown estruturado + parser regex.**

### 3. TypeScript vs JavaScript para o dashboard

O dashboard e uma app de visualizacao simples (fetch + render). Sem logica de negocio complexa, sem reutilizacao de tipos entre verticais. TypeScript adicionaria overhead de configuracao (tsconfig, tipos para data.json) sem beneficio proporcional nesta fase.

V5 usa JavaScript puro com sucesso. Consistencia de stack e mais importante que purismo de tipos para uma app interna de 5 componentes.

**Decisao: JavaScript (ES modules, como V5).**

### 4. SPA com tabs vs paginas separadas

Paginas separadas (5 HTML) significaria 5 deploys, 5 fetch de data.json, sem estado partilhado entre tabs. SPA com tabs e o padrao natural para um dashboard — tab switch e instantaneo, data.json so e fetched uma vez.

**Decisao: SPA com 5 tabs.**

---

## Consequencias

### Positivas
- Consistencia total com stack existente (React 18 + Vite + JS)
- Monorepo workspace resolve dependencias automaticamente
- Vercel deploy identico a V5 (apenas muda root directory)
- Hook SubagentStop pode escrever data.json e fazer `git add + commit + push` sem interaccao humana
- Design tokens do HTML aprovado sao portaveis 1:1 para CSS variables em React

### Negativas / Riscos
- Parser regex dos state files e fragil — se o formato dos ficheiros mudar, o parser quebra silenciosamente (mitigacao: testes de snapshot do data.json)
- data.json e estatico — dashboard pode estar desactualizado se hook nao correu (mitigacao: mostrar `lastSync` prominentemente no header)
- Sem hot-reload de data.json em DEV (Vite serve de `public/`, ficheiro nao muda durante sessao de DEV) — developer tem que recarregar manualmente

### Impacto em futuras features
- Adicionar nova tab = novo componente React + nova key em data.json + novo parser no script Node
- Watchers (GitHub Actions) podem escrever directamente para `apps/dashboard/public/data.json` via commit no CI, tornando o dashboard actualizado mesmo sem sessao Claude activa
- Schema de data.json e versionado (campo `meta.schemaVersion`) para permitir migracao sem quebrar

---

## data.json schema v1.0 (historico — superseded por v2.0 abaixo)

Schema v1.0 foi implementado pelo vertical-builder em [commit:a33d844]. Cobria: meta, sprint, verticals, alerts, actions, watchers, agents, activity, decisions, techStack, stackHealth, roadmap, competitors.

---

## data.json schema v2.0 (canonico — implementar)

Schema v2.0 expande todos os campos com tipos exactos, suporta Drawer (detail text), e adiciona campos novos: `nextActions` (substitui `actions`), `recentActivity` (renomeia `activity`), `ourProduct`, `featureMatrix`.

### meta

```json
{
  "meta": {
    "schemaVersion": "2.0",
    "branch": "sprint/v5-1b3",
    "worktree": "proptech-v5-1b3",
    "lastSync": "2026-05-03T15:00Z",
    "generatedAt": "2026-05-03T15:00Z",
    "generator": "scripts/dashboard-data-build.js"
  }
}
```

### sprint

```json
{
  "sprint": {
    "id": "1D",
    "name": "Receipt Trojan Horse Alpha",
    "vertical": "V5 Manutencao",
    "day": 2,
    "totalDays": 14,
    "startDate": "2026-05-01",
    "endDate": "2026-05-15",
    "status": "active",
    "hypothesis": "Se proporcionarmos a um owner PT proprietario 40-65 anos com 1-3 imoveis um link partilhavel que dispara recibo digital + ficha minima do prestador para ele entregar ao seu canalizador/electricista/jardineiro habitual apos um servico pago fora-app, entao pelo menos 1 em 5 owners convidados completa o fluxo end-to-end.",
    "progress": 50,
    "daysToGate": 5,
    "gateName": "Day 7 — 1 owner externo",
    "gates": [
      { "id": "day7", "label": "Day 7 — 1 owner externo aceitou convite", "status": "pending", "date": "2026-05-07" },
      { "id": "day14", "label": "Day 14 — 5/5 owners testaram flow", "status": "pending", "date": "2026-05-15" }
    ]
  }
}
```

Tipos dos campos:
- `id`: string — wave ID (ex: "1D", "1E", "2A")
- `name`: string — nome descritivo do sprint
- `vertical`: string — vertical principal em foco
- `day`: number — dia actual do sprint (1-based)
- `totalDays`: number — duração total do sprint
- `startDate` / `endDate`: string ISO date "YYYY-MM-DD"
- `status`: "active" | "shipped" | "blocked" | "planned"
- `hypothesis`: string — hipotese completa do sprint
- `progress`: number 0-100 — percentagem de conclusao
- `daysToGate`: number — dias até ao proximo gate
- `gateName`: string — label curto do proximo gate
- `gates[]`: array de { id: string, label: string, status: "pending"|"pass"|"fail"|"skipped", date: string }

### alerts

```json
{
  "alerts": [
    {
      "id": "alert-r2-alpha",
      "level": "critical",
      "label": "R2 alpha owners",
      "value": "1/5",
      "detail": "Outreach R2 activo: 5 alpha owners identificados, 0 confirmados. Gate Day 7 em risco se nao houver accao hoje."
    }
  ]
}
```

Tipos:
- `id`: string
- `level`: "critical" | "high" | "warning" | "info"
- `label`: string — texto curto (max ~20 chars) para badge
- `value`: string — valor destacado (ex: "1/5", "87%", "P0")
- `detail`: string — texto completo para Drawer

### verticals

```json
{
  "verticals": [
    {
      "id": "v5",
      "name": "Manutencao",
      "status": "active",
      "color": "amber",
      "meta": "Sprint 1D activo",
      "description": "App owner + prestador — receipt trojan horse",
      "longDetail": "V5 Manutencao e a vertical core do sprint actual. Backend 100% pronto (schema SQL + 2 Edge Functions + RPC publica). Frontend owner-side completo (feed lifecycle realtime). Em fase de outreach alpha (5 owners-alvo). Gate Day 7: 1 owner externo completa flow."
    }
  ]
}
```

Tipos:
- `id`: string — "v1" a "v10"
- `name`: string
- `status`: "active" | "production" | "foundation" | "planned" | "standby"
- `color`: string — token de cor para badge: "amber" | "emerald" | "stone" | "violet" | "blue" | "purple" | "slate"
- `meta`: string — texto resumo 1 linha para card
- `description`: string — descricao curta
- `longDetail`: string — texto completo para Drawer

Dados canonicos das 10 verticais:

| id  | name         | status      | color   | meta                              |
|-----|--------------|-------------|---------|-----------------------------------|
| v1  | Core Hub     | foundation  | violet  | Hub horizontal partilhado         |
| v2  | Condominios  | production  | emerald | prataowners.pt — producao viva    |
| v3  | Seguros      | planned     | slate   | Q1 2027                           |
| v4  | Energia      | foundation  | amber   | Schema pronto, produto a construir|
| v5  | Manutencao   | active      | blue    | Sprint 1D activo                  |
| v6  | Reabilitacao | planned     | slate   | Q1 2027                           |
| v7  | Real Estate  | planned     | slate   | 2027+                             |
| v8  | Rentals      | planned     | slate   | 2027+                             |
| v9  | BaaS / Swan  | planned     | slate   | Q1 2027                           |
| v10 | Owners Club  | foundation  | purple  | Tab V5 Sprint 1E                  |

### nextActions

```json
{
  "nextActions": [
    {
      "id": "na-001",
      "prio": "P0",
      "text": "Rotacionar SUPABASE_SERVICE_ROLE_KEY V1",
      "who": "Mario",
      "when": "pre-R2-outreach",
      "effort": "2h",
      "detail": "Service role key V1 (hkmvszkpxjbxmnixzqbl) foi exposta em chat 2026-05-02. Acção: ir ao Supabase dashboard > Settings > API > Reveal + Rotate. Actualizar variavel de ambiente no Vercel V5 + dashboard. Fazer antes do outreach R2 com owners externos."
    }
  ]
}
```

Tipos:
- `id`: string
- `prio`: "P0" | "P1" | "P2" | "P3"
- `text`: string — label curto (max ~60 chars)
- `who`: string — owner (nome ou agente)
- `when`: string — data ISO ou label (ex: "pre-R2-outreach", "2026-05-07")
- `effort`: string — estimativa (ex: "2h", "1d", "3d")
- `detail`: string — texto completo para Drawer

### techStack

```json
{
  "techStack": [
    {
      "name": "Anthropic",
      "role": "LLM core",
      "host": "Anthropic",
      "status": "ok",
      "cost": "~$15/mes",
      "sprint": "1D"
    }
  ]
}
```

Tipos:
- `name`: string
- `role`: string — funcao na plataforma
- `host`: string — fornecedor/plataforma
- `status`: "ok" | "warn" | "planned" | "deferred"
- `cost`: string — custo estimado (texto livre)
- `sprint`: string — quando entra no roadmap se planned/deferred; "-" se ja activo

**Dados canonicos dos 13 servicos (hardcoded no data.json — nao derivado de ficheiros):**

| name           | role                | host       | status   | cost          | sprint |
|----------------|---------------------|------------|----------|---------------|--------|
| Anthropic      | LLM core            | Anthropic  | ok       | ~$15/mes      | 1D     |
| Supabase V1    | Database V5         | Supabase   | ok       | free tier     | 1A     |
| Supabase V2    | Database V2 prod    | Supabase   | ok       | pro ~€25/mes  | —      |
| Netlify        | Legacy deploy       | Netlify    | ok       | free tier     | —      |
| Vercel         | V5 + dashboard      | Vercel     | ok       | free tier     | 1D     |
| GitHub         | Repo + CI/CD        | GitHub     | ok       | free tier     | —      |
| Stripe         | Pagamentos          | Stripe     | planned  | 0.25%+29c     | 1E     |
| Moloni         | Faturacao PT        | Moloni     | planned  | €15/mes       | 1E     |
| Sentry         | Error tracking      | Sentry     | deferred | free tier     | 2A     |
| PostHog        | Analytics           | PostHog    | deferred | free tier     | 2A     |
| Resend         | Email transac       | Resend     | ok       | free tier     | 1B     |
| Upstash        | Redis/queue         | Upstash    | deferred | free tier     | 1E     |
| Twilio         | SMS                 | Twilio     | deferred | ~$0.10/SMS    | 1E     |

### stackHealth

```json
{
  "stackHealth": [
    {
      "service": "Supabase V1",
      "usage": 25,
      "label": "2/8 GB",
      "status": "ok"
    }
  ]
}
```

Tipos:
- `service`: string
- `usage`: number 0-100 — percentagem de utilizacao
- `label`: string — leitura humana (ex: "2/8 GB", "261/300 min")
- `status`: "ok" | "warn" | "critical"

**Dados canonicos dos 4 gauges (hardcoded — placeholder ate stack-health.md ter dados reais):**

| service        | usage | label          | status   |
|----------------|-------|----------------|----------|
| Supabase V1    | 25    | 2/8 GB         | ok       |
| Supabase V2    | 59    | 4.7/8 GB       | warn     |
| Netlify build  | 87    | 261/300 min    | critical |
| GitHub Actions | 18    | 720/4k min     | ok       |

### watchers

```json
{
  "watchers": [
    {
      "id": "competitor-monitor",
      "name": "Competitor Monitor",
      "cadence": "Seg 9h",
      "last": "",
      "next": "2026-05-04T09:00Z",
      "status": "never",
      "output": "Aguarda primeira execucao completa",
      "outputFull": "Aguarda primeira execucao completa. Watcher configurado em Sprint B Lite (2026-05-01). Monitoriza: Hubbent, FIXO, Fixando, Jobber, AppFolio, Shipshape, OSCAR. Cadencia: todas as segundas-feiras 9h UTC.",
      "link": ""
    }
  ]
}
```

Tipos:
- `id`: string
- `name`: string
- `cadence`: string — descricao humana (ex: "Seg 9h", "diario 8h", "Sex 17h")
- `last`: string — ISO timestamp da ultima execucao (ou "" se nunca correu)
- `next`: string — ISO timestamp da proxima execucao programada
- `status`: "ok" | "warn" | "stale" | "never"
- `output`: string — preview 1 linha do ultimo output
- `outputFull`: string — texto completo do ultimo relatorio do watcher
- `link`: string — URL do GitHub Issue com output completo (ou "" se nao existe)

### agents

```json
{
  "agents": [
    {
      "id": "architect-proptech",
      "name": "architect-proptech",
      "type": "technical",
      "state": "idle",
      "task": "ADR-005 schema v2.0 — extensao campos dashboard",
      "last": "2026-05-03T15:00Z",
      "desc": "Decisoes arquitecturais, ADRs, consulta Notion, impacto cross-vertical",
      "tools": ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "mcp__notion"],
      "promptPath": ".claude/agents/architect-proptech.md"
    }
  ]
}
```

Tipos:
- `id`: string
- `name`: string
- `type`: "technical" | "csuite"
- `state`: "idle" | "stale" | "never"
- `task`: string — ultima task executada (1 linha)
- `last`: string — ISO timestamp da ultima execucao
- `desc`: string — funcao do agente (1-2 frases)
- `tools`: string[] — ferramentas que usa
- `promptPath`: string — path para o system prompt (ou ficheiro de config)

**12 agentes canonicos:**

Tecnicos (6):
- architect-proptech
- supabase-designer
- vertical-builder
- auditor-agent
- notion-librarian
- ops-builder

C-Suite (6):
- ceo-agent
- cfo-agent
- cmo-agent
- coo-agent
- cpo-agent
- cto-agent

### recentActivity

```json
{
  "recentActivity": [
    {
      "ts": "2026-05-03T14:29Z",
      "day": "2026-05-03",
      "actor": "subagent",
      "action": "subagent stopped",
      "where": "proptech-v5-1b3"
    }
  ]
}
```

Tipos:
- `ts`: string — ISO timestamp completo
- `day`: string — "YYYY-MM-DD" para agrupamento por dia
- `actor`: string — nome do agente
- `action`: string — descricao da accao (1 linha)
- `where`: string — worktree

### decisions

```json
{
  "decisions": [
    {
      "id": "D-2026-05-03-schema-v2",
      "text": "data.json schema v2.0 — extensao completa com Drawer, techStack hardcoded, competitors mapeados",
      "urgency": "medium",
      "meta": "2026-05-03 · Dashboard",
      "detail": "ADR-005 actualizado para v2.0. Campos novos: nextActions (substitui actions), recentActivity (renomeia activity), ourProduct + featureMatrix (comparador competitors), stackHealth como array de gauges, techStack 13 servicos hardcoded."
    }
  ]
}
```

Tipos:
- `id`: string
- `text`: string — decisao em 1 linha
- `urgency`: "critical" | "high" | "medium" | "low"
- `meta`: string — "YYYY-MM-DD · Vertical" para label secundario
- `detail`: string — texto completo para Drawer

### roadmap

```json
{
  "roadmap": [
    {
      "wave": "1A",
      "name": "Foundation",
      "status": "done",
      "sprints": [
        {
          "id": "1A",
          "name": "Foundation",
          "status": "done",
          "date": "Pre-2026",
          "tasks": [
            "Reset estrutural · monorepo · multi-tenant base",
            "Auth Supabase · onboarding wizard · RLS 62 tabelas",
            "SQL foundations aplicados · pricing alinhado"
          ]
        }
      ]
    }
  ]
}
```

Tipos:
- `wave`: string — "1A", "1B", "1D", "1E", "2A", "2B"
- `name`: string
- `status`: "done" | "active" | "planned" | "blocked"
- `sprints[]`: array de { id, name, status, date, tasks: string[] }

**6 waves canonicas:**

| wave | name                  | status  |
|------|-----------------------|---------|
| 1A   | Foundation            | done    |
| 1B   | V5 Agentic Found.     | active  |
| 1D   | V5 Receipt TH Alpha   | active  |
| 1E   | V5 Production Grade   | planned |
| 2A   | V4 Energia reactiv.   | planned |
| 2B   | V3 Seguros + V6+      | planned |

### competitors

```json
{
  "competitors": [
    {
      "id": "hubbent",
      "name": "Hubbent",
      "tier": 1,
      "signal": "medium",
      "country": "PT",
      "founded": "2022",
      "funding": "desconhecido",
      "lastUpdate": "2026-05-01",
      "desc": "Marketplace dual-app on-demand home services PT. App consumer (Hubbent) + app prestador (Hubbent Pro). Entrante recente, expansao rapida.",
      "strengths": ["Dual-app nativa PT", "On-demand sem contrato", "Prestador com app propria"],
      "weaknesses": ["Sem gestao de contratos recorrentes", "Sem integracoes fiscais PT", "Sem componente B2B condominio"],
      "threatLevel": "alto",
      "features": {
        "magicLink": false,
        "fiscalPT": false,
        "stripe": true,
        "mobile": true,
        "multiVertical": false,
        "aiAdvisor": false,
        "b2b": false
      }
    }
  ]
}
```

Tipos:
- `id`: string — slug lowercase
- `name`: string
- `tier`: 1 | 2 | 3 | 4
- `signal`: "medium" | "weak" | "silent" | "reference"
- `country`: string — ISO 2-letter
- `founded`: string — ano ou "desconhecido"
- `funding`: string — descricao (ex: "Fidelidade-backed", "Series A $12M", "bootstrapped")
- `lastUpdate`: string — YYYY-MM-DD da ultima actualizacao dos dados
- `desc`: string — descricao completa (2-3 frases)
- `strengths`: string[] — pontos fortes (3-5 items)
- `weaknesses`: string[] — pontos fracos (3-5 items)
- `threatLevel`: "critico" | "alto" | "medio" | "baixo"
- `features`: objecto com keys booleanas ou "partial"

### ourProduct e featureMatrix

```json
{
  "ourProduct": {
    "name": "V5 Manutencao",
    "features": {
      "magicLink": true,
      "fiscalPT": true,
      "stripe": "partial",
      "mobile": true,
      "multiVertical": true,
      "aiAdvisor": true,
      "b2b": "partial"
    }
  },
  "featureMatrix": [
    { "key": "magicLink",     "label": "Magic-link" },
    { "key": "fiscalPT",      "label": "Fiscal PT" },
    { "key": "stripe",        "label": "Pagamentos" },
    { "key": "mobile",        "label": "Mobile" },
    { "key": "multiVertical", "label": "Multi-vertical" },
    { "key": "aiAdvisor",     "label": "AI Advisor" },
    { "key": "b2b",           "label": "B2B" }
  ]
}
```

Tipos:
- `ourProduct.name`: string
- `ourProduct.features`: objecto com mesmo shape de `competitors[].features` — valores boolean | "partial"
- `featureMatrix[]`: array de { key: string, label: string } — define ordem das colunas na tabela

---

## Sources canonicas por campo (v2.0)

| Campo data.json       | Ficheiro fonte / origem                                              |
|-----------------------|----------------------------------------------------------------------|
| `meta.branch`         | `git rev-parse --abbrev-ref HEAD`                                    |
| `meta.worktree`       | dirname do worktree                                                  |
| `sprint.*`            | `.claude/current/current-sprint-state.md`                            |
| `verticals[]`         | `.claude/strategy/verticals-state.md`                                |
| `alerts[]`            | `proptech-state/triggers.md` secção `## Activos` (P0/criticos)       |
| `nextActions[]`       | `proptech-state/opportunities.md` (P0/P1 abertos)                   |
| `techStack[]`         | **Hardcoded** — tabela canonica neste ADR (13 servicos fixos)        |
| `stackHealth[]`       | `proptech-state/stack-health.md` (ou hardcoded se vazio)             |
| `watchers[]`          | `.claude/strategy/watchers-state.md` + GitHub Issues label:watcher   |
| `agents[]`            | `proptech-state/agents/*.md` (todos os ficheiros)                    |
| `recentActivity[]`    | `proptech-state/recent-activity.md` (ultimas 20 entradas)            |
| `decisions[]`         | `.claude/current/decisions-log.md` (ultimas 10)                      |
| `roadmap[]`           | `.claude/current/current-sprint-state.md` tabela Roadmap geral       |
| `competitors[]`       | `.claude/strategy/competitors.md` (ficheiro canonico, novo)          |
| `ourProduct`          | **Hardcoded** — features V5 Manutencao definidas neste ADR           |
| `featureMatrix[]`     | **Hardcoded** — lista de features a comparar, definidas neste ADR    |

---

## Estrutura de tabs (v2.0)

| Tab        | Conteudo                                                               | Dados de                                              |
|------------|------------------------------------------------------------------------|-------------------------------------------------------|
| Overview   | Hero sprint + progress bar + daysToGate + status tag, Alerts, Verticals grid, Next Actions (P0/P1), Tech Stack, Stack Health gauges | sprint, alerts, verticals, nextActions, techStack, stackHealth |
| Activity   | Timeline cronologica agrupada por dia                                  | recentActivity                                        |
| Agents     | Card por agente (nome, type badge, state, task, last, desc, tools)     | agents                                                |
| Roadmap    | Waves timeline + sprints detail + filtros status + gates activos       | roadmap, sprint                                       |
| Watchers   | Card por watcher (cadence, last, next, status, output preview + Drawer outputFull, link) | watchers |
| Decisions  | Lista urgencia + Drawer detail                                         | decisions                                             |
| Competitors| Tabela feature matrix + Drawer strengths/weaknesses + tier badges      | competitors, ourProduct, featureMatrix                |

Nota: tabs adicionadas face a v1.0 — Decisions e Competitors extraidas de Overview para tabs proprias.

---

## Novos componentes a criar (v2.0)

O vertical-builder deve implementar, alem dos ja existentes:

```
apps/dashboard/src/components/
  Drawer.jsx          -- painel lateral slide-in para detail text (usado em todos os tabs)
  TechStack.jsx       -- tabela 13 servicos com status badges + sprint column
  Decisions.jsx       -- lista com urgency badges + Drawer
  Competitors.jsx     -- tabela feature matrix (checkmarks) + Drawer strengths/weaknesses
  Roadmap.jsx         -- timeline waves com filtros + sprints detail
  shared/
    ThemeToggle.jsx   -- dark/light mode toggle
```

Hero.jsx existente deve ser extendido com:
- Badge `status` do sprint (active/shipped/blocked/planned)
- Contador `daysToGate` + nome do gate
- Progress bar percentagem

Watchers.jsx existente deve ser extendido com:
- Campo `outputFull` para Drawer
- Link para GitHub Issue
- Status "never" (nunca correu)

Agents.jsx existente deve ser extendido com:
- Badge `type` (technical/csuite)
- Lista `tools`
- Campo `desc`
- Campo `promptPath`

scripts/dashboard-data-build.js deve ser extendido para:
- Parsear `.claude/strategy/watchers-state.md` para campo `watchers[]`
- Parsear `.claude/strategy/competitors.md` para campo `competitors[]`
- Incluir campos novos de sprint (id, progress, daysToGate, gateName)
- Incluir techStack hardcoded dos 13 servicos
- Incluir stackHealth hardcoded dos 4 gauges (ou ler stack-health.md se disponivel)
- Gerar ourProduct e featureMatrix hardcoded

---

## Deploy config Vercel

Projecto existente: `proptech-agentic-ops.vercel.app`

Configuracao a aplicar no Vercel dashboard (ou via `vercel.json` na raiz de `apps/dashboard/`):

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "cd ../.. && npm install"
}
```

Root directory no Vercel: `apps/dashboard`

O `installCommand` usa `cd ../..` para que o npm instale os workspaces do monorepo (mesmo padrao de V5). O `outputDirectory` e `dist` (output padrao do Vite).

Auto-deploy: activo em push ao `main` (igual a V5).

---

## Convencoes de codigo

- React 18 + Vite 6 (versao igual a V5)
- JavaScript puro (sem TypeScript)
- Sem Supabase (dashboard e leitura de ficheiros, nao de BD)
- CSS variables herdadas do HTML aprovado (dark theme `--bg: #0a0e1a`, `--primary: #534AB7`)
- Lucide-react para icones (alinhado com V5)
- Sem Tailwind — apenas CSS-in-JS inline ou `<style>` global (alinhado com V5 que usa tokens inline)
- Estrutura de ficheiros sugerida para vertical-builder:

```
apps/dashboard/
  src/
    App.jsx                    -- shell com tab navigation + theme toggle
    components/
      Overview.jsx             -- Hero + Alerts + Verticals + NextActions + TechStack + StackHealth
      Activity.jsx             -- Timeline agrupada por dia
      Agents.jsx               -- Cards tecnicos + C-Suite
      Roadmap.jsx              -- Waves timeline + filtros + gates
      Watchers.jsx             -- Cards watchers + Drawer outputFull
      Decisions.jsx            -- Lista decisions + Drawer
      Competitors.jsx          -- Feature matrix table + Drawer
      Drawer.jsx               -- Painel lateral partilhado
      TechStack.jsx            -- Tabela 13 servicos
      shared/
        Badge.jsx              -- variant: level/status/prio/type
        Card.jsx
        SprintProgress.jsx     -- barra progresso + daysToGate
        ThemeToggle.jsx
    hooks/
      useData.js               -- fetch('/data.json') + polling 60s
  public/
    data.json                  -- gerado por scripts/dashboard-data-build.js
  index.html
  package.json
  vite.config.js
```

---

## Script de geracao data.json (v2.0)

O script `scripts/dashboard-data-build.js` deve:

1. Correr em Node.js (sem dependencias externas para maxima portabilidade)
2. Ler ficheiros de estado em caminhos absolutos (state files em `C:\Users\mario\dev\proptech-state\`)
3. Parsear markdown estruturado com regex:
   - Cabecalhos `key: value` — regex `^(\w[\w ]+):\s*(.+)$/m`
   - Entradas de log `[ISO_TS] agente @ worktree: summary` — regex `^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)\]\s+(\S+)\s+@\s+(\S+):\s+(.+)$`
   - Tabelas Markdown — regex por linha `^\|\s*(.+?)\s*\|`
   - Triggers activos — linhas entre `## Activos` e proximo `##`
4. Parsear `.claude/strategy/watchers-state.md` para `watchers[]`
5. Parsear `.claude/strategy/competitors.md` para `competitors[]`
6. Hardcodar techStack (13 servicos) e ourProduct + featureMatrix (nao derivados de ficheiros)
7. Usar stackHealth de `proptech-state/stack-health.md` se disponivel; fallback para dados hardcoded
8. Escrever `apps/dashboard/public/data.json` com schema v2.0 canonico
9. Ser invocavel via `node scripts/dashboard-data-build.js` (sem args)
10. Ser extensivel pelo hook SubagentStop (adiciona chamada ao script antes do commit)

---

## Notas adicionais

1. **HTML existente nao e eliminado.** `docs/dashboard/index.html` mantem-se como referencia visual e fallback.

2. **Polling interval.** O hook `useData.js` deve fazer polling a cada 60 segundos em DEV e ter um botao de refresh manual no header.

3. **Porta DEV.** Usar porta 5180 (apos 5175 de V5, 5176 de V4, etc.) para evitar conflitos.

4. **Drawer partilhado.** Todos os campos `detail`, `longDetail`, `outputFull` sao para abrir num Drawer lateral — componente partilhado entre todos os tabs. Evita proliferacao de modais.

5. **Theme toggle.** O HTML aprovado e dark por default. Adicionar toggle dark/light persistido em localStorage com key `v1theme` (consistente com v1-core).
