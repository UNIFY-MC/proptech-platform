import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const TRIGGER_STYLES = {
  event:    { bg: 'rgba(59,130,246,0.12)',  color: 'var(--info)',     label: 'EVENT'  },
  schedule: { bg: 'rgba(16,185,129,0.12)', color: 'var(--success)',  label: 'CRON'   },
  manual:   { bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)',  label: 'MANUAL' },
}

export default function RecipeModal({ recipe, onClose }) {
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const ts = TRIGGER_STYLES[recipe.trigger] || TRIGGER_STYLES.manual

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 12, maxWidth: 520, width: '100%',
          maxHeight: '80vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <code style={{ flex: 1, fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.id}</code>
          <span style={{
            fontSize: '0.55rem', fontWeight: 700, fontFamily: 'monospace',
            padding: '2px 6px', borderRadius: 3,
            background: ts.bg, color: ts.color, flexShrink: 0,
          }}>{ts.label}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-dim)', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>
          {recipe.trigger_label && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: 6 }}>Trigger</div>
              <code style={{
                display: 'block', fontSize: '0.72rem', fontFamily: 'monospace',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '6px 10px', color: ts.color,
              }}>{recipe.trigger_label}</code>
            </div>
          )}

          <p style={{ fontSize: 14, color: 'var(--text-dim)', fontStyle: recipe.desc ? 'normal' : 'italic', lineHeight: 1.6, marginBottom: 18, marginTop: 0 }}>
            {recipe.desc || 'Sem descrição registada em .meta.json'}
          </p>

          {/* Owner */}
          {recipe.ownerName && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: 8 }}>Owner</div>
              <button
                onClick={() => { navigate(`/employees/${recipe.ownerId}`); onClose() }}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
                  fontSize: '0.7rem', color: 'var(--text)', fontWeight: 500,
                  transition: 'border-color 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >{recipe.ownerName}</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 16px', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text)' }}
          >Close</button>
        </div>
      </div>
    </div>
  )
}
