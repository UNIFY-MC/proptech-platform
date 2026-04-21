#!/usr/bin/env node
/**
 * dev-sync.js — Auto-pull do branch remoto a cada 30s.
 * Corre em paralelo com "npm run dev" (Vite recarrega automaticamente).
 *
 * Uso:
 *   Terminal 1: cd apps/v5-manutencao && npm run dev -- --port 5175
 *   Terminal 2: node scripts/dev-sync.js
 *
 * Para outro app:
 *   node scripts/dev-sync.js apps/v4-energia
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const BRANCH   = 'claude/verify-github-v1-setup-EDlNN'
const INTERVAL = 30_000 // ms
const APP_DIR  = process.argv[2] ?? null // optional: 'apps/v5-manutencao'

const ROOT = path.resolve(__dirname, '..')

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts }).trim()
}

function log(msg) {
  const t = new Date().toLocaleTimeString('pt-PT')
  console.log(`[${t}] ${msg}`)
}

function getRemoteHash() {
  run(`git fetch origin ${BRANCH} --quiet`)
  return run(`git rev-parse origin/${BRANCH}`)
}

function getLocalHash() {
  return run('git rev-parse HEAD')
}

function changedFiles() {
  try {
    return run('git diff HEAD@{1} HEAD --name-only')
  } catch {
    return ''
  }
}

async function sync() {
  try {
    const remote = getRemoteHash()
    const local  = getLocalHash()

    if (remote === local) return

    log(`Novas alterações detectadas → a fazer pull...`)
    run(`git pull origin ${BRANCH} --quiet`, { stdio: 'inherit' })

    const changed = changedFiles()

    // Re-install if package.json changed in target app (or any app)
    const appsToInstall = []
    if (APP_DIR && changed.includes(`${APP_DIR}/package.json`)) {
      appsToInstall.push(APP_DIR)
    } else if (!APP_DIR) {
      const matches = [...changed.matchAll(/^(apps\/[^/]+)\/package\.json$/gm)]
      matches.forEach(m => appsToInstall.push(m[1]))
    }

    for (const dir of appsToInstall) {
      const full = path.join(ROOT, dir)
      if (fs.existsSync(full)) {
        log(`Dependências alteradas em ${dir} → npm install...`)
        execSync('npm install', { cwd: full, stdio: 'inherit' })
      }
    }

    log('Pronto! Vite vai recarregar automaticamente no browser.')
  } catch (err) {
    log(`Erro: ${err.message}`)
  }
}

log(`A monitorizar branch: ${BRANCH}`)
log(`Intervalo: ${INTERVAL / 1000}s`)
if (APP_DIR) log(`App: ${APP_DIR}`)
log('─'.repeat(50))

sync()
setInterval(sync, INTERVAL)
