import {
  createMainClient,
  createCoreClient,
  createV2Client,
  createSystemClient,
  createV2LegacyClient,
} from '@proptech/db'

// Lê uma única vez ao arranque. Build estático Vite expõe via import.meta.env.
const anonKey         = import.meta.env.VITE_SUPABASE_ANON_KEY           || ''
const v2LegacyAnonKey = import.meta.env.VITE_SUPABASE_V2_LEGACY_ANON_KEY || ''

if (!anonKey && import.meta.env.DEV) {
  console.warn(
    '[v2-condominios] VITE_SUPABASE_ANON_KEY não definida — clientes Supabase inactivos'
  )
}

// mainClient é o único com persistSession. Os outros sincronizam JWT
// via V2AuthSync (filho do AuthProvider de @proptech/auth).
export const mainClient   = createMainClient(anonKey)
export const coreClient   = createCoreClient(anonKey)
export const v2Client     = createV2Client(anonKey)
export const systemClient = createSystemClient(anonKey)

// V2 Condo Hub legacy (prataowners.pt) — READ-ONLY.
// Identidade separada (não partilha JWT com V1). Anon-only por defeito;
// RLS bloqueia 23 das 31 tabelas para anon — só 8 tabelas RLS-off são
// visíveis sem login user (condominios, configuracoes, carregadores_contagens,
// dividas_fracoes_snapshot, etc).
export const v2LegacyClient = v2LegacyAnonKey ? createV2LegacyClient(v2LegacyAnonKey) : null
export const v2LegacyEnabled = !!v2LegacyAnonKey

export async function syncJwt(client, session) {
  try {
    if (session?.access_token) {
      await client.auth.setSession({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
      })
    } else {
      await client.auth.signOut()
    }
  } catch (err) {
    console.warn('[v2-condominios] syncJwt failed:', err)
  }
}
