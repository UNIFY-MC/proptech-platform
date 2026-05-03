#!/usr/bin/env node
// scripts/dashboard-data-build.js
// Gera apps/dashboard/public/data.json — schema v2.0
// Fases: parse state files + hardcoded tech stack/roadmap/competitors/watchers

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STATE_DIR = 'C:\\Users\\mario\\dev\\proptech-state'
const OUTPUT = join(ROOT, 'apps', 'dashboard', 'public', 'data.json')

// ---------------------------------------------------------------------------
// Hardcoded data
// ---------------------------------------------------------------------------

const TECH_STACK = [
  { name: 'Anthropic',    role: 'LLM core',          host: 'Anthropic',  status: 'ok',       cost: '~$15/mês',    sprint: '1D' },
  { name: 'Supabase V1',  role: 'Database V5',        host: 'Supabase',   status: 'ok',       cost: 'free tier',   sprint: '—' },
  { name: 'Supabase V2',  role: 'Database V2 prod',   host: 'Supabase',   status: 'ok',       cost: '~€25/mês',    sprint: '—' },
  { name: 'Netlify',      role: 'Legacy deploy',       host: 'Netlify',    status: 'ok',       cost: 'free tier',   sprint: '—' },
  { name: 'Vercel',       role: 'V5 + dashboard',      host: 'Vercel',     status: 'ok',       cost: 'free tier',   sprint: '1D' },
  { name: 'GitHub',       role: 'Repo + CI/CD',        host: 'GitHub',     status: 'ok',       cost: 'free tier',   sprint: '—' },
  { name: 'Stripe',       role: 'Pagamentos',          host: 'Stripe',     status: 'planned',  cost: '0.25%+29¢',   sprint: '1E' },
  { name: 'Moloni',       role: 'Faturação PT',        host: 'Moloni',     status: 'planned',  cost: '€15/mês',     sprint: '1E' },
  { name: 'Sentry',       role: 'Error tracking',      host: 'Sentry',     status: 'deferred', cost: 'free tier',   sprint: '2A' },
  { name: 'PostHog',      role: 'Analytics',           host: 'PostHog',    status: 'deferred', cost: 'free tier',   sprint: '2A' },
  { name: 'Resend',       role: 'Email transac.',      host: 'Resend',     status: 'ok',       cost: 'free tier',   sprint: '1B' },
  { name: 'Upstash',      role: 'Redis/queue',         host: 'Upstash',    status: 'deferred', cost: 'free tier',   sprint: '1E' },
  { name: 'Twilio',       role: 'SMS',                 host: 'Twilio',     status: 'deferred', cost: '~$0.10/SMS',  sprint: '1E' },
]

const STACK_HEALTH = [
  { service: 'Supabase V1',    usage: 25, label: '2/8 GB',       status: 'ok' },
  { service: 'Supabase V2',    usage: 59, label: '4.7/8 GB',     status: 'warn' },
  { service: 'Netlify build',  usage: 87, label: '261/300 min',  status: 'critical' },
  { service: 'GitHub Actions', usage: 18, label: '720/4k min',   status: 'ok' },
]

