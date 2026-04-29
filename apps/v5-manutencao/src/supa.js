import { createMainClient, createCoreClient, SUPABASE_URL } from '@proptech/db'
import { createClient } from '@supabase/supabase-js'

const _key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Exporta constantes para os 2 ficheiros que as importam directamente
// (LoginSegurancaScreen.jsx importa SUPABASE_URL + SUPABASE_ANON_KEY)
export { SUPABASE_URL }
export const SUPABASE_ANON_KEY = _key

// Cliente principal — schema v5_manutencao
// auth config V5-específica: pkce + storageKey próprio
export const supa = createMainClient(_key, {
  db: { schema: 'v5_manutencao' },
  auth: {
    storageKey: 'sb-v5-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

// Cliente core — schema core · sem session persistence
// JWT sincronizado manualmente via syncCoreClient() em @proptech/auth
export const supaCore = createCoreClient(_key)

// Cliente público — schema public · sem session persistence (ver Regra DD)
// USAR APENAS para queries verdadeiramente públicas (sem auth.uid() context)
export const supaPublic = createClient(SUPABASE_URL, _key, {
  db: { schema: 'public' },
  auth: { storageKey: 'sb-public-auth', persistSession: false, autoRefreshToken: false },
})

// DEBUG INTERACTIVO BROWSER (DEV only — removido em production build pelo Vite)
if (import.meta.env.DEV) {
  window.supabase = supa
  window.supaCore = supaCore
  window.supaPublic = supaPublic
  console.log('[dev] window.supabase / supaCore / supaPublic expostos para debug')

  // Smoke test E2E para agent-image-inspector (Sprint 1B.2.2)
  window.__testImageInspector = async (file, opts = {}) => {
    const localizacaoId = typeof opts === 'string'
      ? opts
      : (opts?.localizacao_id ?? opts?.localizacaoId ?? undefined)

    const { compressImage } = await import('./lib/imageCompression.js')
    console.log('[inspector] Comprimindo...', file.name, (file.size / 1024).toFixed(0) + ' KB')
    const compressed = await compressImage(file)
    console.log('[inspector] Comprimido:', compressed.width + 'x' + compressed.height,
      (compressed.sizeBytes / 1024).toFixed(0) + ' KB')

    const { data, error } = await supa.functions.invoke('agent-image-inspector', {
      body: {
        base64Image: compressed.base64,
        mimeType: compressed.mimeType,
        ...(localizacaoId ? { localizacaoId } : {}),
      },
    })

    if (error) {
      console.error('[inspector] ❌ Edge Function error:', error)
      return { success: false, error: error.message }
    }

    console.log('[inspector]', data.success ? '✅ SUCCESS' : '❌ FAILED',
      '| iterations:', data.iterations,
      '| cost: €' + data.totalCostEur,
      '| path:', data.fotoPath)
    return data
  }
  console.log('[dev] window.__testImageInspector(file, localizacaoId?) disponível')
}
