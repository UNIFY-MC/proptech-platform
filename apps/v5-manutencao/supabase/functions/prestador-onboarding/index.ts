/**
 * Edge Function: prestador-onboarding
 * Endpoint: POST /functions/v1/prestador-onboarding
 *
 * Sprint 1D · Day 2 · Receipt Trojan Horse Alpha
 * Projecto Supabase ALVO: V1 Core Hub  (hkmvszkpxjbxmnixzqbl)
 *
 * Endpoint PÚBLICO — sem JWT (link partilhado por WhatsApp/SMS).
 * Prestador abre o link, preenche form, este endpoint valida + persiste.
 *
 * Flow:
 *   1. Recebe token_clear (64 hex) + dados do prestador
 *   2. sha256(token_clear) → tokenHash → lookup em magic_links
 *   3. Valida: token existe, não expirado, não usado, confirmacao_valor=true
 *   4. Valida input server-side: NIF mod11 PT, telefone PT, nome ≥ 3 chars
 *   5. Chama RPC create_prestador_and_recibo_atomic (transacção atómica)
 *   6. Audit log silent
 *   7. Retorna { recibo_id, status }
 *
 * Auditor gaps mitigados:
 *   - T2: ip_origem + user_agent capturados e passados ao RPC
 *   - T6: keys via Deno.env.get(), nunca hardcoded
 *   - C3: regista em core.agent_audit_log com agent_name='prestador-onboarding'
 *
 * Input (JSON):
 *   {
 *     token_clear: string (64 hex chars),
 *     prestador_data: {
 *       nome_completo: string (≥ 3 chars),
 *       nif: string (9 dígitos, válido mod11 PT),
 *       telefone: string (PT, com ou sem +351),
 *       morada?: string,
 *       email?: string,
 *       confirmacao_valor: boolean (DEVE ser true)
 *     }
 *   }
 *
 * Output (200):
 *   { ok: true, recibo_id: "uuid", status: "recibo_emitido" }
 *
 * Errors:
 *   400 — input inválido (NIF, telefone, nome, confirmacao_valor=false)
 *   404 — token não existe
 *   410 — token expirado ou já utilizado
 *   422 — NIF inválido (mod11 falhou)
 *   500 — erro interno DB / RPC
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Ambiente ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, x-client-info",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonOk(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonErr(error: string, status = 400, code?: string): Response {
  return new Response(
    JSON.stringify({ ok: false, error, code }),
    { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// NIF mod11 PT — válido para pessoa singular (1xx) e pessoa colectiva (5xx-9xx)
function validarNIF(nif: string): boolean {
  if (!/^[0-9]{9}$/.test(nif)) return false;
  const first = parseInt(nif[0]);
  if (first === 0) return false;

  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(nif[i]) * weights[i];
  }
  const remainder = sum % 11;
  const expected = remainder < 2 ? 0 : 11 - remainder;
  return expected === parseInt(nif[8]);
}

function extractIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

interface PrestadorData {
  nome_completo: string;
  nif: string;
  telefone: string;
  morada?: string | null;
  email?: string | null;
  confirmacao_valor: boolean;
}

interface InputPayload {
  token_clear: string;
  prestador_data: PrestadorData;
}

interface ValidationResult {
  ok: boolean;
  payload?: InputPayload;
  error?: string;
  code?: string;
  status?: number;
}

function validateInput(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Payload deve ser um objecto JSON.", code: "bad_payload" };
  }
  const r = raw as Record<string, unknown>;

  // token_clear
  if (typeof r.token_clear !== "string" || !/^[0-9a-f]{64}$/.test(r.token_clear)) {
    return { ok: false, error: "token_clear inválido.", code: "bad_token", status: 400 };
  }

  // prestador_data
  if (!r.prestador_data || typeof r.prestador_data !== "object") {
    return { ok: false, error: "prestador_data obrigatório.", code: "missing_prestador_data" };
  }
  const pd = r.prestador_data as Record<string, unknown>;

  // nome_completo
  if (typeof pd.nome_completo !== "string" || pd.nome_completo.trim().length < 3) {
    return { ok: false, error: "nome_completo deve ter pelo menos 3 caracteres.", code: "bad_nome" };
  }

  // nif — regex primeiro, depois mod11
  if (typeof pd.nif !== "string" || !/^[0-9]{9}$/.test(pd.nif)) {
    return { ok: false, error: "NIF deve ter 9 dígitos.", code: "bad_nif_format" };
  }
  if (!validarNIF(pd.nif)) {
    return { ok: false, error: "NIF inválido (dígito de controlo falhou).", code: "bad_nif_mod11", status: 422 };
  }

  // telefone PT: (+351)? seguido de 9-15 dígitos/espaços
  if (
    typeof pd.telefone !== "string" ||
    !/^(\+351)?[0-9 ]{9,15}$/.test(pd.telefone.trim())
  ) {
    return { ok: false, error: "Telefone inválido. Formato PT esperado (ex: 912345678 ou +351912345678).", code: "bad_telefone" };
  }

  // confirmacao_valor — MUST be true
  if (pd.confirmacao_valor !== true) {
    return { ok: false, error: "O prestador deve confirmar o valor do serviço.", code: "confirmacao_required" };
  }

  // morada e email — opcionais
  let morada: string | null = null;
  if (pd.morada !== undefined && pd.morada !== null) {
    if (typeof pd.morada !== "string") {
      return { ok: false, error: "morada deve ser string.", code: "bad_morada" };
    }
    morada = pd.morada.trim() || null;
  }

  let email: string | null = null;
  if (pd.email !== undefined && pd.email !== null) {
    if (typeof pd.email !== "string") {
      return { ok: false, error: "email deve ser string.", code: "bad_email" };
    }
    // Validação básica de formato email
    if (pd.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pd.email.trim())) {
      return { ok: false, error: "Formato de email inválido.", code: "bad_email_format" };
    }
    email = pd.email.trim() || null;
  }

  return {
    ok: true,
    payload: {
      token_clear: r.token_clear,
      prestador_data: {
        nome_completo: pd.nome_completo.trim(),
        nif: pd.nif,
        telefone: pd.telefone.trim(),
        morada,
        email,
        confirmacao_valor: true,
      },
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonErr("Método não permitido.", 405);
  }

  const ip = extractIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";

  // ── 1. Parse + validate input ────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonErr("Payload JSON inválido.", 400, "bad_json");
  }

  const validation = validateInput(rawBody);
  if (!validation.ok || !validation.payload) {
    return jsonErr(
      validation.error ?? "Dados inválidos.",
      validation.status ?? 400,
      validation.code,
    );
  }
  const { token_clear, prestador_data } = validation.payload;

  // ── 2. Service-role client ───────────────────────────────────────────────
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 3. Lookup token via sha256(token_clear) ──────────────────────────────
  const tokenHash = await sha256Hex(token_clear);

  const { data: link, error: linkErr } = await sb
    .schema("v5_manutencao")
    .from("magic_links")
    .select("id, used_at, expires_at, owner_pessoa_id, organization_id")
    .eq("token", tokenHash)
    .maybeSingle();

  if (linkErr) {
    console.error(JSON.stringify({ event: "erro_lookup_token", error: linkErr.message, ip, ts: new Date().toISOString() }));
    return jsonErr("Erro interno.", 500, "db_lookup");
  }

  // 404 — token não existe
  if (!link) {
    console.log(JSON.stringify({ event: "token_not_found", ip, ts: new Date().toISOString() }));
    return jsonErr("Link não encontrado.", 404, "token_not_found");
  }

  // 410 — já utilizado
  if (link.used_at) {
    console.log(JSON.stringify({ event: "token_already_used", link_id: link.id, ip, ts: new Date().toISOString() }));
    return jsonErr(
      "Este link já foi utilizado. Pede ao proprietário um novo link.",
      410,
      "token_used",
    );
  }

  // 410 — expirado
  if (new Date(link.expires_at) < new Date()) {
    console.log(JSON.stringify({ event: "token_expired", link_id: link.id, ip, ts: new Date().toISOString() }));
    return jsonErr(
      "Este link expirou. Pede ao proprietário um novo link.",
      410,
      "token_expired",
    );
  }

  // ── 4. Transacção atómica via RPC ────────────────────────────────────────
  const { data: rpcData, error: rpcErr } = await sb
    .schema("v5_manutencao")
    .rpc("create_prestador_and_recibo_atomic", {
      p_magic_link_id: link.id,
      p_prestador_data: {
        nome: prestador_data.nome_completo,
        nif: prestador_data.nif,
        telefone: prestador_data.telefone,
        morada: prestador_data.morada,
        email: prestador_data.email,
        confirmacao_valor: prestador_data.confirmacao_valor,
      },
      p_recibo_data: {},
      p_ip_origem: ip === "unknown" ? null : ip,
      p_user_agent: userAgent || null,
    });

  if (rpcErr) {
    console.error(JSON.stringify({
      event: "erro_rpc_atomic",
      link_id: link.id,
      error: rpcErr.message,
      code: (rpcErr as { code?: string }).code,
      ip,
      ts: new Date().toISOString(),
    }));

    // P0001 = link já usado (race condition entre 2 prestadores simultâneos)
    if ((rpcErr as { code?: string }).code === "P0001") {
      return jsonErr(
        "Este link já foi utilizado por outro prestador. Pede ao proprietário um novo link.",
        410,
        "token_used_race",
      );
    }
    return jsonErr("Erro interno ao registar o recibo.", 500, "rpc_error");
  }

  const result = rpcData as { recibo_id: string; prestador_id: string; status: string };

  // ── 5. Audit log — falha silenciosa ─────────────────────────────────────
  const { error: auditErr } = await sb
    .schema("core")
    .from("agent_audit_log")
    .insert({
      organization_id: link.organization_id,
      agent_name: "prestador-onboarding",
      tool_name: "prestador.create_recibo",
      tool_input: {
        link_id: link.id,
        nif: prestador_data.nif,
        confirmacao_valor: prestador_data.confirmacao_valor,
      },
      tool_output: {
        recibo_id: result.recibo_id,
        prestador_id: result.prestador_id,
        status: result.status,
      },
      content: { ip, user_agent: userAgent },
    });
  if (auditErr) {
    console.warn(JSON.stringify({ event: "audit_log_falhou", recibo_id: result.recibo_id, error: auditErr.message, ts: new Date().toISOString() }));
  }

  // ── 6. Resposta — NUNCA retornar magic_link_id raw, token, dados internos ─
  console.log(JSON.stringify({
    event: "prestador_onboarded",
    recibo_id: result.recibo_id,
    ip,
    ts: new Date().toISOString(),
  }));

  return jsonOk({
    recibo_id: result.recibo_id,
    status: result.status,
  });
});
