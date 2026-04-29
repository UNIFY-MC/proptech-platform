// supabase/functions/agent-casa-advisor/index.ts
// Sprint 1B.3 Fase 1B — Conselheiro da Casa (multi-turn chat agent)
//
// Fluxo:
//   1. JWT + pessoa_id + org_ids
//   2. Parse body { session_id?, localizacao_id, message }
//   3. Validar localizacao_id → fixar organization_id correcto
//   4. Rate limit duplo (30/dia + 200/mês)
//   5. Buscar pessoa (primeiro_nome, idioma)
//   6. Sessão híbrida: continuar existente ou criar nova
//   7. Carregar histórico (últimas 20 msgs user/assistant)
//   8. Montar messages[] com histórico + nova mensagem user
//   9. Injectar contexto no system prompt ({IDIOMA} + bloco contextual)
//  10. INSERT mensagem user (audit antes de Claude — Regra AA)
//  11. runAgent({ messages, systemPrompt, tools: [casa_list_equipamentos] })
//  12. UPDATE advisor_sessoes + INSERT resposta assistant
//  13. Devolver { success, session_id, message, tokens, cost_usd }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { runAgent } from "../_shared/agents/runAgent.ts";
import { CASA_TOOLS, casaExecutors } from "../_shared/agents/tools/casa.ts";
import type { AnthropicMessage } from "../_shared/agents/types.ts";

// TODO produção (Onda 4 / Capacitor): apertar para domínio próprio
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAILY_LIMIT    = 30;
const MONTHLY_LIMIT  = 200;
const HISTORY_LIMIT  = 20;   // últimas 20 mensagens (10 turns) de contexto
const MESSAGE_MAX_LEN = 2000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// SOURCE OF TRUTH: .claude/agents/v5-prompts/casa_advisor.md
// Sync manual em 1B. Build script em backlog para 1C.
const SYSTEM_PROMPT_BASE = `És o **Conselheiro da Casa** da plataforma PRATA — o assistente pessoal de manutenção da casa do utilizador. Conheces os equipamentos registados, o histórico de manutenções e os serviços disponíveis.

O idioma de comunicação com o utilizador é **{IDIOMA}**. Responde sempre nesse idioma. Para PT-PT: usas "frigorífico" (não "geladeira"), "arranjo" (não "conserto"), "avaria" (não "defeito"), "casa de banho" (não "banheiro").

**Tom e estilo**

- **Conversacional mas profissional** — como um técnico experiente de confiança, não um chatbot genérico
- **Conciso por defeito** — 2 a 4 frases para perguntas simples; detalhe quando o utilizador pede
- **Honesto sobre limites** — se não tens informação suficiente, diz-o; nunca inventas dados
- **Empático** — valida a preocupação antes de dar conselho
- Usa **lista** quando são 3+ itens; senão, prosa corrida
- Um emoji por resposta no máximo — só quando adiciona tom (🔧 ✅ ⚠️), nunca decorativo
- **Sem headers H1/H2** nas respostas — quebram a UI de chat

**O que sabes (via tools)**

Tens acesso a:
- **Lista de equipamentos** da localização activa (\`casa_list_equipamentos\`) — categoria, marca, modelo, divisão, idade, issues detectados pela IA
- **Catálogo de serviços** PRATA (\`catalogo_search_servico_relevante\`) — preços, descrições, categorias

Não tens acesso a (ainda):
- Histórico de manutenções reais (ordens_trabalho — Fase 1B+)
- Documentos e faturas de equipamentos (Fase 2)
- Disponibilidade de prestadores (Fase 3)

**O que NÃO inventas**

- **Preços exactos** — consulta sempre o catálogo, nunca valores de memória
- **Vida útil exacta** — podes dar referências gerais de mercado mas indica que são estimativas
- **Datas de garantia** — só sabes se o utilizador registou a data de compra
- **Diagnósticos definitivos** — as análises IA são indicativas, não substituem técnico presencial
- **Recomendações de marcas fora do contexto** — não compares com concorrentes

**Fluxo típico de resposta**

1. **Reconhece** a pergunta (1 frase se necessário)
2. **Consulta** as tools relevantes (máximo 2 chamadas por resposta simples)
3. **Responde** com base nos dados reais — cita marca/modelo quando disponível
4. **Sugere acção concreta** se aplicável: "Posso procurar serviços de X no catálogo?"

Se o utilizador faz pergunta geral ("como está a minha casa?"), lista os equipamentos com issues e sugere por onde começar.

**Segurança e limites**

- **Emergências** (cheiro a gás, fumo, choque eléctrico, inundação): \`⚠️ Em caso de emergência, chama o 112 imediatamente.\` — antes de qualquer outro conselho
- Não és médico, advogado, contabilista nem engenheiro certificado
- Para obras estruturais, instalações eléctricas ou gás: recomenda técnico certificado
- Não dás opiniões sobre prestadores individuais nem sobre concorrentes da PRATA`;

