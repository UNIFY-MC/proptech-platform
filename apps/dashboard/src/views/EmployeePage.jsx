import { useParams, Link } from 'react-router-dom'
import BiaScorecard from './BiaScorecard.jsx'

export default function EmployeePage({ data }) {
  const { slug } = useParams()

  if (slug === 'bia') return <BiaScorecard />

  const emp = data?.employees?.find(e => e.id === slug)

  if (!emp) {
    return (
      <div>
        <Link to="/employees" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
          ← Equipa
        </Link>
        <div className="empty" style={{ marginTop: 20 }}>Employee não encontrado: {slug}</div>
      </div>
    )
  }

  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'
  const enabledIntegrations = emp.integrations?.filter(i => i.enabled) || []

  return (
    <div>
      <Link to="/employees" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
        ← Equipa
      </Link>

      <div style={{
        marginTop: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, maxWidth: 640,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--bg-elevated)', border: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', flexShrink: 0,
          }}>
            {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>{emp.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{emp.role}</div>
          </div>
          <span style={{
            padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
            background: emp.status === 'active' ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
            color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
          }}>{emp.status || 'draft'}</span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Model', value: modelShort, color: 'var(--info)' },
            { label: 'Skills', value: emp.skills?.length || 0, color: 'var(--text)' },
            { label: 'Receitas', value: emp.recipes?.length || 0, color: 'var(--text)' },
            { label: 'Integrações', value: enabledIntegrations.length, color: 'var(--text)' },
            { label: 'Custo', value: emp.cost ? `~$${emp.cost.current}/mês` : '—', color: 'var(--warning)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 12px' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'monospace', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {emp.department && (
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.68rem', background: 'var(--bg-elevated)', color: 'var(--text-dim)' }}>
              {emp.department}
            </span>
          )}
          {emp.vertical && (
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.68rem', background: 'var(--bg-elevated)', color: 'var(--text-dim)' }}>
              {emp.vertical}
            </span>
          )}
        </div>

        {/* Skills */}
        {emp.skills?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Skills
            </div>
            {emp.skills.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <code style={{
                  fontSize: '0.62rem', color: 'var(--info)',
                  background: 'var(--bg-elevated)', padding: '1px 5px',
                  borderRadius: 3, whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 1,
                }}>{s.id}</code>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{s.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recipes */}
        {emp.recipes?.length > 0 && (
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Receitas
            </div>
            {emp.recipes.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <code style={{
                  fontSize: '0.62rem', color: 'var(--success)',
                  background: 'var(--bg-elevated)', padding: '1px 5px',
                  borderRadius: 3, whiteSpace: 'nowrap', marginTop: 1,
                }}>{r.trigger_label || r.trigger}</code>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>{r.id}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
