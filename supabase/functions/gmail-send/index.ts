/* gmail-send v1 — email outbound handler
 *
 * POST { task_id, edited_subject?, edited_body? }
 *
 * Modos:
 *  - "live": se RESEND_API_KEY configurado, envia real via Resend SMTP
 *  - "draft": senão, marca como sent + retorna mailto: link para Mário enviar manualmente
 *
 * Pipeline:
 *  1. Load task + email_draft do payload
 *  2. Override subject/body se editado
 *  3. Send via Resend (ou mailto fallback)
 *  4. Insert system.email_messages (outbound) com thread_id ligado
 *  5. Update task → status='done' + comment auto "Sent → <recipient>"
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const RESEND_KEY     = Deno.env.get("RESEND_API_KEY") || ""
const FROM_EMAIL     = Deno.env.get("PROPERTY007_FROM_EMAIL") || "[email protected]"

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

async function sendViaResend(to: string, subject: string, text: string, threadHeaders?: any): Promise<{ ok: boolean, id?: string, error?: string }> {
  if (!RESEND_KEY) return { ok: false, error: "RESEND_API_KEY not configured" }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [to],
        subject: subject,
        text:    text,
        headers: threadHeaders || {},
      }),
    })
    if (!res.ok) {
      const errTxt = await res.text()
      return { ok: false, error: `resend_${res.status}: ${errTxt.slice(0, 200)}` }
    }
    const data = await res.json()
    return { ok: true, id: data.id }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST")    return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const { task_id, edited_subject, edited_body } = await req.json()
    if (!task_id) {
      return new Response(JSON.stringify({ error: "task_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // 1. Load task
    const { data: task } = await sb.schema("system").from("tasks").select("*").eq("id", task_id).single()
    if (!task || task.kind !== "email_reply") {
      return new Response(JSON.stringify({ error: "task_not_email_reply" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const draft   = task.payload?.email_draft || {}
    const to      = task.payload?.from_email   // reply para sender original
    const subject = edited_subject || draft.subject || `Re: ${task.payload?.subject || ""}`
    const body    = edited_body    || draft.body_text || ""

    if (!to || !body) {
      return new Response(JSON.stringify({ error: "missing recipient or body" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // 2. Send via Resend (ou mailto fallback)
    let sendResult: any = { ok: false }
    let mode = "live"
    if (RESEND_KEY) {
      sendResult = await sendViaResend(to, subject, body, {
        "In-Reply-To": task.payload?.thread_id || "",
      })
    } else {
      mode = "draft"
      // Fallback: gera mailto: para Mário copiar+enviar manualmente
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      sendResult = { ok: true, mailto, mode: "manual_send_required" }
    }

    // 3. Insert outbound email_messages
    const { data: outRow } = await sb.schema("system").from("email_messages").insert({
      direction:    "outbound",
      thread_id:    task.payload?.thread_id || null,
      from_email:   FROM_EMAIL,
      to_emails:    [to],
      subject:      subject,
      body_text:    body,
      status:       sendResult.ok ? (mode === "live" ? "sent" : "drafted") : "failed",
      task_id:      task_id,
      vertical:     task.vertical,
      sent_at:      sendResult.ok && mode === "live" ? new Date().toISOString() : null,
    }).select("id").single()

    // 4. Update task
    if (sendResult.ok) {
      await sb.schema("system").from("tasks").update({
        status:  "done",
        done_at: new Date().toISOString(),
      }).eq("id", task_id)

      await sb.schema("system").from("task_comments").insert({
        task_id,
        author_kind: mode === "live" ? "agent" : "system",
        author_name: task.owner_agent_id || "system",
        body_md:     mode === "live"
          ? `✉️ Email enviado para **${to}**.\n\n**Subject:** ${subject}\n\n**Body:**\n${body.slice(0, 500)}`
          : `📋 Email **pronto para envio manual** (Resend não configurado).\n\nClick: [Abrir no email client](${sendResult.mailto})\n\n**To:** ${to}\n**Subject:** ${subject}`,
        kind:        "status_update",
      })
    }

    return new Response(JSON.stringify({
      ok:         sendResult.ok,
      mode,
      email_id:   outRow?.id,
      task_id,
      to,
      subject,
      mailto:     sendResult.mailto,
      error:      sendResult.error,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
