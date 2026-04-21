#!/usr/bin/env node
/**
 * dev-sync.js — Auto-pull do branch main a cada 30s.
 * Corre em paralelo com "npm run dev" (Vite recarrega automaticamente).
 *
 * Uso:
 *   Terminal 1: cd apps/v5-manutencao && npm run dev -- --port 5175
 *   Terminal 2: node scripts/dev-sync.js
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const BRANCH   = 'main'
const INTERVAL = 30_000
const APP_DIR  = process.argv[2] ?? null

const ROOT = path.resolve(__dirname, '..')

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts }).trim()
}

function log(msg) {
  const t = new Date().toLocaleTimeString('pt-PT')
  console.log(`[${t}] ${msg}`)
}

function sync() {
  try {
    run(`git fetch origin ${BRANCH} --quiet`)
    const remote = run(`git rev-parse origin/${BRANCH}`)
    const local  = run('git rev-parse HEAD')

    if (remote === local) return

    log('Novas alterações detectadas → a fazer pull...')
    run(`git pull origin ${BRANCH} --quiet`, { stdio: 'inherit' })

    const changed = (() => { try { return run('git diff HEAD@{1} HEAD --name-only') } catch { return '' } })()

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

    log('Pronto! Vite recarrega automaticamente no browser.')
  } catch (err) {
    log(`Erro: ${err.message}`)
  }
}

log(`A monitorizar branch: ${BRANCH}`)
log(`Intervalo: ${INTERVAL / 1000}s — Vite HMR actualiza o browser automaticamente`)
log('─'.repeat(55))

sync()
setInterval(sync, INTERVAL)