const ROADMAP = [
  { wave: '1A', name: 'Foundation',              status: 'done',    sprints: [
    { id: '0',    name: 'Reset estrutural',           status: 'done',    date: 'Pre-2026',          tasks: [] },
    { id: '3.3',  name: 'UI catálogo + wizard',        status: 'done',    date: 'Pre-2026',          tasks: [] },
    { id: '3.4',  name: 'Auth + RLS + onboarding',     status: 'done',    date: 'Pre-2026',          tasks: [] },
  ]},
  { wave: '1B', name: 'V5 Agentic Foundation',   status: 'active',  sprints: [
    { id: '1B.1', name: 'Agent infra + Vision',        status: 'done',    date: '2026-04-20',        tasks: [] },
    { id: '1B.4', name: 'Weather + HeroHeader',        status: 'done',    date: '2026-04-29',        tasks: [] },
    { id: '1B.5A',name: 'SQL foundations + pricing',   status: 'done',    date: '2026-04-30',        tasks: [] },
    { id: 'A',    name: 'C-Suite agents (7 personas)', status: 'done',    date: '2026-04-30',        tasks: [] },
    { id: 'B',    name: 'Watchers + crons',            status: 'done',    date: '2026-05-01',        tasks: [] },
  ]},
  { wave: '1D', name: 'V5 Receipt Trojan Horse',  status: 'active',  sprints: [
    { id: '1D', name: 'Receipt Alpha — owner-first 14d', status: 'active', date: '2026-05-01→15', tasks: [
      'Magic-link flow owner→prestador',
      '5 alpha owners recrutados',
      'Recibo digital gerado end-to-end',
      'Gate Day 7: 1 owner externo',
      'Gate Day 14: 5/5 criteria + decisão 1E',
    ]}
  ]},
  { wave: '1E', name: 'V5 Production Grade',     status: 'planned', sprints: [
    { id: '1E', name: 'Camada 2: prestador-side', status: 'planned', date: 'pós 2026-05-15', tasks: [
      'Dashboard prestador',
      'Stripe Connect',
      'Moloni integração',
      'Schema rename recibos_servico→trabalhos_documentados',
    ]}
  ]},
  { wave: '2A', name: 'V4 Energia reactivação',  status: 'planned', sprints: [
    { id: '2A', name: 'V4 Energia construção',    status: 'planned', date: 'Q3 2026',       tasks: [] }
  ]},
  { wave: '2B', name: 'V3 Seguros + V6+',        status: 'planned', sprints: [
    { id: '2B', name: 'V3 Seguros arranque',      status: 'planned', date: 'Q1 2027',       tasks: [] }
  ]},
]

const OUR_PRODUCT = {
  name: 'V5 Manutenção',
  features: { magicLink: true, fiscalPT: true, stripe: 'partial', mobile: true, multiVertical: true, aiAdvisor: true, b2b: 'partial' }
}

const FEATURE_MATRIX = [
  { key: 'magicLink',     label: 'Magic-link' },
  { key: 'fiscalPT',      label: 'Fiscal PT (Moloni)' },
  { key: 'stripe',        label: 'Stripe / Pagamentos' },
  { key: 'mobile',        label: 'Mobile App' },
  { key: 'multiVertical', label: 'Multi-vertical' },
  { key: 'aiAdvisor',     label: 'AI Advisor' },
  { key: 'b2b',           label: 'B2B Condomínio' },
]

const AGENT_META = {
  'architect-proptech': {
    type: 'technical',
    desc: 'Decisões arquitecturais, ADRs, consulta Notion, valida impactos cross-vertical.',
    tools: ['Read', 'Write', 'Grep', 'WebFetch', 'mcp__notion'],
    promptPath: '.claude/agents/architect-proptech.md'
  },
  'supabase-designer': {
    type: 'technical',
    desc: 'Schemas Supabase, migrations, RLS policies, Edge Functions via MCP.',
    tools: ['mcp__supabase', 'Read', 'Write'],
    promptPath: '.claude/agents/supabase-designer.md'
  },
  'vertical-builder': {
    type: 'technical',
    desc: 'Constrói verticais React em apps/vN-nome/. Reutiliza design system V1-core.',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob'],
    promptPath: '.claude/agents/vertical-builder.md'
  },
  'auditor-agent': {
    type: 'technical',
    desc: 'Revê código, lint, padrões CLAUDE.md, segurança.',
    tools: ['Read', 'Grep', 'Glob'],
    promptPath: '.claude/agents/auditor-agent.md'
  },
  'notion-librarian': {
    type: 'technical',
    desc: 'Sincroniza decisões com Notion, gera ADR drafts, weekly digests.',
    tools: ['mcp__notion', 'Read', 'Write'],
    promptPath: '.claude/agents/notion-librarian.md'
  },
  'ops-builder': {
    type: 'technical',
    desc: 'RCA drafts, auditoria stack-health, infra scripts.',
    tools: ['Bash', 'Read', 'Write', 'mcp__supabase'],
    promptPath: '.claude/agents/ops-builder.md'
  },
  'ceo-agent':  { type: 'csuite', desc: 'Visão, prioridades, GTM, decisões estratégicas.',       tools: [],  promptPath: '.claude/agents/csuite/ceo-agent.md' },
  'cfo-agent':  { type: 'csuite', desc: 'Controlo de custos, runway, financeiro.',               tools: [],  promptPath: '.claude/agents/csuite/cfo-agent.md' },
  'cmo-agent':  { type: 'csuite', desc: 'Posicionamento, mensagem, canais de aquisição.',        tools: [],  promptPath: '.claude/agents/csuite/cmo-agent.md' },
  'coo-agent':  { type: 'csuite', desc: 'Operações, processos, qualidade entrega.',              tools: [],  promptPath: '.claude/agents/csuite/coo-agent.md' },
  'cpo-agent':  { type: 'csuite', desc: 'Produto, roadmap, specs de features, user research.',   tools: [],  promptPath: '.claude/agents/csuite/cpo-agent.md' },
  'cto-agent':  { type: 'csuite', desc: 'Stack, segurança, débito técnico, decisões de infra.',  tools: [],  promptPath: '.claude/agents/csuite/cto-agent.md' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(path) {
  try { return readFileSync(path, 'utf8') } catch { return '' }
}

function parseKV(content) {
  const result = {}
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^([\w][\w -]*):\s*(.*)$/)
    if (m) result[m[1].trim()] = m[2].trim()
  }
  return result
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseActivity(content) {
  const entries = []
  const re = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)\]\s+(\S+)\s+@\s+(\S+):\s+(.+)$/gm
  let m
  while ((m = re.exec(content)) !== null) {
    entries.push({ ts: m[1], agent: m[2], worktree: m[3], action: m[4], refs: [] })
  }
  return entries
}

