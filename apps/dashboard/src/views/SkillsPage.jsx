// SkillsPage — /skills · catálogo CookAI-style "Learn skills"
//
// Replica layout https://trycook.ai/skills:
//  • Header: title "Skills" + botões "Skills Review" (secondary) + "Learn Skills" (primary)
//  • Tabs por macro-categoria (All / Core / Generate / Audit / Compose / Classify / Manage / Extract / Other)
//  • Grid 2-col de cards: name + description + tag badge
//  • Click → modal de detalhe (skill receipt + connectors)

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { Sparkles, Search, Plus, ClipboardCheck, X, Loader2, ExternalLink } from 'lucide-react'
import { useSkills } from '../hooks/useSkills.js'

// Macro-categorias (agrupa as 25+ da BD em 8 user-facing buckets)
const MACRO_CATEGORIES = [
  { id: 'all',        label: 'All',        color: '#9ca3af', match: () => true },
  { id: 'core',       label: 'Core',       color: '#6b7280', match: (s) => s.category === 'core' },
  { id: 'content',    label: 'Content',    color: '#10b981', match: (s) => ['compose','content','publish','communication'].includes(s.category) },
  { id: 'data',       label: 'Data',       color: '#3b82f6', match: (s) => ['extract','data-extraction','data-lookup','classification','vision','scoring','simulation','matching'].includes(s.category) },
  { id: 'automation', label: 'Automation', color: '#f59e0b', match: (s) => ['generate','manage','triage','routing','monitor','audit'].includes(s.category) },
  { id: 'attention',  label: 'Attention',  color: '#ef4444', match: (s) => ['escalate','alert','compliance'].includes(s.category) },
  { id: 'research',   label: 'Research',   color: '#8b5cf6', match: (s) => ['social','engineering','productivity'].includes(s.category) },
]

