/* calendar-create v1
 *
 * POST { staff_id, calendar_id?, summary, description?, location?,
 *        start_iso, end_iso, timezone?, attendees?, send_updates? }
 *
 * Cria evento no Google Calendar do staff via OAuth.
 * calendar_id default: "primary"
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
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type:    "refresh_token",
    }),
  })
  const j: any = await refreshRes.json()
  if (!refreshRes.ok) throw new Error(`Refresh failed: ${JSON.stringify(j)}`)

  const newToken = j.access_token
  const expiresAt = new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString()
  await sb.schema("system").from("google_oauth_tokens")
    .update({ access_token: newToken, expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq("staff_id", staffId)
  return newToken
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const body = await req.json()
    const staff_id     = body.staff_id || "mariocarvalho.biz@gmail.com"
    const calendar_id  = body.calendar_id || "primary"
    const summary      = body.summary
    const description  = body.description || ""
    const location     = body.location || ""
    const start_iso    = body.start_iso
    const end_iso      = body.end_iso
    const timezone     = body.timezone || "Europe/Lisbon"
    const attendees    = body.attendees || []
    const send_updates = body.send_updates || "none"  // none | all | externalOnly

    if (!summary || !start_iso || !end_iso) {
      return new Response(JSON.stringify({ error: "summary + start_iso + end_iso required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const accessToken = await getAccessToken(sb, staff_id)

    const event: Record<string, unknown> = {
      summary,
      description,
      location,
      start: { dateTime: start_iso, timeZone: timezone },
      end:   { dateTime: end_iso,   timeZone: timezone },
    }
    if (Array.isArray(attendees) && attendees.length > 0) {
      event.attendees = attendees.map((email: string) => ({ email }))
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events?sendUpdates=${send_updates}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    })
    const json: any = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "calendar_create_failed", detail: json }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      event_id: json.id,
      html_link: json.htmlLink,
      start: json.start, end: json.end,
      summary: json.summary,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
