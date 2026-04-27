// Tipos partilhados entre Edge Functions de agents V5
// Importar com: import type { ... } from "../_shared/agents/types.ts";

export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AgentContext {
  pessoaId: string;
  organizationId: string;
  supabase: any;    // cliente com JWT do user (para RPCs autenticadas)
  serviceRole: any; // cliente service_role (audit log + lookups cross-schema)
  sessionId?: string; // injectado por runAgent — não passar pelo caller
}

export interface AgentRunOptions {
  agentName: string;       // 'v5.image_inspector', 'v5.casa_advisor', etc.
  systemPrompt: string;
  tools: AgentTool[];
  toolExecutors: Record<string, (input: any, ctx: AgentContext) => Promise<any>>;
  objective: string | unknown[]; // string ou Vision content blocks
  context: AgentContext;
  model?: string;          // override; default vem de core.agent_policies
  maxIterations?: number;  // default 20
}

export interface AgentRunResult {
  success: boolean;
  result?: any;            // content do último end_turn
  iterations: number;
  sessionId: string;
  error?: string;
  reason?: "end_turn" | "max_iterations_reached" | "tool_error" | "rate_limited" | "auth_error";
  totalCostEur?: number;
}

export interface AgentPolicy {
  enabled: boolean;
  max_calls_per_user_day: number;
  max_calls_per_org_day: number;
  approval_required_tools: string[];
  approval_threshold_eur: number | null;
  model: string;
}
