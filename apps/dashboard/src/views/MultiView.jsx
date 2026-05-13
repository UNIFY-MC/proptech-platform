// MultiView — vista helicóptero com N iframes em mosaico
// Configurável (escolhe quais surfaces + viewport) e persistente
// Default arranca com V5 Cliente + V5 Staff + V5 Prestador

import { useState } from 'react'
import * as Icons from 'lucide-react'
import { Plus, Smartphone, Monitor, RotateCcw, X } from 'lucide-react'
import { useApps } from '../hooks/useApps.js'
import { useMultiViewStore } from '../hooks/useMultiViewStore.js'
import { surfaceFor, roleFor, defaultViewportFor } from '../lib/surfaces.js'
import SurfaceCard from '../components/SurfaceCard.jsx'

const FALLBACK_ICON = Icons.Square
function AppIcon({ name, size = 14, color }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ color }} />
}

function AddSurfaceModal({ apps, onPick, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 20,
        width: 480,
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Adicionar surface</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
          }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {apps.filter(a => a.vertical).map(a => {
            const r = roleFor(a.role)
            const sf = surfaceFor(a.surface)
            return (
              <button
                key={a.slug}
                onClick={() => onPick(a)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text)',
                  opacity: a.coming_soon ? 0.6 : 1,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <AppIcon name={a.icon} color={r?.color} size={16} />
                <span style={{ flex: 1, fontSize: '0.8rem' }}>{a.label}</span>
                <span style={{
                  fontSize: '0.6rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-dim)',
                }}>{sf?.label}{a.role ? ` · ${r?.label || a.role}` : ''}</span>
                {a.coming_soon && (
                  <span style={{
                    fontSize: '0.55rem',
                    color: 'var(--warning)',
                    fontWeight: 600,
                  }}>soon</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function MultiView() {
  const { apps } = useApps()
  const { slots, filter, reloadKeys, addSlot, removeSlot, updateSlot, reloadSlot, setFilter, reset } = useMultiViewStore()
  const [modalOpen, setModalOpen] = useState(false)

  const visibleSlots = slots.filter(s => {
    if (filter === 'all') return true
    const app = apps.find(a => a.slug === s.slug)
    if (!app) return false
    if (filter === 'phones')   return app.surface === 'mobile_web' || app.surface?.startsWith('mobile_native')
    if (filter === 'desktops') return app.surface === 'desktop_web'
    return true
  })

  function onPick(app) {
    addSlot({
      slug: app.slug,
      viewport: defaultViewportFor(app.surface),
      deviceFrame: true,
    })
    setModalOpen(false)
  }

  return (
    <div style={{ padding: '4px 4px 80px' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        padding: '4px 8px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
            Multi-Surface Viewer
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {visibleSlots.length}/{slots.length} surfaces visíveis · helicópter view do produto
          </p>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-elevated)', borderRadius: 6 }}>
          {[
            { id: 'all',      label: 'All' },
            { id: 'phones',   label: 'Phones',   icon: Smartphone },
            { id: 'desktops', label: 'Desktops', icon: Monitor },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? 'var(--bg-card)' : 'none',
                border: 'none',
                padding: '5px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                color: filter === f.id ? 'var(--primary)' : 'var(--text-dim)',
                fontSize: '0.7rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {f.icon && <f.icon size={11} />}
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: 'var(--primary)',
            border: 'none',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: '0.72rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Plus size={12} /> Surface
        </button>

        <button
          onClick={reset}
          title="Reset para default"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: 'var(--text-dim)',
            padding: '5px 8px',
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: '0.7rem',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        ><RotateCcw size={11} /></button>
      </div>

      {/* Grid de slots */}
      {visibleSlots.length === 0 ? (
        <div style={{
          padding: 60,
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.85rem',
          background: 'var(--bg-card)',
          border: '1px dashed var(--border)',
          borderRadius: 8,
        }}>
          Sem surfaces visíveis. Adiciona uma com o botão "+ Surface".
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-start',
        }}>
          {visibleSlots.map(slot => {
            const app = apps.find(a => a.slug === slot.slug)
            return (
              <SurfaceCard
                key={slot.id}
                slot={slot}
                app={app}
                reloadKey={reloadKeys[slot.id] || 0}
                onUpdate={(patch) => updateSlot(slot.id, patch)}
                onReload={() => reloadSlot(slot.id)}
                onRemove={() => removeSlot(slot.id)}
              />
            )
          })}
        </div>
      )}

      {modalOpen && (
        <AddSurfaceModal
          apps={apps}
          onPick={onPick}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
