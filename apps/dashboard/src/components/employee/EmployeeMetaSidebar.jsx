// EmployeeMetaSidebar — versão generalizada de BiaMetaSidebar
// Recebe profile (system.agent_profile row) + hidden flag
// Skills: count partilhado (repositório global)

import { Link } from 'react-router-dom'
import { useSkillsCount } from '../../hooks/useSkillsCount.js'

function MetaBlock({ title, children }) {
  return (
    <div className="bia-meta-block">
      <div className="bia-meta-head">{title}</div>
      <div className="bia-meta-body">{children}</div>
    </div>
  )
}

export default function EmployeeMetaSidebar({ hidden, profile }) {
  const { count, loading } = useSkillsCount()

  if (hidden) return null

  const peerReads = profile?.peer_reads || []
  const cost      = profile?.cost       || {}

  return (
    <aside className="bia-meta-sidebar">
      {/* Skills */}
      <MetaBlock title="Skills">
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
            {loading ? '—' : count}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, marginBottom: 8 }}>
            disponíveis no repositório
          </div>
          <Link to="/skills" style={{
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--info)', textDecoration: 'none',
          }}>
            ver repositório /skills →
          </Link>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.55 }}>
            O agente pesquisa e usa skills daqui consoante a necessidade (runtime).
          </div>
        </div>
      </MetaBlock>

      {/* Description */}
      {profile?.description && (
        <MetaBlock title="Descrição">
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            {profile.description}
          </div>
        </MetaBlock>
      )}

      {/* Peer Reads */}
      <MetaBlock title="Peer Reads">
        {peerReads.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>—</div>
        ) : peerReads.map((p, idx) => (
          <div key={idx} className={`bia-peer-row${p.sprint === 'current' ? ' current' : ''}`}>
            <span className="bia-peer-sprint bia-mono">{p.sprint}</span>
            <span className="bia-peer-agents">
              {!p.value || p.value.includes('none') ? '─ none' : `▸ ${p.value}`}
            </span>
          </div>
        ))}
      </MetaBlock>

      {/* Cost */}
      <MetaBlock title="Cost">
        <div className="bia-cost-row">
          <span className="label bia-mono">1E</span>
          <span className="value bia-mono">{cost.sprint_1e || '—'}</span>
        </div>
        <div className="bia-cost-row">
          <span className="label bia-mono">1F</span>
          <span className="value bia-mono">{cost.sprint_1f || '—'}</span>
        </div>
        {cost.notes && <div className="bia-cost-note">{cost.notes}</div>}
      </MetaBlock>
    </aside>
  )
}