function parseTriggers(content) {
  const alerts = []
  const activos = content.match(/## Activos\s*([\s\S]*?)(?=##|$)/i)
  if (!activos) return alerts
  const lines = activos[1].split(/\r?\n/).filter(l => l.match(/^\[/))
  for (const line of lines) {
    const m = line.match(/^\[(.+?)\]\s+FROM\s+(\S+)\s+→\s+TO\s+(\S+):\s+(.+?)(?:\s+\[(.+?)\])?$/)
    if (m) alerts.push({
      id: `trigger-${m[2]}-${m[3]}-${alerts.length}`,
      level: 'warning',
      message: `${m[2]} → ${m[3]}: ${m[4].substring(0, 120)}`,
      since: m[1],
      source: 'triggers.md'
    })
  }
  return alerts
}

function parseOpportunities(content) {
  const actions = []
  const re = /^\|\s*\*{0,2}(P[012])\*{0,2}\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm
  let m
  while ((m = re.exec(content)) !== null) {
    if (m[1] === 'P0' || m[1] === 'P1') {
      actions.push({
        id: `opp-${actions.length + 1}`,
        priority: m[1],
        description: m[2].trim(),
        owner: m[3].trim(),
        source: 'opportunities.md'
      })
    }
  }
  return actions
}

function parseAgents() {
  const agents = []
  const agentDir = join(STATE_DIR, 'agents')
  if (!existsSync(agentDir)) return agents
  const files = readdirSync(agentDir).filter(f => f.endsWith('.md') && !f.startsWith('_'))
  for (const file of files) {
    const content = readFile(join(agentDir, file))
    if (!content) continue
    const kv = parseKV(content)
    const id = basename(file, '.md')
    const meta = AGENT_META[id] || {}

    // Calcular state: stale se > 24h sem actividade, idle caso contrário
    let state = 'never'
    if (kv['Last run']) {
      const lastRun = new Date(kv['Last run'])
      const diffH = (Date.now() - lastRun) / (1000 * 60 * 60)
      state = diffH > 48 ? 'stale' : 'idle'
    }

    agents.push({
      id,
      name: id,
      type: meta.type || 'technical',
      desc: meta.desc || '',
      tools: meta.tools || [],
      promptPath: meta.promptPath || '',
      task: kv['Last task'] || '',
      last: kv['Last run'] || '',
      nextSuggested: kv['Next suggested'] || '',
      worktree: kv['Worktree'] || '',
      state,
    })
  }
  return agents
}

function parseVerticals(content) {
  const verticals = []
  const colorMap = {
    V1: '#534AB7', V2: '#10b981', V3: '#8b92a8', V4: '#f59e0b',
    V5: '#3b82f6', V6: '#8b92a8', V7: '#8b92a8', V8: '#8b92a8',
    V9: '#8b92a8', V10: '#8b5cf6'
  }
  const re = /^\|\s*\*{0,2}(V\d+)\*{0,2}\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm
  let m
  while ((m = re.exec(content)) !== null) {
    const id = m[1].toLowerCase()
    verticals.push({
      id,
      name: m[2].trim(),
      status: m[3].trim(),
      color: colorMap[m[1]] || '#8b92a8',
      description: m[4].trim()
    })
  }
  return verticals
}

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()
    const worktree = basename(ROOT)
    return { branch, worktree }
  } catch { return { branch: 'unknown', worktree: 'unknown' } }
}

