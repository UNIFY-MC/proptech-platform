import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useData } from './hooks/useData.js'
import { DrawerProvider } from './context/DrawerContext.jsx'
import Topbar from './components/Topbar.jsx'
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
import ContextPage from './views/ContextPage.jsx'
import InboxUnified from './views/InboxUnified.jsx'
import AppEmbed from './views/AppEmbed.jsx'
import FilesPage from './views/FilesPage.jsx'
import ChatPage from './views/ChatPage.jsx'
import GrowthFunnel from './views/GrowthFunnel.jsx'
import GrowthLeads from './views/GrowthLeads.jsx'
import GrowthOportunidades from './views/GrowthOportunidades.jsx'
import GrowthRules from './views/GrowthRules.jsx'
import DepartmentPage from './views/DepartmentPage.jsx'
import MultiView from './views/MultiView.jsx'
import TasksPage from './views/TasksPage.jsx'
import ConnectionsPage from './views/ConnectionsPage.jsx'
import CalendarPage from './views/CalendarPage.jsx'
import SkillReviewPage from './views/SkillReviewPage.jsx'
import InfluencersPage from './views/InfluencersPage.jsx'
import ApifyActorsPage from './views/ApifyActorsPage.jsx'
import CompetitorsPage from './views/CompetitorsPage.jsx'
import StubView from './views/StubView.jsx'
import { useAppShellStore } from './store'

// Detect se a aplicação está embebida dentro de outra (window.parent !== window).
// Quando assim, renderiza-se sem sidebars (evita recursão visual de app dentro de app).
const IS_EMBEDDED = typeof window !== 'undefined' && window.parent !== window.self

export default function App() {
  const { data, loading, error, lastSync, refresh } = useData()
  const { activeAppSlug } = useAppShellStore()
  const showEmbed = !IS_EMBEDDED && activeAppSlug !== 'dashboard'

  const [theme, setTheme] = useState(() => localStorage.getItem('dashboard-theme') || 'dark')

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('dashboard-theme', theme)
  }, [theme])

  const mainClass = 'app-main' + (showEmbed ? ' embed-mode' : '')

  return (
    <DrawerProvider>
      <div className="app-layout">
        {/* Topbar — navegação global (apps + utilities) */}
        {!IS_EMBEDDED && (
          <Topbar
            theme={theme}
            setTheme={setTheme}
            lastSync={lastSync}
            loading={loading}
            refresh={refresh}
          />
        )}

        {/* Sidebar — navegação contextual dentro da app activa */}
        {!IS_EMBEDDED && (
          <Sidebar
            theme={theme}
            setTheme={setTheme}
            data={data}
            lastSync={lastSync}
            loading={loading}
            refresh={refresh}
          />
        )}

        <main className={mainClass}>
          {error && (
            <div className="error-banner">Erro ao carregar dados: {error}</div>
          )}

          {!data && !error && (
            <div className="loading">A carregar dados do dashboard…</div>
          )}

          {data && showEmbed && <AppEmbed />}

          {data && !showEmbed && (
            <Routes>
              <Route path="/"             element={<Overview data={data} />} />
              <Route path="/inbox"        element={<InboxUnified />} />
              <Route path="/activity"     element={<Activity data={data} />} />
              <Route path="/employees"         element={<EmployeesPage data={data} />} />
              <Route path="/employees/bia"            element={<BiaTaskLauncher />} />
              <Route path="/employees/bia/scorecard"  element={<BiaScorecard />} />
              <Route path="/employees/:slug"  element={<EmployeePage data={data} />} />
              <Route path="/agentes"      element={<Agents data={data} />} />
              <Route path="/roadmap"      element={<Roadmap data={data} />} />
              <Route path="/watchers"     element={<Watchers data={data} />} />
              <Route path="/competitors"        element={<CompetitorsPage />} />
              <Route path="/competitors/legacy" element={<Competitors data={data} />} />
              <Route path="/verticais"    element={<Verticais data={data} />} />
              <Route path="/skills"       element={<SkillsPage data={data} />} />
              <Route path="/recipes"      element={<RecipesPage data={data} />} />
              <Route path="/integrations" element={<IntegrationsPage data={data} />} />
              <Route path="/context"      element={<ContextPage />} />
              <Route path="/chat"         element={<ChatPage />} />
              <Route path="/files"        element={<FilesPage />} />
              <Route path="/growth"              element={<GrowthFunnel />} />
              <Route path="/growth/funnel"       element={<GrowthFunnel />} />
              <Route path="/growth/leads"        element={<GrowthLeads />} />
              <Route path="/growth/oportunidades" element={<GrowthOportunidades />} />
              <Route path="/growth/rules"        element={<GrowthRules />} />
              <Route path="/departments"         element={<DepartmentPage />} />
              <Route path="/departments/:slug"   element={<DepartmentPage />} />
              <Route path="/multiview"           element={<MultiView />} />
              <Route path="/clients"      element={<StubView title="Clients" />} />
              <Route path="/connections"  element={<ConnectionsPage />} />
              <Route path="/calendar"     element={<CalendarPage />} />
              <Route path="/skills/review" element={<SkillReviewPage />} />
              <Route path="/influencers"   element={<InfluencersPage />} />
              <Route path="/apify-actors"  element={<ApifyActorsPage />} />
              <Route path="/projects"     element={<StubView title="Projects" />} />
              <Route path="/tasks"        element={<TasksPage />} />
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
