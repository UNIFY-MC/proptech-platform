// TasksPage — /tasks · 4-col Kanban CookAI-style + steps inline + executor real
// Columns: Running (open + in_progress) · Needs You (blocked + needs_human) ·
//          Failed (cancelled + failed) · Done (done)
// Filtros top: Assignee + Goals + Project (pillas). View toggle Board/List.
// Card expandido mostra: STATUS, numbered steps com tick verde, "view output" link,
// "Open mission detail" para abrir modal full.

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ChevronDown, X, Search, LayoutGrid, List, Play, Hand,
  CheckCircle2, AlertCircle, ExternalLink, Loader2, Edit2, Eye,
} from 'lucide-react'
import { useTasks } from '../hooks/useTasks.js'
import { useData } from '../hooks/useData.js'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

// Map status DB → coluna Kanban (4 columns CookAI)
const STATUS_TO_COLUMN = {
  open:         'running',
  in_progress:  'running',
  blocked:      'needs_you',
  needs_human:  'needs_you',
  failed:       'failed',
  cancelled:    'failed',
  done:         'done',
}

const COLUMNS = [
  { id: 'running',   label: 'Running',   color: '#3b82f6', icon: Loader2,        spinner: true },
  { id: 'needs_you', label: 'Needs You', color: '#f59e0b', icon: Hand },
  { id: 'failed',    label: 'Failed',    color: '#ef4444', icon: X },
  { id: 'done',      label: 'Done',      color: '#10b981', icon: CheckCircle2 },
]

const PRIORITY_META = {
  low:    { color: '#6b7280', label: 'Low' },
  normal: { color: '#3b82f6', label: 'Normal' },
  high:   { color: '#f59e0b', label: 'High' },
  urgent: { color: '#ef4444', label: 'Urgent' },
}

const STEP_ICON = {
  done:        <CheckCircle2 size={11} color="#10b981" />,
  running:     <Loader2 size={11} color="#3b82f6" className="spin" />,
  failed:      <X size={11} color="#ef4444" />,
  needs_human: <Hand size={11} color="#f59e0b" />,
  pending:     <span style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid var(--text-dim)', display: 'inline-block' }} />,
}

async function executeTask(taskId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/task-execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify({ task_id: taskId }),
  })
  return await res.json()
}

