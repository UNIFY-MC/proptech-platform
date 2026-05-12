import { Link } from 'react-router-dom'
import { CONDO_AGENTS } from '../lib/agents.js'

const ATALHOS = [
  { to: '/prestacao-contas',    title: 'Prestação de Contas', desc: 'KPIs financeiros + Visão Geral do exercício actual' },
  { to: '/divida-actual-2026',  title: 'Dívida Actual',       desc: 'Aging por fracção · avisos 1º/2º · escalações' },
  { to: '/faturas',             title: 'Faturas / OCR',       desc: 'Faturas a pagar com fornecedores + pipeline Dora' },
  { to: '/inbox',               title: 'Inbox',               desc: 'Eventos e alertas em tempo real dos agentes' },
  { to: '/approvals',           title: 'Approvals',           desc: 'Acções pendentes de aprovação' },
  { to: '/chat',                title: 'Chat',                desc: 'Conversar com Otto e roteamento automático' },
]

export default function Inicio() {
  return (
    <div>
      <h1>Início</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 20 }}>
        Atalhos para as áreas com maior actividade no condomínio activo.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 28 }}>
        {ATALHOS.map(a => (
          <Link
            key={a.to}
            to={a.to}
            style={{
              display: 'block',
              padding: '14px 16px',
              background: 'var(--sf)',
              border: '1px solid var(--bd)',
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'border-color 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--go)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>{a.title}</div>
            <div className="dim" style={{ fontSize: 11 }}>{a.desc}</div>
          </Link>
        ))}
      </div>

      <h2>Equipa AI</h2>
      <p className="dim" style={{ fontSize: 12, marginTop: -8, marginBottom: 12 }}>
        Os 10 employees que gerem o condomínio. Clica para ver skills.
      </p>

      <div className="agent-grid">
        {CONDO_AGENTS.map(a => (
          <Link
            key={a.slug}
            to={`/agentes/${a.slug}`}
            className="agent-card"
            style={{ textDecoration: 'none' }}
          >
            <div className="agent-card-head">
              <div className="agent-avatar">{a.avatarInitial ?? a.name[0]}</div>
              <div style={{ minWidth: 0 }}>
                <div className="agent-card-name">{a.name}</div>
                <div className="agent-card-role">{a.role}</div>
              </div>
            </div>
            <div className={`agent-card-status status-${a.status}`}>{a.status}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
