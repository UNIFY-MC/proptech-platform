import { useNavigate } from 'react-router-dom'

const DEPT_ORDER = ['Manutenção', 'Condomínios', 'Marketing']
const DEPT_META = {
  'Manutenção':  { label: 'Manutenção · V5', color: 'var(--primary)', desc: 'Concierge operacional · owners PRATA' },
  'Condomínios': { label: 'Condomínios · V2', color: 'var(--success)', desc: '10 agents · gestão total de condomínio' },
  'Marketing':   { label: 'Marketing · Cross', color: 'var(--info)', desc: 'Aquisição, conteúdo e leads multi-vertical' },
}

function EmployeeCard({ emp, accentColor, onClick }) {
  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'
  const enabledIntegrations = emp.integrations?.filter(i => i.enabled).length || 0

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `2px solid ${accentColor}`,
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: `1px solid ${accentColor}40`,
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
    </div>
  )
}

export default function EmployeesPage({ data }) {
  const navigate = useNavigate()
  const employees = data?.employees || []

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
    return <div className="empty">Sem dados de employees</div>
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
          <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Depts</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{orderedDepts.length}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custo total</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--warning)' }}>~${totalCost}/mês</div>
        </div>
      </div>

      {orderedDepts.map(dept => {
        const meta = DEPT_META[dept] || { label: dept, color: 'var(--text-dim)', desc: '' }
        const deptEmployees = grouped[dept]
        return (
          <div key={dept} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', marginBottom: 12 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: meta.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {meta.label}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>· {deptEmployees.length}</span>
              {meta.desc && (
                <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginLeft: 4 }}>{meta.desc}</span>
              )}
            </div>
            <div className="grid-agents">
              {deptEmployees.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  accentColor={meta.color}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
