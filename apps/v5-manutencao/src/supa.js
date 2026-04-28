import { createClient } from '@supabase/supabase-js';

// V1 Core Hub — schemas v5_manutencao vive aqui
export const SUPABASE_URL      = 'https://hkmvszkpxjbxmnixzqbl.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'v5_manutencao' },
  auth: {
    storageKey: 'sb-v5-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export const supaCore = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'core' },
  auth: { storageKey: 'sb-core-auth', persistSession: false, autoRefreshToken: false },
});

export const supaPublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: { storageKey: 'sb-public-auth', persistSession: false, autoRefreshToken: false },
});

// DEBUG INTERACTIVO BROWSER (DEV only — removido em production build pelo Vite)
// Expõe os 3 clientes Supabase na window para queries ad-hoc na consola do browser.
//
// Uso:
//   window.supabase.from('ordens_trabalho').select('id,estado').limit(5).then(console.log)
//   window.supaCore.from('pessoas').select('id,email').limit(5).then(console.log)
//   window.supaPublic.rpc('current_pessoa_id').then(console.log)
//
// Em produção (npm run build) o Vite faz tree-shake deste bloco completo.
if (import.meta.env.DEV) {
  window.supabase = supa;
  window.supaCore = supaCore;
  window.supaPublic = supaPublic;
  console.log('[dev] window.supabase / supaCore / supaPublic expostos para debug');

  // Smoke test E2E para agent-image-inspector (Sprint 1B.2.2)
  // Uso: const result = await window.__testImageInspector(file, '<uuid-loc-opcional>')
  //      const result = await window.__testImageInspector(file, { localizacao_id: '<uuid>' })
  window.__testImageInspector = async (file, opts = {}) => {
    // Tolerante: aceita string UUID ou { localizacao_id: '...' } ou { localizacaoId: '...' }
    const localizacaoId = typeof opts === 'string'
      ? opts
      : (opts?.localizacao_id ?? opts?.localizacaoId ?? undefined);

    const { compressImage } = await import('./lib/imageCompression.js');
    console.log('[inspector] Comprimindo...', file.name, (file.size / 1024).toFixed(0) + ' KB');
    const compressed = await compressImage(file);
    console.log('[inspector] Comprimido:', compressed.width + 'x' + compressed.height,
      (compressed.sizeBytes / 1024).toFixed(0) + ' KB');

    const { data, error } = await supa.functions.invoke('agent-image-inspector', {
      body: {
        base64Image: compressed.base64,
        mimeType: compressed.mimeType,
        ...(localizacaoId ? { localizacaoId } : {}),
      },
    });

    if (error) {
      console.error('[inspector] ❌ Edge Function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[inspector]', data.success ? '✅ SUCCESS' : '❌ FAILED',
      '| iterations:', data.iterations,
      '| cost: €' + data.totalCostEur,
      '| path:', data.fotoPath);
    return data;
  };
  console.log('[dev] window.__testImageInspector(file, localizacaoId?) disponível');
}
