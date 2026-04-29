// Tipos partilhados entre Edge Functions de agents V5
// Importar com: import type { ... } from "../_shared/agents/types.ts";

// Mensagem no formato Anthropic API (usado em multi-turn por agent-casa-advisor)
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: unknown; // string | ContentBlock[] | ToolResultBlock[]
}

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
  // Exactly one of {objective, messages} obrigatório — runtime guard em runAgent
  objective?: string | unknown[]; // single-turn: string ou Vision content blocks
  messages?: AnthropicMessage[];  // multi-turn: histórico completo pré-construído
  context: AgentContext;
  model?: string;          // override; default vem de core.agent_policies
  maxIterations?: number;  // default 20
  sessionId?: string;      // se omitido, runAgent gera UUID próprio
}

export interface AgentRunResult {
  success: boolean;
  result?: any;            // content do último end_turn
  iterations: number;
  sessionId: string;
  error?: string;
  reason?: "end_turn" | "max_iterations_reached" | "tool_error" | "rate_limited" | "auth_error";
  totalCostEur?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
}

export interface AgentPolicy {
  enabled: boolean;
  max_calls_per_user_day: number;
  max_calls_per_org_day: number;
  approval_required_tools: string[];
  approval_threshold_eur: number | null;
  model: string;
}

// Vision content block para Anthropic API (usado em image-inspector)
export interface VisionContentBlock {
  type: "image" | "text";
  source?: { type: "url"; url: string };
  text?: string;
}

// Payload recebido pelo Edge Function image-inspector
export interface ImageInspectorRequest {
  base64Image: string;    // base64 sem prefixo data:...
  mimeType: string;       // "image/jpeg" | "image/png" | "image/webp"
  localizacaoId?: string; // UUID — se omitido, agent pergunta ao utilizador
}

// Resposta do Edge Function image-inspector ao cliente
export interface ImageInspectorResponse {
  success: boolean;
  sessionId: string;
  iterations: number;
  result?: unknown;
  error?: string;
  reason?: string;
  totalCostEur?: number;
  fotoPath?: string;        // path no bucket após upload
  equipamento_id?: string;  // UUID do equipamento criado/actualizado (1B.2.3a)
}
