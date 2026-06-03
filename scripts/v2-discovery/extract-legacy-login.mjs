/* Extract LITERAL HTML+CSS+assets from prataowners.pt login screen.
 *
 * Não invento nada — só extraio o que está no DOM renderizado + computed styles.
 * Output:
 *   docs/v2-migration/legacy-source/login/index.html         — HTML pós-render
 *   docs/v2-migration/legacy-source/login/styles-inline.css  — todos styles inline + <style> tags
 *   docs/v2-migration/legacy-source/login/computed-root.json — getComputedStyle dos elementos chave
 *   docs/v2-migration/legacy-source/login/screenshot.png     — referência visual
 *   docs/v2-migration/legacy-source/login/assets/*           — imagens hero + logos
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../../docs/v2-migration/legacy-source/login')
const ASSETS_DIR = join(OUT_DIR, 'assets')
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
if (!existsSync(ASSETS_DIR)) mkdirSync(ASSETS_DIR, { recursive: true })

async function downloadAsset(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(destPath)
    https.get(url, (resp) => {
      if (resp.statusCode === 301 || resp.statusCode === 302) {
        return downloadAsset(resp.headers.location, destPath).then(resolve, reject)
      }
      if (resp.statusCode !== 200) return reject(new Error(`HTTP ${resp.statusCode}`))
      resp.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', reject)
  })
}

async function main() {
  console.log('Launching headless Chromium…')
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await ctx.newPage()

  console.log('Navigating to https://prataowners.pt/ …')
  await page.goto('https://prataowners.pt/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000) // SPA hydration

  // 1. HTML pós-render (depois do JavaScript ter populado o DOM)
  const html = await page.content()
  writeFileSync(join(OUT_DIR, 'index.html'), html, 'utf8')
  console.log(`  ✓ index.html ${html.length} bytes`)

  // 2. Todos os styles inline + <style> tags
  const styles = await page.evaluate(() => {
    const out = []
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = Array.from(sheet.cssRules || [])
        out.push(`/* ${sheet.href || '<inline>'} */\n` + rules.map(r => r.cssText).join('\n'))
      } catch (e) {
        out.push(`/* ${sheet.href} — CORS blocked */`)
      }
    }
    return out.join('\n\n')
  })
  writeFileSync(join(OUT_DIR, 'styles-inline.css'), styles, 'utf8')
  console.log(`  ✓ styles-inline.css ${styles.length} bytes`)

  // 3. Computed styles dos elementos chave
  const computed = await page.evaluate(() => {
    const grab = (selector) => {
      const el = document.querySelector(selector)
      if (!el) return null
      const cs = window.getComputedStyle(el)
      const props = ['display','position','width','height','background','backgroundImage','backgroundColor','color','fontFamily','fontSize','fontWeight','letterSpacing','padding','margin','border','borderRadius','flexDirection','gridTemplateColumns','gap','textAlign','lineHeight','boxShadow','opacity']
      const out = { selector, classList: Array.from(el.classList), id: el.id || null }
      for (const p of props) out[p] = cs[p]
      return out
    }
    return {
      body:           grab('body'),
      main:           grab('main, [class*="screen"], [id*="login"]'),
      leftHero:       grab('[class*="hero"], [class*="left"], section:first-of-type'),
      rightCard:      grab('[class*="login"], [class*="card"], [class*="right"], section:last-of-type'),
      h1:             grab('h1'),
      h2:             grab('h2'),
      logoBox:        grab('[class*="logo"], img[alt*="PRATA"], img[alt*="logo"]'),
      input:          grab('input[type="email"], input[type="text"]'),
      primaryButton:  grab('button[type="submit"], .btn-primary, [class*="primary"]'),
      footer:         grab('footer'),
    }
  })
  writeFileSync(join(OUT_DIR, 'computed-root.json'), JSON.stringify(computed, null, 2), 'utf8')
  console.log(`  ✓ computed-root.json`)

  // 4. Screenshot full-page
  await page.screenshot({ path: join(OUT_DIR, 'screenshot.png'), fullPage: true })
  console.log(`  ✓ screenshot.png`)

  // 5. Imagens — listar todas + fazer download das principais
  const images = await page.evaluate(() => {
    const out = []
    document.querySelectorAll('img').forEach(img => {
      out.push({ src: img.src, alt: img.alt, width: img.naturalWidth, height: img.naturalHeight })
    })
    // Background images via computed style
    document.querySelectorAll('*').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage
      if (bg && bg !== 'none' && bg.includes('url(')) {
        const match = bg.match(/url\("?([^")]+)"?\)/)
        if (match && !out.find(x => x.src === match[1])) {
          out.push({ src: match[1], alt: 'background', width: null, height: null, isBackground: true })
        }
      }
    })
    return out
  })
  writeFileSync(join(OUT_DIR, 'images.json'), JSON.stringify(images, null, 2), 'utf8')
  console.log(`  ✓ images.json (${images.length} found)`)

  // Download imagens principais (HTTPS only)
  let downloaded = 0
  for (const img of images.slice(0, 20)) {
    if (!img.src.startsWith('https://')) continue
    try {
      const url = new URL(img.src)
      const filename = `${downloaded.toString().padStart(2, '0')}-${url.pathname.split('/').pop() || 'asset'}`.slice(0, 80)
      const destPath = join(ASSETS_DIR, filename)
      await downloadAsset(img.src, destPath)
      console.log(`  ✓ asset ${filename}`)
      downloaded++
    } catch (e) {
      console.warn(`  ✗ failed ${img.src.slice(0, 60)}:`, e.message)
    }
  }
  console.log(`  Total assets: ${downloaded}`)

  // 6. HTML extraído sem scripts (mais limpo para ler)
  const cleanHtml = await page.evaluate(() => {
    const clone = document.documentElement.cloneNode(true)
    clone.querySelectorAll('script').forEach(s => s.remove())
    return '<!DOCTYPE html>\n' + clone.outerHTML
  })
  writeFileSync(join(OUT_DIR, 'index-no-scripts.html'), cleanHtml, 'utf8')
  console.log(`  ✓ index-no-scripts.html ${cleanHtml.length} bytes`)

  await browser.close()
  console.log(`\nDone. Output: ${OUT_DIR}`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
