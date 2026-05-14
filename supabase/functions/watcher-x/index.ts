/* watcher-x v1 — Sprint ζ
 * Cron 30min. Para cada watcher_sources com kind=x_search e active=true:
 *   - Constrói URL RSS via rss.app proxy (config.handle ou config.query)
 *   - Parse RSS XML manualmente (DOMParser não tem text/xml em Deno deploy)
 *   - Cria inbox_items kind='instagram' (mesmo kind para uniformidade visual,
 *     payload.author indica X/Twitter)
 *   - Dedup via last_seen_key (URL do post mais recente)
 *
 * RSS Bridge URL pattern (rss.app):
 *   https://rss.app/feeds/v1.1/<feed_id>.xml  ← cria conta + adiciona handle
 *
 * Alternativa: rsshub.app (auto-hospedável, gratuito):
 *   https://rsshub.app/twitter/user/<handle>
 *
 * O config.rss_url é puxado da source — Mário configura no /influencers
 * com a URL completa do feed. Sem rss_url → skip silencioso.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { analyseMultiVertical } from "../_shared/multi-vertical-analyser.ts"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}

interface RssItem {
  title: string
  link: string
  description: string
  pubDate: string
  guid: string
}

/** Parse RSS XML manualmente (regex). Não é robusto para tudo, mas chega para rss.app e rsshub */
function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) || []
  for (const block of itemBlocks) {
    const extract = (tag: string): string => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
      if (!m) return ""
      // strip CDATA
      let v = m[1].trim()
      const cdata = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
      if (cdata) v = cdata[1]
      return v.trim()
    }
    items.push({
      title:       extract("title"),
      link:        extract("link"),
      description: extract("description"),
      pubDate:     extract("pubDate"),
      guid:        extract("guid") || extract("link"),
    })
  }
  return items.slice(0, 10)
}

/** Strip HTML tags do description */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim()
}

// analyseTweet substituído por analyseMultiVertical (shared module)
// Mantém backwards compat: devolve null se ANTHROPIC_KEY ausente.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: sources, error: sErr } = await sb
    .schema("system").from("watcher_sources")
    .select("*").eq("kind", "x_search").eq("active", true)
  if (sErr) {
    return new Response(JSON.stringify({ error: sErr.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const results: { source_id: string, label: string, new_items: number, status?: string }[] = []

  for (const src of sources || []) {
    const cfg = src.config || {}
    const rssUrl = cfg.rss_url
    if (!rssUrl) {
      results.push({ source_id: src.id, label: src.label, new_items: 0, status: "no_rss_url" })
      continue
    }

    try {
      const res = await fetch(rssUrl, { headers: { "User-Agent": "PropTechWatcher/1.0" } })
      if (!res.ok) {
        results.push({ source_id: src.id, label: src.label, new_items: 0, status: `fetch_${res.status}` })
        continue
      }
      const xml = await res.text()
      const items = parseRss(xml)

      let newCount = 0
      let firstLink: string | null = null
      const handle = cfg.handle || src.label

      for (const item of items) {
        if (!item.link || !item.title) continue
        if (!firstLink) firstLink = item.guid || item.link
        if (src.last_seen_key && (item.guid === src.last_seen_key || item.link === src.last_seen_key)) break

        const cleanText = stripHtml(item.description || item.title)
        const analysis = await analyseMultiVertical(cleanText, handle, "tweet")

        const { error: insErr } = await sb.schema("system").from("inbox_items").insert({
          title: `${handle.startsWith("@") ? handle : "@" + handle} — ${item.title.slice(0, 100)}`,
          body:  cleanText.slice(0, 240),
          kind:  "instagram",
          vertical: analysis?.primary_vertical || src.vertical,
          source: "watcher",
          payload: {
            caption: cleanText,
            author: handle.startsWith("@") ? handle : "@" + handle,
            platform: "x",
            published_at: item.pubDate || null,
            why_it_matters:    analysis?.why_it_matters || null,
            suggested_mission: analysis?.suggested_mission || null,
            primary_vertical:  analysis?.primary_vertical || null,
            relevance:         analysis?.relevance || null,
            watcher_source_id: src.id,
          },
          source_url: item.link,
          source_name: handle.startsWith("@") ? handle : "@" + handle,
          actions: ["create_task_idea", "create_task_employee", "open_external", "archive"],
          expandable: true,
          status: "active",
        })
        if (!insErr) newCount++
      }

      if (firstLink) {
        await sb.schema("system").rpc("watcher_register_seen", {
          p_source_id: src.id, p_seen_key: firstLink,
        })
      } else {
        await sb.schema("system").from("watcher_sources").update({ last_run_at: new Date().toISOString() }).eq("id", src.id)
      }

      results.push({ source_id: src.id, label: src.label, new_items: newCount })

    } catch (e) {
      results.push({ source_id: src.id, label: src.label, new_items: 0, status: `error:${String(e).slice(0, 80)}` })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  })
})
