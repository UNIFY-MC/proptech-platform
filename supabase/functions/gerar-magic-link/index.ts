/**
 * Edge Function: gerar-magic-link
 * Endpoint: POST /functions/v1/gerar-magic-link
 *
 * Sprint 1D · Day 2 (refactored P1 fix) · Receipt Trojan Horse Alpha
 * Projecto Supabase ALVO: V1 Core Hub  (hkmvszkpxjbxmnixzqbl)
 *
 * Decisão D2.1 (Mário sign-off 2026-05-01) — Token hashing:
 *   tokenClear = 32 bytes random → 64 hex  (viaja em URL, retornado ao owner)
 *   tokenHash  = sha256(tokenClear) → 64 hex  (gravado em DB — plaintext NUNCA em BD)
 *   Regex CHECK '^[0-9a-f]{64}$' mantém-se válido (sha256 hex = 64 chars).
 *   Response: { token_clear, url, expires_at, magic_link_id }
 *   NUNCA retornar tokenHash na response.
 *
 * Auth obrigatória: JWT Supabase do owner. Sem JWT → 401.
 *
 * Input (JSON):
 *   {
 *     tipo_servico: string (1-100 chars),
 *     valor_eur: number (>0, max 99999.99),
 *     data_servico: string (YYYY-MM-DD, ≤ today + 1 dia),
 *     localizacao_id?: string (UUID),
 *     notas?: string (≤500 chars)
 *   }
 *
 * Output (200):
 *   {
 *     ok: true,
 *     token_clear: "abc...64hex",      ← owner partilha este valor em URL
 *     url: "https://prataowners.pt/join/abc...",
 *     expires_at: "2026-05-03T10:00:00.000Z",
 *     magic_link_id: "uuid"
 *   }
 *
 * Errors:
 *   400 — input inválido
 *   401 — sem JWT ou JWT inválido
 *   403 — owner sem organização (onboarding incompleto)
 *   429 — rate limit (10 links/dia atingido)
 *   500 — DB error (token collision >3, INSERT falhou)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Ambiente (T6: nunca hardcoded) ────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SHARE_BASE_URL = Deno.env.get("SHARE_BASE_URL") ?? "https://prataowners.pt";

const TTL_HOURS = 48;
const RATE_LIMIT_PER_DAY = 10;

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
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

interface InputPayload {
  tipo_servico: string;
  valor_eur: number;
  data_servico: string;
  localizacao_id?: string | null;
  notas?: string | null;
}

interface ValidationResult {
  ok: boolean;
  payload?: InputPayload;
  error?: string;
}

function validateInput(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Payload deve ser um objecto JSON." };
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.tipo_servico !== "string" || r.tipo_servico.trim().length === 0) {
    return { ok: false, error: "tipo_servico é obrigatório." };
  }
  const tipoServico = r.tipo_servico.trim();
  if (tipoServico.length > 100) {
    return { ok: false, error: "tipo_servico excede 100 caracteres." };
  }

  if (typeof r.valor_eur !== "number" || !Number.isFinite(r.valor_eur)) {
    return { ok: false, error: "valor_eur deve ser número." };
  }
  if (r.valor_eur <= 0 || r.valor_eur > 99999.99) {
    return { ok: false, error: "valor_eur fora de intervalo (0 < valor ≤ 99999.99)." };
  }
  const valorEur = Math.round(r.valor_eur * 100) / 100;

  if (typeof r.data_servico !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.data_servico)) {
    return { ok: false, error: "data_servico deve ser YYYY-MM-DD." };
  }
  const dataServico = new Date(`${r.data_servico}T00:00:00Z`);
  if (Number.isNaN(dataServico.getTime())) {
    return { ok: false, error: "data_servico inválida." };
  }
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (dataServico > tomorrow) {
    return { ok: false, error: "data_servico não pode ser no futuro." };
  }

  let localizacaoId: string | null = null;
  if (r.localizacao_id !== undefined && r.localizacao_id !== null) {
    if (
      typeof r.localizacao_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        r.localizacao_id,
      )
    ) {
      return { ok: false, error: "localizacao_id deve ser UUID." };
    }
    localizacaoId = r.localizacao_id;
  }

  let notas: string | null = null;
  if (r.notas !== undefined && r.notas !== null) {
    if (typeof r.notas !== "string") {
      return { ok: false, error: "notas deve ser string." };
    }
    if (r.notas.length > 500) {
      return { ok: false, error: "notas excede 500 caracteres." };
    }
    notas = r.notas.trim() || null;
  }

  return {
    ok: true,
    payload: {
      tipo_servico: tipoServico,
      valor_eur: valorEur,
      data_servico: r.data_servico,
      localizacao_id: localizacaoId,
      notas,
    },
  };
}

function extractIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
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

  // ── 1. JWT validation ────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonErr("Autenticação obrigatória.", 401, "missing_jwt");
  }
  const jwt = authHeader.slice(7).trim();
  if (!jwt) {
    return jsonErr("JWT vazio.", 401, "empty_jwt");
  }

  const sbUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await sbUser.auth.getUser(jwt);
  if (userError || !userData?.user) {
    console.log(JSON.stringify({ event: "jwt_invalid", ip, error: userError?.message, ts: new Date().toISOString() }));
    return jsonErr("JWT inválido.", 401, "invalid_jwt");
  }
  const authUserId = userData.user.id;

  // ── 2. Input validation ──────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonErr("Payload JSON inválido.", 400, "bad_json");
  }
  const validation = validateInput(rawBody);
  if (!validation.ok || !validation.payload) {
    return jsonErr(validation.error ?? "Dados inválidos.", 400, "validation_failed");
  }
  const payload = validation.payload;

  // ── 3. Service-role client ───────────────────────────────────────────────
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 4. Resolver pessoa + organização do owner ─────────────────────────────
  const { data: pessoaRow, error: pessoaErr } = await sb
    .schema("core")
    .from("pessoas")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (pessoaErr) {
    console.error(JSON.stringify({ event: "erro_select_pessoa", auth_user_id: authUserId, error: pessoaErr.message, ts: new Date().toISOString() }));
    return jsonErr("Erro interno.", 500, "db_pessoa");
  }
  if (!pessoaRow) {
    return jsonErr("Pessoa não encontrada — onboarding incompleto.", 403, "no_pessoa");
  }
  const ownerPessoaId: string = pessoaRow.id;

  const { data: membership, error: memberErr } = await sb
    .schema("core")
    .from("memberships")
    .select("organization_id")
    .eq("pessoa_id", ownerPessoaId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberErr) {
    console.error(JSON.stringify({ event: "erro_select_membership", pessoa_id: ownerPessoaId, error: memberErr.message, ts: new Date().toISOString() }));
    return jsonErr("Erro interno.", 500, "db_membership");
  }
  if (!membership) {
    return jsonErr("Sem organização — completar onboarding antes.", 403, "no_org");
  }
  const organizationId: string = membership.organization_id;

  // ── 5. Rate limit: 10 links/owner/24h ─────────────────────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: countRecent, error: countErr } = await sb
    .schema("v5_manutencao")
    .from("magic_links")
    .select("id", { count: "exact", head: true })
    .eq("owner_pessoa_id", ownerPessoaId)
    .gte("created_at", since);

  if (countErr) {
    console.error(JSON.stringify({ event: "erro_rate_limit_count", pessoa_id: ownerPessoaId, error: countErr.message, ts: new Date().toISOString() }));
    return jsonErr("Erro interno.", 500, "db_count");
  }
  if ((countRecent ?? 0) >= RATE_LIMIT_PER_DAY) {
    console.log(JSON.stringify({ event: "rate_limit_exceeded", pessoa_id: ownerPessoaId, count: countRecent, ts: new Date().toISOString() }));
    return jsonErr(`Limite diário atingido (${RATE_LIMIT_PER_DAY} links/dia). Tente amanhã.`, 429, "rate_limit");
  }

  // ── 6. Gerar tokenClear + hash + INSERT (retry até 3× p/ colisão SHA-256) ──
  // D2.1: tokenClear viaja em URL, tokenHash gravado em BD — plaintext nunca persiste.
  let tokenClear = "";
  let magicLinkId = "";
  let inserted = false;
  let lastError = "";
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);

  for (let attempt = 1; attempt <= 3 && !inserted; attempt++) {
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    tokenClear = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const tokenHash = await sha256Hex(tokenClear);

    const { data: insertData, error: insertErr } = await sb
      .schema("v5_manutencao")
      .from("magic_links")
      .insert({
        owner_pessoa_id: ownerPessoaId,
        organization_id: organizationId,
        localizacao_id: payload.localizacao_id,
        token: tokenHash,
        tipo_servico: payload.tipo_servico,
        valor_eur: payload.valor_eur,
        data_servico: payload.data_servico,
        notas: payload.notas,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      lastError = insertErr.message;
      const isUnique = (insertErr as { code?: string }).code === "23505";
      if (!isUnique) {
        console.error(JSON.stringify({ event: "erro_insert_magic_link", pessoa_id: ownerPessoaId, attempt, error: insertErr.message, ts: new Date().toISOString() }));
        return jsonErr("Erro interno.", 500, "db_insert");
      }
      continue;
    }
    if (insertData) {
      magicLinkId = insertData.id;
      inserted = true;
    }
  }

  if (!inserted) {
    console.error(JSON.stringify({ event: "erro_token_collision_3x", pessoa_id: ownerPessoaId, last_error: lastError, ts: new Date().toISOString() }));
    return jsonErr("Erro interno (token collision).", 500, "db_collision");
  }

  // ── 7. Audit log — falha silenciosa (não bloqueia owner) ─────────────────
  const { error: auditErr } = await sb
    .schema("core")
    .from("agent_audit_log")
    .insert({
      organization_id: organizationId,
      agent_name: "gerar-magic-link",
      tool_name: "magic_link.create",
      tool_input: {
        tipo_servico: payload.tipo_servico,
        valor_eur: payload.valor_eur,
        data_servico: payload.data_servico,
        localizacao_id: payload.localizacao_id,
      },
      tool_output: { magic_link_id: magicLinkId, expires_at: expiresAt.toISOString() },
      content: { ip, user_agent: userAgent },
    });
  if (auditErr) {
    console.warn(JSON.stringify({ event: "audit_log_falhou", magic_link_id: magicLinkId, error: auditErr.message, ts: new Date().toISOString() }));
  }

  // ── 8. Resposta — tokenClear (NUNCA tokenHash) ───────────────────────────
  const url = `${SHARE_BASE_URL}/join/${tokenClear}`;

  console.log(JSON.stringify({
    event: "magic_link_gerado",
    pessoa_id: ownerPessoaId,
    magic_link_id: magicLinkId,
    expires_at: expiresAt.toISOString(),
    ts: new Date().toISOString(),
  }));

  return jsonOk({
    token_clear: tokenClear,
    url,
    expires_at: expiresAt.toISOString(),
    magic_link_id: magicLinkId,
  });
});
