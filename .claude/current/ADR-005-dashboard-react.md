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

## data.json schema (canonico)

```json
{
  "meta": {
    "schemaVersion": "1.0",
    "lastSync": "2026-05-03T14:00Z",
    "generatedAt": "2026-05-03T14:00Z",
    "branch": "sprint/v5-1b3",
    "worktree": "proptech-v5-1b3",
    "generator": "scripts/dashboard-data-build.js"
  },
  "sprint": {
    "name": "Sprint 1D — Receipt Trojan Horse Alpha",
    "wave": "1D",
    "day": 6,
    "totalDays": 14,
    "startDate": "2026-05-01",
    "endDate": "2026-05-15",
    "hypothesis": "Se proporcionarmos um link partilhavel que dispara recibo digital...",
    "status": "ACTIVO",
    "gates": [
      { "id": "day7", "label": "Day 7 — 1 owner externo aceitou convite", "status": "pending", "date": "2026-05-07" },
      { "id": "day14", "label": "Day 14 — 5/5 owners testaram flow", "status": "pending", "date": "2026-05-15" }
    ]
  },
  "verticals": [
    { "id": "v1", "name": "Core Hub", "status": "Foundation", "color": "#534AB7", "description": "Hub horizontal partilhado" },
    { "id": "v2", "name": "Condominios", "status": "Production", "color": "#10b981", "description": "prataowners.pt — producao viva" },
    { "id": "v3", "name": "Seguros", "status": "Planned", "color": "#8b92a8", "description": "Q1 2027" },
    { "id": "v4", "name": "Energia", "status": "Foundation", "color": "#f59e0b", "description": "Schema pronto, produto a construir" },
    { "id": "v5", "name": "Manutencao", "status": "Active", "color": "#3b82f6", "description": "Sprint 1D activo" },
    { "id": "v6", "name": "Reabilitacao", "status": "Planned", "color": "#8b92a8", "description": "Q1 2027" },
    { "id": "v7", "name": "Real Estate", "status": "Planned", "color": "#8b92a8", "description": "2027+" },
    { "id": "v8", "name": "Rentals", "status": "Planned", "color": "#8b92a8", "description": "2027+" },
    { "id": "v9", "name": "BaaS / Swan", "status": "Planned", "color": "#8b92a8", "description": "Q1 2027" },
    { "id": "v10", "name": "Owners Club", "status": "Foundation", "color": "#8b5cf6", "description": "Tab V5 Sprint 1E" }
  ],
  "alerts": [
    {
      "id": "trigger-001",
      "level": "warning",
      "message": "Trigger activo para supabase-designer: migration ADR-004 pendente",
      "since": "2026-05-02T00:00Z",
      "source": "triggers.md"
    }
  ],
  "actions": [
    {
      "id": "opp-001",
      "priority": "P0",
      "description": "Rotacionar SUPABASE_SERVICE_ROLE_KEY V1 — exposed em chat 2026-05-02",
      "owner": "Mário",
      "dueDate": "pre-R2-outreach",
      "source": "opportunities.md"
    },
    {
      "id": "opp-002",
      "priority": "P1",
      "description": "Prestador-app charter (Sprint 1E P1) — ADR-006 + plano detalhado",
      "owner": "cpo-agent + architect-proptech",
      "dueDate": "2026-05-10",
      "source": "opportunities.md"
    }
  ],
  "watchers": [
    {
      "id": "competitor-monitor",
      "name": "Competitor Monitor",
      "lastRun": "2026-05-03T06:00Z",
      "status": "ok",
      "summary": "Weekly scan 25 entidades. Sem novos entrantes criticos.",
      "source": "GitHub Issues label:watcher"
    },
    {
      "id": "daily-brief",
      "name": "Daily Brief",
      "lastRun": "2026-05-03T07:00Z",
      "status": "ok",
      "summary": "Day 6 Sprint 1D. Gate Day 7 pendente.",
      "source": "GitHub Issues label:watcher"
    },
    {
      "id": "weekly-recap",
      "name": "Weekly Recap",
      "lastRun": "2026-05-01T08:00Z",
      "status": "ok",
      "summary": "W18: shift energy to recruiting 5 alpha owners.",
      "source": "GitHub Issues label:watcher"
    },
    {
      "id": "healthcheck",
      "name": "Stack Healthcheck",
      "lastRun": "2026-05-03T06:30Z",
      "status": "ok",
      "summary": "V5 alpha Vercel OK. V2 prataowners.pt OK. Supabase V1 OK.",
      "source": "stack-health.md"
    }
  ],
  "agents": [
    {
      "id": "architect-proptech",
      "name": "architect-proptech",
      "lastTask": "ADR-005 dashboard React — decisoes e documentacao",
      "lastRun": "2026-05-03T14:00Z",
      "nextSuggested": "Trigger para vertical-builder implementar apps/dashboard/",
      "worktree": "proptech-v5-1b3",
      "status": "idle"
    }
  ],
  "activity": [
    {
      "ts": "2026-05-03T13:58Z",
      "agent": "subagent",
      "worktree": "proptech-v5-1b3",
      "summary": "subagent stopped",
      "refs": ["session:d2eca88a"]
    }
  ],
  "decisions": [
    {
      "id": "D-2026-05-03-magic-link",
      "title": "Magic-link URL fix: getBaseUrl(req) + path /r/join/",
      "status": "Done",
      "date": "2026-05-03",
      "impact": "V5"
    },
    {
      "id": "D-2026-05-02-r2-deferred",
      "title": "R2 Alpha Outreach adiado indefinidamente",
      "status": "Pending",
      "date": "2026-05-02",
      "impact": "V5 Sprint 1D"
    }
  ],
  "techStack": [
    { "name": "Supabase V1", "type": "database", "cost": "free tier", "status": "ok", "projectId": "hkmvszkpxjbxmnixzqbl" },
    { "name": "Supabase V2", "type": "database", "cost": "pro", "status": "ok (PRODUCAO)", "projectId": "eozklslwfaqujaijvdnl" },
    { "name": "Vercel V5 alpha", "type": "hosting", "cost": "free tier", "status": "ok", "url": "https://proptech-v5-alpha.vercel.app" },
    { "name": "Vercel dashboard", "type": "hosting", "cost": "free tier", "status": "ok", "url": "https://proptech-agentic-ops.vercel.app" },
    { "name": "Resend SMTP", "type": "email", "cost": "free tier", "status": "ok" },
    { "name": "GitHub Actions watchers", "type": "automation", "cost": "~$0.60/mes", "status": "ok" }
  ],
  "stackHealth": {
    "score": 85,
    "lastCheck": "2026-05-03T06:30Z",
    "checks": [
      { "name": "V5 alpha Vercel", "status": "pass", "note": "Deploy auto activo" },
      { "name": "V2 prataowners.pt", "status": "pass", "note": "Producao estavel" },
      { "name": "Supabase V1 Edge Functions", "status": "pass", "note": "gerar-magic-link v5 ACTIVE" },
      { "name": "GitHub Actions watchers", "status": "pass", "note": "4 workflows ON" },
      { "name": "VITE_ANTHROPIC_API_KEY exposure", "status": "warn", "note": "Blocker pre-launch, nao deployed ainda" },
      { "name": "SERVICE_ROLE_KEY rotation", "status": "warn", "note": "Deferred ate pre-R2 outreach" }
    ]
  },
  "roadmap": {
    "currentWave": "1D",
    "waves": [
      { "id": "1D", "name": "Receipt Trojan Horse Alpha", "status": "active", "period": "2026-05-01 / 2026-05-15" },
      { "id": "1E", "name": "Camada 2 Prestador-side", "status": "planned", "period": "pos 2026-05-15" },
      { "id": "2A", "name": "V4 Energia reactivar", "status": "planned", "period": "Q3 2026" },
      { "id": "3A", "name": "V3 Seguros arranque", "status": "planned", "period": "Q1 2027" }
    ]
  },
  "competitors": [
    { "name": "Hubbent", "category": "maintenance", "threat": "ALTO", "notes": "Dual-app PT, Tier 1 semanal. Classificacao provisional — rever W18." },
    { "name": "FIXO (Fidelidade)", "category": "maintenance", "threat": "CRITICO", "notes": "Fidelidade-owned, escala imediata, Tier 1." },
    { "name": "Jobber", "category": "prestador-tools", "threat": "MEDIO", "notes": "Referencia UX prestador-side para Sprint 1E." }
  ]
}
```

