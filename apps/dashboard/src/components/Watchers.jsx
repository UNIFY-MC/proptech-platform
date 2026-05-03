import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import { timeAgo } from '../utils/time.js'

function watcherStatusLevel(status) {
  const map = { ok: 'success', success: 'success', fail: 'danger', error: 'danger', warn: 'warning', unknown: 'idle' }
  return map[(status || '').toLowerCase()] || 'idle'
}

export default function Watchers({ data }) {
  const { watchers = [] } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="grid-2">
        {watchers.length === 0 && (
          <Card fullWidth>
            <div className="empty">Sem dados de watchers</div>
          </Card>
        )}
        {watchers.map(w => (
          <Card key={w.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.name}</div>
              <Badge level={watcherStatusLevel(w.status)}>{w.status || 'unknown'}</Badge>
            </div>

            {w.summary && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: 10, lineHeight: 1.4 }}>
                {w.summary}
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              {w.lastRun ? (
                <span>Última execução: {timeAgo(w.lastRun)}</span>
              ) : (
                <span>Aguarda primeira execução</span>
              )}
              {w.source && <span style={{ opacity: 0.7 }}>{w.source}</span>}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', paddingTop: 4 }}>
        Dados via GitHub Issues com label <code style={{ background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: 3 }}>watcher</code>
      </div>
    </div>
  )
}
