import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useData } from './hooks/useData.js'
import { DrawerProvider } from './context/DrawerContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Overview from './components/Overview.jsx'
import Activity from './components/Activity.jsx'
import Agents from './components/Agents.jsx'
import Roadmap from './components/Roadmap.jsx'
import Watchers from './components/Watchers.jsx'
import Competitors from './components/Competitors.jsx'
import InboxView from './views/InboxView.jsx'
import ApprovalsView from './views/ApprovalsView.jsx'
import BiaPlaceholder from './views/BiaPlaceholder.jsx'
import AuthGuard from './components/AuthGuard.jsx'
import LoginView from './views/LoginView.jsx'

export default function App() {
  const { data, error } = useData()

  const [theme, setTheme] = useState(
    () => localStorage.getItem('dashboard-theme') || 'dark'
  )

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('dashboard-theme', theme)
  }, [theme])

  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route
        path="*"
        element={
          <AuthGuard>
            <DrawerProvider>
              <div className="layout">
                <Sidebar theme={theme} setTheme={setTheme} data={data} />
                <main className="main-content">
                  {error && (
                    <div className="error-banner">
                      Erro ao carregar dados: {error}
                    </div>
                  )}
                  <Routes>
                    <Route path="/" element={<Navigate to="/inbox" replace />} />
                    <Route path="/inbox" element={<InboxView />} />
                    <Route path="/approvals" element={<ApprovalsView />} />
                    <Route path="/overview" element={<Overview data={data} />} />
                    <Route path="/roadmap" element={<Roadmap data={data} />} />
                    <Route path="/watchers" element={<Watchers data={data} />} />
                    <Route path="/competitors" element={<Competitors data={data} />} />
                    <Route path="/activity" element={<Activity data={data} />} />
                    <Route path="/agents" element={<Agents data={data} />} />
                    <Route path="/employees/bia" element={<BiaPlaceholder />} />
                    <Route
                      path="*"
                      element={
                        <div style={{ padding: '2rem' }}>
                          <h2>404</h2>
                        </div>
                      }
                    />
                  </Routes>
                </main>
              </div>
            </DrawerProvider>
          </AuthGuard>
        }
      />
    </Routes>
  )
}
