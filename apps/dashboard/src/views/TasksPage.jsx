// TasksPage — /tasks · kanban-lite com 5 colunas de status
// Drag & drop entre colunas → updateStatus RPC

import { useState, useMemo } from 'react'
import { Plus, Lightbulb, ChevronDown, X, CheckCircle2, CircleDot, Pause, BanIcon, Trash2 } from 'lucide-react'
import { useTasks } from '../hooks/useTasks.js'
import { useData } from '../hooks/useData.js'
import { useVerticalStore } from '../store'

const STATUS_COLS = [
  { id: 'open',         label: 'Aberta',       color: '#3b82f6', icon: CircleDot },
  { id: 'in_progress',  label: 'Em curso',     color: '#f59e0b', icon: Pause },
  { id: 'blocked',      label: 'Bloqueada',    color: '#ef4444', icon: BanIcon },
  { id: 'done',         label: 'Concluída',    color: '#10b981', icon: CheckCircle2 },
  { id: 'cancelled',    label: 'Cancelada',    color: '#6b7280', icon: Trash2 },
]

const KIND_BADGE = {
  task:     { color: '#3b82f6', label: 'TASK' },
  idea:     { color: '#f59e0b', label: 'IDEA' },
  followup: { color: '#8b5cf6', label: 'FU' },
  reminder: { color: '#06b6d4', label: 'REM' },
}

function TaskCard({ task, onMove, onAssign, employees }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showAssignMenu, setShowAssignMenu] = useState(false)
  const kindMeta = KIND_BADGE[task.kind] || KIND_BADGE.task
  const owner = task.owner_agent_id ? employees.find(e => e.id === task.owner_agent_id) : null

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '10px 12px',
      marginBottom: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <span style={{
          fontSize: '0.55rem',
          padding: '1px 5px',
          borderRadius: 3,
          background: `${kindMeta.color}22`,
          color: kindMeta.color,
          fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          flexShrink: 0,
        }}>{kindMeta.label}</span>
        {task.vertical && (
          <span style={{
            fontSize: '0.55rem',
            color: 'var(--text-dim)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>{task.vertical.toUpperCase()}</span>
        )}
      </div>

      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
        {task.title}
      </div>

      {task.description_md && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.4, maxHeight: 50, overflow: 'hidden' }}>
          {task.description_md.slice(0, 120)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        {/* Owner */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button
            onClick={() => setShowAssignMenu(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '2px 6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: '0.62rem',
              maxWidth: '100%',
            }}
          >
            {owner ? (
              <>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.5rem', fontWeight: 700, color: '#fff',
                }}>{owner.avatarInitial}</div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner.name}</span>
              </>
            ) : <span style={{ color: 'var(--text-dim)' }}>Atribuir…</span>}
          </button>
          {showAssignMenu && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 5,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 4, minWidth: 180,
              maxHeight: 260, overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              <button onClick={() => { onAssign(null); setShowAssignMenu(false) }}
                style={menuItem}>— sem owner —</button>
              {employees.map(e => (
                <button key={e.id} onClick={() => { onAssign(e.id); setShowAssignMenu(false) }}
                  style={menuItem}>{e.name} · <span style={{ color: 'var(--text-dim)' }}>{e.department}</span></button>
              ))}
            </div>
          )}
        </div>

        {/* Status changer */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowStatusMenu(s => !s)}
            style={{
              padding: '2px 6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--text-dim)',
              fontSize: '0.62rem',
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}
          >Mover <ChevronDown size={10} /></button>
          {showStatusMenu && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 5,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 4, minWidth: 140,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              {STATUS_COLS.filter(c => c.id !== task.status).map(c => (
                <button key={c.id} onClick={() => { onMove(c.id); setShowStatusMenu(false) }}
                  style={menuItem}>→ {c.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const menuItem = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '6px 10px', background: 'none', border: 'none',
  cursor: 'pointer', color: 'var(--text)', fontSize: '0.72rem',
  borderRadius: 4,
}

function CreateTaskModal({ onClose, onCreate, employees }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [kind, setKind] = useState('task')
  const [vertical, setVertical] = useState('')
  const [ownerAgent, setOwnerAgent] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      description_md: desc.trim() || null,
      kind,
      vertical: vertical || null,
      owner_agent_id: ownerAgent || null,
    })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 20, width: 480, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Nova task</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Título da task"
            autoFocus
            style={inputStyle}
          />
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Descrição (markdown opcional)"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={kind} onChange={e => setKind(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="task">Task</option>
              <option value="idea">Ideia</option>
              <option value="followup">Follow-up</option>
              <option value="reminder">Lembrete</option>
            </select>
            <select value={vertical} onChange={e => setVertical(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Sem vertical</option>
              <option value="v2">V2 Condomínios</option>
              <option value="v3">V3 Seguros</option>
              <option value="v4">V4 Energia</option>
              <option value="v5">V5 Manutenção</option>
              <option value="v10">V10 Owners</option>
            </select>
          </div>
          <select value={ownerAgent} onChange={e => setOwnerAgent(e.target.value)} style={inputStyle}>
            <option value="">— sem owner —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} · {e.department}</option>
            ))}
          </select>
          <button type="submit" style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            padding: '8px 14px', borderRadius: 5, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
          }}>Criar</button>
        </div>
      </form>
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '7px 10px',
  borderRadius: 5,
  fontSize: '0.78rem',
  outline: 'none',
  fontFamily: 'inherit',
}

export default function TasksPage() {
  const { activeVertical } = useVerticalStore()
  const { data } = useData()
  const employees = data?.employees || []
  const verticalFilter = activeVertical === 'all' ? null : activeVertical.toLowerCase()
  const { tasks, createTask, updateStatus, assign } = useTasks({ vertical: verticalFilter })
  const [createOpen, setCreateOpen] = useState(false)

  const byStatus = useMemo(() => {
    const groups = {}
    for (const c of STATUS_COLS) groups[c.id] = []
    for (const t of tasks) (groups[t.status] || groups.open).push(t)
    return groups
  }, [tasks])

  return (
    <div style={{ padding: '4px 4px 80px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '4px 8px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>Tasks</h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {tasks.length} task{tasks.length === 1 ? '' : 's'} {verticalFilter ? `· ${activeVertical}` : '· todas verticais'}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
            fontSize: '0.74rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
        ><Plus size={13} /> Nova task</button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 10,
        minHeight: 'calc(100vh - 200px)',
      }}>
        {STATUS_COLS.map(col => {
          const Icon = col.icon
          const items = byStatus[col.id] || []
          return (
            <div key={col.id} style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 8,
              borderTop: `3px solid ${col.color}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px 10px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: col.color,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                <Icon size={11} />
                <span>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>
                  {items.length}
                </span>
              </div>
              {items.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  employees={employees}
                  onMove={(newStatus) => updateStatus(t.id, newStatus)}
                  onAssign={(agentId) => assign(t.id, { agentId })}
                />
              ))}
              {items.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                  vazio
                </div>
              )}
            </div>
          )
        })}
      </div>

      {createOpen && (
        <CreateTaskModal
          onClose={() => setCreateOpen(false)}
          onCreate={createTask}
          employees={employees}
        />
      )}
    </div>
  )
}