function parseSprint(content) {
  const now = new Date()
  const start = new Date('2026-05-01')
  const end = new Date('2026-05-15')
  const totalDays = 14
  const day = Math.max(0, Math.min(totalDays, Math.floor((now - start) / (1000 * 60 * 60 * 24))))
  const progress = Math.round((day / totalDays) * 100)

  let hypothesis = 'Owner→link→prestador 48h'
  const hypMatch = content.match(/[Hh]ypothesis[:\s]+([^\n]+)/)
  if (hypMatch) hypothesis = hypMatch[1].trim()

  const gates = [
    { id: 'day7',  label: 'Day 7 — 1 owner externo aceitou convite',  status: day >= 7  ? 'done' : 'pending', date: '2026-05-07' },
    { id: 'day11', label: 'Day 11 — 1 end-to-end real',               status: day >= 11 ? 'done' : 'pending', date: '2026-05-11' },
    { id: 'day14', label: 'Day 14 — 5/5 criteria + decisão 1E',       status: day >= 14 ? 'done' : 'pending', date: '2026-05-15' }
  ]

  const nextPendingGate = gates.find(g => g.status === 'pending')
  let daysToGate = 0
  let gateName = ''
  if (nextPendingGate) {
    const gateDate = new Date(nextPendingGate.date)
    daysToGate = Math.max(0, Math.ceil((gateDate - now) / (1000 * 60 * 60 * 24)))
    gateName = nextPendingGate.label
  }

  return {
    name: 'Sprint 1D — Receipt Trojan Horse Alpha',
    wave: '1D',
    day,
    totalDays,
    startDate: '2026-05-01',
    endDate: '2026-05-15',
    hypothesis,
    status: 'active',
    progress,
    daysToGate,
    gateName,
    gates
  }
}

function parseDecisions(content) {
  const decisions = []
  // Parsear entradas ## [YYYY-MM-DD] titulo
  const re = /^##\s+(.+)$/gm
  let m
  while ((m = re.exec(content)) !== null && decisions.length < 10) {
    const title = m[1].trim()
    if (title.toLowerCase() === 'histórico' || title.toLowerCase() === 'backlog') continue
    const dateMatch = title.match(/\d{4}-\d{2}-\d{2}/)

    // Extrair o bloco de texto após o título até ao próximo ## ou fim
    const blockStart = m.index + m[0].length
    const nextMatch = /^##\s+/gm
    nextMatch.lastIndex = blockStart
    const nextH = nextMatch.exec(content)
    const block = (nextH ? content.slice(blockStart, nextH.index) : content.slice(blockStart)).trim()

    // Extrair urgência se existir
    const urgencyMatch = block.match(/urgência[:\s]*(critical|high|medium|low)/i)
    const urgency = urgencyMatch ? urgencyMatch[1].toLowerCase() : 'low'

    decisions.push({
      id: title.replace(/\s+/g, '-').toLowerCase().substring(0, 50),
      text: title.replace(/^\[|\]$/g, '').replace(/\d{4}-\d{2}-\d{2}\s*[—–-]?\s*/, '').trim() || title,
      meta: dateMatch ? dateMatch[0] : '',
      detail: block.substring(0, 300),
      urgency,
    })
  }
  return decisions
}

