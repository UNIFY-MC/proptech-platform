/* apify-run-actor v1 — Sprint η
 * Trigger manual de um actor a partir da UI ou pg_cron.
 * POST { source_id } → arranca o actor com config.input + regista
 * apify_run pending. Webhook callback irá actualizar quando terminar.
 *
 * Configura o webhook na chamada de start:
 *   webhooks: [{ eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
 *                requestUrl: SUPABASE_URL/functions/v1/apify-webhook?source_id=<uuid> }]
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const APIFY_TOKEN  = Deno.env.get("APIFY_TOKEN") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  if (!APIFY_TOKEN) {
    return new Response(JSON.stringify({ error: "APIFY_TOKEN missing — configura em Edge Functions Secrets" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  try {
    const body = await req.json()
    const sourceId: string = body.source_id
    if (!sourceId) {
      return new Response(JSON.stringify({ error: "source_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: src, error: srcErr } = await sb.schema("system").from("watcher_sources")
      .select("*").eq("id", sourceId).single()
    if (srcErr || !src) {
      return new Response(JSON.stringify({ error: "source_not_found", detail: srcErr?.message }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    if (src.kind !== "apify_actor") {
      return new Response(JSON.stringify({ error: "not_an_apify_actor_source" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const cfg = src.config || {}
    const actorId = cfg.actor_id
    const input = cfg.input || {}
    if (!actorId) {
      return new Response(JSON.stringify({ error: "actor_id missing in config" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Webhook callback URL (Apify chama isto quando terminar)
    const callbackUrl = `${SUPABASE_URL}/functions/v1/apify-webhook?source_id=${sourceId}`

    // Slug actor com formato apify~instagram-scraper para URL path
    const actorPath = actorId.replace("/", "~")
    const runUrl = `https://api.apify.com/v2/acts/${actorPath}/runs?token=${APIFY_TOKEN}`

    const runRes = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        webhooks: [
          {
            eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.ABORTED", "ACTOR.RUN.TIMED_OUT"],
            requestUrl: callbackUrl,
          },
        ],
      }),
    })

    if (!runRes.ok) {
      const errText = await runRes.text()
      return new Response(JSON.stringify({ error: `apify_${runRes.status}`, detail: errText.slice(0, 300) }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const runData = await runRes.json()
    const runId = runData.data?.id || runData.id
    const runStatus = runData.data?.status || "RUNNING"

    // Regista run em pending
    await sb.schema("system").from("apify_runs").insert({
      apify_run_id: runId,
      source_id: sourceId,
      actor_id: actorId,
      status: runStatus.toLowerCase(),
      dataset_id: runData.data?.defaultDatasetId || null,
    })

    return new Response(JSON.stringify({
      ok: true,
      run_id: runId,
      status: runStatus,
      dataset_id: runData.data?.defaultDatasetId,
      detail_url: `https://console.apify.com/actors/${actorPath}/runs/${runId}`,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
