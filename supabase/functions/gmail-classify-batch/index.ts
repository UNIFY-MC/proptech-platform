/* gmail-classify-batch v1
 *
 * Cron 10min: processa emails em system.email_messages onde classify_intent IS NULL
 * (excluindo trashed/spam). Para cada um:
 *
 * 1. Chama Claude Haiku com contexto Property007 → JSON estruturado
 * 2. UPDATE classify_intent, classify_score, routed_to_agent, vertical
 * 3. Auto-router por confidence:
 *    - intent=spam & score>0.9 → chama gmail-action junk
 *    - score>0.85 → status='awaiting_routing' (pronto p/ agent draft)
 *    - 0.5-0.85    → status='received' (a rever manual)
 *    - <0.5         → status='received' sem agent
 *
 * POST {} ou { limit: 50 }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL         = "claude-haiku-4-5-20251001"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

const SYSTEM_PROMPT = `Tu és um classificador de emails para Property007 — empresa portuguesa multi-vertical PropTech.

VERTICAIS:
- V2 Condomínios (prataowners.pt — única em produção)
- V3 Seguros
- V4 Energia
- V5 Manutenção
- core (cross-vertical, sem vertical específica)

AGENTS disponíveis (escolhe sempre 1 — usa o id exacto):
- bia (Maintenance Concierge V5)
- sofia (Especialista de Seguros V3)
- enzo (Especialista de Energia V4)
- orquestrador-condo (Director Operacional V2 + COO)
- financeiro-condo (Fina · V2 financeiro/quotas/mora)
- compliance-condo (Clara · legal/RGPD cross-vertical)
- atendimento-condo (Ana · triagem inicial)
- docs-condo (Dora · documentos)
- comunicacao-condo (Cami · marketing email/SMS)
- diretor-marketing (Diogo · marketing/leads)
- gestor-leads (Leo · qualificação leads)
- ceo-agent (estratégia, escalações)
- cfo-agent (financeiro cross-vertical)

INTENTS válidos (escolhe 1):
- lead_inbound (potencial cliente novo)
- support_question (cliente actual com dúvida/problema)
- complaint (reclamação)
- invoice_query (factura/recibo)
- mora_response (pagamento em atraso, plano)
- proposal_request (pedido de proposta/orçamento)
- contract_review (contrato a rever/assinar)
- partnership (parceria com fornecedor/seguradora/etc)
- internal_team (email entre staff Property007)
- newsletter (boletim/promoção/marketing automático)
- spam (lixo, phishing, irrelevante)
- other (não se encaixa nas categorias acima)

REGRAS:
- Confidence honesto: 0.95+ só quando tens certeza absoluta
- Newsletter de plataforma sem CTA = newsletter, não spam
- Phishing/scam/promoções não solicitadas = spam
- Se vertical não óbvia, usa "core"
- Vertical SEMPRE em maiúsculas: V2, V3, V4, V5, ou "core"

Responde APENAS JSON válido, sem markdown, sem texto extra:
{"intent":"...","score":0.0,"agent":"...","vertical":"V2|V3|V4|V5|core","summary":"1 frase PT-PT max 150ch"}`

async function classifyEmail(email: any): Promise<any | null> {
  if (!ANTHROPIC_KEY) return null
  const userMsg = `EMAIL para classificar:
From: ${email.from_name || ""} <${email.from_email}>
Subject: ${email.subject || "(sem assunto)"}
Body:
${(email.body_text || email.body_snippet || "").slice(0, 2000)}`

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
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      console.error("anthropic_error", res.status, txt.slice(0, 200))
      return null
    }
    const data: any = await res.json()
    const text = data.content?.[0]?.text || ""
    // Extrair JSON (Claude às vezes envolve em texto)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error("classify_error", String(e))
    return null
  }
}

// Auto-router: decide status baseado em confidence + intent
function decideStatus(intent: string, score: number): { status: string, autoJunk: boolean } {
  if (intent === "spam" && score >= 0.9) return { status: "spam",              autoJunk: true  }
  if (score >= 0.85)                     return { status: "awaiting_routing",  autoJunk: false }
  if (score >= 0.5)                      return { status: "received",          autoJunk: false }
  return                                        { status: "received",          autoJunk: false }
}

async function callGmailAction(supabaseUrl: string, gmailId: string, action: string) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/gmail-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: "p7.digitall@gmail.com", gmail_id: gmailId, action }),
    })
  } catch { /* swallow — main classify already persisted */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    let limit = 50
    try { const body = await req.json(); if (body?.limit) limit = body.limit } catch {}

    // Buscar emails sem classify_intent (excluir trashed/spam já marcados manualmente)
    const { data: emails, error } = await sb.schema("system").from("email_messages")
      .select("id, external_id, from_email, from_name, subject, body_text, body_snippet, direction")
      .is("classify_intent", null)
      .neq("status", "trashed")
      .neq("status", "spam")
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
      const classify = await classifyEmail(e)
      if (!classify) {
        results.push({ id: e.id, status: "classify_failed" })
        continue
      }
      const { status, autoJunk } = decideStatus(classify.intent, classify.score)

      const updateFields: any = {
        classify_intent:  classify.intent,
        classify_score:   classify.score,
        routed_to_agent:  classify.agent || null,
        vertical:         classify.vertical || null,
        status,
        updated_at:       new Date().toISOString(),
      }

      const { error: updErr } = await sb.schema("system").from("email_messages")
        .update(updateFields).eq("id", e.id)

      if (updErr) {
        console.error("update_failed", e.id, updErr.message)
        results.push({
          id: e.id,
          intent: classify.intent,
          score:  classify.score,
          status: "update_failed",
          error:  updErr.message,
        })
        continue
      }

      if (autoJunk && e.external_id) {
        await callGmailAction(SUPABASE_URL, e.external_id, "junk")
      }

      results.push({
        id: e.id,
        intent: classify.intent,
        score:  classify.score,
        agent:  classify.agent,
        vertical: classify.vertical,
        status,
        auto_junked: autoJunk,
      })

      // Rate-limit polite com Anthropic API (200ms entre calls)
      await new Promise(r => setTimeout(r, 200))
    }

    return new Response(JSON.stringify({
      ok: true,
      processed: results.length,
      results,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
