// EmployeesPage — /employees · hub unificado Overview / Departments / Org Chart
//
// Substitui 3 rotas legacy (/employees, /departments, /departments/:slug + sidebar group)
// num único hub com tabs internas, controlado por ?tab=overview|departments|org-chart
// e ?dept=<id> para drill-in num departamento.

import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { Users, Briefcase, Network, UserPlus, ArrowLeft } from 'lucide-react'
import { useVerticalStore } from '../store'
import { useData } from '../hooks/useData.js'
import { DEPARTMENTS, deptFor, employeesOfDept, countByDept, normalizeDept } from '../lib/departments.js'

const FALLBACK_ICON = Lucide.Briefcase
function DeptIcon({ name, size = 18, color }) {
  const Comp = (name && Lucide[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ color, flexShrink: 0 }} />
}

// ───────────────────────────────────────────────────────────
// Tab buttons (topo direito)
// ───────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 6,
        background: active ? 'var(--bg-card)' : 'transparent',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        color: active ? 'var(--text)' : 'var(--text-dim)',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      <Icon size={13} /> {label}
    </button>
  )
}

// ───────────────────────────────────────────────────────────
// Avatar + status pill comum
// ───────────────────────────────────────────────────────────
function Avatar({ emp, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function StatusPill({ status }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem',
      padding: '2px 6px', borderRadius: 3,
      background: status === 'active' ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
      color: status === 'active' ? 'var(--success)' : 'var(--text-dim)',
      fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>{status || 'draft'}</span>
  )
}

// ───────────────────────────────────────────────────────────
// TAB 1: Overview — grid de cards por dept (lista actual)
// ───────────────────────────────────────────────────────────
function EmployeeCard({ emp, accentColor, onClick }) {
  const enabledIntegrations = emp.integrations?.filter(i => i.enabled).length || 0
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderLeft: `2px solid ${accentColor}`,
        borderRadius: 8, padding: 14, cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <Avatar emp={emp} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{emp.name}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>{emp.role}</div>
        </div>
        <StatusPill status={emp.status} />
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {emp.skills?.length > 0 && (
          <span style={pillStyle}>{emp.skills.length} skills</span>
        )}
        {emp.recipes?.length > 0 && (
          <span style={pillStyle}>{emp.recipes.length} receitas</span>
        )}
        {enabledIntegrations > 0 && (
          <span style={pillStyle}>{enabledIntegrations} integrações</span>
        )}
      </div>
    </div>
  )
}

const pillStyle = {
  padding: '1px 6px', borderRadius: 10, fontSize: '0.58rem',
  background: 'var(--bg-elevated)', color: 'var(--text-dim)',
}

