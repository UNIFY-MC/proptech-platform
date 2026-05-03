#!/usr/bin/env node
// scripts/dashboard-data-build.js
// Gera apps/dashboard/public/data.json a partir dos state files

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STATE_DIR = 'C:\\Users\\mario\\dev\\proptech-state'
const OUTPUT = join(ROOT, 'apps', 'dashboard', 'public', 'data.json')

function readFile(path) {
  try { return readFileSync(path, 'utf8') } catch { return '' }
}

// Parsear linhas key: value no início de um ficheiro markdown
function parseKV(content) {
  const result = {}
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^([\w][\w ]+):\s*(.+)$/)
    if (m) result[m[1].trim()] = m[2].trim()
    else if (line.startsWith('#')) break
  }
  return result
}

// Parsear entradas do activity log: [ISO_TS] agent @ worktree: summary
function parseActivity(content) {
  const entries = []
  const re = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)\]\s+(\S+)\s+@\s+(\S+):\s+(.+)$/gm
  let m
  while ((m = re.exec(content)) !== null) {
    entries.push({ ts: m[1], agent: m[2], worktree: m[3], summary: m[4], refs: [] })
  }
  return entries
}

// Parsear triggers (secção ## Activos)
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
      message: `${m[2]} → ${m[3]}: ${m[4]}`,
      since: m[1],
      source: 'triggers.md'
    })
  }
  return alerts
}

// Parsear oportunidades P0/P1 de opportunities.md
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

// Parsear ficheiros de agentes em agents/
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
    agents.push({
      id,
      name: id,
      lastTask: kv['Last task'] || '',
      lastRun: kv['Last run'] || '',
      nextSuggested: kv['Next suggested'] || '',
      worktree: kv['Worktree'] || '',
      status: 'idle'
    })
  }
  return agents
}

// Parsear verticais de verticals-state.md
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

// Obter info git
function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()
    const worktree = basename(ROOT)
    return { branch, worktree }
  } catch { return { branch: 'unknown', worktree: 'unknown' } }
}

// Parsear sprint de current-sprint-state.md
function parseSprint(content) {
  const now = new Date()
  const start = new Date('2026-05-01')
  const day = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)))

  // Tentar extrair hypothesis do conteúdo
  let hypothesis = 'Owner→link→prestador 48h'
  const hypMatch = content.match(/[Hh]ypothesis[:\s]+([^\n]+)/)
  if (hypMatch) hypothesis = hypMatch[1].trim()

  return {
    name: 'Sprint 1D — Receipt Trojan Horse Alpha',
    wave: '1D',
    day,
    totalDays: 14,
    startDate: '2026-05-01',
    endDate: '2026-05-15',
    hypothesis,
    status: 'ACTIVO',
    gates: [
      { id: 'day7', label: 'Day 7 — 1 owner externo aceitou convite', status: day >= 7 ? 'done' : 'pending', date: '2026-05-07' },
      { id: 'day11', label: 'Day 11 — 1 end-to-end real', status: day >= 11 ? 'done' : 'pending', date: '2026-05-11' },
      { id: 'day14', label: 'Day 14 — 5/5 criteria + decisão 1E', status: day >= 14 ? 'done' : 'pending', date: '2026-05-15' }
    ]
  }
}

// Parsear decisions-log.md
function parseDecisions(content) {
  const decisions = []
  const re = /^##\s+(.+)\n([\s\S]*?)(?=^##|\Z)/gm
  let m
  while ((m = re.exec(content)) !== null && decisions.length < 10) {
    const title = m[1].trim()
    const dateMatch = title.match(/\d{4}-\d{2}-\d{2}/)
    decisions.push({
      id: title.replace(/\s+/g, '-').toLowerCase().substring(0, 50),
      title: title.replace(/^\[|\]$/g, ''),
      status: 'Done',
      date: dateMatch ? dateMatch[0] : '',
      impact: 'V5'
    })
  }
  return decisions
}

// Parsear stack health
function parseStackHealth(content) {
  if (!content) return { score: 85, lastCheck: new Date().toISOString(), checks: [] }
  const kv = parseKV(content)
  const checks = []
  const re = /^\|\s*([^|]{3,}?)\s*\|\s*(pass|warn|fail)\s*\|\s*([^|]*?)\s*\|/gim
  let m
  while ((m = re.exec(content)) !== null) {
    const name = m[1].trim()
    if (name.toLowerCase().includes('service') || name.toLowerCase().includes('check') || name.toLowerCase().includes('name')) continue
    checks.push({ name, status: m[2].trim(), note: m[3].trim() })
  }
  return {
    score: kv['Score'] ? parseInt(kv['Score']) : 85,
    lastCheck: kv['Last check'] || new Date().toISOString(),
    checks
  }
}

// MAIN
const git = getGitInfo()
const now = new Date().toISOString()

const activityContent = readFile(join(STATE_DIR, 'recent-activity.md'))
const triggersContent = readFile(join(STATE_DIR, 'triggers.md'))
const opportunitiesContent = readFile(join(STATE_DIR, 'opportunities.md'))
const stackHealthContent = readFile(join(STATE_DIR, 'stack-health.md'))

