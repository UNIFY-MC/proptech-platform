/* watcher-news v1 — Sprint γ
 * Cron horário. Para cada watcher_sources com kind=news_query e active=true:
 *   - chama NewsAPI/Mediastack/GNews com a query
 *   - cria inbox_items kind='news' com payload (title, image, url, source, content_md)
 *   - dedup via last_seen_key (URL do artigo mais recente já processado)
 *
 * Requer secret NEWS_API_KEY (NewsAPI.org token). Sem key → no-op silencioso.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const NEWS_API_KEY  = Deno.env.get("NEWS_API_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}

interface Article {
  title: string
  description?: string
  url: string
  urlToImage?: string
  publishedAt?: string
  source?: { name?: string }
  content?: string
}

async function fetchNews(query: string, language = "pt", country = "pt"): Promise<Article[]> {
  if (!NEWS_API_KEY) return []
  const url = new URL("https://newsapi.org/v2/everything")
  url.searchParams.set("q", query)
  url.searchParams.set("language", language)
  url.searchParams.set("sortBy", "publishedAt")
  url.searchParams.set("pageSize", "10")
  url.searchParams.set("apiKey", NEWS_API_KEY)
  const res = await fetch(url.toString())
  if (!res.ok) {
    console.warn(`[watcher-news] HTTP ${res.status} for query "${query}"`)
    return []
  }
  const data = await res.json()
  return data.articles || []
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  // Buscar sources active
  const { data: sources, error: sErr } = await sb
    .schema("system").from("watcher_sources")
    .select("*").eq("kind", "news_query").eq("active", true)
  if (sErr) {
    return new Response(JSON.stringify({ error: sErr.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  if (!NEWS_API_KEY) {
    return new Response(JSON.stringify({
      skipped: "NEWS_API_KEY_missing",
      sources_count: sources?.length ?? 0,
    }), { headers: { ...cors, "Content-Type": "application/json" } })
  }

  const results: { source_id: string, label: string, new_items: number }[] = []

  for (const src of sources || []) {
    const cfg = src.config || {}
    const query = cfg.query
    if (!query) continue

    const articles = await fetchNews(query, cfg.language, cfg.country)
    let newCount = 0
    let firstUrl: string | null = null

    for (const art of articles) {
      if (!art.url || !art.title) continue
      if (!firstUrl) firstUrl = art.url
      // Dedup: paramos quando vemos last_seen_key
      if (src.last_seen_key && art.url === src.last_seen_key) break

      // Insert inbox item
      const summary_md = [
        art.description ? `**${art.description}**` : null,
        art.content || null,
        art.publishedAt ? `_Publicado: ${new Date(art.publishedAt).toLocaleString("pt-PT")}_` : null,
      ].filter(Boolean).join("\n\n")

      const { error: insErr } = await sb.schema("system").from("inbox_items").insert({
        title: art.title.slice(0, 200),
        body:  art.description?.slice(0, 240) || null,
        kind: "news",
        vertical: src.vertical,
        source: "watcher",
        payload: {
          title:      art.title,
          summary_md,
          image_url:  art.urlToImage || null,
          source:     art.source?.name || null,
          published_at: art.publishedAt || null,
          watcher_source_id: src.id,
        },
        source_url:  art.url,
        source_name: art.source?.name || "News",
        actions:     ["create_task_idea", "open_external", "archive"],
        expandable:  true,
        status:      "active",
      })
      if (!insErr) newCount++
    }

    // Update last_seen_key + last_run_at
    if (firstUrl) {
      await sb.schema("system").rpc("watcher_register_seen", {
        p_source_id: src.id, p_seen_key: firstUrl,
      })
    } else {
      // No articles — só actualiza last_run_at
      await sb.schema("system").from("watcher_sources").update({ last_run_at: new Date().toISOString() }).eq("id", src.id)
    }

    results.push({ source_id: src.id, label: src.label, new_items: newCount })
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  })
})