function OverviewTab({ employees, navigate }) {
  const grouped = {}
  for (const emp of employees) {
    const dept = normalizeDept(emp.department) || 'outros'
    if (!grouped[dept]) grouped[dept] = []
    grouped[dept].push(emp)
  }
  const orderedDepts = DEPARTMENTS.filter(d => grouped[d.id]).concat(
    grouped['outros'] ? [{ id: 'outros', label: 'Outros', color: '#6b7280', icon: 'Briefcase' }] : []
  )
  return (
    <div>
      {orderedDepts.map(dept => {
        const list = grouped[dept.id]
        return (
          <div key={dept.id} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: dept.color }} />
              <DeptIcon name={dept.icon} size={14} color={dept.color} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {dept.label}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>· {list.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {list.map(emp => (
                <EmployeeCard
                  key={emp.id} emp={emp} accentColor={dept.color}
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

// ───────────────────────────────────────────────────────────
// TAB 2: Departments — grid de 8 dept cards + drill-in
// ───────────────────────────────────────────────────────────
function DeptCard({ dept, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderLeft: `3px solid ${dept.color}`,
        borderRadius: 8, padding: '14px 16px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 6,
        opacity: dept.planned ? 0.55 : 1,
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <DeptIcon name={dept.icon} color={dept.color} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
          {count}
        </span>
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{dept.label}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
        {dept.planned ? 'Planeado · sem agents' : `${count} agent${count === 1 ? '' : 's'}`}
      </div>
    </button>
  )
}

function DepartmentsTab({ employees, activeVertical, setDept, drillDept, navigate }) {
  if (drillDept) {
    const dept = deptFor(drillDept)
    if (!dept) return <div style={{ color: 'var(--text-dim)' }}>Departamento não encontrado.</div>
    const agents = employeesOfDept(employees, dept.id, activeVertical)
    return (
      <div>
        <button
          onClick={() => setDept(null)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '0.72rem', color: 'var(--text-dim)',
            background: 'none', border: 'none', cursor: 'pointer',
            marginBottom: 12, padding: 0,
          }}
        ><ArrowLeft size={11} /> Voltar a departments</button>

        <div style={{
          background: 'var(--bg-card)', borderLeft: `4px solid ${dept.color}`,
          borderRadius: 8, padding: '18px 20px', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10,
            background: `${dept.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DeptIcon name={dept.icon} size={22} color={dept.color} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{dept.label}</h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '4px 0 0' }}>
              {agents.length} agent{agents.length === 1 ? '' : 's'}
              {activeVertical !== 'all' && ` · ${activeVertical}`}
            </p>
          </div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '1.6rem',
            fontWeight: 700, color: dept.color,
          }}>{agents.length}</span>
        </div>

        {agents.length === 0 ? (
          <div style={{
            padding: 32, textAlign: 'center',
            background: 'var(--bg-card)', border: '1px dashed var(--border)',
            borderRadius: 8, color: 'var(--text-dim)', fontSize: '0.82rem',
          }}>
            Sem agents neste departamento.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {agents.map(emp => (
              <EmployeeCard
                key={emp.id} emp={emp} accentColor={dept.color}
                onClick={() => navigate(`/employees/${emp.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const counts = countByDept(employees, activeVertical)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 12,
    }}>
      {DEPARTMENTS.map(d => (
        <DeptCard key={d.id} dept={d} count={counts[d.id] || 0} onClick={() => setDept(d.id)} />
      ))}
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// TAB 3: Org Chart — hierarquia visual
// ───────────────────────────────────────────────────────────
function OrgChartTab({ employees, activeVertical, navigate }) {
  // Estrutura: CEO (Mário) → Department Heads → Members
  const counts = countByDept(employees, activeVertical)
  const depts = DEPARTMENTS.filter(d => (counts[d.id] || 0) > 0)

  // Identifica head de cada dept: primeiro agent com role contendo "Chef"/"Director"/"Manager"
  // ou simplesmente o primeiro da lista
  const headOf = (deptId) => {
    const list = employeesOfDept(employees, deptId, activeVertical)
    if (list.length === 0) return null
    const head = list.find(e =>
      /direct|chef|head|lead|manager|orquestr/i.test(e.role || '') ||
      /direct|chef|head|lead|manager|orquestr/i.test(e.name || '')
    )
    return head || list[0]
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Nível 1: CEO */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
        <div style={{
          background: 'var(--bg-card)', border: '2px solid var(--primary)',
          borderRadius: 10, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          minWidth: 260,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6b4fa0, #d2a8ff)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff',
          }}>M</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Mário Carvalho</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Founder · CEO · TOC</div>
            <div style={{
              fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--primary)', marginTop: 2, letterSpacing: '0.06em',
            }}>{employees.length} AGENTS · {depts.length} DEPTS</div>
          </div>
        </div>
      </div>

      {/* Linha conectora */}
      <div style={{
        width: 2, height: 20, background: 'var(--border)',
        margin: '-32px auto 0', position: 'relative', top: 0,
      }} />

      {/* Nível 2: Department Heads */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(depts.length, 4)}, minmax(180px, 1fr))`,
        gap: 16, justifyContent: 'center', maxWidth: 1100, margin: '0 auto 30px',
      }}>
        {depts.map((d, i) => {
          const head = headOf(d.id)
          const members = employeesOfDept(employees, d.id, activeVertical)
          return (
            <div key={d.id} style={{ position: 'relative' }}>
              {/* Linha vertical até CEO */}
              {i === 0 && (
                <div style={{
                  position: 'absolute', top: -20, left: '50%',
                  width: 2, height: 20, background: 'var(--border)',
                }} />
              )}
              {/* Dept head card */}
              <div style={{
                background: 'var(--bg-card)', border: `1px solid ${d.color}55`,
                borderTop: `3px solid ${d.color}`,
                borderRadius: 8, padding: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <DeptIcon name={d.icon} color={d.color} size={14} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: d.color,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>{d.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>{members.length}</span>
                </div>

                {head && (
                  <button
                    onClick={() => navigate(`/employees/${head.id}`)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)', borderRadius: 6,
                      padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: members.length > 1 ? 8 : 0,
                    }}
                  >
                    <Avatar emp={head} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{head.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {head.role}
                      </div>
                    </div>
                  </button>
                )}

                {/* Members (excluding head) */}
                {members.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {members.filter(m => m.id !== head?.id).slice(0, 5).map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/employees/${m.id}`)}
                        style={{
                          width: '100%', textAlign: 'left',
                          background: 'transparent', border: 'none',
                          padding: '4px 6px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 10, color: 'var(--text-dim)',
                          borderLeft: `2px solid ${d.color}33`,
                          borderRadius: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                      >
                        <Avatar emp={m} size={18} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {m.name}
                        </span>
                      </button>
                    ))}
                    {members.length > 6 && (
                      <span style={{ fontSize: 9, color: 'var(--text-dim)', padding: '2px 8px', fontStyle: 'italic' }}>
                        +{members.length - 6} mais
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer com totals */}
      <div style={{
        textAlign: 'center', marginTop: 20,
        fontSize: 11, color: 'var(--text-dim)',
        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em',
      }}>
        {employees.length} agents · {depts.length} departamentos activos
        {activeVertical !== 'all' && ` · ${activeVertical}`}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// EmployeesPage: container com tabs + URL state
// ───────────────────────────────────────────────────────────
function matchVertical(emp, activeV) {
  if (activeV === 'all') return true
  const v = activeV.toUpperCase()
  if ((emp.vertical || '').toUpperCase().startsWith(v)) return true
  return (emp.secondary_verticals || []).some(sv => sv.toUpperCase().startsWith(v))
}

export default function EmployeesPage({ data: dataProp }) {
  const navigate = useNavigate()
  const { activeVertical } = useVerticalStore()
  const { data: dataHook } = useData()
  const data = dataProp || dataHook
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'overview'
  const drillDept = searchParams.get('dept') || null

  const setTab = (t) => {
    setSearchParams({ tab: t })
  }
  const setDept = (deptId) => {
    if (deptId) setSearchParams({ tab: 'departments', dept: deptId })
    else        setSearchParams({ tab: 'departments' })
  }

  const allEmployees = data?.employees || []
  const employees = useMemo(
    () => allEmployees.filter(e => matchVertical(e, activeVertical)),
    [allEmployees, activeVertical]
  )

  const activeCount = employees.filter(e => e.status === 'active').length
  const totalCost = employees.reduce((s, e) => s + (e.cost?.current || 0), 0)
  const counts = countByDept(employees, activeVertical)
  const deptsActiveCount = Object.values(counts).filter(c => c > 0).length

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      {/* Header com title + action buttons topo direito */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Team
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
            {employees.length} agents · {activeCount} activos · {deptsActiveCount} departamentos · ~${totalCost}/mês
            {activeVertical !== 'all' && ` · filtrado por ${activeVertical}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Tabs */}
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <TabButton active={tab === 'overview'}    onClick={() => setTab('overview')}    icon={Users}     label="Overview" />
            <TabButton active={tab === 'departments'} onClick={() => setTab('departments')} icon={Briefcase} label="Departments" />
            <TabButton active={tab === 'org-chart'}   onClick={() => setTab('org-chart')}   icon={Network}   label="Team Org Chart" />
          </div>

          {/* Invite (primary) */}
          <button
            onClick={() => alert('Invite flow ainda não implementado — adicionar via .meta.json + skill files.')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 6,
              background: 'var(--primary)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <UserPlus size={13} /> Invite
          </button>
        </div>
      </div>

      {/* Tab content */}
      {allEmployees.length === 0 ? (
        <div className="empty">Sem dados de employees</div>
      ) : employees.length === 0 ? (
        <div className="empty">
          Nenhum employee na vertical seleccionada
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 6 }}>
            Muda o filtro para "Todas as verticais" para ver todos
          </div>
        </div>
      ) : (
        <>
          {tab === 'overview'    && <OverviewTab employees={employees} navigate={navigate} />}
          {tab === 'departments' && <DepartmentsTab employees={employees} activeVertical={activeVertical} setDept={setDept} drillDept={drillDept} navigate={navigate} />}
          {tab === 'org-chart'   && <OrgChartTab employees={employees} activeVertical={activeVertical} navigate={navigate} />}
        </>
      )}
    </div>
  )
}
