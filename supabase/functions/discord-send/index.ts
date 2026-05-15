/* discord-send v1 — Sprint Q2
 *
 * POST { agent_id, content, embeds? }
 *
 * Carrega webhook_url de system.agent_channels onde agent_id=X AND channel_type='discord'
 * Faz POST para Discord webhook.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const { agent_id, content, embeds } = await req.json()
    if (!agent_id || !content) {
      return new Response(JSON.stringify({ error: "agent_id + content required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: channel, error } = await sb.schema("system").from("agent_channels")
      .select("webhook_url, active, display_name")
      .eq("agent_id", agent_id)
      .eq("channel_type", "discord")
      .maybeSingle()

    if (error || !channel) {
      return new Response(JSON.stringify({ error: "no_discord_channel_for_agent", agent_id }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    if (!channel.active || !channel.webhook_url) {
      return new Response(JSON.stringify({ error: "channel_inactive_or_missing_webhook" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Discord webhook payload — usa display_name custom se preenchido, senão fallback
    const username = channel.display_name?.trim()
      ? channel.display_name.trim().slice(0, 80)
      : `Property007 · ${agent_id}`

    const payload: Record<string, unknown> = {
      username,
      content: content.slice(0, 2000),  // Discord limit
    }
    if (embeds && Array.isArray(embeds)) payload.embeds = embeds.slice(0, 10)

    const discordRes = await fetch(channel.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!discordRes.ok) {
      const txt = await discordRes.text()
      return new Response(JSON.stringify({
        error: "discord_post_failed",
        status: discordRes.status,
        detail: txt.slice(0, 200),
      }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({
      ok: true,
      agent_id,
      content_len: content.length,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
