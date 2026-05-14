// UsefulToolsPage — /useful-tools · catálogo descoberta de ferramentas
//
// Diferente de /integrations: estas tools são links externos para
// inspiração/avaliação. Não há OAuth/connection — só abrir nova tab.
// Suporta CRUD: adicionar, editar, eliminar tools manualmente.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { ExternalLink, Search, Plus, Edit2, Trash2, X, Loader2, Sparkles, Plug } from 'lucide-react'
import { useUsefulTools } from '../hooks/useUsefulTools.js'
import { useVerticalStore } from '../store/index.js'

const VERTICAL_LABEL = {
  all: 'todas verticais', v1: 'V1 Core', v2: 'V2 Condomínios', v3: 'V3 Seguros',
  v4: 'V4 Energia', v5: 'V5 Manutenção', v6: 'V6 Reabilitação', v7: 'V7 Real Estate',
  v8: 'V8 Rentals', v9: 'V9 BaaS', v10: 'V10 Owners Club',
}

const CATEGORIES = [
  { id: 'ai-coding',  label: 'AI Coding',   color: '#6b4fa0' },
  { id: 'ai-content', label: 'AI Content',  color: '#10b981' },
  { id: 'ai-media',   label: 'AI Media',    color: '#ec4899' },
  { id: 'design',     label: 'Design',      color: '#3b82f6' },
  { id: 'data',       label: 'Data',        color: '#f59e0b' },
  { id: 'dev-infra',  label: 'Dev Infra',   color: '#64748b' },
  { id: 'workflow',   label: 'Workflow',    color: '#8b5cf6' },
  { id: 'marketing',  label: 'Marketing',   color: '#ef4444' },
  { id: 'proptech',   label: 'PropTech PT', color: '#0ea5e9' },
  { id: 'general',    label: 'Outros',      color: '#9ca3af' },
]