export default function TasksPage() {
  const navigate = useNavigate()
  const { data } = useData()
  const employees = data?.employees || []
  // Multi-tenant: filtra por vertical activa do dropdown topo. 'all' = global.
  const { activeVertical } = useVerticalStore()
  const verticalFilter = activeVertical && activeVertical !== 'all' ? activeVertical : null
  const { tasks, createTask, updateStatus, assign, refresh } = useTasks({ vertical: verticalFilter })

  const [view, setView] = useState('board')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [goalFilter, setGoalFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [openDetail, setOpenDetail] = useState(null)
  const [executing, setExecuting] = useState(null)

  // Distinct goals/projects do dataset
  const goalsOptions = useMemo(() => ['all', ...new Set(tasks.map(t => t.goal).filter(Boolean))], [tasks])
  const projectsOptions = useMemo(() => ['all', ...new Set(tasks.map(t => t.project).filter(Boolean))], [tasks])

  const filtered = useMemo(() => tasks.filter(t => {
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned' && t.owner_agent_id) return false
      if (assigneeFilter !== 'unassigned' && t.owner_agent_id !== assigneeFilter) return false
    }
    if (goalFilter !== 'all' && t.goal !== goalFilter) return false
    if (projectFilter !== 'all' && t.project !== projectFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!t.title?.toLowerCase().includes(q) && !t.description_md?.toLowerCase().includes(q)) return false
    }
    return true
  }), [tasks, assigneeFilter, goalFilter, projectFilter, search])

  const byColumn = useMemo(() => {
    const groups = { running: [], needs_you: [], failed: [], done: [] }
    for (const t of filtered) {
      const col = STATUS_TO_COLUMN[t.status] || 'running'
      groups[col].push(t)
    }
    return groups
  }, [filtered])

  async function handleExecute(taskId) {
    setExecuting(taskId)
    try {
      await executeTask(taskId)
      await refresh()
    } finally {
      setExecuting(null)
    }
  }

  return (
    <div style={{ padding: '4px 4px 80px' }}>
      {/* Filtros TOP pill style + view toggle (estilo CookAI) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 12px', marginBottom: 14,
      }}>
        <FilterPill icon="👤" label="Assignee" value={assigneeFilter} options={[
          { id: 'all', label: 'All' },
          { id: 'unassigned', label: 'Unassigned' },
          ...employees.map(e => ({ id: e.id, label: e.name })),
        ]} onChange={setAssigneeFilter} />

        <FilterPill icon="🎯" label="Goals" value={goalFilter} options={
          goalsOptions.map(g => ({ id: g, label: g === 'all' ? 'On' : g }))
        } onChange={setGoalFilter} />

        <FilterPill icon="📁" label="Project" value={projectFilter} options={
          projectsOptions.map(p => ({ id: p, label: p === 'all' ? 'All' : p }))
        } onChange={setProjectFilter} />

        <div style={{ position: 'relative', marginLeft: 8 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text)', padding: '5px 10px 5px 26px',
              borderRadius: 5, fontSize: '0.72rem', outline: 'none', width: 180,
            }} />
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={() => setCreateOpen(true)} style={{
          background: 'var(--text)', color: 'var(--bg)', border: 'none',
          padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
          fontSize: '0.72rem', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}><Plus size={11} /> New Task</button>

        <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--bg-elevated)', borderRadius: 6 }}>
          <button onClick={() => setView('board')} style={viewBtn(view === 'board')}><LayoutGrid size={11} /> Board</button>
          <button onClick={() => setView('list')} style={viewBtn(view === 'list')}><List size={11} /> List</button>
        </div>
      </div>

      {/* Board ou List */}
      {view === 'board' ? (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
          minHeight: 'calc(100vh - 200px)',
        }}>
          {COLUMNS.map(col => {
            const Icon = col.icon
            const items = byColumn[col.id]
            return (
              <div key={col.id} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 8,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px 12px',
                  fontSize: '0.78rem', fontWeight: 700, color: col.color,
                }}>
                  <Icon size={14} className={col.spinner ? 'spin' : ''} /> {col.label}
                  <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                    {items.length}
                  </span>
                </div>
                {items.map(t => (
                  <TaskCard key={t.id} task={t} employees={employees}
                    onExecute={() => handleExecute(t.id)}
                    executing={executing === t.id}
                    onOpenDetail={() => navigate(`/tasks/${t.id}`)}
                    onEdit={() => setEditingTask(t)}
                    onChangeStatus={(s) => updateStatus(t.id, s)} />
                ))}
                {items.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                    {col.id === 'running' ? '0' : 'vazio'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <ListView tasks={filtered} employees={employees}
          onExecute={handleExecute} executing={executing}
          onOpenDetail={(t) => navigate(`/tasks/${t.id}`)} onEdit={setEditingTask}
          onChangeStatus={(id, s) => updateStatus(id, s)} />
      )}

      {filtered.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          color: 'var(--text-dim)', fontSize: '0.85rem',
          background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8, marginTop: 12,
        }}>
          {tasks.length === 0
            ? 'Sem tasks ainda. Cria a primeira ou usa "Create task" num card do /inbox.'
            : 'Sem tasks com os filtros actuais.'}
        </div>
      )}

      {createOpen && (
        <TaskEditModal onClose={() => setCreateOpen(false)}
          onSubmit={async (input) => { await createTask(input); setCreateOpen(false) }}
          employees={employees} />
      )}
      {editingTask && (
        <TaskEditModal task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={async (input) => {
            await supabase.schema('system').from('tasks').update(input).eq('id', editingTask.id)
            await refresh()
            setEditingTask(null)
          }}
          employees={employees} />
      )}
      {openDetail && (
        <TaskDetailModal task={openDetail} employees={employees}
          onClose={() => setOpenDetail(null)}
          onExecute={() => { handleExecute(openDetail.id); setOpenDetail(null) }}
          onEdit={() => { setEditingTask(openDetail); setOpenDetail(null) }} />
      )}

      {/* CSS spinner */}
      <style>{`@keyframes _spin { from { transform: rotate(0); } to { transform: rotate(360deg); } } .spin { animation: _spin 1.2s linear infinite; }`}</style>
    </div>
  )
}

