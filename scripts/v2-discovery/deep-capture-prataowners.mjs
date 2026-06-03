/* V2 Discovery — DEEP captura prataowners.pt com auth staff
 *
 * Requer env vars:
 *   STAFF_USER=<utilizador>
 *   STAFF_PASS=<password>
 *
 * Output: docs/v2-migration/screenshots/internal/*.png (.gitignored — pode conter PII)
 *
 * Comportamento:
 *   - LOGIN staff via fluxo "Staff →" + utilizador/password
 *   - Navega cada secção da sidebar admin (7 views)
 *   - Tira screenshot full-page de cada
 *   - Extrai DOM (texts, inputs, buttons, tables) para metadata
 *   - Não faz qualquer write/insert/delete — apenas leituras
 *   - Não persiste credenciais em ficheiros
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../../docs/v2-migration/screenshots/internal')
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const STAFF_USER = process.env.STAFF_USER || ''
const STAFF_PASS = process.env.STAFF_PASS || ''

if (!STAFF_USER || !STAFF_PASS) {
  console.error('FATAL: STAFF_USER + STAFF_PASS env vars required')
  process.exit(2)
}

// Sequência de views admin a navegar (após login)
// Baseado em capturas anteriores: 📊 Prest. Contas, 👥 Condóminos, 🗺️ Mapa Receitas,
// 💶 Recebimentos, 📈 Dívida Actual, 🏠 Fracções, ⚙️ Automações, 👤 Ver como Condómino
const ADMIN_VIEWS = [
  { name: '10-admin-home',          buttonContains: null }, // estado inicial pós-login
  { name: '11-prestacao-contas',    buttonContains: 'Prestação de Contas' },
  { name: '12-condominos',          buttonContains: 'Condóminos' },
  { name: '13-mapa-receitas',       buttonContains: 'Mapa de Receitas' },
  { name: '14-recebimentos',        buttonContains: 'Recebimentos' },
  { name: '15-divida-actual',       buttonContains: 'Dívida Actual' },
  { name: '16-fracoes',             buttonContains: 'Fracções' },
  { name: '17-automacoes',          buttonContains: 'Automações' },
  // 'Ver como Condómino' é toggle, abre fluxo separado → capturar separadamente
  { name: '18-ver-como-condomino',  buttonContains: 'Ver como Condómino' },
]

const captureMeta = []

async function snap(page, name, extraNote = null) {
  const path = join(OUT_DIR, `${name}.png`)
  try {
    await page.screenshot({ path, fullPage: true, timeout: 15000 })
  } catch (e) {
    console.warn(`  screenshot_failed[${name}]:`, String(e).slice(0, 100))
  }

  let info = { name, note: extraNote, error: null }
  try {
    info = {
      ...info,
      title:        await page.title(),
      url:          page.url(),
      h1:           await page.$$eval('h1',  els => els.map(e => e.textContent?.trim()).filter(Boolean).slice(0, 10)),
      h2:           await page.$$eval('h2',  els => els.map(e => e.textContent?.trim()).filter(Boolean).slice(0, 10)),
      h3:           await page.$$eval('h3',  els => els.map(e => e.textContent?.trim()).filter(Boolean).slice(0, 10)),
      table_headers: await page.$$eval('table thead th, table tr:first-child th, table tr:first-child td', els =>
        els.map(e => e.textContent?.trim()).filter(Boolean).slice(0, 30)
      ),
      buttons:      await page.$$eval('button', els =>
        els.map(e => e.textContent?.trim()).filter(t => t && t.length < 80).slice(0, 50)
      ),
      kpi_values:   await page.$$eval(
        '[class*="kpi"],[class*="KPI"],[class*="card-val"],[class*="value"]',
        els => els.map(e => e.textContent?.trim()).filter(t => t && t.length < 50).slice(0, 30)
      ),
      tabs:         await page.$$eval(
        '[role="tab"],[class*="tab"],[data-tab]',
        els => els.map(e => e.textContent?.trim()).filter(t => t && t.length < 60).slice(0, 20)
      ),
    }
  } catch (e) {
    info.error = String(e).slice(0, 200)
  }
  captureMeta.push(info)
  console.log(`  captured: ${name} (h1=${info.h1?.length ?? 0}, h2=${info.h2?.length ?? 0}, btns=${info.buttons?.length ?? 0}, tabs=${info.tabs?.length ?? 0})`)
}

async function clickButtonContaining(page, text) {
  // Click first button whose text contains the given substring (case-insensitive)
  const clicked = await page.evaluate((needle) => {
    const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
    const target = norm(needle)
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [class*="nav"]'))
    for (const b of buttons) {
      if (norm(b.textContent).includes(target)) {
        b.click()
        return b.outerHTML.slice(0, 200)
      }
    }
    return null
  }, text)
  if (!clicked) console.warn(`  click_failed: nothing matches "${text}"`)
  return clicked
}

const HEADLESS = process.env.HEADLESS !== 'false'
const SLOW_MO  = parseInt(process.env.SLOW_MO || '0', 10)

async function main() {
  console.log(`Launching Chromium ${HEADLESS ? 'headless' : 'HEADED (visible window)'}${SLOW_MO ? ` slowMo=${SLOW_MO}ms` : ''}…`)
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36 PropTechDiscovery/1.0',
  })
  const page = await context.newPage()
  page.on('pageerror',     err => console.warn('  page_error:',     String(err).slice(0, 120)))
  page.on('requestfailed', req => console.warn('  request_failed:', req.url().slice(0, 100), req.failure()?.errorText))

  console.log('Navigating to login…')
  await page.goto('https://prataowners.pt/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  await snap(page, '01-login-default', 'Pre-login default view')

  console.log('Clicking "Staff →"…')
  await clickButtonContaining(page, 'Staff')
  await page.waitForTimeout(1500)
  await snap(page, '02-login-staff-form', 'Staff login form')

  console.log('Filling staff credentials via robust selector…')
  // Procura input visível para utilizador staff (qualquer um destes)
  const userSelectors = [
    'input[name="staffUsername"]',
    '#staffUsername',
    'input[placeholder="utilizador"]',
    'input[placeholder*="utilizador" i]',
  ]
  let userOk = false
  for (const sel of userSelectors) {
    try {
      await page.waitForSelector(sel, { state: 'visible', timeout: 2000 })
      await page.fill(sel, STAFF_USER)
      console.log(`  ✓ staffUsername filled via "${sel}"`)
      userOk = true
      break
    } catch {}
  }
  if (!userOk) console.warn('  ✗ staffUsername never visible')

  const passSelectors = [
    'input[name="staffPwd"]',
    '#staffPwd',
    'input[type="password"][placeholder*="•"]',
    'input[type="password"]',
  ]
  let passOk = false
  for (const sel of passSelectors) {
    try {
      await page.waitForSelector(sel, { state: 'visible', timeout: 2000 })
      await page.fill(sel, STAFF_PASS)
      console.log(`  ✓ staffPwd filled via "${sel}"`)
      passOk = true
      break
    } catch {}
  }
  if (!passOk) console.warn('  ✗ staffPwd never visible')

  await page.waitForTimeout(500)
  await snap(page, '02b-login-filled', 'After fill, before submit')

  // Submit: procurar botão Entrar mais próximo dos inputs staff
  const submitted = await page.evaluate(() => {
    const staffInput = document.querySelector('input[name="staffPwd"], #staffPwd, input[type="password"]')
    if (!staffInput) return null
    // Procurar form ancestor + submit
    let form = staffInput.closest('form, .login-card, .login-box, div')
    while (form) {
      const btn = Array.from(form.querySelectorAll('button')).find(b => /entrar/i.test(b.textContent || ''))
      if (btn) { btn.click(); return btn.outerHTML.slice(0, 200) }
      form = form.parentElement
    }
    // Fallback: qualquer botão "Entrar" no DOM
    const btn = Array.from(document.querySelectorAll('button')).find(b => /entrar/i.test(b.textContent || ''))
    if (btn) { btn.click(); return 'fallback:' + btn.outerHTML.slice(0, 200) }
    return null
  })
  console.log('  submit_clicked:', submitted ? 'OK' : 'NO BUTTON FOUND')

  console.log('Waiting for post-login state (5s)…')
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(5000)
  await snap(page, '03-post-login-initial', 'Estado imediatamente após login (admin home)')

  // Tentar tirar screenshot de cada view admin
  for (const view of ADMIN_VIEWS) {
    if (view.buttonContains) {
      console.log(`Navigating to: ${view.buttonContains}`)
      await clickButtonContaining(page, view.buttonContains)
      await page.waitForTimeout(2500) // aguardar render
    }
    await snap(page, view.name, view.buttonContains || 'admin home post-login')
  }

  // Tentar abrir 1 condómino (clicar 1ª linha tabela Condóminos)
  console.log('Trying to open first condómino row…')
  await clickButtonContaining(page, 'Condóminos')
  await page.waitForTimeout(2000)
  const opened = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr')
    if (rows.length > 0) {
      const firstClickable = rows[0].querySelector('a, button') || rows[0]
      firstClickable.click()
      return rows.length
    }
    return 0
  })
  if (opened > 0) {
    await page.waitForTimeout(2500)
    await snap(page, '20-condomino-detail', `1ª linha tabela Condóminos clicada (${opened} rows total)`)
  }

  // Voltar a Prestação de Contas + capturar cada tab interna
  console.log('Navigating tabs of Prestação de Contas…')
  await clickButtonContaining(page, 'Prestação de Contas')
  await page.waitForTimeout(2000)
  const PREST_TABS = [
    { name: '30-prest-visao-geral',         tabText: 'Visão Geral' },
    { name: '31-prest-orc-vs-real',         tabText: 'Orçamento vs Real' },
    { name: '32-prest-orcamento',           tabText: 'Orçamento' },
    { name: '33-prest-orc-por-fracao',      tabText: 'Orçamento por Fração' },
    { name: '34-prest-extrato-bancario',    tabText: 'Extrato Bancário' },
    { name: '35-prest-documentos',          tabText: 'Documentos' },
  ]
  for (const t of PREST_TABS) {
    const clicked = await page.evaluate((needle) => {
      const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
      const target = norm(needle)
      // Procurar entre TODOS elementos com role=tab OR class*=tab OR data-tab OR botões/links com texto exacto
      const candidates = Array.from(document.querySelectorAll('[role="tab"], [class*="tab"], [data-tab], button, a, li'))
      for (const c of candidates) {
        if (norm(c.textContent) === target || norm(c.textContent).endsWith(target)) {
          c.click()
          return c.outerHTML.slice(0, 200)
        }
      }
      return null
    }, t.tabText)
    if (!clicked) console.warn(`  tab not found: ${t.tabText}`)
    await page.waitForTimeout(2200)
    await snap(page, t.name, `Prestação Contas tab: ${t.tabText}${clicked ? '' : ' (click failed)'}`)
  }

  await browser.close()

  const manifestPath = join(OUT_DIR, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify({
    captured_at: new Date().toISOString(),
    auth: 'staff (BOSSMC)',
    notes: 'PII potencial nos screenshots — gitignored',
    captures: captureMeta,
  }, null, 2), 'utf8')
  console.log(`\nManifest: ${manifestPath}`)
  console.log(`Total captures: ${captureMeta.length}`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
