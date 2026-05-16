// RecipeDetailPage — /recipes/:slug full page
// Substitui o RecipeDetailModal: ver tudo + configurar à vontade.
// Mostra Assign + Schedule, lista/chart de steps, agente atribuído,
// botão Edit (inline), Run now, Marcar revista, Apagar.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import {
  ArrowLeft, Play, Edit2, Save, Loader2, Clock, User as UserIcon,
  AlertCircle, CheckCircle2, Trash2, List, Network,
} from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes.js'
import { useAgentsList } from '../hooks/useAgentsList.js'
import RecipeFlowChart from '../components/RecipeFlowChart.jsx'

const CATEGORIES = {
  setup: '#3b82f6', finance: '#f59e0b', growth: '#ec4899', insurance: '#1E3A8A',
  energy: '#FFD60A', maintenance: '#10b981', governance: '#8b5cf6',
  communication: '#06b6d4', reporting: '#a78bfa', general: '#6b7280',
}

function humanizeCron(expr) {
  if (!expr) return ''
  let m = expr.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/)
  if (m) return `diariamente às ${String(m[2]).padStart(2,'0')}h${String(m[1]).padStart(2,'0')}`
  m = expr.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/)
  if (m) return `a cada ${m[1]} minutos`
  m = expr.match(/^(\d+)\s+(\d+)\s+(\d+)\s+\*\s+\*$/)
  if (m) return `dia ${m[3]} do mês às ${String(m[2]).padStart(2,'0')}h${String(m[1]).padStart(2,'0')}`
  m = expr.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/)
  if (m) {
    const dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado']
    return `${dias[parseInt(m[3])] || `dia ${m[3]}`} às ${String(m[2]).padStart(2,'0')}h${String(m[1]).padStart(2,'0')}`
  }
  return expr
}

