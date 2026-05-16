/* google-oauth-start v1
 *
 * GET ?staff_id=<email>&return_to=<url>
 *
 * Retorna URL Google OAuth para Mário autorizar acesso a Gmail + Calendar.
 * staff_id é usado como `state` para identificar quem está a autorizar.
 * return_to é guardado no state para redirect final ao dashboard.
 */

const CLIENT_ID    = Deno.env.get("GOOGLE_CLIENT_ID") || ""
const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || ""

const SCOPES = [
  // Tier 1 — Identidade + Gmail + Calendar + Drive/Docs/Sheets + Contactos
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/contacts.readonly",
  // Tier 3 — Marketing (YouTube + Analytics + Search Console + Business Profile)
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/business.manage",
].join(" ")

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  if (!CLIENT_ID || !REDIRECT_URI) {
    return new Response(JSON.stringify({
      error: "GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI not set in Edge Function Secrets",
    }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
  }

  const url = new URL(req.url)
  const staff_id  = url.searchParams.get("staff_id") || "mariocarvalho.biz@gmail.com"
  const return_to = url.searchParams.get("return_to") || ""

  // State: codifica staff_id + return_to em base64 JSON
  const state = btoa(JSON.stringify({ staff_id, return_to }))

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id",     CLIENT_ID)
  authUrl.searchParams.set("redirect_uri",  REDIRECT_URI)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope",         SCOPES)
  authUrl.searchParams.set("access_type",   "offline")    // garante refresh_token
  authUrl.searchParams.set("prompt",        "consent")    // força consent para sempre devolver refresh_token
  authUrl.searchParams.set("state",         state)
  authUrl.searchParams.set("include_granted_scopes", "true")

  // Se request GET de browser, redirect directo. Se POST/JSON, devolve URL no body.
  const wantsJson = req.headers.get("accept")?.includes("application/json") || req.method === "POST"
  if (wantsJson) {
    return new Response(JSON.stringify({ auth_url: authUrl.toString(), state }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
  return Response.redirect(authUrl.toString(), 302)
})
