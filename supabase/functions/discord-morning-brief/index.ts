/* discord-morning-brief v1 — Sprint Q2
 *
 * Cron 7am Lisboa → para cada agent activo em system.agent_channels
 * channel_type='discord', envia resumo operacional do dia anterior +
 * tasks needs_human pendentes.
 *
 * Resumo por agent:
 * - Tasks completas ontem (count + 3 últimas)
 * - Tasks needs_human ainda abertas (count + URLs)
 * - 1 highlight de daily_roundup da inbox (se houver)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const APP_URL       = Deno.env.get("APP_URL") || "https://proptech-agentic-ops.vercel.app"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

interface BriefData {
  agent_id: string
  done_yesterday: number
  done_recent: Array<{ id: string; title: string }>
  needs_human: Array<{ id: string; title: string }>
}

async function buildBrief(sb: any, agentId: string): Promise<BriefData> {
  // Tasks completas ontem (UTC day)
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const startOfYesterday = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 0, 0, 0))
  const endOfYesterday   = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 23, 59, 59))

  const { data: doneTasks, count: doneCount } = await sb.schema("system").from("tasks")
    .select("id, title", { count: "exact" })
    .eq("owner_agent_id", agentId)
    .eq("status", "done")
    .gte("updated_at", startOfYesterday.toISOString())
    .lte("updated_at", endOfYesterday.toISOString())
    .order("updated_at", { ascending: false })
    .limit(3)

  const { data: needsHuman } = await sb.schema("system").from("tasks")
    .select("id, title")
    .eq("owner_agent_id", agentId)
    .eq("status", "needs_human")
    .order("updated_at", { ascending: false })
    .limit(5)

  return {
    agent_id: agentId,
    done_yesterday: doneCount || 0,
    done_recent: doneTasks || [],
    needs_human: needsHuman || [],
  }
}

function formatBrief(b: BriefData): string {
  const lines: string[] = []
  lines.push(`☀️ **Daily Brief · ${b.agent_id}** · ${new Date().toLocaleDateString("pt-PT")}`)
  lines.push("")

  if (b.done_yesterday > 0) {
    lines.push(`✅ **${b.done_yesterday} tasks completas ontem**`)
    for (const t of b.done_recent) {
      lines.push(`   • ${t.title.slice(0, 80)}`)
    }
  } else {
    lines.push(`✅ Sem tasks completas ontem.`)
  }

  lines.push("")

  if (b.needs_human.length > 0) {
    lines.push(`👋 **${b.needs_human.length} a aguardar aprovação humana:**`)
    for (const t of b.needs_human) {
      lines.push(`   • [${t.title.slice(0, 70)}](${APP_URL}/tasks/${t.id})`)
    }
  } else {
    lines.push(`👋 Nenhuma task needs_human pendente.`)
  }

  lines.push("")
  lines.push(`Abre o dashboard: ${APP_URL}/tasks`)

  return lines.join("\n")
}

async function sendToDiscord(webhookUrl: string, agentId: string, content: string): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `Property007 · ${agentId}`,
        content: content.slice(0, 2000),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // Channels Discord activos
    const { data: channels } = await sb.schema("system").from("agent_channels")
      .select("agent_id, webhook_url")
      .eq("channel_type", "discord")
      .eq("active", true)

    if (!channels || channels.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "no_active_discord_channels" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const results: any[] = []
    for (const ch of channels) {
      if (!ch.webhook_url) {
        results.push({ agent_id: ch.agent_id, sent: false, reason: "no_webhook" })
        continue
      }
      const brief = await buildBrief(sb, ch.agent_id)
      // Skip if nothing to report
      if (brief.done_yesterday === 0 && brief.needs_human.length === 0) {
        results.push({ agent_id: ch.agent_id, sent: false, reason: "nothing_to_report" })
        continue
      }
      const content = formatBrief(brief)
      const sent = await sendToDiscord(ch.webhook_url, ch.agent_id, content)
      results.push({ agent_id: ch.agent_id, sent, brief_chars: content.length })
      // Rate-limit (sleep 200ms entre envios)
      await new Promise(r => setTimeout(r, 200))
    }

    return new Response(JSON.stringify({
      ok: true,
      channels_processed: channels.length,
      results,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
