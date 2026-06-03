/* schedule-run v2 — executor de schedules due (calendário da vertical = system.schedules)
 *
 * POST { schedule_id? }  → corre 1 schedule específico (testing)
 * POST {}                → corre todos os schedules com next_run_at <= now() (cron a cada 5min)
 *
 * Recipes com EXECUTOR DEDICADO (determinístico) chamam a sua edge function directamente
 * (ex: emissão de avisos mensais). As restantes criam system.tasks + task-execute (agente).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

// recipe.slug → edge function determinística (corre sozinha, sem agente/LLM)
const RECIPE_EXECUTORS: Record<string, string> = {
  "emissao-avisos-mensais": "v2-avisos-mensais-cron",
}

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

function nextCronTime(cron: string, from: Date): Date {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return new Date(from.getTime() + 24 * 60 * 60 * 1000)
  const [min, hour, dayOfMonth, month, dayOfWeek] = parts
  const result = new Date(from.getTime() + 60_000)
  result.setSeconds(0, 0)
  const matches = (val: number, expr: string): boolean => {
    if (expr === "*") return true
    if (expr.startsWith("*/")) return val % parseInt(expr.slice(2)) === 0
    if (expr.includes(",")) return expr.split(",").map(Number).includes(val)
    if (expr.includes("-")) { const [a, b] = expr.split("-").map(Number); return val >= a && val <= b }
    return parseInt(expr) === val
  }
  for (let i = 0; i < 60 * 24 * 7; i++) {
    if (
      matches(result.getUTCMinutes(),   min) &&
      matches(result.getUTCHours(),     hour) &&
      matches(result.getUTCDate(),      dayOfMonth) &&
      matches(result.getUTCMonth() + 1, month) &&
      matches(result.getUTCDay(),       dayOfWeek)
    ) return result
    result.setMinutes(result.getMinutes() + 1)
  }
  return new Date(from.getTime() + 24 * 60 * 60 * 1000)
}

async function bumpSchedule(sb: any, schedule: any, lastTaskId: string | null) {
  const next = nextCronTime(schedule.cron_expr, new Date()).toISOString()
  await sb.schema("system").from("schedules").update({
    last_run_at:  new Date().toISOString(),
    next_run_at:  next,
    run_count:    (schedule.run_count || 0) + 1,
    last_task_id: lastTaskId,
  }).eq("id", schedule.id)
}

async function runSchedule(sb: any, schedule: any): Promise<string> {
  let title = schedule.name
  let description = schedule.prompt || schedule.description || ""
  let skills: string[] = []
  const vertical = (schedule.verticals && schedule.verticals[0] !== "*") ? schedule.verticals[0] : null

  let recipe: any = null
  if (schedule.recipe_id) {
    const { data } = await sb.schema("system").from("recipes")
      .select("name, description, steps, category, slug").eq("id", schedule.recipe_id).single()
    recipe = data
  }

  // Executor dedicado determinístico (corre sozinho, notifica) — NÃO cria task/agente.
  const executorFn = recipe ? RECIPE_EXECUTORS[recipe.slug] : null
  if (executorFn) {
    fetch(`${SUPABASE_URL}/functions/v1/${executorFn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ triggered_by: "schedule", schedule_id: schedule.id }),
    }).catch(() => {})
    await bumpSchedule(sb, schedule, null)
    return `executor:${executorFn}`
  }

  if (recipe) {
    title = `${recipe.name} (autopilot ${new Date().toISOString().slice(0, 10)})`
    description = recipe.description
    skills = Array.from(new Set(
      (recipe.steps || []).flatMap((s: any) => (s.type === "human" ? [] : (s.skills || (s.skill_tag ? [s.skill_tag] : []))))
    ))
  }

  const { data: taskId } = await sb.schema("system").rpc("task_create", {
    p_title:          title,
    p_description_md: description,
    p_kind:           "task",
    p_priority:       "normal",
    p_vertical:       vertical,
    p_owner_agent_id: schedule.bot_id,
    p_source_kind:    "schedule",
    p_source_id:      schedule.id,
    p_payload:        { schedule_id: schedule.id, recipe_id: schedule.recipe_id, autopilot: true },
    p_tags:           ["autopilot"],
  })

  if (taskId && skills.length > 0) {
    await sb.schema("system").from("tasks").update({ skills }).eq("id", taskId)
  }
  await bumpSchedule(sb, schedule, taskId)

  fetch(`${SUPABASE_URL}/functions/v1/task-execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ task_id: taskId }),
  }).catch(() => {})

  return taskId
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST")    return new Response("method_not_allowed", { status: 405, headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    let schedules: any[]
    if (body.schedule_id) {
      const { data } = await sb.schema("system").from("schedules").select("*").eq("id", body.schedule_id).single()
      schedules = data ? [data] : []
    } else {
      const { data } = await sb.schema("system").from("schedules")
        .select("*").eq("active", true).lte("next_run_at", new Date().toISOString()).limit(20)
      schedules = data || []
    }
    const results = []
    for (const s of schedules) {
      try {
        const taskId = await runSchedule(sb, s)
        results.push({ schedule_id: s.id, name: s.name, task_id: taskId, ok: true })
      } catch (e) {
        results.push({ schedule_id: s.id, name: s.name, error: String(e), ok: false })
      }
    }
    return new Response(JSON.stringify({ ok: true, ran: results.length, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
