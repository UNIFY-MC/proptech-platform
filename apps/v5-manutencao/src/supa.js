import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// V5 Manutenção — tabelas em schema public
export const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: true, autoRefreshToken: true },
});
