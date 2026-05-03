import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import { timeAgo } from '../utils/time.js'

function statusLevel(status) {
  const map = {
    'idle': 'idle',
    'active': 'active',
    'running': 'active',
    'done': 'success',
    'error': 'danger',
    'warn': 'warning',
  }
  return map[(status || '').toLowerCase()] || 'idle'
}

export default function Agents({ data }) {
  const { agents = [] } = data

  if (agents.length === 0) {
    return (
      <Card title="Agentes" fullWidth>
        <div className="empty">Sem dados de agentes</div>
      </Card>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        {agents.length} agente{agents.length !== 1 ? 's' : ''} registado{agents.length !== 1 ? 's' : ''}
      </div>
      <div className="grid">
        {agents.map(agent => (
          <Card key={agent.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{agent.name}</div>
                {agent.worktree && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>@{agent.worktree}</div>
                )}
              </div>
              <Badge level={statusLevel(agent.status)}>{agent.status || 'idle'}</Badge>
            </div>

            {agent.lastTask && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Última tarefa
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4 }}>{agent.lastTask}</div>
              </div>
            )}

            {agent.lastRun && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  Última execução
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                  {timeAgo(agent.lastRun)}
                  <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>({agent.lastRun.slice(0, 16).replace('T', ' ')})</span>
                </div>
              </div>
            )}

            {agent.nextSuggested && (
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                fontStyle: 'italic',
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
                lineHeight: 1.4
              }}>
                Próximo: {agent.nextSuggested}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
