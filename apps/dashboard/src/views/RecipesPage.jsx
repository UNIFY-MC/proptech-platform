// RecipesPage — /recipes · catálogo CookAI-style
//
// Replica https://trycook.ai/recipes:
//  • Header centrado "Recipes for your business" + subtitle PT-PT
//  • Botão "+ Create a recipe" primary
//  • Scope dropdown (vertical activa) + Author chip
//  • Grid 2-col de cards: icon coloured + name + description
//  • Tabs por sector (setup/finance/growth/insurance/energy/maintenance/governance/communication)
//  • Click → RecipeDetailModal (steps com skills, trigger, run)

import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Plus, Search, Play, X, Loader2, Sparkles, MoreHorizontal, ChevronDown, Edit2, Trash2 } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes.js'
import { useVerticalStore } from '../store/index.js'

const VERTICAL_LABEL = {
  all: 'todas verticais', v1: 'V1 Core', v2: 'V2 Condomínios', v3: 'V3 Seguros',
  v4: 'V4 Energia', v5: 'V5 Manutenção', v6: 'V6 Reabilitação', v7: 'V7 Real Estate',
  v8: 'V8 Rentals', v9: 'V9 BaaS', v10: 'V10 Owners Club',
}

const CATEGORIES = [
  { id: 'all',           label: 'All',           color: '#9ca3af' },
  { id: 'setup',         label: 'Setup',         color: '#3b82f6' },
  { id: 'finance',       label: 'Finance',       color: '#f59e0b' },
  { id: 'growth',        label: 'Growth',        color: '#ec4899' },
  { id: 'insurance',     label: 'Insurance',     color: '#1E3A8A' },
  { id: 'energy',        label: 'Energy',        color: '#FFD60A' },
  { id: 'maintenance',   label: 'Maintenance',   color: '#10b981' },
  { id: 'governance',    label: 'Governance',    color: '#8b5cf6' },
  { id: 'communication', label: 'Communication', color: '#06b6d4' },
  { id: 'general',       label: 'Other',         color: '#6b7280' },
]

