// ActivityTimeline — timeline unificada de actividade por record
// Consome RPC core.get_activity_timeline → view core.activity_unified
// Props: recordType, recordId, sinceDays, limit

import { useState } from 'react'
import { useActivityTimeline } from '../../hooks/useActivityTimeline.js'
import AgentBadge from '../AgentBadge.jsx'

// Ícone + cor por source da actividade
function sourceIcon(source) {
  const map = {
    email:          { icon: '✉️', color: 'var(--blue)' },
    task:           { icon: '✅', color: 'var(--green)' },
    nota:           { icon: '📝', color: 'var(--gold)' },
    system_log:     { icon: '⚙️', color: 'var(--muted)' },
    iam_log:        { icon: '🔑', color: 'var(--purple)' },
    discovery:      { icon: '🔍', color: '#10b981' },
    approval:       { icon: '📋', color: 'var(--orange)' },
    crm_create:     { icon: '➕', color: 'var(--green)' },
    crm_update:     { icon: '✏️', color: 'var(--blue)' },
  }
  return map[source] ?? { icon: '📌', color: 'var(--muted)' }
}

// Agrupa entries por dia relativo
function groupByDay(entries) {
  const groups = {}
  const now = new Date()

  entries.forEach(e => {
    const d = new Date(e.occurred_at || e.created_at)
    const diffDays = Math.floor((now - d) / 86400000)
    let label
    if (diffDays === 0) label = 'Hoje'
    else if (diffDays === 1) label = 'Ontem'
    else if (diffDays < 7) label = `Há ${diffDays} dias`
    else label = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })

    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })

  return groups
}

function TimeEntry({ entry }) {
  const d = new Date(entry.occurred_at || entry.created_at)
  const timeStr = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  const { icon, color } = sourceIcon(entry.source_kind || entry.event_type)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '50px 24px 1fr auto',
      gap: 8,
      padding: '8px 0',
      alignItems: 'start',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* hora */}
      <span style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, paddingTop: 2 }}>
        {timeStr}
      </span>

      {/* ícone circular */}
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        background: color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11,
      }}>
        {icon}
      </span>

      {/* corpo */}
      <div style={{ fontSize: 12 }}>
        <div style={{ color: 'var(--text)', fontWeight: 500 }}>
          {entry.title || entry.event_description || '—'}
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {entry.actor_agent_slug && (
            <AgentBadge agent_slug={entry.actor_agent_slug} />
          )}
          {entry.source_kind && (
            <span style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: 'uppercase' }}>
              {entry.source_kind}
            </span>
          )}
        </div>
        {entry.preview && (
          <div style={{
            color: 'var(--text-dim)', fontSize: 11, marginTop: 4,
            paddingLeft: 8, borderLeft: '2px solid var(--border)',
          }}>
            {entry.preview}
          </div>
        )}
      </div>

      {/* link "ver" */}
      {entry.source_url && (
        <a
          href={entry.source_url}
          style={{ color: 'var(--blue)', fontSize: 10, paddingTop: 2, textDecoration: 'none' }}
        >
          Ver
        </a>
      )}
    </div>
  )
}

const AGENTS = ['todos', 'humano', 'bia', 'iris', 'hermes', 'truth']

export default function ActivityTimeline({ recordType, recordId, sinceDays = 30, limit = 50 }) {
  const [agentFilter, setAgentFilter] = useState('todos')
  const { entries, loading, error } = useActivityTimeline({ recordType, recordId, sinceDays, limit })

  const filtered = agentFilter === 'todos'
    ? entries
    : agentFilter === 'humano'
      ? entries.filter(e => !e.actor_agent_slug || e.actor_agent_slug === 'human')
      : entries.filter(e => e.actor_agent_slug === agentFilter)

  const groups = groupByDay(filtered)

  return (
    <div>
      {/* Filtro por agente */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center' }}>Por agente:</span>
        {AGENTS.map(a => (
          <button
            key={a}
            onClick={() => setAgentFilter(a)}
            style={{
              background: agentFilter === a ? 'var(--purple)' : 'var(--surface2)',
              color: agentFilter === a ? '#000' : 'var(--text-dim)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'capitalize',
            }}
          >
            {a === 'todos' ? 'Todos' : a}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '20px 0' }}>A carregar actividade...</div>
      )}

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, padding: '20px 0' }}>Erro: {error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 0',
          color: 'var(--text-dim)', fontSize: 12,
        }}>
          Sem actividade ainda — todas as interacções aparecem aqui automaticamente.
        </div>
      )}

      {!loading && Object.entries(groups).map(([day, dayEntries]) => (
        <div key={day}>
          <div style={{
            fontSize: 9,
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '12px 0 6px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 4,
            letterSpacing: '0.04em',
            fontWeight: 600,
          }}>
            {day}
          </div>
          {dayEntries.map((e, i) => (
            <TimeEntry key={e.id ?? `${day}-${i}`} entry={e} />
          ))}
        </div>
      ))}
    </div>
  )
}
