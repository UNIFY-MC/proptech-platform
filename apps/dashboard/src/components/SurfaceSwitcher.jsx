// SurfaceSwitcher — pílulas para alternar entre surfaces da mesma vertical
// Aparece na toolbar do AppEmbed quando a vertical tem >1 surface

import { Clock } from 'lucide-react'
import { useAppShellStore } from '../store'
import { appsByVertical } from '../hooks/useApps.js'
import { roleFor } from '../lib/surfaces.js'

export default function SurfaceSwitcher({ apps, currentApp }) {
  const setActiveApp = useAppShellStore(s => s.setActiveApp)
  if (!currentApp?.vertical) return null

  const siblings = appsByVertical(apps, currentApp.vertical)
  if (siblings.length <= 1) return null

  return (
    <div style={{
      display: 'inline-flex',
      gap: 2,
      padding: 2,
      background: 'var(--bg-elevated)',
      borderRadius: 5,
    }}>
      {siblings.map(s => {
        const r = roleFor(s.role)
        const active = s.slug === currentApp.slug
        return (
          <button
            key={s.slug}
            onClick={() => setActiveApp(s.slug)}
            title={s.label + (s.coming_soon ? ' (em construção)' : '')}
            style={{
              background: active ? 'var(--bg-card)' : 'none',
              border: 'none',
              padding: '3px 8px',
              borderRadius: 3,
              cursor: 'pointer',
              color: active ? (r?.color || 'var(--primary)') : 'var(--text-dim)',
              fontSize: '0.62rem',
              fontWeight: active ? 700 : 500,
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              opacity: s.coming_soon ? 0.55 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {r?.label || s.role}
            {s.coming_soon && <Clock size={9} />}
          </button>
        )
      })}
    </div>
  )
}
