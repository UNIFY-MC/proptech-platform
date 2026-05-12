// AppSwitcher — secção topo do Sidebar com lista de apps + items da app activa
// Dados de system.apps + system.app_routes via useApps (BD-driven)

import { NavLink } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { useApps } from '../hooks/useApps.js'
import { useAppShellStore } from '../store'

const FALLBACK_ICON = Icons.Square

function Ic({ name, size = 16, color = 'var(--text-dim)' }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ color, flexShrink: 0, marginRight: 8 }} />
}

export default function AppSwitcher() {
  const { apps, sectionsFor, loading } = useApps()
  const { activeAppSlug, setActiveApp, activePath, setActivePath } = useAppShellStore()
  const activeApp = apps.find(a => a.slug === activeAppSlug)

  if (loading) {
    return (
      <div style={{ padding: '12px 14px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
        A carregar apps…
      </div>
    )
  }

  return (
    <>
      {/* Topo — switcher de apps */}
      <div className="sidebar-section-label">Apps</div>
      {apps.map(app => {
        const isActive = app.slug === activeAppSlug
        return (
          <button
            key={app.slug}
            onClick={() => setActiveApp(app.slug)}
            className={'sidebar-link' + (isActive ? ' active' : '')}
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <Ic name={app.icon} color={isActive ? 'var(--primary)' : 'var(--text-dim)'} />
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: isActive ? 600 : 400,
              }}>{app.label}</span>
            </span>
            {!app.embed && (
              <span style={{
                fontSize: '0.52rem', fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-dim)', marginLeft: 6,
              }}>SPA</span>
            )}
            {app.embed && (
              <span style={{
                fontSize: '0.52rem', fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-dim)', marginLeft: 6,
              }}>IFRAME</span>
            )}
          </button>
        )
      })}

      {/* Routes da app activa (só para embed=true) */}
      {activeApp && activeApp.embed && (
        <>
          {sectionsFor(activeApp.slug).map((sec, idx) => (
            <div key={`${activeApp.slug}-${sec.label ?? 'default'}-${idx}`}>
              {sec.label && <div className="sidebar-section-label">{sec.label}</div>}
              {sec.routes.map(r => {
                const isActiveRoute = r.path === activePath
                return (
                  <button
                    key={r.id}
                    onClick={() => setActivePath(r.path)}
                    className={'sidebar-link' + (isActiveRoute ? ' active' : '')}
                    style={{
                      background: 'none', border: 'none', width: '100%',
                      textAlign: 'left', cursor: 'pointer', padding: 0,
                      font: 'inherit', color: 'inherit',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <Ic name={r.icon} />
                      <span style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{r.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </>
      )}
    </>
  )
}
