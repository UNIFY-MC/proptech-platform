// runAgent.ts — núcleo do tool use loop para todos os agents V5
//
// serviceRole sem schema default. Sempre .schema('core') para
// agent_audit_log. Tools de outras verticals usam
// .schema('v5_manutencao') no executor.
//
// Convenção stop_reason no audit:
//   - Row da iteration: stop_reason = resp.stop_reason (end_turn/tool_use/max_tokens/error)
//   - Rows de tool executions: stop_reason = NULL (só tool_name/input/output/error)

import { createMessage, calculateCostEur } from "./anthropic.ts";
import type { AgentRunOptions, AgentRunResult, AnthropicMessage } from "./types.ts";

export async function runAgent(opts: AgentRunOptions): Promise<AgentRunResult> {
  const sessionId = opts.sessionId ?? crypto.randomUUID();
  const { agentName, systemPrompt, tools, toolExecutors, context } = opts;
  const { pessoaId, organizationId, serviceRole } = context;
  const maxIterations = opts.maxIterations ?? 20;

  // Guard: exactly one of {objective, messages}
  if (opts.objective !== undefined && opts.messages !== undefined) {
    throw new Error("runAgent: passar 'objective' OU 'messages', nunca ambos.");
  }
  if (opts.objective === undefined && opts.messages === undefined) {
    throw new Error("runAgent: 'objective' ou 'messages' obrigatório.");
  }

  // Valor para audit (iteration 1) — objective ou última mensagem user do histórico
  const auditTrigger = opts.objective
    ?? (Array.isArray(opts.messages) && opts.messages.length > 0
      ? opts.messages[opts.messages.length - 1]?.content
      : null);

  // 1. Carregar policy — valida que agent existe e está activo para a org
  const { data: policy, error: policyError } = await serviceRole
    .schema("core")
    .from("agent_policies")
    .select("enabled, model, approval_required_tools")
    .eq("organization_id", organizationId)
    .eq("agent_name", agentName)
    .maybeSingle();

  if (policyError || !policy) {
    return {
      success: false,
      iterations: 0,
      sessionId,
      reason: "auth_error",
      error: `Policy não encontrada para agent '${agentName}' na org '${organizationId}'`,
    };
  }

  if (!policy.enabled) {
    return {
      success: false,
      iterations: 0,
      sessionId,
      reason: "auth_error",
      error: `Agent ${agentName} está desactivado para esta organização`,
    };
  }

  // TODO (1B.2): human-in-loop para approval_required_tools
  // Por agora ignorado — todas as tools executam sem aprovação manual

  const model = opts.model ?? policy.model;
  const messages: AnthropicMessage[] = opts.messages
    ? [...opts.messages]
    : [{ role: "user", content: opts.objective }];
  let iterations = 0;
  let totalCostEur = 0;

  // 2. Tool use loop (max 20 iterations — anti loop infinito)
  while (iterations < maxIterations) {
    iterations++;

    // 2a. Chamada à API Anthropic
    let resp: any;
    try {
      resp = await createMessage({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages,
      });
    } catch (err: any) {
      await serviceRole.schema("core").from("agent_audit_log").insert({
        organization_id: organizationId,
        pessoa_id: pessoaId,
        agent_name: agentName,
        session_id: sessionId,
        iteration: iterations,
        stop_reason: "error",
        tool_error: String(err?.message ?? err),
        model,
      });
      return {
        success: false,
        iterations,
        sessionId,
        reason: "tool_error",
        error: String(err?.message ?? err),
      };
    }

    const inTok = resp.usage?.input_tokens ?? 0;
    const outTok = resp.usage?.output_tokens ?? 0;
    const costEur = calculateCostEur(model, inTok, outTok);
    totalCostEur = Number((totalCostEur + costEur).toFixed(4));

    // 2b. Audit da iteration (stop_reason = resp.stop_reason)
    await serviceRole.schema("core").from("agent_audit_log").insert({
      organization_id: organizationId,
      pessoa_id: pessoaId,
      agent_name: agentName,
      session_id: sessionId,
      iteration: iterations,
      objective: iterations === 1 ? auditTrigger : null,
      content: resp.content,
      stop_reason: resp.stop_reason,
      input_tokens: inTok,
      output_tokens: outTok,
      cost_eur: costEur,
      model,
    });

    if (resp.stop_reason === "end_turn") {
      return { success: true, result: resp.content, iterations, sessionId, totalCostEur };
    }

    if (resp.stop_reason !== "tool_use") {
      return {
        success: false,
        iterations,
        sessionId,
        reason: "tool_error",
        error: `stop_reason inesperado: ${resp.stop_reason}`,
      };
    }

    // 2c. Executar cada tool pedida
    const toolBlocks = resp.content.filter((b: any) => b.type === "tool_use");
    const toolResults: any[] = [];

    for (const block of toolBlocks) {
      const executor = toolExecutors[block.name];
      let result: any;
      let isError = false;

      if (!executor) {
        result = { error: `Tool '${block.name}' não tem executor registado` };
        isError = true;
      } else {
        try {
          result = await executor(block.input, { ...context, sessionId });
        } catch (err: any) {
          result = { error: String(err?.message ?? err) };
          isError = true;
        }
      }

      // Audit da execução (stop_reason = NULL — ver convenção no topo)
      await serviceRole.schema("core").from("agent_audit_log").insert({
        organization_id: organizationId,
        pessoa_id: pessoaId,
        agent_name: agentName,
        session_id: sessionId,
        iteration: iterations,
        tool_name: block.name,
        tool_input: block.input,
        tool_output: isError ? null : result,
        tool_error: isError ? JSON.stringify(result) : null,
        model,
        // stop_reason: NULL intencional — convenção tool execution row
      });

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: typeof result === "string" ? result : JSON.stringify(result),
        is_error: isError,
      });
    }

    // 2d. Append ao histórico para a próxima iteration
    messages.push({ role: "assistant", content: resp.content });
    messages.push({ role: "user", content: toolResults });
  }

  return {
    success: false,
    iterations: maxIterations,
    sessionId,
    reason: "max_iterations_reached",
    totalCostEur,
  };
}
