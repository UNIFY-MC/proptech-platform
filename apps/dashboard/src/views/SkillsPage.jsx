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
import { Sparkles, Search, Plus, ClipboardCheck, X, Loader2, ExternalLink, Edit2, Play, Check, Save, FlaskConical } from 'lucide-react'
import { useSkills } from '../hooks/useSkills.js'
import { supabase } from '../lib/supabase.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

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

// ─── SkillDetailModal com Edit / Test / Promote ────────────────────────────
function SkillDetailModal({ skill: initialSkill, onClose, onUpdate }) {
  const [skill, setSkill] = useState(initialSkill)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    receipt_md: initialSkill.receipt_md || '',
    prompt_template: initialSkill.prompt_template || '',
    description: initialSkill.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState(null)
  const [testing, setTesting] = useState(false)
  const [showTest, setShowTest] = useState(false)

  const handleSave = async () => {
    if (!supabase) return
    setSaving(true)
    await supabase.schema('system').from('skills').update({
      receipt_md: editForm.receipt_md,
      prompt_template: editForm.prompt_template,
      description: editForm.description,
    }).eq('id', skill.id)
    setSkill({ ...skill, ...editForm })
    setEditMode(false)
    setSaving(false)
    onUpdate && onUpdate()
  }

  const handlePromote = async () => {
    if (!supabase) return
    await supabase.schema('system').from('skills').update({ status: 'active' }).eq('id', skill.id)
    setSkill({ ...skill, status: 'active' })
    onUpdate && onUpdate()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestOutput(null)
    try {
      // Dispara skill-create com context = testInput (simula run)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/skill-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify({ skill_tag: skill.tag, context: testInput || skill.description }),
      })
      const data = await res.json()
      setTestOutput(data)
    } catch (e) {
      setTestOutput({ error: String(e) })
    }
    setTesting(false)
  }

  const isPending = skill.status === 'pending_receipt'

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
          borderRadius: 10, padding: 24, width: 680, maxWidth: '100%',
          maxHeight: '88vh', overflowY: 'auto',
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
              {skill.tag} · {skill.category} · {skill.status}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} style={btnSecondary}>
              <Edit2 size={11} /> Edit
            </button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} style={btnPrimary}>
                {saving ? <Loader2 size={11} className="spin" /> : <Save size={11} />} Save
              </button>
              <button onClick={() => { setEditMode(false); setEditForm({ receipt_md: skill.receipt_md, prompt_template: skill.prompt_template, description: skill.description }) }} style={btnSecondary}>
                Cancel
              </button>
            </>
          )}
          <button onClick={() => setShowTest(!showTest)} style={btnSecondary}>
            <FlaskConical size={11} /> Test
          </button>
          {isPending && (
            <button onClick={handlePromote} style={btnPromote}>
              <Check size={11} /> Promote to Active
            </button>
          )}
        </div>

        {/* Description */}
        {editMode ? (
          <Section label="Description">
            <textarea
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              style={textareaStyle}
            />
          </Section>
        ) : skill.description && (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 0 }}>{skill.description}</p>
        )}

        {/* Test panel (collapsible) */}
        {showTest && (
          <div style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 8, padding: 12, marginTop: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Test Skill (dry-run via skill-create)
            </div>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Input opcional (contexto que o agent recebe)…"
              rows={2}
              style={textareaStyle}
            />
            <button onClick={handleTest} disabled={testing} style={{ ...btnPrimary, marginTop: 8 }}>
              {testing ? <Loader2 size={11} className="spin" /> : <Play size={11} />} Run Test
            </button>
            {testOutput && (
              <pre style={{
                marginTop: 10, padding: 10, background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 5,
                fontSize: 10, color: 'var(--text)', lineHeight: 1.5,
                fontFamily: 'JetBrains Mono, monospace',
                maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap',
              }}>{JSON.stringify(testOutput, null, 2)}</pre>
            )}
          </div>
        )}

        {/* Connectors */}
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

        {/* Receipt — editável */}
        <Section label="Receipt (recipe passo-a-passo)">
          {editMode ? (
            <textarea
              rows={8}
              value={editForm.receipt_md}
              onChange={(e) => setEditForm({ ...editForm, receipt_md: e.target.value })}
              style={{ ...textareaStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
              placeholder="1. Passo um&#10;2. Passo dois&#10;..."
            />
          ) : skill.receipt_md ? (
            <pre style={{
              fontSize: 11, color: 'var(--text)', whiteSpace: 'pre-wrap',
              fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6,
              background: 'var(--bg-elevated)', padding: 12, borderRadius: 6,
              margin: 0, maxHeight: 240, overflow: 'auto',
            }}>{skill.receipt_md}</pre>
          ) : (
            <div style={{
              padding: 12, background: 'var(--bg-elevated)', borderRadius: 6,
              fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic',
            }}>Sem receita ainda. {isPending ? 'Click "Test" para auto-gerar via Claude Haiku.' : 'Click "Edit" para criar.'}</div>
          )}
        </Section>

        {/* Prompt Template — editável */}
        <Section label="Prompt Template">
          {editMode ? (
            <textarea
              rows={3}
              value={editForm.prompt_template}
              onChange={(e) => setEditForm({ ...editForm, prompt_template: e.target.value })}
              style={{ ...textareaStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
              placeholder="Produz {{format}} sobre {{topic}}..."
            />
          ) : skill.prompt_template ? (
            <code style={{
              fontSize: 11, color: 'var(--text)', display: 'block',
              fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5,
              background: 'var(--bg-elevated)', padding: 12, borderRadius: 6,
              wordBreak: 'break-word',
            }}>{skill.prompt_template}</code>
          ) : (
            <div style={{
              padding: 12, background: 'var(--bg-elevated)', borderRadius: 6,
              fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic',
            }}>Sem template ainda.</div>
          )}
        </Section>

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
          {skill.last_used_at && <span>last: {new Date(skill.last_used_at).toLocaleDateString('pt-PT')}</span>}
        </div>
      </div>
    </div>
  )
}

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', borderRadius: 5,
  background: 'var(--primary)', border: 'none', color: '#fff',
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
}
const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', borderRadius: 5,
  background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)',
  fontSize: 11, fontWeight: 500, cursor: 'pointer',
}
const btnPromote = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', borderRadius: 5,
  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
  color: '#10b981',
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
}
const textareaStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px', borderRadius: 5,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 12, outline: 'none',
  resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
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

