/* gmail-action v1
 *
 * POST { staff_id, gmail_id, action }
 *   action: archive | trash | untrash | mark_read | mark_unread | junk | unjunk
 *
 * Modifica labels via Gmail API users/me/messages/{id}/modify ou trash.
 * Actualiza também system.email_messages.status quando aplicável.
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

const ACTIONS: Record<string, { add?: string[], remove?: string[], op?: "modify"|"trash"|"untrash", localStatus?: string }> = {
  archive:     { remove: ["INBOX"],                            op: "modify", localStatus: "archived" },
  trash:       {                                               op: "trash",  localStatus: "trashed"  },
  untrash:     {                                               op: "untrash" },
  mark_read:   { remove: ["UNREAD"],                           op: "modify" },
  mark_unread: { add:    ["UNREAD"],                           op: "modify" },
  junk:        { add: ["SPAM"], remove: ["INBOX"],             op: "modify", localStatus: "spam" },
  unjunk:      { remove: ["SPAM"], add: ["INBOX"],             op: "modify" },
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const body = await req.json()
    const staff_id = body.staff_id || "p7.digitall@gmail.com"
    const gmail_id = body.gmail_id || body.external_id
    const action   = body.action

    if (!gmail_id || !action) {
      return new Response(JSON.stringify({ error: "gmail_id + action required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const spec = ACTIONS[action]
    if (!spec) {
      return new Response(JSON.stringify({ error: "unknown_action", valid: Object.keys(ACTIONS) }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const accessToken = await getAccessToken(sb, staff_id)
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "no_token" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    let apiRes: Response
    if (spec.op === "trash") {
      apiRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmail_id}/trash`, {
        method: "POST", headers: { "Authorization": `Bearer ${accessToken}` },
      })
    } else if (spec.op === "untrash") {
      apiRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmail_id}/untrash`, {
        method: "POST", headers: { "Authorization": `Bearer ${accessToken}` },
      })
    } else {
      apiRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmail_id}/modify`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          addLabelIds:    spec.add || [],
          removeLabelIds: spec.remove || [],
        }),
      })
    }

    if (!apiRes.ok) {
      const txt = await apiRes.text()
      return new Response(JSON.stringify({ error: "gmail_api_failed", detail: txt.slice(0, 300) }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Actualizar status local se aplicável
    if (spec.localStatus) {
      await sb.schema("system").from("email_messages")
        .update({ status: spec.localStatus, updated_at: new Date().toISOString() })
        .eq("external_id", gmail_id)
    }

    return new Response(JSON.stringify({ ok: true, action, gmail_id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
