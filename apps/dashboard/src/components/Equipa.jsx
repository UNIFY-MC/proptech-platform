import { useState } from 'react'
import { Card } from './shared/Card.jsx'
import { SourceTag } from './shared/SourceTag.jsx'
import { DrawerSection } from './Drawer.jsx'
import { useDrawer } from '../context/DrawerContext.jsx'

// Department display order and labels
const DEPT_ORDER = ['Manutenção', 'Condomínios', 'Marketing']
const DEPT_META = {
  'Manutenção':  { label: 'Manutenção · V5',      color: 'var(--primary)',  desc: 'Concierge operacional · owners PRATA' },
  'Condomínios': { label: 'Condomínios · V2',      color: 'var(--success)',  desc: '10 agents · gestão total de condomínio' },
  'Marketing':   { label: 'Marketing · Cross',     color: 'var(--info)',     desc: 'Aquisição, conteúdo e leads multi-vertical' },
}

// ---- Shared subcomponents ----

function IntegrationChip({ integ }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 8px',
      background: 'var(--bg-elevated)', borderRadius: 6,
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

function EmployeeDrawerContent({ emp }) {
  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'
  return (
    <div>
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center',
        padding: '12px 0', marginBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: '2px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 700, color: 'var(--text)', flexShrink: 0,
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

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600,
          background: emp.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(139,146,168,0.15)',
          color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
        }}>{emp.status || 'draft'}</span>
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem',
          background: 'var(--bg-elevated)', color: 'var(--text-dim)',
        }}>{emp.department}</span>
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem',
          background: 'var(--bg-elevated)', color: 'var(--text-dim)',
        }}>{emp.vertical}</span>
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

      {emp.integrations?.length > 0 && (
        <DrawerSection label="Integrações">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {emp.integrations.map(i => <IntegrationChip key={i.id} integ={i} />)}
          </div>
        </DrawerSection>
      )}

      {emp.skills?.length > 0 && (
        <DrawerSection label="Skills">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {emp.skills.map(s => <SkillRow key={s.id} skill={s} />)}
          </div>
        </DrawerSection>
      )}

      {emp.recipes?.length > 0 && (
        <DrawerSection label="Receitas (cron / trigger)">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {emp.recipes.map(r => <RecipeRow key={r.id} recipe={r} />)}
          </div>
        </DrawerSection>
      )}

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

// ---- Employee card ----

function EmployeeCard({ emp, openDrawer, accentColor }) {
  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'
  const enabledIntegrations = emp.integrations?.filter(i => i.enabled).length || 0

  return (
    <Card
      style={{ cursor: 'pointer', borderLeft: `2px solid ${accentColor}` }}
      onClick={() => openDrawer(
        `${emp.name} · ${emp.role}`,
        emp.department,
        <EmployeeDrawerContent emp={emp} />
      )}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: `1px solid ${accentColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', flexShrink: 0,
        }}>
          {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{emp.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>{emp.role}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'var(--info)' }}>{modelShort}</div>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>
            {emp.cost ? `~$${emp.cost.current}/mês` : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span style={{
          padding: '1px 6px', borderRadius: 20, fontSize: '0.58rem',
          background: emp.status === 'active' ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
          color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
        }}>{emp.status || 'draft'}</span>
        {emp.skills?.length > 0 && (
          <span style={{ padding: '1px 6px', borderRadius: 20, fontSize: '0.58rem', background: 'var(--bg-elevated)', color: 'var(--text-dim)' }}>
            {emp.skills.length} skills
          </span>
        )}
        {emp.recipes?.length > 0 && (
          <span style={{ padding: '1px 6px', borderRadius: 20, fontSize: '0.58rem', background: 'var(--bg-elevated)', color: 'var(--text-dim)' }}>
            {emp.recipes.length} receitas
          </span>
        )}
        {enabledIntegrations > 0 && (
          <span style={{ padding: '1px 6px', borderRadius: 20, fontSize: '0.58rem', background: 'var(--bg-elevated)', color: 'var(--text-dim)' }}>
            {enabledIntegrations} integrações
          </span>
        )}
      </div>
    </Card>
  )
}

// ---- Department section ----

function DepartmentSection({ dept, employees, openDrawer }) {
  const [open, setOpen] = useState(true)
  const meta = DEPT_META[dept] || { label: dept, color: 'var(--text-dim)', desc: '' }
  const totalCost = employees.reduce((s, e) => s + (e.cost?.current || 0), 0)

  return (
    <div style={{ marginBottom: 28 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px 0', marginBottom: open ? 12 : 0,
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 3, height: 18, borderRadius: 2,
          background: meta.color, flexShrink: 0,
        }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {meta.label}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>· {employees.length}</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
          ~${totalCost}/mês
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: 6 }}>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <>
          {meta.desc && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 10, paddingLeft: 13 }}>
              {meta.desc}
            </div>
          )}
          <div className="grid-agents">
            {employees.map(emp => (
              <EmployeeCard
                key={emp.id}
                emp={emp}
                openDrawer={openDrawer}
                accentColor={meta.color}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---- Main ----

export default function Equipa({ data }) {
  const { employees = [] } = data
  const { openDrawer } = useDrawer()

  // Group by department, preserving DEPT_ORDER
  const grouped = {}
  for (const emp of employees) {
    const dept = emp.department || 'Outros'
    if (!grouped[dept]) grouped[dept] = []
    grouped[dept].push(emp)
  }

  const orderedDepts = [
    ...DEPT_ORDER.filter(d => grouped[d]),
    ...Object.keys(grouped).filter(d => !DEPT_ORDER.includes(d)),
  ]

  const totalCost = employees.reduce((s, e) => s + (e.cost?.current || 0), 0)
  const activeCount = employees.filter(e => e.status === 'active').length

  if (employees.length === 0) {
    return (
      <Card title="Equipa" fullWidth>
        <div className="empty">Sem dados de employees</div>
      </Card>
    )
  }

  return (
    <div>
      {/* Summary strip */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 24,
        padding: '10px 14px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8,
      }}>
        <div>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Employees</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{employees.length}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Activos</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--success)' }}>{activeCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Departamentos</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{orderedDepts.length}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custo total</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--warning)' }}>~${totalCost}/mês</div>
        </div>
      </div>

      {/* Departments */}
      {orderedDepts.map(dept => (
        <DepartmentSection
          key={dept}
          dept={dept}
          employees={grouped[dept]}
          openDrawer={openDrawer}
        />
      ))}

      <SourceTag source=".claude/employees/*.meta.json" status="live" />
    </div>
  )
}
