/* gmail-sync-oauth v1
 *
 * Cron-driven: para cada staff em system.google_oauth_tokens, lê emails
 * INBOX (últimos 50 não lidos) via Gmail API e cria rows em
 * system.email_messages (status='received'). Faz dedup por gmail_message_id
 * (guardado em external_id).
 *
 * Não classifica ainda (deferido) — apenas regista. Para auto-reply,
 * `gmail-inbound` continua a ser o handler de webhooks.
 *
 * POST {} ou { staff_id }
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

function extractHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || ""
}

function decodeBase64Url(s: string): string {
  // Gmail returns base64url
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/")
  try { return decodeURIComponent(escape(atob(b64))) } catch { return atob(b64) }
}

function extractBody(payload: any): { text: string, html: string } {
  let text = "", html = ""
  function walk(p: any) {
    if (!p) return
    const mime = p.mimeType || ""
    const data = p.body?.data
    if (data) {
      const decoded = decodeBase64Url(data)
      if (mime === "text/plain" && !text) text = decoded
      if (mime === "text/html"  && !html) html = decoded
    }
    for (const part of (p.parts || [])) walk(part)
  }
  walk(payload)
  return { text, html }
}

async function syncStaff(sb: any, staffId: string): Promise<{ fetched: number, inserted: number, error?: string }> {
  const accessToken = await getAccessToken(sb, staffId)
  if (!accessToken) return { fetched: 0, inserted: 0, error: "no_token_or_refresh_failed" }

  // Listar 25 mensagens mais recentes do INBOX
  const listUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=in:inbox"
  const listRes = await fetch(listUrl, { headers: { "Authorization": `Bearer ${accessToken}` } })
  const listJson: any = await listRes.json()
  if (!listRes.ok) return { fetched: 0, inserted: 0, error: `list_${listRes.status}` }

  const messages = listJson.messages || []
  let inserted = 0

  for (const m of messages) {
    // Verificar se já existe em BD
    const { data: existing } = await sb.schema("system").from("email_messages")
      .select("id").eq("external_id", m.id).maybeSingle()
    if (existing) continue

    // Get full message
    const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    })
    const msg: any = await msgRes.json()
    if (!msgRes.ok) continue

    const headers = msg.payload?.headers || []
    const subject     = extractHeader(headers, "Subject")
    const fromHdr     = extractHeader(headers, "From")
    const toHdr       = extractHeader(headers, "To")
    const ccHdr       = extractHeader(headers, "Cc")
    const messageIdHdr= extractHeader(headers, "Message-ID")
    const dateHdr     = extractHeader(headers, "Date")
    const { text, html } = extractBody(msg.payload)

    // Parse "Nome <email@x.com>" → from_name + from_email
    const fromMatch = fromHdr.match(/^"?([^"<]+?)"?\s*<([^>]+)>$/) || fromHdr.match(/^(.+)$/)
    const fromName  = fromMatch?.[2] ? fromMatch[1].trim() : null
    const fromEmail = fromMatch?.[2] || fromMatch?.[1] || fromHdr

    // To/Cc: split by comma → emails arrays
    const toEmails = toHdr.split(",").map(s => {
      const m = s.match(/<([^>]+)>/) || s.match(/(\S+@\S+)/)
      return m ? m[1].trim() : s.trim()
    }).filter(Boolean)
    const ccEmails = ccHdr ? ccHdr.split(",").map(s => {
      const m = s.match(/<([^>]+)>/) || s.match(/(\S+@\S+)/)
      return m ? m[1].trim() : s.trim()
    }).filter(Boolean) : []

    const { error } = await sb.schema("system").from("email_messages").insert({
      direction:    "inbound",
      external_id:  msg.id,
      thread_id:    msg.threadId,
      message_id:   messageIdHdr || null,
      from_email:   fromEmail,
      from_name:    fromName,
      to_emails:    toEmails,
      cc_emails:    ccEmails,
      subject:      subject || "(sem assunto)",
      body_text:    text.slice(0, 50000),
      body_html:    html.slice(0, 100000),
      body_snippet: (msg.snippet || "").slice(0, 500),
      status:       "received",
      received_at:  dateHdr ? new Date(dateHdr).toISOString() : new Date().toISOString(),
      raw_payload:  { gmail_id: msg.id, labelIds: msg.labelIds },
      staff_id:     staffId,
    })
    if (!error) inserted++
  }

  return { fetched: messages.length, inserted }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    let staff_id: string | undefined
    try { const body = await req.json(); staff_id = body?.staff_id } catch {}

    const staffList = staff_id
      ? [staff_id]
      : ((await sb.schema("system").from("google_oauth_tokens").select("staff_id")).data || []).map((r: any) => r.staff_id)

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
