// ============================================================
// Edge Function: v4-ingest-erse
// Projecto: hkmvszkpxjbxmnixzqbl (V1 Core Hub)
// Schedule: Domingo 03h00 UTC (pg_cron: '0 3 * * 0')
// Auth: service_role (não exposta ao público — verify_jwt=false porque
//       é invocada pelo pg_cron com Authorization header interno)
// Versão: 1.0 — ADR-V4-001
// ============================================================
//
// NOTA SOBRE O PARSER ERSE:
// O site precoenergia.pt não tem API pública documentada. Esta função
// tenta extrair dados via parsing HTML. Se a estrutura HTML mudar,
// a função entra em modo "alerta" — retorna 200 com warning e regista
// em system.inbox_items para revisão manual. Nunca falha silenciosamente.
//
// ESTRATÉGIA DE PARSE:
// 1. Tenta encontrar tabela com class/id relacionado com "tarifa", "preco", "comparador"
// 2. Extrai rows com preços numéricos (regex para padrões €/kWh ou números decimais PT)
// 3. Se < 5 tarifas encontradas → modo alerta (não aborta, regista e retorna warning)
// 4. Hash SHA-256 por tarifa para deduplicação (não reinsere tarifas sem alteração)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SOURCE_URL      = 'https://www.precoenergia.pt/'
const USER_AGENT      = 'PropTech-Platform/1.0 ERSE-Ingest (dados publicos; mario@property007.pt)'

// Tipo de dado extraído do parse ERSE
interface TarifaERSE {
  comercializador_nome: string
  nome_plano: string
  preco_kwh: number
  tipo_oferta: 'fixa' | 'indexada' | 'verde' | 'promocional'
  tensao: 'BTN' | 'BTE'
}

// Calcula SHA-256 de uma string (Deno SubtleCrypto)
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data    = encoder.encode(text)
  const hash    = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Parser HTML — abordagem multi-estratégia com fallback gracioso
// Retorna array de TarifaERSE ou array vazio se não conseguir extrair
function parseTarifasERSE(html: string): TarifaERSE[] {
  const tarifas: TarifaERSE[] = []

  // Estratégia 1: regex para padrões de preço €/kWh em contexto de comercializador
  // Procura padrões como: "0,1289 €/kWh" ou "0.1289 €/kWh" ou "12,89 cêntimos/kWh"
  // precedidos ou seguidos de nome de comercializador conhecido
  const comercializadoresConhecidos = [
    'Eni Plenitude', 'Eni',
    'Luzboa',
    'Ibelectra',
    'Goldenergy',
    'Coopernico', 'Coopernico Verde',
    'Endesa',
    'Galp', 'Galp Power',
    'EDP', 'EDP Comercial',
    'Iberdrola', 'CEME', 'Audax', 'SU Eletricidade',
  ]

  // Padrão de preço: número decimal com vírgula ou ponto (formato PT e EN)
  const precoRegex = /(\d+[,\.]\d{3,6})\s*(?:€\/kWh|eur\/kwh|€\s*\/\s*kWh)/gi

  // Padrão para extrair bloco de comercializador + preço
  // Cobre estruturas tipo: "Eni Plenitude ... 0,1289 €/kWh"
  for (const comercializador of comercializadoresConhecidos) {
    // Escapa caracteres especiais no nome para regex
    const nomeEscapado = comercializador.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Janela de 500 chars à volta do nome do comercializador
    const contextoRegex = new RegExp(
      `${nomeEscapado}.{0,500}?(\\d+[,\\.]\\d{3,6})\\s*(?:€\\/kWh|eur\\/kwh|€\\s*\\/\\s*kWh)`,
      'gi'
    )
    const matches = [...html.matchAll(contextoRegex)]

    for (const match of matches) {
      const precoStr = match[1].replace(',', '.')
      const preco    = parseFloat(precoStr)

      // Validação: preço de electricidade BTN em PT está entre 0.05 e 0.40 €/kWh
      if (preco < 0.05 || preco > 0.40) continue

      // Detectar tipo de oferta por keywords no contexto
      const contexto   = match[0].toLowerCase()
      const tipoOferta = contexto.includes('verde') || contexto.includes('renovav')
        ? 'verde'
        : contexto.includes('index')
          ? 'indexada'
          : contexto.includes('promo')
            ? 'promocional'
            : 'fixa'

      const tensao = contexto.includes('bte') ? 'BTE' : 'BTN'

      // Nome do plano: usa nome do comercializador + tipo
      const nomePlano = `${comercializador} BTN ${tipoOferta.charAt(0).toUpperCase() + tipoOferta.slice(1)} (ERSE)`

      // Evitar duplicados dentro do mesmo parse (mesmo comercializador + preço)
      const jaExiste = tarifas.some(
        t => t.comercializador_nome === comercializador && Math.abs(t.preco_kwh - preco) < 0.0001
      )
      if (!jaExiste) {
        tarifas.push({ comercializador_nome: comercializador, nome_plano: nomePlano, preco_kwh: preco, tipo_oferta: tipoOferta, tensao })
      }
    }
  }

  // Estratégia 2 (fallback): se não encontrou nada com nomes conhecidos,
  // tenta extrair TODOS os padrões de preço €/kWh da página
  if (tarifas.length === 0) {
    const todosPrecos = [...html.matchAll(precoRegex)]
    for (const match of todosPrecos) {
      const precoStr = match[1].replace(',', '.')
      const preco    = parseFloat(precoStr)
      if (preco >= 0.05 && preco <= 0.40) {
        tarifas.push({
          comercializador_nome: 'Desconhecido',
          nome_plano: `Tarifa ERSE ${preco.toFixed(4)} €/kWh`,
          preco_kwh: preco,
          tipo_oferta: 'fixa',
          tensao: 'BTN',
        })
      }
    }
  }

  return tarifas
}