const TRIGGER_BADGE = {
  manual: { label: 'MANUAL', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  cron:   { label: 'CRON',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  event:  { label: 'EVENT',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
}

function categoryColor(id) {
  return CATEGORIES.find((c) => c.id === id)?.color || '#6b7280'
}

// ─── RecipeIcon ────────────────────────────────────────────────────────────
function RecipeIcon({ recipe }) {
  const color = recipe.brand_color || categoryColor(recipe.category)
  const Icon = (recipe.icon && Lucide[recipe.icon]) || Lucide.ChefHat
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}22`, color: color, flexShrink: 0,
    }}>
      <Icon size={18} strokeWidth={2} />
    </div>
  )
}

// ─── RecipeCard ────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onClick, onMenu }) {
  const color = recipe.brand_color || categoryColor(recipe.category)
  const trigger = TRIGGER_BADGE[recipe.trigger] || TRIGGER_BADGE.manual
  const steps = Array.isArray(recipe.steps) ? recipe.steps : []
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer', minHeight: 130,
        position: 'relative',
        transition: 'background 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = color }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onMenu && onMenu(recipe) }}
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', padding: 2,
        }}
      ><MoreHorizontal size={14} /></button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <RecipeIcon recipe={recipe} />
        <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text)',
            lineHeight: 1.3,
          }}>{recipe.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.45,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{recipe.description}</div>
        </div>
      </div>

      {/* Footer: steps count + trigger badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
        {steps.length > 0 && (
          <span style={{
            fontSize: 10, color: 'var(--text-dim)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>{steps.length} step{steps.length === 1 ? '' : 's'}</span>
        )}
        <span style={{
          fontSize: 9, padding: '2px 7px', borderRadius: 3,
          background: trigger.bg, color: trigger.color,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          letterSpacing: '0.06em',
        }}>{trigger.label}</span>
        {recipe.run_count > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {recipe.run_count}× runs
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          {categoryColor(recipe.category) && recipe.category.toUpperCase()}
        </span>
      </div>
    </button>
  )
}

// ─── RecipeDetailModal ─────────────────────────────────────────────────────
function RecipeDetailModal({ recipe, onClose, onRun }) {
  const steps = Array.isArray(recipe.steps) ? recipe.steps : []
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    setRunning(true)
    if (onRun) await onRun(recipe)
    setRunning(false)
  }

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
          <RecipeIcon recipe={recipe} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>{recipe.name}</h2>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
              {recipe.category} · trigger: {recipe.trigger} · by {recipe.author_name || 'system'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {recipe.description && (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 0 }}>{recipe.description}</p>
        )}

        {/* Steps — invoca skills */}
        {steps.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
              fontFamily: 'JetBrains Mono, monospace',
            }}>Steps</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--primary)',
                    fontFamily: 'JetBrains Mono, monospace',
                    minWidth: 18, textAlign: 'center',
                  }}>{i + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>{s.name}</div>
                    {s.skill_tag && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                        <span style={{ color: 'var(--primary)' }}>↪ skill</span>{' '}
                        <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.skill_tag}</code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vertical scope */}
        {recipe.verticals?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              fontFamily: 'JetBrains Mono, monospace',
            }}>Vertical scope</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {recipe.verticals.map((v) => (
                <span key={v} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4,
                  background: 'var(--bg-elevated)', color: 'var(--text)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>{v === '*' ? 'todas' : v}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6,
              background: 'var(--primary)', color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
            Run now
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CreateRecipeModal ─────────────────────────────────────────────────────
function CreateRecipeModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '', description: '', category: 'general',
    verticals: ['*'], trigger: 'manual', steps: [],
  })
  const [stepInput, setStepInput] = useState({ name: '', skill_tag: '' })
  const [busy, setBusy] = useState(false)

  const addStep = () => {
    if (!stepInput.name) return
    setForm({ ...form, steps: [...form.steps, stepInput] })
    setStepInput({ name: '', skill_tag: '' })
  }
  const removeStep = (idx) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) return
    setBusy(true)
    await onSubmit(form)
    setBusy(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, width: 560, maxWidth: '100%',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Criar recipe</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nome *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} />
          </Field>
          <Field label="Descrição">
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
                {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Trigger">
              <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} style={input}>
                <option value="manual">Manual</option>
                <option value="event">Event</option>
                <option value="cron">Cron</option>
              </select>
            </Field>
          </div>
          <Field label="Verticais (separa por vírgula — * = todas)">
            <input value={form.verticals.join(',')} onChange={(e) => setForm({ ...form, verticals: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="* ou v2,v5" style={input} />
          </Field>

          {/* Steps composer */}
          <Field label="Steps (compõe skills)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.steps.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', background: 'var(--bg-elevated)',
                  borderRadius: 5, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}.</span>
                  <span style={{ flex: 1, color: 'var(--text)' }}>{s.name}</span>
                  <code style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {s.skill_tag || '(sem skill)'}
                  </code>
                  <button type="button" onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={stepInput.name}
                  onChange={(e) => setStepInput({ ...stepInput, name: e.target.value })}
                  placeholder="Step name"
                  style={{ ...input, flex: 2 }}
                />
                <input
                  value={stepInput.skill_tag}
                  onChange={(e) => setStepInput({ ...stepInput, skill_tag: e.target.value })}
                  placeholder="skill_tag"
                  style={{ ...input, flex: 1, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <button type="button" onClick={addStep} style={{
                  padding: '6px 12px', borderRadius: 5,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                }}>+ Add</button>
              </div>
            </div>
          </Field>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 14px', borderRadius: 6, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
            }}>Cancelar</button>
            <button type="submit" disabled={busy} style={{
              padding: '8px 14px', borderRadius: 6, background: 'var(--primary)',
              border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {busy && <Loader2 size={12} className="spin" />} Criar
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
  padding: '7px 10px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 5,
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function RecipesPage() {
  const { activeVertical } = useVerticalStore()
  const { items, loading, create, update, remove } = useRecipes()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [scope, setScope] = useState(activeVertical || 'all')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)

  const filtered = useMemo(() => {
    let arr = items
    if (activeCat !== 'all') arr = arr.filter((r) => r.category === activeCat)
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter((r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
      )
    }
    return arr
  }, [items, activeCat, search])

  const categoryCounts = useMemo(() => {
    const c = {}
    items.forEach((r) => { c[r.category] = (c[r.category] || 0) + 1 })
    return c
  }, [items])

  const handleRun = async (recipe) => {
    // Increment run_count + last_run_at (placeholder até edge fn recipe-run)
    await update(recipe.id, { run_count: (recipe.run_count || 0) + 1, last_run_at: new Date().toISOString() })
    alert(`Recipe "${recipe.name}" disparada. ${recipe.steps?.length || 0} steps em execução…`)
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onRun={handleRun}
        />
      )}
      {createOpen && (
        <CreateRecipeModal
          onClose={() => setCreateOpen(false)}
          onSubmit={create}
        />
      )}

      {/* Header centrado CookAI-style */}
      <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          Recipes for your business
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 16px', lineHeight: 1.5 }}>
          As recipes automatizam trabalho no teu negócio. Corre on-demand ou via trigger.
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <Plus size={14} /> Create a recipe
        </button>
      </div>

      {/* Scope + Author + Search */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16,
        alignItems: 'center', flexWrap: 'wrap', padding: '0 8px',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--text-dim)',
        }}>
          <span>Scope:</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>
            {VERTICAL_LABEL[activeVertical?.toLowerCase()] || activeVertical || 'All'}
          </span>
          <ChevronDown size={12} />
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-dim)',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6b4fa0, #d2a8ff)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#fff',
          }}>M</div>
          Author: Mário Carvalho
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', marginLeft: 'auto',
          flex: 1, maxWidth: 280,
        }}>
          <Search size={13} color="var(--text-dim)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar recipes…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13, flex: 1,
            }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 22, padding: '0 8px' }}>
        {CATEGORIES.map((c) => {
          const count = c.id === 'all' ? items.length : (categoryCounts[c.id] || 0)
          if (c.id !== 'all' && count === 0) return null
          const active = activeCat === c.id
          return (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 11px', borderRadius: 6,
                background: active ? `${c.color}22` : 'transparent',
                border: `1px solid ${active ? c.color : 'var(--border)'}`,
                color: active ? c.color : 'var(--text-dim)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em',
              }}
            >
              {c.label}
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                background: 'var(--bg-elevated)', color: 'var(--text-dim)',
              }}>{count}</span>
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

      {/* Grid 2-col CookAI-style */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: 12,
          padding: '0 8px',
        }}>
          {filtered.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onClick={() => setSelectedRecipe(r)}
              onMenu={() => setMenuOpen(r.id === menuOpen ? null : r.id)}
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 8, color: 'var(--text-dim)', fontSize: 13,
        }}>
          Nenhuma recipe encontrada para estes filtros.
          <button onClick={() => setCreateOpen(true)} style={{
            display: 'block', margin: '12px auto 0',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--primary)', fontSize: 12, textDecoration: 'underline',
          }}>+ Criar a primeira recipe</button>
        </div>
      )}
    </div>
  )
}
