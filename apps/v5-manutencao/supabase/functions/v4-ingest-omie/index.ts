// ============================================================
// Edge Function: v4-ingest-omie
// Projecto: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
// Schedule: Diário 13h00 UTC (pg_cron: '0 13 * * *')
//   → Após publicação DAM às 12h30 UTC pelo OMIE
// Auth: service_role (não exposta ao público)
// Versão: 1.0 — ADR-V4-001
// ============================================================
//
// FONTE DE DADOS:
// OMIE (Operador do Mercado Ibérico de Energia) publica diariamente
// os preços marginais por hora do Mercado Diário Ibérico (DAM).
//
// Endpoint directo (padrão documentado OMIE):
// https://www.omie.es/sites/default/files/dados/AGNO_{yyyy}/MES_{mm}/TXT/
//   INT_PBC_EV_H_1_{dd}_{mm}_{yyyy}_{dd}_{mm}_{yyyy}.TXT
//
// Formato do ficheiro TXT (separado por ';'):
// Linha 1: cabeçalho descritivo
// Linhas seguintes: Hora;PrecioPT;PrecioES;...
//   Hora: 1-24 (OMIE usa 1-24, nós armazenamos 0-23)
//   PrecioPT: preço em €/MWh
//
// ESTRATÉGIA DE ROBUSTEZ:
// 1. Tenta o ficheiro de hoje (UTC)
// 2. Se não encontrar (DAM ainda não publicado), tenta ontem
// 3. Regista no audit_log qual data foi ingerida
// 4. Alerta em inbox_items se 2 dias consecutivos sem dados
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Constrói URL do ficheiro OMIE DAM para uma data específica
function buildOmieUrl(date: Date): string {
  const dd   = String(date.getUTCDate()).padStart(2, '0')
  const mm   = String(date.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = String(date.getUTCFullYear())
  // Formato OMIE: INT_PBC_EV_H_1_{dd}_{mm}_{yyyy}_{dd}_{mm}_{yyyy}.TXT
  const filename = `INT_PBC_EV_H_1_${dd}_${mm}_${yyyy}_${dd}_${mm}_${yyyy}.TXT`
  return `https://www.omie.es/sites/default/files/dados/AGNO_${yyyy}/MES_${mm}/TXT/${filename}`
}

interface OmieRow {
  data:          string  // YYYY-MM-DD
  hora:          number  // 0-23 (convertido de 1-24)
  preco_eur_mwh: number
  zona:          'PT' | 'ES'
}

// Parser do ficheiro TXT OMIE
// Formato esperado: linhas com "Hora;PrecioPT;PrecioES" (separador ';')
// O OMIE usa vírgula como separador decimal em alguns ficheiros — tratamos ambos
function parseOmieCSV(text: string, date: Date): OmieRow[] {
  const rows: OmieRow[] = []
  const dataStr = date.toISOString().slice(0, 10) // YYYY-MM-DD

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  for (const line of lines) {
    // Ignora linhas de cabeçalho (não começam com número)
    if (!/^\d/.test(line)) continue

    // Separador pode ser ';' ou '\t'
    const parts = line.includes(';') ? line.split(';') : line.split('\t')
    if (parts.length < 2) continue

    // Hora: OMIE usa 1-24, nós armazenamos 0-23
    const horaOmie = parseInt(parts[0].trim(), 10)
    if (isNaN(horaOmie) || horaOmie < 1 || horaOmie > 24) continue
    const hora = horaOmie - 1 // converte 1-24 → 0-23

    // Preço PT (2ª coluna), preço ES (3ª coluna se existir)
    // Normalizar: OMIE usa vírgula como separador decimal
    const precoPtStr = parts[1]?.trim().replace(',', '.')
    const precoEsStr = parts[2]?.trim().replace(',', '.')

    const precoPt = parseFloat(precoPtStr)
    const precoEs = precoEsStr ? parseFloat(precoEsStr) : NaN

    // Validação: preços OMIE estão tipicamente entre -500 e 3000 €/MWh
    if (!isNaN(precoPt) && precoPt >= -500 && precoPt <= 3000) {
      rows.push({ data: dataStr, hora, preco_eur_mwh: precoPt, zona: 'PT' })
    }

    if (!isNaN(precoEs) && precoEs >= -500 && precoEs <= 3000) {
      rows.push({ data: dataStr, hora, preco_eur_mwh: precoEs, zona: 'ES' })
    }
  }

  return rows
}

// Tenta fazer fetch do ficheiro OMIE para uma data, retorna null se não encontrar
async function fetchOmieData(date: Date): Promise<{ rows: OmieRow[]; url: string } | null> {
  const url = buildOmieUrl(date)

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'PropTech-Platform/1.0 OMIE-DAM-Ingest (mario@property007.pt)',
        'Accept': 'text/plain,text/csv,*/*',
      },
      signal: AbortSignal.timeout(30_000),
    })

    if (!resp.ok) {
      // 404 é esperado para datas futuras ou DAM ainda não publicado
      return null
    }

    const text = await resp.text()
    if (text.trim().length < 10) return null // ficheiro vazio

    const rows = parseOmieCSV(text, date)
    return { rows, url }
  } catch (_) {
    return null
  }
}