// Instrução de idioma expandida — substitui {IDIOMA} no SYSTEM_PROMPT_BASE
const IDIOMA_INSTRUCAO: Record<string, string> = {
  "pt-PT": 'Português de Portugal (PT-PT, não PT-BR). Usa "tu" informal mas profissional.',
  "pt-BR": 'Português do Brasil. Usa "você".',
  "en":    "English (UK/US neutral). Professional but friendly.",
  "es":    "Español. Tono profesional pero cercano.",
  "fr":    "Français. Ton professionnel et amical.",
};

function buildSystemPrompt(
  idioma: string,
  primeiroNome: string,
  nomeLocalizacao: string,
  localizacaoId: string,
): string {
  const instrucao = IDIOMA_INSTRUCAO[idioma] ?? IDIOMA_INSTRUCAO["pt-PT"];
  const base = SYSTEM_PROMPT_BASE.replace("{IDIOMA}", instrucao);
  const dataHoje = new Date().toISOString().slice(0, 10);
  // Bloco de contexto injectado — inclui localizacao_id para tool casa_list_equipamentos
  return `${base}\n\n---\nUtilizador: ${primeiroNome}\nLocalização activa: ${nomeLocalizacao}\nLocalização ID (para tools): ${localizacaoId}\nData de hoje: ${dataHoje}`;
}