function nextRunEstimate(cron) {
  if (!cron) return null
  const now = new Date()
  let m = cron.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/)
  if (m) {
    const next = new Date(now)
    next.setHours(parseInt(m[2]), parseInt(m[1]), 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }
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

const input = {
  padding: '8px 10px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export default function RecipeDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { items, loading, update, remove } = useRecipes()
  const { agents } = useAgentsList()

  const recipe = useMemo(
    () => items.find(r => r.slug === slug),
    [items, slug]
  )

  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [running, setRunning] = useState(false)
  const [stepsView, setStepsView] = useState('list')
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (recipe && !draft) {
      setDraft({
        name: recipe.name || '',
        description: recipe.description || '',
        employee_id: recipe.employee_id || '',
        trigger: recipe.trigger || 'manual',
        cron_expr: recipe.cron_expr || '',
        event_pattern: recipe.event_pattern || '',
        active: !!recipe.active,
      })
    }
  }, [recipe, draft])

  if (loading && !recipe) {
    return (
      <div style={{ padding: 40, color: 'var(--text-dim)' }}>
        <Loader2 size={16} className="spin" /> A carregar…
      </div>
    )
  }

  if (!recipe) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>Recipe não encontrada.</p>
        <button
          onClick={() => navigate('/recipes')}
          style={{ marginTop: 12, padding: '6px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}
        >Voltar a recipes</button>
      </div>
    )
  }

  const steps = Array.isArray(recipe.steps) ? recipe.steps : []
  const assignedAgent = agents.find(a => a.employee_id === recipe.employee_id)
  const nextRun = recipe.trigger === 'cron' ? nextRunEstimate(recipe.cron_expr) : null
  const color = recipe.brand_color || CATEGORIES[recipe.category] || '#6b7280'
  const Icon = (recipe.icon && Lucide[recipe.icon]) || Lucide.ChefHat
  const isReviewed = !!recipe.reviewed_at

  const handleSave = async () => {
    setSaving(true)
    const patch = {
      name: draft.name,
      description: draft.description,
      trigger: draft.trigger,
      active: draft.active,
    }
    if (draft.employee_id && /^v\d+\.[a-z_]+$/.test(draft.employee_id)) {
      patch.employee_id = draft.employee_id
    } else if (draft.employee_id === '') {
      patch.employee_id = null
    }
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
    await update(recipe.id, patch)
    setSaving(false)
    setEditMode(false)
  }

  const handleRun = async () => {
    setRunning(true)
    await update(recipe.id, {
      run_count: (recipe.run_count || 0) + 1,
      last_run_at: new Date().toISOString(),
    })
    setRunning(false)
    alert(`Recipe "${recipe.name}" disparada. ${steps.length} steps em execução…`)
  }

  const toggleReviewed = async () => {
    await update(recipe.id, {
      reviewed_at: isReviewed ? null : new Date().toISOString(),
      reviewed_by: isReviewed ? null : 'mario',
    })
  }

  const handleDelete = async () => {
    if (!confirm(`Apagar a recipe "${recipe.name}"?`)) return
    await remove(recipe.id)
    navigate('/recipes')
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '12px 16px 40px' }}>
      {/* Breadcrumb / back */}
      <button
        onClick={() => navigate('/recipes')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', fontSize: 12,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 0', marginBottom: 14,
        }}
      ><ArrowLeft size={13} /> Recipes</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: `${color}22`, color, flexShrink: 0,
        }}>
          <Icon size={22} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editMode ? (
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              style={{ ...input, fontSize: 18, fontWeight: 600 }}
            />
          ) : (
            <h1 style={{ margin: 0, fontSize: 22, color: 'var(--text)', fontWeight: 700 }}>
              {recipe.name}
            </h1>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>
            {recipe.category} · {recipe.slug} · by {recipe.author_name || 'system'}
            {recipe.active === false && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>INACTIVE</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {!editMode && (
            <>
              <button
                onClick={toggleReviewed}
                title={isReviewed ? `Revista em ${new Date(recipe.reviewed_at).toLocaleDateString('pt-PT')} — click para remover` : 'Marcar como revista'}
                style={{
                  background: isReviewed ? 'rgba(16,185,129,0.15)' : 'transparent',
                  border: `1px solid ${isReviewed ? '#10b981' : 'var(--border)'}`,
                  borderRadius: 5, padding: '6px 10px', cursor: 'pointer',
                  color: isReviewed ? '#10b981' : 'var(--text-dim)',
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
                }}
              ><CheckCircle2 size={12} /> {isReviewed ? 'Revista' : 'Marcar revista'}</button>
              <button
                onClick={() => setEditMode(true)}
                style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: 5,
                  padding: '6px 10px', cursor: 'pointer', color: 'var(--text-dim)',
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11,
                }}
              ><Edit2 size={12} /> Editar</button>
              <button
                onClick={handleDelete}
                title="Apagar recipe"
                style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: 5,
                  padding: '6px 8px', cursor: 'pointer', color: 'var(--danger, #ef4444)',
                }}
              ><Trash2 size={12} /></button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {editMode ? (
        <textarea
          rows={3}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="Descrição do que esta recipe faz"
          style={{ ...input, resize: 'vertical', fontFamily: 'inherit', marginBottom: 16 }}
        />
      ) : recipe.description ? (
        <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
          {recipe.description}
        </p>
      ) : null}

      {/* Assign + Schedule */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        marginBottom: 22,
      }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src={assignedAgent.avatar_url}
                alt={assignedAgent.name}
                style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{assignedAgent.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{assignedAgent.employee_id}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#f59e0b', fontStyle: 'italic' }}>
              <AlertCircle size={12} /> Sem agente atribuído
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}><Clock size={10} /> When it runs</div>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <select
                value={draft.trigger}
                onChange={(e) => setDraft({ ...draft, trigger: e.target.value })}
                style={input}
              >
                <option value="manual">Manual (botão Run)</option>
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
                  placeholder="discord.MESSAGE_CREATE"
                  style={{ ...input, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
                />
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                Activa
              </label>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                {recipe.trigger === 'cron' && (recipe.cron_expr ? humanizeCron(recipe.cron_expr) : 'Schedule não definido')}
                {recipe.trigger === 'event' && (recipe.event_pattern || 'Event não definido')}
                {recipe.trigger === 'manual' && 'Manual (botão Run)'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
                {recipe.trigger === 'cron' && recipe.cron_expr ? recipe.cron_expr : recipe.trigger.toUpperCase()}
              </div>
              {nextRun && (
                <div style={{ fontSize: 11, color: '#10b981', marginTop: 6 }}>
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

      {/* Steps */}
      {steps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              fontFamily: 'JetBrains Mono, monospace',
            }}>Steps ({steps.length})</span>
            <div style={{ display: 'inline-flex', gap: 2, padding: 2, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5 }}>
              <button
                type="button" onClick={() => setStepsView('list')}
                style={{
                  padding: '4px 10px', borderRadius: 3, border: 'none', cursor: 'pointer',
                  background: stepsView === 'list' ? 'var(--primary)' : 'transparent',
                  color: stepsView === 'list' ? '#fff' : 'var(--text-dim)',
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                }}
              ><List size={11} /> Lista</button>
              <button
                type="button" onClick={() => setStepsView('chart')}
                style={{
                  padding: '4px 10px', borderRadius: 3, border: 'none', cursor: 'pointer',
                  background: stepsView === 'chart' ? 'var(--primary)' : 'transparent',
                  color: stepsView === 'chart' ? '#fff' : 'var(--text-dim)',
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                }}
              ><Network size={11} /> Fluxo</button>
            </div>
          </div>

          {stepsView === 'chart' ? (
            <RecipeFlowChart steps={steps} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {steps.map((s, i) => {
                const isHuman = s.type === 'human'
                const stepSkills = Array.isArray(s.skills) ? s.skills : (s.skill_tag ? [s.skill_tag] : [])
                return (
                  <div key={i} style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${isHuman ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                    borderLeft: `3px solid ${isHuman ? '#f59e0b' : '#10b981'}`,
                    borderRadius: 8, padding: '12px 16px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: 'var(--primary)',
                        fontFamily: 'JetBrains Mono, monospace',
                        minWidth: 24, textAlign: 'center',
                      }}>{i + 1}.</span>
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{s.name}</span>
                      <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 3,
                        background: isHuman ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)',
                        color: isHuman ? '#f59e0b' : '#10b981',
                        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{isHuman ? 'HUMAN' : 'AGENT'}</span>
                      {(s.retry_max ?? 2) > 0 && !isHuman && (
                        <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                          retry: {s.retry_max ?? 2}
                        </span>
                      )}
                    </div>
                    {s.input && (
                      <div style={{
                        fontSize: 12, color: 'var(--text-dim)',
                        lineHeight: 1.5, padding: '8px 12px',
                        background: 'var(--bg-elevated)', borderRadius: 5,
                        fontFamily: 'JetBrains Mono, monospace',
                        marginLeft: 36,
                      }}>{s.input}</div>
                    )}
                    {stepSkills.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, marginLeft: 36, flexWrap: 'wrap' }}>
                        {stepSkills.map((tag) => (
                          <span key={tag} style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 3,
                            background: 'rgba(107,79,160,0.15)', color: 'var(--primary)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>↪ {tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Action footer */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
        padding: '20px 0 4px', display: 'flex', gap: 10, justifyContent: 'flex-end',
        marginTop: 16,
      }}>
        {editMode ? (
          <>
            <button
              onClick={() => {
                setEditMode(false)
                setDraft({
                  name: recipe.name || '',
                  description: recipe.description || '',
                  employee_id: recipe.employee_id || '',
                  trigger: recipe.trigger || 'manual',
                  cron_expr: recipe.cron_expr || '',
                  event_pattern: recipe.event_pattern || '',
                  active: !!recipe.active,
                })
              }}
              style={{ padding: '9px 16px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}
            >Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 6,
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
              padding: '9px 18px', borderRadius: 6,
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
  )
}
