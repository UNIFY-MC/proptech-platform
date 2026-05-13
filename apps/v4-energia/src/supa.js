import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Storage key partilhada — garante que sb / supaV4 / supaCore vêem a mesma session
// (regra DD: persistSession:false faz INSERTs irem como anon, RLS bloqueia)
const AUTH_OPTS = {
  storageKey: 'sb-hkmvszkpxjbxmnixzqbl-auth-token',
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
};

// Cliente auth (schema público) — usado para auth.getUser(), storage, functions
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: AUTH_OPTS,
});

export const supaV4 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'v4_energia' },
  auth: AUTH_OPTS,
});

export const supaCore = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'core' },
  auth: AUTH_OPTS,
});
