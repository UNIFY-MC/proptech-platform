/* task-execute v1 — runner para tasks atribuídas a agents
 *
 * POST { task_id }
 *
 * Pipeline:
 *  1. Fetch task da BD (status, owner_agent_id, title, description, payload)
 *  2. Marca como 'in_progress' (= Kanban "Running")
 *  3. Cria steps iniciais: ["Análise pedido", "Pesquisa contexto", "Execução", "Verificação"]
 *  4. Chama Anthropic Haiku 4.5 com tool calls (mesma engine do agent-chat)
 *     — system prompt customizado por owner_agent_id (Bia, Director Marketing, etc.)
 *  5. Por cada step do plan, marca running → done (ou failed)
 *  6. Final: status='done' se completou; 'needs_human' se agente decidiu escalar;
 *     'failed' se erro
 *  7. Output guardado em payload.execution.{output, tool_calls, ai_response}
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

// System prompt por agent — define personalidade e foco
const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  "bia": `És a Bia — Maintenance Concierge da V5 Property007. Recebes uma task e produzes plano accionável em PT-PT.
Tens know-how em: classificação urgência, matching prestadores, composição WhatsApp, escalation. Sempre PT-PT, conciso, sem inventar preços.`,

  "diretor-marketing": `És o Diretor de Marketing da Property007. Recebes briefing estratégico e produzes plano de marketing concreto: target, message, channels, KPIs, prazos. PT-PT, foco em ROI mensurável.`,

  "gestor-leads": `És o gestor de Sales/Leads. Recebes task de lead generation/qualification e produzes pipeline de acções: targeting, outreach, follow-up cadence, conversion gates. PT-PT.`,

  "orquestrador-condo": `És o orquestrador de operações Condomínios. Recebes task operacional e divides em sub-tarefas para assembleia-condo / docs-condo / financeiro-condo / etc. PT-PT.`,

  "financeiro-condo": `És responsável Finance. Recebes task financeira (quotas, faturas, recebimentos, mora) e produzes plano com prazos legais PT, cálculos, comunicação ao condómino. Conciso, PT-PT.`,

  "atendimento-condo": `És Support — recebes task de cliente/condómino, produzes plano de atendimento com ETA, escalations, comunicação. PT-PT.`,

  "compliance-condo": `És responsável Legal/Compliance. Recebes task com componente legal (RGPD, Código Civil PT, deliberações) e produzes parecer + acções. Cita artigos quando relevante. PT-PT.`,

  "default": `És um agent assistant da Property007 (PropTech Portugal). Recebes uma task e produzes plano accionável em PT-PT, conciso, com sub-passos numerados.`,
}

interface TaskExecuteResult {
  status: "done" | "needs_human" | "failed"
  summary: string
  steps_completed: string[]
  output_md: string
  needs_human_reason?: string
}

async function runAgent(agentId: string, task: Record<string, unknown>): Promise<TaskExecuteResult> {
  const sysPrompt = AGENT_SYSTEM_PROMPTS[agentId] || AGENT_SYSTEM_PROMPTS.default

  const taskBrief = `
TASK PARA EXECUTAR:
Título: ${task.title}
Descrição: ${task.description_md || "(sem descrição)"}
Kind: ${task.kind}
Vertical: ${task.vertical || "global"}
Priority: ${task.priority}

Contexto do payload:
${JSON.stringify(task.payload || {}, null, 2).slice(0, 800)}
`.trim()

  const prompt = `${taskBrief}

Produz um plano de execução em PT-PT. Identifica:
1. Que sub-passos farias para resolver esta task (4-6 passos)
2. Output concreto que entregarias
3. Se precisas de aprovação humana antes de executar algo (ex: enviar email externo, gastar dinheiro, mudança irreversível)

Responde APENAS JSON válido (sem markdown):
{
  "summary": "1 frase do que vais entregar (max 200ch)",
  "steps_completed": ["Passo 1 (que fiz/faria)", "Passo 2", ...],
  "output_md": "Output detalhado em markdown PT-PT — o entregável real (ex: rascunho email, lista de prestadores, análise de gap, etc.)",
  "needs_human": false,
  "needs_human_reason": "Se needs_human=true, explica porquê (max 200ch)"
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
      max_tokens: 2000,
      system: sysPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`anthropic_${res.status}: ${txt.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = (data.content?.[0]?.text || "").trim()
  const clean = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
  const parsed = JSON.parse(clean) as { summary: string, steps_completed: string[], output_md: string, needs_human?: boolean, needs_human_reason?: string }

  return {
    status: parsed.needs_human ? "needs_human" : "done",
    summary: parsed.summary,
    steps_completed: parsed.steps_completed || [],
    output_md: parsed.output_md || "",
    needs_human_reason: parsed.needs_human_reason,
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }

  try {
    const { task_id } = await req.json()
    if (!task_id) {
      return new Response(JSON.stringify({ error: "task_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    // Fetch task
    const { data: task, error: tErr } = await sb.schema("system").from("tasks")
      .select("*").eq("id", task_id).single()
    if (tErr || !task) {
      return new Response(JSON.stringify({ error: "task_not_found", detail: tErr?.message }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    if (!task.owner_agent_id) {
      return new Response(JSON.stringify({ error: "task_has_no_owner_agent" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Mark in_progress + steps iniciais "Reading task"
    await sb.schema("system").from("tasks").update({
      status: "in_progress",
      steps: [
        { name: "Recebida pelo agent", status: "done", at: new Date().toISOString() },
        { name: "Análise do pedido",   status: "running" },
      ],
    }).eq("id", task_id)

    let result: TaskExecuteResult
    try {
      result = await runAgent(task.owner_agent_id, task)
    } catch (e) {
      // Falhou — marca failed
      await sb.schema("system").from("tasks").update({
        status: "failed",
        steps: [
          { name: "Recebida pelo agent", status: "done" },
          { name: "Análise do pedido",   status: "failed", error: String(e) },
        ],
        payload: {
          ...(task.payload || {}),
          execution: { error: String(e), at: new Date().toISOString() },
        },
      }).eq("id", task_id)

      return new Response(JSON.stringify({ ok: false, status: "failed", error: String(e) }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Sucesso — marca done ou needs_human + steps
    const finalSteps = [
      { name: "Recebida pelo agent", status: "done" },
      { name: "Análise do pedido",   status: "done" },
      ...result.steps_completed.map((s) => ({ name: s, status: "done" })),
      ...(result.status === "needs_human"
        ? [{ name: "⚠ Requer aprovação humana", status: "needs_human", reason: result.needs_human_reason }]
        : [{ name: "Concluído", status: "done" }]),
    ]

    const updatePayload: Record<string, unknown> = {
      status: result.status,
      steps: finalSteps,
      payload: {
        ...(task.payload || {}),
        execution: {
          summary: result.summary,
          output_md: result.output_md,
          needs_human_reason: result.needs_human_reason,
          agent: task.owner_agent_id,
          model: MODEL,
          at: new Date().toISOString(),
        },
      },
    }
    if (result.status === "done") updatePayload.done_at = new Date().toISOString()

    await sb.schema("system").from("tasks").update(updatePayload).eq("id", task_id)

    return new Response(JSON.stringify({
      ok: true,
      task_id,
      status: result.status,
      summary: result.summary,
      output_preview: result.output_md.slice(0, 300),
      steps_count: finalSteps.length,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
