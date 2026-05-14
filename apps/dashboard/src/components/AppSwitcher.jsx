// AppSwitcher — APENAS a lista de Apps no sidebar primário
// Dados de system.apps via useApps (BD-driven)

import * as Icons from 'lucide-react'
import { useApps } from '../hooks/useApps.js'
import { useAppShellStore } from '../store'

const FALLBACK_ICON = Icons.Square

function Ic({ name, size = 16, color = 'var(--text-dim)' }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ color, flexShrink: 0, marginRight: 8 }} />
}

export default function AppSwitcher() {
  const { apps, loading } = useApps()
  const { activeAppSlug, setActiveApp } = useAppShellStore()

  if (loading) {
    return (
      <div style={{ padding: '8px 14px', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
        A carregar apps…
      </div>
    )
  }

  return (
    <>
      <div className="sidebar-section-label">Apps</div>
      {apps.filter(a => a.active).map(app => {
        const isActive = app.slug === activeAppSlug
        return (
          <button
            key={app.slug}
            onClick={() => setActiveApp(app.slug)}
            className={'sidebar-link' + (isActive ? ' active' : '')}
            style={{
              background: 'none', border: 'none', width: '100%',
              textAlign: 'left', cursor: 'pointer', padding: 0,
              font: 'inherit', color: 'inherit',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <Ic name={app.icon} color={isActive ? 'var(--primary)' : 'var(--text-dim)'} />
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: isActive ? 600 : 400,
              }}>{app.label}</span>
            </span>
          </button>
        )
      })}
    </>
  )
}
