/* gmail-send-google v1
 *
 * POST { staff_id, to, subject, body_text, body_html?, thread_id?, reply_to_message_id? }
 *
 * Envia email via Gmail API (não Resend) usando OAuth do staff.
 * Auto-refresh token se expirado.
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

// Helper: get valid access_token (auto-refresh se expirado)
async function getAccessToken(sb: any, staffId: string): Promise<{ access_token: string, google_email: string }> {
  const { data, error } = await sb.schema("system").from("google_oauth_tokens")
    .select("access_token, refresh_token, expires_at, google_email")
    .eq("staff_id", staffId)
    .maybeSingle()

  if (error || !data) throw new Error(`No google_oauth_tokens for staff_id=${staffId}. Ligue Google primeiro em /integrations.`)

  const isExpired = new Date(data.expires_at).getTime() <= Date.now() + 60_000  // refresh se faltam <60s
  if (!isExpired) return { access_token: data.access_token, google_email: data.google_email }

  // Refresh
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
  const refreshJson: any = await refreshRes.json()
  if (!refreshRes.ok) throw new Error(`Refresh failed: ${JSON.stringify(refreshJson)}`)

  const newAccessToken = refreshJson.access_token
  const expiresIn = refreshJson.expires_in || 3600
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  await sb.schema("system").from("google_oauth_tokens")
    .update({ access_token: newAccessToken, expires_at: newExpiresAt, updated_at: new Date().toISOString() })
    .eq("staff_id", staffId)

  return { access_token: newAccessToken, google_email: data.google_email }
}

function base64UrlEncode(s: string): string {
  // RFC 4648 base64url (substitui +/= -> -_)
  const b64 = btoa(unescape(encodeURIComponent(s)))
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function buildRawMessage(opts: {
  from: string, to: string, subject: string,
  bodyText?: string, bodyHtml?: string,
  replyTo?: string,
}): string {
  const headers: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(opts.subject)))}?=`,
    "MIME-Version: 1.0",
  ]
  if (opts.replyTo) headers.push(`In-Reply-To: ${opts.replyTo}`, `References: ${opts.replyTo}`)

  if (opts.bodyHtml) {
    const boundary = "boundary_" + Math.random().toString(36).slice(2)
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
    const body = [
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      opts.bodyText || "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      opts.bodyHtml,
      `--${boundary}--`,
      "",
    ].join("\r\n")
    return headers.join("\r\n") + "\r\n" + body
  }
  headers.push("Content-Type: text/plain; charset=UTF-8")
  return headers.join("\r\n") + "\r\n\r\n" + (opts.bodyText || "")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const body = await req.json()
    const staff_id    = body.staff_id || "mariocarvalho.biz@gmail.com"
    const to          = body.to
    const subject     = body.subject
    const body_text   = body.body_text
    const body_html   = body.body_html
    const thread_id   = body.thread_id
    const reply_to    = body.reply_to_message_id

    if (!to || !subject || (!body_text && !body_html)) {
      return new Response(JSON.stringify({ error: "to, subject, body_text|body_html required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { access_token, google_email } = await getAccessToken(sb, staff_id)

    const raw = buildRawMessage({ from: google_email, to, subject, bodyText: body_text, bodyHtml: body_html, replyTo: reply_to })
    const rawEncoded = base64UrlEncode(raw)

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEncoded, threadId: thread_id || undefined }),
    })
    const sendJson: any = await sendRes.json()
    if (!sendRes.ok) {
      return new Response(JSON.stringify({ error: "gmail_send_failed", detail: sendJson }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      message_id: sendJson.id,
      thread_id:  sendJson.threadId,
      from:       google_email,
      to,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
