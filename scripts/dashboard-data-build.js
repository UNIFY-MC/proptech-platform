#!/usr/bin/env node
// scripts/dashboard-data-build.js
// Gera apps/dashboard/public/data.json — schema v3.0
// Princípio: 100% LIVE sources. Zero hardcodes para dados de estado.
// Se ficheiro falha → secção retorna { _source, _status: 'missing', _error }

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import matter from 'gray-matter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STATE_DIR = 'C:\\Users\\mario\\dev\\proptech-state'
const OUTPUT = join(ROOT, 'apps', 'dashboard', 'public', 'data.json')

// ---------------------------------------------------------------------------
// Hardcoded data — APENAS metadados estáveis que não mudam com estado
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

function stripFrontmatter(md) {
  if (!md.startsWith('---\n')) return md
  const end = md.indexOf('\n---\n', 4)
  if (end === -1) return md
  return md.slice(end + 5)
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

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()
    const worktree = basename(ROOT)
    return { branch, worktree }
  } catch { return { branch: 'unknown', worktree: 'unknown' } }
}

// ---------------------------------------------------------------------------
// Parsers LIVE — cada um retorna { ..., _source, _status, _lastParsed }
// ---------------------------------------------------------------------------

function parseSprint(filePath) {
  const src = '.claude/current/current-sprint-state.md'
  try {
    const content = readFile(filePath)
    if (!content) throw new Error('Ficheiro vazio ou inexistente')
    const { data } = matter(content)
    if (!data.sprint) throw new Error('Frontmatter sprint: em falta')
    const sprint = data.sprint
    const gates = data.gates || []
    const started = new Date(sprint.started)
    const now = new Date()
    const day = Math.max(0, Math.floor((now - started) / 86400000))
    const totalDays = sprint.total_days || 14
    const progress = Math.min(100, Math.round((day / totalDays) * 100))
    const nextGate = gates.find(g => g.status === 'pending')
    const daysToGate = nextGate ? Math.max(0, Math.ceil((new Date(nextGate.date) - now) / 86400000)) : 0
    return {
      id: sprint.id,
      name: sprint.name,
      wave: sprint.wave || sprint.id,
      vertical: sprint.vertical,
      status: sprint.status,
      started: sprint.started,
      startDate: sprint.started,
      target: sprint.target,
      endDate: sprint.target,
      day,
      totalDays,
      progress,
      hypothesis: sprint.hypothesis,
      daysToGate,
      gateName: nextGate ? nextGate.desc : '',
      gates: gates.map(g => ({
        id: `day${g.day}`,
        day: g.day,
        label: g.desc,
        desc: g.desc,
        date: g.date,
        status: g.status || (day >= g.day ? 'done' : 'pending')
      })),
      daysDone: data.days_done || [],
      _source: src,
      _status: 'live',
      _lastParsed: new Date().toISOString()
    }
  } catch (e) {
    return { _source: src, _status: 'missing', _error: e.message }
  }
}

function parseVerticals(filePath) {
  const src = '.claude/strategy/verticals-state.md'
  try {
    const content = readFile(filePath)
    if (!content) throw new Error('Ficheiro vazio')
    const { data } = matter(content)
    if (!data.verticals || !data.verticals.length) throw new Error('verticals[] em falta no frontmatter')
    const colorMap = {
      violet: '#534AB7',
      emerald: '#10b981',
      stone: '#8b92a8',
      amber: '#f59e0b',
      blue: '#3b82f6'
    }
    return {
      verticals: data.verticals.map(v => ({
        id: v.id,
        name: v.name,
        status: v.status,
        color: colorMap[v.color] || '#8b92a8',
        meta: v.meta || '',
        detail: v.detail || '',
        description: v.detail || '',
        longDetail: v.longDetail || ''
      })),
      _source: src,
      _status: 'live',
      _lastParsed: new Date().toISOString()
    }
  } catch (e) {
    return { verticals: [], _source: src, _status: 'missing', _error: e.message }
  }
}

