import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import { DrawerSection } from './Drawer.jsx'
import { useDrawer } from '../context/DrawerContext.jsx'
import { timeAgo } from '../utils/time.js'

const stateColor = {
  idle: 'var(--success)',
  stale: 'var(--warning)',
  never: 'var(--text-dim)',
}

function AgentCard({ agent, openDrawer }) {
  return (
    <Card
      style={{ cursor: 'pointer' }}
      onClick={() => openDrawer(
        agent.name,
        agent.type === 'csuite' ? 'C-Suite' : 'Technical',
        <div>
          <DrawerSection label="Função">{agent.desc || 'Sem descrição.'}</DrawerSection>
          <DrawerSection label="Última task">{agent.task || 'Nunca executou'}</DrawerSection>
          <DrawerSection label="Última execução">
            {agent.last ? timeAgo(agent.last) : '—'}
            {agent.last && (
              <span style={{ marginLeft: 6, color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                ({agent.last.slice(0, 16).replace('T', ' ')})
              </span>
            )}
          </DrawerSection>
          {agent.tools && agent.tools.length > 0 && (
            <DrawerSection label="Tools">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {agent.tools.map(t => (
                  <span key={t} style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-dim)',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </DrawerSection>
          )}
          {agent.promptPath && (
            <DrawerSection label="System prompt">
              <code style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{agent.promptPath}</code>
            </DrawerSection>
          )}
          {agent.nextSuggested && (
            <DrawerSection label="Próxima acção sugerida">
              <span style={{ fontStyle: 'italic' }}>{agent.nextSuggested}</span>
            </DrawerSection>
          )}
        </div>
      )}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: stateColor[agent.state] || 'var(--text-dim)',
          flexShrink: 0,
        }} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{agent.name}</span>
        {agent.worktree && (
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
            @{agent.worktree}
          </span>
        )}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 4, lineHeight: 1.4 }}>
        {agent.task
          ? agent.task.substring(0, 60) + (agent.task.length > 60 ? '…' : '')
          : 'Nunca executou'}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
        {agent.last ? timeAgo(agent.last) : '—'}
      </div>
    </Card>
  )
}

export default function Agents({ data }) {
  const { agents = [] } = data
  const { openDrawer } = useDrawer()

  const technical = agents.filter(a => a.type !== 'csuite')
  const csuite = agents.filter(a => a.type === 'csuite')

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
        {agents.length} agente{agents.length !== 1 ? 's' : ''} registado{agents.length !== 1 ? 's' : ''} · clica para ver detalhes
      </div>

      {technical.length > 0 && (
        <>
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 12,
          }}>
            Técnicos
          </div>
          <div className="grid-agents" style={{ marginBottom: 24 }}>
            {technical.map(a => (
              <AgentCard key={a.id} agent={a} openDrawer={openDrawer} />
            ))}
          </div>
        </>
      )}

      {csuite.length > 0 && (
        <>
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 12,
          }}>
            C-Suite
          </div>
          <div className="grid-agents">
            {csuite.map(a => (
              <AgentCard key={a.id} agent={a} openDrawer={openDrawer} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
