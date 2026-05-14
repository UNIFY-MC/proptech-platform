/* feed-synthesize v1 — meta-resumo cross-source
 *
 * POST { since_hours?: 24, max_items?: 30, vertical? }
 *
 * Lê inbox_items kind ∈ {news, instagram, competitor} desde X horas
 * (limite max_items). Anthropic Haiku consolida tudo em:
 *   - meta_summary: tema(s) dominante(s) hoje (1 parágrafo)
 *   - patterns: 3-5 padrões observados (não 1 post — agregação)
 *   - urgent_signals: 0-3 sinais que requerem acção imediata
 *   - watchlist_suggestions: 0-3 sources extra sugeridos
 *
 * Cria 1 inbox_item kind='synthesis' com payload completo
 * + expandable card que sobressai como Daily Roundup.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL         = "claude-haiku-4-5-20251001"

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}

interface ItemDigest {
  title:    string
  kind:     string
  vertical: string | null
  source:   string | null
  url?:     string | null
  why?:     string | null
  date?:    string | null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST" && req.method !== "GET") return new Response("method_not_allowed", { status: 405, headers: cors })

  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {}
  const sinceHours = body.since_hours ?? 24
  const maxItems   = body.max_items ?? 30
  const vertical   = body.vertical || null
  const sinceISO   = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString()

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  // Fetch items recentes
  let q = sb.schema("system").from("inbox_items")
    .select("title, kind, vertical, source, source_url, source_name, payload, created_at")
    .in("kind", ["news", "instagram", "competitor", "alert"])
    .eq("status", "active")
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: false })
    .limit(maxItems)
  if (vertical) q = q.eq("vertical", vertical)
  const { data: items, error: qErr } = await q
  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  if (!items || items.length === 0) {
    return new Response(JSON.stringify({
      ok: false,
      skipped: "no_items",
      message: `Sem items das últimas ${sinceHours}h${vertical ? ` em ${vertical}` : ''}`,
    }), { headers: { ...cors, "Content-Type": "application/json" } })
  }

  const digests: ItemDigest[] = items.map(it => {
    const why = it.payload?.why_it_matters
    const whyText = typeof why === "string" ? why
                  : (why?.global || Object.values(why || {})[0] || null)
    return {
      title:    it.title,
      kind:     it.kind,
      vertical: it.vertical,
      source:   it.payload?.author || it.source_name || it.source,
      url:      it.source_url,
      why:      whyText,
      date:     it.created_at?.slice(0, 16).replace("T", " "),
    }
  })

  // Construir prompt
  const itemsBlock = digests.map((d, i) => `
${i + 1}. [${d.kind}/${d.vertical || "global"}] ${d.title}
   Source: ${d.source || "—"}
   ${d.why ? `Why: ${d.why}` : ""}
   ${d.date ? `When: ${d.date}` : ""}
`).join("\n")

  const VERTICAL_CTX = `Property007 — PropTech Portugal: V2 Condomínios (prod) · V3 Seguros · V4 Energia · V5 Manutenção · V6 Reabilitação · V7 Real Estate · V8 Rentals · V10 Owners Club.`

  const prompt = `${VERTICAL_CTX}

Recebes ${items.length} items capturados nas últimas ${sinceHours}h${vertical ? ` (vertical ${vertical.toUpperCase()})` : ' (cross-vertical)'}:

${itemsBlock}

Tu és a camada de meta-síntese — em vez de ler 30 cards o Mário lê este.
Identifica padrões agregados (não 1 post — agregação de sinais).

Responde APENAS JSON válido (sem markdown), em Português de Portugal:
{
  "meta_summary": "1 parágrafo (max 600ch) com o tema dominante das últimas ${sinceHours}h. Foca no que mudou colectivamente, não em 1 evento isolado.",
  "patterns": [
    "3 a 5 padrões observados em vários items (ex: 'Concorrentes V2 a actualizar pricing simultaneamente — sinal de pressão de mercado')",
    "Cada padrão max 200ch"
  ],
  "urgent_signals": [
    "0 a 3 sinais que requerem acção imediata (max 150ch cada)",
    "Vazio se não houver urgência genuína"
  ],
  "watchlist_suggestions": [
    "0 a 3 sources adicionais que valeria seguir (ex: '@concorrente_x lançou produto V4 hoje — adicionar Apify IG')",
    "Sugestões accionáveis, não vagas"
  ],
  "top_action": "1 acção concreta que o Mário devia fazer hoje (max 150ch)"
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
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return new Response(JSON.stringify({ error: `anthropic_${res.status}`, detail: txt.slice(0, 200) }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const data = await res.json()
    const text = (data.content?.[0]?.text || "").trim()
    const clean = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
    const synthesis = JSON.parse(clean)

    // Inserir inbox_item kind='synthesis' (alargar CHECK pode ser preciso; usamos 'alert' por agora se falhar)
    const summary_md = [
      `## Meta-síntese · últimas ${sinceHours}h`,
      "",
      synthesis.meta_summary,
      "",
      "**Padrões observados:**",
      ...(synthesis.patterns || []).map((p: string) => `- ${p}`),
      "",
      ...(synthesis.urgent_signals?.length ? [
        "**🚨 Sinais urgentes:**",
        ...synthesis.urgent_signals.map((u: string) => `- ${u}`),
        "",
      ] : []),
      ...(synthesis.watchlist_suggestions?.length ? [
        "**👁 Adicionar à watchlist:**",
        ...synthesis.watchlist_suggestions.map((w: string) => `- ${w}`),
        "",
      ] : []),
      ...(synthesis.top_action ? ["**Acção de hoje:**", `- [ ] ${synthesis.top_action}`] : []),
    ].join("\n")

    const { data: row, error: insErr } = await sb.schema("system").from("inbox_items").insert({
      title: `Meta-síntese · ${items.length} items · ${sinceHours}h`,
      body:  synthesis.meta_summary?.slice(0, 240) || "Síntese",
      kind:  "alert",  // usa 'alert' que está no CHECK existente; futuro: kind='synthesis'
      item_type: "alert",
      vertical,
      source: "agent",
      payload: {
        summary_md,
        meta_summary:        synthesis.meta_summary,
        patterns:            synthesis.patterns || [],
        urgent_signals:      synthesis.urgent_signals || [],
        watchlist_suggestions: synthesis.watchlist_suggestions || [],
        top_action:          synthesis.top_action,
        synthesis_type:      "feed",
        items_analysed:      items.length,
        since_hours:         sinceHours,
        why_it_matters:      { global: synthesis.meta_summary },
        suggested_mission:   synthesis.top_action,
        relevance:           synthesis.urgent_signals?.length ? 8 : 6,
        generated_at:        new Date().toISOString(),
      },
      actions: ["create_task_idea", "create_task_employee", "archive"],
      expandable: true,
      source_name: "Synthesize",
      status: "active",
    }).select("id").single()

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message, synthesis }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      synthesis_id: row?.id,
      items_analysed: items.length,
      patterns_count: synthesis.patterns?.length || 0,
      urgent_count: synthesis.urgent_signals?.length || 0,
      meta_summary: synthesis.meta_summary,
      top_action: synthesis.top_action,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
