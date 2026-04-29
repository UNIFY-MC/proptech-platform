// supabase/functions/agent-test/index.ts
// Sprint 1B.1.2 — End-to-end validation do tool use loop
// Fluxo: JWT → fn_can_use_api → runAgent (tool 'echo') → audit gravado

import { createClient } from "jsr:@supabase/supabase-js@2";
import { runAgent } from "../_shared/agents/runAgent.ts";
import type { AgentTool } from "../_shared/agents/types.ts";

// TODO produção (Onda 4 / Capacitor): apertar para domínio próprio
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente com JWT do user — para RPCs autenticadas (public schema)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Cliente com JWT do user + schema core — para fn_can_use_api
    const userCoreClient = createClient(supabaseUrl, anonKey, {
      db: { schema: "core" },
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Cliente service_role sem schema default — runAgent usa .schema() por query
    const serviceRole = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Validar JWT
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "JWT inválido" }, 401);
    }

    // 2. Obter pessoa_id e organization_id via helpers public.*
    const { data: pessoaId, error: pessoaErr } = await userClient.rpc("current_pessoa_id");
    const { data: orgIds, error: orgErr } = await userClient.rpc("current_organization_ids");

    if (pessoaErr || orgErr || !pessoaId || !orgIds || orgIds.length === 0) {
      return json({ error: "Pessoa ou organização não identificáveis" }, 403);
    }
    const organizationId = orgIds[0];

    // 3. Rate limit — 3 chamadas/dia para agent.test
    const { data: quota, error: quotaErr } = await userCoreClient.rpc("fn_can_use_api", {
      p_endpoint: "agent.test",
      p_limit: 3,
      p_window_hours: 24,
    });
    if (quotaErr) throw quotaErr;
    if (!quota?.allowed) {
      return json({ error: "rate_limited", quota }, 429);
    }

    // 4. Ler body (objective opcional)
    let objective = "Diz olá em português europeu, brevemente.";
    try {
      const body = await req.json();
      if (body?.objective) objective = String(body.objective);
    } catch (_) { /* sem body, usa default */ }

    // 5. Tool de teste — echo simples para validar o loop
    const tools: AgentTool[] = [{
      name: "echo",
      description: "Devolve o texto recebido sem alteração. Tool de validação.",
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Texto a ecoar" },
        },
        required: ["text"],
      },
    }];

    // 6. Correr agent
    const result = await runAgent({
      agentName: "v5.test_echo",
      systemPrompt:
        "És um assistente de teste. Responde sempre em português europeu. " +
        "Podes usar a tool 'echo' para demonstrar que o tool use loop funciona.",
      tools,
      toolExecutors: {
        echo: async (input: any) => ({
          echoed: input.text,
          ts: new Date().toISOString(),
        }),
      },
      objective,
      context: {
        pessoaId,
        organizationId,
        supabase: userClient,
        serviceRole,
      },
    });

    return json(result, result.success ? 200 : 500);

  } catch (err: any) {
    console.error("agent-test error:", err?.message ?? err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});
