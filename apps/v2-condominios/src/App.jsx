import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@proptech/auth'
import { DrawerProvider } from '@proptech/ui/DrawerContext'
import { mainClient, coreClient } from './lib/clients.js'
import V2AuthSync from './lib/V2AuthSync.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './views/Dashboard.jsx'
import Fracoes from './views/Fracoes.jsx'
import Mora from './views/Mora.jsx'
import Faturas from './views/Faturas.jsx'
import Documentos from './views/Documentos.jsx'
import Energia from './views/Energia.jsx'
import Seguros from './views/Seguros.jsx'
import Assembleias from './views/Assembleias.jsx'
import Comunicacao from './views/Comunicacao.jsx'
import Agente from './views/Agente.jsx'
import Inbox from './views/Inbox.jsx'
import Approvals from './views/Approvals.jsx'
import Chat from './views/Chat.jsx'
import V2Legacy from './views/V2Legacy.jsx'

function AppInner() {
  const { authenticated, loading } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('v2theme') || 'light')

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('v2theme', theme)
  }, [theme])

  if (loading) {
    return <div style={{ padding: 32, color: 'var(--text-dim)' }}>A carregar…</div>
  }

  if (!authenticated) {
    return <LoginScreen mainClient={mainClient} />
  }

  return (
    <V2AuthSync>
      <DrawerProvider>
        <div className="app-shell">
          <Sidebar theme={theme} setTheme={setTheme} />
          <main className="app-main">
            <Routes>
              <Route path="/"              element={<Dashboard />} />
              <Route path="/fracoes"       element={<Fracoes />} />
              <Route path="/faturas"       element={<Faturas />} />
              <Route path="/mora"          element={<Mora />} />
              <Route path="/documentos"    element={<Documentos />} />
              <Route path="/energia"       element={<Energia />} />
              <Route path="/seguros"       element={<Seguros />} />
              <Route path="/assembleias"   element={<Assembleias />} />
              <Route path="/comunicacao"   element={<Comunicacao />} />
              <Route path="/inbox"         element={<Inbox />} />
              <Route path="/approvals"     element={<Approvals />} />
              <Route path="/chat"          element={<Chat />} />
              <Route path="/agentes/:slug" element={<Agente />} />
              <Route path="/v2-legacy"     element={<V2Legacy />} />
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </DrawerProvider>
    </V2AuthSync>
  )
}

export default function App() {
  return (
    <AuthProvider mainClient={mainClient} coreClient={coreClient}>
      <AppInner />
    </AuthProvider>
  )
}
