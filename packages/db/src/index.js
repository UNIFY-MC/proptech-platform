import { createClient } from '@supabase/supabase-js'

// V1 Core Hub — único projecto Supabase da plataforma
// URL pública (safe to commit); key lida de VITE_SUPABASE_ANON_KEY nos apps consumers
export const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co'

/**
 * Factory para o cliente principal (qualquer schema via options).
 * O caller passa { db: { schema: 'v5_manutencao' } } ou similar.
 *
 * @param {string} anonKey  - import.meta.env.VITE_SUPABASE_ANON_KEY do app consumer
 * @param {import('@supabase/supabase-js').SupabaseClientOptions} [options]
 */
export function createMainClient(anonKey, options = {}) {
  return createClient(SUPABASE_URL, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    ...options,
  })
}

/**
 * Factory para o cliente do schema `core` (sem session persistence).
 * O caller deve sincronizar o JWT manualmente via supaCore.auth.setSession()
 * a cada mudança de auth state (ver syncSupaCore em AuthContext).
 *
 * @param {string} anonKey - import.meta.env.VITE_SUPABASE_ANON_KEY do app consumer
 */
export function createCoreClient(anonKey) {
  return createClient(SUPABASE_URL, anonKey, {
    db: { schema: 'core' },
    auth: {
      storageKey: 'sb-core-auth',
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Factory para o cliente do schema `v2_condominios` (sem session persistence).
 * Mesmo padrão que createCoreClient: caller sincroniza JWT via setSession
 * a cada mudança de auth state. Usado por apps/v2-condominios.
 *
 * @param {string} anonKey - import.meta.env.VITE_SUPABASE_ANON_KEY do app consumer
 */
export function createV2Client(anonKey) {
  return createClient(SUPABASE_URL, anonKey, {
    db: { schema: 'v2_condominios' },
    auth: {
      storageKey: 'sb-v2-auth',
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Factory para o cliente do schema `system` (sem session persistence).
 * Inbox items, approvals queue, agentic ops. Usado por apps/dashboard e
 * verticais que escrevem tarefas/aprovações.
 *
 * @param {string} anonKey - import.meta.env.VITE_SUPABASE_ANON_KEY do app consumer
 */
export function createSystemClient(anonKey) {
  return createClient(SUPABASE_URL, anonKey, {
    db: { schema: 'system' },
    auth: {
      storageKey: 'sb-system-auth',
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// V2 Condo Hub legacy — projecto Supabase em produção em prataowners.pt.
// READ-ONLY. NUNCA escrever (ver CLAUDE.md guard-rail 4).
// Usado por apps/v2-condominios para mostrar dados reais (97 fracções, 593
// recebimentos, 2733 documentos, etc) enquanto v2_condominios no V1 está vazio.
export const SUPABASE_V2_LEGACY_URL = 'https://eozklslwfaqujaijvdnl.supabase.co'

/**
 * Factory para o cliente do Supabase V2 produção legacy.
 * Sessão isolada para não colidir com mainClient (V1).
 *
 * @param {string} anonKey - import.meta.env.VITE_SUPABASE_V2_LEGACY_ANON_KEY
 */
export function createV2LegacyClient(anonKey) {
  return createClient(SUPABASE_V2_LEGACY_URL, anonKey, {
    auth: {
      storageKey: 'sb-v2-legacy-auth',
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
