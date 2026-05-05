import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store'

export default function AuthGuard({ children }) {
  const { session, loading, setSession } = useAuthStore()

  useEffect(() => {
    if (!supabase) {
      // Sem cliente Supabase configurado — não bloquear acesso
      useAuthStore.setState({ loading: false })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!session) return <Navigate to="/login" replace />

  return children
}
