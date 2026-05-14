// TasksPage — /tasks · Kanban + List view com filtros próprios
// Não usa vertical filter global do Topbar (esse é só para inbox/dashboard)
// Filtros próprios: Assignee, Vertical, Status, Search

import { useState, useMemo } from 'react'
import {
  Plus, Lightbulb, ChevronDown, X, CheckCircle2, CircleDot, Pause, Trash2,
  LayoutGrid, List, Filter, Calendar, User, Briefcase, Tag, Search, AlertCircle,
} from 'lucide-react'
import { useTasks } from '../hooks/useTasks.js'
import { useData } from '../hooks/useData.js'

const STATUS_COLS = [
  { id: 'open',         label: 'Aberta',       color: '#3b82f6', icon: CircleDot },
  { id: 'in_progress',  label: 'Em curso',     color: '#f59e0b', icon: Pause },
  { id: 'blocked',      label: 'Bloqueada',    color: '#ef4444', icon: AlertCircle },
  { id: 'done',         label: 'Concluída',    color: '#10b981', icon: CheckCircle2 },
  { id: 'cancelled',    label: 'Cancelada',    color: '#6b7280', icon: Trash2 },
]

const KIND_BADGE = {
  task:     { color: '#3b82f6', label: 'TASK' },
  idea:     { color: '#f59e0b', label: 'IDEA' },
  followup: { color: '#8b5cf6', label: 'FU' },
  reminder: { color: '#06b6d4', label: 'REM' },
}

const PRIORITY_META = {
  low:    { color: '#6b7280', label: 'Low' },
  normal: { color: '#3b82f6', label: 'Normal' },
  high:   { color: '#f59e0b', label: 'High' },
  urgent: { color: '#ef4444', label: 'Urgent' },
}

const VERTICALS = [
  { id: 'all', label: 'All' },
  { id: 'v2',  label: 'V2' },
  { id: 'v3',  label: 'V3' },
  { id: 'v4',  label: 'V4' },
  { id: 'v5',  label: 'V5' },
  { id: 'v6',  label: 'V6' },
  { id: 'v7',  label: 'V7' },
  { id: 'v8',  label: 'V8' },
  { id: 'v10', label: 'V10' },
]

export default function TasksPage() {
  const { data } = useData()
  const employees = data?.employees || []
  // Tasks page não usa vertical filter global — tem o seu próprio
  const { tasks, createTask, updateStatus, assign } = useTasks({})

  // Local filters
  const [view, setView] = useState('board')  // 'board' | 'list'
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [verticalFilter, setVerticalFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned' && t.owner_agent_id) return false
        if (assigneeFilter !== 'unassigned' && t.owner_agent_id !== assigneeFilter) return false
      }
      if (verticalFilter !== 'all') {
        if (verticalFilter === 'none' && t.vertical) return false
        if (verticalFilter !== 'none' && t.vertical !== verticalFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!t.title?.toLowerCase().includes(q) && !t.description_md?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [tasks, assigneeFilter, verticalFilter, search])

  const byStatus = useMemo(() => {
    const groups = {}
    for (const c of STATUS_COLS) groups[c.id] = []
    for (const t of filtered) (groups[t.status] || groups.open).push(t)
    return groups
  }, [filtered])

  // Tabs por assignee no sidebar
  const assigneesWithCount = useMemo(() => {
    const counts = { all: tasks.length, unassigned: 0 }
    for (const t of tasks) {
      if (!t.owner_agent_id) counts.unassigned++
      else counts[t.owner_agent_id] = (counts[t.owner_agent_id] || 0) + 1
    }
    return counts
  }, [tasks])

  return (
    <div style={{ padding: '4px 4px 80px', display: 'flex', gap: 16 }}>
      {/* Sidebar com assignees */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 10, height: 'fit-content',
        position: 'sticky', top: 64,
      }}>
        <div style={{
          fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 8, padding: '0 6px',
        }}>Assignee</div>
        <button onClick={() => setAssigneeFilter('all')} style={asideBtn(assigneeFilter === 'all')}>
          <span style={{ flex: 1, textAlign: 'left' }}>Todos</span>
          <span style={asideCount}>{assigneesWithCount.all}</span>
        </button>
        <button onClick={() => setAssigneeFilter('unassigned')} style={asideBtn(assigneeFilter === 'unassigned')}>
          <span style={{ flex: 1, textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <User size={12} color="var(--text-dim)" /> Unassigned
          </span>
          <span style={asideCount}>{assigneesWithCount.unassigned}</span>
        </button>
        <div style={{ height: 8 }} />
        {employees.filter(e => assigneesWithCount[e.id]).map(e => (
          <button key={e.id} onClick={() => setAssigneeFilter(e.id)}
            style={asideBtn(assigneeFilter === e.id)}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.55rem', fontWeight: 700, flexShrink: 0,
            }}>{e.avatarInitial}</div>
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.name}
            </span>
            <span style={asideCount}>{assigneesWithCount[e.id]}</span>
          </button>
        ))}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '4px 8px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>Tasks</h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {filtered.length} task{filtered.length === 1 ? '' : 's'} {filtered.length !== tasks.length && `· ${tasks.length} total`}
            </p>
          </div>
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text)', padding: '5px 10px 5px 26px',
                borderRadius: 5, fontSize: '0.72rem',
                outline: 'none', width: 180,
              }} />
          </div>

          {/* Vertical filter */}
          <select value={verticalFilter} onChange={e => setVerticalFilter(e.target.value)} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '5px 10px', borderRadius: 5,
            fontSize: '0.72rem', outline: 'none', cursor: 'pointer',
          }}>
            <option value="all">Todas verticais</option>
            <option value="none">Sem vertical</option>
            {VERTICALS.slice(1).map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>

          {/* View toggle Kanban/List */}
          <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--bg-elevated)', borderRadius: 6 }}>
            <button onClick={() => setView('board')} style={viewBtn(view === 'board')}>
              <LayoutGrid size={11} /> Board
            </button>
            <button onClick={() => setView('list')} style={viewBtn(view === 'list')}>
              <List size={11} /> List
            </button>
          </div>

          {/* New task */}
          <button onClick={() => setCreateOpen(true)} style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}><Plus size={11} /> New Task</button>
        </div>

        {/* Content */}
        {view === 'board' ? (
          <KanbanView byStatus={byStatus} employees={employees}
            onMove={updateStatus} onAssign={(id, agentId) => assign(id, { agentId })} />
        ) : (
          <ListView tasks={filtered} employees={employees}
            onMove={updateStatus} onAssign={(id, agentId) => assign(id, { agentId })} />
        )}

        {filtered.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center',
            color: 'var(--text-dim)', fontSize: '0.85rem',
            background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8,
            marginTop: 12,
          }}>
            {tasks.length === 0
              ? 'Sem tasks ainda. Cria a primeira ou usa "Create task" num card do /inbox.'
              : 'Sem tasks com os filtros actuais.'}
          </div>
        )}
      </main>

      {createOpen && (
        <CreateTaskModal onClose={() => setCreateOpen(false)} onCreate={createTask} employees={employees} />
      )}
    </div>
  )
}

