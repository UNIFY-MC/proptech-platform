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
import { useNavigate } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { Plus, Search, Play, X, Loader2, Sparkles, MoreHorizontal, ChevronDown, Edit2, Trash2, List, Network, Save, Clock, Zap, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes.js'
import { useAgentsList } from '../hooks/useAgentsList.js'
import { useVerticalStore } from '../store/index.js'
import RecipeFlowChart from '../components/RecipeFlowChart.jsx'

// Humaniza cron expression em PT-PT
function humanizeCron(expr) {
  if (!expr) return ''
  // diariamente
  let m = expr.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/)
  if (m) return `diariamente às ${String(m[2]).padStart(2,'0')}h${String(m[1]).padStart(2,'0')}`
  // a cada N min
  m = expr.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/)
  if (m) return `a cada ${m[1]} minutos`
  // dia N do mês
  m = expr.match(/^(\d+)\s+(\d+)\s+(\d+)\s+\*\s+\*$/)
  if (m) return `dia ${m[3]} do mês às ${String(m[2]).padStart(2,'0')}h${String(m[1]).padStart(2,'0')}`
  // dia da semana
  m = expr.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/)
  if (m) {
    const dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado']
    return `${dias[parseInt(m[3])] || `dia ${m[3]}`} às ${String(m[2]).padStart(2,'0')}h${String(m[1]).padStart(2,'0')}`
  }
  return expr
}

// Calcula próxima execução estimada (aproximada — só para display)
function nextRunEstimate(cron, lastRunAt) {
  if (!cron) return null
  const now = new Date()
  // diariamente HH:MM
  let m = cron.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/)
  if (m) {
    const next = new Date(now)
    next.setHours(parseInt(m[2]), parseInt(m[1]), 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }
  // a cada N min
  m = cron.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/)
  if (m) {
    const minutes = parseInt(m[1])
    const next = new Date(now)
    next.setMinutes(Math.ceil(now.getMinutes() / minutes) * minutes, 0, 0)
    if (next <= now) next.setMinutes(next.getMinutes() + minutes)
    return next
  }
  return null
}

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
function RecipeCard({ recipe, onClick, onMenu, onToggleReviewed }) {
  const color = recipe.brand_color || categoryColor(recipe.category)
  const trigger = TRIGGER_BADGE[recipe.trigger] || TRIGGER_BADGE.manual
  const steps = Array.isArray(recipe.steps) ? recipe.steps : []
  const isReviewed = !!recipe.reviewed_at
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() }}
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
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleReviewed && onToggleReviewed(recipe) }}
          title={isReviewed ? `Revista em ${new Date(recipe.reviewed_at).toLocaleDateString('pt-PT')} — click para remover` : 'Marcar como revista/testada'}
          style={{
            background: isReviewed ? 'rgba(16,185,129,0.15)' : 'transparent',
            border: `1px solid ${isReviewed ? '#10b981' : 'var(--border)'}`,
            borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
            color: isReviewed ? '#10b981' : 'var(--text-dim)',
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 9, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <CheckCircle2 size={10} />
          {isReviewed ? 'OK' : ''}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMenu && onMenu(recipe) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', padding: 2,
          }}
        ><MoreHorizontal size={14} /></button>
      </div>

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
    </div>
  )
}