// ─── Filter pill com dropdown ───────────────────────────
function FilterPill({ icon, label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.id === value) || options[0]
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 99,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        cursor: 'pointer', color: 'var(--text)', fontSize: '0.72rem',
      }}>
        <span style={{ opacity: 0.7 }}>{icon}</span>
        <span style={{ color: 'var(--text-dim)' }}>{label}:</span>
        <strong>{current?.label}</strong>
        <ChevronDown size={11} style={{ color: 'var(--text-dim)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, padding: 4, minWidth: 180, maxHeight: 280, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {options.map(o => (
            <button key={o.id} onClick={() => { onChange(o.id); setOpen(false) }} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '7px 12px', borderRadius: 4,
              background: o.id === value ? 'var(--bg-elevated)' : 'none',
              border: 'none', cursor: 'pointer', color: 'var(--text)',
              fontSize: '0.74rem', fontWeight: o.id === value ? 600 : 500,
            }}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TaskCard kanban com steps inline + click expand PROMPT/OUTPUT ─────────
function TaskCard({ task, employees, onExecute, executing, onOpenDetail, onEdit, onChangeStatus }) {
  const priority = PRIORITY_META[task.priority]
  const owner = task.owner_agent_id ? employees.find(e => e.id === task.owner_agent_id) : null
  const steps = Array.isArray(task.steps) ? task.steps : []
  const stepsDone = steps.filter(s => s.status === 'done').length
  const stepsTotal = steps.length
  const isExecuting = executing
  const exec = task.payload?.execution
  const [openSteps, setOpenSteps] = useState({})  // { idx: 'prompt'|'output'|null }
  const toggle = (i, pane) => setOpenSteps(o => ({ ...o, [i]: o[i] === pane ? null : pane }))

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${priority?.color || '#3b82f6'}`,
      borderRadius: 8, padding: '12px 14px', marginBottom: 8,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header com owner + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {owner ? (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
          }}>{owner.avatarInitial}</div>
        ) : (
          <div style={{ width: 28, height: 28 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
            {task.title}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
            {task.kind?.toUpperCase()}{task.vertical ? ` · ${task.vertical.toUpperCase()}` : ''}
            {owner && ` · ${owner.name}`}
          </div>
        </div>
        {task.status === 'needs_human' && (
          <span style={{
            fontSize: '0.55rem', padding: '2px 6px', borderRadius: 3,
            background: 'rgba(245,158,11,0.18)', color: '#f59e0b',
            fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>NEEDS YOU</span>
        )}
      </div>

      {/* Progress bar steps */}
      {stepsTotal > 0 && (
        <div>
          <div style={{
            fontSize: '0.62rem', color: 'var(--text-dim)',
            marginBottom: 4, display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{stepsDone}/{stepsTotal} steps</span>
            {exec?.summary && <span style={{ fontStyle: 'italic' }}>{exec.summary.slice(0, 30)}…</span>}
          </div>
          <div style={{ background: 'var(--bg-elevated)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${stepsTotal > 0 ? (stepsDone / stepsTotal) * 100 : 0}%`,
              height: '100%',
              background: task.status === 'failed' ? '#ef4444'
                       : task.status === 'needs_human' ? '#f59e0b'
                       : '#10b981',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {/* Steps list (top 4) — clicáveis com expand inline para PROMPT/OUTPUT */}
      {steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.slice(0, 4).map((s, i) => {
            const hasPrompt = !!s.prompt
            const hasOutput = !!s.output
            const pane = openSteps[i]
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  fontSize: '0.7rem',
                  color: s.status === 'done' ? 'var(--text-dim)' : 'var(--text)',
                  lineHeight: 1.4,
                }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>{STEP_ICON[s.status] || STEP_ICON.pending}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--text-dim)', minWidth: 14 }}>
                    {i + 1}.
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {s.name}
                  </span>
                  {(hasPrompt || hasOutput) && (
                    <button
                      onClick={() => toggle(i, hasOutput ? 'output' : 'prompt')}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0, color: 'var(--primary)', fontSize: '0.6rem',
                        textDecoration: 'underline', flexShrink: 0,
                      }}
                    >
                      {pane ? 'hide' : hasOutput ? 'view output' : 'details'}
                    </button>
                  )}
                </div>
                {pane === 'prompt' && hasPrompt && (
                  <div style={{
                    marginLeft: 26, marginTop: 2, padding: '8px 10px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 4, fontSize: '0.65rem', color: 'var(--text)',
                    fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap',
                    lineHeight: 1.5, maxHeight: 200, overflow: 'auto',
                  }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4 }}>PROMPT</div>
                    {s.prompt}
                  </div>
                )}
                {pane === 'output' && hasOutput && (
                  <div style={{
                    marginLeft: 26, marginTop: 2, padding: '8px 10px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 4, fontSize: '0.65rem', color: 'var(--text)',
                    fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap',
                    lineHeight: 1.5, maxHeight: 200, overflow: 'auto',
                  }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4 }}>OUTPUT</div>
                    {s.output}
                  </div>
                )}
                {s.status === 'done' && (
                  <div style={{
                    marginLeft: 26, fontSize: '0.55rem', color: '#10b981',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>↳ STATUS: done</div>
                )}
              </div>
            )
          })}
          {steps.length > 4 && (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', paddingLeft: 26 }}>
              +{steps.length - 4} steps · <button
                onClick={onOpenDetail}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.6rem', textDecoration: 'underline', padding: 0 }}
              >ver todos</button>
            </div>
          )}
        </div>
      )}

      {/* Description preview se sem steps */}
      {steps.length === 0 && task.description_md && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.4, maxHeight: 50, overflow: 'hidden' }}>
          {task.description_md.slice(0, 140)}{task.description_md.length > 140 && '…'}
        </div>
      )}

      {/* Skills row */}
      {Array.isArray(task.skills) && task.skills.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            SKILLS
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {task.skills.map((sk) => (
              <span key={sk} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 6px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 3,
                fontSize: '0.62rem', color: 'var(--text)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                <span style={{ color: '#6b4fa0' }}>◉</span> {sk}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Open mission detail link */}
      <button
        onClick={onOpenDetail}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, color: 'var(--primary)', fontSize: '0.7rem',
          alignSelf: 'flex-start',
        }}
      >
        <ExternalLink size={11} /> Open mission detail
      </button>

      {/* Actions row */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
        {owner && task.status !== 'done' && task.status !== 'in_progress' && (
          <button onClick={onExecute} disabled={isExecuting} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 9px', borderRadius: 4,
            background: 'var(--primary)', color: '#fff',
            border: 'none', cursor: isExecuting ? 'wait' : 'pointer',
            fontSize: '0.65rem', fontWeight: 600,
          }}>
            {isExecuting ? <Loader2 size={10} className="spin" /> : <Play size={10} />}
            {isExecuting ? 'A correr…' : 'Run'}
          </button>
        )}
        <button onClick={onOpenDetail} style={miniBtn}><Eye size={10} /> Detalhe</button>
        <button onClick={onEdit} style={miniBtn} title="Editar"><Edit2 size={10} /></button>
        <div style={{ flex: 1 }} />
        <select value={task.status} onChange={e => onChangeStatus(e.target.value)} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          color: 'var(--text-dim)', padding: '3px 6px', borderRadius: 4,
          fontSize: '0.6rem', cursor: 'pointer', outline: 'none',
        }}>
          {['open','in_progress','blocked','needs_human','done','failed','cancelled'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

const miniBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 8px', borderRadius: 4,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-dim)', cursor: 'pointer',
  fontSize: '0.62rem', fontWeight: 500,
}

// ─── List view ─────────────────────────────────────────
function ListView({ tasks, employees, onExecute, executing, onOpenDetail, onEdit, onChangeStatus }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 100px 90px 80px 130px 100px 110px',
        gap: 10, padding: '8px 14px', background: 'var(--bg-elevated)',
        fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: '1px solid var(--border)',
      }}>
        <span></span><span>Title</span><span>Status</span><span>Priority</span>
        <span>Vertical</span><span>Assignee</span><span>Steps</span><span>Action</span>
      </div>
      {tasks.map(t => {
        const priority = PRIORITY_META[t.priority]
        const owner = employees.find(e => e.id === t.owner_agent_id)
        const stepsDone = (t.steps || []).filter(s => s.status === 'done').length
        const stepsTotal = (t.steps || []).length
        const colMeta = COLUMNS.find(c => c.id === STATUS_TO_COLUMN[t.status])
        return (
          <div key={t.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 100px 90px 80px 130px 100px 110px',
            gap: 10, padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.72rem', color: 'var(--text)', alignItems: 'center',
          }}>
            <span style={{
              fontSize: '0.5rem', padding: '1px 5px', borderRadius: 3,
              background: `${colMeta?.color || '#3b82f6'}22`,
              color: colMeta?.color || '#3b82f6',
              fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center',
            }}>{(t.kind || 'task').toUpperCase().slice(0, 4)}</span>
            <div style={{ overflow: 'hidden' }} onClick={() => onOpenDetail(t)}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{t.title}</div>
            </div>
            <select value={t.status} onChange={e => onChangeStatus(t.id, e.target.value)} style={{
              background: 'var(--bg-elevated)', border: `1px solid ${colMeta?.color || 'var(--border)'}`,
              color: colMeta?.color || 'var(--text)', padding: '3px 6px', borderRadius: 4,
              fontSize: '0.6rem', cursor: 'pointer', outline: 'none',
            }}>
              {['open','in_progress','blocked','needs_human','done','failed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: '0.62rem', background: `${priority?.color}22`, color: priority?.color, fontWeight: 600, textAlign: 'center' }}>{priority?.label || t.priority}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-dim)' }}>{t.vertical?.toUpperCase() || '—'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {owner ? (
                <>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #534AB7, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>{owner.avatarInitial}</div>
                  <span style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner.name}</span>
                </>
              ) : <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>—</span>}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
              {stepsTotal > 0 ? `${stepsDone}/${stepsTotal}` : '—'}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {owner && t.status !== 'done' && (
                <button onClick={() => onExecute(t.id)} disabled={executing === t.id} style={{
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                  fontSize: '0.6rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>{executing === t.id ? <Loader2 size={9} className="spin" /> : <Play size={9} />}</button>
              )}
              <button onClick={() => onOpenDetail(t)} style={{ ...miniBtn, padding: '3px 8px' }}><Eye size={9} /></button>
              <button onClick={() => onEdit(t)} style={{ ...miniBtn, padding: '3px 8px' }}><Edit2 size={9} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Task detail modal (full info + output) ───────────
function TaskDetailModal({ task, employees, onClose, onExecute, onEdit }) {
  const owner = employees.find(e => e.id === task.owner_agent_id)
  const steps = task.steps || []
  const exec = task.payload?.execution
  const priority = PRIORITY_META[task.priority]
  const colMeta = COLUMNS.find(c => c.id === STATUS_TO_COLUMN[task.status])

  return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 0,
        width: 'min(820px, 96vw)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 99,
                background: `${colMeta?.color || '#3b82f6'}22`, color: colMeta?.color || '#3b82f6',
                fontSize: '0.6rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{colMeta?.label || task.status}</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                {task.kind?.toUpperCase()} · {task.vertical?.toUpperCase() || 'global'}
                {priority && ` · ${priority.label}`}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>{task.title}</h2>
            {owner && (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #534AB7, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>{owner.avatarInitial}</div>
                Atribuído a <strong>{owner.name}</strong> · {owner.department}
              </div>
            )}
          </div>
          <button onClick={onEdit} style={{ ...miniBtn, padding: '5px 9px' }}><Edit2 size={10} /> Editar</button>
          {owner && task.status !== 'done' && (
            <button onClick={onExecute} style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
              padding: '5px 12px', borderRadius: 5, cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}><Play size={10} /> Run</button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={16} /></button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {task.description_md && (
            <Section title="Descrição">
              <pre style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {task.description_md}
              </pre>
            </Section>
          )}

          {steps.length > 0 && (
            <Section title={`Steps (${steps.filter(s => s.status === 'done').length}/${steps.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 12px', borderRadius: 5,
                    background: s.status === 'needs_human' ? 'rgba(245,158,11,0.08)' :
                                s.status === 'failed' ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                    borderLeft: `3px solid ${
                      s.status === 'done'        ? '#10b981' :
                      s.status === 'needs_human' ? '#f59e0b' :
                      s.status === 'failed'      ? '#ef4444' :
                      s.status === 'running'     ? '#3b82f6' : 'var(--border)'
                    }`,
                  }}>
                    <span style={{ flexShrink: 0, marginTop: 2 }}>{STEP_ICON[s.status] || STEP_ICON.pending}</span>
                    <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5 }}>
                      <strong style={{ marginRight: 6, color: 'var(--text-dim)' }}>{i + 1}.</strong>
                      {s.name}
                      {s.reason && (
                        <div style={{ marginTop: 4, fontSize: '0.7rem', color: '#f59e0b', fontStyle: 'italic' }}>
                          {s.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {exec?.output_md && (
            <Section title="Output do agente" badge={exec.agent}>
              <pre style={{
                margin: 0, padding: 14, background: 'var(--bg-elevated)', borderRadius: 6,
                fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.55,
                whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                border: '1px solid var(--border)',
              }}>{exec.output_md}</pre>
            </Section>
          )}

          <Section title="Metadata">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: '0.7rem' }}>
              <Meta label="Status" value={task.status} />
              <Meta label="Priority" value={task.priority} />
              <Meta label="Kind" value={task.kind} />
              <Meta label="Vertical" value={task.vertical || '—'} />
              <Meta label="Created" value={new Date(task.created_at).toLocaleString('pt-PT')} />
              <Meta label="Updated" value={new Date(task.updated_at).toLocaleString('pt-PT')} />
              {task.due_at && <Meta label="Due" value={new Date(task.due_at).toLocaleString('pt-PT')} />}
              {task.source_kind && <Meta label="Source" value={task.source_kind} />}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, badge, children }) {
  return (
    <div>
      <div style={{
        fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        {title}
        {badge && <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--info)' }}>· {badge}</span>}
      </div>
      {children}
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}:</span>{' '}
      <strong style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>{value}</strong>
    </div>
  )
}

// Dept heads (responsáveis) — só estes recebem tasks; eles delegam internamente.
// Sub-agents (assembleia-condo, manutencao-condo, etc) são corridos pelos heads.
const DEPT_HEADS = new Set([
  'bia',                  // V5 operations
  'orquestrador-condo',   // V2 operations + engineering
  'diretor-marketing',    // marketing transversal
  'gestor-leads',         // sales transversal
  'financeiro-condo',     // V2 finance
  'atendimento-condo',    // V2 support
  'compliance-condo',     // V2 legal
])

// ─── Task edit/create modal ───────────────────────────
function TaskEditModal({ task, onClose, onSubmit, employees }) {
  const { activeVertical } = useVerticalStore()
  const defaultVertical = task?.vertical
    || (activeVertical && activeVertical !== 'all' ? activeVertical.toLowerCase() : '')

  const [title, setTitle] = useState(task?.title || '')
  const [desc, setDesc] = useState(task?.description_md || '')
  const [kind, setKind] = useState(task?.kind || 'task')
  const [priority, setPriority] = useState(task?.priority || 'normal')
  const [vertical, setVertical] = useState(defaultVertical)
  const [ownerAgent, setOwnerAgent] = useState(task?.owner_agent_id || '')
  const [dueAt, setDueAt] = useState(task?.due_at ? task.due_at.slice(0, 16) : '')
  const [goal, setGoal] = useState(task?.goal || '')
  const [project, setProject] = useState(task?.project || '')
  const [showAllAgents, setShowAllAgents] = useState(false)

  // Filtra agents: heads-only por defeito + match vertical seleccionada
  const verticalUpper = vertical ? vertical.toUpperCase() : ''
  const availableEmployees = employees.filter(e => {
    if (!showAllAgents && !DEPT_HEADS.has(e.id)) return false
    if (!verticalUpper) return true
    const verts = e.verticals || []
    return verts.includes(verticalUpper)
  })

  // Se owner deixar de ser válido para a vertical seleccionada, limpa
  useEffect(() => {
    if (ownerAgent && !availableEmployees.find(e => e.id === ownerAgent)) {
      setOwnerAgent('')
    }
  }, [vertical, showAllAgents]) // eslint-disable-line react-hooks/exhaustive-deps

  function submit(e) {
    e?.preventDefault?.()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description_md: desc.trim() || null,
      kind, priority,
      vertical: vertical || null,
      owner_agent_id: ownerAgent || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      goal: goal || null,
      project: project || null,
    })
  }

  return (
    <div onClick={onClose} style={modalOverlay}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 22, width: 540, maxWidth: '92vw',
        maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{task ? 'Editar task' : 'Nova task'}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={16} /></button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" required autoFocus style={inputStyle} />
        <textarea value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Descrição (markdown ok) — adiciona issue, contexto, links..."
          rows={6} style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }} />
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
            <option value="v2">V2 Condomínios</option><option value="v3">V3 Seguros</option>
            <option value="v4">V4 Energia</option><option value="v5">V5 Manutenção</option>
            <option value="v6">V6 Reabilitação</option><option value="v7">V7 Real Estate</option>
            <option value="v8">V8 Rentals</option><option value="v10">V10 Owners</option>
          </select>
          <select value={ownerAgent} onChange={e => setOwnerAgent(e.target.value)} style={inputStyle}>
            <option value="">— sem responsável —</option>
            {availableEmployees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.department}{e.verticals?.length ? ` · ${e.verticals.join('/')}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem', color: 'var(--text-dim)' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={showAllAgents} onChange={e => setShowAllAgents(e.target.checked)} />
            Mostrar sub-agents (defeito: só responsáveis de departamento)
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Goal (opcional)" style={inputStyle} />
          <input value={project} onChange={e => setProject(e.target.value)} placeholder="Project (opcional)" style={inputStyle} />
          <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} style={inputStyle} />
        </div>
        <button type="submit" style={{
          background: 'var(--text)', color: 'var(--bg)', border: 'none',
          padding: '9px 14px', borderRadius: 5, cursor: 'pointer',
          fontSize: '0.82rem', fontWeight: 700, marginTop: 4,
        }}>{task ? 'Guardar' : 'Criar'}</button>
      </form>
    </div>
  )
}

const viewBtn = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', borderRadius: 4,
  background: active ? 'var(--bg-card)' : 'transparent',
  border: 'none', cursor: 'pointer',
  color: active ? 'var(--primary)' : 'var(--text-dim)',
  fontSize: '0.7rem', fontWeight: 600,
})
const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
  padding: 20, overflowY: 'auto',
}
const inputStyle = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '8px 11px', borderRadius: 5,
  fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
}
