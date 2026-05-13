/* agent-self-generate-skill v1 — Sprint ε
 * Quando um agent recebe um pedido para o qual não tem skill, chama esta fn:
 * POST { intent: string, agent_id: string, context?: string }
 *
 * Anthropic Haiku é instruído a desenhar a skill (slug, name, description,
 * input/output schema, prompt template) e nós inserimos como draft 'review'
 * em system.skills via RPC skill_propose. Cria approval + inbox item para
 * o Mário aprovar.
 *
 * Resposta: { skill_id, slug, status: 'review', message: '...' }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY  = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL          = "claude-haiku-4-5-20251001"

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

const DESIGNER_PROMPT = `Recebes uma intenção que um agent não consegue executar com as skills actuais.
Desenhas a especificação da SKILL nova necessária.

Responde APENAS um JSON válido com este formato (sem markdown wrapper):
{
  "slug":          "kebab-case-id-unico",        // ex: "extract-pdf-invoice"
  "name":          "Nome humano em PT-PT",        // ex: "Extrair PDF de fatura"
  "description":   "Frase resumindo o que faz",
  "category":      "CATEGORIA",                   // ex: EXTRACT, COMPOSE, MATCH, CLASSIFY, ESCALATE, FETCH, ANALYZE
  "tag":           "tag opcional",
  "input_schema":  { "type": "object", "properties": {} },
  "output_schema": { "type": "object", "properties": {} },
  "prompt_template": "Template instrução em PT-PT — usa {{vars}} para placeholders"
}

REGRAS:
- slug em kebab-case, único, conciso (3-5 palavras com hifens)
- description em PT-PT, ≤ 120 chars
- input/output_schema JSON-schema válido
- prompt_template em PT-PT-PT (não brasileiro) explicando o agent o que deve fazer
- Não inventes integrações; usa só capabilities standard
- Se a intenção for ambígua, escolhe a interpretação mais útil`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  try {
    const body = await req.json()
    const intent: string = body.intent || ""
    const agentId: string = body.agent_id || "unknown"
    const context: string = body.context || ""

    if (!intent) {
      return new Response(JSON.stringify({ error: "intent required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Chama Anthropic para desenhar a skill
    const userMessage = `Intenção: ${intent}\nAgent solicitante: ${agentId}${context ? `\nContexto extra: ${context}` : ''}`
    const aRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: DESIGNER_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    })
    if (!aRes.ok) {
      const txt = await aRes.text()
      return new Response(JSON.stringify({ error: `anthropic_${aRes.status}`, detail: txt.slice(0, 200) }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const aData = await aRes.json()
    const textBlock = (aData.content || []).find((b: { type: string }) => b.type === "text")
    if (!textBlock) {
      return new Response(JSON.stringify({ error: "no_text_in_response" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Parse JSON da resposta — tolera fences ```json se acontecer
    let spec
    try {
      let raw: string = (textBlock as { text: string }).text.trim()
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
      }
      spec = JSON.parse(raw)
    } catch (e) {
      return new Response(JSON.stringify({
        error: "invalid_spec_json",
        raw: (textBlock as { text: string }).text.slice(0, 400),
      }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    if (!spec.slug || !spec.name) {
      return new Response(JSON.stringify({ error: "incomplete_spec", spec }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Inserir skill como 'review' via RPC skill_propose
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: skillId, error: rpcErr } = await sb.schema("system").rpc("skill_propose", {
      p_slug:        spec.slug,
      p_name:        spec.name,
      p_description: spec.description || null,
      p_category:    spec.category || null,
      p_tag:         spec.tag || null,
      p_input_schema:    spec.input_schema  || null,
      p_output_schema:   spec.output_schema || null,
      p_prompt_template: spec.prompt_template || null,
      p_proposed_by_agent: agentId,
    })

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message, spec }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      skill_id: skillId,
      slug: spec.slug,
      status: "review",
      message: `Skill "${spec.name}" proposta em revisão. Aprovação pendente do Mário.`,
      spec,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