function parseNextActions(filePath) {
  const src = 'proptech-state/opportunities.md'
  try {
    const content = readFile(filePath)
    if (!content) throw new Error('Ficheiro vazio')
    // Regex para linha de tabela com | P0 | ou | P1 | ou | P2 | na primeira coluna
    const re = /^\|\s*(P[0-3]|H|M|L)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]*)\|?/gm
    const actions = []
    let m
    while ((m = re.exec(content)) !== null) {
      const prio = m[1].trim()
      if (prio === 'Prioridade' || prio === 'Prio') continue // header
      const desc = (m[2] || '').trim()
      const owner = (m[3] || '').trim()
      const effort = (m[4] || '').trim()
      const status = (m[5] || '').trim()
      const date = (m[6] || '').trim()
      // Só P0/P1 para nextActions; P2+ são backlog
      if (prio === 'P0' || prio === 'P1') {
        actions.push({
          id: `opp-${actions.length + 1}`,
          priority: prio,
          description: desc,
          owner,
          effort,
          status,
          date,
          source: src
        })
      }
    }
    return {
      nextActions: actions,
      _source: src,
      _status: actions.length > 0 ? 'live' : 'partial',
      _lastParsed: new Date().toISOString()
    }
  } catch (e) {
    return { nextActions: [], _source: src, _status: 'missing', _error: e.message }
  }
}

