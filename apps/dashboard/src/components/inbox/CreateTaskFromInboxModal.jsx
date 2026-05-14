// CreateTaskFromInboxModal — modal completo para criar task a partir de um inbox item
// Pré-fill: title=suggestion ou item.title, description=why_it_matters/summary,
//           vertical=item.vertical, priority="normal"
// User escolhe: employee (16 agents), priority, due_at opcional, kind (task/idea/followup)

import { useState, useEffect } from 'react'
import { X, Calendar, User, Briefcase, Target, AlertCircle } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks.js'
import { useData } from '../../hooks/useData.js'

const PRIORITIES = [
  { id: 'low',    label: 'Low',    color: '#6b7280' },
  { id: 'normal', label: 'Normal', color: '#3b82f6' },
  { id: 'high',   label: 'High',   color: '#f59e0b' },
  { id: 'urgent', label: 'Urgent', color: '#ef4444' },
]

const KINDS = [
  { id: 'task',     label: 'Task' },
  { id: 'idea',     label: 'Ideia' },
  { id: 'followup', label: 'Follow-up' },
  { id: 'reminder', label: 'Lembrete' },
]

const VERTICALS = [
  { id: '',    label: 'Sem vertical' },
  { id: 'v2',  label: 'V2 Condomínios' },
  { id: 'v3',  label: 'V3 Seguros' },
  { id: 'v4',  label: 'V4 Energia' },
  { id: 'v5',  label: 'V5 Manutenção' },
  { id: 'v6',  label: 'V6 Reabilitação' },
  { id: 'v7',  label: 'V7 Real Estate' },
  { id: 'v8',  label: 'V8 Rentals' },
  { id: 'v10', label: 'V10 Owners' },
]

