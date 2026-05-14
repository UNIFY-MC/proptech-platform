/* skill-create v1 — receipt generator para skills auto-criadas
 *
 * POST { skill_tag, context? }
 *
 * Pipeline:
 *  1. Lookup system.skills WHERE tag=skill_tag
 *  2. Se status='active' e receipt_md != null → devolve existente (no-op)
 *  3. Caso contrário (pending_receipt ou auto_generated), gera via Claude Haiku 4.5:
 *     - name (human-friendly)
 *     - description
 *     - category (content|communication|productivity|social|engineering|data-extraction|data-lookup|general)
 *     - connectors (array: gmail|google-calendar|meta-graph|supabase|supabase-storage|anthropic|whatsapp|etc)
 *     - context_files (array de paths que a skill deve ler para executar bem)
 *     - fallback_agent (a quem delegar se não conseguir executar)
 *     - receipt_md (recipe passo-a-passo em PT-PT)
 *     - prompt_template (template variável com {{slots}})
 *  4. UPDATE system.skills + marca status='active'
 *
 * Usado lazy pelo task-execute quando encontra skill com status='pending_receipt'.
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

const SYSTEM_PROMPT = `És o "Skill Architect" do Property007 — produzes receitas operacionais para skills usadas por agents AI da plataforma PropTech Portugal.

Cada skill tem:
- name human-friendly em PT-PT (3-4 palavras)
- description (1-2 frases, PT-PT)
- category (content|communication|productivity|social|engineering|data-extraction|data-lookup|general)
- connectors necessários: lista de [anthropic, gmail, google-calendar, meta-graph, whatsapp, supabase, supabase-storage, drive, openai-vision, resend, twilio, swan-baas, toconline]
- context_files: caminhos relativos a ficheiros que o agent deve ler ANTES de executar (ex: "docs/voice-guidelines.md", "templates/email-mora.md")
- fallback_agent: qual dos agents do orquestrador deve receber se a skill não conseguir executar (bia, diretor-marketing, gestor-leads, orquestrador-condo, financeiro-condo, atendimento-condo, compliance-condo, comunicacao-condo, energia-condo, seguros-condo, manutencao-condo, vertical-builder, assembleia-condo, docs-condo, importador-v2)
- receipt_md: recipe passo-a-passo (5-7 passos numerados) em PT-PT do que a skill faz
- prompt_template: template variável com {{slots}} que o agent invoca

Responde APENAS JSON válido (sem markdown):
{
  "name": "...",
  "description": "...",
  "category": "...",
  "connectors": ["..."],
  "context_files": ["..."],
  "fallback_agent": "...",
  "receipt_md": "1. ...\\n2. ...\\n...",
  "prompt_template": "..."
}`

async function generateReceipt(tag: string, context: string): Promise<any> {
  const userPrompt = `Gera receita para a skill com tag "${tag}".
${context ? `Contexto adicional: ${context}` : ""}

Responde em JSON puro como descrito no system prompt.`

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
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`anthropic_${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = (data.content?.[0]?.text || "").trim()
  const clean = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
  return JSON.parse(clean)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST")    return new Response("method_not_allowed", { status: 405, headers: cors })
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  try {
    const { skill_tag, context } = await req.json()
    if (!skill_tag) {
      return new Response(JSON.stringify({ error: "skill_tag required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // 1. Lookup skill
    const { data: skill, error: sErr } = await sb.schema("system").from("skills")
      .select("*").eq("tag", skill_tag.toLowerCase()).maybeSingle()

    // Se já está completa, no-op
    if (skill && skill.status === "active" && skill.receipt_md && skill.connectors?.length > 0) {
      return new Response(JSON.stringify({
        ok: true, skill_id: skill.id, status: "already_complete",
      }), { headers: { ...cors, "Content-Type": "application/json" } })
    }

    // 2. Gera receita via Claude
    const receipt = await generateReceipt(skill_tag, context || "")

    // 3. Upsert
    const upsertPayload = {
      tag: skill_tag.toLowerCase(),
      slug: skill?.slug || skill_tag.toLowerCase(),
      name: receipt.name,
      description: receipt.description,
      category: receipt.category || "general",
      connectors: receipt.connectors || [],
      context_files: receipt.context_files || [],
      fallback_agent: receipt.fallback_agent,
      receipt_md: receipt.receipt_md,
      prompt_template: receipt.prompt_template,
      status: "active",
      auto_generated: true,
      proposed_at: new Date().toISOString(),
    }

    let skillId: string
    if (skill) {
      const { error: uErr } = await sb.schema("system").from("skills")
        .update(upsertPayload).eq("id", skill.id)
      if (uErr) throw new Error(`update_failed: ${uErr.message}`)
      skillId = skill.id
    } else {
      const { data, error: iErr } = await sb.schema("system").from("skills")
        .insert(upsertPayload).select("id").single()
      if (iErr) throw new Error(`insert_failed: ${iErr.message}`)
      skillId = data.id
    }

    return new Response(JSON.stringify({
      ok: true,
      skill_id: skillId,
      tag: skill_tag,
      name: receipt.name,
      connectors: receipt.connectors,
      fallback_agent: receipt.fallback_agent,
      receipt_preview: receipt.receipt_md?.slice(0, 200),
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
