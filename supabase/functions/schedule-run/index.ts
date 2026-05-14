/* schedule-run v1 — executor de schedules due
 *
 * POST { schedule_id? }  → corre 1 schedule específico (testing)
 * POST {}                → corre todos os schedules com next_run_at <= now() (cron)
 *
 * Pipeline:
 *  1. Para cada schedule due, cria system.tasks com payload da recipe ou prompt
 *  2. Marca schedule.last_run_at = now() + recalcula next_run_at
 *  3. Dispara task-execute para a task criada
 *  4. Incrementa run_count
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

// Cron parser simples (suporta: "0 9 * * 1", "*/15 * * * *", "0 8 * * *")
// Devolve próximo timestamp >= from
function nextCronTime(cron: string, from: Date): Date {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) {
    return new Date(from.getTime() + 24 * 60 * 60 * 1000) // fallback +1 day
  }
  const [min, hour, dayOfMonth, month, dayOfWeek] = parts

  // Simple match: tries +1 minute slots up to 60*24*7 (1 week max)
  const result = new Date(from.getTime() + 60_000)
  result.setSeconds(0, 0)
  const matches = (val: number, expr: string): boolean => {
    if (expr === "*") return true
    if (expr.startsWith("*/")) return val % parseInt(expr.slice(2)) === 0
    if (expr.includes(",")) return expr.split(",").map(Number).includes(val)
    if (expr.includes("-")) {
      const [a, b] = expr.split("-").map(Number)
      return val >= a && val <= b
    }
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

async function runSchedule(sb: any, schedule: any): Promise<string> {
  // 1. Construir task input a partir da recipe ou prompt
  let title = schedule.name
  let description = schedule.prompt || schedule.description || ""
  let skills: string[] = []
  const vertical = (schedule.verticals && schedule.verticals[0] !== "*") ? schedule.verticals[0] : null

  if (schedule.recipe_id) {
    const { data: recipe } = await sb.schema("system").from("recipes")
      .select("name, description, steps, category").eq("id", schedule.recipe_id).single()
    if (recipe) {
      title = `${recipe.name} (autopilot ${new Date().toISOString().slice(0, 10)})`
      description = recipe.description
      // Aggrega skills de todos os steps agent
      skills = Array.from(new Set(
        (recipe.steps || []).flatMap((s: any) => (s.type === "human" ? [] : (s.skills || (s.skill_tag ? [s.skill_tag] : []))))
      ))
    }
  }

  // 2. Cria task
  const { data: taskId } = await sb.schema("system").rpc("task_create", {
    p_title:          title,
    p_description_md: description,
    p_kind:           "task",
    p_priority:       "normal",
    p_vertical:       vertical,
    p_owner_agent_id: schedule.bot_id,
    p_source_kind:    "schedule",
    p_source_id:      schedule.id,
    p_payload:        {
      schedule_id: schedule.id,
      recipe_id:   schedule.recipe_id,
      autopilot:   true,
    },
    p_tags:           ["autopilot"],
  })

  if (taskId && skills.length > 0) {
    await sb.schema("system").from("tasks").update({ skills }).eq("id", taskId)
  }

  // 3. Update schedule: last_run_at + next_run_at + run_count
  const next = nextCronTime(schedule.cron_expr, new Date()).toISOString()
  await sb.schema("system").from("schedules").update({
    last_run_at:  new Date().toISOString(),
    next_run_at:  next,
    run_count:    (schedule.run_count || 0) + 1,
    last_task_id: taskId,
  }).eq("id", schedule.id)

  // 4. Dispara task-execute (fire-and-forget; resposta vem por realtime)
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