// ─── Kanban view (5 colunas) ──────────────────────────────────
function KanbanView({ byStatus, employees, onMove, onAssign }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10,
      minHeight: 'calc(100vh - 200px)',
    }}>
      {STATUS_COLS.map(col => {
        const Icon = col.icon
        const items = byStatus[col.id] || []
        return (
          <div key={col.id} style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 8,
            borderTop: `3px solid ${col.color}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 6px 10px',
              fontSize: '0.7rem', fontWeight: 700, color: col.color,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Icon size={11} /> {col.label}
              <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>{items.length}</span>
            </div>
            {items.map(t => (
              <TaskCard key={t.id} task={t} employees={employees}
                onMove={(s) => onMove(t.id, s)}
                onAssign={(agentId) => onAssign(t.id, agentId)} />
            ))}
            {items.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.65rem' }}>vazio</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── List view ────────────────────────────────────────────────
function ListView({ tasks, employees, onMove, onAssign }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 100px 100px 80px 120px 100px',
        gap: 10, padding: '8px 14px',
        background: 'var(--bg-elevated)',
        fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: '1px solid var(--border)',
      }}>
        <span></span>
        <span>Title</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Vertical</span>
        <span>Assignee</span>
        <span>Due</span>
      </div>
      {tasks.map(t => {
        const status = STATUS_COLS.find(s => s.id === t.status)
        const priority = PRIORITY_META[t.priority]
        const owner = employees.find(e => e.id === t.owner_agent_id)
        return (
          <div key={t.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 100px 100px 80px 120px 100px',
            gap: 10, padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.75rem', color: 'var(--text)',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: '0.5rem', padding: '1px 5px', borderRadius: 3,
              background: `${KIND_BADGE[t.kind]?.color || '#3b82f6'}22`,
              color: KIND_BADGE[t.kind]?.color || '#3b82f6',
              fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              textAlign: 'center',
            }}>{KIND_BADGE[t.kind]?.label || 'TASK'}</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              {t.description_md && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {t.description_md.slice(0, 80)}
                </div>
              )}
            </div>
            <select value={t.status} onChange={e => onMove(t.id, e.target.value)} style={miniSelect(status?.color)}>
              {STATUS_COLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <span style={{
              padding: '2px 6px', borderRadius: 3, fontSize: '0.62rem',
              background: `${priority?.color}22`, color: priority?.color,
              fontWeight: 600, textAlign: 'center',
            }}>{priority?.label || t.priority}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-dim)' }}>
              {t.vertical?.toUpperCase() || '—'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {owner ? (
                <>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.55rem', fontWeight: 700,
                  }}>{owner.avatarInitial}</div>
                  <span style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {owner.name}
                  </span>
                </>
              ) : <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>—</span>}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              {t.due_at ? new Date(t.due_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── TaskCard kanban ──────────────────────────────────────────
function TaskCard({ task, employees, onMove, onAssign }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showAssignMenu, setShowAssignMenu] = useState(false)
  const kindMeta = KIND_BADGE[task.kind] || KIND_BADGE.task
  const priority = PRIORITY_META[task.priority]
  const owner = task.owner_agent_id ? employees.find(e => e.id === task.owner_agent_id) : null

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${priority?.color || '#3b82f6'}`,
      borderRadius: 6, padding: '10px 12px', marginBottom: 8,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <span style={{
          fontSize: '0.5rem', padding: '1px 5px', borderRadius: 3,
          background: `${kindMeta.color}22`, color: kindMeta.color,
          fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
        }}>{kindMeta.label}</span>
        {task.vertical && (
          <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{task.vertical.toUpperCase()}</span>
        )}
      </div>
      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{task.title}</div>
      {task.description_md && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}>
          {task.description_md.slice(0, 200)}{task.description_md.length > 200 && '…'}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <button onClick={() => setShowAssignMenu(s => !s)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '2px 6px', background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', borderRadius: 10,
            cursor: 'pointer', color: 'var(--text)', fontSize: '0.62rem',
            maxWidth: '100%',
          }}>
            {owner ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg, #534AB7, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700, color: '#fff' }}>{owner.avatarInitial}</div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner.name}</span>
              </>
            ) : <span style={{ color: 'var(--text-dim)' }}>Atribuir…</span>}
          </button>
          {showAssignMenu && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 5,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 4, minWidth: 180, maxHeight: 260, overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              <button onClick={() => { onAssign(null); setShowAssignMenu(false) }} style={menuItem}>— sem owner —</button>
              {employees.map(e => (
                <button key={e.id} onClick={() => { onAssign(e.id); setShowAssignMenu(false) }} style={menuItem}>
                  {e.name} <span style={{ color: 'var(--text-dim)' }}>· {e.department}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowStatusMenu(s => !s)} style={{
            padding: '2px 6px', background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: '0.62rem',
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>Mover <ChevronDown size={10} /></button>
          {showStatusMenu && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 5,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 4, minWidth: 140,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              {STATUS_COLS.filter(c => c.id !== task.status).map(c => (
                <button key={c.id} onClick={() => { onMove(c.id); setShowStatusMenu(false) }} style={menuItem}>
                  → {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Create task modal (manual, sem inbox source) ─────────────
function CreateTaskModal({ onClose, onCreate, employees }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [kind, setKind] = useState('task')
  const [priority, setPriority] = useState('normal')
  const [vertical, setVertical] = useState('')
  const [ownerAgent, setOwnerAgent] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      description_md: desc.trim() || null,
      kind, priority,
      vertical: vertical || null,
      owner_agent_id: ownerAgent || null,
    })
    onClose()
  }

  return (
    <div onClick={onClose} style={modalOverlay}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={modalCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Nova task</h3>
          <button type="button" onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" autoFocus style={inputStyle} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (markdown opcional)" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={kind} onChange={e => setKind(e.target.value)} style={inputStyle}>
              <option value="task">Task</option><option value="idea">Ideia</option>
              <option value="followup">Follow-up</option><option value="reminder">Lembrete</option>
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
              {Object.entries(PRIORITY_META).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={vertical} onChange={e => setVertical(e.target.value)} style={inputStyle}>
              <option value="">Sem vertical</option>
              {VERTICALS.slice(1).map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <select value={ownerAgent} onChange={e => setOwnerAgent(e.target.value)} style={inputStyle}>
              <option value="">— sem owner —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} · {e.department}</option>
              ))}
            </select>
          </div>
          <button type="submit" style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            padding: '9px 14px', borderRadius: 5, cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 700,
          }}>Criar</button>
        </div>
      </form>
    </div>
  )
}

const asideBtn = (active) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  width: '100%', padding: '7px 10px', borderRadius: 5,
  background: active ? 'rgba(83,74,183,0.12)' : 'transparent',
  color: active ? 'var(--primary)' : 'var(--text)',
  border: 'none', cursor: 'pointer',
  fontSize: '0.74rem', fontWeight: active ? 600 : 500,
  marginBottom: 2,
})
const asideCount = {
  fontSize: '0.6rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text-dim)',
}
const viewBtn = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', borderRadius: 4,
  background: active ? 'var(--bg-card)' : 'transparent',
  border: 'none', cursor: 'pointer',
  color: active ? 'var(--primary)' : 'var(--text-dim)',
  fontSize: '0.7rem', fontWeight: 600,
})
const miniSelect = (color) => ({
  background: 'var(--bg-elevated)', border: `1px solid ${color || 'var(--border)'}`,
  color: color || 'var(--text)',
  padding: '3px 6px', borderRadius: 4,
  fontSize: '0.65rem', cursor: 'pointer', outline: 'none',
})
const menuItem = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '6px 10px', background: 'none', border: 'none',
  cursor: 'pointer', color: 'var(--text)', fontSize: '0.72rem',
  borderRadius: 4,
}
const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
}
const modalCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: 20, width: 480, maxWidth: '90vw',
}
const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-dim)', padding: 4,
}
const inputStyle = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '8px 11px', borderRadius: 5,
  fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
}
