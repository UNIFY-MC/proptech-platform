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
import Stub from './views/Stub.jsx'

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
              <Route path="/"             element={<Dashboard />} />
              <Route path="/fracoes"      element={<Fracoes />} />
              <Route path="/faturas"      element={<Stub title="Faturas / OCR"  hint="Lista de faturas pendentes + faturas_ocr. Liga edge fn ocr-fatura quando importarmos dados." />} />
              <Route path="/mora"         element={<Stub title="Mora"           hint="Lista de mora >7d / >30d / >60d. Requer tabela orcamentos (a criar pelo supabase-designer)." />} />
              <Route path="/documentos"   element={<Stub title="Documentos"     hint="Registo central — escrita só pelo agente docs-condo (Dora)." />} />
              <Route path="/energia"      element={<Stub title="EV / Energia"   hint="carregadores_contagens — leituras mensais via energia-condo (Enzo)." />} />
              <Route path="/seguros"      element={<Stub title="Seguros"        hint="seguro_fracoes — apólices individuais por fracção." />} />
              <Route path="/assembleias"  element={<Stub title="Assembleias"    hint="Convocatórias (mínimo legal 10 dias Art. 1431º CC) + atas + deliberações em JSONB." />} />
              <Route path="/comunicacao"  element={<Stub title="Comunicação"    hint="Registo imutável de comunicações enviadas — prova legal de envio." />} />
              <Route path="/inbox"        element={<Stub title="Inbox"          hint="system.inbox_items filtrado por vertical=v2. Realtime via Supabase." />} />
              <Route path="/approvals"    element={<Stub title="Approvals"      hint="system.approvals_queue filtrado por target_vertical=v2. Botão único de aprovação." />} />
              <Route path="/chat"         element={<Stub title="Chat com agentes" hint="Composer escreve em system.inbox_items com source=chat — orquestrador-condo roteia." />} />
              <Route path="/agentes/:slug" element={<Stub title="Agente"        hint="EmployeePage do agente — skills, recipes, instructions. Reutiliza padrão CookAI do apps/dashboard." />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
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
