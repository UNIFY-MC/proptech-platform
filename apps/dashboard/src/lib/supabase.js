import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  if (import.meta.env.DEV) {
    console.warn(
      '[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas — cliente Supabase inactivo'
    )
  }
}

// Nota sobre multi-schema: as tabelas do Command Center vivem em `system.*`
// (inbox_items, inbox_reads, approvals_queue). O SDK @supabase/supabase-js@^2
// não suporta schema prefix no from() directamente.
// Abordagem adoptada: usar supabase.schema('system').from('tabela') por query.
// Isto é suportado a partir de supabase-js v2.x e é preferível a criar um
// segundo createClient com db.schema fixo, porque no futuro haverá queries
// em schemas distintos (system + v5_manutencao) na mesma sessão.
export const supabase = url && key
  ? createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } }
    })
  : null