export default function CreateTaskFromInboxModal({ item, suggestion, kind: defaultKind, onClose, onCreated }) {
  const { data } = useData()
  const { createTask } = useTasks()
  const employees = (data?.employees || []).filter(e => e.status === 'active')

  const isEmployee = defaultKind === 'employee'
  const [title, setTitle] = useState(suggestion || item.title)
  const [description, setDescription] = useState(
    item.raw?.payload?.why_it_matters && typeof item.raw.payload.why_it_matters === 'object'
      ? Object.values(item.raw.payload.why_it_matters).filter(Boolean)[0] || ''
      : item.raw?.payload?.why_it_matters
        || item.raw?.payload?.summary_md
        || item.raw?.payload?.caption
        || item.body
        || ''
  )
  const [taskKind, setTaskKind] = useState(isEmployee ? 'task' : 'idea')
  const [priority, setPriority] = useState('normal')
  const [vertical, setVertical] = useState(
    item.raw?.payload?.primary_vertical
    || item.raw?.vertical
    || item.vertical
    || ''
  )
  const [employeeId, setEmployeeId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEmpList, setShowEmpList] = useState(false)

  // Filtra employees pela vertical activa
  const filteredEmployees = vertical
    ? employees.filter(e => {
        const verticals = e.verticals || [e.vertical].filter(Boolean)
        return verticals.some(v => (v || '').toLowerCase().startsWith(vertical))
      })
    : employees

  const selectedEmp = employees.find(e => e.id === employeeId)

  async function submit(e) {
    e?.preventDefault?.()
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      const taskId = await createTask({
        title: title.trim(),
        description_md: description.trim() || null,
        kind: taskKind,
        priority,
        vertical: vertical || null,
        owner_agent_id: employeeId || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        source_kind: 'inbox_item',
        source_id: item.raw?.id || null,
        tags: ['from-inbox', item.raw?.kind].filter(Boolean),
        payload: {
          source_url:  item.raw?.source_url,
          source_name: item.raw?.source_name,
          suggestion,
        },
      })
      if (taskId) onCreated?.(taskId)
      onClose()
    } finally { setBusy(false) }
  }

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200, padding: 20,
    }}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24,
        width: 560, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
              {isEmployee ? 'Atribuir task' : 'Capturar ideia'}
            </h3>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 4 }}>
              a partir de "{item.title?.slice(0, 60)}…"
            </div>
          </div>
          <button type="button" onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>

        {/* Title */}
        <div>
          <Label icon={Target}>Título *</Label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            required autoFocus style={inputStyle} />
        </div>

        {/* Description */}
        <div>
          <Label>Descrição (markdown ok)</Label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Kind */}
          <div>
            <Label>Tipo</Label>
            <select value={taskKind} onChange={e => setTaskKind(e.target.value)} style={inputStyle}>
              {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
          {/* Priority */}
          <div>
            <Label icon={AlertCircle}>Prioridade</Label>
            <div style={{ display: 'flex', gap: 4 }}>
              {PRIORITIES.map(p => {
                const active = priority === p.id
                return (
                  <button key={p.id} type="button" onClick={() => setPriority(p.id)} style={{
                    flex: 1, padding: '6px 8px', borderRadius: 5,
                    background: active ? `${p.color}22` : 'var(--bg-elevated)',
                    border: `1px solid ${active ? p.color : 'var(--border)'}`,
                    color: active ? p.color : 'var(--text-dim)',
                    fontSize: '0.7rem', fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}>{p.label}</button>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Vertical */}
          <div>
            <Label icon={Briefcase}>Vertical</Label>
            <select value={vertical} onChange={e => { setVertical(e.target.value); setEmployeeId('') }} style={inputStyle}>
              {VERTICALS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          {/* Due date */}
          <div>
            <Label icon={Calendar}>Prazo (opcional)</Label>
            <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Employee picker */}
        <div>
          <Label icon={User}>Atribuir a {filteredEmployees.length === 0 && '— sem agents para esta vertical'}</Label>
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setShowEmpList(s => !s)} style={{
              ...inputStyle, textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer',
            }}>
              {selectedEmp ? (
                <>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.6rem', fontWeight: 700,
                  }}>{selectedEmp.avatarInitial}</div>
                  <span style={{ flex: 1 }}>
                    <strong>{selectedEmp.name}</strong>
                    <span style={{ color: 'var(--text-dim)', marginLeft: 6, fontSize: '0.7rem' }}>
                      · {selectedEmp.department}
                    </span>
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--text-dim)' }}>
                  {filteredEmployees.length > 0 ? '— sem owner (escolhe employee) —' : '— sem owner —'}
                </span>
              )}
            </button>
            {showEmpList && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 6, padding: 4, maxHeight: 240, overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 5,
              }}>
                <button type="button"
                  onClick={() => { setEmployeeId(''); setShowEmpList(false) }}
                  style={empItem(employeeId === '')}>
                  — sem owner —
                </button>
                {filteredEmployees.map(e => (
                  <button key={e.id} type="button"
                    onClick={() => { setEmployeeId(e.id); setShowEmpList(false) }}
                    style={empItem(employeeId === e.id)}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.6rem', fontWeight: 700,
                      marginRight: 8,
                    }}>{e.avatarInitial}</div>
                    <strong>{e.name}</strong>
                    <span style={{ color: 'var(--text-dim)', marginLeft: 6, fontSize: '0.7rem' }}>
                      · {e.department} · {(e.verticals || [e.vertical]).filter(Boolean).join(', ')}
                    </span>
                  </button>
                ))}
                {vertical && filteredEmployees.length === 0 && employees.length > 0 && (
                  <div style={{ padding: '6px 12px', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    Sem agents activos em {vertical.toUpperCase()}.{' '}
                    <button type="button" onClick={() => setVertical('')} style={{
                      background: 'none', border: 'none', color: 'var(--info)', cursor: 'pointer', padding: 0,
                    }}>Ver todos</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={busy || !title.trim()} style={{
          background: busy || !title.trim() ? 'var(--bg-elevated)' : 'var(--text)',
          color: busy || !title.trim() ? 'var(--text-dim)' : 'var(--bg)',
          border: 'none', padding: '10px 16px', borderRadius: 6,
          cursor: busy || !title.trim() ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem', fontWeight: 700, marginTop: 6,
        }}>{busy ? 'A criar…' : 'Criar task'}</button>
      </form>
    </div>
  )
}

function Label({ icon: Icon, children }) {
  return (
    <div style={{
      fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-dim)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      marginBottom: 5, display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>{Icon && <Icon size={10} />} {children}</div>
  )
}

function empItem(active) {
  return {
    display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
    padding: '7px 10px', background: active ? 'var(--bg-elevated)' : 'none',
    border: 'none', cursor: 'pointer', color: 'var(--text)',
    fontSize: '0.74rem', borderRadius: 4,
    fontWeight: active ? 600 : 400,
  }
}

const iconBtn = {
  background: 'none', border: '1px solid var(--border)',
  padding: 6, borderRadius: 5, cursor: 'pointer', color: 'var(--text-dim)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '9px 12px', borderRadius: 6,
  fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
}
