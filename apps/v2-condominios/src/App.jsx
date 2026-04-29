import { createMainClient, createCoreClient } from '@proptech/db'
import { AuthProvider, useAuth } from '@proptech/auth'
import LoginScreen from './components/LoginScreen.jsx'

const mainClient = createMainClient(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
const coreClient = createCoreClient(import.meta.env.VITE_SUPABASE_ANON_KEY || '')

function AppInner() {
  const { authenticated, loading, pessoa } = useAuth()

  if (loading) {
    return <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#555' }}>A carregar…</div>
  }

  if (!authenticated) {
    return <LoginScreen mainClient={mainClient} />
  }

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#1a3a5c' }}>Olá, V2!</h1>
      <p style={{ color: '#555' }}>
        Sessão activa — {pessoa?.primeiro_nome ?? pessoa?.email ?? 'utilizador'}
      </p>
      <p style={{ color: '#888', fontSize: 13 }}>
        Dashboard V2 Condomínios a construir…
      </p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider mainClient={mainClient} coreClient={coreClient}>
      <AppInner />
    </AuthProvider>
  )
}
