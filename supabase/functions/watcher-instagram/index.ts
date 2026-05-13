/* watcher-instagram v1 — Sprint γ
 * Cron 30min. Para cada watcher_sources com kind=instagram_user e active=true:
 *   - chama Instagram Graph API (/me/media ou /{user_id}/media) com long-lived token
 *   - cria inbox_items kind='instagram' por post novo
 *   - dedup via last_seen_key (post id mais recente)
 *
 * Requer secret IG_GRAPH_TOKEN (long-lived user access token).
 * Para vigiar contas alheias (concorrência) o token tem que ter granted
 * pages_show_list/instagram_basic etc; alternativamente, scraping browser-side.
 * Sem token → skip silencioso.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const IG_TOKEN     = Deno.env.get("IG_GRAPH_TOKEN") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}

interface IgMedia {
  id: string
  caption?: string
  media_type: string  // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_url?: string
  permalink?: string
  thumbnail_url?: string
  timestamp?: string
  username?: string
}

async function fetchMedia(accountId: string): Promise<IgMedia[]> {
  if (!IG_TOKEN) return []
  const url = new URL(`https://graph.facebook.com/v18.0/${accountId}/media`)
  url.searchParams.set("fields", "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username")
  url.searchParams.set("limit", "10")
  url.searchParams.set("access_token", IG_TOKEN)
  const res = await fetch(url.toString())
  if (!res.ok) {
    console.warn(`[watcher-instagram] HTTP ${res.status} for account ${accountId}`)
    return []
  }
  const data = await res.json()
  return data.data || []
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: sources, error: sErr } = await sb
    .schema("system").from("watcher_sources")
    .select("*").eq("kind", "instagram_user").eq("active", true)
  if (sErr) {
    return new Response(JSON.stringify({ error: sErr.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  if (!IG_TOKEN) {
    return new Response(JSON.stringify({
      skipped: "IG_GRAPH_TOKEN_missing",
      sources_count: sources?.length ?? 0,
    }), { headers: { ...cors, "Content-Type": "application/json" } })
  }

  const results: { source_id: string, label: string, new_items: number }[] = []

  for (const src of sources || []) {
    const cfg = src.config || {}
    const accountId = cfg.account_id
    if (!accountId) continue

    const media = await fetchMedia(accountId)
    let newCount = 0
    let firstId: string | null = null

    for (const post of media) {
      if (!firstId) firstId = post.id
      if (src.last_seen_key && post.id === src.last_seen_key) break

      const imgUrl = post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url
      const captionShort = (post.caption || "").slice(0, 140)
      const handle = post.username ? `@${post.username}` : (cfg.handle || "—")

      const { error: insErr } = await sb.schema("system").from("inbox_items").insert({
        title: `${handle} — ${post.media_type}`,
        body:  captionShort,
        kind: "instagram",
        vertical: src.vertical,
        source: "watcher",
        payload: {
          post_id:    post.id,
          caption:    post.caption || null,
          image_url:  imgUrl || null,
          media_type: post.media_type,
          author:     handle,
          published_at: post.timestamp || null,
          watcher_source_id: src.id,
        },
        source_url:  post.permalink || null,
        source_name: handle,
        actions:     ["create_task_idea", "open_external", "archive"],
        expandable:  true,
        status:      "active",
      })
      if (!insErr) newCount++
    }

    if (firstId) {
      await sb.schema("system").rpc("watcher_register_seen", {
        p_source_id: src.id, p_seen_key: firstId,
      })
    } else {
      await sb.schema("system").from("watcher_sources").update({ last_run_at: new Date().toISOString() }).eq("id", src.id)
    }

    results.push({ source_id: src.id, label: src.label, new_items: newCount })
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  })
})
