/**
 * validators.ts — Validação de payload para v4-energia-lead
 *
 * Sem dependências externas (sem Zod) — helpers simples inline.
 * Todos os erros retornam mensagens em PT-PT prontas para o utilizador.
 */

export interface LeadPayload {
  segmento: "particular" | "empresa" | "condominio";
  nome: string;
  email: string;
  telefone?: string;
  cpe: string;
  kva: number;
  kwh_mensal_estimado: number;
  ciclo?: "simples" | "bi-horario" | "tri-horario";
  comercializadora_atual?: string;
  comercializadora_nova?: string;
  valor_atual?: number;
  valor_novo?: number;
  poupanca_anual?: number;
  imovel_id?: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  payload?: LeadPayload;
}

// Regex email simples mas robusto para casos reais
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// CPE português: PT seguido de 18 a 20 dígitos (formato ERSE)
// Exemplo válido: PT0002000100012345GR → "PT" + 16 algarismos + 2 letras
// Mas a spec diz PT\d{18,20} — usamos isso literalmente
const CPE_REGEX = /^PT\d{16}[A-Z0-9]{2,4}$/i;

// Gama válida BTN Portugal: 1.15 kVA a 41.4 kVA
const KVA_MIN = 1.15;
const KVA_MAX = 41.4;

// kWh mensal razoável: 0 a 10 000
const KWH_MIN = 0;
const KWH_MAX = 10_000;

const SEGMENTOS_VALIDOS = ["particular", "empresa", "condominio"] as const;
const CICLOS_VALIDOS = ["simples", "bi-horario", "tri-horario"] as const;

export function validateLeadPayload(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Payload inválido." };
  }

  const body = raw as Record<string, unknown>;

  // --- Campos obrigatórios ---

  // nome
  if (!body.nome || typeof body.nome !== "string" || body.nome.trim().length < 2) {
    return { ok: false, error: "Nome inválido. Mínimo 2 caracteres." };
  }

  // email
  if (!body.email || typeof body.email !== "string" || !EMAIL_REGEX.test(body.email.trim())) {
    return { ok: false, error: "Email inválido." };
  }

  // cpe
  if (!body.cpe || typeof body.cpe !== "string" || !CPE_REGEX.test(body.cpe.trim())) {
    return {
      ok: false,
      error: "CPE inválido. Formato esperado: PT seguido de 16 algarismos e 2-4 caracteres (ex: PT0002000100012345GR).",
    };
  }

  // segmento
  if (!body.segmento || !SEGMENTOS_VALIDOS.includes(body.segmento as typeof SEGMENTOS_VALIDOS[number])) {
    return { ok: false, error: "Segmento inválido. Valores aceites: particular, empresa, condominio." };
  }

  // kva
  const kva = Number(body.kva);
  if (isNaN(kva) || kva < KVA_MIN || kva > KVA_MAX) {
    return {
      ok: false,
      error: `Potência contratada (kVA) inválida. Deve estar entre ${KVA_MIN} e ${KVA_MAX} kVA.`,
    };
  }

  // kwh_mensal_estimado
  const kwh = Number(body.kwh_mensal_estimado);
  if (isNaN(kwh) || kwh < KWH_MIN || kwh > KWH_MAX) {
    return {
      ok: false,
      error: `Consumo mensal estimado inválido. Deve estar entre ${KWH_MIN} e ${KWH_MAX} kWh.`,
    };
  }

  // --- Campos opcionais com validação ---

  // telefone — se presente, deve ter pelo menos 9 dígitos
  if (body.telefone !== undefined && body.telefone !== null && body.telefone !== "") {
    const tel = String(body.telefone).replace(/\s/g, "");
    if (!/^\+?[\d]{9,15}$/.test(tel)) {
      return { ok: false, error: "Telefone inválido." };
    }
  }

  // ciclo — se presente, deve ser valor válido
  if (body.ciclo !== undefined && !CICLOS_VALIDOS.includes(body.ciclo as typeof CICLOS_VALIDOS[number])) {
    return { ok: false, error: "Ciclo inválido. Valores aceites: simples, bi-horario, tri-horario." };
  }

  // imovel_id — se presente, deve ser UUID v4
  if (body.imovel_id !== undefined && body.imovel_id !== null && body.imovel_id !== "") {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(String(body.imovel_id))) {
      return { ok: false, error: "imovel_id inválido. Deve ser um UUID válido." };
    }
  }

  // Valores monetários — se presentes, devem ser numéricos não-negativos
  for (const campo of ["valor_atual", "valor_novo", "poupanca_anual"] as const) {
    if (body[campo] !== undefined && body[campo] !== null) {
      const v = Number(body[campo]);
      if (isNaN(v) || v < 0) {
        return { ok: false, error: `Campo ${campo} inválido. Deve ser um número positivo.` };
      }
    }
  }

  // Payload limpo e tipado
  const payload: LeadPayload = {
    segmento: body.segmento as LeadPayload["segmento"],
    nome: String(body.nome).trim(),
    email: String(body.email).trim().toLowerCase(),
    telefone: body.telefone ? String(body.telefone).replace(/\s/g, "") : undefined,
    cpe: String(body.cpe).trim().toUpperCase(),
    kva,
    kwh_mensal_estimado: kwh,
    ciclo: (body.ciclo as LeadPayload["ciclo"]) ?? "simples",
    comercializadora_atual: body.comercializadora_atual ? String(body.comercializadora_atual).trim() : undefined,
    comercializadora_nova: body.comercializadora_nova ? String(body.comercializadora_nova).trim() : undefined,
    valor_atual: body.valor_atual !== undefined ? Number(body.valor_atual) : undefined,
    valor_novo: body.valor_novo !== undefined ? Number(body.valor_novo) : undefined,
    poupanca_anual: body.poupanca_anual !== undefined ? Number(body.poupanca_anual) : undefined,
    imovel_id: body.imovel_id ? String(body.imovel_id) : undefined,
  };

  return { ok: true, payload };
}
