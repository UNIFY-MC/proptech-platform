/* calendar-sync-oauth v1
 *
 * Cron-driven: para cada staff em system.google_oauth_tokens, lê eventos
 * da Google Calendar API (-7d a +30d) e upsert em system.calendar_events.
 * Marca eventos cancelados/removidos no Google como status='cancelled'.
 *
 * POST {} (sem args, processa todos os staff connectados)
 *      OR { staff_id: "..." } para 1 staff só
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID") || ""
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

async function getAccessToken(sb: any, staffId: string): Promise<string | null> {
  const { data, error } = await sb.schema("system").from("google_oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("staff_id", staffId).maybeSingle()
  if (error || !data) return null
  if (new Date(data.expires_at).getTime() > Date.now() + 60_000) return data.access_token

  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: data.refresh_token, grant_type: "refresh_token",
    }),
  })
  const j: any = await refreshRes.json()
  if (!refreshRes.ok) return null
  await sb.schema("system").from("google_oauth_tokens")
    .update({ access_token: j.access_token, expires_at: new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() })
    .eq("staff_id", staffId)
  return j.access_token
}

async function syncStaff(sb: any, staffId: string): Promise<{ upserted: number, cancelled: number, error?: string }> {
  const accessToken = await getAccessToken(sb, staffId)
  if (!accessToken) return { upserted: 0, cancelled: 0, error: "no_token_or_refresh_failed" }

  const timeMin = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
  url.searchParams.set("timeMin",      timeMin)
  url.searchParams.set("timeMax",      timeMax)
  url.searchParams.set("maxResults",   "250")
  url.searchParams.set("singleEvents", "true")
  url.searchParams.set("orderBy",      "startTime")
  url.searchParams.set("showDeleted",  "true")

  const res = await fetch(url.toString(), { headers: { "Authorization": `Bearer ${accessToken}` } })
  const json: any = await res.json()
  if (!res.ok) return { upserted: 0, cancelled: 0, error: `gcal_${res.status}: ${JSON.stringify(json).slice(0, 200)}` }

  const items = (json.items || []) as any[]
  let upserted = 0, cancelled = 0
  const now = new Date().toISOString()

  for (const e of items) {
    const isCancelled = e.status === "cancelled"
    const startAt = e.start?.dateTime || e.start?.date
    const endAt   = e.end?.dateTime   || e.end?.date

    if (!startAt || !endAt) { continue }  // skip eventos sem data (ex: declined)

    const row = {
      source:      "google_oauth",
      external_id: e.id,
      staff_id:    staffId,
      calendar_id: "primary",
      title:       e.summary || "(sem título)",
      description: e.description || null,
      location:    e.location || null,
      start_at:    startAt,
      end_at:      endAt,
      all_day:     !!e.start?.date,
      attendees:   e.attendees || [],
      status:      e.status || "confirmed",
      raw_payload: e,
      synced_at:   now,
      updated_at:  now,
    }

    const { error } = await sb.schema("system").from("calendar_events").upsert(row, {
      onConflict: "source,staff_id,external_id",
    })
    if (!error) {
      if (isCancelled) cancelled++; else upserted++
    }
  }

  return { upserted, cancelled }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    let staff_id: string | undefined
    try {
      const body = await req.json()
      staff_id = body?.staff_id
    } catch { /* no body, sync all */ }

    let staffList: string[]
    if (staff_id) {
      staffList = [staff_id]
    } else {
      const { data } = await sb.schema("system").from("google_oauth_tokens").select("staff_id")
      staffList = (data || []).map((r: any) => r.staff_id)
    }

    const results = []
    for (const sid of staffList) {
      const r = await syncStaff(sb, sid)
      results.push({ staff_id: sid, ...r })
    }

    return new Response(JSON.stringify({ ok: true, synced: results.length, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
