/* watcher-competitor v1 — Sprint ζ
 * Cron horário. Para cada watcher_sources com kind=competitor_site e active=true:
 *   - HTTP GET ao URL
 *   - Extrai signal text (title + h1 + meta description + 500 chars body)
 *   - Compara com last_seen_key (hash do signal anterior)
 *   - Se mudou: cria inbox_item kind='competitor' com diff
 *   - Guarda novo hash em last_seen_key
 *
 * Heurística de diff: hash SHA-1 do signal normalizado. Se diferente,
 * fetch IA Anthropic para "why it matters" + "suggested mission".
 * Sem ANTHROPIC_API_KEY → cria item sem IA (só com snapshot diff).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"
import { analyseMultiVertical } from "../_shared/multi-vertical-analyser.ts"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}

interface CompetitorSignal {
  title: string
  h1: string
  description: string
  body_excerpt: string
  raw_length: number
}

async function extractSignal(url: string): Promise<{ signal: CompetitorSignal, hash: string } | null> {
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 15_000)
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PropTechWatcher/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: ctrl.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      console.warn(`[watcher-competitor] HTTP ${res.status} for ${url}`)
      return null
    }
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, "text/html")
    if (!doc) return null

    const title = doc.querySelector("title")?.textContent?.trim() || ""
    const h1 = doc.querySelector("h1")?.textContent?.trim() || ""
    const description = doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || ""

    // Body excerpt: junta texto significativo do main/article/body
    const main = doc.querySelector("main, article, [role='main']") || doc.querySelector("body")
    const bodyText = (main?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800)

    const signal: CompetitorSignal = {
      title, h1, description,
      body_excerpt: bodyText,
      raw_length: html.length,
    }

    // Hash determinístico do signal
    const sig = `${title}|${h1}|${description}|${bodyText}`
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(sig))
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")

    return { signal, hash }
  } catch (e) {
    console.warn(`[watcher-competitor] fetch failed for ${url}:`, e)
    return null
  }
}

// analyseChange agora usa o shared multi-vertical analyser (composto contexto + state)
async function analyseChange(currentSignal: CompetitorSignal, previousSnapshot: CompetitorSignal | null, sourceLabel: string) {
  const diffContent = `Diff de site concorrente "${sourceLabel}":

ANTERIOR:
- title: ${previousSnapshot?.title || "(primeiro snapshot)"}
- h1: ${previousSnapshot?.h1 || "(primeiro snapshot)"}
- description: ${previousSnapshot?.description || "(primeiro snapshot)"}
- body: ${previousSnapshot?.body_excerpt?.slice(0, 400) || ""}

ACTUAL:
- title: ${currentSignal.title}
- h1: ${currentSignal.h1}
- description: ${currentSignal.description}
- body: ${currentSignal.body_excerpt.slice(0, 400)}`

  return await analyseMultiVertical(diffContent, sourceLabel, "diff site concorrente")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: sources, error: sErr } = await sb
    .schema("system").from("watcher_sources")
    .select("*").eq("kind", "competitor_site").eq("active", true)
  if (sErr) {
    return new Response(JSON.stringify({ error: sErr.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const results: { source_id: string, label: string, status: string, hash?: string }[] = []

  for (const src of sources || []) {
    const cfg = src.config || {}
    const url = cfg.url
    if (!url) {
      results.push({ source_id: src.id, label: src.label, status: "no_url" })
      continue
    }

    const fetched = await extractSignal(url)
    if (!fetched) {
      await sb.schema("system").from("watcher_sources").update({ last_run_at: new Date().toISOString() }).eq("id", src.id)
      results.push({ source_id: src.id, label: src.label, status: "fetch_failed" })
      continue
    }

    // Compara hash com last_seen_key
    if (src.last_seen_key === fetched.hash) {
      await sb.schema("system").from("watcher_sources").update({ last_run_at: new Date().toISOString() }).eq("id", src.id)
      results.push({ source_id: src.id, label: src.label, status: "unchanged" })
      continue
    }

    // Mudou! Analisa com IA se possível
    const previousSnapshot = src.config?.last_snapshot || null
    const analysis = await analyseChange(fetched.signal, previousSnapshot, src.label)

    // Cria inbox_item kind='competitor'
    const title = `${src.label}: ${fetched.signal.title || fetched.signal.h1 || "actualização"}`.slice(0, 200)
    const body  = (fetched.signal.description || fetched.signal.body_excerpt || "").slice(0, 240)

    const { error: insErr } = await sb.schema("system").from("inbox_items").insert({
      title,
      body,
      kind: "competitor",
      vertical: src.vertical,
      source: "watcher",
      payload: {
        title: fetched.signal.title,
        summary_md: fetched.signal.description || fetched.signal.body_excerpt,
        body_excerpt: fetched.signal.body_excerpt,
        previous_snapshot: previousSnapshot,
        current_snapshot: fetched.signal,
        hash: fetched.hash,
        previous_hash: src.last_seen_key,
        watcher_source_id: src.id,
        why_it_matters:    analysis?.why_it_matters || null,
        suggested_mission: analysis?.suggested_mission || null,
        primary_vertical:  analysis?.primary_vertical || null,
        relevance:         analysis?.relevance || null,
      },
      source_url: url,
      source_name: src.label,
      actions:    ["create_task_idea", "create_task_employee", "open_external", "archive"],
      expandable: true,
      status: "active",
    })

    if (insErr) {
      results.push({ source_id: src.id, label: src.label, status: `insert_failed:${insErr.message}` })
      continue
    }

    // Update source: novo hash + last_run_at + guarda snapshot actual em config.last_snapshot
    const newConfig = { ...cfg, last_snapshot: fetched.signal }
    await sb.schema("system").from("watcher_sources").update({
      last_seen_key: fetched.hash,
      last_run_at: new Date().toISOString(),
      config: newConfig,
    }).eq("id", src.id)

    results.push({ source_id: src.id, label: src.label, status: "changed", hash: fetched.hash.slice(0, 8) })
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  })
})
