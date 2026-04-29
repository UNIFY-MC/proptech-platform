import { createContext, useContext, useEffect, useState } from 'react'

const AuthCtx = createContext(null)

// Sincroniza sessão JWT do cliente principal para coreClient,
// para que queries a core.* com RLS activo incluam o JWT correcto.
async function syncCoreClient(coreClient, session) {
  try {
    if (session?.access_token) {
      await coreClient.auth.setSession({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
      })
    } else {
      await coreClient.auth.signOut()
    }
  } catch (e) {
    console.warn('[AuthContext] coreClient sync failed:', e)
  }
}

/**
 * @param {{ mainClient: import('@supabase/supabase-js').SupabaseClient,
 *           coreClient: import('@supabase/supabase-js').SupabaseClient,
 *           children: React.ReactNode }} props
 */
export function AuthProvider({ mainClient, coreClient, children }) {
  const [session,     setSession]     = useState(null)
  const [pessoa,      setPessoa]      = useState(null)
  const [memberships, setMemberships] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [isStaff,     setIsStaff]     = useState(false)
  const [staffRoles,  setStaffRoles]  = useState([])

  useEffect(() => {
    mainClient.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      await syncCoreClient(coreClient, session)
      if (session?.user) {
        loadPessoa(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = mainClient.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        await syncCoreClient(coreClient, session)

        if (event === 'SIGNED_OUT') {
          setPessoa(null)
          setMemberships([])
          setIsStaff(false)
          setStaffRoles([])
          setLoading(false)
          return
        }
        if (session?.user) {
          await loadPessoa(session.user.id)
        } else {
          setPessoa(null)
          setMemberships([])
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [mainClient, coreClient])

  async function loadPessoa(authUserId) {
    setLoading(true)
    const { data, error } = await coreClient
      .from('pessoas')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (error) console.error('[AuthContext] erro ao carregar pessoa:', error)

    const p = data || null
    setPessoa(p)

    if (p) {
      await Promise.all([
        loadMemberships(p.id),
        loadStaffRoles(authUserId),
      ])
    } else {
      setMemberships([])
      setIsStaff(false)
      setStaffRoles([])
    }
    setLoading(false)
  }

  async function loadStaffRoles(authUserId) {
    const { data } = await coreClient
      .from('staff_roles')
      .select('role')
      .eq('auth_user_id', authUserId)
      .eq('active', true)
    const roles = data?.map(r => r.role) ?? []
    setStaffRoles(roles)
    setIsStaff(roles.length > 0)
  }

  async function loadMemberships(pessoaId) {
    const { data, error } = await coreClient
      .from('memberships')
      .select('id, organization_id, role')
      .eq('pessoa_id', pessoaId)
    if (error) console.error('[AuthContext] erro ao carregar memberships:', error)
    setMemberships(data || [])
  }

  // signOut limpa sessão mas NÃO o localStorage de onboarding (retoma no próximo login)
  const signOut = async () => {
    await mainClient.auth.signOut()
    // syncCoreClient é chamado via onAuthStateChange SIGNED_OUT
    setPessoa(null)
    setMemberships([])
    setIsStaff(false)
    setStaffRoles([])
    setSession(null)
  }

  const refreshPessoa = async () => {
    if (session?.user) await loadPessoa(session.user.id)
  }

  // needsOnboarding: sem memberships → wizard bloqueante até RPC fn_complete_onboarding concluir
  const needsOnboarding = !loading && !!session && memberships.length === 0

  return (
    <AuthCtx.Provider value={{
      session,
      pessoa,
      pessoa_id:       pessoa?.id ?? null,
      memberships,
      authenticated:   !!session,
      loading,
      needsOnboarding,
      isStaff,
      staffRoles,
      signOut,
      refreshPessoa,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth deve estar dentro de AuthProvider')
  return ctx
}
