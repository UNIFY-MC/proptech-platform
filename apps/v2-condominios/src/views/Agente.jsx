import { useParams, Link } from 'react-router-dom'
import { EmployeeHeader } from '@proptech/ui'
import { findAgent } from '../lib/agents.js'

const TRIGGER_STYLE = {
  event:    { bg: 'rgba(59,130,246,0.12)',  color: 'var(--info)' },
  schedule: { bg: 'rgba(245,158,11,0.12)',  color: 'var(--warning)' },
  manual:   { bg: 'rgba(107,114,128,0.15)', color: 'var(--text-dim)' },
}

export default function Agente() {
  const { slug } = useParams()
  const emp = findAgent(slug)

  if (!emp) {
    return (
      <div>
        <h1>Agente não encontrado</h1>
        <p style={{ color: 'var(--text-dim)' }}>O slug <code className="mono">{slug}</code> não corresponde a nenhum dos 10 agentes condo.</p>
        <Link to="/" style={{ color: 'var(--primary)' }}>← Voltar ao Dashboard</Link>
      </div>
    )
  }

  const ts = TRIGGER_STYLE[emp.trigger] ?? TRIGGER_STYLE.manual

  return (
    <div>
      <EmployeeHeader emp={emp} />

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px 18px', marginBottom: 14,
      }}>
        <SectionTitle>O que faz</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: '4px 0 0' }}>
          {emp.description}
        </p>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px 18px', marginBottom: 14,
      }}>
        <SectionTitle>Trigger</SectionTitle>
        <span style={{
          fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
          padding: '2px 8px', borderRadius: 3, ...ts,
        }}>
          {emp.trigger}
        </span>
        <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-dim)' }}>
          {emp.trigger === 'event' && 'Disparado por entradas em system.inbox_items'}
          {emp.trigger === 'schedule' && 'Supabase Cron (ver ADR-condo-001 — 9 schedules)'}
          {emp.trigger === 'manual' && 'Invocado por outro agente ou Mário'}
        </span>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px 18px',
      }}>
        <SectionTitle>Ficheiro fonte</SectionTitle>
        <code className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          .claude/agents/{emp.slug}.md
        </code>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          Skills, recipes e instructions completas vivem no ficheiro. Roadmap: importar via parser para esta página (igual ao <code className="mono">apps/dashboard/views/EmployeePage</code>).
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)',
      marginBottom: 4,
    }}>{children}</div>
  )
}
