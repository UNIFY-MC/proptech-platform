// SurfaceCard — 1 slot do Multi-Surface Viewer
// Header (label + viewport selector + reload + frame toggle + close)
// Body (iframe via /embed/<slug> ou ComingSoonSurface)

import { ExternalLink, RefreshCw, X, Maximize2 } from 'lucide-react'
import * as Icons from 'lucide-react'
import DeviceFrame, { deviceKindFor } from './DeviceFrame.jsx'
import ComingSoonSurface from './ComingSoonSurface.jsx'
import { VIEWPORTS, viewportFor, surfaceFor, roleFor } from '../lib/surfaces.js'

const FALLBACK_ICON = Icons.Square
function AppIcon({ name, size = 13, color }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ color }} />
}

export default function SurfaceCard({ slot, app, reloadKey, onRemove, onUpdate, onReload }) {
  if (!app) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px dashed var(--border)',
        borderRadius: 8,
        padding: 20,
        color: 'var(--text-dim)',
        fontSize: '0.75rem',
        textAlign: 'center',
      }}>
        App não encontrada: <code>{slot.slug}</code>
        <button onClick={onRemove} style={{
          display: 'block',
          margin: '10px auto 0',
          background: 'none',
          border: '1px solid var(--border)',
          color: 'var(--text-dim)',
          padding: '4px 10px',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: '0.7rem',
        }}>Remover</button>
      </div>
    )
  }

  const vp = viewportFor(slot.viewport)
  const r = roleFor(app.role)
  const sf = surfaceFor(app.surface)
  const useFrame = slot.deviceFrame !== false
  const kind = deviceKindFor(app.surface)

  const targetUrl = import.meta.env.DEV
    ? `/embed/${app.slug}`
    : (app.prod_url || app.dev_url || '')

  return (
    <div className="surface-card">
      <div className="surface-card-header">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <AppIcon name={app.icon} color={r?.color} />
          <span className="surface-card-title">{app.label}</span>
        </span>
        <span style={{
          fontSize: '0.55rem',
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-dim)',
          marginLeft: 'auto',
          marginRight: 6,
        }}>
          {sf?.label || app.surface}{app.role ? ` · ${r?.label || app.role}` : ''}
        </span>

        <select
          value={slot.viewport}
          onChange={(e) => onUpdate({ viewport: e.target.value })}
          className="surface-card-viewport"
          title="Viewport"
        >
          {Object.values(VIEWPORTS).map(v => (
            <option key={v.id} value={v.id}>{v.label} {v.width}×{v.height}</option>
          ))}
        </select>

        <button
          onClick={() => onUpdate({ deviceFrame: !useFrame })}
          className={'surface-card-btn' + (useFrame ? ' active' : '')}
          title={useFrame ? 'Esconder chrome do device' : 'Mostrar chrome do device'}
        >
          <Maximize2 size={11} />
        </button>

        <button onClick={onReload} className="surface-card-btn" title="Recarregar">
          <RefreshCw size={11} />
        </button>

        <a
          href={app.prod_url || app.dev_url || '#'}
          target="_blank" rel="noreferrer"
          className="surface-card-btn"
          title="Abrir em nova janela"
        ><ExternalLink size={11} /></a>

        <button onClick={onRemove} className="surface-card-btn" title="Remover slot">
          <X size={11} />
        </button>
      </div>

      <div className="surface-card-body">
        {app.coming_soon ? (
          <div style={{ width: vp.width, height: vp.height, maxWidth: '100%' }}>
            <ComingSoonSurface app={app} compact />
          </div>
        ) : useFrame ? (
          <DeviceFrame kind={kind} width={vp.width} height={vp.height}>
            <iframe
              key={`${app.slug}::${reloadKey || 0}`}
              src={targetUrl}
              title={app.label}
              style={{ width: vp.width, height: vp.height, border: 'none', display: 'block' }}
            />
          </DeviceFrame>
        ) : (
          <iframe
            key={`${app.slug}::${reloadKey || 0}`}
            src={targetUrl}
            title={app.label}
            style={{ width: vp.width, height: vp.height, border: '1px solid var(--border)', borderRadius: 4, display: 'block', maxWidth: '100%' }}
          />
        )}
      </div>
    </div>
  )
}
