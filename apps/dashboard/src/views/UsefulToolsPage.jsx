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
  { id: 'ia-modelos',         label: 'IA e Modelos',         color: '#D97757' },
  { id: 'backend-deploy',     label: 'Backend & Deploy',     color: '#3ECF8E' },
  { id: 'comunicacao',        label: 'Comunicação',          color: '#3B82F6' },
  { id: 'automacao-scraping', label: 'Automação & Scraping', color: '#EA4B71' },
  { id: 'speech-transcricao', label: 'Speech & Reuniões',    color: '#A78BFA' },
  { id: 'produtividade-mcp',  label: 'Produtividade & MCP',  color: '#F59E0B' },
  { id: 'ide-editores',       label: 'IDE & Editores',       color: '#007ACC' },
  { id: 'pagamentos',         label: 'Pagamentos',           color: '#635BFF' },
  { id: 'voice-agents',       label: 'Voice Agents',         color: '#5DFC8B' },
  { id: 'general',            label: 'Outros',               color: '#9ca3af' },
]

const STATUS_META = {
  discover:    { label: 'Descobrir',     color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  evaluating:  { label: 'A avaliar',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  shortlisted: { label: 'Shortlist',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  integrated:  { label: 'Integrado',     color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  rejected:    { label: 'Rejeitado',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

// Domain → simpleicons slug fallback. Necessário quando Clearbit não tem a marca.
const SIMPLEICONS_FALLBACK = {
  'claude.ai':              'anthropic',
  'claude.com':             'anthropic',
  'anthropic.com':          'anthropic',
  'kie.ai':                 'openai', // sem logo dedicado, usa similar
  'wisprflow.ai':           null,
  'fathom.video':           null,
  'fireflies.ai':           null,
  'evolution-api.com':      null,
  'unipile.com':            null,
  'tally.so':               null,
  'tavily.com':             null,
  'blotato.com':            null,
  'vapi.ai':                null,
  'kie.ai':                 null,
  'workspace.google.com':   'google',
  'visualstudio.com':       'visualstudiocode',
  'gmail.com':              'gmail',
  'drive.google.com':       'googledrive',
  'calendar.google.com':    'googlecalendar',
  'github.com':             'github',
  'vercel.com':             'vercel',
  'supabase.com':           'supabase',
  'notion.so':              'notion',
  'cursor.com':             'cursor',
  'warp.dev':               'warp',
  'stripe.com':             'stripe',
  'slack.com':              'slack',
  'miro.com':               'miro',
  'canva.com':              'canva',
  'apify.com':              'apify',
  'twilio.com':             'twilio',
  'resend.com':             'resend',
  'buffer.com':             'buffer',
  'n8n.io':                 'n8n',
  'playwright.dev':         'playwright',
  'perplexity.ai':          'perplexity',
  'elevenlabs.io':          'elevenlabs',
  'openai.com':             'openai',
  'hostinger.com':          'hostinger',
  'pinecone.io':            'pinecone',
  'posthog.com':            'posthog',
}

function ToolLogo({ tool }) {
  const domain = tool.domain
  const primaryUrl = domain ? `https://logo.clearbit.com/${domain}` : null
  const siSlug = SIMPLEICONS_FALLBACK[domain]
  const color = (tool.brand_color || '').replace('#', '')
  const fallbackUrl = siSlug
    ? (color ? `https://cdn.simpleicons.org/${siSlug}/${color}` : `https://cdn.simpleicons.org/${siSlug}`)
    : null

  return (
    <div style={{
      width: 40, height: 40, borderRadius: 8,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', overflow: 'hidden', flexShrink: 0,
    }}>
      {primaryUrl ? (
        <img
          src={primaryUrl}
          alt={tool.name}
          style={{ width: 34, height: 34, objectFit: 'contain' }}
          data-fallback={fallbackUrl || ''}
          onError={(e) => {
            const fb = e.currentTarget.dataset.fallback
            if (fb && e.currentTarget.src !== fb) {
              e.currentTarget.src = fb
              e.currentTarget.dataset.fallback = ''
            } else {
              e.currentTarget.style.display = 'none'
              const lucide = e.currentTarget.nextElementSibling
              if (lucide) lucide.style.display = 'inline-flex'
            }
          }}
        />
      ) : null}
      <span style={{
        display: primaryUrl ? 'none' : 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34,
        color: tool.brand_color || 'var(--text)',
      }}>
        <Lucide.Sparkles size={20} strokeWidth={2} />
      </span>
    </div>
  )
}

function ToolCard({ tool, onEdit, onRemove, onStatusChange }) {
  const status = STATUS_META[tool.status] || STATUS_META.discover
  const catColor = CATEGORIES.find((c) => c.id === tool.category)?.color || '#9ca3af'
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${catColor}`,
        borderRadius: 8,
        padding: '12px 12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 150,
        position: 'relative',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
    >
      {/* Status badge top right */}
      <span style={{
        position: 'absolute', top: 8, right: 8,
        fontSize: 8, padding: '2px 5px', borderRadius: 3,
        background: status.bg, color: status.color,
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{status.label}</span>

      {/* Logo + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
        <ToolLogo tool={tool} />
        <div style={{ minWidth: 0, width: '100%' }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{tool.name}</div>
        </div>
      </div>

      {/* Description compacta */}
      <div style={{
        fontSize: 11, color: 'var(--text-dim)',
        lineHeight: 1.4, flex: 1,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>{tool.description}</div>

      {/* Footer actions — visíveis on-hover ou status select sempre visível */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <a
          href={tool.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '4px 8px', borderRadius: 4,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 10,
            textDecoration: 'none', cursor: 'pointer',
            flex: 1, justifyContent: 'center',
          }}
        >
          <ExternalLink size={9} /> Abrir
        </a>
        {hover && (
          <>
            <button
              onClick={() => onEdit(tool)}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px 6px', borderRadius: 4 }}
              title="Editar"
            ><Edit2 size={10} /></button>
            <button
              onClick={() => onRemove(tool)}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px 6px', borderRadius: 4 }}
              title="Eliminar"
            ><Trash2 size={10} /></button>
          </>
        )}
      </div>

      {/* Status select pequenino bottom */}
      <select
        value={tool.status}
        onChange={(e) => onStatusChange(tool.id, e.target.value)}
        style={{
          background: 'transparent', border: 'none',
          color: 'var(--text-dim)', padding: '2px 0', borderRadius: 0,
          fontSize: 9, cursor: 'pointer', outline: 'none',
          fontFamily: 'JetBrains Mono, monospace',
          textAlign: 'center', appearance: 'none',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}
      >
        {Object.entries(STATUS_META).map(([s, m]) => (
          <option key={s} value={s}>{m.label}</option>
        ))}
      </select>
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

      {/* Grid 6-col (auto-fit + 200px min para responsive: 6 em desktop, menos em mobile) */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))',
          gap: 10,
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
