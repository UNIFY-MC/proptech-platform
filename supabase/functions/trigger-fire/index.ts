/* trigger-fire v1 — executor de triggers event-driven
 *
 * POST { trigger_id, event_kind, event_data }
 *
 * Pipeline:
 *  1. Carrega trigger + recipe (se aplicável)
 *  2. Cria system.tasks ligada ao trigger com event_data no payload
 *  3. Aggrega skills da recipe.steps[]
 *  4. Update trigger: last_fired_at + fire_count + last_task_id
 *  5. Dispara task-execute para execução
 *
 * Mode 'basic': apenas dispara recipe (input estrutural do event_data)
 * Mode 'agentic': bot recebe event_data + descrição e decide o que fazer
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST")    return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const { trigger_id, event_kind, event_data } = await req.json()
    if (!trigger_id) {
      return new Response(JSON.stringify({ error: "trigger_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // 1. Carrega trigger
    const { data: trigger } = await sb.schema("system").from("triggers")
      .select("*").eq("id", trigger_id).eq("active", true).maybeSingle()
    if (!trigger) {
      return new Response(JSON.stringify({ error: "trigger_not_found_or_inactive" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // 2. Build task input
    let title = `${trigger.name} (${event_kind})`
    let description = trigger.prompt || trigger.description || ""
    let skills: string[] = []
    const vertical = (event_data?.vertical) ||
                     (trigger.verticals && trigger.verticals[0] !== "*" ? trigger.verticals[0] : null)

    if (trigger.recipe_id) {
      const { data: recipe } = await sb.schema("system").from("recipes")
        .select("name, description, steps").eq("id", trigger.recipe_id).single()
      if (recipe) {
        title = `${recipe.name} (trigger: ${trigger.name})`
        description = recipe.description
        skills = Array.from(new Set(
          (recipe.steps || []).flatMap((s: any) => (s.type === "human" ? [] : (s.skills || (s.skill_tag ? [s.skill_tag] : []))))
        ))
      }
    }

    // Se mode='agentic', adiciona event context ao description
    if (trigger.mode === "agentic" && event_data) {
      description += `\n\n--- Event data ---\n${JSON.stringify(event_data, null, 2).slice(0, 2000)}`
    }

    // 3. Cria task
    const { data: taskId } = await sb.schema("system").rpc("task_create", {
      p_title:          title.slice(0, 200),
      p_description_md: description,
      p_kind:           "task",
      p_priority:       trigger.mode === "agentic" ? "high" : "normal",
      p_vertical:       vertical,
      p_owner_agent_id: trigger.bot_id,
      p_source_kind:    "trigger",
      p_source_id:      trigger.id,
      p_payload:        {
        trigger_id:   trigger.id,
        event_kind,
        event_data,
        recipe_id:    trigger.recipe_id,
        mode:         trigger.mode,
      },
      p_tags:           ["trigger", event_kind],
    })

    if (taskId && skills.length > 0) {
      await sb.schema("system").from("tasks").update({ skills }).eq("id", taskId)
    }

    // 4. Update trigger
    await sb.schema("system").from("triggers").update({
      last_fired_at: new Date().toISOString(),
      fire_count:    (trigger.fire_count || 0) + 1,
      last_task_id:  taskId,
    }).eq("id", trigger.id)

    // 5. Dispara task-execute (fire-and-forget)
    fetch(`${SUPABASE_URL}/functions/v1/task-execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ task_id: taskId }),
    }).catch(() => {})

    return new Response(JSON.stringify({
      ok: true, trigger_id, task_id: taskId, event_kind,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
