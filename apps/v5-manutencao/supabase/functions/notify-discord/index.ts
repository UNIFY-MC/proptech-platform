// supabase/functions/notify-discord/index.ts
// Sprint B Fase B4 — envia notificação para Discord webhook quando há
// nova approval pending. Trigger: AFTER INSERT em system.approvals_queue.
//
// Deployed in prod (version 1, ACTIVE) via MCP.
// Lookup do URL: system.integrations WHERE slug='discord-webhook' AND enabled=true.

import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", ...CORS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supa = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'system' },
    })

    let body: any
    try { body = await req.json() } catch { return json({ error: "invalid json" }, 400) }
    const payload = body.record || body
    const {
      approval_id, source_agent, action_type, draft_message,
      classification, target_vertical,
    } = payload || {}

    if (!approval_id || !draft_message) {
      return json({ error: "missing approval_id or draft_message" }, 400)
    }

    const { data: integ, error: integErr } = await supa
      .from("integrations").select("config, enabled")
      .eq("slug", "discord-webhook").maybeSingle()

    if (integErr) return json({ error: `lookup: ${integErr.message}` }, 500)
    if (!integ || !integ.enabled) {
      return json({ ok: true, skipped: "discord-webhook integration not enabled" })
    }
    const webhookUrl = integ.config?.webhook_url
    if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      return json({ error: "config.webhook_url missing or invalid" }, 500)
    }

    const urgencia = classification?.urgencia || classification?.tipo || "info"
    const color =
      urgencia === "emergencia" || urgencia === "critical" ? 0xef4444 :
      urgencia === "urgente" || urgencia === "warning"     ? 0xf59e0b :
      0x10b981

    const dashboardUrl = "https://proptech-agentic-ops.vercel.app"

    const discordPayload = {
      username: "Bia (PropTech)",
      embeds: [{
        title: `⚡ Nova approval pending — ${source_agent}`,
        description: draft_message.slice(0, 1800) + (draft_message.length > 1800 ? '…' : ''),
        color,
        fields: [
          { name: "Action", value: action_type, inline: true },
          { name: "Vertical", value: target_vertical || "—", inline: true },
          { name: "Urgência", value: String(urgencia), inline: true },
        ],
        footer: { text: `approval ${approval_id.slice(0, 8)} · decide em ${dashboardUrl}/approvals` },
        timestamp: new Date().toISOString(),
      }],
    }

    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    })

    if (!r.ok) {
      const text = await r.text()
      return json({ error: `discord ${r.status}: ${text.slice(0, 200)}` }, 502)
    }

    return json({ ok: true, approval_id })
  } catch (err: any) {
    console.error("[notify-discord]", err)
    return json({ error: err?.message ?? "internal" }, 500)
  }
})
