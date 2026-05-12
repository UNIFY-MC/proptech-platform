import { useEffect } from 'react'
import { useAuth } from '@proptech/auth'
import { v2Client, systemClient, syncJwt } from './clients.js'

// Sincroniza JWT da sessão activa para v2Client e systemClient.
// @proptech/auth só conhece mainClient + coreClient — este componente
// estende esse comportamento para os dois clients adicionais sem
// modificar o package partilhado (que é usado também pela v5-manutencao).
export default function V2AuthSync({ children }) {
  const { session } = useAuth()

  useEffect(() => {
    syncJwt(v2Client, session)
    syncJwt(systemClient, session)
  }, [session?.access_token])

  return children
}
