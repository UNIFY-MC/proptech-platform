import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import { SprintProgress } from './shared/SprintProgress.jsx'

function statusToBadge(status) {
  const map = {
    'Production': 'production',
    'Active': 'active',
    'Foundation': 'foundation',
    'Planned': 'planned',
    'ACTIVO': 'active',
  }
  return map[status] || 'idle'
}

function alertLevel(level) {
  const map = { warning: 'warning', danger: 'danger', error: 'danger', info: 'info' }
  return map[level] || 'info'
}

function priorityClass(p) {
  const map = { P0: 'priority-p0', P1: 'priority-p1', P2: 'priority-p2' }
  return map[p] || 'priority-p2'
}

export default function Overview({ data }) {
  const { sprint, verticals = [], alerts = [], actions = [], techStack = [], stackHealth } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          {alerts.map(a => (
            <div key={a.id} className={`alert-bar ${alertLevel(a.level)}`}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                {a.level === 'danger' ? '🚨' : a.level === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <div>
                <strong>{a.message}</strong>
                {a.since && <span style={{ marginLeft: 8, opacity: 0.7, fontSize: '0.7rem' }}>desde {a.since.slice(0, 10)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero — Sprint */}
      <Card title={`Sprint ${sprint.wave} — ${sprint.name}`}>
        <SprintProgress
          day={sprint.day}
          totalDays={sprint.totalDays}
          startDate={sprint.startDate}
          endDate={sprint.endDate}
        />
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge level={statusToBadge(sprint.status)}>{sprint.status}</Badge>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{sprint.hypothesis}</span>
        </div>
        {sprint.gates && sprint.gates.length > 0 && (
          <ul className="gate-list" style={{ marginTop: 16 }}>
            {sprint.gates.map(g => (
              <li key={g.id} className="gate-item">
                <span className={`gate-icon ${g.status}`} />
                <span>{g.label}</span>
                <span className="gate-date">{g.date}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Grid de 3 — Verticals, Actions, Stack Health */}
      <div className="grid">

        {/* Verticals */}
        <Card title="Verticais">
          {verticals.map(v => (
            <div key={v.id} className="list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="v-dot" style={{ background: v.color }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{v.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <Badge level={statusToBadge(v.status)}>{v.status}</Badge>
                {v.description && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{v.description}</span>
                )}
              </div>
            </div>
          ))}
          {verticals.length === 0 && <div className="empty">Sem dados de verticais</div>}
        </Card>

        {/* Actions P0/P1 */}
        <Card title="Acções prioritárias">
          {actions.length === 0 && <div className="empty">Sem acções P0/P1 abertas</div>}
          {actions.map(a => (
            <div key={a.id} className="action-item">
              <span className={`action-priority ${priorityClass(a.priority)}`}>{a.priority}</span>
              <div>
                <div style={{ color: 'var(--text)', fontSize: '0.8rem', lineHeight: 1.4 }}>{a.description}</div>
                {a.owner && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    Responsável: {a.owner}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>

        {/* Stack Health */}
        <Card title={`Stack Health${stackHealth ? ` — ${stackHealth.score}/100` : ''}`}>
          {!stackHealth && <div className="empty">Sem dados de stack-health</div>}
          {stackHealth && (
            <>
              <div className="progress-track" style={{ marginBottom: 16 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${stackHealth.score}%`,
                    background: stackHealth.score >= 80 ? 'var(--success)' : stackHealth.score >= 60 ? 'var(--warning)' : 'var(--danger)'
                  }}
                />
              </div>
              {stackHealth.checks && stackHealth.checks.map((c, i) => (
                <div key={i} className="health-item">
                  <div>
                    <span style={{ fontSize: '0.8rem' }}>{c.name}</span>
                    {c.note && <div className="health-note">{c.note}</div>}
                  </div>
                  <Badge level={c.status === 'pass' ? 'success' : c.status === 'warn' ? 'warning' : 'danger'}>
                    {c.status}
                  </Badge>
                </div>
              ))}
              {stackHealth.lastCheck && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 10 }}>
                  Última verificação: {stackHealth.lastCheck.slice(0, 10)}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Tech Stack */}
      <Card title="Tech Stack" fullWidth>
        <div className="grid-2">
          {techStack.map((s, i) => (
            <div key={i} className="stat">
              <div>
                <span className="stat-label" style={{ fontSize: '0.8rem' }}>{s.name}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{s.type}{s.cost ? ` · ${s.cost}` : ''}</div>
              </div>
              <Badge level={s.status === 'ok' || s.status?.startsWith('ok') ? 'success' : 'warning'}>
                {s.status || 'ok'}
              </Badge>
            </div>
          ))}
          {techStack.length === 0 && <div className="empty">Sem dados de tech stack</div>}
        </div>
      </Card>
    </div>
  )
}
