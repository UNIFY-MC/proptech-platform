/* gmail-inbound v1 — email inbound handler (Gmail/Postmark/Mailgun-compatible)
 *
 * POST { from, to, subject, body_text, body_html?, thread_id?, message_id?, raw? }
 *
 * Pipeline:
 *  1. Insert em system.email_messages (status='received')
 *  2. Chama Claude Haiku para classify intent + suggest routing
 *  3. Skill writer redige draft de resposta em PT-PT
 *  4. Cria system.tasks com kind='email_reply', status='needs_human',
 *     payload.email_draft = { subject, body_text, to_emails }
 *  5. Atualiza email_message: status='awaiting_approval', task_id, classify_intent
 *
 * Suporta 2 modos:
 *  - "manual": forms paste no /inbox/forward
 *  - "auto": webhook Gmail Pub/Sub / Postmark / Mailgun
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL         = "claude-haiku-4-5-20251001"

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

// Classifica intent + routing via Claude
async function classifyEmail(email: any): Promise<{ intent: string, confidence: number, agent_id: string, vertical: string | null, summary: string }> {
  const prompt = `Classifica este email recebido e sugere routing para o agent certo da Property007.

EMAIL:
From: ${email.from} <${email.from_email}>
Subject: ${email.subject}
Body: ${(email.body_text || '').slice(0, 1500)}

CONTEXTO Property007:
- 7 dept heads disponíveis: bia (V5 manutenção), diretor-marketing, gestor-leads, orquestrador-condo, financeiro-condo, atendimento-condo, compliance-condo
- 10 verticais: v2 condomínios, v3 seguros, v4 energia, v5 manutenção, v6 reabilitação, v7 real estate, v8 rentals, v9 baas, v10 owners club, null (global)
- Intents possíveis: lead_inbound, support_question, complaint, invoice_query, mora_response, proposal_request, contract_review, partnership, spam, internal_team, other

Responde APENAS JSON:
{
  "intent": "<one of intents above>",
  "confidence": 0.0-1.0,
  "agent_id": "<one of 7 dept heads>",
  "vertical": "<v1-v10 or null>",
  "summary": "1 frase PT-PT do que o sender quer (max 150ch)"
}`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const data = await res.json()
  const text = (data.content?.[0]?.text || "").trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
  try {
    return JSON.parse(text)
  } catch {
    return { intent: "other", confidence: 0.3, agent_id: "atendimento-condo", vertical: null, summary: "Email recebido — classificação falhou" }
  }
}

// Redige draft de resposta em PT-PT
async function draftReply(email: any, classification: any): Promise<{ subject: string, body_text: string }> {
  const prompt = `Redige uma resposta profissional em PT-PT para este email.

EMAIL ORIGINAL:
From: ${email.from} <${email.from_email}>
Subject: ${email.subject}
Body: ${(email.body_text || '').slice(0, 1500)}

CONTEXTO:
- Intent classificada: ${classification.intent}
- Agent que vai responder: ${classification.agent_id}
- Vertical: ${classification.vertical || 'global'}
- Summary: ${classification.summary}

GUIDELINES:
- Tom profissional, conciso, PT-PT formal mas humano
- Saudação: "Bom dia <Nome>," ou "Caro/a <Nome>,"
- Não inventes informação que não tens (preços, prazos específicos, nomes de pessoas)
- Se precisas info que não tens, escreve "preciso de validar internamente e volto-lhe em [prazo]"
- Assinatura: "Cumprimentos,\\n<agent_name>\\nProperty007"
- Não promete prazos sem confirmação humana

Responde APENAS JSON:
{
  "subject": "Re: <original subject>",
  "body_text": "<email completo>"
}`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const data = await res.json()
  const text = (data.content?.[0]?.text || "").trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
  try {
    return JSON.parse(text)
  } catch {
    return { subject: `Re: ${email.subject}`, body_text: "Bom dia,\n\nAgradecemos o seu contacto. Vamos analisar a sua mensagem e voltamos a falar consigo em breve.\n\nCumprimentos,\nProperty007" }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST")    return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const body = await req.json()

    // Normaliza payload (Postmark/Mailgun/Gmail Pub/Sub têm shapes diferentes)
    const email = {
      from:         body.from || body.FromName || "",
      from_email:   body.from_email || body.From || body.sender || "",
      to_emails:    body.to_emails || (body.To ? [body.To] : []),
      subject:      body.subject || body.Subject || "",
      body_text:    body.body_text || body.TextBody || body["body-plain"] || "",
      body_html:    body.body_html || body.HtmlBody || body["body-html"] || "",
      thread_id:    body.thread_id || body.MessageID || body["Message-Id"] || null,
      message_id:   body.message_id || body.MessageID || null,
      raw:          body,
    }

    if (!email.from_email || !email.subject) {
      return new Response(JSON.stringify({ error: "from_email + subject required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // 1. Insert email_messages
    const { data: emailRow, error: insertErr } = await sb.schema("system").from("email_messages").insert({
      direction:     "inbound",
      message_id:    email.message_id,
      thread_id:     email.thread_id,
      from_email:    email.from_email,
      from_name:     email.from,
      to_emails:     email.to_emails,
      subject:       email.subject,
      body_text:     email.body_text,
      body_html:     email.body_html,
      body_snippet:  (email.body_text || "").slice(0, 200),
      status:        "received",
      raw_payload:   email.raw,
    }).select("*").single()

    if (insertErr) throw new Error(`insert_failed: ${insertErr.message}`)

    // 2. Classify
    const classification = await classifyEmail(email)

    // 3. Draft reply (skip if spam ou internal_team)
    let draft = null
    if (!["spam", "internal_team"].includes(classification.intent)) {
      draft = await draftReply(email, classification)
    }

    // 4. Cria task se não-spam
    let taskId: string | null = null
    if (classification.intent !== "spam") {
      const { data: tId } = await sb.schema("system").rpc("task_create", {
        p_title:          `[Email] ${classification.summary}`,
        p_description_md: `**De:** ${email.from} <${email.from_email}>\n**Assunto:** ${email.subject}\n\n${(email.body_text || "").slice(0, 500)}`,
        p_kind:           "email_reply",
        p_priority:       classification.intent === "complaint" ? "high" : "normal",
        p_vertical:       classification.vertical,
        p_owner_agent_id: classification.agent_id,
        p_source_kind:    "email_inbound",
        p_source_id:      emailRow.id,
        p_payload:        {
          email_id:       emailRow.id,
          intent:         classification.intent,
          confidence:     classification.confidence,
          email_draft:    draft,
          from_email:     email.from_email,
          subject:        email.subject,
          thread_id:      email.thread_id,
        },
        p_tags:           ["email", classification.intent],
      })
      taskId = tId

      // Forçar status=needs_human (task_create defaults a 'open')
      if (taskId) {
        await sb.schema("system").from("tasks").update({ status: "needs_human" }).eq("id", taskId)
      }
    }

    // 5. Update email_messages
    await sb.schema("system").from("email_messages").update({
      status:          classification.intent === "spam" ? "archived" : "awaiting_approval",
      classify_intent: classification.intent,
      classify_score:  classification.confidence,
      routed_to_agent: classification.agent_id,
      task_id:         taskId,
      vertical:        classification.vertical,
    }).eq("id", emailRow.id)

    return new Response(JSON.stringify({
      ok: true,
      email_id:       emailRow.id,
      task_id:        taskId,
      intent:         classification.intent,
      agent:          classification.agent_id,
      draft_subject:  draft?.subject,
      draft_preview:  draft?.body_text?.slice(0, 150),
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