// Handler principal
Deno.serve(async (_req: Request) => {
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    db: { schema: 'public' },
    auth: { persistSession: false },
  })

  const resultadoAudit: Record<string, unknown> = {
    fonte: SOURCE_URL,
    iniciou_em: new Date().toISOString(),
  }

  try {
    // 1. Fetch HTML de precoenergia.pt
    const resp = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-PT,pt;q=0.9',
      },
      signal: AbortSignal.timeout(30_000), // 30s timeout
    })

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText} de precoenergia.pt`)
    }

    const html       = await resp.text()
    const htmlHash   = await sha256(html.slice(0, 50_000)) // hash dos primeiros 50KB
    resultadoAudit.hash_pagina = htmlHash
    resultadoAudit.html_bytes  = html.length

    // 2. Parse tarifas
    const tarifasEncontradas = parseTarifasERSE(html)
    resultadoAudit.tarifas_encontradas_parse = tarifasEncontradas.length

    // 3. Para cada tarifa: lookup comercializador → upsert com hash
    let rows_ingeridas  = 0
    let rows_duplicadas = 0
    const erros_por_tarifa: string[] = []

    for (const t of tarifasEncontradas) {
      // Lookup comercializador por nome (fuzzy: começa com)
      const { data: comercializadores } = await supa
        .schema('v4_energia')
        .from('comercializadores')
        .select('id, nome')
        .ilike('nome', `${t.comercializador_nome}%`)
        .eq('activo', true)
        .limit(1)

      if (!comercializadores || comercializadores.length === 0) {
        erros_por_tarifa.push(`Comercializador não encontrado: ${t.comercializador_nome}`)
        continue
      }

      const comercializadorId = comercializadores[0].id
      const hashInput = `${t.comercializador_nome}|${t.nome_plano}|${t.preco_kwh}|BTN`
      const hash      = await sha256(hashInput)

      // Verificar se hash já existe (deduplicação)
      const { data: existente } = await supa
        .schema('v4_energia')
        .from('tarifas')
        .select('id')
        .eq('hash_conteudo', hash)
        .limit(1)

      if (existente && existente.length > 0) {
        rows_duplicadas++
        continue
      }

      // Desactivar tarifas antigas do mesmo comercializador (mesmo tipo)
      await supa
        .schema('v4_energia')
        .from('tarifas')
        .update({ ativo: false, activa: false, data_fim_validade: new Date().toISOString() })
        .eq('comercializador_id', comercializadorId)
        .eq('tipo_energia', 'electricidade')
        .eq('tipo_tarifa', 'simples')
        .eq('tensao', t.tensao)
        .eq('ativo', true)
        .is('hash_conteudo', null) // só desactiva as inseridas manualmente (sem hash)

      // Inserir nova tarifa
      const { error } = await supa
        .schema('v4_energia')
        .from('tarifas')
        .insert({
          comercializador_id:   comercializadorId,
          nome_plano:           t.nome_plano,
          preco_kwh:            t.preco_kwh,
          tipo_energia:         'electricidade',
          tipo_tarifa:          'simples',
          tipo_oferta:          t.tipo_oferta,
          tensao:               t.tensao,
          periodo_horario:      'simples',
          potencia_kva_min:     1.15,
          potencia_kva_max:     41.4,
          data_inicio_validade: new Date().toISOString(),
          ativo:                true,
          activa:               true,
          fonte_ingestao:       'erse_scraper',
          hash_conteudo:        hash,
          valida_desde:         new Date().toISOString().slice(0, 10),
        })

      if (error) {
        erros_por_tarifa.push(`Insert falhou para ${t.nome_plano}: ${error.message}`)
      } else {
        rows_ingeridas++
      }
    }

    resultadoAudit.rows_ingeridas  = rows_ingeridas
    resultadoAudit.rows_duplicadas = rows_duplicadas
    resultadoAudit.erros           = erros_por_tarifa
    resultadoAudit.terminou_em     = new Date().toISOString()

    // 4. Audit log em core.audit_log
    await supa
      .schema('core')
      .from('audit_log')
      .insert({
        tabela:    'v4_energia.tarifas',
        accao:     'ingest_erse',
        detalhes:  resultadoAudit,
      })

    // 5. Alerta se poucos dados (< 5 = parser provavelmente quebrou)
    const alertaThreshold = tarifasEncontradas.length < 5
    if (alertaThreshold) {
      const mensagem = tarifasEncontradas.length === 0
        ? `ERSE scraper não encontrou tarifas em ${SOURCE_URL}. HTML pode ter mudado. Revisão manual necessária.`
        : `ERSE scraper encontrou apenas ${tarifasEncontradas.length} tarifas (esperado ≥ 5). Verificar ${SOURCE_URL}.`

      await supa
        .schema('system')
        .from('inbox_items')
        .insert({
          tipo:             'alerta',
          titulo:           `ERSE ingest: ${tarifasEncontradas.length} tarifas encontradas`,
          corpo:            mensagem,
          destinatario_tipo: 'staff',
        })
    }

    const statusCode = alertaThreshold ? 200 : 200 // sempre 200 — tolerante a falha de parse
    return new Response(
      JSON.stringify({
        ok: true,
        rows_ingeridas,
        rows_duplicadas,
        tarifas_encontradas_parse: tarifasEncontradas.length,
        alerta: alertaThreshold,
        erros: erros_por_tarifa.length > 0 ? erros_por_tarifa : undefined,
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (err) {
    const mensagemErro = err instanceof Error ? err.message : String(err)
    resultadoAudit.erro_fatal  = mensagemErro
    resultadoAudit.terminou_em = new Date().toISOString()

    // Alerta em inbox_items mesmo em caso de erro fatal (não queremos silêncio)
    try {
      const supa2 = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
      await supa2
        .schema('system')
        .from('inbox_items')
        .insert({
          tipo:             'alerta',
          titulo:           'ERSE ingest falhou com erro fatal',
          corpo:            `Erro: ${mensagemErro}\n\nAudit: ${JSON.stringify(resultadoAudit, null, 2)}`,
          destinatario_tipo: 'staff',
        })
    } catch (_) {
      // Se mesmo o alerta falhar, não há mais o que fazer — o log do Supabase regista
    }

    return new Response(
      JSON.stringify({ ok: false, error: mensagemErro }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
