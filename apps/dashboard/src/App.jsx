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
import Verticais from './components/Verticais.jsx'
import InboxView from './views/InboxView.jsx'
import ApprovalsView from './views/ApprovalsView.jsx'
import EmployeesPage from './views/EmployeesPage.jsx'
import EmployeePage from './views/EmployeePage.jsx'
import BiaScorecard from './views/BiaScorecard.jsx'
import BiaTaskLauncher from './views/BiaTaskLauncher.jsx'
import SkillsPage from './views/SkillsPage.jsx'
import RecipesPage from './views/RecipesPage.jsx'
import IntegrationsPage from './views/IntegrationsPage.jsx'
import StubView from './views/StubView.jsx'

export default function App() {
  const { data, loading, error, lastSync, refresh } = useData()

  const [theme, setTheme] = useState(() => localStorage.getItem('dashboard-theme') || 'dark')

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('dashboard-theme', theme)
  }, [theme])

  return (
    <DrawerProvider>
      <div className="app-layout">
        <Sidebar
          theme={theme}
          setTheme={setTheme}
          data={data}
          lastSync={lastSync}
          loading={loading}
          refresh={refresh}
        />

        <main className="app-main">
          {error && (
            <div className="error-banner">Erro ao carregar dados: {error}</div>
          )}

          {!data && !error && (
            <div className="loading">A carregar dados do dashboard…</div>
          )}

          {data && (
            <Routes>
              <Route path="/"             element={<Overview data={data} />} />
              <Route path="/inbox"        element={<Activity data={data} />} />
              <Route path="/employees"         element={<EmployeesPage data={data} />} />
              <Route path="/employees/bia"            element={<BiaTaskLauncher />} />
              <Route path="/employees/bia/scorecard"  element={<BiaScorecard />} />
              <Route path="/employees/:slug"  element={<EmployeePage data={data} />} />
              <Route path="/agentes"      element={<Agents data={data} />} />
              <Route path="/roadmap"      element={<Roadmap data={data} />} />
              <Route path="/watchers"     element={<Watchers data={data} />} />
              <Route path="/competitors"  element={<Competitors data={data} />} />
              <Route path="/verticais"    element={<Verticais data={data} />} />
              <Route path="/skills"       element={<SkillsPage data={data} />} />
              <Route path="/recipes"      element={<RecipesPage data={data} />} />
              <Route path="/integrations" element={<IntegrationsPage data={data} />} />
              <Route path="/chat"         element={<StubView title="Chat" />} />
              <Route path="/files"        element={<StubView title="Files" />} />
              <Route path="/clients"      element={<StubView title="Clients" />} />
              <Route path="/projects"     element={<StubView title="Projects" />} />
              <Route path="/tasks"        element={<StubView title="Tasks" />} />
              {/* Legacy live views */}
              <Route path="/live-inbox"   element={<InboxView />} />
              <Route path="/approvals"    element={<ApprovalsView />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </DrawerProvider>
  )
}