// Parser de competitors.md
function parseCompetitors(content) {
  const competitors = []
  // Split por "\n## " para obter cada bloco — ignorar o cabeçalho
  const blocks = content.split(/\n## /)
  for (const block of blocks.slice(1)) {
    const lines = block.split(/\r?\n/)
    const name = lines[0].trim()
    if (!name || name.startsWith('Estrutura')) continue

    // Extrair key: value
    const kv = {}
    let section = null
    const strengths = []
    const weaknesses = []
    const features = {}

    for (const line of lines.slice(1)) {
      if (line.startsWith('### Pontos fortes')) { section = 'strengths'; continue }
      if (line.startsWith('### Pontos fracos')) { section = 'weaknesses'; continue }
      if (line.startsWith('### Features')) { section = 'features'; continue }
      if (line.startsWith('### ')) { section = null; continue }
      if (line.startsWith('---')) { section = null; continue }

      if (section === null) {
        const m = line.match(/^(\w[\w -]*):\s*(.*)$/)
        if (m) kv[m[1].trim()] = m[2].trim()
      } else if (section === 'strengths') {
        const m = line.match(/^-\s+(.+)$/)
        if (m) strengths.push(m[1].trim())
      } else if (section === 'weaknesses') {
        const m = line.match(/^-\s+(.+)$/)
        if (m) weaknesses.push(m[1].trim())
      } else if (section === 'features') {
        const checked = line.match(/^-\s+\[x\]\s+(\w+)/i)
        const unchecked = line.match(/^-\s+\[ \]\s+(\w+)/)
        if (checked) features[checked[1]] = true
        else if (unchecked) features[unchecked[1]] = false
      }
    }

    competitors.push({
      id: kv['id'] || name.toLowerCase().replace(/\s+/g, '-'),
      name,
      tier: parseInt(kv['tier'] || '4'),
      signal: kv['signal'] || '',
      country: kv['country'] || '',
      founded: kv['founded'] || '',
      funding: kv['funding'] || '',
      lastUpdate: kv['lastUpdate'] || '',
      threatLevel: kv['threatLevel'] || '',
      desc: kv['desc'] || '',
      strengths,
      weaknesses,
      features,
    })
  }
  return competitors
}

// Parser de watchers-state.md
function parseWatchers(content) {
  const watchers = []
  const blocks = content.split(/\n## /)
  for (const block of blocks.slice(1)) {
    const lines = block.split(/\r?\n/)
    const name = lines[0].trim()
    if (!name || name.startsWith('Estrutura')) continue

    const kv = {}
    let section = null
    let outputLines = []
    let outputFullLines = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('### Último output')) { section = 'output'; continue }
      if (line.startsWith('### Output completo')) { section = 'outputFull'; continue }
      if (line.startsWith('### ')) { section = null; continue }
      if (line.startsWith('---')) { section = null; continue }

      if (section === null) {
        const m = line.match(/^([\w][\w -]*):\s*(.*)$/)
        if (m) kv[m[1].trim()] = m[2].trim()
      } else if (section === 'output') {
        if (line.trim()) outputLines.push(line)
      } else if (section === 'outputFull') {
        outputFullLines.push(line)
      }
    }

    // output = primeira linha não-vazia após "### Último output"
    const output = outputLines[0] || 'Sem dados ainda.'
    // outputFull = tudo (trim trailing empty lines)
    const outputFull = outputFullLines.join('\n').trimEnd()

    watchers.push({
      id: name,
      name,
      cadence: kv['cadence'] || '',
      last: kv['last'] || '',
      next: kv['next'] || '',
      status: kv['status'] || 'never',
      link: kv['link'] || '',
      output,
      outputFull,
    })
  }
  return watchers
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

const git = getGitInfo()
const now = new Date().toISOString()

const activityContent     = readFile(join(STATE_DIR, 'recent-activity.md'))
const triggersContent     = readFile(join(STATE_DIR, 'triggers.md'))
const opportunitiesContent= readFile(join(STATE_DIR, 'opportunities.md'))

const verticalsContent    = readFile(join(ROOT, '.claude', 'strategy', 'verticals-state.md'))
const sprintContent       = readFile(join(ROOT, '.claude', 'current', 'current-sprint-state.md'))
const decisionsContent    = readFile(join(ROOT, '.claude', 'current', 'decisions-log.md'))
const competitorsContent  = readFile(join(ROOT, '.claude', 'strategy', 'competitors.md'))
const watchersContent     = readFile(join(ROOT, '.claude', 'strategy', 'watchers-state.md'))

const parsedVerticals = parseVerticals(verticalsContent)
const parsedSprint = parseSprint(sprintContent)
const parsedAgents = parseAgents()
const parsedActivity = parseActivity(activityContent)
const parsedWatchers = parseWatchers(watchersContent)
const parsedCompetitors = parseCompetitors(competitorsContent)

const data = {
  meta: {
    schemaVersion: '2.0',
    lastSync: now,
    generatedAt: now,
    branch: git.branch,
    worktree: git.worktree,
    generator: 'scripts/dashboard-data-build.js'
  },
  sprint: parsedSprint,
  verticals: parsedVerticals.length > 0 ? parsedVerticals : [
    { id: 'v1', name: 'Core Hub',     status: 'Foundation', color: '#534AB7', description: 'Hub horizontal partilhado' },
    { id: 'v2', name: 'Condomínios',  status: 'Production', color: '#10b981', description: 'prataowners.pt — produção viva' },
    { id: 'v3', name: 'Seguros',      status: 'Planned',    color: '#8b92a8', description: 'Q1 2027' },
    { id: 'v4', name: 'Energia',      status: 'Foundation', color: '#f59e0b', description: 'Schema pronto' },
    { id: 'v5', name: 'Manutenção',   status: 'Active',     color: '#3b82f6', description: 'Sprint 1D activo' },
    { id: 'v6', name: 'Reabilitação', status: 'Planned',    color: '#8b92a8', description: 'Q1 2027' },
    { id: 'v7', name: 'Real Estate',  status: 'Planned',    color: '#8b92a8', description: '2027+' },
    { id: 'v8', name: 'Rentals',      status: 'Planned',    color: '#8b92a8', description: '2027+' },
    { id: 'v9', name: 'BaaS / Swan',  status: 'Planned',    color: '#8b92a8', description: 'Q1 2027' },
    { id: 'v10',name: 'Owners Club',  status: 'Foundation', color: '#8b5cf6', description: 'Tab V5 Sprint 1E' }
  ],
  alerts: parseTriggers(triggersContent),
  nextActions: parseOpportunities(opportunitiesContent),
  techStack: TECH_STACK,
  stackHealth: STACK_HEALTH,
  watchers: parsedWatchers,
  agents: parsedAgents,
  recentActivity: parsedActivity.slice(0, 20),
  decisions: parseDecisions(decisionsContent).slice(0, 10),
  roadmap: ROADMAP,
  competitors: parsedCompetitors,
  ourProduct: OUR_PRODUCT,
  featureMatrix: FEATURE_MATRIX,
}

writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf8')

// Verificar tamanho
const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(data, null, 2)) / 1024)

console.log(`data.json escrito em ${OUTPUT}`)
console.log(`   Schema: v${data.meta.schemaVersion}`)
console.log(`   Tamanho: ~${sizeKB}KB`)
console.log(`   Sprint: Wave ${data.sprint.wave}, Day ${data.sprint.day}/${data.sprint.totalDays} (${data.sprint.progress}%)`)
console.log(`   Agents: ${data.agents.length}`)
console.log(`   Activity: ${data.recentActivity.length} entradas`)
console.log(`   Alerts: ${data.alerts.length}`)
console.log(`   NextActions: ${data.nextActions.length}`)
console.log(`   Watchers: ${data.watchers.length}`)
console.log(`   Competitors: ${data.competitors.length}`)
console.log(`   TechStack: ${data.techStack.length}`)
console.log(`   Roadmap waves: ${data.roadmap.length}`)
console.log(`   Decisions: ${data.decisions.length}`)
if (sizeKB > 100) console.warn(`   AVISO: data.json acima de 100KB (${sizeKB}KB)`)
