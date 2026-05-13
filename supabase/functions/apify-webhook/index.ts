/* apify-webhook v1 — Sprint η
 * Endpoint que Apify chama quando um actor termina.
 * POST /functions/v1/apify-webhook?source_id=<uuid>
 * Body: { eventType, eventData: { actorRunId, actorId, ... }, resource }
 *
 * Pull do dataset → map → INSERT inbox_items
 * Análise IA Anthropic em cada item para why_it_matters + suggested_mission
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { mapApifyItem, type InboxDraft } from "../_shared/apify-mappers.ts"
import { analyseMultiVertical } from "../_shared/multi-vertical-analyser.ts"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const APIFY_TOKEN   = Deno.env.get("APIFY_TOKEN") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}

async function fetchDatasetItems(datasetId: string): Promise<Record<string, unknown>[]> {
  if (!APIFY_TOKEN) return []
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&limit=50&token=${APIFY_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) {
    console.warn(`[apify-webhook] dataset fetch ${res.status}`)
    return []
  }
  return await res.json()
}

// analyseItem agora usa o shared multi-vertical analyser

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  const url = new URL(req.url)
  const sourceId = url.searchParams.get("source_id")
  if (!sourceId) {
    return new Response(JSON.stringify({ error: "source_id query param required" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const body = await req.json().catch(() => ({}))
  const eventType: string = body.eventType || ""
  const eventData = body.eventData || body.resource || {}
  const actorRunId: string = eventData.actorRunId || eventData.id || ""
  const datasetId: string = eventData.defaultDatasetId || body.resource?.defaultDatasetId || ""
  const status: string = eventData.status || body.resource?.status || "succeeded"

  if (!actorRunId) {
    return new Response(JSON.stringify({ error: "actorRunId not found in payload" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  // Fetch source para saber o mapper + vertical + label
  const { data: src } = await sb.schema("system").from("watcher_sources")
    .select("*").eq("id", sourceId).single()
  if (!src) {
    return new Response(JSON.stringify({ error: "source_not_found", sourceId }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const cfg = src.config || {}
  const mapperKey: string = cfg.output_mapper || "page_content"
  const platform: string = cfg.platform || "web"

  // Upsert apify_run record
  await sb.schema("system").from("apify_runs").upsert({
    apify_run_id: actorRunId,
    source_id: sourceId,
    actor_id: cfg.actor_id || "unknown",
    status: status === "SUCCEEDED" ? "succeeded" : status.toLowerCase(),
    dataset_id: datasetId,
    finished_at: new Date().toISOString(),
  }, { onConflict: "apify_run_id" })

  // Só processamos dataset se actor SUCCEEDED
  if (status !== "SUCCEEDED" && status !== "succeeded") {
    await sb.schema("system").from("watcher_sources").update({ last_run_at: new Date().toISOString() }).eq("id", sourceId)
    return new Response(JSON.stringify({ ok: false, status, message: "actor not succeeded — skip dataset" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  if (!datasetId) {
    return new Response(JSON.stringify({ error: "no_dataset_id" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  // Fetch dataset items
  const items = await fetchDatasetItems(datasetId)
  let imported = 0
  const seenUrls = new Set<string>()

  for (const item of items) {
    const draft = mapApifyItem(item, mapperKey) as InboxDraft | null
    if (!draft) continue

    // Dedup por source_url (alguns datasets têm duplicados)
    if (draft.source_url && seenUrls.has(draft.source_url)) continue
    if (draft.source_url) seenUrls.add(draft.source_url)

    // Check se já existe (dedup global por source_url)
    if (draft.source_url) {
      const { count } = await sb.schema("system").from("inbox_items")
        .select("id", { count: "exact", head: true })
        .eq("source_url", draft.source_url)
      if ((count || 0) > 0) continue
    }

    // Análise IA multi-vertical
    const analyseText = (draft.payload.caption as string) || (draft.payload.summary_md as string) || draft.body || ""
    const analysis = await analyseMultiVertical(analyseText, draft.source_name || src.label, platform)

    if (analysis) {
      draft.payload.why_it_matters    = analysis.why_it_matters
      draft.payload.suggested_mission = analysis.suggested_mission
      draft.payload.primary_vertical  = analysis.primary_vertical
      draft.payload.relevance         = analysis.relevance
    }
    draft.payload.watcher_source_id = sourceId
    draft.payload.apify_run_id      = actorRunId

    const { error } = await sb.schema("system").from("inbox_items").insert({
      ...draft,
      vertical: analysis?.primary_vertical || src.vertical,
    })
    if (!error) imported++
  }

  // Update run com items_imported
  await sb.schema("system").from("apify_runs").update({ items_imported: imported }).eq("apify_run_id", actorRunId)
  await sb.schema("system").from("watcher_sources").update({ last_run_at: new Date().toISOString() }).eq("id", sourceId)

  return new Response(JSON.stringify({ ok: true, imported, total: items.length }), {
    headers: { ...cors, "Content-Type": "application/json" },
  })
})
