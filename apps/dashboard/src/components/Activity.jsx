import { Card } from './shared/Card.jsx'
import { timeAgo, isoDateLabel } from '../utils/time.js'

function groupByDay(entries) {
  const groups = {}
  for (const e of entries) {
    const day = e.ts ? e.ts.slice(0, 10) : 'desconhecido'
    if (!groups[day]) groups[day] = []
    groups[day].push(e)
  }
  // Ordenar dias desc
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

export default function Activity({ data }) {
  const { activity = [] } = data

  if (activity.length === 0) {
    return (
      <Card title="Actividade recente" fullWidth>
        <div className="empty">Sem actividade registada</div>
      </Card>
    )
  }

  const sorted = [...activity].sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
  const groups = groupByDay(sorted)

  return (
    <Card title={`Actividade — ${activity.length} entradas`} fullWidth>
      {groups.map(([day, entries]) => (
        <div key={day}>
          <div className="timeline-day">{isoDateLabel(day)}</div>
          {entries.map((e, i) => (
            <div key={i} className="timeline-item">
              <span className="timeline-ts">
                {e.ts ? e.ts.slice(11, 16) : '—'}
                <span style={{ marginLeft: 4, opacity: 0.6, fontSize: '0.7rem' }}>
                  {timeAgo(e.ts)}
                </span>
              </span>
              <span className="timeline-agent">
                {e.agent || 'agente'}
              </span>
              <span className="timeline-summary" title={e.summary}>
                {e.summary || '—'}
              </span>
              {e.worktree && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  @{e.worktree}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </Card>
  )
}
