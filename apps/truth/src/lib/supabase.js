import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hkmvszkpxjbxmnixzqbl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const AUTH_OPTS = {
  storageKey: 'sb-hkmvszkpxjbxmnixzqbl-auth-token',
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
};

// Cliente público (auth, storage, functions)
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: AUTH_OPTS,
});

// Cliente schema system — swarm_workers, swarm_discoveries, swarm_niches, etc.
export const supaSystem = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'system' },
  auth: AUTH_OPTS,
});

// Cliente schema core — workspaces, pessoas, etc.
export const supaCore = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'core' },
  auth: AUTH_OPTS,
});
