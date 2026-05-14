// ProjectsPage — /projects · tabela CookAI-style com Priority/Status/Contents/Created
//
// Pastas que agrupam recipes/tasks/missions por objectivo macro de negócio.
// Cada projecto pode ter goals[], owner_agent, due date.

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { Plus, X, Loader2, Folder, FolderPlus, Edit2, Trash2 } from 'lucide-react'
import { useProjects } from '../hooks/useProjects.js'

const STATUS_BADGE = {
  planned:     { label: 'PLANNED',     color: '#9ca3af', bg: 'rgba(156,163,175,0.18)' },
  in_progress: { label: 'IN PROGRESS', color: '#bfdbfe', bg: 'rgba(59,130,246,0.18)' },
  completed:   { label: 'COMPLETED',   color: '#86efac', bg: 'rgba(16,185,129,0.18)' },
  paused:      { label: 'PAUSED',      color: '#fcd34d', bg: 'rgba(245,158,11,0.18)' },
  cancelled:   { label: 'CANCELLED',   color: '#fca5a5', bg: 'rgba(239,68,68,0.18)' },
}

const PRIORITY = {
  urgent: { label: 'Urgent', color: '#ef4444', icon: '⚠' },
  high:   { label: 'High',   color: '#f59e0b', icon: '▲' },
  medium: { label: 'Medium', color: '#3b82f6', icon: '◆' },
  low:    { label: 'Low',    color: '#10b981', icon: '▼' },
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d < 1) return 'today'
  if (d < 30) return `${d}d ago`
  const m = Math.floor(d / 30)
  if (m < 12) return `${m}mo ago`
  return `${Math.floor(m / 12)}y ago`
}

