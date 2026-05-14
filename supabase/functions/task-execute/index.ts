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
  delegated_to?: string  // se a skill não tem connector e o agent escolheu delegar
}

interface SkillRow {
  tag: string
  name: string
  description?: string
  connectors?: string[]
  receipt_md?: string
  prompt_template?: string
  fallback_agent?: string
  status: string
}

// Lê context_files do Supabase Storage e devolve concatenação para injecção
async function readContextFiles(sb: any, paths: string[]): Promise<string> {
  if (!paths || paths.length === 0) return ""
  const chunks: string[] = []
  for (const p of paths.slice(0, 5)) {  // max 5 ficheiros
    try {
      // Path esperado "bucket/path/to/file.md"
      const [bucket, ...rest] = p.split("/")
      const filePath = rest.join("/")
      if (!bucket || !filePath) continue
      const { data, error } = await sb.storage.from(bucket).download(filePath)
      if (error || !data) continue
      const text = await data.text()
      chunks.push(`### ${p}\n${text.slice(0, 4000)}`)
    } catch { /* skip */ }
  }
  return chunks.join("\n\n")
}

// Sprint Q1 — auto-load SOPs/ICPs/never-rules/legal/procedure do agent
// via RPC system.get_agent_context (vê migration 20260515_context_docs_wired).
async function loadAgentContext(sb: any, agentId: string, maxChars = 8000): Promise<string> {
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

// Garante que cada skill da task existe em system.skills + tem receipt completo.
// Dispara skill-create lazy se faltam receipts.
async function resolveSkills(sb: any, skillTags: string[]): Promise<SkillRow[]> {
  if (!skillTags || skillTags.length === 0) return []
  const resolved: SkillRow[] = []
  for (const tag of skillTags) {
    // ensure (cria stub se não existe)
    await sb.schema("system").rpc("skill_ensure", { p_tag: tag })

    // lookup
    let { data: skill } = await sb.schema("system").from("skills")
      .select("tag,name,description,connectors,receipt_md,prompt_template,fallback_agent,status")
      .eq("tag", tag.toLowerCase()).maybeSingle()

    // Se ainda pending_receipt, dispara skill-create (fire-and-wait)
    if (skill && skill.status === "pending_receipt") {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/skill-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ skill_tag: tag }),
        })
        // re-fetch após geração
        const { data: refreshed } = await sb.schema("system").from("skills")
          .select("tag,name,description,connectors,receipt_md,prompt_template,fallback_agent,status")
          .eq("tag", tag.toLowerCase()).maybeSingle()
        if (refreshed) skill = refreshed
      } catch { /* falha de geração — continua com stub */ }
    }
    if (skill) resolved.push(skill)
  }
  return resolved
}

