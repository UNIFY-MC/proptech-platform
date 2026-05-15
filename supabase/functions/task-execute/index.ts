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

// Sprint Q1.8 — web_browse tool: fetch URL + strip HTML
// Browserbase pode ser integrado depois (env BROWSERBASE_API_KEY).
const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY") || ""

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

async function webBrowse(url: string, query?: string): Promise<{ ok: boolean; url: string; content: string; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Property007 Agent) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return { ok: false, url, content: "", error: `HTTP ${res.status}` }
    const html = await res.text()
    const text = stripHtml(html)
    return { ok: true, url, content: text.slice(0, 8000) }
  } catch (e) {
    return { ok: false, url, content: "", error: String(e) }
  }
}

// Sprint Q1.8 — save_to_context_docs tool: agent guarda fonte legal/SOP
async function saveContextDoc(sb: any, input: {
  title: string
  type: string
  content: string
  source_url?: string
  employee_id?: string
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await sb.schema("system").from("context_docs").insert({
      title: input.title.slice(0, 200),
      type: input.type,
      content: input.content.slice(0, 50000),
      source_url: input.source_url || null,
      employee_id: input.employee_id || null,  // NULL = global
      tags: ["auto-saved", "agent-research"],
    }).select("id").single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id }
  } catch (e) {
    return { ok: false, error: String(e) }
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

interface RunAgentExtras {
  research_done: Array<{ url: string; query?: string; chars: number }>
  saved_docs: Array<{ id: string; title: string; type: string; source_url?: string }>
}

async function runAgent(
  agentId: string,
  task: Record<string, unknown>,
  skills: SkillRow[],
  contextFilesText: string,
  agentContextText: string,
  sb: any,
): Promise<TaskExecuteResult & { extras: RunAgentExtras }> {
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

  // Sprint Q1.7 — revision pass: se há revision_request no payload, é uma 2ª passagem
  // O agent recebe o output anterior + a crítica/instrução do humano e produz nova versão.
  const payload = (task.payload || {}) as Record<string, any>
  const revisionRequest: string = payload.revision_request || ""
  const previousOutput: string = payload.execution?.output_md || ""
  const isRevision = !!revisionRequest && !!previousOutput

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

  const revisionBlock = isRevision ? `

═══════════════════════════════════════
PEDIDO DE REVISÃO (humano não aprovou a primeira tentativa)
═══════════════════════════════════════

OUTPUT ANTERIOR QUE PRODUZISTE:
\`\`\`
${previousOutput.slice(0, 4000)}
\`\`\`

INSTRUÇÃO DE REVISÃO DO MÁRIO:
${revisionRequest}

REGRA: produz uma NOVA versão do output_md que aplica esta instrução à risca.
NÃO repitas a versão anterior. Tens de mudar o que o Mário pediu.
Se a instrução pede consultar documentação adicional, faz isso explicitamente no output.
` : ""

  const prompt = `${taskBrief}
${revisionBlock}

${isRevision
  ? "Esta é a REVISÃO. Produz nova versão aplicando a instrução acima."
  : "Produz um plano de execução em PT-PT. Se não tens informação suficiente nos SOPs/legal, USA AS TOOLS antes de submeter — podes pesquisar na web e guardar fontes encontradas."}

FLUXO RECOMENDADO:
1. Se faltam dados, usa 'web_browse' (1-3 URLs relevantes — sites legais PT como dre.pt, sites profissionais)
2. Se encontrares legislação/doc útil, usa 'save_to_context_docs' (futuro: outros agents reusam)
3. Se a task é para outro agent, usa 'delegate_to'
4. Quando tiveres tudo, usa 'submit_task_result' para entregares.

Usa 'submit_task_result' OU 'delegate_to' como passo final.${isRevision ? " summary começa com 'Revisão:'." : ""}`

  // Sprint Q1.7 + Q1.8 — tool_use multi-turn com 4 tools
  const SUBMIT_TOOL = {
    name: "submit_task_result",
    description: "PASSO FINAL — entrega o resultado da task. Usa só quando completou a investigação.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1 frase do que vais entregar (max 200ch)" },
        steps_completed: { type: "array", items: { type: "string" }, description: "Lista de sub-passos executados (inclui 'consultou X URL', 'guardou doc Y')" },
        output_md: { type: "string", description: "Entregável em markdown PT-PT (headers, listas, citações de lei com art.NNNº, links das fontes consultadas)." },
        needs_human: { type: "boolean", description: "true se requer aprovação humana antes de executar acção irreversível" },
        needs_human_reason: { type: "string", description: "Se needs_human=true, explica porquê (max 200ch)" },
      },
      required: ["summary", "steps_completed", "output_md", "needs_human"],
    },
  }

  const WEB_BROWSE_TOOL = {
    name: "web_browse",
    description: "Faz fetch de uma URL e devolve o texto extraído (~8000 chars). Usa para consultar legislação (dre.pt), Wikipedia, sites profissionais, jurisprudência. NÃO inventes URLs — usa só URLs que conheces (ex: https://dre.pt/web/guest/legislacao-consolidada/-/lc/...).",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL completa (https://...) a consultar" },
        query: { type: "string", description: "O que estás a procurar (para logging)" },
      },
      required: ["url"],
    },
  }

  const SAVE_DOC_TOOL = {
    name: "save_to_context_docs",
    description: "Guarda uma fonte (legislação, SOP, procedure, never-rule) em system.context_docs. Outros agents (e tu próprio em runs futuras) consultam isto via get_agent_context. Usa quando encontraste documentação importante a preservar.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título curto e específico (ex: 'DL 268/94 art. 1432º — quórum assembleia')" },
        type: { type: "string", enum: ["sop","icp","call_recap","adr","never_rule","legal","procedure"], description: "Tipo (legal para texto de lei, sop para procedimento, never_rule para regras estritas)" },
        content: { type: "string", description: "Conteúdo em markdown PT-PT (citações literais + interpretação)" },
        source_url: { type: "string", description: "URL onde encontraste (se aplicável)" },
        global: { type: "boolean", description: "true = aplicável a TODOS agents (default), false = só ao agent actual" },
      },
      required: ["title", "type", "content"],
    },
  }

  const DELEGATE_TOOL = {
    name: "delegate_to",
    description: "Passa a task a outro agent (responsável de departamento mais adequado). Usa quando a task realmente exige outro especialista. Agent options: bia, orquestrador-condo, diretor-marketing, gestor-leads, financeiro-condo, atendimento-condo, compliance-condo.",
    input_schema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent destino (um dos heads listados)" },
        reason: { type: "string", description: "Porque delegas — uma frase clara" },
        context_to_pass: { type: "string", description: "Resumo do que já investigaste para o próximo agent não recomeçar do zero" },
      },
      required: ["agent_id", "reason"],
    },
  }

  const TOOLS = [SUBMIT_TOOL, WEB_BROWSE_TOOL, SAVE_DOC_TOOL, DELEGATE_TOOL]

  // Multi-turn loop — agent pode usar tools antes de submit_task_result
  const messages: any[] = [{ role: "user", content: prompt }]
  const research_done: RunAgentExtras["research_done"] = []
  const saved_docs: RunAgentExtras["saved_docs"] = []
  const MAX_TURNS = 6

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: sysPrompt,
        tools: TOOLS,
        messages,
      }),
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`anthropic_${res.status}: ${txt.slice(0, 200)}`)
    }

    const data = await res.json()
    const content = data.content || []
    const toolUses = content.filter((b: any) => b.type === "tool_use")

    if (toolUses.length === 0) {
      // Sem tool_use — provavelmente texto livre. Fallback.
      const text = content.find((b: any) => b.type === "text")?.text || ""
      return {
        status: "needs_human",
        summary: "Agent não usou submit_task_result",
        steps_completed: [],
        output_md: text.slice(0, 4000),
        needs_human_reason: "Output sem estrutura — necessita revisão",
        extras: { research_done, saved_docs },
      }
    }

    messages.push({ role: "assistant", content })

    // Process tool uses
    const toolResults: any[] = []
    for (const tu of toolUses) {
      if (tu.name === "submit_task_result") {
        // FINAL
        const p = tu.input
        return {
          status: p.needs_human ? "needs_human" : "done",
          summary: p.summary || "",
          steps_completed: p.steps_completed || [],
          output_md: p.output_md || "",
          needs_human_reason: p.needs_human_reason,
          delegated_to: undefined,
          extras: { research_done, saved_docs },
        }
      }
      if (tu.name === "delegate_to") {
        // FINAL — delegação
        return {
          status: "done",
          summary: `Delegado a ${tu.input.agent_id}: ${tu.input.reason}`,
          steps_completed: [`Delegou a ${tu.input.agent_id}`, `Razão: ${tu.input.reason}`],
          output_md: `**Delegação para ${tu.input.agent_id}**\n\n**Razão:** ${tu.input.reason}\n\n**Contexto investigado até agora:**\n\n${tu.input.context_to_pass || "(nenhum)"}\n\n**Research feita:** ${research_done.length} URLs · **Docs guardados:** ${saved_docs.length}`,
          delegated_to: tu.input.agent_id,
          extras: { research_done, saved_docs },
        }
      }
      if (tu.name === "web_browse") {
        const result = await webBrowse(tu.input.url, tu.input.query)
        research_done.push({ url: tu.input.url, query: tu.input.query, chars: result.content.length })
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result.ok
            ? `OK · ${result.content.length} chars\n\n${result.content}`
            : `ERROR · ${result.error}`,
        })
        continue
      }
      if (tu.name === "save_to_context_docs") {
        const result = await saveContextDoc(sb, {
          title: tu.input.title,
          type: tu.input.type,
          content: tu.input.content,
          source_url: tu.input.source_url,
          employee_id: tu.input.global === false ? agentId : null,
        })
        if (result.ok && result.id) {
          saved_docs.push({
            id: result.id,
            title: tu.input.title,
            type: tu.input.type,
            source_url: tu.input.source_url,
          })
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result.ok ? `OK · doc_id=${result.id}` : `ERROR · ${result.error}`,
        })
        continue
      }
      // Unknown tool
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: `ERROR · tool '${tu.name}' não suportada`,
      })
    }

    messages.push({ role: "user", content: toolResults })
  }

  // Max turns sem submit_task_result
  return {
    status: "needs_human",
    summary: "Agent excedeu turnos sem entregar resultado",
    steps_completed: [`Fez ${research_done.length} pesquisas`, `Guardou ${saved_docs.length} docs`],
    output_md: `**Atingiu max turnos (${MAX_TURNS}) sem chamar submit_task_result.**\n\nResearch: ${research_done.length} URLs\nDocs guardados: ${saved_docs.length}\n\nRevisão humana recomendada.`,
    needs_human_reason: `Max turnos atingido (${MAX_TURNS})`,
    extras: { research_done, saved_docs },
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

    let result: TaskExecuteResult & { extras?: RunAgentExtras }
    try {
      result = await runAgent(task.owner_agent_id, task, resolvedSkills, contextText, agentContextText, sb)
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

    // Limpa revision_request consumido (não fica a disparar em runs futuras).
    // Mantém revision_history para audit trail.
    const previousPayload = { ...(task.payload || {}) } as Record<string, any>
    const wasRevision = !!previousPayload.revision_request && !!previousPayload.execution?.output_md
    const consumedRevisionRequest: string = previousPayload.revision_request || ""
    const consumedPreviousOutput: string = previousPayload.execution?.output_md || ""
    if (wasRevision) {
      const history = Array.isArray(previousPayload.revision_history) ? previousPayload.revision_history : []
      history.push({
        request: consumedRevisionRequest,
        previous_output: consumedPreviousOutput.slice(0, 1000),
        revised_at: new Date().toISOString(),
        revision_number: history.length + 1,
      })
      previousPayload.revision_history = history
      delete previousPayload.revision_request
    }

    // Sprint Q1.8 — delegation chain tracking
    const delegationChain = Array.isArray(previousPayload.delegation_chain) ? previousPayload.delegation_chain : []
    if (result.delegated_to) {
      delegationChain.push({
        from: task.owner_agent_id,
        to: result.delegated_to,
        reason: result.summary,
        at: new Date().toISOString(),
      })
    }

    const updatePayload: Record<string, unknown> = {
      status: result.status,
      steps: finalSteps,
      payload: {
        ...previousPayload,
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
          is_revision: wasRevision,
          revision_number: wasRevision ? ((previousPayload.revision_history || []).length) : 0,
          research_done: result.extras?.research_done || [],
          saved_docs: result.extras?.saved_docs || [],
          at: new Date().toISOString(),
        },
        delegation_chain: delegationChain,
      },
    }
    if (result.status === "done" && !result.delegated_to) updatePayload.done_at = new Date().toISOString()

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
        research_count: result.extras?.research_done?.length || 0,
        saved_docs_count: result.extras?.saved_docs?.length || 0,
      },
    })

    await sb.schema("system").from("tasks").update(updatePayload).eq("id", task_id)

    // Sprint Q1.8 — auto-cascade delegation
    // Se o agent delegou para X e não atingimos max hops (3), re-attribui + dispara task-execute
    const MAX_DELEGATION_HOPS = 3
    if (result.delegated_to && delegationChain.length <= MAX_DELEGATION_HOPS) {
      // Detect loop: o destino já apareceu na chain como 'from'?
      const wouldLoop = delegationChain.some((d: any, i: number) => i < delegationChain.length - 1 && d.from === result.delegated_to)
      if (!wouldLoop) {
        // Re-attribui task ao novo agent + status = in_progress
        await sb.schema("system").from("tasks").update({
          owner_agent_id: result.delegated_to,
          status: "in_progress",
        }).eq("id", task_id)

        // Fire-and-forget para cascade (não bloqueia esta response)
        fetch(`${SUPABASE_URL}/functions/v1/task-execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ task_id }),
        }).catch(() => { /* falha de cascade não bloqueia */ })
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      task_id,
      status: result.status,
      summary: result.summary,
      output_preview: result.output_md.slice(0, 300),
      steps_count: finalSteps.length,
      research_count: result.extras?.research_done?.length || 0,
      saved_docs_count: result.extras?.saved_docs?.length || 0,
      delegated_to: result.delegated_to,
      delegation_depth: delegationChain.length,
    }), { headers: { ...cors, "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
