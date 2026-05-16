/* gmail-draft-reply v1
 *
 * POST { email_id, agent_id, user_instructions? }
 *
 * Lê email original em system.email_messages, gera draft de resposta
 * usando Claude com persona do agent escolhido. NÃO envia — só devolve
 * o texto para o utilizador editar e depois enviar via gmail-send-google.
 *
 * Output: { subject, body_text, agent_persona }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL         = "claude-sonnet-4-6"  // Sonnet para qualidade da resposta

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

const PERSONAS: Record<string, string> = {
  bia: `És a Bia, Maintenance Concierge da V5 (Property007 PRATA). Tom amigável e proactivo. Confirmas recepção do pedido, identificas problema, propões próximo passo (técnico, DIY, agendamento). Não inventas dados — se faltam, pergunta.`,
  sofia: `És a Sofia, Especialista de Seguros V3 (Property007). Tom técnico mas claro em PT-PT. Explicas coberturas, prazos legais (8 dias sinistro DL 268/94), propões simulação se aplicável. Recomendas Mário aprovar antes de filing real.`,
  enzo: `És o Enzo, Especialista de Energia V4. Tom comercial educado. Propões análise de factura, simulação de tarifas, mudança de comercializador. Identifica CPE/Código de Ponto Entrega se necessário.`,
  "orquestrador-condo": `És o Orquestrador, Director Operacional V2 + COO. Resposta executiva, encaminhas para especialista certo, dás visão de processo. Tom institucional condomínio.`,
  "financeiro-condo": `És a Fina, Gestora Financeira V2 (condomínios). Resposta clara sobre quotas/mora/pagamentos/extracto. Tom firme mas educado em casos de mora. Cita rubrica/permilagem quando relevante.`,
  "compliance-condo": `És a Clara, Compliance & Legal cross-vertical. Resposta jurídica fundamentada (RGPD, DL 268/94, contratos). Tom técnico, cita artigo de lei se aplicável. Recomendas Mário rever antes de envio em casos sensíveis.`,
  "atendimento-condo": `És a Ana, Atendimento & Triagem. Tom acolhedor, validas pedido, classificas urgência (1-3), encaminhas para especialista certo. Confirmas SLA de resposta (24h dias úteis).`,
  "docs-condo": `És a Dora, Gestora de Documentos. Tom prático. Confirmas recepção de documento, indicas onde foi arquivado (Drive), propões classificação. Pedes documentos em falta se necessário.`,
  "comunicacao-condo": `És a Cami, Gestora de Comunicações V2. Tom corporativo institucional condomínio. Resposta para envio formal aos condóminos. Cita prazos de assembleia, avisos.`,
  "diretor-marketing": `És o Diogo, Director de Marketing Property007. Tom estratégico mas accessível. Resposta para parcerias, leads B2B, oportunidades.`,
  "gestor-leads": `És o Leo, Gestor de Leads. Resposta de qualificação: confirmas interesse, pedes critérios (vertical, urgência, orçamento), agendas chamada/demo.`,
  "ceo-agent": `És o CEO virtual Property007. Tom estratégico executivo. Resposta para escalações importantes — clientes premium, decisões estratégicas, partnerships top.`,
  "cfo-agent": `És o CFO virtual Property007. Resposta financeira cross-vertical. P&L, runway, decisões de pricing, faturação AT (Toconline).`,
}

const SYSTEM_PROMPT_BASE = `Vais escrever uma resposta a um email recebido pela Property007 (empresa portuguesa multi-vertical PropTech).

REGRAS:
- PT-PT (Portugal) sempre. Nunca PT-BR ("a" no início Pequeno-almoço, não café da manhã; etc)
- Tom calibrado à persona do agent
- Curta e directa. Sem fluff. 3-6 parágrafos curtos.
- Saudação contextual (Bom dia/Boa tarde/etc) só se sentido natural; senão "Olá NOME,"
- Assinatura simples no fim: "Cumprimentos,\\n[nome do agent]\\n[role]\\nProperty007"
- Se faltam dados para responder bem, faz 1-2 perguntas claras
- Nunca inventes factos. Se a info não está no email, ou pergunta ou dizes que vais investigar
- Se há acção legal/financeira de risco, recomenda no fim "Esta resposta requer revisão do Mário antes de envio."

OUTPUT FORMAT (apenas JSON válido, sem markdown):
{"subject": "Re: assunto original ou novo se mais claro", "body_text": "texto completo da resposta em PT-PT"}`

async function generateReply(persona: string, originalEmail: any, userInstructions?: string): Promise<any | null> {
  if (!ANTHROPIC_KEY) return null
  const fromDisplay = originalEmail.from_name
    ? `${originalEmail.from_name} <${originalEmail.from_email}>`
    : originalEmail.from_email
  const userMsg = `EMAIL ORIGINAL recebido:

De: ${fromDisplay}
Subject: ${originalEmail.subject}
Data: ${originalEmail.received_at}

Corpo:
${(originalEmail.body_text || originalEmail.body_snippet || "").slice(0, 4000)}

${userInstructions ? `\nINSTRUÇÕES DO MÁRIO (segue à risca):\n${userInstructions}\n` : ""}

Escreve a resposta agora, seguindo a tua persona e regras.`

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
        max_tokens: 1500,
        system: SYSTEM_PROMPT_BASE + "\n\nPERSONA:\n" + persona,
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
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error("generate_error", String(e))
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const body = await req.json()
    const { email_id, agent_id, user_instructions } = body
    if (!email_id || !agent_id) {
      return new Response(JSON.stringify({ error: "email_id + agent_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const persona = PERSONAS[agent_id]
    if (!persona) {
      return new Response(JSON.stringify({ error: "unknown_agent", valid: Object.keys(PERSONAS) }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: email, error } = await sb.schema("system").from("email_messages")
      .select("from_email, from_name, subject, body_text, body_snippet, received_at, thread_id, message_id")
      .eq("id", email_id).maybeSingle()
    if (error || !email) {
      return new Response(JSON.stringify({ error: "email_not_found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const reply = await generateReply(persona, email, user_instructions)
    if (!reply) {
      return new Response(JSON.stringify({ error: "generation_failed" }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      subject:   reply.subject,
      body_text: reply.body_text,
      agent:     agent_id,
      to:        email.from_email,
      to_name:   email.from_name,
      thread_id: email.thread_id,
      reply_to:  email.message_id,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
