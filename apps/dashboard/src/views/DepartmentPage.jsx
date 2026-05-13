// DepartmentPage — /departments e /departments/:slug
//
// /departments       → visão geral: grid de 8 dept cards
// /departments/:slug → drill-in: header cor + lista de agents desse dept
//
// Counters reactivos ao filtro vertical do Topbar (useVerticalStore)

import * as Icons from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useVerticalStore } from '../store'
import { useData } from '../hooks/useData.js'
import { DEPARTMENTS, deptFor, employeesOfDept, countByDept } from '../lib/departments.js'

const FALLBACK_ICON = Icons.Briefcase

function DeptIcon({ name, size = 18, color }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ color, flexShrink: 0 }} />
}

function DeptCard({ dept, count, planned }) {
  return (
    <Link
      to={`/departments/${dept.id}`}
      style={{
        textDecoration: 'none',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${dept.color}`,
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity: planned ? 0.55 : 1,
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <DeptIcon name={dept.icon} color={dept.color} />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--text)',
        }}>{count}</span>
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
        {dept.label}
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
        {planned ? 'Planeado · sem agents' : `${count} agent${count === 1 ? '' : 's'}`}
      </div>
    </Link>
  )
}

function AgentRow({ emp }) {
  return (
    <Link
      to={`/employees/${emp.id}`}
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        marginBottom: 6,
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.85rem', fontWeight: 700, color: '#fff',
        flexShrink: 0,
      }}>
        {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{emp.name}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          {emp.role}
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: 4,
        flexShrink: 0,
      }}>
        {(emp.verticals || [emp.vertical].filter(Boolean)).map(v => (
          <span key={v} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.6rem',
            padding: '2px 6px',
            borderRadius: 3,
            background: 'var(--bg-elevated)',
            color: 'var(--text-dim)',
            fontWeight: 600,
          }}>{v}</span>
        ))}
      </div>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.6rem',
        padding: '2px 6px',
        borderRadius: 10,
        background: emp.status === 'active' ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
        color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
        fontWeight: 600,
        flexShrink: 0,
      }}>{emp.status || 'draft'}</span>
    </Link>
  )
}

export default function DepartmentPage() {
  const { slug } = useParams()
  const { activeVertical } = useVerticalStore()
  const { data } = useData()
  const employees = data?.employees || []

  // ── Visão geral ────────────────────────────
  if (!slug) {
    const counts = countByDept(employees, activeVertical)
    const totalAll = Object.values(counts).reduce((a, b) => a + b, 0)

    return (
      <div style={{ maxWidth: 1200 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Departments
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 0' }}>
            {totalAll} agents distribuídos em {DEPARTMENTS.filter(d => !d.planned).length} departamentos horizontais
            {activeVertical !== 'all' && ` · filtrado por ${activeVertical}`}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}>
          {DEPARTMENTS.map(d => (
            <DeptCard
              key={d.id}
              dept={d}
              count={counts[d.id] || 0}
              planned={d.planned}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Drill-in num dept ────────────────────────────
  const dept = deptFor(slug)
  if (!dept) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text)' }}>Departamento não encontrado</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          Slug <code>{slug}</code> não existe em DEPARTMENTS.
        </p>
        <Link to="/departments" style={{ color: 'var(--primary)' }}>← Voltar</Link>
      </div>
    )
  }

  const agents = employeesOfDept(employees, dept.id, activeVertical)

  return (
    <div style={{ maxWidth: 1100 }}>
      <Link to="/departments" style={{
        fontSize: '0.72rem',
        color: 'var(--text-dim)',
        textDecoration: 'none',
        display: 'inline-block',
        marginBottom: 12,
      }}>← Departments</Link>

      {/* Header colorido do dept */}
      <div style={{
        background: 'var(--bg-card)',
        borderLeft: `4px solid ${dept.color}`,
        borderRadius: 8,
        padding: '20px 22px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10,
          background: `${dept.color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <DeptIcon name={dept.icon} size={26} color={dept.color} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            {dept.label}
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '4px 0 0' }}>
            {agents.length} agent{agents.length === 1 ? '' : 's'} activo{agents.length === 1 ? '' : 's'}
            {activeVertical !== 'all' && ` · filtrado por ${activeVertical}`}
            {dept.planned && ' · departamento planeado'}
          </p>
        </div>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '1.8rem',
          fontWeight: 700,
          color: dept.color,
        }}>{agents.length}</span>
      </div>

      {/* Lista de agents */}
      {agents.length === 0 ? (
        <div style={{
          padding: 32,
          textAlign: 'center',
          background: 'var(--bg-card)',
          border: '1px dashed var(--border)',
          borderRadius: 8,
          color: 'var(--text-dim)',
          fontSize: '0.82rem',
        }}>
          {dept.planned
            ? 'Departamento planeado — sem agents activos ainda.'
            : `Sem agents neste departamento${activeVertical !== 'all' ? ` para ${activeVertical}` : ''}.`}
        </div>
      ) : (
        <div>
          {agents.map(emp => <AgentRow key={emp.id} emp={emp} />)}
        </div>
      )}
    </div>
  )
}
