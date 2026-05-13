// ComingSoonSurface — placeholder uniforme para apps em planeamento (coming_soon=true)
// Aparece em AppEmbed (full bleed) ou dentro de SurfaceCard (mini)

import * as Icons from 'lucide-react'
import { Clock } from 'lucide-react'
import { roleFor, surfaceFor } from '../lib/surfaces.js'

const FALLBACK_ICON = Icons.Sparkles

export default function ComingSoonSurface({ app, compact }) {
  if (!app) return null
  const Comp = (app.icon && Icons[app.icon]) || FALLBACK_ICON
  const r = roleFor(app.role)
  const sf = surfaceFor(app.surface)

  const padding = compact ? '20px 16px' : '40px'
  const iconSize = compact ? 32 : 56
  const titleSize = compact ? '0.95rem' : '1.4rem'

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding,
      background: 'var(--bg)',
      textAlign: 'center',
      gap: compact ? 8 : 14,
    }}>
      <div style={{
        width: iconSize + 28,
        height: iconSize + 28,
        borderRadius: 16,
        background: `${r?.color || '#534AB7'}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Comp size={iconSize} style={{ color: r?.color || 'var(--primary)' }} />
      </div>

      <div>
        <h3 style={{
          fontSize: titleSize,
          fontWeight: 700,
          margin: 0,
          color: 'var(--text)',
        }}>{app.label}</h3>
        <div style={{
          marginTop: 4,
          fontSize: '0.7rem',
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          justifyContent: 'center',
        }}>
          <span>{sf?.label || app.surface}</span>
          {app.role && <span>·</span>}
          {app.role && <span>{r?.label || app.role}</span>}
        </div>
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        background: 'rgba(245,158,11,0.12)',
        color: 'var(--warning)',
        borderRadius: 16,
        fontSize: '0.7rem',
        fontWeight: 600,
      }}>
        <Clock size={12} /> Em construção
      </div>

      {!compact && (
        <p style={{
          maxWidth: 360,
          fontSize: '0.78rem',
          color: 'var(--text-dim)',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Esta surface ainda não tem deploy.
          Aparece no catálogo para planeamento — adiciona à roadmap quando estiver pronta para construção.
        </p>
      )}
    </div>
  )
}