// ─── LearnSkillModal — pede skill_tag + context, chama skill-create edge fn ───
function LearnSkillModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ skill_tag: '', context: '' })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.skill_tag) return
    setBusy(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/skill-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify({ skill_tag: form.skill_tag, context: form.context }),
      })
      const data = await res.json()
      setResult(data)
      if (onCreated) onCreated()
    } catch (err) {
      setResult({ error: String(err) })
    }
    setBusy(false)
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, width: 540, maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Sparkles size={20} color="#10b981" />
          <h2 style={{ margin: 0, fontSize: 16 }}>Learn new skill</h2>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 0, marginBottom: 18, lineHeight: 1.5 }}>
          Claude Haiku gera receita + connectors + prompt template automaticamente.
          Skill criada com <code style={{ background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: 3 }}>status=active</code> e fica disponível para usar em recipes.
        </p>

        {result ? (
          <div>
            <div style={{
              padding: 12, borderRadius: 6,
              background: result.error ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
              border: `1px solid ${result.error ? '#ef4444' : '#10b981'}`,
              marginBottom: 12,
            }}>
              {result.error ? (
                <>
                  <strong style={{ color: '#ef4444', fontSize: 13 }}>Erro</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{String(result.error)}</div>
                </>
              ) : (
                <>
                  <strong style={{ color: '#10b981', fontSize: 13 }}>✓ Skill criada: {result.name}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                    <strong>Connectors:</strong> {(result.connectors || []).join(', ') || '—'}<br />
                    <strong>Fallback agent:</strong> {result.fallback_agent || '—'}<br />
                    <strong>Receipt preview:</strong>
                  </div>
                  <pre style={{
                    fontSize: 11, color: 'var(--text)', whiteSpace: 'pre-wrap',
                    fontFamily: 'JetBrains Mono, monospace', marginTop: 6,
                    background: 'var(--bg-elevated)', padding: 8, borderRadius: 4,
                    maxHeight: 200, overflow: 'auto',
                  }}>{result.receipt_preview || '(empty)'}</pre>
                </>
              )}
            </div>
            <button onClick={onClose} style={{
              padding: '8px 14px', borderRadius: 6, background: 'var(--primary)', border: 'none',
              color: '#fff', cursor: 'pointer', fontSize: 13,
            }}>Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Skill tag *
              </span>
              <input
                required
                value={form.skill_tag}
                onChange={(e) => setForm({ ...form, skill_tag: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="linkedin-outreach"
                style={{
                  padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 5, color: 'var(--text)', fontSize: 13, outline: 'none',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>kebab-case · ex: gmail-sender · whatsapp-condomino</span>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Context (opcional — ajuda Claude a gerar melhor)
              </span>
              <textarea
                rows={4}
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
                placeholder="Ex: Para outreach LinkedIn em massa a leads HVAC — escreve mensagens 3-etapas (cold/follow-up 1/follow-up 2). Connectors: linkedin, anthropic."
                style={{
                  padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 5, color: 'var(--text)', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={{
                padding: '8px 14px', borderRadius: 6, background: 'transparent',
                border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
              }}>Cancelar</button>
              <button type="submit" disabled={busy || !form.skill_tag} style={{
                padding: '8px 14px', borderRadius: 6, background: '#10b981', border: 'none',
                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                {busy && <Loader2 size={12} className="spin" />} Generate skill
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function SkillsPage() {
  const navigate = useNavigate()
  const { items, loading, counts, refresh } = useSkills()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [learnOpen, setLearnOpen] = useState(false)

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
      {selectedSkill && <SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} onUpdate={refresh} />}
      {learnOpen && <LearnSkillModal onClose={() => setLearnOpen(false)} onCreated={refresh} />}

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
            onClick={() => setLearnOpen(true)}
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