// Validação UUID v4 para localizacao_id e session_id
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const userCoreClient = createClient(supabaseUrl, anonKey, {
      db: { schema: "core" },
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const serviceRole = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "JWT inválido" }, 401);

    // ── 2. pessoa_id + org_ids (paralelo) ────────────────────────────────────
    const [{ data: pessoaId, error: pessoaErr }, { data: orgIds, error: orgErr }] =
      await Promise.all([
        userClient.rpc("current_pessoa_id"),
        userClient.rpc("current_organization_ids"),
      ]);
    if (pessoaErr || orgErr || !pessoaId || !(orgIds as string[])?.length) {
      return json({ error: "Pessoa ou organização não identificáveis" }, 403);
    }

    // ── 3. Parse + validar body ──────────────────────────────────────────────
    let body: { session_id?: string; localizacao_id: string; message: string };
    try {
      body = await req.json();
    } catch (_) {
      return json({ error: "Body inválido — JSON esperado" }, 400);
    }

    const { session_id, localizacao_id, message } = body;

    if (!localizacao_id || !UUID_RE.test(localizacao_id)) {
      return json({ error: "localizacao_id UUID inválido" }, 400);
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return json({ error: "message obrigatório" }, 400);
    }
    if (message.length > MESSAGE_MAX_LEN) {
      return json({ error: `message demasiado longa (max ${MESSAGE_MAX_LEN} chars)` }, 400);
    }
    if (session_id !== undefined && !UUID_RE.test(session_id)) {
      return json({ error: "session_id UUID inválido" }, 400);
    }

    // ── 4. Validar localizacao_id → fixar organization_id ───────────────────
    const { data: loc, error: locErr } = await serviceRole
      .schema("v5_manutencao")
      .from("localizacoes")
      .select("id, organization_id, nome")
      .eq("id", localizacao_id)
      .maybeSingle();

    if (locErr) throw new Error(`Erro ao verificar localização: ${locErr.message}`);
    if (!loc || !(orgIds as string[]).includes(loc.organization_id)) {
      return json({ error: "localizacao_id inválido ou sem acesso" }, 403);
    }
    const organizationId: string = loc.organization_id;
    const nomeLocalizacao: string = loc.nome ?? "Casa";

    // ── 5. Rate limit duplo (sequencial — daily primeiro) ────────────────────
    const { data: daily, error: dailyErr } = await userCoreClient.rpc("fn_can_use_api", {
      p_endpoint: "agent.casa_advisor",
      p_limit:    DAILY_LIMIT,
      p_window_hours: 24,
    });
    if (dailyErr) throw dailyErr;
    if (!daily?.allowed) {
      return json({ error: "rate_limited", quota: daily, scope: "daily" }, 429);
    }

    const { data: monthly, error: monthlyErr } = await userCoreClient.rpc("fn_can_use_api", {
      p_endpoint: "agent.casa_advisor.monthly",
      p_limit:    MONTHLY_LIMIT,
      p_window_hours: 720,
    });
    if (monthlyErr) throw monthlyErr;
    if (!monthly?.allowed) {
      return json({ error: "rate_limited", quota: monthly, scope: "monthly" }, 429);
    }

    // ── 6. Buscar pessoa (primeiro_nome + idioma) ────────────────────────────
    const { data: pessoa, error: pessoaFetchErr } = await serviceRole
      .schema("core")
      .from("pessoas")
      .select("primeiro_nome, idioma")
      .eq("id", pessoaId)
      .maybeSingle();

    if (pessoaFetchErr) throw new Error(`Erro ao buscar pessoa: ${pessoaFetchErr.message}`);
    const primeiroNome: string = pessoa?.primeiro_nome ?? "utilizador";
    const idioma: string       = pessoa?.idioma ?? "pt-PT";

    // ── 7. Sessão híbrida ────────────────────────────────────────────────────
    let sessaoId: string;
    let prevTotalMensagens   = 0;
    let prevTokensInput      = 0;
    let prevTokensOutput     = 0;
    let prevCustoUsd         = 0;

    if (session_id) {
      // Continuar sessão existente — valida org match (Regra DD: sem cross-org)
      const { data: sessao, error: sessaoErr } = await serviceRole
        .schema("v5_manutencao")
        .from("advisor_sessoes")
        .select("id, total_mensagens, total_tokens_input, total_tokens_output, custo_total_usd")
        .eq("id", session_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (sessaoErr) throw new Error(`Erro ao verificar sessão: ${sessaoErr.message}`);
      if (!sessao) return json({ success: false, error: "session_not_found" }, 404);

      sessaoId             = sessao.id;
      prevTotalMensagens   = sessao.total_mensagens      ?? 0;
      prevTokensInput      = sessao.total_tokens_input   ?? 0;
      prevTokensOutput     = sessao.total_tokens_output  ?? 0;
      prevCustoUsd         = Number(sessao.custo_total_usd ?? 0);
    } else {
      // Criar nova sessão
      const { data: novaSessao, error: novaErr } = await serviceRole
        .schema("v5_manutencao")
        .from("advisor_sessoes")
        .insert({ organization_id: organizationId, pessoa_id: pessoaId, localizacao_id, idioma })
        .select("id")
        .single();

      if (novaErr || !novaSessao) {
        throw new Error(`Erro ao criar sessão: ${novaErr?.message ?? "sem ID"}`);
      }
      sessaoId = novaSessao.id;
    }

    // ── 8. Carregar histórico (role user/assistant, últimas 20) ──────────────
    const { data: historico, error: histErr } = await serviceRole
      .schema("v5_manutencao")
      .from("advisor_mensagens")
      .select("role, content")
      .eq("sessao_id", sessaoId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(HISTORY_LIMIT);

    if (histErr) throw new Error(`Erro ao carregar histórico: ${histErr.message}`);

    // ── 9. Montar messages[] — histórico + nova mensagem ─────────────────────
    const messages: AnthropicMessage[] = [
      ...(historico ?? [])
        .filter((m: any) => typeof m.content === "string" && m.content.length > 0)
        .map((m: any): AnthropicMessage => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message.trim() },
    ];

    // ── 10. System prompt com contexto injectado ─────────────────────────────
    const systemPrompt = buildSystemPrompt(idioma, primeiroNome, nomeLocalizacao, localizacao_id);

    // ── 11. INSERT mensagem user ANTES de chamar Claude (audit limpo) ─────────
    const { error: insertUserErr } = await serviceRole
      .schema("v5_manutencao")
      .from("advisor_mensagens")
      .insert({ sessao_id: sessaoId, role: "user", content: message.trim() });

    if (insertUserErr) {
      console.warn("[casa-advisor] INSERT user msg falhou (non-critical):", insertUserErr.message);
    }

    // ── 12. runAgent ─────────────────────────────────────────────────────────
    const agentResult = await runAgent({
      agentName:    "v5.casa_advisor",
      systemPrompt,
      tools:        CASA_TOOLS,
      toolExecutors: casaExecutors,
      messages,
      context: {
        pessoaId:       pessoaId as string,
        organizationId,
        supabase:       userClient,
        serviceRole,
      },
    });

    // ── 13. Extrair texto final da resposta ───────────────────────────────────
    const responseText: string = Array.isArray(agentResult.result)
      ? ((agentResult.result as any[]).find((b: any) => b.type === "text")?.text ?? "")
      : typeof agentResult.result === "string"
        ? agentResult.result
        : "";

    // custo_usd: naming legacy (Fase 1A SQL). Valor real em EUR via calculateCostEur.
    const turnCost = agentResult.totalCostEur ?? 0;

    // ── 14. UPDATE advisor_sessoes (acumulativo) ─────────────────────────────
    await serviceRole
      .schema("v5_manutencao")
      .from("advisor_sessoes")
      .update({
        ultima_mensagem_em:  new Date().toISOString(),
        total_mensagens:     prevTotalMensagens + 2, // user + assistant desta turn
        total_tokens_input:  prevTokensInput  + (agentResult.totalInputTokens  ?? 0),
        total_tokens_output: prevTokensOutput + (agentResult.totalOutputTokens ?? 0),
        custo_total_usd:     Number((prevCustoUsd + turnCost).toFixed(6)),
      })
      .eq("id", sessaoId);

    // ── 15. INSERT resposta assistant ────────────────────────────────────────
    if (responseText) {
      const { error: insertAssistErr } = await serviceRole
        .schema("v5_manutencao")
        .from("advisor_mensagens")
        .insert({
          sessao_id:     sessaoId,
          role:          "assistant",
          content:       responseText,
          custo_usd:     turnCost,
          tokens_input:  agentResult.totalInputTokens  ?? 0,
          tokens_output: agentResult.totalOutputTokens ?? 0,
        });

      if (insertAssistErr) {
        console.warn("[casa-advisor] INSERT assistant msg falhou (non-critical):", insertAssistErr.message);
      }
    }

    // ── 16. Resposta ─────────────────────────────────────────────────────────
    return json({
      success:    agentResult.success,
      session_id: sessaoId,
      message:    responseText || agentResult.error || "Sem resposta do agente",
      tokens: {
        input:  agentResult.totalInputTokens  ?? 0,
        output: agentResult.totalOutputTokens ?? 0,
      },
      cost_usd:   turnCost,
      iterations: agentResult.iterations,
      ...(agentResult.error ? { error: agentResult.error, reason: agentResult.reason } : {}),
    });

  } catch (err: any) {
    console.error("[agent-casa-advisor] Erro inesperado:", err);
    return json({ success: false, error: err?.message ?? "Erro interno" }, 500);
  }
});
