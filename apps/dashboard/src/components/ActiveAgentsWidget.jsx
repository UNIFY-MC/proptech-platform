// ActiveAgentsWidget — sidebar widget CookAI-style "TASKS · CHATS"
//
// Localização: fim da sidebar antes do footer Cook.ai
// Tabs TASKS | CHATS toggle · lista 7 dept heads expansíveis
// Click no agent → expande tasks recentes ou chats placeholder
// Filtra por activeVertical (multi-tenant)

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MoreHorizontal, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

const DEPT_AGENTS = [
  { id: 'bia',                  name: 'Bia',                  emoji: '🛠️' },
  { id: 'diretor-marketing',    name: 'Diretor Marketing',    emoji: '📢' },
  { id: 'gestor-leads',         name: 'Gestor Leads',         emoji: '🎯' },
  { id: 'orquestrador-condo',   name: 'Orquestrador Condo',   emoji: '🧠' },
  { id: 'financeiro-condo',     name: 'Financeiro Condo',     emoji: '💰' },
  { id: 'atendimento-condo',    name: 'Atendimento Condo',    emoji: '💬' },
  { id: 'compliance-condo',     name: 'Compliance Condo',     emoji: '⚖️' },
  { id: null,                   name: 'Unassigned',           emoji: '👤' },
]

export default function ActiveAgentsWidget() {
  const { activeVertical } = useVerticalStore()
  const [tab, setTab] = useState('tasks')  // 'tasks' | 'chats'
  const [expanded, setExpanded] = useState(null)
  const [tasksByAgent, setTasksByAgent] = useState({})
  const [loading, setLoading] = useState(false)

  // Fetch counts por agent
  useEffect(() => {
    if (!supabase || tab !== 'tasks') return
    setLoading(true)
    let q = supabase.from('system_tasks').select('id, title, status, owner_agent_id, updated_at')
      .in('status', ['open', 'in_progress', 'needs_human'])
      .order('updated_at', { ascending: false })
      .limit(50)
    if (activeVertical && activeVertical !== 'all') q = q.ilike('vertical', activeVertical)
    q.then(({ data }) => {
      const grouped = {}
      for (const t of data || []) {
        const key = t.owner_agent_id || 'unassigned'
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(t)
      }
      setTasksByAgent(grouped)
      setLoading(false)
    })
  }, [activeVertical, tab])

  const getCount = (agentId) => {
    const key = agentId || 'unassigned'
    return (tasksByAgent[key] || []).length
  }

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '10px 12px',
      marginTop: 'auto',
    }}>
      {/* Tabs TASKS · CHATS */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setTab('tasks')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 0',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'JetBrains Mono, monospace',
              color: tab === 'tasks' ? '#10b981' : 'var(--text-dim)',
              borderBottom: tab === 'tasks' ? '2px solid #10b981' : '2px solid transparent',
              paddingBottom: 4,
            }}
          >TASKS</button>
          <button
            onClick={() => setTab('chats')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 0',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'JetBrains Mono, monospace',
              color: tab === 'chats' ? '#10b981' : 'var(--text-dim)',
              borderBottom: tab === 'chats' ? '2px solid #10b981' : '2px solid transparent',
              paddingBottom: 4,
            }}
          >CHATS</button>
        </div>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2,
        }}><MoreHorizontal size={12} /></button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 8, textAlign: 'center' }}>
          <Loader2 size={12} className="spin" style={{ color: 'var(--text-dim)' }} />
        </div>
      )}

      {/* Agent list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280, overflowY: 'auto' }}>
        {DEPT_AGENTS.map(agent => {
          const count = getCount(agent.id)
          const isExpanded = expanded === (agent.id || 'unassigned')
          const tasks = (tasksByAgent[agent.id || 'unassigned'] || []).slice(0, 5)
          return (
            <div key={agent.id || 'unassigned'}>
              <button
                onClick={() => setExpanded(isExpanded ? null : (agent.id || 'unassigned'))}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0',
                  color: 'var(--text)',
                  textAlign: 'left',
                  borderRadius: 4,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6b4fa0, #d2a8ff)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff', flexShrink: 0,
                }}>{agent.emoji}</span>
                <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agent.name}
                </span>
                {count > 0 && tab === 'tasks' && (
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 3,
                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                  }}>{count}</span>
                )}
                <ChevronRight
                  size={11}
                  style={{
                    color: 'var(--text-dim)',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.12s',
                  }}
                />
              </button>

              {/* Expanded list */}
              {isExpanded && tab === 'tasks' && (
                <div style={{ padding: '4px 0 4px 26px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {tasks.length === 0 ? (
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      Sem tasks activas.
                    </span>
                  ) : (
                    <>
                      {tasks.map(t => (
                        <Link
                          key={t.id}
                          to={`/tasks/${t.id}`}
                          style={{
                            fontSize: 11,
                            color: 'var(--text-dim)',
                            textDecoration: 'none',
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '3px 4px',
                            borderRadius: 3,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)' }}
                        >
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: t.status === 'needs_human' ? '#f59e0b'
                                     : t.status === 'in_progress' ? '#3b82f6'
                                     : 'var(--text-dim)',
                            flexShrink: 0,
                          }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.title}
                          </span>
                        </Link>
                      ))}
                      {count > 5 && (
                        <Link
                          to={`/tasks?owner=${agent.id || ''}`}
                          style={{ fontSize: 10, color: 'var(--primary)', textDecoration: 'none', padding: '2px 4px' }}
                        >+{count - 5} mais</Link>
                      )}
                    </>
                  )}
                </div>
              )}

              {isExpanded && tab === 'chats' && (
                <div style={{ padding: '4px 0 4px 26px' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Chat history coming soon — usa <Link to="/chat" style={{ color: 'var(--primary)' }}>/chat</Link> para falar agora.
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
