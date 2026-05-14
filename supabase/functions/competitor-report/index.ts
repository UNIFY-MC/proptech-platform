/* competitor-report v1 — análise estruturada de concorrente
 *
 * POST { competitor_url, competitor_name?, vertical?, pages?: [url1, url2, ...] }
 * (alternativa: { source_id } → lê config de watcher_sources)
 *
 * Pipeline:
 *  1. Scrape 1-5 URLs do concorrente (homepage + pricing + features + blog/about)
 *  2. Concatena texto significativo (title + h1 + body excerpts)
 *  3. Anthropic Haiku produz análise estruturada:
 *       { strengths[], weaknesses[], pricing_intel, features_observed[],
 *         features_gaps[], opportunities[], threats[], market_position,
 *         executive_summary }
 *  4. Insert em system.competitor_reports + inbox_item alerta
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL         = "claude-haiku-4-5-20251001"

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}

const VERTICAL_CONTEXTS = `
Property007 — PropTech Portugal multi-vertical:
- V2 Condomínios (PRODUÇÃO prataowners.pt): admin condominial, quotas, faturas, assembleias
- V3 Seguros (planeado): apólices condomínio + fracções, sinistros
- V4 Energia (em construção): simulador tarifas, switching comercializador
- V5 Manutenção (produção parcial): catálogo serviços, ordens, prestadores
- V6 Reabilitação (futuro): fix-and-flip business, casas baratas + obras
- V7 Real Estate (futuro): listings, market intelligence
- V8 Rentals (futuro): short/long-term, gestão imóvel
- V10 Owners Club (futuro): fidelidade cross-vertical
`.trim()

interface PageContent {
  url: string
  title: string
  h1: string
  description: string
  body_excerpt: string
}

async function fetchPage(url: string): Promise<PageContent | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12_000)
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PropTechCompetitorWatcher/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, "text/html")
    if (!doc) return null
    const title = doc.querySelector("title")?.textContent?.trim() || ""
    const h1 = doc.querySelector("h1")?.textContent?.trim() || ""
    const description = doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || ""
    const main = doc.querySelector("main, article, [role='main']") || doc.querySelector("body")
    const body_excerpt = (main?.textContent || "")
      .replace(/\s+/g, " ").trim().slice(0, 1500)
    return { url, title, h1, description, body_excerpt }
  } catch {
    return null
  }
}

async function analyseStructured(competitorName: string, vertical: string | null, pages: PageContent[]) {
  if (!ANTHROPIC_KEY) return null

  const pageDumps = pages.map(p => `
URL: ${p.url}
TITLE: ${p.title}
H1: ${p.h1}
META: ${p.description}
BODY (excerpt):
${p.body_excerpt}
`).join("\n---\n")

  const verticalLine = vertical
    ? `Concorrente directo na vertical ${vertical.toUpperCase()} da Property007.`
    : `Concorrente cross-vertical / sem vertical específica.`

  const prompt = `${VERTICAL_CONTEXTS}

Analisa este concorrente: ${competitorName}
${verticalLine}

CONTEÚDO DOS PÁGINAS:
${pageDumps}

Produz análise competitive intelligence estruturada (estilo SWOT + pricing).
Sê crítico e específico — evita generalidades. Aponta gaps concretos
explorables pela Property007.

Responde APENAS JSON válido (sem markdown), em Português de Portugal:
{
  "strengths":         ["3-5 pontos fortes observáveis (max 120ch cada)"],
  "weaknesses":        ["3-5 pontos fracos observáveis (max 120ch cada)"],
  "pricing_intel": {
    "tier_min":  "€X/mês" | "Free" | null,
    "tier_max":  "€Y/mês" | null,
    "model":     "subscription | one-time | commission | freemium | unclear",
    "notes":     "1 frase sobre estratégia pricing"
  },
  "features_observed": ["5-10 features chave (max 80ch cada)"],
  "features_gaps":     ["3-5 features que NÃO têm e nós podemos ter (max 120ch)"],
  "opportunities":     ["3-5 ações concretas para Property007 (max 150ch)"],
  "threats":           ["2-4 ameaças reais (max 150ch)"],
  "market_position":   "leader | challenger | niche | declining",
  "executive_summary": "1 parágrafo (max 500ch) sintetizando posicionamento competitivo PT-PT"
}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      console.warn(`[competitor-report] anthropic ${res.status}: ${txt.slice(0, 200)}`)
      return null
    }
    const data = await res.json()
    const text = (data.content?.[0]?.text || "").trim()
    const clean = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
    return JSON.parse(clean)
  } catch (e) {
    console.warn("[competitor-report] analyse failed:", e)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const body = await req.json()
    let { competitor_url, competitor_name, vertical, pages, source_id } = body
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // Se source_id: lê config de watcher_sources
    let dbSourceId: string | null = source_id || null
    if (source_id) {
      const { data: src } = await sb.schema("system").from("watcher_sources")
        .select("*").eq("id", source_id).single()
      if (!src) {
        return new Response(JSON.stringify({ error: "source_not_found" }), {
          status: 404, headers: { ...cors, "Content-Type": "application/json" },
        })
      }
      competitor_url = competitor_url || src.config?.url || src.config?.startUrls?.[0]?.url
      competitor_name = competitor_name || src.label
      vertical = vertical || src.vertical
      pages = pages || src.config?.report_pages
    }

    if (!competitor_url) {
      return new Response(JSON.stringify({ error: "competitor_url ou source_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    competitor_name = competitor_name || new URL(competitor_url).hostname

    // Lista de URLs a scrape — homepage + pages opcionais
    const urlsToScrape: string[] = [competitor_url, ...(pages || [])].slice(0, 5)

    const scraped: PageContent[] = []
    for (const u of urlsToScrape) {
      const p = await fetchPage(u)
      if (p) scraped.push(p)
    }
    if (scraped.length === 0) {
      return new Response(JSON.stringify({ error: "all_pages_failed", urls: urlsToScrape }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const analysis = await analyseStructured(competitor_name, vertical || null, scraped)
    if (!analysis) {
      return new Response(JSON.stringify({ error: "ai_analysis_failed" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Insert report
    const { data: report, error: rErr } = await sb.schema("system").from("competitor_reports").insert({
      competitor_name,
      competitor_url,
      vertical: vertical || null,
      source_id: dbSourceId,
      strengths:         analysis.strengths || [],
      weaknesses:        analysis.weaknesses || [],
      pricing_intel:     analysis.pricing_intel || null,
      features_observed: analysis.features_observed || [],
      features_gaps:     analysis.features_gaps || [],
      opportunities:     analysis.opportunities || [],
      threats:           analysis.threats || [],
      market_position:   analysis.market_position || null,
      executive_summary: analysis.executive_summary || null,
      scraped_pages:     scraped.map(p => p.url),
      raw_content:       scraped.map(p => `# ${p.title}\n${p.body_excerpt}`).join("\n\n").slice(0, 5000),
      generated_by:      body.generated_by || "manual",
    }).select("id").single()

    if (rErr) {
      return new Response(JSON.stringify({ error: rErr.message }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Inbox alert
    await sb.schema("system").from("inbox_items").insert({
      title: `Competitor report: ${competitor_name}`,
      body: analysis.executive_summary?.slice(0, 240) || `Relatório de ${competitor_name}`,
      kind: "competitor",
      vertical: vertical || null,
      source: "agent",
      payload: {
        report_id: report?.id,
        competitor_name,
        executive_summary: analysis.executive_summary,
        market_position:   analysis.market_position,
        why_it_matters:    {
          global: analysis.executive_summary,
          ...(vertical ? { [vertical]: analysis.opportunities?.[0] || analysis.threats?.[0] } : {}),
        },
        suggested_mission: analysis.opportunities?.[0] || null,
        primary_vertical:  vertical || null,
        relevance:         analysis.market_position === 'leader' ? 8 : 6,
      },
      source_url: competitor_url,
      source_name: competitor_name,
      actions: ["create_task_idea", "create_task_employee", "open_external", "archive"],
      expandable: true,
      status: "active",
    })

    return new Response(JSON.stringify({
      ok: true,
      report_id: report?.id,
      competitor_name,
      market_position: analysis.market_position,
      pages_scraped: scraped.length,
      summary: analysis.executive_summary,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