// ─── RecipeDetailModal ─────────────────────────────────────────────────────
function RecipeDetailModal({ recipe, onClose, onRun, onUpdate }) {
  const steps = Array.isArray(recipe.steps) ? recipe.steps : []
  const [running, setRunning] = useState(false)
  const [stepsView, setStepsView] = useState('list') // 'list' | 'chart'
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    name: recipe.name || '',
    description: recipe.description || '',
    employee_id: recipe.employee_id || '',
    trigger: recipe.trigger || 'manual',
    cron_expr: recipe.cron_expr || '',
    event_pattern: recipe.event_pattern || '',
    active: !!recipe.active,
  })
  const { agents } = useAgentsList()
  const assignedAgent = agents.find(a => a.employee_id === recipe.employee_id)
  const nextRun = recipe.trigger === 'cron' ? nextRunEstimate(recipe.cron_expr) : null

  const handleRun = async () => {
    setRunning(true)
    if (onRun) await onRun(recipe)
    setRunning(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const patch = {
      name: draft.name,
      description: draft.description,
      trigger: draft.trigger,
      active: draft.active,
    }
    // employee_id é opcional mas se preenchido tem de matchar o pattern
    if (draft.employee_id && /^v\d+\.[a-z_]+$/.test(draft.employee_id)) {
      patch.employee_id = draft.employee_id
    } else if (draft.employee_id === '') {
      patch.employee_id = null
    }
    // Só guarda cron_expr se trigger=cron, idem event_pattern
    if (draft.trigger === 'cron') {
      patch.cron_expr = draft.cron_expr || null
      patch.event_pattern = null
    } else if (draft.trigger === 'event') {
      patch.event_pattern = draft.event_pattern || null
      patch.cron_expr = null
    } else {
      patch.cron_expr = null
      patch.event_pattern = null
    }
    if (onUpdate) await onUpdate(recipe.id, patch)
    setSaving(false)
    setEditMode(false)
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
          borderRadius: 10, padding: 24, width: 640, maxWidth: '100%',
          maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <RecipeIcon recipe={recipe} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editMode ? (
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                style={{ ...input, fontSize: 16, fontWeight: 600 }}
              />
            ) : (
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>{recipe.name}</h2>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
              {recipe.category} · {recipe.slug} · by {recipe.author_name || 'system'}
              {recipe.active === false && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>INACTIVE</span>}
            </div>
          </div>
          {!editMode && (
            <button onClick={() => setEditMode(true)} title="Editar" style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 5,
              padding: '4px 8px', cursor: 'pointer', color: 'var(--text-dim)',
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
            }}>
              <Edit2 size={11} /> Edit
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {editMode ? (
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Descrição do que esta recipe faz"
            style={{ ...input, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }}
          />
        ) : recipe.description ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 0 }}>{recipe.description}</p>
        ) : null}

        {/* Assign to + Schedule (sempre visíveis) */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          marginTop: 4, marginBottom: 16,
        }}>
          {/* Assign to */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '10px 12px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              fontFamily: 'JetBrains Mono, monospace',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}><UserIcon size={10} /> Assign to</div>
            {editMode ? (
              <select
                value={draft.employee_id}
                onChange={(e) => setDraft({ ...draft, employee_id: e.target.value })}
                style={input}
              >
                <option value="">— sem agente —</option>
                {agents.map(a => (
                  <option key={a.employee_id} value={a.employee_id}>{a.label}</option>
                ))}
              </select>
            ) : assignedAgent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={assignedAgent.avatar_url}
                  alt={assignedAgent.name}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg)' }}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{assignedAgent.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{assignedAgent.employee_id}</div>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: '#f59e0b', fontStyle: 'italic',
              }}>
                <AlertCircle size={11} /> Sem agente atribuído
              </div>
            )}
          </div>

          {/* Schedule / Trigger */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '10px 12px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              fontFamily: 'JetBrains Mono, monospace',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}><Clock size={10} /> When it runs</div>
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <select
                  value={draft.trigger}
                  onChange={(e) => setDraft({ ...draft, trigger: e.target.value })}
                  style={input}
                >
                  <option value="manual">Manual</option>
                  <option value="cron">Cron (schedule)</option>
                  <option value="event">Event</option>
                </select>
                {draft.trigger === 'cron' && (
                  <input
                    value={draft.cron_expr}
                    onChange={(e) => setDraft({ ...draft, cron_expr: e.target.value })}
                    placeholder="0 18 * * *"
                    style={{ ...input, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
                  />
                )}
                {draft.trigger === 'event' && (
                  <input
                    value={draft.event_pattern}
                    onChange={(e) => setDraft({ ...draft, event_pattern: e.target.value })}
                    placeholder="discord.message_create"
                    style={{ ...input, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
                  />
                )}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  />
                  Activa
                </label>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {recipe.trigger === 'cron' && (recipe.cron_expr ? humanizeCron(recipe.cron_expr) : 'Schedule não definido')}
                  {recipe.trigger === 'event' && (recipe.event_pattern || 'Event não definido')}
                  {recipe.trigger === 'manual' && 'Manual (botão Run)'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                  {recipe.trigger === 'cron' && recipe.cron_expr ? recipe.cron_expr : recipe.trigger.toUpperCase()}
                </div>
                {nextRun && (
                  <div style={{ fontSize: 10, color: '#10b981', marginTop: 4 }}>
                    Próxima: {nextRun.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                )}
                {recipe.last_run_at && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                    Último run: {new Date(recipe.last_run_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Steps — invoca skills (com type Agent/Human + retry + input) */}
        {steps.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                fontFamily: 'JetBrains Mono, monospace',
              }}>Steps ({steps.length})</span>
              <div style={{ display: 'inline-flex', gap: 2, padding: 2, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5 }}>
                <button
                  type="button" onClick={() => setStepsView('list')}
                  style={{
                    padding: '4px 8px', borderRadius: 3, border: 'none', cursor: 'pointer',
                    background: stepsView === 'list' ? 'var(--primary)' : 'transparent',
                    color: stepsView === 'list' ? '#fff' : 'var(--text-dim)',
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                  }}
                ><List size={11} /> List</button>
                <button
                  type="button" onClick={() => setStepsView('chart')}
                  style={{
                    padding: '4px 8px', borderRadius: 3, border: 'none', cursor: 'pointer',
                    background: stepsView === 'chart' ? 'var(--primary)' : 'transparent',
                    color: stepsView === 'chart' ? '#fff' : 'var(--text-dim)',
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                  }}
                ><Network size={11} /> Chart</button>
              </div>
            </div>

            {stepsView === 'chart' ? (
              <RecipeFlowChart steps={steps} />
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((s, i) => {
                const stepType = s.type || 'agent'
                const isHuman = stepType === 'human'
                const stepSkills = Array.isArray(s.skills) ? s.skills : (s.skill_tag ? [s.skill_tag] : [])
                return (
                <div key={i} style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${isHuman ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                  borderLeft: `3px solid ${isHuman ? '#f59e0b' : '#10b981'}`,
                  borderRadius: 6, padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: 'var(--primary)',
                      fontFamily: 'JetBrains Mono, monospace',
                      minWidth: 18, textAlign: 'center',
                  }}>{i + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{s.name}</span>
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 3,
                        background: isHuman ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)',
                        color: isHuman ? '#f59e0b' : '#10b981',
                        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{isHuman ? 'HUMAN' : 'AGENT'}</span>
                      {(s.retry_max ?? 2) > 0 && !isHuman && (
                        <span style={{
                          fontSize: 9, color: 'var(--text-dim)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>retry: {s.retry_max ?? 2}</span>
                      )}
                    </div>
                  </div>
                  </div>
                  {s.input && (
                    <div style={{
                      fontSize: 10, color: 'var(--text-dim)',
                      lineHeight: 1.4, padding: '4px 8px',
                      background: 'var(--bg)', borderRadius: 4,
                      fontFamily: 'JetBrains Mono, monospace',
                      marginLeft: 28,
                    }}>{s.input}</div>
                  )}
                  {stepSkills.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginLeft: 28, flexWrap: 'wrap' }}>
                      {stepSkills.map((tag) => (
                        <span key={tag} style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 3,
                          background: 'rgba(107,79,160,0.15)', color: 'var(--primary)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>↪ {tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )})}
            </div>
            )}
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

        {/* Connectors (Sprint D) */}
        {recipe.connectors?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              fontFamily: 'JetBrains Mono, monospace',
            }}>Connectors ({recipe.connectors.length})</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {recipe.connectors.map((c) => (
                <span key={c} style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 4,
                  background: 'rgba(16,185,129,0.15)', color: '#10b981',
                  fontFamily: 'JetBrains Mono, monospace',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}><Lucide.Check size={9} />{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Permissions (Sprint D) */}
        {recipe.permissions && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              fontFamily: 'JetBrains Mono, monospace',
            }}>Permissions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <PermLine label="Writes allowed"          value={recipe.permissions.writes_allowed} />
              <PermLine label="Requires human approval" value={recipe.permissions.requires_approval} />
              <PermLine label="Can send external email" value={recipe.permissions.external_email} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {editMode ? (
            <>
              <button
                onClick={() => { setEditMode(false); setDraft({
                  name: recipe.name || '',
                  description: recipe.description || '',
                  employee_id: recipe.employee_id || '',
                  trigger: recipe.trigger || 'manual',
                  cron_expr: recipe.cron_expr || '',
                  event_pattern: recipe.event_pattern || '',
                  active: !!recipe.active,
                })}}
                style={{
                  padding: '8px 14px', borderRadius: 6, background: 'transparent',
                  border: '1px solid var(--border)', color: 'var(--text-dim)',
                  cursor: 'pointer', fontSize: 13,
                }}
              >Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 6,
                  background: '#10b981', color: '#fff', border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                Guardar
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CreateRecipeModal ─────────────────────────────────────────────────────
function CreateRecipeModal({ onClose, onSubmit, integrations = [] }) {
  const [form, setForm] = useState({
    name: '', description: '', category: 'general',
    verticals: ['*'], trigger: 'manual', steps: [],
    connectors: [],
    permissions: { writes_allowed: true, requires_approval: false, external_email: false },
  })
  const [activeTab, setActiveTab] = useState('main')
  const toggleConnector = (slug) => {
    setForm(f => ({
      ...f,
      connectors: f.connectors.includes(slug)
        ? f.connectors.filter(s => s !== slug)
        : [...f.connectors, slug],
    }))
  }
  const [stepInput, setStepInput] = useState({
    name: '', type: 'agent', input: '', skills: '', retry_max: 2,
  })
  const [busy, setBusy] = useState(false)

  const addStep = () => {
    if (!stepInput.name) return
    // 1º step tem de ser agent (CookAI rule)
    const enforcedType = form.steps.length === 0 ? 'agent' : stepInput.type
    setForm({
      ...form,
      steps: [...form.steps, {
        name: stepInput.name,
        type: enforcedType,
        input: stepInput.input,
        skills: stepInput.skills.split(',').map(s => s.trim()).filter(Boolean),
        retry_max: Number(stepInput.retry_max) || 0,
        jump_back_to: 'stop',
      }],
    })
    setStepInput({ name: '', type: 'agent', input: '', skills: '', retry_max: 2 })
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

          {/* Steps composer com type + input + skills[] + retry */}
          <Field label="Steps (compõe skills · 1º step tem de ser agent)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.steps.map((s, i) => {
                const isHuman = s.type === 'human'
                return (
                  <div key={i} style={{
                    padding: '8px 10px',
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${isHuman ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                    borderLeft: `3px solid ${isHuman ? '#f59e0b' : '#10b981'}`,
                    borderRadius: 5,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{i + 1}.</span>
                      <span style={{ flex: 1, color: 'var(--text)', fontSize: 12, fontWeight: 500 }}>{s.name}</span>
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 3,
                        background: isHuman ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)',
                        color: isHuman ? '#f59e0b' : '#10b981',
                        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                      }}>{isHuman ? 'HUMAN' : 'AGENT'}</span>
                      <button type="button" onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                        <X size={11} />
                      </button>
                    </div>
                    {s.input && (
                      <div style={{
                        fontSize: 10, color: 'var(--text-dim)', marginLeft: 18,
                        fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.4,
                      }}>{s.input}</div>
                    )}
                    {s.skills?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginLeft: 18, marginTop: 4, flexWrap: 'wrap' }}>
                        {s.skills.map((tag) => (
                          <span key={tag} style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            background: 'rgba(107,79,160,0.15)', color: 'var(--primary)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* New step inputs */}
              <div style={{
                background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
                borderRadius: 5, padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={stepInput.name}
                    onChange={(e) => setStepInput({ ...stepInput, name: e.target.value })}
                    placeholder="Step name (ex: Generate copy)"
                    style={{ ...input, flex: 2 }}
                  />
                  <select
                    value={stepInput.type}
                    onChange={(e) => setStepInput({ ...stepInput, type: e.target.value })}
                    disabled={form.steps.length === 0}
                    style={{ ...input, flex: 1 }}
                    title={form.steps.length === 0 ? 'First step has to be agent' : ''}
                  >
                    <option value="agent">Agent</option>
                    <option value="human">Human</option>
                  </select>
                  <input
                    type="number" min={0} max={5}
                    value={stepInput.retry_max}
                    onChange={(e) => setStepInput({ ...stepInput, retry_max: e.target.value })}
                    placeholder="retry"
                    style={{ ...input, width: 60 }}
                  />
                </div>
                <textarea
                  value={stepInput.input}
                  onChange={(e) => setStepInput({ ...stepInput, input: e.target.value })}
                  placeholder="Input com {{vars}} — ex: Gera copy para {{audience}} em {{tone}}"
                  rows={2}
                  style={{ ...input, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={stepInput.skills}
                    onChange={(e) => setStepInput({ ...stepInput, skills: e.target.value })}
                    placeholder="Skills (vírgula): writer,gmail-sender"
                    style={{ ...input, flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
                  />
                  <button type="button" onClick={addStep} disabled={!stepInput.name} style={{
                    padding: '6px 14px', borderRadius: 5,
                    background: stepInput.name ? 'var(--primary)' : 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: stepInput.name ? '#fff' : 'var(--text-dim)',
                    fontSize: 12, cursor: stepInput.name ? 'pointer' : 'not-allowed',
                  }}>+ Add step</button>
                </div>
              </div>
            </div>
          </Field>

          {/* Tabs Connectors + Permissions */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
              {['main', 'connectors', 'permissions'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTab(t)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px 0', borderBottom: `2px solid ${activeTab === t ? 'var(--primary)' : 'transparent'}`,
                    color: activeTab === t ? 'var(--text)' : 'var(--text-dim)',
                    fontSize: 12, fontWeight: 600, marginBottom: -1,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {t === 'main' ? 'Main' : t === 'connectors' ? `Connectors` : 'Permissions'}
                  {t === 'connectors' && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 3,
                      background: 'var(--bg-elevated)', color: 'var(--text-dim)',
                    }}>{form.connectors.length}</span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'connectors' && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 0, marginBottom: 10 }}>
                  Todas as integrações ligadas são incluídas por defeito. Remove as que não precisas para esta task.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {integrations.length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      Sem integrações connected.
                    </span>
                  )}
                  {integrations.map(int => {
                    const selected = form.connectors.length === 0 || form.connectors.includes(int.slug)
                    return (
                      <button
                        key={int.slug}
                        type="button"
                        onClick={() => toggleConnector(int.slug)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 4,
                          background: selected ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
                          border: `1px solid ${selected ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                          color: selected ? '#10b981' : 'var(--text-dim)',
                          fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        {selected ? <Lucide.Check size={10} /> : <X size={10} />}
                        {int.name}
                      </button>
                    )
                  })}
                </div>
                <div style={{
                  marginTop: 12, padding: 10, borderRadius: 6,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                  fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5,
                }}>
                  ⚠ Cook pode usar todas as tools destes connectors — incluindo writes — sem pedir
                  permissão durante runs. Remove os que não queres que o agent aceda.
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PermToggle
                  label="Permitir writes (criar/editar/apagar)"
                  checked={form.permissions.writes_allowed}
                  onChange={(v) => setForm({ ...form, permissions: { ...form.permissions, writes_allowed: v } })}
                />
                <PermToggle
                  label="Requer aprovação humana antes de cada step"
                  checked={form.permissions.requires_approval}
                  onChange={(v) => setForm({ ...form, permissions: { ...form.permissions, requires_approval: v } })}
                />
                <PermToggle
                  label="Pode enviar email externo (Gmail/Resend)"
                  checked={form.permissions.external_email}
                  onChange={(v) => setForm({ ...form, permissions: { ...form.permissions, external_email: v } })}
                />
              </div>
            )}
          </div>

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

function PermLine({ label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 11, padding: '4px 8px',
      background: 'var(--bg-elevated)', borderRadius: 4,
    }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{
        fontSize: 9, padding: '1px 6px', borderRadius: 3,
        background: value ? 'rgba(16,185,129,0.15)' : 'rgba(156,163,175,0.15)',
        color: value ? '#10b981' : 'var(--text-dim)',
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
      }}>{value ? 'ALLOWED' : 'DENIED'}</span>
    </div>
  )
}

function PermToggle({ label, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px', background: 'var(--bg-elevated)',
      border: '1px solid var(--border)', borderRadius: 5,
      cursor: 'pointer',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text)' }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: 'pointer' }}
      />
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
import { useIntegrations } from '../hooks/useIntegrations.js'

export default function RecipesPage() {
  const navigate = useNavigate()
  const { activeVertical } = useVerticalStore()
  const { items, loading, create, update, remove } = useRecipes()
  const { items: integrations } = useIntegrations()
  const connectedIntegrations = useMemo(
    () => integrations.filter(i => i.status === 'connected'),
    [integrations]
  )
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [scope, setScope] = useState(activeVertical || 'all')
  const [createOpen, setCreateOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)

  const reviewedCount = items.filter(r => r.reviewed_at).length

  const handleToggleReviewed = async (recipe) => {
    await update(recipe.id, {
      reviewed_at: recipe.reviewed_at ? null : new Date().toISOString(),
      reviewed_by: recipe.reviewed_at ? null : 'mario',
    })
  }

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
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px', position: 'relative' }}>
      {createOpen && (
        <CreateRecipeModal
          onClose={() => setCreateOpen(false)}
          onSubmit={create}
          integrations={connectedIntegrations}
        />
      )}

      {/* Top-right shortcuts: Schedules + Triggers (Cook AI-style) */}
      <div style={{
        position: 'absolute', top: 18, right: 12,
        display: 'flex', gap: 6, zIndex: 5,
      }}>
        <button
          onClick={() => navigate('/schedules')}
          title="Ver schedules (cron)"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
        ><Clock size={15} /></button>
        <button
          onClick={() => navigate('/triggers')}
          title="Ver triggers (event)"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
        ><Zap size={15} /></button>
      </div>

      {/* Header centrado CookAI-style */}
      <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          Recipes for your business
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 16px', lineHeight: 1.5 }}>
          As recipes automatizam trabalho no teu negócio. Corre on-demand ou via trigger.
          {items.length > 0 && (
            <span style={{ marginLeft: 8, color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              · {reviewedCount}/{items.length} revistas
            </span>
          )}
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
              onClick={() => navigate(`/recipes/${r.slug}`)}
              onMenu={() => setMenuOpen(r.id === menuOpen ? null : r.id)}
              onToggleReviewed={handleToggleReviewed}
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
