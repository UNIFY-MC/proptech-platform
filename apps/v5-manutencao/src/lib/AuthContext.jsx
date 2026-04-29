// Shim V5 — liga @proptech/auth aos clients específicos desta vertical.
// Os 32 ficheiros que fazem useAuth() não precisam de mudar nada.
import { supa, supaCore } from '../supa'
import { AuthProvider as SharedAuthProvider, useAuth } from '@proptech/auth'

export function AuthProvider({ children }) {
  return (
    <SharedAuthProvider mainClient={supa} coreClient={supaCore}>
      {children}
    </SharedAuthProvider>
  )
}

export { useAuth }
