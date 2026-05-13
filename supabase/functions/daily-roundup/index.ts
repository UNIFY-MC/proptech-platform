/* daily-roundup v1 — cron 06:00 Lisboa
 * Agrega actividade das últimas 24h cross-vertical e produz um
 * card "Daily Roundup" na system.inbox_items para o utilizador
 * ver de manhã. Idempotente por data (1 roundup por dia).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

type Stats = {
  leads_new:      number
  approvals_open: number
  approvals_done: number
  inbox_unread:   number
  recebimentos_eur: number
  faturas_pending:  number
}

async function gatherStats(sb: ReturnType<typeof createClient>, sinceISO: string): Promise<Stats> {
  const stats: Stats = {
    leads_new: 0, approvals_open: 0, approvals_done: 0,
    inbox_unread: 0, recebimentos_eur: 0, faturas_pending: 0,
  }

  const safe = async <T>(p: Promise<{ count?: number | null, data?: T[] | null, error: unknown }>) => {
    try { return await p } catch { return { count: 0, data: [], error: null } }
  }

  const [
    leads, apprOpen, apprDone, inboxUnread, recebs, faturas,
  ] = await Promise.allSettled([
    safe(sb.schema("growth").from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceISO)),
    safe(sb.schema("system").from("approvals_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")),
    safe(sb.schema("system").from("approvals_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["approved", "rejected"])
      .gte("decided_at", sinceISO)),
    safe(sb.schema("system").from("inbox_items")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .eq("status", "active")),
    safe(sb.schema("core").from("recebimentos")
      .select("valor", { count: "exact" })
      .gte("data_pagamento", sinceISO.slice(0, 10))),
    safe(sb.schema("core").from("faturas")
      .select("id", { count: "exact", head: true })
      .in("estado", ["emitida", "pendente", "vencida"])),
  ])

  if (leads.status       === "fulfilled") stats.leads_new       = (leads.value as { count?: number }).count ?? 0
  if (apprOpen.status    === "fulfilled") stats.approvals_open  = (apprOpen.value as { count?: number }).count ?? 0
  if (apprDone.status    === "fulfilled") stats.approvals_done  = (apprDone.value as { count?: number }).count ?? 0
  if (inboxUnread.status === "fulfilled") stats.inbox_unread    = (inboxUnread.value as { count?: number }).count ?? 0
  if (faturas.status     === "fulfilled") stats.faturas_pending = (faturas.value as { count?: number }).count ?? 0
  if (recebs.status      === "fulfilled") {
    const rows = (recebs.value as { data?: { valor?: number }[] }).data || []
    stats.recebimentos_eur = rows.reduce((acc, r) => acc + Number(r.valor || 0), 0)
  }
  return stats
}

function buildMarkdown(stats: Stats, dateLabel: string): string {
  const lines: string[] = []
  lines.push(`## Resumo de ${dateLabel}`)
  lines.push("")
  lines.push("**Últimas 24h:**")
  lines.push("")
  if (stats.leads_new > 0)       lines.push(`- 📈 **${stats.leads_new}** novos leads (growth)`)
  if (stats.approvals_done > 0)  lines.push(`- ✅ **${stats.approvals_done}** aprovações concluídas`)
  if (stats.approvals_open > 0)  lines.push(`- ⏳ **${stats.approvals_open}** aprovações pendentes`)
  if (stats.recebimentos_eur > 0) lines.push(`- 💶 **${stats.recebimentos_eur.toFixed(0)} €** recebidos`)
  if (stats.faturas_pending > 0) lines.push(`- 🧾 **${stats.faturas_pending}** faturas em aberto`)
  if (stats.inbox_unread > 0)    lines.push(`- 📥 **${stats.inbox_unread}** items inbox por ler`)
  if (lines.length === 4)        lines.push("- Sem actividade significativa.")
  lines.push("")
  lines.push("_Gerado automaticamente às 06:00 Lisboa._")
  return lines.join("\n")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  // Permite GET (cron via pg_cron http) e POST manual
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const sinceISO  = yesterday.toISOString()
  const dateLabel = today.toLocaleDateString("pt-PT", { day: "2-digit", month: "long" })

  // Idempotência: 1 roundup por dia
  const dayKey = today.toISOString().slice(0, 10)
  const { data: existing } = await sb.schema("system").from("inbox_items")
    .select("id")
    .eq("kind", "roundup")
    .gte("created_at", dayKey)
    .limit(1)

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ skipped: "already_exists", id: existing[0].id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  const stats = await gatherStats(sb, sinceISO)
  const summary_md = buildMarkdown(stats, dateLabel)

  const { data: row, error } = await sb.schema("system").from("inbox_items").insert({
    title: `Resumo de ${dateLabel}`,
    kind: "roundup",
    payload: { summary_md, stats, generated_at: today.toISOString() },
    actions: ["create_task_idea", "create_task_employee", "archive"],
    expandable: true,
    source_name: "Daily Roundup",
    status: "active",
  }).select("id").single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ ok: true, id: row?.id, stats }), {
    headers: { ...cors, "Content-Type": "application/json" },
  })
})
