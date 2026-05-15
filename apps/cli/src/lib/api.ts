// api.ts — wrappers para edge functions + RPCs
// Sprint Q4

import { getSupabase } from "./supabase.js"
import { loadConfig } from "./config.js"

export async function fetchTasks(opts: { vertical?: string; status?: string; limit?: number } = {}) {
  const sb = getSupabase()
  if (!sb) return []
  let q = sb.from("system_tasks").select("*").order("created_at", { ascending: false }).limit(opts.limit || 30)
  if (opts.status) q = q.eq("status", opts.status)
  if (opts.vertical && opts.vertical !== "all") q = q.ilike("vertical", opts.vertical)
  const { data } = await q
  return data || []
}

export async function fetchRecipes(limit = 50) {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb.from("system_recipes").select("*").eq("active", true).order("name").limit(limit)
  return data || []
}

export async function fetchInbox(limit = 20) {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb.schema("system").from("inbox_items")
    .select("id, title, kind, vertical, created_at, status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit)
  return data || []
}

export async function runTask(taskId: string) {
  const cfg = loadConfig()
  if (!cfg) return { ok: false, error: "no_config" }
  const res = await fetch(`${cfg.supabase_url}/functions/v1/task-execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cfg.anon_key}`,
      "apikey": cfg.anon_key,
    },
    body: JSON.stringify({ task_id: taskId }),
  })
  const data = await res.json()
  return data
}

export async function chatWithAgent(message: string, employeeId?: string, threadId?: string) {
  const cfg = loadConfig()
  if (!cfg) return { error: "no_config" }
  const res = await fetch(`${cfg.supabase_url}/functions/v1/agent-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cfg.anon_key}`,
      "apikey": cfg.anon_key,
    },
    body: JSON.stringify({
      message,
      thread_id: threadId,
      context: employeeId ? { active_employee_id: employeeId } : undefined,
    }),
  })
  return await res.json()
}
