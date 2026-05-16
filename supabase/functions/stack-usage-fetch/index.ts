/* stack-usage-fetch v1
 *
 * Cron diário 6am: chama APIs dos providers, faz UPSERT em system.integration_usage.
 *
 * Providers suportados:
 *   - Supabase Management API   (supa_mgmt_token)
 *   - Vercel API                (VERCEL_API_TOKEN)
 *   - GitHub Actions Billing    (GITHUB_PAT)
 *   - Resend                    (RESEND_API_KEY)
 *
 * Cada métrica grava: slug, metric, used, free_limit, unit, period_start, period_end, raw_response.
 *
 * POST {} → fetch all
 * POST { only: 'supabase' } → 1 provider só
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const SUPA_MGMT_TOKEN = Deno.env.get("supa_mgmt_token") || Deno.env.get("SUPA_MGMT_TOKEN") || ""
const VERCEL_TOKEN    = Deno.env.get("VERCEL_API_TOKEN") || ""
const GITHUB_PAT      = Deno.env.get("GITHUB_PAT") || ""
const RESEND_KEY      = Deno.env.get("RESEND_API_KEY") || ""

const SUPABASE_PROJECT_REF = "hkmvszkpxjbxmnixzqbl"
const GITHUB_OWNER         = "UNIFY-MC"
const GITHUB_REPO          = "proptech-platform"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

// Free tier limits (Janeiro 2026 — actualizar quando mudarem)
const FREE_LIMITS: Record<string, Record<string, { value: number, unit: string }>> = {
  supabase: {
    db_size_gb:           { value: 0.5,    unit: "GB"          },  // 500 MB
    storage_gb:           { value: 1,      unit: "GB"          },
    bandwidth_gb:         { value: 5,      unit: "GB"          },
    edge_fn_invocations:  { value: 500000, unit: "invocations" },
    auth_mau:             { value: 50000,  unit: "users"       },
  },
  vercel: {
    bandwidth_gb:         { value: 100,    unit: "GB"          },
    fn_invocations:       { value: 100000, unit: "invocations" },
    build_minutes:        { value: 6000,   unit: "minutes"     },
    deployments_month:    { value: 3000,   unit: "deployments" },  // sem limite real, mas marca actividade
  },
  github: {
    actions_minutes:      { value: 2000,   unit: "minutes"     },
  },
  resend: {
    emails_sent_month:    { value: 3000,   unit: "emails"      },
    emails_sent_day:      { value: 100,    unit: "emails"      },
  },
}

function periodMonthRange(): { start: string, end: string } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
  return { start: start.toISOString(), end: end.toISOString() }
}

async function recordUsage(sb: any, slug: string, metric: string, used: number, raw: unknown) {
  const limit = FREE_LIMITS[slug]?.[metric]
  const { start, end } = periodMonthRange()
  await sb.schema("system").from("integration_usage").upsert({
    slug, metric, used,
    free_limit:   limit?.value ?? null,
    unit:         limit?.unit  ?? "—",
    period:       "month",
    period_start: start,
    period_end:   end,
    raw_response: raw,
    recorded_at:  new Date().toISOString(),
  }, { onConflict: "slug,metric,period_start" })
}

// ============================================
// SUPABASE — DB size via SQL directa (Management API não expõe usage)
// ============================================
async function fetchSupabase(sb: any): Promise<{ ok: boolean, metrics: string[], error?: string }> {
  const metrics: string[] = []
  try {
    // DB size em GB via pg_database_size
    const { data: dbSize, error: dbErr } = await sb.rpc("get_db_size_gb")
    if (!dbErr && dbSize != null) {
      await recordUsage(sb, "supabase", "db_size_gb", Number(dbSize), { method: "pg_database_size" })
      metrics.push("db_size_gb")
    }

    // Storage size em GB via storage.objects
    const { data: storageSize, error: stErr } = await sb.rpc("get_storage_size_gb")
    if (!stErr && storageSize != null) {
      await recordUsage(sb, "supabase", "storage_gb", Number(storageSize), { method: "storage_objects_sum" })
      metrics.push("storage_gb")
    }

    return { ok: metrics.length > 0, metrics, error: metrics.length === 0 ? "no_metrics_recorded" : undefined }
  } catch (e) {
    return { ok: false, metrics, error: String(e) }
  }
}

// ============================================
// VERCEL — usage via /v1/user + project deployments (sem usage real para hobby)
// ============================================
async function fetchVercel(sb: any): Promise<{ ok: boolean, metrics: string[], error?: string }> {
  if (!VERCEL_TOKEN) return { ok: false, metrics: [], error: "VERCEL_API_TOKEN missing" }
  const metrics: string[] = []

  try {
    // 1. Validar token
    const userRes = await fetch("https://api.vercel.com/v2/user", {
      headers: { "Authorization": `Bearer ${VERCEL_TOKEN}` },
    })
    if (!userRes.ok) {
      const txt = await userRes.text()
      return { ok: false, metrics, error: `vercel_user_${userRes.status}: ${txt.slice(0, 200)}` }
    }

    // 2. Listar deployments do mês actual (proxy para activity)
    const { start } = periodMonthRange()
    const sinceMs = new Date(start).getTime()
    const deplRes = await fetch(`https://api.vercel.com/v6/deployments?since=${sinceMs}&limit=100`, {
      headers: { "Authorization": `Bearer ${VERCEL_TOKEN}` },
    })
    if (deplRes.ok) {
      const data: any = await deplRes.json()
      const deployments = data.deployments || []
      await recordUsage(sb, "vercel", "deployments_month", deployments.length, { count: deployments.length, since: start })
      metrics.push("deployments_month")
    }

    // 3. Usage API real só existe para Teams (paid). Marca limitação.
    if (metrics.length === 0) {
      return { ok: false, metrics, error: "Vercel hobby plan não expõe bandwidth/invocations via API. Só deployments." }
    }
    return { ok: true, metrics }
  } catch (e) {
    return { ok: false, metrics, error: String(e) }
  }
}

// ============================================
// GITHUB — Actions billing
// ============================================
async function fetchGitHub(sb: any): Promise<{ ok: boolean, metrics: string[], error?: string }> {
  if (!GITHUB_PAT) return { ok: false, metrics: [], error: "GITHUB_PAT missing" }
  const metrics: string[] = []

  try {
    // Para fine-grained PAT scoped a UNIFY-MC org (não user)
    let res = await fetch(`https://api.github.com/orgs/${GITHUB_OWNER}/settings/billing/actions`, {
      headers: {
        "Authorization": `Bearer ${GITHUB_PAT}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    // Fallback: tentar como user se org não autorizado
    if (!res.ok) {
      res = await fetch(`https://api.github.com/users/${GITHUB_OWNER}/settings/billing/actions`, {
        headers: {
          "Authorization": `Bearer ${GITHUB_PAT}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      })
    }
    if (res.ok) {
      const data: any = await res.json()
      // total_minutes_used + included_minutes
      const used = data.total_minutes_used ?? 0
      await recordUsage(sb, "github", "actions_minutes", used, data)
      metrics.push("actions_minutes")
      return { ok: true, metrics }
    } else {
      const txt = await res.text()
      return { ok: false, metrics, error: `github_${res.status}: ${txt.slice(0, 200)}` }
    }
  } catch (e) {
    return { ok: false, metrics, error: String(e) }
  }
}

// ============================================
// RESEND — emails enviados (count via /emails endpoint)
// ============================================
async function fetchResend(sb: any): Promise<{ ok: boolean, metrics: string[], error?: string }> {
  if (!RESEND_KEY) return { ok: false, metrics: [], error: "RESEND_API_KEY missing" }
  const metrics: string[] = []

  try {
    // Resend não tem usage API dedicada — contar via /emails (paginated)
    // Para MVP: chama /emails?limit=100 e regista como aproximação (vai sub-contar se >100 enviados)
    const res = await fetch("https://api.resend.com/emails?limit=100", {
      headers: { "Authorization": `Bearer ${RESEND_KEY}` },
    })
    if (res.ok) {
      const data: any = await res.json()
      const emails = data.data || []
      const { start } = periodMonthRange()
      const startTs = new Date(start).getTime()
      const thisMonth = emails.filter((e: any) => new Date(e.created_at).getTime() >= startTs).length
      await recordUsage(sb, "resend", "emails_sent_month", thisMonth, { count_method: "list_emails_limit_100", total_listed: emails.length })
      metrics.push("emails_sent_month")
      return { ok: true, metrics }
    } else {
      const txt = await res.text()
      return { ok: false, metrics, error: `resend_${res.status}: ${txt.slice(0, 200)}` }
    }
  } catch (e) {
    return { ok: false, metrics, error: String(e) }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    let only: string | undefined
    try { const body = await req.json(); only = body?.only } catch {}

    const results: Record<string, any> = {}
    const tasks: Promise<void>[] = []

    if (!only || only === "supabase") {
      tasks.push(fetchSupabase(sb).then(r => { results.supabase = r }))
    }
    if (!only || only === "vercel") {
      tasks.push(fetchVercel(sb).then(r => { results.vercel = r }))
    }
    if (!only || only === "github") {
      tasks.push(fetchGitHub(sb).then(r => { results.github = r }))
    }
    if (!only || only === "resend") {
      tasks.push(fetchResend(sb).then(r => { results.resend = r }))
    }

    await Promise.all(tasks)

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