async function runAgent(
  agentId: string,
  task: Record<string, unknown>,
  skills: SkillRow[],
  contextFilesText: string,
  agentContextText: string,
): Promise<TaskExecuteResult> {
  const baseSysPrompt = AGENT_SYSTEM_PROMPTS[agentId] || AGENT_SYSTEM_PROMPTS.default

  const skillsBlock = skills.length === 0 ? "" : `
SKILLS DISPONÍVEIS PARA ESTA TASK:
${skills.map(s => `
🛠 ${s.name} (tag: ${s.tag})
   Connectors: ${(s.connectors || []).join(", ") || "—"}
   Fallback agent: ${s.fallback_agent || "—"}
   Receita:
${(s.receipt_md || "").split("\n").map(l => `   ${l}`).join("\n")}
   Template: ${s.prompt_template || "—"}
`).join("\n")}

Se uma skill requer connector que NÃO tens disponível ou requer aprovação humana, marca needs_human=true e indica delegated_to=<fallback_agent>.
`.trim()

  const agentContextBlock = agentContextText
    ? `\nCONTEXTO GLOBAL DO AGENT (SOPs / ICPs / Legal / Never-rules — segue à risca):\n${agentContextText}\n`
    : ""

  const contextBlock = contextFilesText ? `\nCONTEXTO DE FICHEIROS (lido do Storage):\n${contextFilesText}\n` : ""

  const sysPrompt = `${baseSysPrompt}\n\n${skillsBlock}${agentContextBlock}${contextBlock}`

  const taskBrief = `
TASK PARA EXECUTAR:
Título: ${task.title}
Descrição: ${task.description_md || "(sem descrição)"}
Kind: ${task.kind}
Vertical: ${task.vertical || "global"}
Priority: ${task.priority}
Skills: ${(task.skills as string[] || []).join(", ") || "—"}

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
  "needs_human_reason": "Se needs_human=true, explica porquê (max 200ch)",
  "delegated_to": "Se quiseres passar a outro agent (por skill faltar connector), agent_id. Senão null."
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

  // Parsing tolerante: tenta JSON puro → fenced → fallback regex-extract
  function tryParseJSON(s: string): any | null {
    try { return JSON.parse(s) } catch { return null }
  }

  let parsed: any = null
  const clean = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
  parsed = tryParseJSON(clean)

  if (!parsed) {
    // Tenta extrair o primeiro { ... } balanceado
    const start = clean.indexOf("{")
    if (start >= 0) {
      let depth = 0, end = -1
      for (let i = start; i < clean.length; i++) {
        if (clean[i] === "{") depth++
        else if (clean[i] === "}") { depth--; if (depth === 0) { end = i; break } }
      }
      if (end > start) parsed = tryParseJSON(clean.slice(start, end + 1))
    }
  }

  if (!parsed) {
    // Fallback final: extracção manual via regex (tolera quotes irregulares no output_md)
    const sumMatch  = clean.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    const stepsMatch = clean.match(/"steps_completed"\s*:\s*\[([\s\S]*?)\]/)
    const nhMatch   = clean.match(/"needs_human"\s*:\s*(true|false)/)
    const reasonMatch = clean.match(/"needs_human_reason"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    parsed = {
      summary: sumMatch?.[1]?.replace(/\\"/g, '"') || "Output produzido mas JSON parse falhou.",
      steps_completed: stepsMatch ? Array.from(stepsMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)).map(m => m[1].replace(/\\"/g, '"')) : [],
      output_md: clean.slice(0, 4000),  // preserva o output completo como markdown
      needs_human: nhMatch?.[1] === "true",
      needs_human_reason: reasonMatch?.[1]?.replace(/\\"/g, '"'),
    }
  }

  return {
    status: parsed.needs_human ? "needs_human" : "done",
    summary: parsed.summary || "",
    steps_completed: parsed.steps_completed || [],
    output_md: parsed.output_md || "",
    needs_human_reason: parsed.needs_human_reason,
    delegated_to: parsed.delegated_to,
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
        { name: "Recebida pelo agent",   status: "done", at: new Date().toISOString() },
        { name: "Resolver skills",       status: "running" },
        { name: "Ler contexto (files)",  status: "pending" },
        { name: "Análise do pedido",     status: "pending" },
      ],
    }).eq("id", task_id)

    // Resolve skills (ensure + receipt-fill)
    const skillTags: string[] = Array.isArray(task.skills) ? task.skills : []
    const resolvedSkills = await resolveSkills(sb, skillTags)

    // Ler context_files (de cada skill + da task)
    const allContextPaths = [
      ...resolvedSkills.flatMap((s: any) => (s.context_files || []) as string[]),
      ...((task.files || []) as any[]).map((f: any) => f.url).filter(Boolean),
    ]
    const contextText = await readContextFiles(sb, allContextPaths)

    // Sprint Q1 — auto-load SOPs/ICPs/legal/never-rules para o agent (e globais)
    const agentContextText = await loadAgentContext(sb, task.owner_agent_id as string, 8000)
    const agentContextChars = agentContextText.length

    await sb.schema("system").from("tasks").update({
      steps: [
        { name: "Recebida pelo agent",   status: "done" },
        { name: "Resolver skills",       status: "done", skills: resolvedSkills.map((s: any) => s.tag) },
        { name: "Ler contexto (files)",  status: "done", files_read: allContextPaths.length },
        { name: "Ler contexto global",   status: "done", context_chars: agentContextChars },
        { name: "Análise do pedido",     status: "running" },
      ],
    }).eq("id", task_id)

    let result: TaskExecuteResult
    try {
      result = await runAgent(task.owner_agent_id, task, resolvedSkills, contextText, agentContextText)
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

    // Sucesso — marca done ou needs_human + steps preservando histórico
    const finalSteps = [
      { name: "Recebida pelo agent",   status: "done" },
      { name: "Resolver skills",       status: "done", skills: resolvedSkills.map((s: any) => s.tag) },
      { name: "Ler contexto (files)",  status: "done", files_read: allContextPaths.length },
      { name: "Ler contexto global",   status: "done", context_chars: agentContextChars },
      { name: "Análise do pedido",     status: "done" },
      ...result.steps_completed.map((s) => ({ name: s, status: "done" })),
      ...(result.status === "needs_human"
        ? [{ name: "⚠ Requer aprovação humana", status: "needs_human", reason: result.needs_human_reason }]
        : result.delegated_to
          ? [{ name: `↪ Delegado a ${result.delegated_to}`, status: "done" }, { name: "Concluído", status: "done" }]
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
          delegated_to: result.delegated_to,
          skills_used: resolvedSkills.map((s: any) => ({ tag: s.tag, name: s.name, connectors: s.connectors })),
          context_files_read: allContextPaths.length,
          agent_context_chars: agentContextChars,
          agent: task.owner_agent_id,
          model: MODEL,
          at: new Date().toISOString(),
        },
      },
    }
    if (result.status === "done") updatePayload.done_at = new Date().toISOString()

    // Auto-comment com sumário no comment stream
    await sb.schema("system").from("task_comments").insert({
      task_id,
      author_kind: "agent",
      author_name: task.owner_agent_id || "agent",
      body_md: result.summary || "Execução concluída.",
      kind: result.status === "needs_human" ? "status_update" : "mission_completed",
      metadata: {
        skills_used: resolvedSkills.map((s: any) => s.tag),
        delegated_to: result.delegated_to,
      },
    })

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
