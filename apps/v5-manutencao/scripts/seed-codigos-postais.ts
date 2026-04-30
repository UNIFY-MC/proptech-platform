/**
 * seed-codigos-postais.ts
 * Sprint 1B.4 — importar CSV de códigos postais para core.codigos_postais
 *
 * Pré-requisitos:
 *   1. SQL migration 202604301400_codigos_postais_e_weather.sql aplicada
 *   2. SUPABASE_SERVICE_ROLE_KEY adicionada ao .env.local (sem prefixo VITE_)
 *   3. CSV em apps/v5-manutencao/data/codigos_postais_pt_v2.csv
 *
 * Uso:
 *   npm run seed:cp                      — importa PT (para se já tiver dados)
 *   npm run seed:cp:force                — limpa e reimporta PT
 *   tsx scripts/seed-codigos-postais.ts --country=PT --force
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

config({ path: join(ROOT, '.env.local') })

// ─── Config ───────────────────────────────────────────────────────────────

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('❌  VITE_SUPABASE_URL não encontrado em .env.local')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY não encontrado em .env.local')
  console.error('    Adiciona manualmente: SUPABASE_SERVICE_ROLE_KEY=<service_role_key>')
  console.error('    (sem prefixo VITE_ — não é exposta ao browser)')
  process.exit(1)
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const FORCE      = process.argv.includes('--force')
const BATCH_SIZE = 5000

// --country=XX (default PT)
const countryArg = process.argv.find(a => a.startsWith('--country='))
const COUNTRY    = countryArg ? countryArg.split('=')[1].toUpperCase() : 'PT'

const CSV_PATH = resolve(ROOT, 'data', 'codigos_postais_pt_v2.csv')

// ─── Tipos ────────────────────────────────────────────────────────────────

interface CpRow {
  pais:              string
  cp_completo:       string
  cp4:               string | null
  cp3:               string | null
  localidade:        string
  designacao_postal: string | null
  admin1:            null
  admin2:            null
  admin3:            null
  coords:            null
  precisao:          null
  source:            string
  source_version:    string
}

// ─── CSV parser (formato V2: codpostal,localidade,designacao) ─────────────

function parseCSV(path: string, country: string): CpRow[] {
  let raw: string
  try {
    raw = readFileSync(path, 'utf-8')
  } catch {
    console.error(`❌  CSV não encontrado: ${path}`)
    console.error('    Coloca o ficheiro exportado do V2 nesse caminho.')
    process.exit(1)
  }

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) {
    console.error('❌  CSV vazio ou sem dados')
    process.exit(1)
  }

  // Detectar delimitador (vírgula ou ponto-e-vírgula)
  const firstLine = lines[0]
  const delim = firstLine.includes(';') ? ';' : ','

  const header = firstLine.split(delim).map(h => h.toLowerCase().trim())
  const colPostal     = header.indexOf('codpostal')
  const colLocalidade = header.indexOf('localidade')
  const colDesignacao = header.indexOf('designacao')

  if (colPostal === -1 || colLocalidade === -1) {
    console.error('❌  Header CSV inválido. Esperado: codpostal, localidade, designacao')
    console.error('    Encontrado:', header.join(', '))
    process.exit(1)
  }

  const rows: CpRow[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delim)
    const cp  = parts[colPostal]?.trim()
    const loc = parts[colLocalidade]?.trim()
    if (!cp || !loc) { skipped++; continue }

    // PT: formato XXXX-XXX → split em cp4 + cp3
    const cp4 = country === 'PT' ? cp.substring(0, 4) : null
    const cp3 = country === 'PT'
      ? (cp.length >= 8 ? cp.substring(5, 8) : cp.substring(5))
      : null

    rows.push({
      pais:              country,
      cp_completo:       cp,
      cp4,
      cp3,
      localidade:        loc,
      designacao_postal: colDesignacao >= 0 ? (parts[colDesignacao]?.trim() || null) : null,
      admin1:            null,
      admin2:            null,
      admin3:            null,
      coords:            null,
      precisao:          null,
      source:            `v2-import-${country.toLowerCase()}`,
      source_version:    new Date().toISOString().substring(0, 10),
    })
  }

  if (skipped > 0) console.warn(`⚠️   ${skipped} linhas ignoradas (cp ou localidade vazio)`)
  return rows
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('─── seed-codigos-postais.ts ─────────────────────────────')
  console.log(`CSV:      ${CSV_PATH}`)
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log(`País:     ${COUNTRY}`)
  console.log(`Force:    ${FORCE}`)
  console.log('')

  // 1. Parse CSV
  console.log(`Importing ${COUNTRY} (source=v2-import-${COUNTRY.toLowerCase()})...`)
  const rows = parseCSV(CSV_PATH, COUNTRY)
  console.log(`✅  Parsed ${rows.length.toLocaleString()} linhas do CSV`)

  // 2. Verificar estado actual para este país
  const { count: existing, error: countErr } = await supa
    .schema('core')
    .from('codigos_postais')
    .select('*', { count: 'exact', head: true })
    .eq('pais', COUNTRY)

  if (countErr) {
    console.error('❌  Erro ao verificar tabela (migration foi aplicada?):', countErr.message)
    process.exit(1)
  }

  if (existing && existing > 0 && !FORCE) {
    console.log(`ℹ️   Tabela já tem ${existing.toLocaleString()} rows para ${COUNTRY}.`)
    console.log('    Usa npm run seed:cp:force para limpar e reimportar.')
    process.exit(0)
  }

  // 3. Force: limpar rows deste país
  if (FORCE && existing && existing > 0) {
    process.stdout.write(`🗑️   Limpando ${existing.toLocaleString()} rows de ${COUNTRY}... `)
    const { error: delErr } = await supa
      .schema('core')
      .from('codigos_postais')
      .delete()
      .eq('pais', COUNTRY)
    if (delErr) {
      console.error('\n❌  Delete falhou:', delErr.message)
      process.exit(1)
    }
    console.log('OK')
  }

  // 4. Batch upsert
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
  let imported = 0
  let failed   = 0

  console.log(`\n📦  Inserindo ${rows.length.toLocaleString()} rows em ${totalBatches} batches de ${BATCH_SIZE}...\n`)

  for (let b = 0; b < totalBatches; b++) {
    const batch = rows.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
    const pct   = Math.round(((b + 1) / totalBatches) * 100)
    process.stdout.write(`\r  Batch ${b + 1}/${totalBatches} (${pct}%)...        `)

    try {
      const { error } = await supa
        .schema('core')
        .from('codigos_postais')
        .upsert(batch, { onConflict: 'pais,cp_completo,localidade', ignoreDuplicates: true })
      if (error) throw error
      imported += batch.length
    } catch (err: any) {
      console.error(`\n  ⚠️  Batch ${b + 1} falhou: ${err?.message ?? err}`)
      failed += batch.length
    }
  }

  console.log('\n')

  // 5. Sumário
  console.log('─── Resultado ───────────────────────────────────────────')
  console.log(`  Importados: ${imported.toLocaleString()}`)
  if (failed > 0) console.warn(`  Falhados:   ${failed.toLocaleString()} ⚠️`)

  // 6. Verificação final
  const { count: finalCount } = await supa
    .schema('core')
    .from('codigos_postais')
    .select('*', { count: 'exact', head: true })
    .eq('pais', COUNTRY)

  console.log(`  DB total:   ${(finalCount ?? 0).toLocaleString()} (${COUNTRY})`)

  if (finalCount === rows.length) {
    console.log('\n✅  Count bate com CSV. Import concluído.')
  } else {
    console.warn(`\n⚠️   Count não bate: CSV=${rows.length}, DB=${finalCount}`)
    console.warn('    Verifica se houve batches falhados acima.')
  }

  // 7. Smoke: verificar as 2 localizações de teste via codigo_postal
  console.log('\n─── Smoke test (lookup por CP) ──────────────────────────')
  for (const cp of ['2500-296', '1950-322']) {
    const { data } = await supa
      .schema('core')
      .from('codigos_postais')
      .select('cp_completo, localidade, source')
      .eq('pais', COUNTRY)
      .eq('cp_completo', cp)
      .limit(1)
      .single()
    if (data) {
      console.log(`  ${cp} → ${data.localidade}  [${data.source}] ✅`)
    } else {
      console.warn(`  ${cp} → NOT FOUND ⚠️`)
    }
  }
}

main().catch(err => {
  console.error('\n❌  Fatal:', err)
  process.exit(1)
})
