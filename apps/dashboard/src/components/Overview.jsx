import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import { SprintProgress } from './shared/SprintProgress.jsx'
import { DrawerSection } from './Drawer.jsx'
import { useDrawer } from '../context/DrawerContext.jsx'

function statusToBadge(status) {
  const map = {
    'Production': 'production',
    'Active': 'active',
    'active': 'active',
    'Foundation': 'foundation',
    'Planned': 'planned',
    'planned': 'planned',
    'done': 'success',
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

function healthColor(usage) {
  if (usage >= 80) return 'var(--danger)'
  if (usage >= 60) return 'var(--warning)'
  return 'var(--success)'
}

const urgencyColors = {
  critical: 'var(--danger)',
  high: 'var(--warning)',
  medium: 'var(--info)',
  low: 'var(--text-dim)'
}

export default function Overview({ data }) {
  const { sprint, verticals = [], alerts = [], nextActions = [], techStack = [], stackHealth = [], decisions = [] } = data
  const { openDrawer } = useDrawer()

  // Mostrar só as 4 verticais principais no overview
  const topVerticals = verticals.slice(0, 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Alerts bar */}
      {alerts.length > 0 && (
        <div>
          {alerts.map(a => (
            <div key={a.id} className={`alert-bar ${alertLevel(a.level)}`} style={{ animation: 'pulse 2s infinite' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                {a.level === 'danger' ? '🚨' : a.level === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <div>
                <strong>{a.message}</strong>
                {a.since && (
                  <span style={{ marginLeft: 8, opacity: 0.7, fontSize: '0.7rem' }}>
                    desde {a.since.slice(0, 10)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero — Sprint */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{sprint?.wave}</span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>— {sprint?.name}</span>
          <Badge level={sprint?.status === 'active' ? 'active' : 'success'}>
            {sprint?.status || 'activo'}
          </Badge>
        </div>

        <SprintProgress
          day={sprint?.day}
          totalDays={sprint?.totalDays}
          startDate={sprint?.startDate}
          endDate={sprint?.endDate}
        />

        {sprint?.daysToGate > 0 && (
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            ⏱ {sprint.daysToGate} dias para {sprint.gateName}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {sprint?.hypothesis}
        </div>

        {sprint?.gates && sprint.gates.length > 0 && (
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

      {/* Grid 2 colunas — Verticais + Acções */}
      <div className="grid-overview">

        {/* Verticais */}
        <Card title="Verticais">
          {topVerticals.map(v => (
            <div
              key={v.id}
              className="list-item"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => openDrawer(
                v.name,
                v.status,
                <div>
                  <DrawerSection label="Estado">
                    <Badge level={statusToBadge(v.status)}>{v.status}</Badge>
                  </DrawerSection>
                  <DrawerSection label="Descrição">{v.description || '—'}</DrawerSection>
                  <DrawerSection label="ID">{v.id.toUpperCase()}</DrawerSection>
                </div>
              )}
            >
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
          {verticals.length > 4 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 8 }}>
              +{verticals.length - 4} verticais adicionais
            </div>
          )}
          {verticals.length === 0 && <div className="empty">Sem dados de verticais</div>}
        </Card>

        {/* Próximas Acções P0/P1 */}
        <Card title="Próximas Acções">
          {nextActions.length === 0 && <div className="empty">Sem acções P0/P1 abertas</div>}
          {nextActions.map(a => (
            <div
              key={a.id}
              className="action-item"
              style={{ cursor: 'pointer' }}
              onClick={() => openDrawer(
                a.description,
                `${a.priority} · ${a.source || ''}`,
                <div>
                  <DrawerSection label="Prioridade">
                    <span className={`action-priority ${priorityClass(a.priority)}`}>{a.priority}</span>
                  </DrawerSection>
                  <DrawerSection label="Responsável">{a.owner || '—'}</DrawerSection>
                  <DrawerSection label="Fonte">{a.source || '—'}</DrawerSection>
                </div>
              )}
            >
              <span className={`action-priority ${priorityClass(a.priority)}`}>{a.priority}</span>
              <div>
                <div style={{ color: 'var(--text)', fontSize: '0.8rem', lineHeight: 1.4 }}>{a.description}</div>
                {a.owner && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {a.owner}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Tech Stack — tabela full width */}
      <Card title="Tech Stack">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {['Serviço', 'Role', 'Host', 'Status', 'Custo', 'Sprint'].map(h => (
                  <th key={h} style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {techStack.map(s => (
                <tr key={s.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 8px', fontWeight: 500 }}>{s.name}</td>
                  <td className="col-hide-sm" style={{ padding: '7px 8px', color: 'var(--text-dim)' }}>{s.role}</td>
                  <td className="col-hide-sm" style={{ padding: '7px 8px', color: 'var(--text-dim)' }}>{s.host}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <Badge level={
                      s.status === 'ok' ? 'success' :
                      s.status === 'warn' ? 'warning' :
                      s.status === 'planned' ? 'info' :
                      s.status === 'deferred' ? 'dim' : 'idle'
                    }>
                      {s.status}
                    </Badge>
                  </td>
                  <td style={{ padding: '7px 8px', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{s.cost}</td>
                  <td style={{ padding: '7px 8px', color: 'var(--text-dim)' }}>{s.sprint}</td>
                </tr>
              ))}
              {techStack.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '12px 8px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Sem dados de tech stack
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stack Health — 4 gauges */}
      {stackHealth.length > 0 && (
        <Card title="Stack Health">
          <div className="grid-4">
            {stackHealth.map((s, i) => (
              <div key={i} style={{ padding: '8px 0' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 6,
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{s.service}</span>
                  <span style={{ fontSize: '0.75rem', color: healthColor(s.usage), fontFamily: 'monospace' }}>
                    {s.usage}%
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 4 }}>{s.label}</div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${s.usage}%`, background: healthColor(s.usage) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Decisões recentes */}
      {decisions.length > 0 && (
        <Card title="Decisões recentes">
          {decisions.map(d => (
            <div
              key={d.id}
              style={{
                borderLeft: `3px solid ${urgencyColors[d.urgency] || 'var(--border)'}`,
                padding: '10px 14px',
                marginBottom: 8,
                background: 'var(--bg-elevated)',
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
              }}
              onClick={() => openDrawer(
                d.text,
                d.meta,
                <div>
                  <DrawerSection label="Detalhe">{d.detail || 'Sem detalhe adicional.'}</DrawerSection>
                  <DrawerSection label="Urgência">
                    <Badge level={d.urgency === 'critical' ? 'danger' : d.urgency === 'high' ? 'warning' : d.urgency === 'medium' ? 'info' : 'dim'}>
                      {d.urgency}
                    </Badge>
                  </DrawerSection>
                </div>
              )}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text)' }}>
                {d.text}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{d.meta}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
