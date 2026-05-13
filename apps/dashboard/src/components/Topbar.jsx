// Topbar — navegação global 2D do dashboard
// Esquerda: brand + tabs de apps (Dashboard / V2 / V4 / V5)
// Direita: vertical filter + notif + theme + sync + profile placeholder
//
// Click numa tab muda activeAppSlug (useAppShellStore); o AppEmbed encarrega-se
// do iframe quando slug !== 'dashboard'.

import * as Icons from 'lucide-react'
import { Bell, Search, Sun, Moon, User } from 'lucide-react'
import { useApps } from '../hooks/useApps.js'
import { useInboxItems } from '../hooks/useSupabase.js'
import { useInboxReads } from '../hooks/useInboxReads.js'
import { useVerticalStore, useAppShellStore } from '../store'

const FALLBACK_ICON = Icons.Square

function AppIcon({ name, size = 14 }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ flexShrink: 0 }} />
}

function AppTab({ app, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={'topbar-tab' + (isActive ? ' active' : '')}
      title={app.label}
    >
      <AppIcon name={app.icon} />
      <span>{app.label}</span>
    </button>
  )
}

export default function Topbar({ theme, setTheme, lastSync, loading, refresh }) {
  const { apps } = useApps()
  const { activeAppSlug, setActiveApp } = useAppShellStore()
  const { activeVertical, setVertical } = useVerticalStore()
  const { items } = useInboxItems(activeVertical)
  const { readSet } = useInboxReads()
  const unread = items.filter(i => !readSet.has(i.id)).length

  const isDashboard = activeAppSlug === 'dashboard'
  const appList = apps.filter(a => a.active)

  return (
    <header className="app-topbar">
      {/* Brand */}
      <div className="topbar-brand">
        <span className="topbar-brand-title">PropTech</span>
      </div>

      <div className="topbar-divider" />

      {/* App tabs */}
      <nav className="topbar-tabs">
        {appList.map(app => (
          <AppTab
            key={app.slug}
            app={app}
            isActive={app.slug === activeAppSlug}
            onClick={() => setActiveApp(app.slug)}
          />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Right cluster — só aparece em dashboard mode (em apps embedded
          a own topbar das apps faz o controlo) */}
      {isDashboard && (
        <>
          <select
            className="topbar-vertical-select"
            value={activeVertical}
            onChange={(e) => setVertical(e.target.value)}
            title="Filtrar por vertical"
          >
            <option value="all">Todas verticais</option>
            <option value="V1">V1 Core</option>
            <option value="V2">V2 Condomínios</option>
            <option value="V3">V3 Seguros</option>
            <option value="V4">V4 Energia</option>
            <option value="V5">V5 Manutenção</option>
          </select>

          <button className="topbar-icon-btn" title="Pesquisar (em breve)">
            <Search size={15} />
          </button>

          <a href="/inbox" className="topbar-icon-btn" title={`${unread} não lidos`} style={{ position: 'relative' }}>
            <Bell size={15} />
            {unread > 0 && <span className="topbar-badge">{unread}</span>}
          </a>

          <button
            className="topbar-icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            className="topbar-icon-btn"
            onClick={refresh}
            disabled={loading}
            title="Recarregar dados"
          >
            {loading ? '⏳' : '↻'}
          </button>

          {lastSync && (
            <span className="topbar-sync" title="Última sync">
              {String(lastSync).slice(11, 19)}
            </span>
          )}

          <button className="topbar-icon-btn" title="Perfil (em breve)">
            <User size={15} />
          </button>
        </>
      )}
    </header>
  )
}
