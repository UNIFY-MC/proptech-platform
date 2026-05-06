import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const TAG_COLORS = {
  CLASSIFICATION: 'var(--primary)',
  MATCHING:       'var(--info)',
  TRIAGE:         'var(--warning)',
  SCORING:        'var(--info)',
  COMPOSE:        'var(--success)',
  EXTRACT:        'var(--info)',
  ESCALATE:       'var(--danger)',
  VISION:         'var(--primary)',
  SIMULATION:     'var(--warning)',
  ACTION:         'var(--success)',
  MANAGE:         'var(--info)',
  MONITOR:        'var(--warning)',
  ALERT:          'var(--warning)',
  AUDIT:          'var(--primary)',
  COMPLIANCE:     'var(--primary)',
  PUBLISH:        'var(--success)',
  ANALYSIS:       'var(--info)',
  GENERATE:       'var(--success)',
  IMPORT:         'var(--info)',
  SYNC:           'var(--success)',
  CORE:           'var(--text-dim)',
}

export default function SkillModal({ skill, onClose }) {
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const tagColor = TAG_COLORS[skill.tag] || 'var(--text-dim)'

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
          borderRadius: 12, maxWidth: 560, width: '100%',
          maxHeight: '80vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <code style={{ flex: 1, fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--info)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skill.id}</code>
          {skill.tag && (
            <span style={{ fontSize: '0.55rem', fontWeight: 700, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 3, background: `${tagColor}18`, color: tagColor, flexShrink: 0 }}>{skill.tag}</span>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-dim)', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>
          {skill.desc && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 18, marginTop: 0 }}>{skill.desc}</p>
          )}

          {/* Used by */}
          {skill.usedBy?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: 8 }}>Used by</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skill.usedBy.map(e => (
                  <button
                    key={e.id}
                    onClick={() => { navigate(`/employees/${e.id}`); onClose() }}
                    style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
                      fontSize: '0.7rem', color: 'var(--text)', fontWeight: 500,
                      transition: 'border-color 0.1s',
                    }}
                    onMouseEnter={e2 => e2.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={e2 => e2.currentTarget.style.borderColor = 'var(--border)'}
                  >{e.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Spec placeholder */}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
            Detailed skill specification em construção
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 16px', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text)' }}
          >Close</button>
        </div>
      </div>
    </div>
  )
}