---

## Sources canonicas por campo

| Campo data.json | Ficheiro fonte |
|-----------------|----------------|
| `meta.branch` | `git rev-parse --abbrev-ref HEAD` |
| `meta.worktree` | dirname do worktree |
| `sprint.*` | `.claude/current/current-sprint-state.md` |
| `verticals[]` | `.claude/strategy/verticals-state.md` |
| `alerts[]` | `C:\Users\mario\dev\proptech-state\triggers.md` secção `## Activos` |
| `actions[]` | `C:\Users\mario\dev\proptech-state\opportunities.md` (P0/P1 abertos) |
| `agents[]` | `C:\Users\mario\dev\proptech-state\agents\*.md` (todos os ficheiros) |
| `activity[]` | `C:\Users\mario\dev\proptech-state\recent-activity.md` (ultimas 20) |
| `decisions[]` | `.claude/current/decisions-log.md` (ultimas 10) |
| `techStack[]` | `CLAUDE.md` secção Stack tecnica |
| `stackHealth.*` | `C:\Users\mario\dev\proptech-state\stack-health.md` |
| `roadmap.*` | `.claude/current/current-sprint-state.md` tabela Roadmap geral |
| `competitors[]` | `.claude/strategy/competitive-references-context.md` |
| `watchers[]` | GitHub Issues com label `watcher` (via GitHub API) |

