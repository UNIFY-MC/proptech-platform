/* daily-roundup v2 — Sprint ζ
 * Cron 08:00 Lisboa. Compila:
 *   - leads novos por vertical
 *   - approvals pendentes
 *   - inbox items kind ∈ {news, instagram, competitor} das 24h (por vertical)
 *   - tasks pendentes/com due_at próximo
 *   - faturas pendentes / recebimentos
 *
 * Constrói 1 roundup MASTER (cross-vertical) + opcionalmente roundups
 * por vertical activa (se a vertical teve >=3 items).
 *
 * Cada roundup chama Anthropic Haiku para gerar:
 *   - executive_summary (1 parágrafo PT-PT)
 *   - top_3_actions (lista de check-items concretos)
 *
 * Idempotente por dia (1 roundup master + N verticals por dia).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL         = "claude-haiku-4-5-20251001"

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}

interface Bundle {
  vertical: string | null
  leads_new: number
  approvals_open: number
  approvals_done_24h: number
  faturas_pending: number
  recebimentos_eur_24h: number
  inbox_news: { title: string, url?: string, why?: string }[]
  inbox_instagram: { title: string, author?: string, why?: string }[]
  inbox_competitor: { title: string, url?: string, why?: string }[]
  tasks_open: number
  tasks_due_today: number
}

async function gatherForVertical(sb: ReturnType<typeof createClient>, sinceISO: string, vertical: string | null): Promise<Bundle> {
  const b: Bundle = {
    vertical,
    leads_new: 0, approvals_open: 0, approvals_done_24h: 0,
    faturas_pending: 0, recebimentos_eur_24h: 0,
    inbox_news: [], inbox_instagram: [], inbox_competitor: [],
    tasks_open: 0, tasks_due_today: 0,
  }

  const v = vertical
  const safe = async <T>(p: Promise<T>): Promise<T | null> => { try { return await p } catch { return null } }

  // Leads
  let q1 = sb.schema("growth").from("leads").select("id", { count: "exact", head: true }).gte("created_at", sinceISO)
  if (v) q1 = q1.eq("vertical", v)
  const r1 = await safe(q1)
  if (r1 && (r1 as { count?: number }).count != null) b.leads_new = (r1 as { count?: number }).count ?? 0

  // Approvals
  const r2 = await safe(sb.schema("system").from("approvals_queue").select("id", { count: "exact", head: true }).eq("status", "pending"))
  if (r2 && (r2 as { count?: number }).count != null) b.approvals_open = (r2 as { count?: number }).count ?? 0

  const r3 = await safe(sb.schema("system").from("approvals_queue").select("id", { count: "exact", head: true }).in("status", ["approved", "rejected"]).gte("decided_at", sinceISO))
  if (r3 && (r3 as { count?: number }).count != null) b.approvals_done_24h = (r3 as { count?: number }).count ?? 0

  // Inbox items últimas 24h por kind
  for (const kind of ["news", "instagram", "competitor"] as const) {
    let qi = sb.schema("system").from("inbox_items").select("title, source_url, source_name, payload").eq("kind", kind).eq("status", "active").gte("created_at", sinceISO).order("created_at", { ascending: false }).limit(5)
    if (v) qi = qi.eq("vertical", v)
    const ri = await safe(qi)
    const data = ri ? (ri as { data?: { title: string, source_url?: string, source_name?: string, payload?: Record<string, unknown> }[] }).data || [] : []
    const slot = kind === "news" ? "inbox_news" : kind === "instagram" ? "inbox_instagram" : "inbox_competitor"
    b[slot] = data.map(d => ({
      title: d.title,
      url:    d.source_url,
      author: (d.payload?.author as string) || d.source_name,
      why:    (d.payload?.why_it_matters as string) || undefined,
    }))
  }

  // Tasks pendentes
  let qt = sb.from("system_tasks").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"])
  if (v) qt = qt.eq("vertical", v)
  const rt = await safe(qt)
  if (rt && (rt as { count?: number }).count != null) b.tasks_open = (rt as { count?: number }).count ?? 0

  // Tasks com due_at hoje
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)
  let qd = sb.from("system_tasks").select("id", { count: "exact", head: true })
    .gte("due_at", todayStart.toISOString()).lte("due_at", todayEnd.toISOString())
    .in("status", ["open", "in_progress"])
  if (v) qd = qd.eq("vertical", v)
  const rd = await safe(qd)
  if (rd && (rd as { count?: number }).count != null) b.tasks_due_today = (rd as { count?: number }).count ?? 0

  // Faturas / recebimentos só para master (não tem vertical por agora)
  if (!v) {
    const r4 = await safe(sb.schema("core").from("faturas").select("id", { count: "exact", head: true }).in("estado", ["emitida", "pendente", "vencida"]))
    if (r4 && (r4 as { count?: number }).count != null) b.faturas_pending = (r4 as { count?: number }).count ?? 0

    const r5 = await safe(sb.schema("core").from("recebimentos").select("valor").gte("data_pagamento", sinceISO.slice(0, 10)))
    if (r5) {
      const rows = (r5 as { data?: { valor?: number }[] }).data || []
      b.recebimentos_eur_24h = rows.reduce((acc, r) => acc + Number(r.valor || 0), 0)
    }
  }

  return b
}

async function aiSummarize(bundle: Bundle, dateLabel: string): Promise<{ executive_summary: string, top_actions: string[], why_it_matters: string } | null> {
  if (!ANTHROPIC_KEY) return null
  const vLabel = bundle.vertical ? `vertical ${bundle.vertical.toUpperCase()}` : "global (cross-vertical)"
  const prompt = `És CEO advisor da Property007 (PropTech Portugal — múltiplas verticais V2 Condomínios / V4 Energia / V5 Manutenção / V10 Owners Club).
Gera resumo executivo das últimas 24h para ${vLabel} (${dateLabel}).

Dados:
- Leads novos: ${bundle.leads_new}
- Aprovações pendentes: ${bundle.approvals_open}
- Aprovações concluídas 24h: ${bundle.approvals_done_24h}
- Tasks abertas: ${bundle.tasks_open}
- Tasks com prazo hoje: ${bundle.tasks_due_today}
${!bundle.vertical ? `- Faturas pendentes: ${bundle.faturas_pending}\n- Recebimentos 24h: ${bundle.recebimentos_eur_24h.toFixed(0)}€` : ""}

Conteúdo externo capturado:
${bundle.inbox_news.length > 0 ? `News (${bundle.inbox_news.length}):\n${bundle.inbox_news.map(n => `  • ${n.title}${n.why ? ` — ${n.why}` : ""}`).join("\n")}` : "Sem news."}
${bundle.inbox_instagram.length > 0 ? `\nPosts sociais (${bundle.inbox_instagram.length}):\n${bundle.inbox_instagram.map(n => `  • ${n.author || ""}: ${n.title}${n.why ? ` — ${n.why}` : ""}`).join("\n")}` : ""}
${bundle.inbox_competitor.length > 0 ? `\nMudanças concorrentes (${bundle.inbox_competitor.length}):\n${bundle.inbox_competitor.map(n => `  • ${n.title}${n.why ? ` — ${n.why}` : ""}`).join("\n")}` : ""}

Responde APENAS um JSON válido (sem markdown), em Português de Portugal:
{
  "executive_summary": "1 parágrafo (max 600 chars) sintetizando o estado do negócio nas últimas 24h. Foca no que mudou + sinais importantes. Tom directo, profissional, PT-PT.",
  "top_actions": ["acção concreta 1 (max 120 chars)", "acção concreta 2", "acção concreta 3"],
  "why_it_matters": "1 frase explicando porque hoje é importante prestar atenção (max 200 chars)"
}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.content?.[0]?.text || "").trim()
    const clean = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
    return JSON.parse(clean)
  } catch (e) {
    console.warn("[daily-roundup] AI summarize failed:", e)
    return null
  }
}

function buildMarkdown(bundle: Bundle, dateLabel: string, summary: { executive_summary: string, top_actions: string[] } | null): string {
  const lines: string[] = []
  const title = bundle.vertical ? `Resumo ${bundle.vertical.toUpperCase()} — ${dateLabel}` : `Resumo do dia — ${dateLabel}`
  lines.push(`## ${title}`)
  lines.push("")
  if (summary?.executive_summary) {
    lines.push(summary.executive_summary)
    lines.push("")
  }

  // Top 3 actions como check-list (Mário toca para marcar feito)
  if (summary?.top_actions && summary.top_actions.length > 0) {
    lines.push("**Top acções de hoje:**")
    for (const a of summary.top_actions) lines.push(`- [ ] ${a}`)
    lines.push("")
  }

  // Stats compactas
  const stats: string[] = []
  if (bundle.leads_new > 0)            stats.push(`📈 ${bundle.leads_new} novos leads`)
  if (bundle.approvals_open > 0)       stats.push(`⏳ ${bundle.approvals_open} aprovações pendentes`)
  if (bundle.approvals_done_24h > 0)   stats.push(`✅ ${bundle.approvals_done_24h} aprovações fechadas`)
  if (bundle.tasks_due_today > 0)      stats.push(`📌 ${bundle.tasks_due_today} tasks com prazo hoje`)
  if (bundle.tasks_open > 0)           stats.push(`📋 ${bundle.tasks_open} tasks abertas`)
  if (bundle.recebimentos_eur_24h > 0) stats.push(`💶 ${bundle.recebimentos_eur_24h.toFixed(0)}€ recebidos`)
  if (bundle.faturas_pending > 0)      stats.push(`🧾 ${bundle.faturas_pending} faturas em aberto`)
  if (stats.length > 0) {
    lines.push("**Sinais 24h:**")
    for (const s of stats) lines.push(`- ${s}`)
    lines.push("")
  }

  // Conteúdo externo
  if (bundle.inbox_news.length > 0) {
    lines.push("**Notícias relevantes:**")
    for (const n of bundle.inbox_news.slice(0, 3)) {
      lines.push(`- ${n.title}${n.why ? ` _${n.why}_` : ""}`)
    }
    lines.push("")
  }
  if (bundle.inbox_instagram.length > 0) {
    lines.push("**Posts sociais:**")
    for (const n of bundle.inbox_instagram.slice(0, 3)) {
      lines.push(`- ${n.author || ""}: ${n.title.slice(0, 80)}`)
    }
    lines.push("")
  }
  if (bundle.inbox_competitor.length > 0) {
    lines.push("**Concorrência:**")
    for (const n of bundle.inbox_competitor.slice(0, 3)) {
      lines.push(`- ${n.title}${n.why ? ` _${n.why}_` : ""}`)
    }
    lines.push("")
  }
  lines.push("_Gerado às 08:00 Lisboa._")
  return lines.join("\n")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sinceISO = yesterday.toISOString()
  const dateLabel = now.toLocaleDateString("pt-PT", { day: "2-digit", month: "long" })
  const dayKey = now.toISOString().slice(0, 10)

  // Verticais activas hoje (com >=1 item nas últimas 24h)
  const activeVerticals: (string | null)[] = [null]  // master sempre
  for (const v of ["v2", "v3", "v4", "v5", "v10"]) {
    const { count } = await sb.schema("system").from("inbox_items")
      .select("id", { count: "exact", head: true })
      .eq("vertical", v).gte("created_at", sinceISO)
    if ((count || 0) >= 3) activeVerticals.push(v)
  }

  const created: { vertical: string | null, id: string, skipped?: string }[] = []

  for (const v of activeVerticals) {
    // Idempotência: 1 roundup por vertical por dia
    let q = sb.schema("system").from("inbox_items")
      .select("id").eq("kind", "roundup").gte("created_at", dayKey).limit(1)
    if (v) q = q.eq("vertical", v); else q = q.is("vertical", null)
    const { data: existing } = await q
    if (existing && existing.length > 0) {
      created.push({ vertical: v, id: existing[0].id, skipped: "already_exists" })
      continue
    }

    const bundle = await gatherForVertical(sb, sinceISO, v)
    const summary = await aiSummarize(bundle, dateLabel)
    const summary_md = buildMarkdown(bundle, dateLabel, summary)

    const title = v
      ? `Resumo ${v.toUpperCase()} — ${dateLabel}`
      : `Resumo do dia — ${dateLabel}`

    const { data: row, error } = await sb.schema("system").from("inbox_items").insert({
      title,
      body: summary?.executive_summary?.slice(0, 240) || `Resumo de ${dateLabel}`,
      kind: "roundup",
      vertical: v,
      source: "agent",
      payload: {
        summary_md,
        stats: {
          leads_new: bundle.leads_new,
          approvals_open: bundle.approvals_open,
          tasks_due_today: bundle.tasks_due_today,
          news_24h: bundle.inbox_news.length,
          instagram_24h: bundle.inbox_instagram.length,
          competitor_24h: bundle.inbox_competitor.length,
        },
        executive_summary: summary?.executive_summary,
        top_actions: summary?.top_actions || [],
        why_it_matters: summary?.why_it_matters,
        suggested_mission: summary?.top_actions?.[0] || null,
        generated_at: now.toISOString(),
      },
      actions: ["create_task_idea", "create_task_employee", "archive"],
      expandable: true,
      source_name: "Daily Roundup",
      status: "active",
    }).select("id").single()

    if (error) {
      created.push({ vertical: v, id: "error", skipped: error.message })
    } else {
      created.push({ vertical: v, id: row?.id || "" })
    }
  }

  return new Response(JSON.stringify({ ok: true, created }), {
    headers: { ...cors, "Content-Type": "application/json" },
  })
})
