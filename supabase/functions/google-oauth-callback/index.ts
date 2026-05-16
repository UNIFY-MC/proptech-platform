/* google-oauth-callback v1
 *
 * GET ?code=<auth_code>&state=<base64_json>
 *
 * Google redireciona aqui após Mário autorizar.
 * 1. Troca code por access_token + refresh_token
 * 2. Faz lookup userinfo para confirmar email autorizado
 * 3. Upsert em system.google_oauth_tokens
 * 4. Redirect para return_to (dashboard /integrations)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID") || ""
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || ""
const REDIRECT_URI  = Deno.env.get("GOOGLE_REDIRECT_URI") || ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return new Response("Missing Google OAuth env vars (CLIENT_ID/SECRET/REDIRECT_URI)", {
      status: 500, headers: cors,
    })
  }

  const url = new URL(req.url)
  const code  = url.searchParams.get("code")
  const error = url.searchParams.get("error")
  const stateB64 = url.searchParams.get("state") || ""

  if (error) {
    return new Response(`<html><body><h2>OAuth error: ${error}</h2><p>Volta ao dashboard e tenta de novo.</p></body></html>`, {
      status: 400, headers: { ...cors, "Content-Type": "text/html" },
    })
  }
  if (!code) {
    return new Response("Missing code", { status: 400, headers: cors })
  }

  let state: { staff_id?: string, return_to?: string } = {}
  try { state = JSON.parse(atob(stateB64)) } catch {}
  const staff_id  = state.staff_id || "mariocarvalho.biz@gmail.com"
  const return_to = state.return_to || "/integrations"

  try {
    // 1. Troca code por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    })
    const tokenJson: any = await tokenRes.json()
    if (!tokenRes.ok) {
      return new Response(`<pre>Token exchange failed: ${JSON.stringify(tokenJson, null, 2)}</pre>`, {
        status: 502, headers: { ...cors, "Content-Type": "text/html" },
      })
    }

    const accessToken  = tokenJson.access_token
    const refreshToken = tokenJson.refresh_token || ""
    const expiresIn    = tokenJson.expires_in || 3600
    const scopes       = (tokenJson.scope || "").split(" ").filter(Boolean)
    const expiresAt    = new Date(Date.now() + expiresIn * 1000).toISOString()

    // 2. Userinfo (confirma email)
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { "Authorization": `Bearer ${accessToken}` },
    })
    const userJson: any = await userRes.json()
    const googleEmail = userJson.email || staff_id

    // 3. Upsert em BD
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { error: rpcErr } = await sb.schema("system").rpc("upsert_google_token", {
      p_staff_id:      staff_id,
      p_google_email:  googleEmail,
      p_access_token:  accessToken,
      p_refresh_token: refreshToken,
      p_expires_at:    expiresAt,
      p_scopes:        scopes,
      p_raw:           tokenJson,
    })

    if (rpcErr) {
      return new Response(`<pre>BD upsert failed: ${rpcErr.message}</pre>`, {
        status: 500, headers: { ...cors, "Content-Type": "text/html" },
      })
    }

    // 4. Redirect (return_to do dashboard ou página de sucesso simples)
    const successPage = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Conectado</title>
<style>body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:32px;max-width:480px;text-align:center}
.ok{color:#3fb950;font-size:48px}
h2{margin:8px 0 4px}
p{color:#9198a1;font-size:13px;margin:6px 0}
a{display:inline-block;margin-top:16px;padding:8px 16px;background:#58a6ff;color:#0d1117;text-decoration:none;border-radius:6px;font-weight:600}</style></head>
<body><div class="card">
<div class="ok">✓</div>
<h2>Google conectado</h2>
<p><strong>${googleEmail}</strong></p>
<p>Scopes: gmail.send, gmail.readonly, gmail.modify, calendar</p>
<p>Expira: ${new Date(expiresAt).toLocaleString("pt-PT")}</p>
<a href="${return_to}">Voltar ao dashboard</a>
</div></body></html>`

    return new Response(successPage, {
      headers: { ...cors, "Content-Type": "text/html; charset=utf-8" },
    })

  } catch (e) {
    return new Response(`<pre>Callback error: ${String(e)}</pre>`, {
      status: 500, headers: { ...cors, "Content-Type": "text/html" },
    })
  }
})
