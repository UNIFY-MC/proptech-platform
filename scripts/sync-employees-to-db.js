#!/usr/bin/env node
// scripts/sync-employees-to-db.js
//
// Sprint B Fase B1b — sync de .claude/employees/*.meta.json para Supabase
// 7 tabelas no schema `system` (ver ADR-011)
//
// Modo idempotente: corre quantas vezes for preciso. Upsert por slug.
// Usa fetch directo ao PostgREST endpoint com Content-Profile: system header.
//
// Uso:
//   1. Garantir SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em env
//   2. node scripts/sync-employees-to-db.js

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EMPLOYEES_DIR = join(ROOT, '.claude', 'employees')

// ───────── env loader
function loadEnv() {
  let url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    const envPath = join(ROOT, 'apps', 'v5-manutencao', '.env.local')
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf8').split('\n')
      for (const line of lines) {
        const m = line.match(/^([A-Z_]+)=(.+)$/)
        if (!m) continue
        const [_, k, v] = m
        const clean = v.replace(/^["']|["']$/g, '').trim()
        if (k === 'VITE_SUPABASE_URL' && !url) url = clean
        if (k === 'SUPABASE_URL' && !url) url = clean
        if (k === 'SUPABASE_SERVICE_ROLE_KEY' && !key) key = clean
      }
    }
  }

  if (!url || !key) {
    console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios')
    console.error('   Define em shell env ou apps/v5-manutencao/.env.local')
    process.exit(1)
  }
  return { url, key }
}

const { url: SUPABASE_URL, key: SERVICE_KEY } = loadEnv()
const REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`

// ───────── HTTP helpers (PostgREST com Content-Profile: system)
async function rpcInsert(table, payload, conflictCols) {
  const url = `${REST}/${table}` + (conflictCols ? `?on_conflict=${conflictCols}` : '')
  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Content-Profile': 'system',
    'Accept-Profile': 'system',
    'Prefer': conflictCols
      ? 'resolution=merge-duplicates,return=representation'
      : 'return=representation',
  }
  const body = JSON.stringify(Array.isArray(payload) ? payload : [payload])
  const res = await fetch(url, { method: 'POST', headers, body })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${table} ${res.status}: ${text.slice(0, 300)}`)
  }
  try { return JSON.parse(text) } catch { return text }
}

async function selectOne(table, query) {
  const url = `${REST}/${table}?${query}&limit=1`
  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Accept-Profile': 'system',
    'Accept': 'application/json',
  }
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`select ${table}: ${res.status} ${await res.text()}`)
  const arr = await res.json()
  return arr[0] || null
}

// ───────── helpers de inferência
function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function inferEmployeeId(meta) {
  const vMatch = String(meta.vertical || '').match(/v(\d+)/i)
  const v = vMatch ? `v${vMatch[1]}` : 'v0'
  const slug = String(meta.id || meta.name).toLowerCase().replace(/[^a-z0-9_]/g, '_')
  return `${v}.${slug}`
}

function inferCategoryFromSkillId(id) {
  const tagMap = {
    'classify': 'classification', 'match': 'matching', 'triage': 'triage',
    'score': 'scoring', 'compose': 'compose', 'extract': 'extract',
    'escalate': 'escalate', 'vision': 'vision', 'simul': 'simulation',
    'gerir': 'manage', 'monitoriz': 'monitor', 'alert': 'alert',
    'auditar': 'audit', 'publicar': 'publish', 'redigir': 'compose',
    'analis': 'analysis', 'gerar': 'generate', 'import': 'import',
    'sincroniz': 'sync', 'certific': 'compliance', 'verificar': 'audit',
    'identif': 'extract', 'route': 'routing', 'captur': 'extract',
    'briefing': 'compose', 'criar': 'generate', 'personaliz': 'compose',
    'carousel': 'generate', 'publicac': 'publish', 'ocr': 'extract',
  }
  const lower = id.toLowerCase()
  for (const [k, v] of Object.entries(tagMap)) if (lower.includes(k)) return v
  return 'core'
}

function inferIntegrationType(id, name) {
  const all = `${id} ${name}`.toLowerCase()
  if (all.includes('webhook') || (all.includes('cloud') && all.includes('hook'))) return 'webhook'
  if (all.includes('mcp')) return 'mcp'
  if (all.includes('cli')) return 'cli'
  return 'api'
}

function extractCronFromLabel(label) {
  const m = String(label).match(/(\d+\s+\d+\s+\S+\s+\S+\s+\S+)/)
  return m ? m[1] : null
}

