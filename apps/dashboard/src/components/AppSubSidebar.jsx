// AppSubSidebar — Sidebar secundária (2ª coluna)
// Mostra Sections + Routes da app activa quando embed=true.
// Aparece à direita do sidebar primário; iframe fica na 3ª coluna.

import * as Icons from 'lucide-react'
import { useApps } from '../hooks/useApps.js'
import { useAppShellStore } from '../store'

const FALLBACK_ICON = Icons.Square

function Ic({ name, size = 16, color = 'var(--text-dim)' }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ color, flexShrink: 0, marginRight: 8 }} />
}

export default function AppSubSidebar() {
  const { apps, sectionsFor, loading } = useApps()
  const { activeAppSlug, activePath, setActivePath } = useAppShellStore()
  const app = apps.find(a => a.slug === activeAppSlug)

  if (loading || !app || !app.embed) return null

  const sections = sectionsFor(app.slug)

  return (
    <aside className="app-subsidebar">
      {/* Brand da app */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic name={app.icon} size={14} color="var(--primary)" />
          <span>{app.label}</span>
        </div>
        <div className="sidebar-brand-sub">
          {import.meta.env.DEV ? app.dev_url : (app.prod_url || 'sem prod URL')}
        </div>
      </div>

      {/* Nav routes */}
      <div className="sidebar-nav">
        {sections.length === 0 && (
          <div style={{ padding: '12px 14px', fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Sem routes em <code style={{ fontFamily: 'monospace' }}>system.app_routes</code> para esta app.
          </div>
        )}

        {sections.map((sec, idx) => (
          <div key={`${app.slug}-${sec.label ?? 'default'}-${idx}`}>
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
      </div>
    </aside>
  )
}
