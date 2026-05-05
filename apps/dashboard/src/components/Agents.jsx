import { Card } from './shared/Card.jsx'
import { Badge } from './shared/Badge.jsx'
import { SourceTag } from './shared/SourceTag.jsx'
import { DrawerSection } from './Drawer.jsx'
import { useDrawer } from '../context/DrawerContext.jsx'
import { timeAgo } from '../utils/time.js'

const stateColor = {
  idle: 'var(--success)',
  stale: 'var(--warning)',
  never: 'var(--text-dim)',
}

// ---- BIA Drawer (cook.ai-style employee card) ----

function IntegrationChip({ integ }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 8px',
      background: 'var(--bg-elevated)',
      borderRadius: 6,
      border: '1px solid var(--border)',
      opacity: integ.enabled ? 1 : 0.5,
    }}>
      <span style={{
        fontSize: '0.6rem', fontWeight: 700, fontFamily: 'monospace',
        background: 'var(--bg)', padding: '1px 4px', borderRadius: 3,
        color: 'var(--text-dim)',
      }}>{integ.icon || integ.id.substring(0, 2).toUpperCase()}</span>
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>{integ.name}</div>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>{integ.desc}</div>
      </div>
      {integ.planned && (
        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--warning)', fontStyle: 'italic' }}>planeado</span>
      )}
    </div>
  )
}

function SkillRow({ skill }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <code style={{
        fontSize: '0.65rem', color: 'var(--info)',
        background: 'var(--bg-elevated)', padding: '1px 5px',
        borderRadius: 3, whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2,
      }}>{skill.id}</code>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>{skill.desc}</span>
    </div>
  )
}

function RecipeRow({ recipe }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <code style={{
        fontSize: '0.62rem', fontFamily: 'monospace', color: 'var(--success)',
        background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3,
        whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2,
      }}>{recipe.trigger_label || recipe.trigger}</code>
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>{recipe.id}</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{recipe.desc}</div>
      </div>
    </div>
  )
}

function BiaDrawerContent({ emp }) {
  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'
  return (
    <div>
      {/* Identity strip */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center',
        padding: '12px 0', marginBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '2px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 700, color: 'var(--text)',
          flexShrink: 0,
        }}>
          {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{emp.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{emp.role}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--info)' }}>{modelShort}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            {emp.cost ? `~$${emp.cost.current}/mês` : '—'}
          </div>
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600,
          background: emp.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(139,146,168,0.15)',
          color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
        }}>{emp.status || 'draft'}</span>
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem',
          background: 'var(--bg-elevated)', color: 'var(--text-dim)',
        }}>{emp.vertical}</span>
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem',
          background: 'var(--bg-elevated)', color: 'var(--text-dim)',
        }}>v{emp.version || '1.0'}</span>
        {emp.skills?.length > 0 && (
          <span style={{
            padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem',
            background: 'var(--bg-elevated)', color: 'var(--text-dim)',
          }}>{emp.skills.length} skills</span>
        )}
        {emp.recipes?.length > 0 && (
          <span style={{
            padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem',
            background: 'var(--bg-elevated)', color: 'var(--text-dim)',
          }}>{emp.recipes.length} receitas</span>
        )}
      </div>

      {/* Integrations */}
      {emp.integrations?.length > 0 && (
        <DrawerSection label="Integrações">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {emp.integrations.map(i => <IntegrationChip key={i.id} integ={i} />)}
          </div>
        </DrawerSection>
      )}

      {/* Skills */}
      {emp.skills?.length > 0 && (
        <DrawerSection label="Skills">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {emp.skills.map(s => <SkillRow key={s.id} skill={s} />)}
          </div>
        </DrawerSection>
      )}

      {/* Recipes */}
      {emp.recipes?.length > 0 && (
        <DrawerSection label="Receitas (cron / trigger)">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {emp.recipes.map(r => <RecipeRow key={r.id} recipe={r} />)}
          </div>
        </DrawerSection>
      )}

      {/* Peer reads */}
      {emp.peerReads?.length > 0 && (
        <DrawerSection label="Colabora com">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {emp.peerReads.map((p, i) => (
              <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', marginRight: 6 }}>[{p.stage}]</span>
                {p.value}
              </div>
            ))}
          </div>
        </DrawerSection>
      )}

      {/* Cost */}
      {emp.cost && (
        <DrawerSection label="Custo estimado">
          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text)' }}>
            ~${emp.cost.current}/{emp.cost.period}
          </span>
          {emp.cost.notes && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 8 }}>{emp.cost.notes}</span>
          )}
        </DrawerSection>
      )}
    </div>
  )
}

