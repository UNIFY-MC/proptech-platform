/* agent-chat v1 — Sprint β
 * Endpoint POST com tool calls Anthropic.
 * Body: { message: string, history?: [{role, content}], context?: {vertical, active_employee_id} }
 * Tools: task_create, task_list, task_assign, task_update_status,
 *        inbox_list, inbox_archive
 * Devolve: { reply: string, tool_calls: [], tool_results: [] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANTHROPIC_KEY   = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL           = "claude-haiku-4-5-20251001"

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

// ─── Tool definitions ─────────────────────────────────────────
const TOOLS = [
  {
    name: "task_create",
    description: "Cria uma nova task em system.tasks. Use para 'cria task', 'lembra-me', 'atribui a X', etc.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título conciso da task" },
        description_md: { type: "string", description: "Descrição opcional em markdown" },
        kind: { type: "string", enum: ["task", "idea", "followup", "reminder"], description: "Tipo" },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
        vertical: { type: "string", description: "v2, v3, v4, v5, v10 — vertical relacionada" },
        owner_agent_id: { type: "string", description: "id do agent owner (ex: 'bia', 'financeiro-condo')" },
        due_at: { type: "string", description: "ISO 8601 due date opcional" },
      },
      required: ["title"],
    },
  },
  {
    name: "task_list",
    description: "Lista tasks com filtros. Use para 'mostra-me tasks abertas', 'tasks da Bia', etc.",
    input_schema: {
      type: "object",
      properties: {
        status:        { type: "string", enum: ["open", "in_progress", "done", "cancelled", "blocked"] },
        vertical:      { type: "string" },
        owner_agent_id:{ type: "string" },
        limit:         { type: "number", description: "Máximo de resultados (default 20)" },
      },
    },
  },
  {
    name: "task_update_status",
    description: "Muda status de uma task. Use para 'marca como done', 'cancela task X', etc.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        status:  { type: "string", enum: ["open", "in_progress", "done", "cancelled", "blocked"] },
      },
      required: ["task_id", "status"],
    },
  },
  {
    name: "task_assign",
    description: "Atribui task a agent. Use para 'atribui a João', etc.",
    input_schema: {
      type: "object",
      properties: {
        task_id:        { type: "string" },
        owner_agent_id: { type: "string" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "inbox_list",
    description: "Lista items da inbox por kind/vertical. Use para 'o que tenho na inbox', 'notícias hoje', etc.",
    input_schema: {
      type: "object",
      properties: {
        kind:     { type: "string", description: "roundup|news|instagram|op|alert|task|mention" },
        vertical: { type: "string" },
        limit:    { type: "number" },
      },
    },
  },
] as const

// ─── Tool executors ───────────────────────────────────────────
async function execTool(sb: ReturnType<typeof createClient>, name: string, args: Record<string, unknown>) {
  try {
    if (name === "task_create") {
      const { data, error } = await sb.schema("system").rpc("task_create", {
        p_title: args.title, p_description_md: args.description_md ?? null,
        p_kind: args.kind ?? "task", p_priority: args.priority ?? "normal",
        p_vertical: args.vertical ?? null, p_owner_agent_id: args.owner_agent_id ?? null,
        p_due_at: args.due_at ?? null, p_source_kind: "chat",
      })
      if (error) return { error: error.message }
      return { task_id: data, ok: true }
    }
    if (name === "task_list") {
      let q = sb.from("system_tasks").select("*").order("created_at", { ascending: false }).limit((args.limit as number) || 20)
      if (args.status)         q = q.eq("status", args.status)
      if (args.vertical)       q = q.eq("vertical", args.vertical)
      if (args.owner_agent_id) q = q.eq("owner_agent_id", args.owner_agent_id)
      const { data, error } = await q
      if (error) return { error: error.message }
      return { tasks: data || [], count: (data || []).length }
    }
    if (name === "task_update_status") {
      const { error } = await sb.schema("system").rpc("task_update_status", {
        p_task_id: args.task_id, p_status: args.status,
      })
      if (error) return { error: error.message }
      return { ok: true }
    }
    if (name === "task_assign") {
      const { error } = await sb.schema("system").rpc("task_assign", {
        p_task_id: args.task_id, p_owner_agent_id: args.owner_agent_id ?? null,
      })
      if (error) return { error: error.message }
      return { ok: true }
    }
    if (name === "inbox_list") {
      let q = sb.schema("system").from("inbox_items").select("id,title,kind,vertical,created_at")
        .eq("status", "active").order("created_at", { ascending: false }).limit((args.limit as number) || 10)
      if (args.kind)     q = q.eq("kind", args.kind)
      if (args.vertical) q = q.eq("vertical", args.vertical)
      const { data, error } = await q
      if (error) return { error: error.message }
      return { items: data || [] }
    }
    return { error: `tool_unknown:${name}` }
  } catch (e) {
    return { error: String(e) }
  }
}

// ─── Anthropic call ───────────────────────────────────────────
async function callAnthropic(messages: unknown[], system: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools: TOOLS,
      messages,
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`anthropic_${res.status}:${txt.slice(0, 200)}`)
  }
  return await res.json()
}

const BASE_SYSTEM_PROMPT = `És o orquestrador do dashboard agentic-ops do Mário Carvalho (Property007).
Responde sempre em Português de Portugal (PT-PT), conciso.

Tens tools para gerir tasks (system.tasks) e listar items da inbox.
Quando o user pede algo accionável (criar task, atribuir, marcar feito, ver tasks), USA tools.
Quando o user faz pergunta de informação simples, responde directamente.

IDs de agentes disponíveis (usa estes em owner_agent_id):
- bia (operations, V5)
- assembleia-condo, atendimento-condo (V2, support/operations)
- comunicacao-condo (V2, marketing)
- compliance-condo (V2, legal)
- docs-condo, manutencao-condo (V2, operations)
- energia-condo, seguros-condo (V2+V4 / V2+V3, sales)
- financeiro-condo (V2, finance)
- orquestrador-condo (V2, engineering)
- criativo-conteudo, diretor-marketing, gestor-ads, gestor-leads, publisher-social (marketing/sales transversais)

Verticais: v2, v3, v4, v5, v10.

Após executar tool, devolve resposta humana resumindo o que fizeste.`

// Sprint Q1 — auto-load contexto (SOPs/ICPs/legal/never-rules) do agent activo
async function loadAgentContext(
  sb: ReturnType<typeof createClient>,
  agentId: string,
  maxChars = 6000,
): Promise<string> {
  if (!agentId) return ""
  try {
    const { data, error } = await sb.rpc("get_agent_context", {
      p_agent_id: agentId,
      p_max_chars: maxChars,
    })
    if (error) return ""
    return (data as string) || ""
  } catch {
    return ""
  }
}

function buildSystemPrompt(agentContext: string): string {
  if (!agentContext) return BASE_SYSTEM_PROMPT
  return `${BASE_SYSTEM_PROMPT}\n\nCONTEXTO DO AGENT ACTIVO (SOPs / ICPs / Legal / Never-rules — segue à risca):\n${agentContext}`
}

// ─── Handler ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  try {
    const body  = await req.json()
    const userMessage: string = body.message || ""
    const history: { role: string, content: string }[] = body.history || []

    if (!userMessage) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // Sprint Q1 — auto-load contexto do agent activo (se houver)
    const activeAgentId: string = body?.context?.active_employee_id || ""
    const agentContext = await loadAgentContext(sb, activeAgentId, 6000)
    const systemPrompt = buildSystemPrompt(agentContext)

    // Build messages — converter para formato Anthropic
    const messages: unknown[] = [
      ...history.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
      { role: "user", content: userMessage },
    ]

    // Multi-turn loop: chama Anthropic, se devolver tool_use, executa e re-chama
    const toolCallsLog: { name: string, input: unknown, result: unknown }[] = []
    let finalText = ""

    for (let turn = 0; turn < 5; turn++) {
      const resp = await callAnthropic(messages, systemPrompt)
      const content = resp.content || []
      const stopReason = resp.stop_reason

      // Extrair texto
      for (const block of content) {
        if (block.type === "text") finalText += block.text
      }

      if (stopReason !== "tool_use") break

      // Executar tools
      messages.push({ role: "assistant", content })
      const toolResults: unknown[] = []
      for (const block of content) {
        if (block.type === "tool_use") {
          const result = await execTool(sb, block.name, block.input)
          toolCallsLog.push({ name: block.name, input: block.input, result })
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        }
      }
      messages.push({ role: "user", content: toolResults })
    }

    return new Response(JSON.stringify({
      reply: finalText.trim() || "(sem resposta)",
      tool_calls: toolCallsLog,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