// Verifica se houve dados nos últimos N dias (para alerta de ausência)
async function diasConsecutivosSemDados(
  supa: ReturnType<typeof createClient>,
  dias: number
): Promise<boolean> {
  const desde = new Date()
  desde.setUTCDate(desde.getUTCDate() - dias)

  const { data } = await supa
    .schema('v4_energia')
    .from('omie_dam_horario')
    .select('data')
    .gte('created_at', desde.toISOString())
    .limit(1)

  return !data || data.length === 0
}

// Handler principal
Deno.serve(async (_req: Request) => {
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    db: { schema: 'public' },
    auth: { persistSession: false },
  })

  const agora = new Date()
  const resultadoAudit: Record<string, unknown> = {
    iniciou_em: agora.toISOString(),
  }

  try {
    // 1. Tenta hoje (UTC) e ontem como fallback
    const hoje   = new Date(agora)
    const ontem  = new Date(agora)
    ontem.setUTCDate(ontem.getUTCDate() - 1)

    let resultado = await fetchOmieData(hoje)
    let dataUsada = hoje

    if (!resultado) {
      resultado = await fetchOmieData(ontem)
      dataUsada = ontem
      resultadoAudit.fallback_ontem = true
    }

    if (!resultado || resultado.rows.length === 0) {
      resultadoAudit.erro = 'Ficheiro OMIE não disponível para hoje nem ontem'
      resultadoAudit.urls_tentadas = [buildOmieUrl(hoje), buildOmieUrl(ontem)]
      resultadoAudit.terminou_em = new Date().toISOString()

      // Verifica se já há 2 dias sem dados → alerta
      const semDados2Dias = await diasConsecutivosSemDados(supa, 2)
      if (semDados2Dias) {
        await supa
          .schema('system')
          .from('inbox_items')
          .insert({
            tipo:             'alerta',
            titulo:           'OMIE DAM: 2 dias sem dados ingeridos',
            corpo:            `Ficheiros não disponíveis em:\n- ${buildOmieUrl(hoje)}\n- ${buildOmieUrl(ontem)}\n\nVerificar endpoint OMIE e formato de URL.`,
            destinatario_tipo: 'staff',
          })
      }

      await supa
        .schema('core')
        .from('audit_log')
        .insert({ tabela: 'v4_energia.omie_dam_horario', accao: 'ingest_omie_falhou', detalhes: resultadoAudit })

      return new Response(
        JSON.stringify({ ok: false, error: 'Ficheiro OMIE não disponível', rows_ingeridas: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    resultadoAudit.url_fonte      = resultado.url
    resultadoAudit.data_ingerida  = dataUsada.toISOString().slice(0, 10)
    resultadoAudit.rows_parse     = resultado.rows.length

    // 2. Upsert em v4_energia.omie_dam_horario (idempotente por UNIQUE data+hora+zona)
    const { data: upsertData, error: upsertError } = await supa
      .schema('v4_energia')
      .from('omie_dam_horario')
      .upsert(resultado.rows, {
        onConflict: 'data,hora,zona',
        ignoreDuplicates: true,
      })
      .select('id')

    if (upsertError) throw new Error(`Upsert falhou: ${upsertError.message}`)

    const rows_ingeridas = upsertData?.length ?? 0
    resultadoAudit.rows_ingeridas = rows_ingeridas
    resultadoAudit.terminou_em    = new Date().toISOString()

    // 3. Audit log
    await supa
      .schema('core')
      .from('audit_log')
      .insert({
        tabela:   'v4_energia.omie_dam_horario',
        accao:    'ingest_omie',
        detalhes: resultadoAudit,
      })

    // 4. Alerta se 0 rows inseridas mas parse retornou dados (pode ser dia duplicado — OK)
    // Só alerta se também não há dados recentes
    if (rows_ingeridas === 0) {
      const semDados = await diasConsecutivosSemDados(supa, 2)
      if (semDados) {
        await supa
          .schema('system')
          .from('inbox_items')
          .insert({
            tipo:             'alerta',
            titulo:           'OMIE DAM: 0 rows novas nos últimos 2 dias',
            corpo:            `Parse retornou ${resultado.rows.length} rows mas nenhuma foi inserida (possível duplicado). Verificar tabela omie_dam_horario.`,
            destinatario_tipo: 'staff',
          })
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        rows_ingeridas,
        rows_parse:    resultado.rows.length,
        data_ingerida: dataUsada.toISOString().slice(0, 10),
        fallback_ontem: resultadoAudit.fallback_ontem ?? false,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const mensagemErro = err instanceof Error ? err.message : String(err)
    resultadoAudit.erro_fatal  = mensagemErro
    resultadoAudit.terminou_em = new Date().toISOString()

    try {
      const supa2 = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
      await supa2
        .schema('system')
        .from('inbox_items')
        .insert({
          tipo:             'alerta',
          titulo:           'OMIE ingest falhou com erro fatal',
          corpo:            `Erro: ${mensagemErro}`,
          destinatario_tipo: 'staff',
        })
    } catch (_) {
      // Se alerta falhar, o log do Supabase regista
    }

    return new Response(
      JSON.stringify({ ok: false, error: mensagemErro }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
