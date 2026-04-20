/**
 * Edge Function: v4-energia-lead
 * Endpoint: POST /functions/v1/v4-energia-lead
 *
 * Recebe submissão do simulador público V4 Energia e:
 *   1. Valida o payload
 *   2. Aplica rate limiting por IP (3 req / 10 min) e dedup por email+CPE (1 / 24h)
 *   3. Faz upsert em core.pessoas (match por email)
 *   4. Insere em v4_energia.contratos_energia com service_role
 *   5. Regista evento em core.eventos_cliente
 *
 * Auth: nenhuma (anon key do frontend) — a segurança é feita internamente.
 * CORS: * em v1 (múltiplos domínios possíveis durante desenvolvimento).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateLeadPayload } from "./validators.ts";
import {
  checkIpRateLimit,
  checkEmailCpeDuplicate,
  purgeExpiredEntries,
} from "./rate-limit.ts";

// ── Ambiente ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── CORS — v1 permite qualquer origem ─────────────────────────────────────────
// Nota: em produção com domínio fixo, substituir "*" pelo domínio real.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── Helpers de resposta ───────────────────────────────────────────────────────
function jsonOk(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonErr(error: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Extracção de IP do pedido ─────────────────────────────────────────────────
function extractIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Só aceita POST
  if (req.method !== "POST") {
    return jsonErr("Método não permitido.", 405);
  }

  const ip = extractIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";

  // Limpeza lazy dos Maps de rate limiting
  purgeExpiredEntries();

  // ── 1. Rate limit por IP ──────────────────────────────────────────────────
  if (checkIpRateLimit(ip)) {
    console.log(JSON.stringify({
      event: "rate_limit_ip",
      ip,
      ts: new Date().toISOString(),
    }));
    return jsonErr("Demasiados pedidos. Tente novamente mais tarde.", 429);
  }

  // ── 2. Parse e validação do payload ──────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonErr("Payload JSON inválido.", 400);
  }

  const validation = validateLeadPayload(rawBody);
  if (!validation.ok || !validation.payload) {
    console.log(JSON.stringify({
      event: "validation_failed",
      ip,
      error: validation.error,
      ts: new Date().toISOString(),
    }));
    return jsonErr(validation.error ?? "Dados inválidos.", 400);
  }

  const payload = validation.payload;

  console.log(JSON.stringify({
    event: "lead_recebido",
    ip,
    email: payload.email,
    cpe: payload.cpe,
    segmento: payload.segmento,
    ts: new Date().toISOString(),
  }));

  // ── 3. Dedup por email+CPE (24h) ─────────────────────────────────────────
  if (checkEmailCpeDuplicate(payload.email, payload.cpe)) {
    console.log(JSON.stringify({
      event: "duplicate_email_cpe",
      ip,
      email: payload.email,
      cpe: payload.cpe,
      ts: new Date().toISOString(),
    }));
    return jsonErr("Já existe um pedido recente para este email/CPE.", 409);
  }

  // ── 4. Operações de BD com service_role ──────────────────────────────────
  // O cliente é criado dentro do handler (padrão da core-api existente)
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // 4a. Upsert em core.pessoas — match por email (dedup canónico v1)
    const { data: pessoaData, error: pessoaError } = await sb
      .schema("core")
      .from("pessoas")
      .upsert(
        {
          email: payload.email,
          nome: payload.nome,
          telemovel: payload.telefone ?? null,
          source: "v4_energia_simulador",
        },
        {
          onConflict: "email",    // email tem UNIQUE constraint em core.pessoas
          ignoreDuplicates: false, // queremos actualizar nome/telemovel se mudou
        }
      )
      .select("id")
      .single();

    if (pessoaError || !pessoaData) {
      console.error(JSON.stringify({
        event: "erro_upsert_pessoa",
        ip,
        email: payload.email,
        error: pessoaError?.message,
        ts: new Date().toISOString(),
      }));
      return jsonErr("Erro interno.", 500);
    }

    const pessoaId: string = pessoaData.id;

    console.log(JSON.stringify({
      event: "pessoa_upserted",
      pessoa_id: pessoaId,
      email: payload.email,
      ts: new Date().toISOString(),
    }));

    // 4b. INSERT em v4_energia.contratos_energia
    const { data: contratoData, error: contratoError } = await sb
      .schema("v4_energia")
      .from("contratos_energia")
      .insert({
        pessoa_id: pessoaId,
        imovel_id: payload.imovel_id ?? null,
        segmento: payload.segmento,
        cpe: payload.cpe,
        kva: payload.kva,
        kwh_mensal_estimado: payload.kwh_mensal_estimado,
        ciclo: payload.ciclo ?? "simples",
        comercializadora_atual: payload.comercializadora_atual ?? null,
        comercializadora_nova: payload.comercializadora_nova ?? null,
        valor_atual: payload.valor_atual ?? null,
        valor_novo: payload.valor_novo ?? null,
        poupanca_anual: payload.poupanca_anual ?? null,
        estado: "novo",
        ip_origem: ip,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (contratoError || !contratoData) {
      console.error(JSON.stringify({
        event: "erro_insert_contrato",
        ip,
        pessoa_id: pessoaId,
        error: contratoError?.message,
        ts: new Date().toISOString(),
      }));
      return jsonErr("Erro interno.", 500);
    }

    const contratoId: string = contratoData.id;

    console.log(JSON.stringify({
      event: "contrato_inserido",
      contrato_id: contratoId,
      pessoa_id: pessoaId,
      ts: new Date().toISOString(),
    }));

    // 4c. Registo de evento em core.eventos_cliente
    // Falha silenciosa — não bloqueia a resposta se o evento falhar
    const { error: eventoError } = await sb
      .schema("core")
      .from("eventos_cliente")
      .insert({
        pessoa_id: pessoaId,
        vertical: "v4_energia",
        tipo: "lead_criado",
        descricao: `Novo lead energia (${payload.segmento}) · CPE ${payload.cpe}`,
        referencia_id: contratoId,
        pontos_ganhos: 0,
        metadata: {
          segmento: payload.segmento,
          cpe: payload.cpe,
          kva: payload.kva,
          comercializadora_nova: payload.comercializadora_nova ?? null,
          poupanca_anual: payload.poupanca_anual ?? null,
        },
        criado_por: "edge_fn:v4-energia-lead",
      });

    if (eventoError) {
      // Log de aviso mas não falha — o lead ficou registado
      console.warn(JSON.stringify({
        event: "aviso_evento_cliente_falhou",
        contrato_id: contratoId,
        error: eventoError.message,
        ts: new Date().toISOString(),
      }));
    } else {
      console.log(JSON.stringify({
        event: "evento_cliente_registado",
        contrato_id: contratoId,
        tipo: "v4_energia_lead_criado",
        ts: new Date().toISOString(),
      }));
    }

    // ── 5. Resposta de sucesso ────────────────────────────────────────────
    return jsonOk({ contrato_id: contratoId }, 200);

  } catch (err) {
    console.error(JSON.stringify({
      event: "erro_inesperado",
      ip,
      error: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    }));
    return jsonErr("Erro interno.", 500);
  }
});
