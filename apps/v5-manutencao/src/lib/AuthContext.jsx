import { createContext, useContext, useEffect, useState } from 'react'
import { supa } from '../supa'
import { supaCore } from '../supa'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(null)
  const [pessoa,   setPessoa]   = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supa.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadPessoa(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supa.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (event === 'SIGNED_OUT') {
          setPessoa(null)
          setLoading(false)
          return
        }
        if (session?.user) {
          await loadPessoa(session.user.id)
        } else {
          setPessoa(null)
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
    setPessoa(data || null)
    setLoading(false)
  }

  const signOut = async () => {
    await supa.auth.signOut()
    setPessoa(null)
    setSession(null)
  }

  const refreshPessoa = async () => {
    if (session?.user) await loadPessoa(session.user.id)
  }

  return (
    <AuthCtx.Provider value={{
      session,
      pessoa,
      pessoa_id: pessoa?.id ?? null,
      authenticated: !!session,
      loading,
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
