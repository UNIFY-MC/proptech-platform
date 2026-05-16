/* gmail-auto-draft-batch v1
 *
 * Cron 10min: gera drafts automaticamente para emails que:
 * - têm classify_intent definido (já foram pelo classifier)
 * - têm routed_to_agent definido
 * - status IN ('awaiting_routing', 'received')
 * - draft_body IS NULL
 * - intent NOT IN ('spam', 'newsletter', 'internal_team')
 *
 * Para cada um: chama gmail-draft-reply internamente, guarda
 * draft_subject + draft_body + draft_agent + draft_generated_at
 * e muda status para 'awaiting_approval'.
 *
 * Resultado: emails ficam prontos a Mário aprovar 1-click.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

// Intents que NÃO devem gerar draft automático
const SKIP_INTENTS = ["spam", "newsletter", "internal_team", "other"]

async function callDraftReply(emailId: string, agentId: string): Promise<any | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/gmail-draft-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_id: emailId, agent_id: agentId }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    let limit = 20
    try { const body = await req.json(); if (body?.limit) limit = body.limit } catch {}

    // Buscar candidatos
    const { data: emails, error } = await sb.schema("system").from("email_messages")
      .select("id, routed_to_agent, classify_intent, subject, from_email")
      .in("status", ["awaiting_routing", "received"])
      .not("routed_to_agent", "is", null)
      .is("draft_body", null)
      .not("classify_intent", "in", `(${SKIP_INTENTS.map(s => `"${s}"`).join(",")})`)
      .eq("direction", "inbound")
      .order("received_at", { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const results: any[] = []
    for (const e of (emails || [])) {
      const draft = await callDraftReply(e.id, e.routed_to_agent)
      if (!draft?.ok) {
        results.push({ id: e.id, status: "draft_failed", error: draft?.error })
        continue
      }

      await sb.schema("system").from("email_messages").update({
        draft_subject:      draft.subject,
        draft_body:         draft.body_text,
        draft_agent:        e.routed_to_agent,
        draft_generated_at: new Date().toISOString(),
        status:             "awaiting_approval",
        updated_at:         new Date().toISOString(),
      }).eq("id", e.id)

      results.push({
        id: e.id,
        subject: e.subject?.slice(0, 60),
        from: e.from_email,
        agent: e.routed_to_agent,
        intent: e.classify_intent,
        status: "draft_generated",
      })

      // Rate-limit Anthropic (1s entre calls Sonnet)
      await new Promise(r => setTimeout(r, 1000))
    }

    return new Response(JSON.stringify({
      ok: true, processed: results.length, results,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
