import { useState } from 'react'
import { useData } from './hooks/useData.js'
import Overview from './components/Overview.jsx'
import Activity from './components/Activity.jsx'
import Agents from './components/Agents.jsx'
import Roadmap from './components/Roadmap.jsx'
import Watchers from './components/Watchers.jsx'

const TABS = ['Overview', 'Actividade', 'Agentes', 'Roadmap', 'Watchers']
const TAB_COMPONENTS = {
  Overview,
  Actividade: Activity,
  Agentes: Agents,
  Roadmap,
  Watchers
}

export default function App() {
  const [tab, setTab] = useState('Overview')
  const { data, loading, error, lastSync, refresh } = useData()

  const ActiveComponent = TAB_COMPONENTS[tab]

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>PropTech Platform</h1>
          <span className="last-sync">
            {lastSync ? `Actualizado ${lastSync}` : 'A carregar…'}
          </span>
        </div>
        <button onClick={refresh} className="btn-refresh" disabled={loading}>
          {loading ? '⏳ A actualizar…' : '🔄 Refresh'}
        </button>
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
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
  )
}
