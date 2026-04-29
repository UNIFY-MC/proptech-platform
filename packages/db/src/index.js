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