// ---- Technical Agent Card (unchanged) ----

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
          width: 8, height: 8, borderRadius: '50%',
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

// ---- Employee BIA Card (cook.ai style) ----

function EmployeeCard({ emp, openDrawer }) {
  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'

  function handleOpen() {
    openDrawer(
      `${emp.name} · ${emp.role}`,
      `BIA — ${emp.vertical}`,
      <BiaDrawerContent emp={emp} />
    )
  }

  return (
    <Card style={{ cursor: 'pointer' }} onClick={handleOpen}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)',
          flexShrink: 0,
        }}>
          {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{emp.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{emp.role}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: 'var(--info)' }}>{modelShort}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
            {emp.cost ? `~$${emp.cost.current}/mês` : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span style={{
          padding: '1px 6px', borderRadius: 20, fontSize: '0.6rem',
          background: emp.status === 'active' ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
          color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
        }}>{emp.status || 'draft'}</span>
        {emp.skills?.length > 0 && (
          <span style={{
            padding: '1px 6px', borderRadius: 20, fontSize: '0.6rem',
            background: 'var(--bg-elevated)', color: 'var(--text-dim)',
          }}>{emp.skills.length} skills</span>
        )}
        {emp.recipes?.length > 0 && (
          <span style={{
            padding: '1px 6px', borderRadius: 20, fontSize: '0.6rem',
            background: 'var(--bg-elevated)', color: 'var(--text-dim)',
          }}>{emp.recipes.length} receitas</span>
        )}
        {emp.integrations?.filter(i => i.enabled).length > 0 && (
          <span style={{
            padding: '1px 6px', borderRadius: 20, fontSize: '0.6rem',
            background: 'var(--bg-elevated)', color: 'var(--text-dim)',
          }}>{emp.integrations.filter(i => i.enabled).length} integrações</span>
        )}
      </div>

      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 6 }}>
        {emp.vertical}
      </div>
    </Card>
  )
}

// ---- Main component ----

export default function Agents({ data }) {
  const { agents = [], employees = [] } = data
  const { openDrawer } = useDrawer()

  const technical = agents.filter(a => a.type !== 'csuite')
  const csuite = agents.filter(a => a.type === 'csuite')

  const sectionLabel = (label, count) => (
    <div style={{
      fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)',
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
    }}>
      {label} {count > 0 && <span style={{ fontWeight: 400 }}>· {count}</span>}
    </div>
  )

  return (
    <div>
      {/* AI Employees (BIA) */}
      {employees.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {sectionLabel('AI Employees — BIA', employees.length)}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 12 }}>
            Clica para ver ficha completa · skills · receitas · integrações · custo
          </div>
          <div className="grid-agents">
            {employees.map(emp => (
              <EmployeeCard key={emp.id} emp={emp} openDrawer={openDrawer} />
            ))}
          </div>
        </div>
      )}

      {/* Technical Agents */}
      {technical.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {sectionLabel('Agentes Técnicos', technical.length)}
          <div className="grid-agents">
            {technical.map(a => (
              <AgentCard key={a.id} agent={a} openDrawer={openDrawer} />
            ))}
          </div>
        </div>
      )}

      {/* C-Suite */}
      {csuite.length > 0 && (
        <div>
          {sectionLabel('C-Suite', csuite.length)}
          <div className="grid-agents">
            {csuite.map(a => (
              <AgentCard key={a.id} agent={a} openDrawer={openDrawer} />
            ))}
          </div>
        </div>
      )}

      {agents.length === 0 && employees.length === 0 && (
        <Card title="Agentes" fullWidth>
          <div className="empty">Sem dados de agentes</div>
        </Card>
      )}

      <SourceTag source=".claude/employees/*.meta.json + proptech-state/agents/*.md" status="live" />
    </div>
  )
}
