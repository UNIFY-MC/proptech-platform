// EmployeeHeader — generalizado de BiaHeader
// Aceita `profile` (system.agent_profile row) + `isEditing`
// Retrocompat: se profile.agent_id === 'bia', comportamento idêntico ao original

import { useNavigate } from 'react-router-dom'

const KIND_BADGE = {
  persona: { label: 'PERSONA', color: '#a78bfa', bg: 'rgba(124,58,237,0.12)' },
  condo:   { label: 'CONDO',   color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
  system:  { label: 'SYSTEM',  color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
}

export default function EmployeeHeader({ profile, isEditing }) {
  const navigate   = useNavigate()
  const p          = profile || {}
  const modelShort = p.model?.replace('claude-', '') || '—'
  const kindMeta   = KIND_BADGE[p.kind] || KIND_BADGE.persona

  return (
    <div className={`bsc-header${isEditing ? ' editing' : ''}`}>
      <button className="bsc-back" onClick={() => navigate(-1)} title="Voltar">←</button>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className="bsc-avatar" style={{ overflow: 'hidden', padding: 0 }}>
          {p.avatar_url
            ? <img src={p.avatar_url} alt={p.name}
                   style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                {p.name?.[0] || '?'}
              </span>}
        </div>
        {/* dot status */}
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 12, height: 12, borderRadius: '50%',
          background: p.status === 'active' ? '#10b981' : p.status === 'planned' ? '#f59e0b' : '#6b7280',
          border: '2px solid var(--bg)',
        }} />
      </div>

      <div className="bsc-title-group">
        <div className="bsc-title-row">
          <span className="bsc-name">{p.name || p.agent_id}</span>
          {/* Kind badge */}
          <span style={{
            marginLeft: 8, padding: '2px 7px', borderRadius: 4,
            fontSize: '0.55rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            background: kindMeta.bg, color: kindMeta.color,
          }}>{kindMeta.label}</span>
        </div>
        <div className="bsc-desc-row">
          {p.role || '—'} · {p.tagline || p.vertical || '—'}
        </div>
        <div className="bsc-subline">
          <span><b style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Model:</b> <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85em', color: 'var(--text)' }}>{modelShort}</code></span>
          <span className="sep">·</span>
          <span><b style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Replies:</b> <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85em', color: 'var(--text)' }}>{p.replies_label || 'Human approval'}</code></span>
          <span className="sep">·</span>
          <span><b style={{ fontWeight: 600, color: 'var(--text-dim)' }}>v</b><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85em' }}>{p.version || '1.0'}</code></span>
          <span className="sep">·</span>
          <span><b style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Last check:</b> —</span>
        </div>
      </div>

      <div className="bsc-right">
        <span className={`bsc-status-pill ${isEditing ? 'editing' : (p.status || 'active')}`}>
          {isEditing ? 'editing' : (p.status || 'active')}
        </span>
        <button className="bsc-menu" title="Detalhes"
                onClick={() => console.log('[EmployeeHeader] details — TBD')}>⋯</button>
      </div>
    </div>
  )
}