// ───────── sync routines (cada uma é idempotente)
async function upsertSkill(skill) {
  const slug = slugify(skill.id)
  const rows = await rpcInsert('skills', {
    name: skill.id,
    slug,
    description: skill.desc || skill.description || null,
    category: inferCategoryFromSkillId(skill.id),
    status: 'active',
  }, 'slug')
  return rows[0].id
}

async function upsertIntegration(integ) {
  const slug = slugify(integ.id)
  const rows = await rpcInsert('integrations', {
    name: integ.name || integ.id,
    slug,
    type: inferIntegrationType(integ.id, integ.name || ''),
    enabled: Boolean(integ.enabled && !integ.planned),
    config: integ.desc ? { description: integ.desc, icon: integ.icon, color: integ.color } : {},
    status: integ.planned ? 'draft' : (integ.enabled ? 'active' : 'draft'),
  }, 'slug')
  return rows[0].id
}

async function upsertRecipe(employeeId, recipe) {
  const slug = slugify(`${employeeId}-${recipe.id}`)
  const triggerMap = { event: 'event', schedule: 'cron', manual: 'manual' }
  const triggerVal = triggerMap[recipe.trigger] || 'manual'
  const cronExpr = triggerVal === 'cron'
    ? extractCronFromLabel(recipe.trigger_label || recipe.source || '')
    : null

  if (triggerVal === 'cron' && !cronExpr) {
    console.warn(`  ⚠ recipe "${recipe.id}" trigger=cron mas sem cron_expr — saltado`)
    return null
  }

  const rows = await rpcInsert('recipes', {
    name: recipe.id,
    slug,
    employee_id: employeeId,
    trigger: triggerVal,
    cron_expr: cronExpr,
    event_pattern: triggerVal === 'event' ? (recipe.source || recipe.trigger_label || null) : null,
    payload_schema: {},
    active: false,
    status: 'active',
  }, 'slug')
  return rows[0].id
}

async function upsertEmployeeSkill(employeeId, skillId) {
  await rpcInsert('employee_skills', {
    employee_id: employeeId, skill_id: skillId,
  }, 'employee_id,skill_id')
}

async function upsertEmployeeIntegration(employeeId, integrationId) {
  await rpcInsert('employee_integrations', {
    employee_id: employeeId, integration_id: integrationId,
  }, 'employee_id,integration_id')
}

// ───────── main
async function main() {
  console.log(`🔄 Sync .meta.json → ${SUPABASE_URL}\n`)

  const files = readdirSync(EMPLOYEES_DIR).filter(f => f.endsWith('.meta.json'))
  console.log(`📁 ${files.length} ficheiros .meta.json encontrados\n`)

  const stats = { employees: 0, skills: 0, recipes: 0, integrations: 0, links: 0, errors: 0 }

  for (const file of files) {
    const path = join(EMPLOYEES_DIR, file)
    let meta
    try { meta = JSON.parse(readFileSync(path, 'utf8')) }
    catch (e) {
      console.log(`❌ ${file}: JSON inválido (${e.message})`)
      stats.errors++
      continue
    }

    const employeeId = inferEmployeeId(meta)
    console.log(`👤 ${meta.name} → ${employeeId}`)

    let okSkills = 0, okIntegs = 0, okRecipes = 0
    try {
      for (const skill of (meta.skills || [])) {
        const skillId = await upsertSkill(skill)
        await upsertEmployeeSkill(employeeId, skillId)
        okSkills++
        stats.skills++; stats.links++
      }
      for (const integ of (meta.integrations || [])) {
        const integId = await upsertIntegration(integ)
        await upsertEmployeeIntegration(employeeId, integId)
        okIntegs++
        stats.integrations++; stats.links++
      }
      for (const recipe of (meta.recipes || [])) {
        const recipeId = await upsertRecipe(employeeId, recipe)
        if (recipeId) { stats.recipes++; okRecipes++ }
      }
      stats.employees++
      console.log(`   ✓ ${okSkills} skills · ${okIntegs} integ · ${okRecipes} recipes`)
    } catch (err) {
      console.log(`   ❌ ${err.message}`)
      stats.errors++
    }
  }

  console.log('\n─── Resumo ───')
  console.log(`Employees:    ${stats.employees}`)
  console.log(`Skills:       ${stats.skills}`)
  console.log(`Integrations: ${stats.integrations}`)
  console.log(`Recipes:      ${stats.recipes}`)
  console.log(`Junctions:    ${stats.links}`)
  console.log(`Erros:        ${stats.errors}`)
  console.log()

  if (stats.errors > 0) process.exit(1)
  console.log('✅ Sync completo')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
