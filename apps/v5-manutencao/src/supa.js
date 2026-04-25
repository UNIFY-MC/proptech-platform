import { createClient } from '@supabase/supabase-js';

// V1 Core Hub — schemas v5_manutencao vive aqui
const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'v5_manutencao' },
  auth: { storageKey: 'sb-v5-auth', persistSession: true, autoRefreshToken: true },
});

export const supaCore = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'core' },
  auth: { storageKey: 'sb-core-auth', persistSession: false, autoRefreshToken: false },
});

export const supaPublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: { storageKey: 'sb-public-auth', persistSession: false, autoRefreshToken: false },
});
