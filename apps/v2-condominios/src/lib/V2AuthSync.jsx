import { useEffect } from 'react'
import { useAuth } from '@proptech/auth'
import { v2Client, systemClient, iamClient, syncJwt } from './clients.js'

// Sincroniza JWT da sessão activa para v2Client + systemClient + iamClient.
// @proptech/auth só conhece mainClient + coreClient — este componente
// estende esse comportamento para os clients adicionais sem modificar o
// package partilhado.
// iamClient adicionado em ADR-013 (centralização permissões cross-vertical).
export default function V2AuthSync({ children }) {
  const { session } = useAuth()

  useEffect(() => {
    syncJwt(v2Client, session)
    syncJwt(systemClient, session)
    syncJwt(iamClient, session)
  }, [session?.access_token])

  return children
}
