import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import { SprintProgress } from './shared/SprintProgress.jsx'

function waveStatus(status) {
  const map = { active: 'active', planned: 'planned', done: 'success', 'completed': 'success' }
  return map[(status || '').toLowerCase()] || 'idle'
}

export default function Roadmap({ data }) {
  const { roadmap, sprint } = data
  const waves = roadmap?.waves || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Sprint actual em detalhe */}
      {sprint && (
        <Card title={`Sprint activo — Wave ${sprint.wave}`}>
          <SprintProgress
            day={sprint.day}
            totalDays={sprint.totalDays}
            startDate={sprint.startDate}
            endDate={sprint.endDate}
          />
          <div style={{ marginTop: 12, marginBottom: 16, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {sprint.hypothesis}
          </div>
          {sprint.gates && sprint.gates.length > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Gates Go/No-go
              </div>
              <ul className="gate-list">
                {sprint.gates.map(g => (
                  <li key={g.id} className="gate-item">
                    <span className={`gate-icon ${g.status}`} />
                    <span style={{ fontSize: '0.875rem' }}>{g.label}</span>
                    <span className="gate-date">{g.date}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {/* Roadmap waves */}
      <Card title="Waves — Roadmap geral" fullWidth>
        {waves.length === 0 && <div className="empty">Sem dados de roadmap</div>}
        {waves.map(w => (
          <div key={w.id} className="wave-item">
            <span className={`wave-id ${w.status === 'active' ? 'active' : ''}`}>
              {w.id}
            </span>
            <div style={{ flex: 1 }}>
              <div className="wave-name">{w.name}</div>
              {w.period && <div className="wave-period">{w.period}</div>}
            </div>
            <Badge level={waveStatus(w.status)}>{w.status}</Badge>
          </div>
        ))}
      </Card>
    </div>
  )
}
