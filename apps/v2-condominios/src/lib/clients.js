import {
  createMainClient,
  createCoreClient,
  createV2Client,
  createSystemClient,
} from '@proptech/db'

// Lê uma única vez ao arranque. Build estático Vite expõe via import.meta.env.
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

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
