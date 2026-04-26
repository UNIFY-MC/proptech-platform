// supabase/functions/delete-account/index.ts
// Sprint 3.4D Task D — GDPR account deletion
// Fluxo: verificar JWT → verificar password → anonimizar dados → apagar auth user

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'http://localhost:5175',
  'http://localhost:5174',
  'https://v5-manutencao.netlify.app', // substituir pelo domínio real em Fase 7
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors   = corsHeaders(origin)

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, cors)
  }

  try {
    // ── 1. Verificar JWT ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado' }, 401, cors)
    }
    const userToken = authHeader.slice(7)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!

    const supaService = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Cliente separado para RPCs no schema core (Content-Profile: core)
    // fn_anonymize_account está em core, não em public
    const supaServiceCore = createClient(supabaseUrl, serviceKey, {
      db: { schema: 'core' },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: userError } = await supaService.auth.getUser(userToken)
    if (userError || !user) {
      return json({ error: 'Token inválido' }, 401, cors)
    }

    // ── 2. Verificar password de confirmação ───────────────────────────
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const { password } = body

    if (!password || typeof password !== 'string') {
      return json({ error: 'Password de confirmação obrigatória' }, 400, cors)
    }

    const supaAnon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: signInError } = await supaAnon.auth.signInWithPassword({
      email:    user.email!,
      password: password,
    })

    if (signInError) {
      return json({ error: 'Password incorrecta. Conta não eliminada.' }, 403, cors)
    }

    // ── 3. Anonimizar dados (RPC SECURITY DEFINER, service_role) ───────
    const { data: rpcData, error: rpcError } = await supaServiceCore.rpc('fn_anonymize_account', {
      p_auth_user_id: user.id,
    })

    if (rpcError) {
      console.error('fn_anonymize_account error:', rpcError)
      return json({ error: 'Erro ao anonimizar dados.' }, 500, cors)
    }

    if (rpcData && typeof rpcData === 'object' && !(rpcData as Record<string, unknown>).ok) {
      return json({ error: (rpcData as Record<string, unknown>).error ?? 'Erro desconhecido' }, 500, cors)
    }

    // ── 4. Apagar utilizador de auth.users (irreversível) ──────────────
    const { error: deleteError } = await supaService.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('deleteUser error:', deleteError)
      return json({ error: 'Erro ao eliminar conta de autenticação.' }, 500, cors)
    }

    return json({ ok: true }, 200, cors)

  } catch (err) {
    const e = err as Error
    console.error('delete-account unexpected error:', e.message)
    return json({ error: 'Erro interno. Tenta novamente.' }, 500, cors)
  }
})
