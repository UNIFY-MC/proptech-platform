import { useState, useEffect } from 'react'
import { useData } from './hooks/useData.js'
import { DrawerProvider } from './context/DrawerContext.jsx'
import Overview from './components/Overview.jsx'
import Activity from './components/Activity.jsx'
import Agents from './components/Agents.jsx'
import Roadmap from './components/Roadmap.jsx'
import Watchers from './components/Watchers.jsx'
import Competitors from './components/Competitors.jsx'

const TABS = ['Overview', 'Roadmap', 'Watchers', 'Competitors', 'Actividade', 'Agentes']

const TAB_COMPONENTS = {
  Overview,
  Roadmap,
  Watchers,
  Competitors,
  Actividade: Activity,
  Agentes: Agents,
}

function tabLabel(name, data) {
  if (!data) return name
  const counts = {
    'Roadmap':     data.roadmap?.length,
    'Watchers':    data.watchers?.filter(w => w.status !== 'never').length,
    'Competitors': data.competitors?.length,
    'Actividade':  data.recentActivity?.length,
    'Agentes':     data.agents?.length,
  }
  const c = counts[name]
  return (c && c > 0) ? `${name} · ${c}` : name
}

export default function App() {
  const [tab, setTab] = useState('Overview')
  const { data, loading, error, lastSync, refresh } = useData()

  const [theme, setTheme] = useState(() => localStorage.getItem('dashboard-theme') || 'dark')

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('dashboard-theme', theme)
  }, [theme])

  const ActiveComponent = TAB_COMPONENTS[tab]

  return (
    <DrawerProvider>
      <div className="app">
        <header className="app-header">
          <div>
            <h1>PropTech Platform</h1>
            <span className="last-sync">
              {lastSync ? `Actualizado ${lastSync}` : 'A carregar…'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="btn-theme"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={refresh} className="btn-refresh" disabled={loading}>
              {loading ? '⏳ A actualizar…' : '🔄 Refresh'}
            </button>
          </div>
        </header>

        <nav className="tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {tabLabel(t, data)}
            </button>
          ))}
        </nav>

        <main className="content">
          {error && (
            <div className="error-banner">
              Erro ao carregar dados: {error}
            </div>
          )}
          {!data && !error && (
            <div className="loading">A carregar dados do dashboard…</div>
          )}
          {data && <ActiveComponent data={data} />}
        </main>
      </div>
    </DrawerProvider>
  )
}
