/* email-auto-archive v1
 *
 * Cron daily 5am: arquiva automaticamente emails de baixa prioridade
 * para reduzir noise no inbox.
 *
 * Critérios de auto-archive:
 * - intent='newsletter' AND received_at < now - 7 days AND status='received'
 * - intent='internal_team' AND received_at < now - 14 days AND status='received'
 *
 * Chama gmail-action(archive) para remover do INBOX no Gmail + actualizar status local.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

const RULES = [
  { intent: "newsletter",    age_days: 7,  reason: "Newsletter antiga (>7 dias)"        },
  { intent: "internal_team", age_days: 14, reason: "Internal team antigo (>14 dias)"   },
]

async function callGmailAction(url: string, gmailId: string, action: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/functions/v1/gmail-action`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: "p7.digitall@gmail.com", gmail_id: gmailId, action }),
    })
    return res.ok
  } catch { return false }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const now = new Date()
  const results: any[] = []

  try {
    for (const rule of RULES) {
      const cutoff = new Date(now.getTime() - rule.age_days * 24 * 60 * 60 * 1000).toISOString()
      const { data: emails } = await sb.schema("system").from("email_messages")
        .select("id, external_id, subject")
        .eq("classify_intent", rule.intent)
        .eq("status", "received")
        .eq("direction", "inbound")
        .lt("received_at", cutoff)
        .limit(50)

      const archived = []
      for (const e of (emails || [])) {
        if (e.external_id) {
          const ok = await callGmailAction(SUPABASE_URL, e.external_id, "archive")
          if (ok) archived.push({ id: e.id, subject: e.subject?.slice(0, 60) })
          await new Promise(r => setTimeout(r, 100))  // rate-limit
        }
      }
      results.push({ rule: rule.intent, cutoff_days: rule.age_days, archived: archived.length, samples: archived.slice(0, 5) })
    }

    return new Response(JSON.stringify({ ok: true, results, reason: "auto_archive" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