const STATUS_META = {
  discover:    { label: 'Descobrir',     color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  evaluating:  { label: 'A avaliar',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  shortlisted: { label: 'Shortlist',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  integrated:  { label: 'Integrado',     color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  rejected:    { label: 'Rejeitado',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

function ToolLogo({ tool }) {
  const url = tool.domain ? `https://logo.clearbit.com/${tool.domain}` : null
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 10,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', overflow: 'hidden', flexShrink: 0,
    }}>
      {url ? (
        <img
          src={url}
          alt={tool.name}
          style={{ width: 40, height: 40, objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const fb = e.currentTarget.nextElementSibling
            if (fb) fb.style.display = 'inline-flex'
          }}
        />
      ) : null}
      <span style={{
        display: url ? 'none' : 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40,
        color: tool.brand_color || 'var(--text)',
      }}>
        <Lucide.Sparkles size={22} strokeWidth={2} />
      </span>
    </div>
  )
}

function ToolCard({ tool, onEdit, onRemove, onStatusChange }) {
  const status = STATUS_META[tool.status] || STATUS_META.discover
  const catColor = CATEGORIES.find((c) => c.id === tool.category)?.color || '#9ca3af'

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${catColor}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 180,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <ToolLogo tool={tool} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {tool.name}
          </div>
          <div style={{
            fontSize: 10, color: catColor, marginTop: 3,
            fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>{tool.category}</div>
        </div>
        <span style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 3,
          background: status.bg, color: status.color,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>{status.label}</span>
      </div>

      <div style={{
        fontSize: 12, color: 'var(--text-dim)',
        lineHeight: 1.45, flex: 1,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>{tool.description}</div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <a
          href={tool.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 5,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 11,
            textDecoration: 'none', cursor: 'pointer',
          }}
        >
          <ExternalLink size={10} /> Abrir
        </a>
        <select
          value={tool.status}
          onChange={(e) => onStatusChange(tool.id, e.target.value)}
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', padding: '3px 6px', borderRadius: 4,
            fontSize: 10, cursor: 'pointer', outline: 'none',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {Object.entries(STATUS_META).map(([s, m]) => (
            <option key={s} value={s}>{m.label}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => onEdit(tool)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
          title="Editar"
        ><Edit2 size={12} /></button>
        <button
          onClick={() => onRemove(tool)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
          title="Eliminar"
        ><Trash2 size={12} /></button>
      </div>
    </div>
  )
}

function ToolFormModal({ tool, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: tool?.name || '',
    description: tool?.description || '',
    category: tool?.category || 'general',
    url: tool?.url || '',
    domain: tool?.domain || '',
    status: tool?.status || 'discover',
    verticals: tool?.verticals || ['*'],
    notes: tool?.notes || '',
    source: tool?.source || '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.url) return
    setSubmitting(true)
    await onSubmit(form)
    setSubmitting(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 24, width: 480, maxWidth: '90vw',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            {tool ? 'Editar tool' : 'Adicionar tool'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nome *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="URL *">
            <input required type="url" placeholder="https://…" value={form.url}
              onChange={(e) => {
                const url = e.target.value
                const domain = url.replace(/^https?:\/\//, '').split('/')[0]
                setForm({ ...form, url, domain: form.domain || domain })
              }}
              style={inputStyle} />
          </Field>
          <Field label="Domínio (para logo)">
            <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="exemplo.com" style={inputStyle} />
          </Field>
          <Field label="Descrição">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                {Object.entries(STATUS_META).map(([s, m]) => <option key={s} value={s}>{m.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Verticais (separa por vírgula — * = todas)">
            <input value={form.verticals.join(',')} onChange={(e) => setForm({ ...form, verticals: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="*  ou  v2,v5" style={inputStyle} />
          </Field>
          <Field label="Source (onde descobriste)">
            <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Ex: KopkAI Build Day, Twitter @sama" style={inputStyle} />
          </Field>
          <Field label="Notas">
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </Field>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 14px', borderRadius: 6, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
            }}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{
              padding: '8px 14px', borderRadius: 6, background: 'var(--primary)',
              border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {submitting && <Loader2 size={12} className="spin" />}
              {tool ? 'Guardar' : 'Adicionar'}
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
      <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle = {
  padding: '8px 10px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 5,
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export default function UsefulToolsPage() {
  const { activeVertical } = useVerticalStore()
  const { items, loading, create, update, remove } = useUsefulTools()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingTool, setEditingTool] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => {
    let arr = items
    if (categoryFilter !== 'all') arr = arr.filter((i) => i.category === categoryFilter)
    if (statusFilter !== 'all')   arr = arr.filter((i) => i.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter((i) =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q),
      )
    }
    return arr
  }, [items, categoryFilter, statusFilter, search])

  const handleAdd = () => { setEditingTool(null); setModalOpen(true) }
  const handleEdit = (tool) => { setEditingTool(tool); setModalOpen(true) }
  const handleSubmit = async (form) => {
    if (editingTool) await update(editingTool.id, form)
    else await create(form)
  }
  const handleRemove = async (tool) => {
    if (confirm(`Eliminar "${tool.name}"?`)) await remove(tool.id)
  }

  const statusCounts = useMemo(() => {
    const c = {}
    items.forEach((i) => { c[i.status] = (c[i.status] || 0) + 1 })
    return c
  }, [items])

  return (
    <div style={{ padding: '8px 0 40px', maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
      {/* Botão back to Integrations — topo direito */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <Link
          to="/integrations"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', textDecoration: 'none', fontSize: 13,
          }}
        >
          <Plug size={14} /> Integrations
        </Link>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          <Sparkles size={22} style={{ display: 'inline', marginRight: 8, verticalAlign: -2, color: 'var(--primary)' }} />
          Useful Tools
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
          Catálogo de descoberta. Adiciona tools para avaliar agora ou integrar mais tarde.
        </p>
        <div style={{
          marginTop: 10, fontSize: 11, color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {VERTICAL_LABEL[activeVertical?.toLowerCase()] || activeVertical} · {items.length} tools ·
          <span style={{ color: '#10b981', marginLeft: 6 }}>{statusCounts.integrated || 0} integrated</span> ·
          <span style={{ color: '#f59e0b', marginLeft: 6 }}>{statusCounts.shortlisted || 0} shortlist</span> ·
          <span style={{ color: '#3b82f6', marginLeft: 6 }}>{statusCounts.evaluating || 0} evaluating</span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18,
        flexWrap: 'wrap', padding: '0 8px',
      }}>
        <button onClick={handleAdd} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 6,
          background: 'var(--primary)', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: 13, fontWeight: 500,
        }}>
          <Plus size={14} /> Adicionar tool
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', flex: 1, minWidth: 200, maxWidth: 320,
        }}>
          <Search size={14} color="var(--text-dim)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar tools…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13, flex: 1, fontFamily: 'inherit',
            }}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{
          ...inputStyle, width: 'auto', padding: '6px 10px',
        }}>
          <option value="all">Todos status</option>
          {Object.entries(STATUS_META).map(([s, m]) => (
            <option key={s} value={s}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22, padding: '0 8px' }}>
        <button
          onClick={() => setCategoryFilter('all')}
          style={pillStyle(categoryFilter === 'all', '#9ca3af')}
        >Todas</button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            style={pillStyle(categoryFilter === c.id, c.color)}
          >{c.label}</button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <Loader2 size={18} className="spin" /> A carregar…
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
          padding: '0 8px',
        }}>
          {filtered.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onEdit={handleEdit}
              onRemove={handleRemove}
              onStatusChange={(id, status) => update(id, { status })}
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
          <Sparkles size={28} color="var(--text-dim)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, marginBottom: 6 }}>
            Sem tools nesta categoria/vertical. Adiciona a primeira.
          </div>
        </div>
      )}

      {modalOpen && (
        <ToolFormModal
          tool={editingTool}
          onClose={() => { setModalOpen(false); setEditingTool(null) }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

function pillStyle(active, color) {
  return {
    padding: '5px 10px', borderRadius: 4,
    background: active ? color : 'var(--bg-card)',
    color: active ? '#fff' : 'var(--text-dim)',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    fontFamily: 'JetBrains Mono, monospace',
  }
}