---

## Estrutura de tabs

| Tab | Conteudo | Dados de |
|-----|----------|----------|
| Overview | Hero sprint + progress bar, Alerts (triggers activos), Verticals grid, Actions (P0/P1), Tech Stack | sprint, alerts, verticals, actions, techStack, stackHealth |
| Activity | Timeline cronologica de recent-activity.md, agrupada por dia | activity |
| Agents | Card por agente (nome, lastTask, lastRun, nextSuggested, status) | agents |
| Roadmap | Waves timeline + sprint actual detail + gates | roadmap, sprint |
| Watchers | Card por watcher (lastRun, status, summary resumo) | watchers |

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
    App.jsx           -- shell com tab navigation
    components/
      Overview.jsx
      Activity.jsx
      Agents.jsx
      Roadmap.jsx
      Watchers.jsx
      shared/
        Badge.jsx
        Card.jsx
        SprintProgress.jsx
    hooks/
      useData.js      -- fetch('/data.json') + polling 60s
  public/
    data.json         -- gerado por scripts/dashboard-data-build.js
  index.html
  package.json
  vite.config.js
```

---

## Script de geracao data.json

O script `scripts/dashboard-data-build.js` (a criar) deve:

1. Correr em Node.js (sem dependencias externas para maxima portabilidade)
2. Ler ficheiros de estado em caminhos absolutos (state files em `C:\Users\mario\dev\proptech-state\`)
3. Parsear markdown estruturado com regex:
   - Cabecalhos `key: value` — regex `^(\w[\w ]+):\s*(.+)$/m`
   - Entradas de log `[ISO_TS] agente @ worktree: summary` — regex `^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)\]\s+(\S+)\s+@\s+(\S+):\s+(.+)$`
   - Tabelas Markdown — regex por linha `^\|\s*(.+?)\s*\|`
   - Triggers activos — linhas entre `## Activos` e proximo `##`
4. Escrever `apps/dashboard/public/data.json` com schema canonico acima
5. Ser invocavel via `node scripts/dashboard-data-build.js` (sem args)
6. Ser extensivel pelo hook SubagentStop (adiciona chamada ao script antes do commit)

---

## Notas adicionais

1. **HTML existente nao e eliminado.** `docs/dashboard/index.html` mantem-se como referencia visual e fallback. O Vercel aponta para `apps/dashboard/` (novo projecto ou update root). O GitHub Pages pode continuar a servir o HTML estatico se necessario.

2. **Polling interval.** O hook `useData.js` deve fazer polling a cada 60 segundos em DEV e ter um botao de refresh manual no header (identico ao HTML aprovado).

3. **data.json nao existe ainda.** O vertical-builder deve criar um `data.json` de exemplo no `public/` para que o dashboard arranque sem erros. O script Node sera construido separadamente ou em paralelo.

4. **Watchers via GitHub API.** Os 4 watchers (competitor-monitor, daily-brief, weekly-recap, healthcheck) criam GitHub Issues com outputs. O script Node pode opcionalmente fazer fetch da GitHub API para preencher `watchers[]` com os ultimos issues de cada watcher (requer GITHUB_TOKEN como variavel de ambiente no script). Alternativa simples: watchers escrevem directamente um ficheiro `C:\Users\mario\dev\proptech-state\watchers\<id>-latest.md` que o script parsa.

5. **Porta DEV.** Usar porta 5180 (apos 5175 de V5, 5176 de V4, etc.) para evitar conflitos.
