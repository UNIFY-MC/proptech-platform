// supabase/functions/agent-image-inspector/index.ts
// Sprint 1B.2.2 — Inspecção de equipamentos por foto (Vision API)
//
// Fluxo:
//   1. JWT + pessoa_id + org_ids
//   2. Parse body + guard 5MB
//   3. Validar localizacao_id → fixar organization_id correcto
//   4. Rate limit duplo (3/dia + 10/mês)
//   5. Gerar sessionId → upload bucket → signed URL 5min
//   6. runAgent com Vision content blocks
//   7. Devolver { success, sessionId, fotoPath, ... }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { runAgent } from "../_shared/agents/runAgent.ts";
import { EQUIPAMENTO_TOOLS, equipamentoExecutors } from "../_shared/agents/tools/equipamento.ts";
import type { ImageInspectorRequest, ImageInspectorResponse } from "../_shared/agents/types.ts";

// TODO produção (Onda 4 / Capacitor): apertar para domínio próprio
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "equipamentos-fotos";
const SIGNED_URL_TTL = 300;      // 5 min (Anthropic URL expiry)
const BASE64_MAX_LEN = 7_000_000; // ~5.25 MB raw antes do decode
const DAILY_LIMIT = 3;
const MONTHLY_LIMIT = 10;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const SYSTEM_PROMPT = `És o Inspector da Casa da plataforma V5 Manutenção. Analisas fotografias de
equipamentos domésticos e actualizas o inventário da propriedade do utilizador.

FLUXO OBRIGATÓRIO — segue exactamente esta ordem:
1. Analisa a fotografia em detalhe: identifica o equipamento, lê etiquetas,
   detecta problemas visíveis, estima a idade quando possível.
2. Chama equipamento_lookup SEMPRE (se localizacao_id disponível) para
   verificar se o equipamento já está registado. Nunca saltes este passo.
3a. Score ≥ 0.6 → match forte → chama equipamento_update.
3b. Score 0.3–0.59 → possível duplicado → termina com mensagem explicando
    o match ambíguo e pedindo confirmação ao utilizador.
3c. Score < 0.3 ou lista vazia → equipamento novo → chama equipamento_create.
4. Se detectaste issues no equipamento → chama catalogo_search_servico_relevante
   para recomendar serviços adequados.
5. Termina com resumo: o que identificaste, o que registaste/actualizaste,
   que serviços recomendar (se aplicável).

IMPORTANTE: Chama uma tool de cada vez. Não agrupes tools em paralelo.
Aguarda o resultado de cada tool antes de decidir o próximo passo.

REGRAS DATA DE INSTALAÇÃO:
- exact: data completa legível na etiqueta (ex: "12/2019")
- year_only: só o ano visível → usar YYYY-01-01 em data_instalacao
- estimated: inferência por aspecto/desgaste → preencher idade_estimada_anos
  (inteiro 0-50), NÃO preencher data_instalacao
- Nunca inventar datas. Se informação insuficiente, omite ambos os campos.

ESTRUTURA dados_ia (preencher sempre que possível):
- foto_principal_path: path da foto no bucket (fornecido no prompt)
- data_instalacao_precisao: "exact" | "year_only" | "estimated"
- idade_estimada_anos: inteiro 0-50 (só se precisao="estimated")
- issues_detectados: lista de issues com valores controlados abaixo
- confianca_identificacao: "alta" | "media" | "baixa"

VALORES VÁLIDOS para issues_detectados (usar exactamente estes):
oxidacao | fuga_agua | fuga_gas | fissura | ferrugem | manchas |
ruido_anormal | etiqueta_ilegivel | instalacao_irregular | outros:<descrição breve>

CATEGORIAS VÁLIDAS — equipamento (usar exactamente):
aquecimento | climatizacao | aguas_quentes | canalizacao | eletrica |
cobertura | estrutura | piscina | solar | elevador | gerador |
eletrodomestico | seguranca | outros

CATEGORIAS VÁLIDAS — serviço (usar exactamente):
limpeza | manutencao | jardim | piscina | pintura | eletrica | canalizacao | obra

LIMITES IMPORTANTES:
- Nunca diagnostiques problemas de saúde ou segurança com certeza absoluta
  a partir de uma foto — usa linguagem de suspeita ("parece haver", "possível")
- Nunca recomendares intervenções de gás sem mencionar técnico certificado
- Nunca garantires estimativas de data/idade — são aproximações visuais
- Se a foto não mostrar equipamento reconhecível, termina com mensagem
  explicando o que vês e pedindo foto mais clara`;

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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
    if (pessoaErr || orgErr || !pessoaId || !orgIds?.length) {
      return json({ error: "Pessoa ou organização não identificáveis" }, 403);
    }

    // ── 3. Parse body + guard 5 MB ───────────────────────────────────────────
    let body: ImageInspectorRequest;
    try {
      body = await req.json();
    } catch (_) {
      return json({ error: "Body inválido — JSON esperado" }, 400);
    }

    const { base64Image, mimeType = "image/jpeg", localizacaoId } = body;
    if (!base64Image || typeof base64Image !== "string") {
      return json({ error: "base64Image obrigatório" }, 400);
    }
    if (base64Image.length > BASE64_MAX_LEN) {
      return json({ error: "Imagem demasiado grande (max ~5 MB)" }, 413);
    }

    // ── 4. Validar localizacao_id → fixar organization_id correcto ───────────
    let organizationId: string = orgIds[0];

    if (localizacaoId) {
      const { data: loc } = await serviceRole
        .schema("v5_manutencao")
        .from("localizacoes")
        .select("organization_id")
        .eq("id", localizacaoId)
        .maybeSingle();

      if (!loc || !(orgIds as string[]).includes(loc.organization_id)) {
        return json({ error: "localizacao_id inválido ou sem acesso" }, 403);
      }
      organizationId = loc.organization_id;
    }

    // ── 5. Rate limit duplo (sequencial — daily primeiro) ────────────────────
    const { data: daily, error: dailyErr } = await userCoreClient.rpc("fn_can_use_api", {
      p_endpoint: "agent.image_inspector",
      p_limit: DAILY_LIMIT,
      p_window_hours: 24,
    });
    if (dailyErr) throw dailyErr;
    if (!daily?.allowed) {
      return json({ error: "rate_limited", quota: daily, scope: "daily" }, 429);
    }

    const { data: monthly, error: monthlyErr } = await userCoreClient.rpc("fn_can_use_api", {
      p_endpoint: "agent.image_inspector.monthly",
      p_limit: MONTHLY_LIMIT,
      p_window_hours: 720,
    });
    if (monthlyErr) throw monthlyErr;
    if (!monthly?.allowed) {
      return json({ error: "rate_limited", quota: monthly, scope: "monthly" }, 429);
    }

    // ── 6. sessionId → decode base64 → upload ────────────────────────────────
    const sessionId = crypto.randomUUID();

    const binaryStr = atob(base64Image);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const ts = Date.now();
    const fotoPath = `${pessoaId}/inspecoes/${sessionId}/0001_${ts}.jpg`;

    const { error: uploadErr } = await serviceRole.storage
      .from(BUCKET)
      .upload(fotoPath, bytes, { contentType: mimeType, upsert: false });
    if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);

    // ── 7. Signed URL 5 min ───────────────────────────────────────────────────
    const { data: signed, error: signedErr } = await serviceRole.storage
      .from(BUCKET)
      .createSignedUrl(fotoPath, SIGNED_URL_TTL);
    if (signedErr || !signed?.signedUrl) {
      throw new Error(`Signed URL falhou: ${signedErr?.message ?? "sem URL"}`);
    }

    // ── 8. Construir objective[] (Vision content blocks) ──────────────────────
    const objective = [
      {
        type: "image",
        source: { type: "url", url: signed.signedUrl },
      },
      {
        type: "text",
        text: [
          `Inspecção ID: ${sessionId}`,
          `Path da foto no bucket: ${fotoPath}`,
          localizacaoId
            ? `Localização ID: ${localizacaoId}`
            : "Localização não fornecida — identifica e descreve o equipamento sem fazer lookup.",
        ].join("\n"),
      },
    ];

    // ── 9. runAgent ───────────────────────────────────────────────────────────
    const agentResult = await runAgent({
      agentName: "v5.image_inspector",
      systemPrompt: SYSTEM_PROMPT,
      tools: EQUIPAMENTO_TOOLS,
      toolExecutors: equipamentoExecutors,
      objective,
      context: { pessoaId, organizationId, supabase: userClient, serviceRole },
      sessionId,
    });

    // ── 10. Extrair equipamento_id do audit_log ───────────────────────────────
    let equipamentoId: string | undefined;
    if (agentResult.success) {
      const { data: auditRow } = await serviceRole
        .schema("core")
        .from("agent_audit_log")
        .select("tool_output")
        .eq("session_id", sessionId)
        .in("tool_name", ["equipamento_create", "equipamento_update"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      equipamentoId = auditRow?.tool_output?.created?.id
        ?? auditRow?.tool_output?.updated?.id;
    }

    // ── 11. Resposta ──────────────────────────────────────────────────────────
    const response: ImageInspectorResponse = {
      success: agentResult.success,
      sessionId: agentResult.sessionId,
      iterations: agentResult.iterations,
      result: agentResult.result,
      error: agentResult.error,
      reason: agentResult.reason,
      totalCostEur: agentResult.totalCostEur,
      fotoPath,
      equipamento_id: equipamentoId,
    };
    return json(response, agentResult.success ? 200 : 500);

  } catch (err: any) {
    console.error("agent-image-inspector error:", err?.message ?? err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});
