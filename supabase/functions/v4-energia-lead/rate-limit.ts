/**
 * rate-limit.ts — In-memory rate limiter para v4-energia-lead
 *
 * Dois controlos independentes:
 *   1. Por IP   → máx. 3 pedidos em 10 minutos (janela deslizante)
 *   2. Por email+CPE → máx. 1 pedido em 24 horas (dedup negocial)
 *
 * Nota: state em memória — reinicia ao cold start da Edge Function.
 * Aceitável para v1. Em v2 considerar Redis/Upstash para persistência.
 */

// Janela de rate limit por IP: 3 pedidos / 10 minutos
const IP_MAX_REQUESTS = 3;
const IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutos em ms

// Janela de dedup por email+CPE: 1 pedido / 24 horas
const EMAILCPE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas em ms

// Map: ip → array de timestamps dos pedidos recentes
const ipStore = new Map<string, number[]>();

// Map: "email:cpe" → timestamp do último pedido
const emailCpeStore = new Map<string, number>();

/**
 * Verifica e regista um pedido por IP.
 * Retorna true se o pedido deve ser bloqueado (rate limit excedido).
 */
export function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - IP_WINDOW_MS;

  // Limpeza lazy: remove timestamps fora da janela
  const existing = (ipStore.get(ip) ?? []).filter((t) => t > windowStart);

  if (existing.length >= IP_MAX_REQUESTS) {
    return true; // bloqueado
  }

  // Regista o pedido actual
  existing.push(now);
  ipStore.set(ip, existing);
  return false; // permitido
}

/**
 * Verifica se já existe um pedido recente para este par email+CPE.
 * Retorna true se o pedido deve ser bloqueado (duplicado).
 */
export function checkEmailCpeDuplicate(email: string, cpe: string): boolean {
  const key = `${email.toLowerCase()}:${cpe.toUpperCase()}`;
  const now = Date.now();
  const last = emailCpeStore.get(key);

  if (last !== undefined && now - last < EMAILCPE_WINDOW_MS) {
    return true; // duplicado dentro da janela de 24h
  }

  // Regista o timestamp deste pedido
  emailCpeStore.set(key, now);
  return false; // permitido
}

/**
 * Limpeza periódica dos Maps para evitar crescimento ilimitado em memória.
 * Chamada no início de cada pedido (custo O(n) mas Maps pequenos em v1).
 */
export function purgeExpiredEntries(): void {
  const now = Date.now();

  // Limpa entradas IP sem timestamps válidos
  for (const [ip, timestamps] of ipStore.entries()) {
    const valid = timestamps.filter((t) => now - t < IP_WINDOW_MS);
    if (valid.length === 0) {
      ipStore.delete(ip);
    } else {
      ipStore.set(ip, valid);
    }
  }

  // Limpa entradas email+CPE expiradas
  for (const [key, timestamp] of emailCpeStore.entries()) {
    if (now - timestamp >= EMAILCPE_WINDOW_MS) {
      emailCpeStore.delete(key);
    }
  }
}
