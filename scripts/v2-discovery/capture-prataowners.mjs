/* V2 Discovery — captura visual prataowners.pt via Playwright
 *
 * Não interage com dados de produção (READ-ONLY navigation).
 * Output: docs/v2-migration/screenshots/*.png + manifest.json com metadata.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../../docs/v2-migration/screenshots')
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const TARGETS = [
  { name: '00-root',         url: 'https://prataowners.pt/',                     waitFor: 'networkidle' },
  { name: '01-login-admin',  url: 'https://prataowners.pt/?view=admin',           waitFor: 'networkidle' },
  { name: '02-portal-cond',  url: 'https://prataowners.pt/?view=cond',            waitFor: 'networkidle' },
  // Hash-based SPA tentativas
  { name: '03-hash-dashboard', url: 'https://prataowners.pt/#dashboard',         waitFor: 'networkidle' },
  { name: '04-hash-portal',    url: 'https://prataowners.pt/#portal',            waitFor: 'networkidle' },
  // Common SPA paths
  { name: '05-path-app',       url: 'https://prataowners.pt/app',                waitFor: 'load',         allow404: true },
]

const captureMeta = []

async function captureOne(page, target) {
  const startedAt = Date.now()
  let response, status, finalUrl, title, errorMsg = null
  try {
    response = await page.goto(target.url, { waitUntil: target.waitFor, timeout: 30000 })
    status = response?.status() ?? 0
    finalUrl = page.url()
    title = await page.title().catch(() => '')
    // Esperar 1s extra para SPA hydration
    await page.waitForTimeout(1500)
  } catch (e) {
    errorMsg = String(e).slice(0, 200)
    status = -1
    finalUrl = target.url
    title = '(error)'
  }

  const screenshotPath = join(OUT_DIR, `${target.name}.png`)
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 10000 })
  } catch (e) {
    errorMsg = (errorMsg ?? '') + ' | screenshot_failed: ' + String(e).slice(0, 100)
  }

  // Capturar HTML resolvido (post-hydration) para análise estática
  let htmlSize = 0
  try {
    const html = await page.content()
    htmlSize = html.length
    writeFileSync(join(OUT_DIR, `${target.name}.html`), html, 'utf8')
  } catch {}

  // Extrair textos visíveis chave: títulos, botões, links
  let visibleTexts = null
  try {
    visibleTexts = await page.evaluate(() => {
      const grab = (sel) => Array.from(document.querySelectorAll(sel))
        .map((el) => el.textContent?.trim() || '').filter(Boolean).slice(0, 30)
      return {
        h1:      grab('h1'),
        h2:      grab('h2'),
        buttons: grab('button'),
        links:   grab('a').filter((t) => t.length > 0 && t.length < 80).slice(0, 20),
        inputs:  Array.from(document.querySelectorAll('input,select,textarea')).map((el) => ({
          type:  el.type || el.tagName.toLowerCase(),
          name:  el.name || el.id || '',
          placeholder: el.placeholder || '',
        })).slice(0, 20),
      }
    })
  } catch {}

  const meta = {
    name: target.name,
    requested_url: target.url,
    final_url: finalUrl,
    http_status: status,
    title,
    html_bytes: htmlSize,
    error: errorMsg,
    duration_ms: Date.now() - startedAt,
    visible_texts: visibleTexts,
  }
  captureMeta.push(meta)
  console.log(`[${meta.http_status}] ${target.name} → ${finalUrl} (${htmlSize}b, ${meta.duration_ms}ms)`)
}

async function main() {
  console.log('Launching Chromium headless…')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 PropTechDiscovery/1.0',
    ignoreHTTPSErrors: false,
  })
  const page = await context.newPage()

  // Log console errors para entender se SPA fails
  page.on('pageerror', (err) => console.warn('  page_error:', String(err).slice(0, 120)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.warn('  console_error:', msg.text().slice(0, 120))
  })

  for (const target of TARGETS) {
    await captureOne(page, target)
  }

  await browser.close()

  // Manifest
  const manifest = {
    captured_at: new Date().toISOString(),
    target_domain: 'prataowners.pt',
    captures: captureMeta,
    summary: {
      total: captureMeta.length,
      ok: captureMeta.filter((c) => c.http_status === 200).length,
      not_found: captureMeta.filter((c) => c.http_status === 404).length,
      errors: captureMeta.filter((c) => c.http_status < 0).length,
    },
  }
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`\nManifest written: ${join(OUT_DIR, 'manifest.json')}`)
  console.log(`Summary: ${manifest.summary.ok} OK, ${manifest.summary.not_found} 404, ${manifest.summary.errors} errors`)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
