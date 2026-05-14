import { useNavigate } from 'react-router-dom'

export default function EmployeeHeader({ emp }) {
  const navigate = useNavigate()
  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'

  return (
    <div style={{
      background: 'var(--bg-card-soft)',
      border: '1px solid var(--border-soft)',
      borderRadius: 10, padding: '14px 18px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-dim)', padding: '0 4px', flexShrink: 0, lineHeight: 1 }}
        title="Voltar"
      >←</button>

      <div style={{
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.2rem', fontWeight: 700, color: '#fff',
      }}>
        {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
          {emp.name}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 2 }}>
          {emp.role} · {emp.vertical}
        </div>
        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-dim)', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span>Model: {modelShort}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Replies: pt-pt</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>v{emp.version || '1.0'}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Last check: —</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600, fontFamily: 'monospace',
          background: emp.status === 'active' ? 'rgba(16,185,129,0.15)' : 'var(--bg-card-elevated)',
          color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
        }}>{emp.status || 'draft'}</span>
        <button
          style={{ background: 'none', border: '1px solid var(--border-soft)', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: '0.62rem', color: 'var(--text-dim)' }}
          title="Detalhes"
          onClick={() => console.log('[EmployeeHeader] ⋯ stub')}
        >⋯</button>
      </div>
    </div>
  )
}
