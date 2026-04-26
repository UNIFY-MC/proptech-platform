import { createContext, useContext, useEffect, useState } from 'react'
import { supa, supaCore } from '../supa'

const AuthCtx = createContext(null)

// Sincroniza sessão JWT do cliente principal (supa) para supaCore,
// para que queries a core.* com RLS activo incluam o JWT correcto.
async function syncSupaCore(session) {
  try {
    if (session?.access_token) {
      await supaCore.auth.setSession({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
      })
    } else {
      await supaCore.auth.signOut()
    }
  } catch (e) {
    console.warn('[AuthContext] supaCore sync failed:', e)
  }
}

export function AuthProvider({ children }) {
  const [session,     setSession]     = useState(null)
  const [pessoa,      setPessoa]      = useState(null)
  const [memberships, setMemberships] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    supa.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      await syncSupaCore(session)
      if (session?.user) {
        loadPessoa(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supa.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        await syncSupaCore(session)

        if (event === 'SIGNED_OUT') {
          setPessoa(null)
          setMemberships([])
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
  }, [])

  async function loadPessoa(authUserId) {
    setLoading(true)
    const { data, error } = await supaCore
      .from('pessoas')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (error) console.error('[AuthContext] erro ao carregar pessoa:', error)

    const p = data || null
    setPessoa(p)

    if (p) {
      await loadMemberships(p.id)
    } else {
      setMemberships([])
    }
    setLoading(false)
  }

  async function loadMemberships(pessoaId) {
    const { data, error } = await supaCore
      .from('memberships')
      .select('id, organization_id, role')
      .eq('pessoa_id', pessoaId)
    if (error) console.error('[AuthContext] erro ao carregar memberships:', error)
    setMemberships(data || [])
  }

  // signOut limpa sessão mas NÃO o localStorage de onboarding (retoma no próximo login)
  const signOut = async () => {
    await supa.auth.signOut()
    // syncSupaCore é chamado via onAuthStateChange SIGNED_OUT
    setPessoa(null)
    setMemberships([])
    setSession(null)
  }

  const refreshPessoa = async () => {
    if (session?.user) await loadPessoa(session.user.id)
  }

  // needsOnboarding: sem memberships → wizard bloqueante até RPC G1 concluir
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