function parseStackHealth(filePath) {
  const src = 'proptech-state/stack-health.md'
  try {
    const content = readFile(filePath)
    if (!content) throw new Error('Ficheiro vazio')
    // Parse tabela ## Gauges
    const gaugesSection = content.match(/## Gauges[\s\S]*?(?=##|$)/i)
    if (!gaugesSection) throw new Error('Secção ## Gauges em falta')
    const re = /^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(ok|warn|critical)\s*\|/gim
    const gauges = []
    let m
    while ((m = re.exec(gaugesSection[0])) !== null) {
      const service = m[1].trim()
      if (service.toLowerCase() === 'serviço' || service === '---') continue
      gauges.push({
        service,
        usage: parseInt(m[2]),
        label: m[3].trim(),
        status: m[4].trim()
      })
    }
    if (gauges.length === 0) throw new Error('Nenhum gauge encontrado na tabela')
    return {
      stackHealth: gauges,
      _source: src,
      _status: 'live',
      _lastParsed: new Date().toISOString()
    }
  } catch (e) {
    return { stackHealth: [], _source: src, _status: 'missing', _error: e.message }
  }
}

function parseDecisions(filePath) {
  const src = '.claude/current/decisions-log.md'
  try {
    const content = readFile(filePath)
    if (!content) throw new Error('Ficheiro vazio')
    const decisions = []
    // Split por H2 ##
    const blocks = content.split(/\n## /).slice(1)
    for (const block of blocks) {
      if (decisions.length >= 10) break
      const lines = block.split('\n')
      const title = lines[0].trim()
      if (!title || title.startsWith('---')) continue
      const body = lines.slice(1).join('\n')
      // Extrair urgência: procura **Urgência:** high|medium|low|critical
      const urgencyMatch = body.match(/\*\*Urgência:\*\*\s*(critical|high|medium|low)/i)
      const urgency = urgencyMatch ? urgencyMatch[1].toLowerCase() : 'low'
      // Data do título (YYYY-MM-DD no início)
      const dateMatch = title.match(/(\d{4}-\d{2}-\d{2})/)
      const date = dateMatch ? dateMatch[1] : ''
      // Texto limpo (sem data e — separador)
      const text = title.replace(/^\d{4}-\d{2}-\d{2}\s*[—–-]\s*/, '').trim()
      const meta = date ? `${date} · V5` : 'V5'
      const detail = body.replace(/\*\*Urgência:\*\*[^\n]+\n?/, '').substring(0, 300).trim()
      decisions.push({
        id: `d-${date || decisions.length}`,
        text,
        urgency,
        meta,
        detail
      })
    }
    return {
      decisions,
      _source: src,
      _status: 'live',
      _lastParsed: new Date().toISOString()
    }
  } catch (e) {
    return { decisions: [], _source: src, _status: 'missing', _error: e.message }
  }
}

function parseRoadmap(filePath) {
  const src = '.claude/current/current-sprint-state.md'
  try {
    const content = readFile(filePath)
    if (!content) throw new Error('Ficheiro vazio')
    // Tentar parse tabela ## Roadmap geral
    const roadmapSection = content.match(/## Roadmap geral[\s\S]*?(?=## |$)/i)
    if (!roadmapSection) {
      // Fallback: usar frontmatter sprint como única wave active
      const { data } = matter(content)
      if (data.sprint) {
        return {
          roadmap: [{
            wave: data.sprint.wave || data.sprint.id,
            name: data.sprint.name,
            status: data.sprint.status,
            sprints: [{
              id: data.sprint.id,
              name: data.sprint.name,
              status: data.sprint.status,
              date: `${data.sprint.started} → ${data.sprint.target}`,
              tasks: (data.gates || []).map(g => `Gate Day ${g.day}: ${g.desc}`)
            }]
          }],
          _source: src,
          _status: 'partial',
          _lastParsed: new Date().toISOString()
        }
      }
      throw new Error('Roadmap geral não encontrado')
    }
    const re = /^\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm
    const waves = []
    let m
    while ((m = re.exec(roadmapSection[0])) !== null) {
      const wave = m[1].trim()
      if (wave === 'Wave' || wave === '---') continue
      const statusRaw = m[2].trim()
      const period = m[3].trim()
      const output = m[4].trim()
      const status = statusRaw.includes('ACTIVO') ? 'active'
        : statusRaw.includes('Fechado') || statusRaw.includes('✅') ? 'done'
        : statusRaw.includes('Planeado') ? 'planned'
        : 'planned'
      waves.push({
        wave: wave.replace(/Sprint\s+/i, ''),
        name: output.replace(/\*\*/g, ''),
        status,
        sprints: [{
          id: wave,
          name: output.replace(/\*\*/g, '').substring(0, 60),
          status,
          date: period,
          tasks: []
        }]
      })
    }
    if (waves.length === 0) throw new Error('Nenhuma wave encontrada na tabela')
    return {
      roadmap: waves,
      _source: src,
      _status: 'live',
      _lastParsed: new Date().toISOString()
    }
  } catch (e) {
    return { roadmap: [], _source: src, _status: 'missing', _error: e.message }
  }
}

function parseActivity(content) {
  const entries = []
  const re = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)\]\s+(\S+)\s+@\s+(\S+):\s+(.+)$/gm
  let m
  while ((m = re.exec(content)) !== null) {
    entries.push({ ts: m[1], agent: m[2], worktree: m[3], action: m[4], refs: [] })
  }
  return entries
}

function parseAlerts(content) {
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

function parseWatchers(filePath) {
  const watchers = []
  const content = readFile(filePath)
  if (!content) return watchers
  const blocks = content.split(/\n## /)
  for (const block of blocks.slice(1)) {
    const lines = block.split(/\r?\n/)
    const name = lines[0].trim()
    if (!name || name.startsWith('Estrutura')) continue

    const kv = {}
    let section = null
    const outputLines = []
    const outputFullLines = []

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

    const output = outputLines[0] || 'Sem dados ainda.'
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

function parseEmployees() {
  const employeeDir = join(ROOT, '.claude', 'employees')
  if (!existsSync(employeeDir)) return []
  const files = readdirSync(employeeDir).filter(f => f.endsWith('.meta.json'))
  const employees = []
  for (const file of files) {
    try {
      const raw = readFileSync(join(employeeDir, file), 'utf8')
      const meta = JSON.parse(raw)
      const mdPath = join(employeeDir, file.replace('.meta.json', '.md'))
      const mdRaw = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : ''
      employees.push({
        id: meta.id,
        name: meta.name,
        role: meta.role,
        department: meta.department,
        vertical: meta.vertical,
        secondary_verticals: meta.secondary_verticals || [],
        model: meta.model || '',
        version: meta.version || '',
        status: meta.status || 'draft',
        avatarInitial: meta.avatarInitial || (meta.name?.[0]?.toUpperCase() ?? '?'),
        color: meta.color || '',
        cost: meta.cost || null,
        skills: meta.skills || [],
        recipes: meta.recipes || [],
        integrations: meta.integrations || [],
        peerReads: meta.peerReads || [],
        _mdRaw: stripFrontmatter(mdRaw),
      })
    } catch { /* skip malformed file */ }
  }
  employees.sort((a, b) => {
    const DEPT_ORDER = ['Manutenção', 'Condomínios', 'Marketing']
    const da = DEPT_ORDER.indexOf(a.department)
    const db = DEPT_ORDER.indexOf(b.department)
    if (da !== db) return (da === -1 ? 99 : da) - (db === -1 ? 99 : db)
    return a.name.localeCompare(b.name)
  })
  return employees
}

function parseSkills() {
  const skillsMap = new Map()
  const employeeDir = join(ROOT, '.claude', 'employees')
  if (!existsSync(employeeDir)) return []
  const files = readdirSync(employeeDir).filter(f => f.endsWith('.meta.json'))
  const SKILL_TAGS = {
    'classify': 'CLASSIFICATION', 'match': 'MATCHING',    'triage': 'TRIAGE',
    'score':    'SCORING',        'compose': 'COMPOSE',    'extract': 'EXTRACT',
    'escalate': 'ESCALATE',       'vision': 'VISION',      'simul': 'SIMULATION',
    'abrir':    'ACTION',         'fechar': 'ACTION',       'iniciar': 'ACTION',
    'gerir':    'MANAGE',         'monitoriz': 'MONITOR',   'alert': 'ALERT',
    'auditar':  'AUDIT',          'participar': 'ACTION',   'acompanhar': 'MONITOR',
    'actualiz': 'ACTION',         'publicar': 'PUBLISH',    'redigir': 'COMPOSE',
    'analis':   'ANALYSIS',       'gerar': 'GENERATE',      'import': 'IMPORT',
    'sincroniz':'SYNC',           'certific': 'COMPLIANCE',
  }
  const getTag = (id) => {
    const lower = id.toLowerCase()
    for (const [key, tag] of Object.entries(SKILL_TAGS)) {
      if (lower.includes(key)) return tag
    }
    return 'CORE'
  }
  for (const file of files) {
    try {
      const raw = readFileSync(join(employeeDir, file), 'utf8')
      const meta = JSON.parse(raw)
      for (const skill of (meta.skills || [])) {
        if (!skillsMap.has(skill.id)) {
          skillsMap.set(skill.id, {
            id: skill.id,
            desc: skill.desc || '',
            tag: getTag(skill.id),
            usedBy: [{ id: meta.id, name: meta.name }],
          })
        } else {
          skillsMap.get(skill.id).usedBy.push({ id: meta.id, name: meta.name })
        }
      }
    } catch { /* skip malformed file */ }
  }
  return Array.from(skillsMap.values()).sort((a, b) => a.id.localeCompare(b.id))
}

function parseCompetitors(filePath) {
  const competitors = []
  const content = readFile(filePath)
  if (!content) return competitors
  const blocks = content.split(/\n## /)
  for (const block of blocks.slice(1)) {
    const lines = block.split(/\r?\n/)
    const name = lines[0].trim()
    if (!name || name.startsWith('Estrutura')) continue

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

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

const git = getGitInfo()
const now = new Date().toISOString()

// Ficheiros source
const sprintFile       = join(ROOT, '.claude', 'current', 'current-sprint-state.md')
const verticalsFile    = join(ROOT, '.claude', 'strategy', 'verticals-state.md')
const decisionsFile    = join(ROOT, '.claude', 'current', 'decisions-log.md')
const competitorsFile  = join(ROOT, '.claude', 'strategy', 'competitors.md')
const watchersFile     = join(ROOT, '.claude', 'strategy', 'watchers-state.md')
const opportunitiesFile = join(STATE_DIR, 'opportunities.md')
const stackHealthFile  = join(STATE_DIR, 'stack-health.md')
const activityContent  = readFile(join(STATE_DIR, 'recent-activity.md'))
const triggersContent  = readFile(join(STATE_DIR, 'triggers.md'))

// Executar todos os parsers
const sprintResult      = parseSprint(sprintFile)
const verticalsResult   = parseVerticals(verticalsFile)
const actionsResult     = parseNextActions(opportunitiesFile)
const healthResult      = parseStackHealth(stackHealthFile)
const decisionsResult   = parseDecisions(decisionsFile)
const roadmapResult     = parseRoadmap(sprintFile)
const watchersResult    = parseWatchers(watchersFile)
const agentsResult      = parseAgents()
const employeesResult   = parseEmployees()
const skillsResult      = parseSkills()
const activityResult    = parseActivity(activityContent)
const alertsResult      = parseAlerts(triggersContent)
const competitorsResult = parseCompetitors(competitorsFile)

const data = {
  meta: {
    schemaVersion: '3.0',
    lastSync: now,
    generatedAt: now,
    branch: git.branch,
    worktree: git.worktree,
    generator: 'scripts/dashboard-data-build.js'
  },
  sprint: sprintResult,
  verticals: verticalsResult.verticals,
  _verticalsMeta: {
    _source: verticalsResult._source,
    _status: verticalsResult._status,
    _error: verticalsResult._error
  },
  alerts: alertsResult,
  nextActions: actionsResult.nextActions,
  _nextActionsMeta: {
    _source: actionsResult._source,
    _status: actionsResult._status,
    _error: actionsResult._error
  },
  techStack: TECH_STACK,
  stackHealth: healthResult.stackHealth,
  _stackHealthMeta: {
    _source: healthResult._source,
    _status: healthResult._status,
    _error: healthResult._error
  },
  watchers: watchersResult,
  agents: agentsResult,
  employees: employeesResult,
  skills: skillsResult,
  recentActivity: activityResult.slice(0, 20),
  decisions: decisionsResult.decisions,
  _decisionsMeta: {
    _source: decisionsResult._source,
    _status: decisionsResult._status,
    _error: decisionsResult._error
  },
  roadmap: roadmapResult.roadmap,
  _roadmapMeta: {
    _source: roadmapResult._source,
    _status: roadmapResult._status,
    _error: roadmapResult._error
  },
  competitors: competitorsResult,
  ourProduct: OUR_PRODUCT,
  featureMatrix: FEATURE_MATRIX
}

writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf8')

const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(data, null, 2)) / 1024)

// Log de auditoria com status por secção
const sections = [
  { name: 'Sprint',       status: sprintResult._status,      n: sprintResult._status === 'live' ? 1 : 0 },
  { name: 'Verticals',    status: verticalsResult._status,   n: verticalsResult.verticals?.length || 0 },
  { name: 'NextActions',  status: actionsResult._status,     n: actionsResult.nextActions?.length || 0 },
  { name: 'StackHealth',  status: healthResult._status,      n: healthResult.stackHealth?.length || 0 },
  { name: 'Decisions',    status: decisionsResult._status,   n: decisionsResult.decisions?.length || 0 },
  { name: 'Roadmap',      status: roadmapResult._status,     n: roadmapResult.roadmap?.length || 0 },
  { name: 'Watchers',     status: 'live',                    n: watchersResult.length },
  { name: 'Agents',       status: 'live',                    n: agentsResult.length },
  { name: 'Employees',    status: 'live',                    n: employeesResult.length },
  { name: 'Skills',       status: 'live',                    n: skillsResult.length },
  { name: 'Activity',     status: 'live',                    n: activityResult.length },
  { name: 'Alerts',       status: 'live',                    n: alertsResult.length },
  { name: 'Competitors',  status: 'live',                    n: competitorsResult.length },
  { name: 'TechStack',    status: 'hardcoded',               n: TECH_STACK.length },
  { name: 'OurProduct',   status: 'hardcoded',               n: 1 },
  { name: 'FeatureMatrix',status: 'hardcoded',               n: FEATURE_MATRIX.length },
]

console.log(`\ndata.json escrito em ${OUTPUT}`)
console.log(`  Schema: v${data.meta.schemaVersion} | Tamanho: ~${sizeKB}KB`)
console.log(`\n  Auditoria de secções:`)
for (const s of sections) {
  const icon = s.status === 'live' ? '✓' : s.status === 'hardcoded' ? 'H' : s.status === 'partial' ? '~' : '✗'
  const errStr = (s.status === 'missing' || s.status === 'error') ? ` ERROR: ${s.error || '?'}` : ''
  console.log(`  [${icon}] ${s.name.padEnd(14)} ${s.status.padEnd(10)} n=${s.n}${errStr}`)
}

if (sizeKB > 100) console.warn(`\n  AVISO: data.json acima de 100KB (${sizeKB}KB)`)