// ─── ProjectDetailModal ────────────────────────────────────────────────────
function ProjectDetailModal({ project, onClose, onEdit }) {
  const Icon = (project.icon && Lucide[project.icon]) || Folder
  const meta = STATUS_BADGE[project.status] || STATUS_BADGE.planned
  const prio = PRIORITY[project.priority] || PRIORITY.medium
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, width: 600, maxWidth: '100%',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${project.brand_color || '#3b82f6'}22`,
            color: project.brand_color || '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>{project.name}</h2>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              {project.vertical || 'cross-vertical'} · created {timeAgo(project.created_at)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={18} />
          </button>
        </div>

        {project.description && (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>{project.description}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <Stat label="Status" value={meta.label} color={meta.color} bg={meta.bg} />
          <Stat label="Priority" value={prio.label} color={prio.color} />
          <Stat label="Tasks" value={project.task_count || 0} mono />
          <Stat label="Recipes" value={project.recipe_count || 0} mono />
        </div>

        {project.goals?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <SectionLabel>Goals</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {project.goals.map((g, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 5,
                  fontSize: 12, color: 'var(--text)',
                }}>{typeof g === 'string' ? g : g.title}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => onEdit(project)} style={btnSecondary}>
            <Edit2 size={11} /> Edit
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color, bg, mono }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', borderRadius: 6, padding: '10px 12px',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{
        marginTop: 4,
        fontSize: mono ? 18 : 13,
        fontWeight: 600,
        color: color || 'var(--text)',
        fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
        display: 'inline-flex', padding: bg ? '2px 8px' : 0,
        background: bg, borderRadius: bg ? 3 : 0,
      }}>{value}</div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>{children}</div>
}

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', borderRadius: 5,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 12, cursor: 'pointer',
}

// ─── CreateProjectModal ────────────────────────────────────────────────────
function CreateProjectModal({ project, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'planned',
    priority: project?.priority || 'medium',
    vertical: project?.vertical || '',
    verticals: project?.verticals || ['*'],
    brand_color: project?.brand_color || '#3b82f6',
    icon: project?.icon || 'Folder',
  })
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) return
    setBusy(true)
    await onSubmit({ ...form, vertical: form.vertical || null })
    setBusy(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, width: 500, maxWidth: '100%',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{project ? 'Editar projecto' : 'Novo projecto'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nome *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: HVAC Lead Engine MVP" style={input} />
          </Field>
          <Field label="Descrição">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={input}>
                {Object.entries(STATUS_BADGE).map(([s, m]) => <option key={s} value={s}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={input}>
                {Object.entries(PRIORITY).map(([p, m]) => <option key={p} value={p}>{m.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Vertical (opt)">
            <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} style={input}>
              <option value="">Cross-vertical</option>
              <option value="v2">V2 Condomínios</option>
              <option value="v3">V3 Seguros</option>
              <option value="v4">V4 Energia</option>
              <option value="v5">V5 Manutenção</option>
              <option value="v6">V6 Reabilitação</option>
              <option value="v7">V7 Real Estate</option>
              <option value="v8">V8 Rentals</option>
              <option value="v9">V9 BaaS</option>
              <option value="v10">V10 Owners Club</option>
            </select>
          </Field>
          <Field label="Brand color">
            <input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} style={{ ...input, height: 36, padding: 2 }} />
          </Field>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancelar</button>
            <button type="submit" disabled={busy} style={btnSubmit}>
              {busy && <Loader2 size={12} className="spin" />} {project ? 'Guardar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {children}
    </label>
  )
}

const input = {
  padding: '7px 10px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const btnCancel = {
  padding: '8px 14px', borderRadius: 6, background: 'transparent',
  border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
}
const btnSubmit = {
  padding: '8px 14px', borderRadius: 6, background: 'var(--primary)',
  border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const navigate = useNavigate()
  const { items, loading, create, update, remove } = useProjects()
  const [selected, setSelected] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleSubmit = async (form) => {
    if (editing) await update(editing.id, form)
    else await create(form)
    setEditing(null)
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}><Loader2 className="spin" size={18} /></div>
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      {selected && <ProjectDetailModal project={selected} onClose={() => setSelected(null)} onEdit={(p) => { setSelected(null); setEditing(p) }} />}
      {(createOpen || editing) && (
        <CreateProjectModal
          project={editing}
          onClose={() => { setCreateOpen(false); setEditing(null) }}
          onSubmit={handleSubmit}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Projects</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
            {items.length} projectos · {items.filter(p => p.status === 'in_progress').length} em progresso · {items.filter(p => p.status === 'completed').length} concluídos
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 6,
          background: 'var(--primary)', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <FolderPlus size={14} /> New project
        </button>
      </div>

      {/* Tabela CookAI-style */}
      {items.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 8, color: 'var(--text-dim)', fontSize: 13,
        }}>
          <Folder size={28} style={{ marginBottom: 8 }} />
          <div>Sem projectos. Cria o primeiro para agrupar trabalho.</div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden',
        }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1fr 1fr 1fr 100px 80px',
            gap: 12, padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span>Name</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Contents</span>
            <span style={{ textAlign: 'right' }}>Created</span>
            <span></span>
          </div>
          {items.map((p) => {
            const Icon = (p.icon && Lucide[p.icon]) || Folder
            const meta = STATUS_BADGE[p.status] || STATUS_BADGE.planned
            const prio = PRIORITY[p.priority] || PRIORITY.medium
            return (
              <div
                key={p.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 100px 80px',
                  gap: 12, padding: '10px 16px',
                  borderTop: '1px solid var(--border-soft, transparent)',
                  alignItems: 'center',
                  transition: 'background 0.12s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => setSelected(p)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: `${p.brand_color || '#3b82f6'}22`,
                    color: p.brand_color || '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={13} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: prio.color, fontFamily: 'JetBrains Mono, monospace' }}>
                  <span style={{ marginRight: 4 }}>{prio.icon}</span> {prio.label}
                </div>
                <div>
                  <span style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 3,
                    background: meta.bg, color: meta.color,
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}>{meta.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {p.task_count > 0 ? `${p.task_count} tasks` : 'empty'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
                  {timeAgo(p.created_at)}
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditing(p)} style={miniBtn} title="Editar"><Edit2 size={10} /></button>
                  <button onClick={() => { if (confirm(`Apagar "${p.name}"?`)) remove(p.id) }} style={miniBtn} title="Apagar"><Trash2 size={10} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const miniBtn = {
  background: 'transparent', border: '1px solid var(--border)',
  cursor: 'pointer', color: 'var(--text-dim)', padding: '3px 6px', borderRadius: 4,
}
