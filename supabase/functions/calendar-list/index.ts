/* calendar-list v1
 *
 * POST { staff_id, calendar_id?, time_min?, time_max?, max_results? }
 *
 * Lista eventos do Google Calendar do staff.
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

async function getAccessToken(sb: any, staffId: string): Promise<string> {
  const { data, error } = await sb.schema("system").from("google_oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("staff_id", staffId)
    .maybeSingle()
  if (error || !data) throw new Error(`No google_oauth_tokens for staff_id=${staffId}`)
  if (new Date(data.expires_at).getTime() > Date.now() + 60_000) return data.access_token

  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: data.refresh_token, grant_type: "refresh_token",
    }),
  })
  const j: any = await refreshRes.json()
  if (!refreshRes.ok) throw new Error(`Refresh failed: ${JSON.stringify(j)}`)
  const newToken = j.access_token
  await sb.schema("system").from("google_oauth_tokens")
    .update({ access_token: newToken, expires_at: new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() })
    .eq("staff_id", staffId)
  return newToken
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const body = await req.json()
    const staff_id    = body.staff_id || "mariocarvalho.biz@gmail.com"
    const calendar_id = body.calendar_id || "primary"
    const time_min    = body.time_min || new Date().toISOString()
    const time_max    = body.time_max || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()  // 30 dias default
    const max_results = body.max_results || 50

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const accessToken = await getAccessToken(sb, staff_id)

    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`)
    url.searchParams.set("timeMin",      time_min)
    url.searchParams.set("timeMax",      time_max)
    url.searchParams.set("maxResults",   String(max_results))
    url.searchParams.set("singleEvents", "true")
    url.searchParams.set("orderBy",      "startTime")

    const res = await fetch(url.toString(), {
      headers: { "Authorization": `Bearer ${accessToken}` },
    })
    const json: any = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "calendar_list_failed", detail: json }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const events = (json.items || []).map((e: any) => ({
      id: e.id,
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: e.start?.dateTime || e.start?.date,
      end:   e.end?.dateTime || e.end?.date,
      html_link: e.htmlLink,
      attendees: e.attendees,
      status: e.status,
    }))

    return new Response(JSON.stringify({ ok: true, count: events.length, events }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
