// anthropic.ts — raw fetch (sem npm dependency)
// Razão: npm:@anthropic-ai/sdk causa "Connection error" no Deno Edge Function
// da Supabase mesmo com fetch: globalThis.fetch. Raw fetch é garantido.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function getApiKey(): string {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não está configurada nas secrets do Supabase");
  }
  return apiKey;
}

export interface AnthropicCreateParams {
  model: string;
  max_tokens: number;
  system: string;
  tools?: unknown[];
  messages: { role: "user" | "assistant"; content: unknown }[];
}

export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: unknown[];
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

export async function createMessage(
  params: AnthropicCreateParams,
): Promise<AnthropicResponse> {
  const resp = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${text}`);
  }

  return resp.json() as Promise<AnthropicResponse>;
}

// Preços USD por 1M tokens — actualizar manualmente quando Anthropic mudar tabela
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.00,  output: 15.00 },
  "claude-opus-4-7":   { input: 15.00, output: 75.00 },
  "claude-haiku-4-5":  { input: 0.80,  output: 4.00  },
};

const USD_TO_EUR = 0.92;

export function calculateCostEur(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model];
  if (!p) return 0;
  const usd = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return Number((usd * USD_TO_EUR).toFixed(4));
}