const STATUS_BADGE = {
  active:           { label: 'ACTIVE',  color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  pending_receipt:  { label: 'PENDING', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  draft:            { label: 'DRAFT',   color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  deprecated:       { label: 'DEPRECATED', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

function categoryLabel(cat) {
  if (!cat) return 'OTHER'
  // First N chars uppercase com truncate
  return cat.toUpperCase().slice(0, 14)
}

function tagColor(skill) {
  for (const mc of MACRO_CATEGORIES) {
    if (mc.id !== 'all' && mc.match(skill)) return mc.color
  }
  return '#9ca3af'
}

// ─── SkillDetailModal ─────────────────────────────────────────────────────
function SkillDetailModal({ skill, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 24, width: 600, maxWidth: '100%',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${tagColor(skill)}22`, color: tagColor(skill),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>{skill.name}</h2>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
              {skill.tag} · {skill.category}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {skill.description && (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 0 }}>{skill.description}</p>
        )}

        {skill.connectors?.length > 0 && (
          <Section label="Connectors">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {skill.connectors.map((c) => (
                <span key={c} style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 4,
                  background: 'var(--bg-elevated)', color: 'var(--text)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>{c}</span>
              ))}
            </div>
          </Section>
        )}

        {skill.receipt_md && (
          <Section label="Receipt">
            <pre style={{
              fontSize: 11, color: 'var(--text)', whiteSpace: 'pre-wrap',
              fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6,
              background: 'var(--bg-elevated)', padding: 12, borderRadius: 6,
              margin: 0, maxHeight: 240, overflow: 'auto',
            }}>{skill.receipt_md}</pre>
          </Section>
        )}

        {skill.prompt_template && (
          <Section label="Prompt Template">
            <code style={{
              fontSize: 11, color: 'var(--text)', display: 'block',
              fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5,
              background: 'var(--bg-elevated)', padding: 12, borderRadius: 6,
              wordBreak: 'break-word',
            }}>{skill.prompt_template}</code>
          </Section>
        )}

        {skill.fallback_agent && (
          <Section label="Fallback agent">
            <code style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace' }}>
              {skill.fallback_agent}
            </code>
          </Section>
        )}

        <div style={{ marginTop: 18, display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          <span>usage: {skill.usage_count || 0}×</span>
          {skill.auto_generated && <span>auto-generated</span>}
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
        fontFamily: 'JetBrains Mono, monospace',
      }}>{label}</div>
      {children}
    </div>
  )
}

// ─── SkillCard ────────────────────────────────────────────────────────────
function SkillCard({ skill, onClick }) {
  const color = tagColor(skill)
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 8, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer', minHeight: 110,
        transition: 'border-color 0.12s, background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <code style={{
          fontSize: '0.82rem', fontWeight: 600,
          color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }}>{skill.name || skill.tag}</code>
        {skill.status !== 'active' && (
          <span style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 3,
            background: STATUS_BADGE[skill.status]?.bg, color: STATUS_BADGE[skill.status]?.color,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            letterSpacing: '0.06em', flexShrink: 0,
          }}>{STATUS_BADGE[skill.status]?.label}</span>
        )}
      </div>
      <p style={{
        fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.45, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', flex: 1,
      }}>
        {skill.description || `Skill ${skill.tag}`}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
          background: `${color}1f`, color: color,
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
        }}>{categoryLabel(skill.category)}</span>
        {skill.connectors?.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            {skill.connectors.length} connector{skill.connectors.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function SkillsPage() {
  const navigate = useNavigate()
  const { items, loading, counts } = useSkills()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSkill, setSelectedSkill] = useState(null)

  // Counts per macro-category
  const macroCounts = useMemo(() => {
    const c = {}
    for (const mc of MACRO_CATEGORIES) c[mc.id] = items.filter(mc.match).length
    return c
  }, [items])

  const filtered = useMemo(() => {
    const cat = MACRO_CATEGORIES.find((m) => m.id === activeCat)
    let arr = items.filter(cat?.match || (() => true))
    if (statusFilter !== 'all') arr = arr.filter((s) => s.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.tag?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
      )
    }
    return arr
  }, [items, activeCat, statusFilter, search])

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      {selectedSkill && <SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />}

      {/* Header com action buttons topo direito */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Skills
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
            {counts.total} skills · {counts.active || 0} active · {counts.pending_receipt || 0} pending receipt
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            to="/skills/review"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 6,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-dim)', fontSize: 12, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <ClipboardCheck size={13} /> Skills Review
          </Link>
          <button
            onClick={() => alert('Learn Skills flow — adicionar nova skill manualmente ou via skill-create edge fn.')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 6,
              background: '#10b981', color: '#0d1117', border: 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Learn Skills
          </button>
        </div>
      </div>

      {/* Toolbar: search + status filter */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 14,
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', flex: 1, minWidth: 220, maxWidth: 320,
        }}>
          <Search size={14} color="var(--text-dim)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar skills…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13, flex: 1, fontFamily: 'inherit',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '6px 10px', borderRadius: 6,
            fontSize: 12, cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">Todos status</option>
          <option value="active">Active</option>
          <option value="pending_receipt">Pending receipt</option>
          <option value="draft">Draft</option>
          <option value="deprecated">Deprecated</option>
        </select>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 22 }}>
        {MACRO_CATEGORIES.map((mc) => {
          const active = activeCat === mc.id
          return (
            <button
              key={mc.id}
              onClick={() => setActiveCat(mc.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 6,
                background: active ? `${mc.color}22` : 'transparent',
                border: `1px solid ${active ? mc.color : 'var(--border)'}`,
                color: active ? mc.color : 'var(--text-dim)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em',
              }}
            >
              {mc.label}
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                background: 'var(--bg-elevated)', color: 'var(--text-dim)',
              }}>{macroCounts[mc.id]}</span>
            </button>
          )
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <Loader2 size={18} className="spin" /> A carregar…
        </div>
      )}

      {/* Skills grid 2-col */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: 12,
        }}>
          {filtered.map((skill) => (
            <SkillCard key={skill.id} skill={skill} onClick={() => setSelectedSkill(skill)} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 8, color: 'var(--text-dim)', fontSize: 13,
        }}>
          Nenhuma skill encontrada para {activeCat === 'all' ? 'estes filtros' : `categoria "${activeCat}"`}.
        </div>
      )}
    </div>
  )
}