const verticalsContent = readFile(join(ROOT, '.claude', 'strategy', 'verticals-state.md'))
const sprintContent = readFile(join(ROOT, '.claude', 'current', 'current-sprint-state.md'))
const decisionsContent = readFile(join(ROOT, '.claude', 'current', 'decisions-log.md'))

const parsedVerticals = parseVerticals(verticalsContent)

const data = {
  meta: {
    schemaVersion: '1.0',
    lastSync: now,
    generatedAt: now,
    branch: git.branch,
    worktree: git.worktree,
    generator: 'scripts/dashboard-data-build.js'
  },
  sprint: parseSprint(sprintContent),
  verticals: parsedVerticals.length > 0 ? parsedVerticals : [
    { id: 'v1', name: 'Core Hub', status: 'Foundation', color: '#534AB7', description: 'Hub horizontal partilhado' },
    { id: 'v2', name: 'Condomínios', status: 'Production', color: '#10b981', description: 'prataowners.pt — produção viva' },
    { id: 'v3', name: 'Seguros', status: 'Planned', color: '#8b92a8', description: 'Q1 2027' },
    { id: 'v4', name: 'Energia', status: 'Foundation', color: '#f59e0b', description: 'Schema pronto' },
    { id: 'v5', name: 'Manutenção', status: 'Active', color: '#3b82f6', description: 'Sprint 1D activo' },
    { id: 'v6', name: 'Reabilitação', status: 'Planned', color: '#8b92a8', description: 'Q1 2027' },
    { id: 'v7', name: 'Real Estate', status: 'Planned', color: '#8b92a8', description: '2027+' },
    { id: 'v8', name: 'Rentals', status: 'Planned', color: '#8b92a8', description: '2027+' },
    { id: 'v9', name: 'BaaS / Swan', status: 'Planned', color: '#8b92a8', description: 'Q1 2027' },
    { id: 'v10', name: 'Owners Club', status: 'Foundation', color: '#8b5cf6', description: 'Tab V5 Sprint 1E' }
  ],
  alerts: parseTriggers(triggersContent),
  actions: parseOpportunities(opportunitiesContent),
  watchers: [
    { id: 'competitor-monitor', name: 'Competitor Monitor', lastRun: '', status: 'unknown', summary: 'Aguarda primeira execução', source: 'GitHub Issues' },
    { id: 'daily-brief', name: 'Daily Brief', lastRun: '', status: 'unknown', summary: 'Aguarda primeira execução', source: 'GitHub Issues' },
    { id: 'weekly-recap', name: 'Weekly Recap', lastRun: '', status: 'unknown', summary: 'Aguarda primeira execução', source: 'GitHub Issues' },
    { id: 'healthcheck', name: 'Stack Healthcheck', lastRun: '', status: 'unknown', summary: 'Aguarda primeira execução', source: 'stack-health.md' }
  ],
  agents: parseAgents(),
  activity: parseActivity(activityContent).slice(0, 20),
  decisions: parseDecisions(decisionsContent).slice(0, 10),
  techStack: [
    { name: 'Supabase V1', type: 'database', cost: 'free tier', status: 'ok', projectId: 'hkmvszkpxjbxmnixzqbl' },
    { name: 'Supabase V2', type: 'database', cost: 'pro', status: 'ok (PRODUÇÃO)', projectId: 'eozklslwfaqujaijvdnl' },
    { name: 'Vercel V5 alpha', type: 'hosting', cost: 'free tier', status: 'ok', url: 'https://proptech-v5-alpha.vercel.app' },
    { name: 'Vercel Dashboard', type: 'hosting', cost: 'free tier', status: 'ok', url: 'https://proptech-agentic-ops.vercel.app' },
    { name: 'Resend SMTP', type: 'email', cost: 'free tier', status: 'ok' },
    { name: 'GitHub Actions watchers', type: 'automation', cost: '~€0.60/mês', status: 'ok' }
  ],
  stackHealth: parseStackHealth(stackHealthContent),
  roadmap: {
    currentWave: '1D',
    waves: [
      { id: '1D', name: 'Receipt Trojan Horse Alpha', status: 'active', period: '2026-05-01 / 2026-05-15' },
      { id: '1E', name: 'Camada 2 Prestador-side', status: 'planned', period: 'pós 2026-05-15' },
      { id: '2A', name: 'V4 Energia reactivar', status: 'planned', period: 'Q3 2026' },
      { id: '3A', name: 'V3 Seguros arranque', status: 'planned', period: 'Q1 2027' }
    ]
  },
  competitors: [
    { name: 'Hubbent', category: 'maintenance', threat: 'ALTO', notes: 'Dual-app PT, Tier 1' },
    { name: 'FIXO (Fidelidade)', category: 'maintenance', threat: 'CRÍTICO', notes: 'Fidelidade-owned, escala imediata' },
    { name: 'Jobber', category: 'prestador-tools', threat: 'MÉDIO', notes: 'Referência UX prestador-side' }
  ]
}

writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf8')
console.log(`data.json escrito em ${OUTPUT}`)
console.log(`   Sprint: Day ${data.sprint.day}/${data.sprint.totalDays}`)
console.log(`   Agents: ${data.agents.length}`)
console.log(`   Activity: ${data.activity.length} entradas`)
console.log(`   Alerts: ${data.alerts.length}`)
console.log(`   Actions: ${data.actions.length}`)
