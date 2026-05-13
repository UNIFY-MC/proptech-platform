import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@proptech/auth'
import { DrawerProvider } from '@proptech/ui/DrawerContext'
import { useGrowthPixel } from '@proptech/growth-pixel/hook'
import { YearProvider } from './context/YearContext.jsx'
import { mainClient, coreClient } from './lib/clients.js'
import V2AuthSync from './lib/V2AuthSync.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Inicio from './views/Inicio.jsx'
import PrestacaoContas from './views/PrestacaoContas.jsx'
import Fracoes from './views/Fracoes.jsx'
import Mora from './views/Mora.jsx'
import Faturas from './views/Faturas.jsx'
import Documentos from './views/Documentos.jsx'
import Energia from './views/Energia.jsx'
import Seguros from './views/Seguros.jsx'
import Assembleias from './views/Assembleias.jsx'
import Comunicacao from './views/Comunicacao.jsx'
import Recebimentos from './views/Recebimentos.jsx'
import Bancos from './views/Bancos.jsx'
import Condominos from './views/Condominos.jsx'
import MapaReceitas from './views/MapaReceitas.jsx'
import PortalCondomino from './views/PortalCondomino.jsx'
import Automacoes from './views/Automacoes.jsx'
import Permissoes from './views/Permissoes.jsx'
import Agente from './views/Agente.jsx'
import Inbox from './views/Inbox.jsx'
import Approvals from './views/Approvals.jsx'
import Chat from './views/Chat.jsx'
import V2Legacy from './views/V2Legacy.jsx'

function AppInner() {
  const { authenticated, loading } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('v2theme') || 'dark')

  // Growth pixel — tracka pageviews + form submits cross-vertical (ADR-015)
  useGrowthPixel({ vertical: 'v2', autoPageview: true, autoForms: false })

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('v2theme', theme)
  }, [theme])

  if (loading) {
    return <div style={{ padding: 32, color: 'var(--mu)' }}>A carregar…</div>
  }

  if (!authenticated) {
    return <LoginScreen mainClient={mainClient} />
  }

  return (
    <V2AuthSync>
      <DrawerProvider>
       <YearProvider>
        <div className="app-shell">
          <Sidebar theme={theme} setTheme={setTheme} />
          <div className="app-main-wrap">
            <Topbar />
            <main className="app-main">
              <Routes>
                <Route path="/"                    element={<Inicio />} />
                <Route path="/prestacao-contas"    element={<PrestacaoContas />} />
                <Route path="/dividas-2025"        element={<Mora />} />
                <Route path="/divida-actual-2026"  element={<Mora />} />
                <Route path="/recebimentos"        element={<Recebimentos />} />
                <Route path="/bancos"              element={<Bancos />} />
                <Route path="/condominos"          element={<Condominos />} />
                <Route path="/fracoes"             element={<Fracoes />} />
                <Route path="/faturas"             element={<Faturas />} />
                <Route path="/mapa-receitas"       element={<MapaReceitas />} />
                <Route path="/documentos"          element={<Documentos />} />
                <Route path="/portal-condomino"    element={<PortalCondomino />} />
                <Route path="/automacoes"          element={<Automacoes />} />
                <Route path="/permissoes"          element={<Permissoes />} />
                <Route path="/energia"             element={<Energia />} />
                <Route path="/seguros"             element={<Seguros />} />
                <Route path="/assembleias"         element={<Assembleias />} />
                <Route path="/comunicacao"         element={<Comunicacao />} />
                <Route path="/inbox"               element={<Inbox />} />
                <Route path="/approvals"           element={<Approvals />} />
                <Route path="/chat"                element={<Chat />} />
                <Route path="/agentes/:slug"       element={<Agente />} />
                <Route path="/v2-legacy"           element={<V2Legacy />} />
                <Route path="*"                    element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
       </YearProvider>
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
