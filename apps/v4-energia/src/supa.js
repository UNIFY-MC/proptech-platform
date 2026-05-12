import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cliente auth (schema público) — usado para auth.getUser(), storage, functions
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supaV4 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'v4_energia' },
  auth: { persistSession: false },
});

export const supaCore = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'core' },
  auth: { persistSession: false },
});
