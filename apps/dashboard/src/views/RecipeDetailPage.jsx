// RecipeDetailPage — /recipes/:slug full page
// Substitui o RecipeDetailModal: ver tudo + configurar à vontade.
// Mostra Assign + Schedule, lista/chart de steps, agente atribuído,
// botão Edit (inline), Run now, Marcar revista, Apagar.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import {
  ArrowLeft, Play, Edit2, Save, Loader2, Clock, User as UserIcon,
  AlertCircle, CheckCircle2, Trash2, List, Network, X, ChefHat,
  Paperclip, UploadCloud,
} from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes.js'
import { useAgentsList } from '../hooks/useAgentsList.js'
import { useRecipeRun, createRecipeRun, approveStep, rejectStep, completeStep, failStep, submitStep5Config, submitStep5AndChain, emitStep8AndChain, invokeRecipeStep, mergeRunInputs } from '../hooks/useRecipeRun.js'
import { supabase } from '../lib/supabase.js'
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

function formatRunDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null
  const ms = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime())
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
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
  const [selectedStepIdx, setSelectedStepIdx] = useState(null)
  const [draft, setDraft] = useState(null)
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [activeRunId, setActiveRunId] = useState(null)
  const [runHistory, setRunHistory] = useState([])
  const [runHistoryLoading, setRunHistoryLoading] = useState(false)
  const [uploadRunning, setUploadRunning] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const uploadRunRef = useRef(null)

  // Auto-resume: ao montar, procura run em curso para esta recipe (sobrevive a reload)
  useEffect(() => {
    if (!recipe?.id || activeRunId || !supabase) return
    let cancelled = false
    async function findActive() {
      const { data } = await supabase
        .schema('system').from('recipe_runs')
        .select('id, status')
        .eq('recipe_id', recipe.id)
        .in('status', ['running','awaiting_approval'])
        .order('triggered_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled && data?.id) setActiveRunId(data.id)
    }
    findActive()
    return () => { cancelled = true }
  }, [recipe?.id, activeRunId])

  useEffect(() => {
    if (!recipe?.id || !supabase) return
    let cancelled = false

    async function fetchRunHistory() {
      setRunHistoryLoading(true)
      const { data, error } = await supabase
        .schema('system').from('recipe_runs')
        .select('id,status,current_step,triggered_at,completed_at,error_message,triggered_by')
        .eq('recipe_id', recipe.id)
        .order('triggered_at', { ascending: false })
        .limit(8)

      if (!cancelled) {
        setRunHistory(error ? [] : (data || []))
        setRunHistoryLoading(false)
      }
    }

    fetchRunHistory()
    return () => { cancelled = true }
  }, [recipe?.id, activeRunId])

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

  const handleRunSubmit = async (inputs) => {
    setRunning(true)
    try {
      const runRow = await createRecipeRun(recipe, inputs.variables || inputs, 'mario')
      await update(recipe.id, {
        run_count: (recipe.run_count || 0) + 1,
        last_run_at: new Date().toISOString(),
      })
      setActiveRunId(runRow.id)
      setRunModalOpen(false)
      // Fechar StepDetailPanel para abrir ExecutionPanel
      setSelectedStepIdx(null)
      console.log('[Run Recipe] criado run', runRow.id, recipe.slug, inputs)
    } catch (err) {
      console.error('[Run Recipe] falhou:', err)
      alert('Falha ao iniciar run: ' + (err.message || 'erro desconhecido'))
    } finally {
      setRunning(false)
    }
  }

  // Upload & Run: carrega ficheiro → Storage → cria run já com o path + defaults.
  const handleUploadAndRun = async (file) => {
    if (!file) return
    setUploadRunning(true)
    setUploadError(null)
    try {
      const schemaInputs = Array.isArray(recipe?.payload_schema?.inputs)
        ? recipe.payload_schema.inputs : []
      // Campo de ficheiro alvo (prefere xlsx_carregadores_path)
      const fileField =
        schemaInputs.find(i => i.name === 'xlsx_carregadores_path') ||
        schemaInputs.find(i => isFileInput(i)) ||
        { name: 'xlsx_carregadores_path' }
      const storagePath = await uploadRecipeFile(file, recipe.slug, fileField.name)
      // Inputs = defaults do schema + path carregado + mode ingest_and_emit.
      // IMPORTANTE: NÃO impor data_anterior/actual/emissao — deixar vazias para o
      // Step 5 usar o período RECOMENDADO pelo diff (senão emite período errado/já emitido).
      const SKIP_DATAS = new Set(['data_anterior', 'data_actual', 'data_emissao'])
      const variables = {}
      schemaInputs.forEach(i => { if (i.default !== undefined && !SKIP_DATAS.has(i.name)) variables[i.name] = i.default })
      variables[fileField.name] = storagePath
      if (schemaInputs.some(i => i.name === 'mode')) variables.mode = 'ingest_and_emit'
      await handleRunSubmit({ variables })
    } catch (e) {
      console.error('[Upload & Run] falhou:', e)
      setUploadError(e.message || 'falha no upload')
      alert('Upload & Run falhou: ' + (e.message || 'erro desconhecido'))
    } finally {
      setUploadRunning(false)
    }
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
    <div style={{
      maxWidth: 980,
      margin: activeRunId ? '0 500px 0 24px' : '0 auto',
      padding: '12px 16px 40px',
      transition: 'margin 0.3s ease',
    }}>
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
                <CronPicker
                  value={draft.cron_expr}
                  onChange={(expr) => setDraft({ ...draft, cron_expr: expr })}
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

      {/* Run history */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            fontFamily: 'JetBrains Mono, monospace',
          }}>Histórico de runs</span>
          {runHistoryLoading && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>A carregar...</span>}
        </div>

        {runHistory.length === 0 && !runHistoryLoading ? (
          <div style={{
            border: '1px dashed var(--border)', borderRadius: 8,
            padding: '10px 12px', color: 'var(--text-dim)', fontSize: 12,
          }}>Sem runs ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {runHistory.map((runRow) => {
              const statusColor =
                runRow.status === 'completed' ? '#10b981' :
                runRow.status === 'failed' || runRow.status === 'rejected' ? '#ef4444' :
                runRow.status === 'awaiting_approval' ? '#f59e0b' :
                '#06b6d4'
              const when = runRow.triggered_at || runRow.completed_at
              const totalSteps = steps.length || '-'
              const stepLabel = `${runRow.current_step || '-'}/${totalSteps}`
              const ownerLabel = assignedAgent?.name || recipe.employee_id || 'sem responsavel'
              const duration = formatRunDuration(runRow.triggered_at, runRow.completed_at)

              return (
                <button
                  key={runRow.id}
                  type="button"
                  onClick={() => {
                    setActiveRunId(runRow.id)
                    setSelectedStepIdx(null)
                  }}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'grid',
                    gridTemplateColumns: '96px 118px 72px minmax(140px, 1fr) 86px 116px',
                    gap: 10, alignItems: 'center',
                    background: activeRunId === runRow.id ? 'var(--bg-elevated)' : 'var(--bg-card)',
                    border: `1px solid ${activeRunId === runRow.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '9px 12px', cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                  title={runRow.error_message || `Abrir run ${runRow.id}`}
                >
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11, color: 'var(--text-dim)',
                  }}>#{runRow.id.slice(0, 8)}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, color: statusColor,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
                    {runRow.status}
                  </span>
                  <span style={{
                    color: 'var(--text-dim)', fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                  }}>step {stepLabel}</span>
                  <span style={{
                    minWidth: 0,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'var(--text-dim)', fontSize: 11,
                    overflow: 'hidden',
                  }}>
                    <UserIcon size={11} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ownerLabel}
                    </span>
                  </span>
                  <span style={{
                    fontSize: 11, color: duration ? 'var(--text-dim)' : 'var(--text-muted, var(--text-dim))',
                    whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {duration || 'a decorrer'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {when ? new Date(when).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                  </span>
                  {runRow.error_message && (
                    <span style={{
                      gridColumn: '1 / -1',
                      color: '#ef4444', fontSize: 11, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {runRow.error_message}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
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
            <RecipeFlowChart steps={steps} onStepClick={setSelectedStepIdx} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {steps.map((s, i) => {
                const isHuman = s.type === 'human'
                const stepSkills = Array.isArray(s.skills) ? s.skills : (s.skill_tag ? [s.skill_tag] : [])
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedStepIdx(i)}
                    style={{
                      background: selectedStepIdx === i ? 'var(--bg-elevated)' : 'var(--bg-card)',
                      borderTop:    `1px solid ${selectedStepIdx === i ? 'var(--primary)' : (isHuman ? 'rgba(245,158,11,0.4)' : 'var(--border)')}`,
                      borderRight:  `1px solid ${selectedStepIdx === i ? 'var(--primary)' : (isHuman ? 'rgba(245,158,11,0.4)' : 'var(--border)')}`,
                      borderBottom: `1px solid ${selectedStepIdx === i ? 'var(--primary)' : (isHuman ? 'rgba(245,158,11,0.4)' : 'var(--border)')}`,
                      borderLeft:   `3px solid ${isHuman ? '#f59e0b' : '#10b981'}`,
                      borderRadius: 8, padding: '12px 16px',
                      display: 'flex', flexDirection: 'column', gap: 8,
                      cursor: 'pointer',
                    }}
                  >
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
          <>
            <input
              ref={uploadRunRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleUploadAndRun(f) }}
            />
            <button
              onClick={() => uploadRunRef.current?.click()}
              disabled={running || uploadRunning}
              title="Carrega um XLSX e arranca a recipe já com esse ficheiro (mode ingest_and_emit)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 6,
                background: 'transparent', color: 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: 13, fontWeight: 600,
                cursor: (running || uploadRunning) ? 'not-allowed' : 'pointer',
              }}
            >
              {uploadRunning ? <Loader2 size={13} className="spin" /> : <UploadCloud size={13} />}
              {uploadRunning ? 'A carregar…' : 'Upload & Run'}
            </button>
            <button
              onClick={() => setRunModalOpen(true)}
              disabled={running || uploadRunning}
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
          </>
        )}
      </div>

      {/* Run Recipe modal */}
      {runModalOpen && (
        <RunRecipeModal
          recipe={recipe}
          assignedAgent={assignedAgent}
          agents={agents}
          running={running}
          onClose={() => setRunModalOpen(false)}
          onSubmit={handleRunSubmit}
        />
      )}

      {/* Step detail side panel (Cook AI-style) — só se NÃO houver run activo */}
      {!activeRunId && selectedStepIdx !== null && steps[selectedStepIdx] && (
        <StepDetailPanel
          step={steps[selectedStepIdx]}
          idx={selectedStepIdx}
          total={steps.length}
          allSteps={steps}
          assignedAgent={assignedAgent}
          agents={agents}
          recipeEmployeeId={recipe.employee_id}
          onClose={() => setSelectedStepIdx(null)}
          onPrev={selectedStepIdx > 0 ? () => setSelectedStepIdx(selectedStepIdx - 1) : null}
          onNext={selectedStepIdx < steps.length - 1 ? () => setSelectedStepIdx(selectedStepIdx + 1) : null}
          onSaveStep={async (patch) => {
            const newSteps = steps.map((s, i) => (i === selectedStepIdx ? { ...s, ...patch } : s))
            await update(recipe.id, { steps: newSteps })
          }}
        />
      )}

      {/* Execution panel — live status do run actual */}
      {activeRunId && (
        <ExecutionPanel
          runId={activeRunId}
          recipe={recipe}
          agents={agents}
          onClose={() => setActiveRunId(null)}
        />
      )}
    </div>
  )
}

// ─── StepDetailPanel ──────────────────────────────────────────────────────
// CookAI-style: read-only view por defeito, Editar abre form completo
// Campos: Name, Type (Agent|Human), Input (com {{var}} highlight), Skills (chips), Retry, Jump back
function StepDetailPanel({ step, idx, total, allSteps, assignedAgent, agents, recipeEmployeeId, onClose, onPrev, onNext, onSaveStep }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newSkillTag, setNewSkillTag] = useState('')
  const [skillModalSlug, setSkillModalSlug] = useState(null)

  // Sync draft sempre que step muda (navegação prev/next) ou ao abrir edit
  useEffect(() => {
    setDraft({
      name:        step.name ?? '',
      type:        step.type === 'human' ? 'human' : 'agent',
      input:       step.input ?? '',
      skills:      Array.isArray(step.skills) ? [...step.skills] : (step.skill_tag ? [step.skill_tag] : []),
      retry_max:   step.retry_max ?? 2,
      jump_back_to: step.jump_back_to ?? 'stop',
      employee_id: step.employee_id ?? '', // '' = herda da recipe
    })
    setEditing(false)
    setNewSkillTag('')
  }, [step])

  if (!draft) return null

  const view = editing ? draft : {
    name:         step.name ?? '',
    type:         step.type === 'human' ? 'human' : 'agent',
    input:        step.input ?? '',
    skills:       Array.isArray(step.skills) ? step.skills : (step.skill_tag ? [step.skill_tag] : []),
    retry_max:    step.retry_max ?? 2,
    jump_back_to: step.jump_back_to ?? 'stop',
    employee_id:  step.employee_id ?? '',
  }
  const isHuman = view.type === 'human'
  const accent  = isHuman ? '#f59e0b' : '#10b981'

  // Resolve agente activo: override do step → recipe-level → undefined
  const activeEmployeeId = view.employee_id || recipeEmployeeId
  const activeAgent = (agents || []).find((a) => a.employee_id === activeEmployeeId) || assignedAgent

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch = {
        name:         draft.name.trim() || `Step ${idx + 1}`,
        type:         draft.type,
        input:        draft.input,
        skills:       draft.skills,
        retry_max:    Number.isFinite(+draft.retry_max) ? +draft.retry_max : 2,
        jump_back_to: draft.jump_back_to,
        employee_id:  draft.employee_id || null, // null = herda recipe
      }
      if (onSaveStep) await onSaveStep(patch)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft({
      name:        step.name ?? '',
      type:        step.type === 'human' ? 'human' : 'agent',
      input:       step.input ?? '',
      skills:      Array.isArray(step.skills) ? [...step.skills] : (step.skill_tag ? [step.skill_tag] : []),
      retry_max:   step.retry_max ?? 2,
      jump_back_to: step.jump_back_to ?? 'stop',
      employee_id: step.employee_id ?? '',
    })
    setEditing(false)
  }

  const addSkill = () => {
    const tag = newSkillTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag) return
    if (draft.skills.includes(tag)) { setNewSkillTag(''); return }
    setDraft({ ...draft, skills: [...draft.skills, tag] })
    setNewSkillTag('')
  }

  const removeSkill = (tag) => {
    setDraft({ ...draft, skills: draft.skills.filter((t) => t !== tag) })
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 460, maxWidth: '100vw',
      background: 'var(--bg)', borderLeft: '1px solid var(--border)',
      overflowY: 'auto', zIndex: 50,
      boxShadow: '-8px 0 24px rgba(0,0,0,0.25)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 4,
          background: `${accent}22`, color: accent,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.08em',
        }}>STEP {idx + 1} / {total}</span>
        <span style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 3,
          background: isHuman ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)',
          color: accent, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
        }}>{isHuman ? 'HUMAN' : 'AGENT'}</span>
        <div style={{ flex: 1 }} />
        {!editing && onSaveStep && (
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text)', padding: '5px 10px',
              borderRadius: 5, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          ><Edit2 size={12} /> Editar</button>
        )}
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
        ><X size={16} /></button>
      </div>

      {/* Subtitle */}
      <div style={{
        padding: '6px 18px 10px', fontSize: 11, color: 'var(--text-dim)',
        borderBottom: '1px solid var(--border)',
      }}>
        {editing ? 'Edita os campos e guarda para gravar em system.recipes.' : 'Vista do step. Carrega em Editar para alterar.'}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: 18, overflowY: 'auto' }}>

        {/* Name */}
        <FieldLabel>Name</FieldLabel>
        {editing ? (
          <input
            type="text" value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="ex: Identificar moras > 60d"
            style={fieldInput}
          />
        ) : (
          <ReadField>{view.name || <em style={{ color: 'var(--text-dim)' }}>(sem nome)</em>}</ReadField>
        )}

        {/* Type — segmented Agent | Human */}
        <FieldLabel style={{ marginTop: 18 }}>Type</FieldLabel>
        {editing ? (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
            border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden',
          }}>
            {['agent', 'human'].map((t) => {
              const selected = draft.type === t
              const label = t === 'agent' ? 'Agent' : 'Human'
              const isFirstStep = idx === 0
              const disabled = isFirstStep && t === 'human'
              return (
                <button
                  key={t} type="button"
                  onClick={() => !disabled && setDraft({ ...draft, type: t })}
                  disabled={disabled}
                  style={{
                    padding: '9px 14px', border: 'none',
                    background: selected ? 'var(--bg-elevated)' : 'transparent',
                    color: selected ? 'var(--text)' : 'var(--text-dim)',
                    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: selected ? 600 : 400,
                    opacity: disabled ? 0.4 : 1,
                  }}
                >{label}</button>
              )
            })}
          </div>
        ) : (
          <ReadField>{isHuman ? 'Human' : 'Agent'}</ReadField>
        )}
        <Helper>The first step has to be an agent — humans only respond after work has been done.</Helper>

        {/* Quem executa — editável quando type=Agent */}
        {!isHuman && (
          <>
            <FieldLabel style={{ marginTop: 18 }}>Quem executa</FieldLabel>
            {editing ? (
              <>
                <select
                  value={draft.employee_id || ''}
                  onChange={(e) => setDraft({ ...draft, employee_id: e.target.value })}
                  style={fieldInput}
                >
                  <option value="">↪ Herda da recipe ({recipeEmployeeId || 'sem agente'})</option>
                  {(agents || []).map((a) => (
                    <option key={a.employee_id} value={a.employee_id}>
                      {a.name} ({a.employee_id})
                    </option>
                  ))}
                </select>
                {activeAgent && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
                    padding: '8px 10px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 6,
                  }}>
                    {activeAgent.avatar_url && (
                      <img src={activeAgent.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}/>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                      <strong>{activeAgent.name}</strong>
                      {!draft.employee_id && <span style={{ color: 'var(--text-dim)', marginLeft: 6, fontSize: 11 }}>· herdado</span>}
                    </div>
                  </div>
                )}
                <Helper>Override per-step. Vazio = herda o agente da recipe.</Helper>
              </>
            ) : activeAgent ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 6,
              }}>
                {activeAgent.avatar_url && (
                  <img src={activeAgent.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}/>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{activeAgent.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {activeAgent.employee_id}
                    {!view.employee_id && <span style={{ marginLeft: 6 }}>· herdado da recipe</span>}
                  </div>
                </div>
              </div>
            ) : (
              <ReadField><em style={{ color: 'var(--text-dim)' }}>(sem agente atribuído)</em></ReadField>
            )}
          </>
        )}
        {isHuman && (
          <>
            <FieldLabel style={{ marginTop: 18 }}>Quem executa</FieldLabel>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 6, color: '#f59e0b', fontSize: 13,
            }}>
              <UserIcon size={14} /> <strong>Tu (Mário)</strong>
              <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>· revê + aprova</span>
            </div>
          </>
        )}

        {/* Input · instrução */}
        <FieldLabel style={{ marginTop: 18 }}>Input</FieldLabel>
        {editing ? (
          <textarea
            value={draft.input}
            onChange={(e) => setDraft({ ...draft, input: e.target.value })}
            placeholder="Instrução para o agente. Usa {{variável}} para placeholders."
            rows={6}
            style={{
              ...fieldInput,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.6,
              resize: 'vertical', minHeight: 100,
            }}
          />
        ) : (
          <div style={{
            padding: '10px 12px', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 6,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.6,
            color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {view.input ? renderWithVariables(view.input) : <em style={{ color: 'var(--text-dim)' }}>(sem input)</em>}
          </div>
        )}
        <Helper>Use {`{{variável}}`} para placeholders (ex: {`{{vertical}}`}, {`{{condominio_id}}`}).</Helper>

        {/* Skills */}
        <FieldLabel style={{ marginTop: 18 }}>Skills{view.skills.length > 0 && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {view.skills.length} edge fn{view.skills.length === 1 ? '' : 's'}</span>}</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {view.skills.length === 0 && !editing && (
            <span style={{ color: 'var(--text-dim)', fontSize: 12, fontStyle: 'italic' }}>(sem skills atribuídas)</span>
          )}
          {view.skills.map((sk) => (
            <button
              key={sk} type="button"
              onClick={() => setSkillModalSlug(sk)}
              title={`Ver detalhes de ${sk}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', background: 'rgba(107,79,160,0.12)',
                border: '1px solid rgba(107,79,160,0.3)', borderRadius: 14,
                fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)',
                cursor: 'pointer', transition: 'background 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(107,79,160,0.22)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(107,79,160,0.12)' }}
            >
              <ChefHat size={12} style={{ color: 'var(--primary)' }} />
              {sk}
              {editing && (
                <span
                  onClick={(e) => { e.stopPropagation(); removeSkill(sk) }}
                  style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--text-dim)', padding: 0 }}
                  title="Remover skill"
                ><X size={11} /></span>
              )}
            </button>
          ))}
        </div>
        {editing && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              type="text" value={newSkillTag}
              onChange={(e) => setNewSkillTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
              placeholder="adicionar skill (ex: verificar-mora)"
              style={{ ...fieldInput, flex: 1, fontSize: 12 }}
            />
            <button
              type="button" onClick={addSkill} disabled={!newSkillTag.trim()}
              style={{
                padding: '7px 14px', borderRadius: 5,
                background: newSkillTag.trim() ? 'var(--primary)' : 'var(--bg-elevated)',
                color: newSkillTag.trim() ? '#fff' : 'var(--text-dim)',
                border: 'none', cursor: newSkillTag.trim() ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600,
              }}
            >+ Add</button>
          </div>
        )}
        <Helper>Edge functions invocadas neste step (snake-case ou kebab-case).</Helper>

        {/* Retry */}
        {!isHuman && (
          <>
            <FieldLabel style={{ marginTop: 18 }}>If it fails, retry up to</FieldLabel>
            {editing ? (
              <input
                type="number" min={0} max={10}
                value={draft.retry_max}
                onChange={(e) => setDraft({ ...draft, retry_max: e.target.value })}
                style={{ ...fieldInput, width: 100 }}
              />
            ) : (
              <ReadField>{view.retry_max}×</ReadField>
            )}
            <Helper>How many times to re-run this step before giving up.</Helper>
          </>
        )}

        {/* Jump back to */}
        <FieldLabel style={{ marginTop: 18 }}>Then jump back to</FieldLabel>
        {editing ? (
          <select
            value={draft.jump_back_to}
            onChange={(e) => setDraft({ ...draft, jump_back_to: e.target.value })}
            style={fieldInput}
          >
            <option value="stop">Stop the recipe</option>
            {(allSteps || []).map((s, i) => (
              i !== idx ? <option key={i} value={i + 1}>Step {i + 1} — {s.name || '(sem nome)'}</option> : null
            ))}
          </select>
        ) : (
          <ReadField>
            {view.jump_back_to === 'stop' || !view.jump_back_to
              ? 'Stop the recipe'
              : `Step ${view.jump_back_to}${allSteps?.[Number(view.jump_back_to) - 1]?.name ? ' — ' + allSteps[Number(view.jump_back_to) - 1].name : ''}`}
          </ReadField>
        )}
        <Helper>If retries still fail, where should the recipe go?</Helper>

      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 18px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        {editing ? (
          <>
            <button
              type="button" onClick={handleCancel} disabled={saving}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-dim)', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
              }}
            >Cancelar</button>
            <button
              type="button" onClick={handleSave} disabled={saving}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 6,
                background: 'var(--primary)', border: 'none',
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >{saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />} Guardar</button>
          </>
        ) : (
          <>
            <button
              onClick={onPrev} disabled={!onPrev}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 5,
                background: 'transparent', border: '1px solid var(--border)',
                color: onPrev ? 'var(--text)' : 'var(--text-dim)',
                cursor: onPrev ? 'pointer' : 'not-allowed', fontSize: 12,
              }}
            >← Step anterior</button>
            <button
              onClick={onNext} disabled={!onNext}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 5,
                background: 'transparent', border: '1px solid var(--border)',
                color: onNext ? 'var(--text)' : 'var(--text-dim)',
                cursor: onNext ? 'pointer' : 'not-allowed', fontSize: 12,
              }}
            >Próximo step →</button>
          </>
        )}
      </div>

      {/* Skill detail modal — overlay sobre o panel */}
      {skillModalSlug && (
        <SkillDetailModal slug={skillModalSlug} onClose={() => setSkillModalSlug(null)} />
      )}
    </div>
  )
}

// ─── Helpers para campos do StepDetailPanel ──────────────────────────────
const fieldInput = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text)', fontSize: 13, outline: 'none',
}

function FieldLabel({ children, style }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)',
      marginBottom: 6, ...style,
    }}>{children}</label>
  )
}

function Helper({ children }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.4 }}>
      {children}
    </div>
  )
}

function ReadField({ children }) {
  return (
    <div style={{
      padding: '8px 12px', background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 6,
      color: 'var(--text)', fontSize: 13,
    }}>{children}</div>
  )
}

// Renderiza texto com {{variável}} highlighted cyan (parity com CookAI)
function renderWithVariables(text) {
  if (!text) return null
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return parts.map((p, i) => {
    if (p.match(/^\{\{[^}]+\}\}$/)) {
      return (
        <span key={i} style={{
          color: '#06b6d4', fontWeight: 600,
          padding: '1px 4px', borderRadius: 3,
          background: 'rgba(6,182,212,0.08)',
        }}>{p}</span>
      )
    }
    return <span key={i}>{p}</span>
  })
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
        fontFamily: 'JetBrains Mono, monospace',
      }}>{label}</div>
      {children}
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-dim)' }}>{k}</span>
      <span style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
    </div>
  )
}

// ─── AgentPicker — custom dropdown com avatar ────────────────────────────
function AgentPicker({ value, agents, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = (agents || []).find((a) => a.employee_id === value)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          ...fieldInput,
          textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        {selected ? (
          <>
            <img
              src={selected.avatar_url} alt=""
              style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <span style={{ flex: 1, color: 'var(--text)' }}>{selected.name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              {selected.employee_id}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--text-dim)' }}>(sem agente atribuído)</span>
        )}
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>▼</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 80 }}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)', zIndex: 81,
            maxHeight: 280, overflowY: 'auto',
          }}>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              style={{
                width: '100%', padding: '10px 14px', textAlign: 'left',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', fontSize: 12, fontStyle: 'italic',
              }}
            >(sem agente atribuído)</button>
            {(agents || []).map((a) => (
              <button
                key={a.employee_id} type="button"
                onClick={() => { onChange(a.employee_id); setOpen(false) }}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  background: a.employee_id === value ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderTop: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = a.employee_id === value ? 'var(--bg-elevated)' : 'transparent' }}
              >
                <img
                  src={a.avatar_url} alt=""
                  style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{a.employee_id}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Upload de ficheiro directo na app ────────────────────────────────────
// Bucket privado partilhado para uploads do Command Center.
const UPLOAD_BUCKET = 'condo-uploads'

// Detecta inputs que aceitam upload de ficheiro: type === 'file' explícito,
// ou heurística por nome (xlsx / ficheiro / *_path) para não exigir migration.
function isFileInput(i) {
  if (!i) return false
  if (i.type === 'file' || i.upload === true) return true
  const n = (i.name || '').toLowerCase()
  return /xlsx|ficheiro|anexo/.test(n) || n.endsWith('_path')
}

// Faz upload para Supabase Storage e devolve o caminho `bucket/objecto`,
// que é o que a recipe recebe como variável (substitui o path G:\ local).
async function uploadRecipeFile(file, recipeSlug, fieldName) {
  if (!supabase) throw new Error('Supabase inactivo (faltam VITE_SUPABASE_*)')
  const safe = (file.name || 'ficheiro').replace(/[^\w.\-]+/g, '_')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const objectPath = `recipes/${recipeSlug}/${fieldName}/${stamp}-${safe}`
  const { error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .upload(objectPath, file, { upsert: true, contentType: file.type || undefined })
  if (error) throw error
  return `${UPLOAD_BUCKET}/${objectPath}`
}

// Campo híbrido: aceita um path local (G:\…, lido pelo worker) OU upload directo.
function FileUploadField({ recipeSlug, fieldName, value, onChange, placeholder }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState(null)
  const [uploadedName, setUploadedName] = useState(null)

  const isStoragePath = typeof value === 'string' && value.startsWith(`${UPLOAD_BUCKET}/`)

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true); setErr(null)
    try {
      const path = await uploadRecipeFile(file, recipeSlug, fieldName)
      onChange(path)
      setUploadedName(file.name)
    } catch (e) {
      setErr(e.message || 'falha no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => { onChange(e.target.value); setUploadedName(null) }}
          placeholder={placeholder}
          style={{ ...fieldInput, flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
        />
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text)',
            cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          {uploading ? <Loader2 size={13} className="spin" /> : <Paperclip size={13} />}
          {uploading ? 'A carregar…' : 'Carregar ficheiro'}
        </button>
      </div>
      {isStoragePath && !err && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: '#10b981' }}>
          <CheckCircle2 size={12} /> Ficheiro carregado{uploadedName ? ` · ${uploadedName}` : ''} (Storage)
        </div>
      )}
      {err && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: '#ef4444' }}>
          <AlertCircle size={12} /> {err}
        </div>
      )}
      <Helper>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <UploadCloud size={11} /> Escreve um path local (G:\…, lido pelo worker) ou carrega o ficheiro directo para Storage.
        </span>
      </Helper>
    </div>
  )
}

// ─── RunRecipeModal ──────────────────────────────────────────────────────
// CookAI-style. Lê payload_schema curado; fallback: auto-extract {{vars}}.
function RunRecipeModal({ recipe, assignedAgent, agents, running, onClose, onSubmit }) {
  // Schema curado (preferido) vs auto-extract (fallback)
  const schemaInputs = useMemo(() => {
    if (recipe?.payload_schema?.inputs && Array.isArray(recipe.payload_schema.inputs)) {
      return recipe.payload_schema.inputs
    }
    // Fallback: extrair {{var}} dos steps
    const steps = Array.isArray(recipe?.steps) ? recipe.steps : []
    const set = new Set()
    steps.forEach((s) => {
      const text = s?.input || ''
      const matches = text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g)
      for (const m of matches) set.add(m[1])
    })
    return Array.from(set).sort().map((name) => ({ name, label: name, type: 'text', required: false }))
  }, [recipe])

  // Init values com defaults do schema
  const [values, setValues] = useState(() => {
    const init = {}
    schemaInputs.forEach((i) => {
      if (i.default !== undefined) init[i.name] = i.default
    })
    return init
  })
  const [assignTo, setAssignTo] = useState(recipe?.employee_id || '')

  // Validation: required fields preenchidos?
  const isValid = schemaInputs.every((i) => {
    if (!i.required) return true
    const v = values[i.name]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      assigned_to: assignTo,
      variables: values,
    })
  }

  if (!recipe) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '100%', maxHeight: '90vh',
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--text)', fontWeight: 700 }}>
              Run {recipe.name}
            </h2>
            {recipe.description && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                {recipe.description}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: 22, overflowY: 'auto' }}>

          {/* Assign to — custom picker com avatar */}
          <FieldLabel>Assign to</FieldLabel>
          <AgentPicker value={assignTo} agents={agents} onChange={setAssignTo} />
          {assignedAgent && assignTo === recipe.employee_id && (
            <Helper>Default da recipe. Podes escolher outro agente para esta execução.</Helper>
          )}

          {/* Inputs do payload_schema */}
          {schemaInputs.length > 0 && (
            <div style={{ marginTop: 22 }}>
              {schemaInputs.map((i) => {
                const val = values[i.name] ?? ''
                const setVal = (v) => setValues({ ...values, [i.name]: v })
                return (
                  <div key={i.name} style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 600,
                      color: 'var(--text)', marginBottom: 4,
                    }}>
                      {i.label || i.name}
                      {i.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                    </label>
                    {i.helper && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, lineHeight: 1.4 }}>
                        {i.helper}
                      </div>
                    )}
                    {isFileInput(i) ? (
                      <FileUploadField
                        recipeSlug={recipe.slug}
                        fieldName={i.name}
                        value={val}
                        onChange={setVal}
                        placeholder={i.placeholder || i.default || ''}
                      />
                    ) : i.type === 'select' ? (
                      <select value={val} onChange={(e) => setVal(e.target.value)} style={fieldInput}>
                        {!i.required && <option value="">—</option>}
                        {(i.options || []).map((o) => (
                          <option key={o.value} value={o.value}>{o.label || o.value}</option>
                        ))}
                      </select>
                    ) : i.type === 'number' ? (
                      <input
                        type="number" step="any"
                        value={val}
                        onChange={(e) => setVal(e.target.value === '' ? '' : Number(e.target.value))}
                        style={fieldInput}
                      />
                    ) : i.type === 'date' ? (
                      <input type="date" value={val} onChange={(e) => setVal(e.target.value)} style={fieldInput} />
                    ) : i.type === 'textarea' ? (
                      <textarea
                        value={val} onChange={(e) => setVal(e.target.value)}
                        rows={3} style={{ ...fieldInput, resize: 'vertical', minHeight: 60 }}
                      />
                    ) : (
                      <input
                        type="text" value={val}
                        onChange={(e) => setVal(e.target.value)}
                        placeholder={i.placeholder || ''}
                        style={fieldInput}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {schemaInputs.length === 0 && (
            <div style={{
              marginTop: 18, padding: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, fontSize: 12, color: 'var(--text-dim)',
              fontStyle: 'italic',
            }}>
              Esta recipe não tem inputs configuráveis. Carrega Launch para correr.
            </div>
          )}

          {/* Run summary */}
          <div style={{
            marginTop: 22, padding: '10px 12px',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6,
            fontSize: 12, color: 'var(--text-dim)',
          }}>
            <strong style={{ color: 'var(--text)' }}>{recipe.steps?.length || 0} steps</strong> · trigger <strong style={{ color: 'var(--text)' }}>{recipe.trigger}</strong>
            {recipe.permissions?.requires_approval && (
              <span style={{ marginLeft: 8, color: '#f59e0b' }}>· requer aprovação humana</span>
            )}
            {recipe.permissions?.external_email && (
              <span style={{ marginLeft: 8, color: '#06b6d4' }}>· envia email externo</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose} disabled={running}
            style={{
              padding: '9px 18px', borderRadius: 6,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-dim)', cursor: running ? 'not-allowed' : 'pointer', fontSize: 13,
            }}
          >Cancel</button>
          <button
            onClick={handleSubmit} disabled={running || !isValid}
            style={{
              padding: '9px 22px', borderRadius: 6,
              background: (!isValid || running) ? 'var(--bg-elevated)' : '#10b981',
              border: 'none',
              color: (!isValid || running) ? 'var(--text-dim)' : '#fff',
              cursor: (running || !isValid) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
            title={!isValid ? 'Preenche os campos obrigatórios primeiro' : ''}
          >
            {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
            Launch
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SkillDetailModal ────────────────────────────────────────────────────
// Modal sobre o panel; click no chip de skill abre detalhes da skill.
function SkillDetailModal({ slug, onClose }) {
  const [skill, setSkill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setNotFound(false); setSkill(null)
      if (!supabase || !slug) { setLoading(false); return }
      const { data, error } = await supabase
        .schema('system').from('skills')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) {
        setNotFound(true)
      } else {
        setSkill(data)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const statusColor = (s) => ({
    active: '#10b981', draft: '#f59e0b', deprecated: '#9ca3af', pending_receipt: '#06b6d4',
  }[s] || '#6b7280')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 540, maxWidth: '100%', maxHeight: '85vh',
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(107,79,160,0.18)', color: 'var(--primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><ChefHat size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>Skill</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{slug}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {loading && (
            <div style={{ color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} className="spin" /> A carregar…
            </div>
          )}

          {!loading && notFound && (
            <div style={{
              padding: 16, background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>Skill ainda não existe em <code>system.skills</code></div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                A recipe referencia este slug mas não há registo correspondente. Cria via <strong>Learn New Skill</strong> (futuro) ou seed manual.
              </div>
            </div>
          )}

          {!loading && skill && (
            <>
              <h2 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--text)' }}>{skill.name}</h2>

              {/* Status + category badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                <span style={{
                  fontSize: 9, padding: '3px 8px', borderRadius: 3,
                  background: `${statusColor(skill.status)}22`, color: statusColor(skill.status),
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{skill.status || 'unknown'}</span>
                {skill.category && (
                  <span style={{
                    fontSize: 9, padding: '3px 8px', borderRadius: 3,
                    background: 'rgba(107,79,160,0.15)', color: 'var(--primary)',
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>{skill.category}</span>
                )}
                {skill.auto_generated && (
                  <span style={{
                    fontSize: 9, padding: '3px 8px', borderRadius: 3,
                    background: 'rgba(6,182,212,0.15)', color: '#06b6d4',
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                  }}>AUTO-GEN</span>
                )}
              </div>

              {/* Description */}
              <FieldLabel>Descrição</FieldLabel>
              <ReadField>
                {skill.description || <em style={{ color: 'var(--text-dim)' }}>(sem descrição)</em>}
              </ReadField>

              {/* Owner */}
              {skill.owner_employee_id && (
                <>
                  <FieldLabel style={{ marginTop: 16 }}>Owner</FieldLabel>
                  <ReadField>{skill.owner_employee_id}</ReadField>
                </>
              )}

              {/* Connectors */}
              {Array.isArray(skill.connectors) && skill.connectors.length > 0 && (
                <>
                  <FieldLabel style={{ marginTop: 16 }}>Connectors</FieldLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {skill.connectors.map((c) => (
                      <span key={c} style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 12,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
                      }}>{c}</span>
                    ))}
                  </div>
                </>
              )}

              {/* Code ref */}
              {skill.code_ref && (
                <>
                  <FieldLabel style={{ marginTop: 16 }}>Code ref</FieldLabel>
                  <ReadField><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{skill.code_ref}</code></ReadField>
                </>
              )}

              {/* Input/Output schema */}
              {skill.input_schema && Object.keys(skill.input_schema || {}).length > 0 && (
                <>
                  <FieldLabel style={{ marginTop: 16 }}>Input schema</FieldLabel>
                  <pre style={{
                    margin: 0, padding: '10px 12px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.5,
                    color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto',
                  }}>{JSON.stringify(skill.input_schema, null, 2)}</pre>
                </>
              )}

              {/* Stats */}
              <FieldLabel style={{ marginTop: 16 }}>Utilização</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <ReadField>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>Usage count</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{skill.usage_count ?? 0}</div>
                </ReadField>
                <ReadField>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>Last used</div>
                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                    {skill.last_used_at ? new Date(skill.last_used_at).toLocaleDateString('pt-PT') : '—'}
                  </div>
                </ReadField>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 6,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 13,
          }}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── ExecutionPanel ──────────────────────────────────────────────────────
// Right-side painel que mostra status live de um recipe_run.
// Polls 2s · mostra cada step com status icon · botões Aprovar/Rejeitar em humanos.
// Normaliza nomes de step (tira acentos + lowercase) para matching robusto.
// Os nomes guardados em recipe_run_steps são ASCII ("Aprovar emissao de avisos");
// comparar com acentos quebrava os painéis de resumo dedicados.
const normName = (x) => (x || '').toLowerCase()
  .replace(/[áàâã]/g, 'a').replace(/[éê]/g, 'e').replace(/í/g, 'i')
  .replace(/[óôõ]/g, 'o').replace(/ú/g, 'u').replace(/ç/g, 'c')
const isStep5Config = (name) => normName(name).includes('configurar periodo')
const isStep8Emit = (name) => normName(name).includes('aprovar emissao')

function ExecutionPanel({ runId, recipe, agents, onClose }) {
  const { run, steps } = useRecipeRun(runId)
  // Set de step_numbers expandidos (permite múltiplos abertos em simultâneo)
  const [expandedSteps, setExpandedSteps] = useState(new Set())
  const toggleStep = (n) => setExpandedSteps((prev) => {
    const next = new Set(prev)
    if (next.has(n)) next.delete(n); else next.add(n)
    return next
  })
  const [processingAction, setProcessingAction] = useState(false)

  // Auto-expand sempre o step que está running ou awaiting_approval (adiciona ao Set, não substitui)
  useEffect(() => {
    const active = steps.find((s) => s.status === 'running' || s.status === 'awaiting_approval')
    if (active) setExpandedSteps((prev) => prev.has(active.step_number) ? prev : new Set(prev).add(active.step_number))
  }, [steps])

  const STATUS_ICON = {
    pending:            { icon: '⭕', color: 'var(--text-dim)', label: 'Pendente' },
    running:            { icon: '⏳', color: '#06b6d4',         label: 'A correr…' },
    awaiting_approval:  { icon: '⚠',  color: '#f59e0b',         label: 'Aguarda aprovação' },
    completed:          { icon: '✓',  color: '#10b981',         label: 'Concluído' },
    failed:             { icon: '✗',  color: '#ef4444',         label: 'Falhou' },
    rejected:           { icon: '⊘',  color: '#ef4444',         label: 'Rejeitado' },
    skipped:            { icon: '−',  color: 'var(--text-dim)', label: 'Saltado' },
  }

  const RUN_STATUS = {
    running:           { color: '#06b6d4', label: 'A CORRER' },
    awaiting_approval: { color: '#f59e0b', label: 'AGUARDA APROVAÇÃO' },
    completed:         { color: '#10b981', label: 'CONCLUÍDO' },
    failed:            { color: '#ef4444', label: 'FALHOU' },
    rejected:          { color: '#ef4444', label: 'REJEITADO' },
    cancelled:         { color: 'var(--text-dim)', label: 'CANCELADO' },
  }

  const handleApprove = async (stepNumber) => {
    setProcessingAction(true)
    try {
      await approveStep(runId, stepNumber, 'mario')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleReject = async (stepNumber) => {
    const reason = prompt('Motivo da rejeição (opcional):') || ''
    setProcessingAction(true)
    try {
      await rejectStep(runId, stepNumber, reason)
    } finally {
      setProcessingAction(false)
    }
  }

  const handleCompleteStep = async (stepNumber) => {
    setProcessingAction(true)
    try {
      await completeStep(runId, stepNumber, 'mario')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleFailStep = async (stepNumber) => {
    const reason = prompt('O que correu mal neste step?') || ''
    setProcessingAction(true)
    try {
      await failStep(runId, stepNumber, reason)
    } finally {
      setProcessingAction(false)
    }
  }

  if (!run) {
    return (
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: 'var(--bg)', borderLeft: '1px solid var(--border)',
        padding: 30, zIndex: 50, color: 'var(--text-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={16} className="spin" />
        <span style={{ marginLeft: 10 }}>A carregar run…</span>
      </div>
    )
  }

  const runStatus = RUN_STATUS[run.status] || RUN_STATUS.running
  const elapsedMs = run.completed_at
    ? new Date(run.completed_at).getTime() - new Date(run.triggered_at).getTime()
    : Date.now() - new Date(run.triggered_at).getTime()
  const elapsed = `${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s`

  const completedCount = steps.filter((s) => s.status === 'completed').length
  const progressPct = steps.length ? Math.round((completedCount / steps.length) * 100) : 0

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 480, maxWidth: '100vw',
      background: 'var(--bg)', borderLeft: '1px solid var(--border)',
      overflowY: 'auto', zIndex: 50,
      boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 4,
          background: `${runStatus.color}22`, color: runStatus.color,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.08em',
        }}>{runStatus.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          {elapsed}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Subtitle + progress bar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          Run #{runId?.slice(0, 8)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          {recipe?.name} · {completedCount}/{steps.length} steps
        </div>
        <div style={{
          height: 6, background: 'var(--bg-card)', borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPct}%`, height: '100%',
            background: runStatus.color, transition: 'width 0.4s',
          }} />
        </div>
      </div>

      {/* Steps list */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {steps.map((s) => {
          const status = STATUS_ICON[s.status] || STATUS_ICON.pending
          const isExpanded = expandedSteps.has(s.step_number)
          const agent = (agents || []).find((a) => a.employee_id === s.agent)
          const isHuman = s.step_type === 'human'
          const isCompleted = s.status === 'completed'
          const outputJson = s.output_jsonb || {}
          const progressLog = Array.isArray(outputJson.progress_log) ? outputJson.progress_log : []
          const outputKeys = Object.keys(outputJson).filter((k) => k !== 'progress_log')
          const hasExecutionEvidence = progressLog.length > 0 || outputKeys.length > 0
          const canCompleteManually = s.status === 'running'
            && !['failed', 'rejected', 'completed'].includes(run.status)
            && hasExecutionEvidence

          return (
            <div key={s.id} style={{
              marginBottom: 8,
              border: `1px solid ${isCompleted ? '#10b981' : s.status === 'running' ? '#06b6d4' : s.status === 'awaiting_approval' ? '#f59e0b' : 'var(--border)'}`,
              background: s.status === 'running' ? 'rgba(6,182,212,0.06)'
                        : s.status === 'awaiting_approval' ? 'rgba(245,158,11,0.06)'
                        : isCompleted ? 'rgba(16,185,129,0.06)'
                        : 'var(--bg-card)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div
                onClick={() => toggleStep(s.step_number)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: `${status.color}22`, color: status.color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{status.icon}</span>

                <span style={{
                  fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace',
                  flexShrink: 0,
                }}>{s.step_number}.</span>

                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {s.step_name}
                </span>

                {/* Model badge */}
                {!isHuman && (() => {
                  const stepFromRecipe = (recipe?.steps || [])[s.step_number - 1]
                  const model = stepFromRecipe?.model
                  if (!model) return null
                  const colors = {
                    haiku:       { bg: 'rgba(16,185,129,0.18)', fg: '#10b981' },
                    sonnet:      { bg: 'rgba(107,79,160,0.18)', fg: 'var(--primary)' },
                    opus:        { bg: 'rgba(245,158,11,0.18)', fg: '#f59e0b' },
                    'gpt-5-codex':{ bg: 'rgba(6,182,212,0.18)', fg: '#06b6d4' },
                    codex:       { bg: 'rgba(6,182,212,0.18)', fg: '#06b6d4' },
                  }
                  const c = colors[model] || { bg: 'var(--bg-elevated)', fg: 'var(--text-dim)' }
                  return (
                    <span style={{
                      fontSize: 8, padding: '2px 5px', borderRadius: 3,
                      background: c.bg, color: c.fg,
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }} title={`Modelo: ${model}`}>{model}</span>
                  )
                })()}

                {isHuman ? (
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 3,
                    background: 'rgba(245,158,11,0.18)', color: '#f59e0b',
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                  }}>HUMAN</span>
                ) : agent ? (
                  <img src={agent.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }}
                    onError={(e) => { e.currentTarget.style.display = 'none' }} title={agent.name} />
                ) : null}

                {s.duration_ms != null && (
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                    {s.duration_ms < 1000 ? `${s.duration_ms}ms` : `${Math.round(s.duration_ms / 1000)}s`}
                  </span>
                )}
              </div>

              {canCompleteManually && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, marginLeft: 32 }}>
                  <button
                    onClick={() => handleCompleteStep(s.step_number)}
                    disabled={processingAction}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: 5,
                      background: '#10b981', color: '#fff', border: 'none',
                      cursor: processingAction ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >Concluir step</button>
                  <button
                    onClick={() => handleFailStep(s.step_number)}
                    disabled={processingAction}
                    style={{
                      padding: '7px 12px', borderRadius: 5,
                      background: 'transparent', color: '#ef4444', border: '1px solid #ef4444',
                      cursor: processingAction ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >Falhou</button>
                </div>
              )}

              {s.status === 'running' && !hasExecutionEvidence && (
                <div style={{
                  marginTop: 10, marginLeft: 32, padding: '8px 10px',
                  borderRadius: 5, border: '1px dashed rgba(6,182,212,0.45)',
                  background: 'rgba(6,182,212,0.05)', color: 'var(--text-dim)',
                  fontSize: 11, lineHeight: 1.45,
                }}>
                  Ainda sem progresso/output deste step. O executor real ainda nao escreveu evidencias;
                  conclui apenas depois de aparecerem logs ou output validavel.
                </div>
              )}

              {/* Expanded detail */}
              {isExpanded && (() => {
                const stepCfg = (recipe?.steps || [])[s.step_number - 1] || {}
                const inputTpl = stepCfg.input || ''
                const modelLabel = stepCfg.model || 'determinístico'
                const modelReason = stepCfg.model_reason || (stepCfg.model ? 'Execução com modelo AI.' : 'Execução por código/RPC, sem chamada LLM.')
                // Heurística connectors: pull do skill via name pattern (rpc:, edge fn, etc)
                const connectorsFromSkill = (s.skills || []).flatMap((sk) => {
                  if (sk.startsWith('v2-') || sk.startsWith('v1-')) return [`edge-fn:${sk}`]
                  if (sk === 'send-email') return ['edge-fn:send-email','resend']
                  return []
                })
                const progressLog = s.output_jsonb?.progress_log || []

                return (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', marginLeft: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>

                    {/* Quem executa */}
                    {!isHuman && agent && (
                      <ExecField label="Quem executa">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={agent.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          <strong style={{ color: 'var(--text)' }}>{agent.name}</strong>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>{s.agent}</span>
                        </div>
                      </ExecField>
                    )}
                    {isHuman && (
                      <ExecField label="Quem executa">
                        <span style={{ color: '#f59e0b' }}><strong>Tu (Mário)</strong> · revê e aprova</span>
                      </ExecField>
                    )}

                    {/* Skills */}
                    {Array.isArray(s.skills) && s.skills.length > 0 && (
                      <ExecField label={`Skills · ${s.skills.length}`}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {s.skills.map((sk) => (
                            <span key={sk} style={{
                              fontSize: 10, padding: '3px 8px', borderRadius: 10,
                              background: 'rgba(107,79,160,0.15)', color: 'var(--text)',
                              fontFamily: 'JetBrains Mono, monospace',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}><ChefHat size={10} style={{ color: 'var(--primary)' }} />{sk}</span>
                          ))}
                        </div>
                      </ExecField>
                    )}

                    <ExecField label="Modelo">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 10,
                          background: stepCfg.model ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.12)',
                          color: stepCfg.model ? '#10b981' : 'var(--text-dim)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>{modelLabel}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{modelReason}</span>
                      </div>
                    </ExecField>

                    {/* Connectors */}
                    {connectorsFromSkill.length > 0 && (
                      <ExecField label="Connectors">
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {connectorsFromSkill.map((c) => (
                            <span key={c} style={{
                              fontSize: 10, padding: '3px 8px', borderRadius: 10,
                              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                              color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
                            }}>{c}</span>
                          ))}
                        </div>
                      </ExecField>
                    )}

                    {/* Instrução (input template) */}
                    {inputTpl && (
                      <CollapsibleExecField label="Instrução" defaultOpen={false}>
                        <pre style={{
                          margin: 0, padding: '8px 10px',
                          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5,
                          fontSize: 11, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5,
                          color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          maxHeight: 140, overflowY: 'auto',
                        }}>{inputTpl}</pre>
                      </CollapsibleExecField>
                    )}

                    {/* Progress log (real-time messages) */}
                    {progressLog.length > 0 && (
                      <CollapsibleExecField label={`Progress live · ${progressLog.length}`} defaultOpen={isHuman}>
                        <div style={{
                          padding: '8px 10px', background: '#000', borderRadius: 5,
                          fontSize: 11, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6,
                          color: '#10b981', maxHeight: 200, overflowY: 'auto',
                        }}>
                          {progressLog.map((line, j) => (
                            <div key={j}>$ {line}</div>
                          ))}
                        </div>
                      </CollapsibleExecField>
                    )}

                    {/* Resumo amigável do output (antes do JSON cru) */}
                    {s.output_jsonb && <StepSummary step={s} />}

                    {/* Output JSON (collapsable, para debug) */}
                    {s.output_jsonb && Object.keys(s.output_jsonb).filter(k => k !== 'progress_log').length > 0 && (
                      <CollapsibleExecField label="Output JSON" defaultOpen={false}>
                        <pre style={{
                          margin: 0, padding: '8px 10px',
                          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5,
                          fontSize: 11, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5,
                          color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          maxHeight: 240, overflowY: 'auto',
                        }}>{JSON.stringify(
                          Object.fromEntries(Object.entries(s.output_jsonb).filter(([k]) => k !== 'progress_log')),
                          null, 2
                        )}</pre>
                      </CollapsibleExecField>
                    )}

                    {/* Timings */}
                    {(s.started_at || s.completed_at) && (
                      <ExecField label="Timings">
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {s.started_at && <div>started: {new Date(s.started_at).toLocaleTimeString('pt-PT')}</div>}
                          {s.completed_at && <div>completed: {new Date(s.completed_at).toLocaleTimeString('pt-PT')}</div>}
                          {s.duration_ms != null && <div>duration: {s.duration_ms < 1000 ? s.duration_ms+'ms' : Math.round(s.duration_ms/1000)+'s'}</div>}
                        </div>
                      </ExecField>
                    )}

                    {s.rejected_reason && (
                      <div style={{ fontSize: 11, color: '#ef4444' }}>
                        Motivo rejeição: {s.rejected_reason}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Renderers dedicados por step_name (paridade legacy V2). Substituem o approval genérico.
                  Matching insensível a acentos — os nomes em BD são ASCII. */}
              {recipe.slug === 'fluxo-quota-extra-carregadores' && s.status === 'awaiting_approval' && isStep5Config(s.step_name) && (
                <Step5ConfigForm
                  step={s}
                  runId={runId}
                  allSteps={steps}
                  recipeInputs={run?.inputs_jsonb}
                  processing={processingAction}
                  setProcessing={setProcessingAction}
                />
              )}

              {recipe.slug === 'fluxo-quota-extra-carregadores' && isStep8Emit(s.step_name) && ['awaiting_approval', 'completed', 'failed', 'rejected'].includes(s.status) && (
                <Step8EmitPanel
                  step={s}
                  runId={runId}
                  allSteps={steps}
                  recipeInputs={run?.inputs_jsonb}
                  processing={processingAction}
                  setProcessing={setProcessingAction}
                  onReject={handleReject}
                  readonly={s.status !== 'awaiting_approval'}
                />
              )}

              {/* Recipe Emissão de Avisos Mensais — relatório no gate (Step "Aprovar emissao") */}
              {recipe.slug === 'emissao-avisos-mensais' && isStep8Emit(s.step_name) && ['awaiting_approval', 'completed', 'failed', 'rejected'].includes(s.status) && (
                <AvisosGatePanel
                  step={s}
                  runId={runId}
                  allSteps={steps}
                  recipeInputs={run?.inputs_jsonb}
                  processing={processingAction}
                  setProcessing={setProcessingAction}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  readonly={s.status !== 'awaiting_approval'}
                />
              )}

              {/* Approval action genérico — só aparece se NÃO houver renderer dedicado */}
              {s.status === 'awaiting_approval'
                && !(recipe.slug === 'fluxo-quota-extra-carregadores' && isStep5Config(s.step_name))
                && !(isStep8Emit(s.step_name) && (recipe.slug === 'fluxo-quota-extra-carregadores' || recipe.slug === 'emissao-avisos-mensais')) && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, marginLeft: 32 }}>
                  <button
                    onClick={() => handleApprove(s.step_number)}
                    disabled={processingAction}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: 5,
                      background: '#10b981', color: '#fff', border: 'none',
                      cursor: processingAction ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >✓ Aprovar</button>
                  <button
                    onClick={() => handleReject(s.step_number)}
                    disabled={processingAction}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: 5,
                      background: 'transparent', color: '#ef4444', border: '1px solid #ef4444',
                      cursor: processingAction ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >✗ Rejeitar</button>
                </div>
              )}
            </div>
          )
        })}

        {steps.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
            A inicializar steps…
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0,
        fontSize: 11, color: 'var(--text-dim)',
      }}>
        Run ID: <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{runId}</code>
      </div>
    </div>
  )
}


function ExecField({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 700, color: "var(--text-dim)",
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4,
        fontFamily: "JetBrains Mono, monospace",
      }}>{label}</div>
      {children}
    </div>
  )
}

// ─── CronPicker: friendly UI para escolher periodicidade ───────────────────
// Gera cron expression (min hour dom month dow) a partir de selectors simples
function CronPicker({ value, onChange }) {
  // Parse cron expression existente (5 campos)
  const parsed = parseCron(value || '0 9 * * *')
  const [freq, setFreq] = useState(parsed.freq)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [dom, setDom] = useState(parsed.dom)     // dia do mês (1-31)
  const [dow, setDow] = useState(parsed.dow)     // dia da semana (0-6, 0=Dom)

  useEffect(() => {
    const expr = buildCron(freq, hour, minute, dom, dow)
    if (expr !== value) onChange(expr)
  }, [freq, hour, minute, dom, dow])

  const sel = { padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }
  const DAYS_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>Frequência</span>
          <select value={freq} onChange={(e) => setFreq(e.target.value)} style={sel}>
            <option value="daily">Todos os dias</option>
            <option value="weekly">Semanal (dia da semana)</option>
            <option value="monthly">Mensal (dia do mês)</option>
            <option value="hourly">Cada hora</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>Hora</span>
          <select value={hour} onChange={(e) => setHour(Number(e.target.value))} style={sel} disabled={freq === 'hourly'}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:{String(minute).padStart(2, '0')}</option>
            ))}
          </select>
        </label>
      </div>

      {freq === 'weekly' && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>Dia da semana</span>
          <select value={dow} onChange={(e) => setDow(Number(e.target.value))} style={sel}>
            {DAYS_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </label>
      )}

      {freq === 'monthly' && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>Dia do mês</span>
          <select value={dom} onChange={(e) => setDom(Number(e.target.value))} style={sel}>
            {Array.from({ length: 31 }, (_, d) => <option key={d + 1} value={d + 1}>Dia {d + 1}</option>)}
          </select>
        </label>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', padding: '6px 10px', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 4 }}>
        <strong style={{ color: '#10b981' }}>{describeCron(freq, hour, minute, dom, dow)}</strong>
        <span style={{ marginLeft: 8, color: 'var(--text-dim)' }}>· cron: <code>{buildCron(freq, hour, minute, dom, dow)}</code></span>
      </div>
    </div>
  )
}

function parseCron(expr) {
  const parts = (expr || '').trim().split(/\s+/)
  if (parts.length !== 5) return { freq: 'daily', minute: 0, hour: 9, dom: 1, dow: 0 }
  const [m, h, dm, mo, dw] = parts
  const minute = parseInt(m, 10) || 0
  const hour = parseInt(h, 10) || 0
  if (dw !== '*') return { freq: 'weekly', minute, hour, dom: 1, dow: parseInt(dw, 10) || 0 }
  if (dm !== '*') return { freq: 'monthly', minute, hour, dom: parseInt(dm, 10) || 1, dow: 0 }
  if (h === '*') return { freq: 'hourly', minute, hour: 0, dom: 1, dow: 0 }
  return { freq: 'daily', minute, hour, dom: 1, dow: 0 }
}

function buildCron(freq, hour, minute, dom, dow) {
  switch (freq) {
    case 'hourly':  return `${minute} * * * *`
    case 'daily':   return `${minute} ${hour} * * *`
    case 'weekly':  return `${minute} ${hour} * * ${dow}`
    case 'monthly': return `${minute} ${hour} ${dom} * *`
    default:        return `${minute} ${hour} * * *`
  }
}

function describeCron(freq, hour, minute, dom, dow) {
  const t = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  switch (freq) {
    case 'hourly':  return `Cada hora ao minuto ${minute}`
    case 'daily':   return `Todos os dias às ${t}`
    case 'weekly':  return `Todas as ${days[dow]}s às ${t}`
    case 'monthly': return `Dia ${dom} de cada mês às ${t}`
    default:        return `Diário às ${t}`
  }
}

// ─── Step 5: Configurar período + preço (paridade legacy V2) ──────────────
// 3 dropdowns (datas) + preço + descricao + Calcular
function Step5ConfigForm({ step, runId, allSteps, recipeInputs, processing, setProcessing }) {
  // Datas disponíveis: vêm do output do Step 2 (datas_em_ambos + datas_novas_xlsx)
  const step2 = allSteps.find((s) => s.step_number === 2)
  const datasV2 = step2?.output_jsonb?.v2_state?.datas_existentes ?? []
  const datasXlsx = step2?.output_jsonb?.diff?.datas_novas_xlsx ?? []
  const datasUniao = [...new Set([...datasV2, ...datasXlsx])].sort()

  const recomendacao = step2?.output_jsonb?.recomendacao_periodo_emissao ?? {}
  const defaultAnterior = recipeInputs?.data_anterior || recomendacao.data_anterior_sugerida || datasV2[datasV2.length - 1] || ''
  const defaultActual = recipeInputs?.data_actual || recomendacao.data_actual_sugerida || datasXlsx[datasXlsx.length - 1] || datasV2[datasV2.length - 1] || ''
  const defaultEmissao = recipeInputs?.data_emissao || new Date().toISOString().slice(0, 10)
  const defaultPreco = recipeInputs?.preco_kwh ?? 0.1861
  const defaultDescricao = recipeInputs?.descricao || 'Eletricidade Carregadores'

  const [dataAnterior, setDataAnterior] = useState(defaultAnterior)
  const [dataActual, setDataActual] = useState(defaultActual)
  const [dataEmissao, setDataEmissao] = useState(defaultEmissao)
  const [precoKwh, setPrecoKwh] = useState(defaultPreco)
  const [descricao, setDescricao] = useState(defaultDescricao)

  function fmtDate(d) { const [y,m,day] = (d || '').split('-'); return d ? `${day}.${m}.${y}` : '' }
  const periodoRef = `Eletricidade Carregadores (${fmtDate(dataAnterior)} → ${fmtDate(dataActual)})`

  const handleCalcular = async () => {
    if (!dataAnterior || !dataActual) { alert('Escolhe leitura anterior e actual'); return }
    if (dataAnterior >= dataActual) { alert('Leitura anterior tem de ser ANTES da actual'); return }
    setProcessing(true)
    try {
      // CHAIN síncrona: guarda Step 5 → invoca Step 6 (calcular) → invoca Step 7 (validar) → Step 8 awaiting
      const result = await submitStep5AndChain(runId, {
        data_anterior: dataAnterior,
        data_actual: dataActual,
        data_emissao: dataEmissao,
        preco_kwh: Number(precoKwh),
        descricao,
        periodo_referencia: periodoRef,
      })
      console.log('[Step5] chain completa:', result)
    } catch (e) {
      console.error('[Step5] chain falhou:', e)
      alert(`Falha: ${e.message}\n\nVerifica:\n1. V2_SERVICE_ROLE_KEY configurado na edge function?\n2. Edge function deployada?\n3. Consola F12 para detalhe`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{ marginTop: 10, marginLeft: 32, padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>Leitura anterior</label>
          <select
            value={dataAnterior}
            onChange={(e) => setDataAnterior(e.target.value)}
            disabled={processing}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
          >
            <option value="">—</option>
            {datasUniao.map((d) => (
              <option key={d} value={d}>{fmtDate(d)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>Leitura actual</label>
          <select
            value={dataActual}
            onChange={(e) => setDataActual(e.target.value)}
            disabled={processing}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
          >
            <option value="">—</option>
            {datasUniao.map((d) => (
              <option key={d} value={d}>{fmtDate(d)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>Data de emissão</label>
          <input
            type="date"
            value={dataEmissao}
            onChange={(e) => setDataEmissao(e.target.value)}
            disabled={processing}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>Preço kWh</label>
          <input
            type="number"
            step="0.0001"
            value={precoKwh}
            onChange={(e) => setPrecoKwh(e.target.value)}
            disabled={processing}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>Descrição (period_referencia)</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            disabled={processing}
            placeholder="Eletricidade Carregadores"
            style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
          />
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, padding: '6px 10px', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 4 }}>
        Preview: <span style={{ color: 'var(--text)' }}>{periodoRef}</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleCalcular}
          disabled={processing || !dataAnterior || !dataActual}
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 5,
            background: '#8c6508', color: '#fff', border: 'none',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
          }}
        >⚡ Calcular preview</button>
      </div>
    </div>
  )
}

// ─── Step 8: Preview avisos + Emitir (Gate 2) ──────────────────────────────
function Step8EmitPanel({ step, runId, allSteps, recipeInputs, processing, setProcessing, onReject, readonly = false }) {
  const step6 = allSteps.find((s) => s.step_number === 6)
  const step9 = allSteps.find((s) => s.step_number === 9)
  const calc = step6?.output_jsonb ?? {}
  const preview = (calc.preview_avisos ?? []).filter((p) => p.kwh_consumo != null && p.kwh_consumo > 0 && p.valor_eur != null && p.valor_eur > 0)
  const total = calc.total_emitir ?? 0
  const periodo = calc.periodo_referencia ?? ''
  const dataEmissao = recipeInputs?.data_emissao || new Date().toISOString().slice(0, 10)
  // Estado pós-aprovação (registo do que foi aprovado/emitido)
  const emitido = step9?.status === 'completed'
  const statusLabel = emitido ? '✅ Emitido em V2' : step.status === 'completed' ? '✓ Aprovado por ti' : step.status === 'rejected' ? '✗ Rejeitado' : step.status === 'failed' ? '✗ Falhou' : ''

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [progress, setProgress] = useState([])
  const [result, setResult] = useState(null)

  const handleEmitirClick = () => setConfirmOpen(true)

  const handleConfirmEmit = async () => {
    setConfirmOpen(false)
    setProgress([])
    setProgressOpen(true)
    setProcessing(true)
    try {
      const res = await emitStep8AndChain(runId, 'mario', (event) => {
        setProgress((p) => [...p, event])
      })
      console.log('[Step8] chain completa:', res)
      // Aguarda 800ms para Mário ver o último evento, depois mostra resultado
      setTimeout(() => {
        setProgressOpen(false)
        setResult({ ok: true, n: res.step9_output?.n_documentos ?? '?', total: res.step9_output?.total_emitir ?? null })
      }, 800)
    } catch (e) {
      console.error('[Step8] chain falhou:', e)
      setTimeout(() => {
        setProgressOpen(false)
        setResult({ ok: false, error: e.message })
      }, 800)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{ marginTop: 10, marginLeft: 32, padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
        {readonly && statusLabel && (
          <div style={{ marginBottom: 6, fontWeight: 700, color: emitido ? '#10b981' : step.status === 'completed' ? '#10b981' : '#ef4444' }}>
            {statusLabel}{emitido && step9?.output_jsonb?.n_documentos != null ? ` · ${step9.output_jsonb.n_documentos} documentos` : ''}
          </div>
        )}
        <strong>{preview.length}</strong> avisos · total <strong>€{Number(total).toFixed(2)}</strong>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{periodo}</div>
        {readonly && <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 4 }}>Registo do que foi aprovado/emitido (leitura).</div>}
      </div>

      {preview.length > 0 && (
        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 5, marginBottom: 12 }}>
          <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Fracção</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Condómino</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)' }}>kWh</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)' }}>€</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.fracao_codigo} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 8px', color: 'var(--text)' }}>{p.fracao_codigo}</td>
                  <td style={{ padding: '5px 8px', color: 'var(--text-dim)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.condomino_nome || '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text)' }}>{p.kwh_consumo}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>€{Number(p.valor_eur).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!readonly && (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleEmitirClick}
          disabled={processing || preview.length === 0}
          style={{
            flex: 2, padding: '8px 14px', borderRadius: 5,
            background: '#8c6508', color: '#fff', border: 'none',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
          }}
        >{processing ? '⏳ A emitir…' : `⚡ Emitir ${preview.length} avisos · €${Number(total).toFixed(2)}`}</button>
        <button
          onClick={() => onReject(8)}
          disabled={processing}
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 5,
            background: 'transparent', color: '#ef4444', border: '1px solid #ef4444',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 600,
          }}
        >✗ Rejeitar</button>
      </div>
      )}

      {/* Modal de confirmação inline (substitui o confirm() nativo) */}
      {confirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 10, padding: 24,
            maxWidth: 480, width: '90%', border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(140,101,8,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>⚡</div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Confirmar emissão</h3>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: 'var(--text-dim)' }}>Período:</span>
                <span style={{ color: 'var(--text)' }}>{periodo.replace('Eletricidade Carregadores ', '')}</span>
                <span style={{ color: 'var(--text-dim)' }}>Data emissão:</span>
                <span style={{ color: 'var(--text)' }}>{dataEmissao}</span>
                <span style={{ color: 'var(--text-dim)' }}>N.º avisos:</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{preview.length}</span>
                <span style={{ color: 'var(--text-dim)' }}>Total a cobrar:</span>
                <span style={{ color: '#10b981', fontWeight: 700, fontSize: 14 }}>€{Number(total).toFixed(2)}</span>
                <span style={{ color: 'var(--text-dim)' }}>Destino:</span>
                <span style={{ color: 'var(--text)' }}>V2 produção (prataowners.pt)</span>
              </div>
            </div>

            <div style={{
              padding: '8px 12px', marginBottom: 16,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5,
              fontSize: 11, color: '#ef4444', lineHeight: 1.5,
            }}>
              ⚠ Esta acção cria <strong>{preview.length} documentos legais</strong> em produção. Os condóminos verão a quota extra na conta corrente. Não é reversível via UI.
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmOpen(false)}
                style={{
                  padding: '8px 18px', borderRadius: 5,
                  background: 'transparent', color: 'var(--text)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                }}
              >Cancelar</button>
              <button
                onClick={handleConfirmEmit}
                style={{
                  padding: '8px 18px', borderRadius: 5,
                  background: '#8c6508', color: '#fff', border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                }}
              >⚡ Confirmar emissão · €{Number(total).toFixed(2)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de progresso LIVE (Steps 9-11 step-by-step) */}
      {progressOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 10, padding: 24,
            maxWidth: 540, width: '90%', border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(140,101,8,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>⚙️</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Recipe em execução</h3>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                  fluxo-quota-extra-carregadores · Steps 8 → 11
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg)', borderRadius: 6, padding: 14,
              border: '1px solid var(--border)', maxHeight: 360, overflowY: 'auto',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.7,
            }}>
              {progress.length === 0 && (
                <div style={{ color: 'var(--text-dim)' }}>A iniciar…</div>
              )}
              {progress.map((ev, i) => {
                const icon = ev.status === 'running' ? '⏳' : ev.status === 'done' ? '✅' : ev.status === 'failed' ? '❌' : ev.status === 'skipped' ? '⏸' : '·'
                const color = ev.status === 'running' ? '#06b6d4' : ev.status === 'done' ? '#10b981' : ev.status === 'failed' ? '#ef4444' : ev.status === 'skipped' ? 'var(--text-dim)' : 'var(--text)'
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, color, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, lineHeight: 1.3 }}>{icon}</span>
                    <span style={{ flex: 1 }}>{ev.label}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
              {progress.some((p) => p.phase === 'complete') ? 'Concluído. A fechar…' : 'Não feches esta janela. Recipe está a correr…'}
            </div>
          </div>
        </div>
      )}

      {/* Modal de resultado pós-emissão */}
      {result && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 10, padding: 24,
            maxWidth: 480, width: '90%', border: `1px solid ${result.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: result.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>{result.ok ? '✅' : '❌'}</div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {result.ok ? 'Emissão concluída' : 'Falha na emissão'}
              </h3>
            </div>

            {result.ok ? (
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>
                <strong>{result.n}</strong> avisos de quota extra emitidos em V2 produção.
                {result.total != null && <> Total cobrado: <strong>€{Number(result.total).toFixed(2)}</strong>.</>}
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                  Os documentos estão visíveis em <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>conta_corrente_2026</code>. Recipe run concluído.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', padding: 10, background: 'rgba(239,68,68,0.08)', borderRadius: 5, marginBottom: 16, lineHeight: 1.5 }}>
                {result.error}
              </div>
            )}

            <button
              onClick={() => setResult(null)}
              style={{
                width: '100%', padding: '8px 18px', borderRadius: 5,
                background: result.ok ? '#10b981' : 'var(--border)',
                color: result.ok ? '#fff' : 'var(--text)', border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
              }}
            >Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Resumo amigável do output por step_name ──────────────────────────────
// ─── AvisosGatePanel ──────────────────────────────────────────────────────
// Gate da recipe "Emissão de Avisos Mensais": relatório de quotas a emitir
// (valor + comparação com mês anterior) + escolha da data de emissão.
function AvisosGatePanel({ step, runId, allSteps, recipeInputs, processing, setProcessing, onApprove, onReject, readonly = false }) {
  const stepConf = allSteps.find((s) => Array.isArray(s.skills) && s.skills[0] === 'conferir-orcamento-fracao')
  const conf = stepConf?.output_jsonb || {}
  const comparacao = Array.isArray(conf.comparacao) ? conf.comparacao : []
  const anomalias = Array.isArray(conf.anomalias) ? conf.anomalias : []
  const ano = Number(recipeInputs?.ano) || new Date().getFullYear()
  const mes = Number(recipeInputs?.mes) || 1
  const defaultDate = recipeInputs?.data_emissao || `${ano}-${String(mes).padStart(2, '0')}-01`
  const [dataEmissao, setDataEmissao] = useState(defaultDate)

  const stepEmit = allSteps.find((s) => Array.isArray(s.skills) && s.skills[0] === 'emitir-avisos-mensais')
  const emitido = stepEmit?.status === 'completed'

  const handleEmitir = async () => {
    if (!dataEmissao) { alert('Escolhe a data de emissão'); return }
    setProcessing(true)
    try {
      await mergeRunInputs(runId, { data_emissao: dataEmissao })
      await onApprove(step.step_number)   // aprova gate → executor emite com a data
    } finally {
      setProcessing(false)
    }
  }

  const fmt = (v) => v == null ? '—' : `€${Number(v).toFixed(2)}`

  return (
    <div style={{ marginTop: 10, marginLeft: 32, padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}>
      {readonly && (
        <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 12, color: emitido ? '#10b981' : step.status === 'rejected' ? '#ef4444' : 'var(--text)' }}>
          {emitido ? '✅ Avisos emitidos em V2' : step.status === 'completed' ? '✓ Aprovado' : step.status === 'rejected' ? '✗ Rejeitado' : '✗ Falhou'}
          <span style={{ fontWeight: 400, color: 'var(--text-dim)', marginLeft: 8 }}>(registo do que foi aprovado)</span>
        </div>
      )}

      {/* Cabeçalho do relatório */}
      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>
        <strong>{conf.n_fracoes ?? comparacao.length}</strong> frações · total <strong>{fmt(conf.total)}</strong>
        <span style={{ color: 'var(--text-dim)' }}> (quota {fmt(conf.quota)} + FCR {fmt(conf.fcr)})</span>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{conf.periodo} · comparado com {conf.mes_anterior}</div>
      </div>

      {/* Anomalias */}
      {anomalias.length > 0 && (
        <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 5, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.4)', fontSize: 11, color: 'var(--text)' }}>
          ⚠️ <strong>{anomalias.length}</strong> fração(ões) com variação &gt;10% vs {conf.mes_anterior}:
          {' '}{anomalias.slice(0, 6).map((a) => `${a.fracao} (${fmt(a.anterior)}→${fmt(a.novo)}, ×${a.ratio})`).join(' · ')}
        </div>
      )}

      {/* Data de emissão */}
      {!readonly && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>Data de emissão</label>
          <input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} disabled={processing}
            style={{ padding: '6px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
        </div>
      )}

      {/* Tabela comparação */}
      {comparacao.length > 0 && (
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 5, marginBottom: 12 }}>
          <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Fração</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{conf.mes_anterior || 'Anterior'}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)' }}>{conf.periodo || 'Novo'}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {comparacao.map((c) => {
                const anomalo = c.ratio != null && c.ratio > 1.10
                return (
                  <tr key={c.fracao} style={{ borderBottom: '1px solid var(--border)', background: anomalo ? 'rgba(245,158,11,0.08)' : 'transparent' }}>
                    <td style={{ padding: '5px 8px', color: 'var(--text)' }}>{c.fracao}{anomalo ? ' ⚠️' : ''}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-dim)' }}>{fmt(c.anterior)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>{fmt(c.novo)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: c.delta > 0 ? '#10b981' : 'var(--text-dim)' }}>{c.delta == null ? '—' : (c.delta > 0 ? '+' : '') + Number(c.delta).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!readonly && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleEmitir} disabled={processing || comparacao.length === 0}
            style={{ flex: 2, padding: '8px 14px', borderRadius: 5, background: '#1a5296', color: '#fff', border: 'none', cursor: processing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}>
            {processing ? '⏳ A emitir…' : `📋 Emitir ${conf.n_fracoes ?? comparacao.length} avisos · ${fmt(conf.total)} · ${dataEmissao}`}
          </button>
          <button onClick={() => onReject(step.step_number)} disabled={processing}
            style={{ flex: 1, padding: '8px 14px', borderRadius: 5, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: processing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
            ✗ Rejeitar
          </button>
        </div>
      )}
    </div>
  )
}

function StepSummary({ step }) {
  const o = step.output_jsonb || {}
  const isSkipped = step.status === 'skipped' || o.skipped_reason
  const isFailed = step.status === 'failed' || o.error

  // Falha — destaque vermelho
  if (isFailed) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 6,
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
        fontSize: 12, color: '#ef4444', lineHeight: 1.5, marginTop: 4,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>❌ Falhou</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{o.error}</div>
      </div>
    )
  }

  // Skipped — destaque amarelo/cinza
  if (isSkipped) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 6,
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
        fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginTop: 4,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#f59e0b' }}>⏸ Saltado por decisão de configuração</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>{o.skipped_reason || 'Step não executado nesta sprint.'}</div>
      </div>
    )
  }

  // Resumo específico por step_name.
  // Os nomes guardados em BD são ASCII (sem acentos); os case labels abaixo têm
  // acentos. Mapeamos o nome real → label existente via normName (senão não havia resumo).
  const SUMMARY_ALIASES = {
    'ler xlsx carregadores': 'Ler XLSX carregadores e extrato',
    'analisar diferencas vs bd': 'Analisar diferenças vs BD',
    'configurar periodo + preco': 'Configurar período + preço',
    'calcular valor por fracao': 'Calcular valor por fracção',
    'validar cobertura de fracoes': 'Validar cobertura de frações',
    'aprovar emissao de avisos': 'Aprovar emissão de avisos',
    'conferir conta corrente pos-emissao': 'Conferir conta corrente pós-emissão',
    'aprovar ingest em v2 producao': 'Aprovar ingest em V2 produção',
  }
  const effectiveName = SUMMARY_ALIASES[normName(step.step_name)] || step.step_name
  let summary = null

  switch (effectiveName) {
    case 'Verificar snapshot do ficheiro': {
      summary = (
        <>
          <div>
            Ficheiro <strong>{o.file_changed === false ? 'sem alterações' : 'com alterações/validado'}</strong>
            {o.size_bytes != null && <> · <strong>{Number(o.size_bytes).toLocaleString('pt-PT')}</strong> bytes</>}
          </div>
          {o.modified_at && (
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
              Modificado: {new Date(o.modified_at).toLocaleString('pt-PT')}
            </div>
          )}
          {o.sha256 && (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
              SHA256: {o.sha256.slice(0, 18)}...
            </div>
          )}
        </>
      )
      break
    }
    case 'Ler XLSX extrato': {
      summary = (
        <>
          <div>
            <strong>{o.xlsx_rows ?? '?'}</strong> movimentos lidos
            {o.sheet && <> · sheet <strong>{o.sheet}</strong></>}
          </div>
          {(o.first_doc || o.last_doc) && (
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
              Documentos: <strong>{o.first_doc || '-'}</strong> → <strong>{o.last_doc || '-'}</strong>
            </div>
          )}
          {Array.isArray(o.headers) && o.headers.length > 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 4, lineHeight: 1.4 }}>
              {o.headers.join(' · ')}
            </div>
          )}
        </>
      )
      break
    }
    case 'Normalizar movimentos': {
      summary = (
        <>
          <div>
            <strong>{o.movimentos_normalizados ?? '?'}</strong> movimentos normalizados para formato Bancos
            {Array.isArray(o.errors) && <> · <strong style={{ color: o.errors.length ? '#f59e0b' : '#10b981' }}>{o.errors.length}</strong> erros</>}
          </div>
          {o.sheet_hash && (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
              Hash normalizado: {o.sheet_hash.slice(0, 18)}...
            </div>
          )}
        </>
      )
      break
    }
    case 'Classificar receita e despesa': {
      summary = (
        <>
          <div>
            <strong style={{ color: '#10b981' }}>{o.receitas ?? 0}</strong> receitas · <strong style={{ color: '#ef4444' }}>{o.despesas ?? 0}</strong> despesas
            {o.saldo_informativo != null && <> · {o.saldo_informativo} saldo/informativo</>}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
            {o.desconhecidos ?? 0} movimentos sem código/rubrica para revisão
          </div>
        </>
      )
      break
    }
    case 'Comparar movimentos vs BD': {
      summary = (
        <>
          <div>
            <strong>{o.xlsx_movimentos ?? '?'}</strong> no XLSX · <strong>{o.app_movimentos ?? '?'}</strong> na app
          </div>
          <div style={{ marginTop: 4 }}>
            <strong style={{ color: '#10b981' }}>{o.novos ?? 0}</strong> novos · <strong style={{ color: '#f59e0b' }}>{o.alterados ?? 0}</strong> alterados · <strong style={{ color: (o.conflitos ?? 0) ? '#ef4444' : '#10b981' }}>{o.conflitos ?? 0}</strong> conflitos
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
            {o.existentes_sem_alteracao ?? 0} sem alteração · {o.documentos_a_preservar ?? 0} documentos/links a preservar
          </div>
        </>
      )
      break
    }
    case 'Aprovar importacao': {
      const a = o.approval_summary || {}
      if (Object.keys(a).length > 0) {
        summary = (
          <>
            <div>
              Decisão: <strong>{a.dry_run ? 'preview sem escrita' : 'escrever no extrato'}</strong>
            </div>
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: '#10b981' }}>{a.novos ?? 0}</strong> novos · <strong style={{ color: '#f59e0b' }}>{a.alterados ?? 0}</strong> alterados · <strong style={{ color: (a.conflitos ?? 0) ? '#ef4444' : '#10b981' }}>{a.conflitos ?? 0}</strong> conflitos
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
              {a.documentos_a_preservar ?? 0} documentos/links preservados · {a.existentes_sem_alteracao ?? 0} existentes sem alteração
            </div>
          </>
        )
      }
      break
    }
    case 'Upsert chunked no extrato': {
      summary = (
        <>
          <div>
            <strong style={{ color: '#10b981' }}>{o.inserted ?? 0}</strong> inseridos · <strong style={{ color: '#06b6d4' }}>{o.updated ?? 0}</strong> atualizados · <strong style={{ color: (o.errors ?? 0) ? '#ef4444' : '#10b981' }}>{o.errors ?? 0}</strong> erros
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
            {o.documentos_preservados ?? 0} documentos/links existentes preservados durante o upsert
          </div>
        </>
      )
      break
    }
    case 'Atualizar receitas e despesas': {
      summary = (
        <>
          <div>
            Leitura financeira atualizada · <strong>{o.inserted ?? 0}</strong> inseridos · <strong>{o.updated ?? 0}</strong> atualizados
          </div>
          {o.note && <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{o.note}</div>}
        </>
      )
      break
    }
    case 'Conferir prestacao de contas': {
      summary = (
        <>
          <div style={{ color: '#10b981', fontWeight: 600 }}>✓ Conferência concluída</div>
          <div style={{ marginTop: 4 }}>
            <strong>{o.movimentos_visiveis ?? '?'}</strong> movimentos visíveis · <strong>{o.documentos_links_preservados ?? 0}</strong> documentos/links preservados
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
            {o.inserted ?? 0} inseridos · {o.updated ?? 0} atualizados
          </div>
        </>
      )
      break
    }
    case 'Ler XLSX carregadores e extrato': {
      summary = (
        <>
          <div><strong>{o.n_datas ?? '?'}</strong> datas detectadas · {o.rows_total ?? o.size_bytes ? `${o.size_bytes} bytes` : '—'}</div>
          {o.sha256 && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-dim)' }}>SHA256: {o.sha256.slice(0, 16)}…</div>}
        </>
      )
      break
    }
    case 'Analisar diferenças vs BD': {
      const d = o.diff || {}
      summary = (
        <>
          <div><strong>{d.n_datas_novas ?? 0}</strong> datas novas no XLSX · <strong>{d.potencial_updates ?? 0}</strong> updates · <strong>{d.n_conflitos ?? 0}</strong> conflitos</div>
          {o.recomendacao_periodo_emissao && <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>Recomendado: {o.recomendacao_periodo_emissao.data_anterior_sugerida} → {o.recomendacao_periodo_emissao.data_actual_sugerida}</div>}
        </>
      )
      break
    }
    case 'Configurar período + preço': {
      const i = o.inputs_seleccionados || {}
      if (i.data_anterior) {
        summary = (
          <>
            <div>Período: <strong>{i.data_anterior}</strong> → <strong>{i.data_actual}</strong> · Preço: <strong>{i.preco_kwh} €/kWh</strong></div>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>Emissão: {i.data_emissao} · Descrição: "{i.descricao}"</div>
          </>
        )
      }
      break
    }
    case 'Calcular valor por fracção': {
      summary = (
        <>
          <div><strong>{o.n_fracoes_total ?? '?'}</strong> frações analisadas · <strong style={{ color: '#10b981' }}>{o.n_fracoes_com_consumo ?? 0}</strong> com consumo · {o.n_fracoes_sem_consumo ?? 0} sem consumo</div>
          {o.total_emitir != null && <div style={{ marginTop: 4 }}>Total a emitir: <strong style={{ color: '#10b981', fontSize: 14 }}>€{Number(o.total_emitir).toFixed(2)}</strong></div>}
        </>
      )
      break
    }
    case 'Validar cobertura de frações': {
      summary = (
        <>
          <div style={{ color: o.ok ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{o.ok ? '✓ Cobertura OK' : '⚠ Gaps detectados'}</div>
          {o.resumo && <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{o.resumo}</div>}
        </>
      )
      break
    }
    case 'Aprovar emissão de avisos': {
      if (o.titulo) {
        summary = (
          <>
            <div><strong>{o.n_avisos ?? '?'}</strong> avisos · total <strong style={{ color: '#10b981' }}>€{Number(o.total_emitir ?? 0).toFixed(2)}</strong></div>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{o.periodo} · data emissão: {o.data_emissao}</div>
          </>
        )
      }
      break
    }
    case 'Emitir avisos quota extra': {
      const n = o.n_documentos ?? o.rpc_result?.n_emitidos ?? o.n_emitidos_corrigido ?? 0
      const total = o.total_emitido_final ?? o.total_emitir ?? null
      summary = (
        <>
          <div><strong>{n}</strong> documentos emitidos em V2 produção {total != null && <>· total <strong style={{ color: '#10b981' }}>€{Number(total).toFixed(2)}</strong></>}</div>
          {o.data_emissao && <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>Data emissão: {o.data_emissao} · período: {o.periodo}</div>}
          {Array.isArray(o.numeros_emitidos_finais) && o.numeros_emitidos_finais.length > 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 4, lineHeight: 1.4 }}>
              {o.numeros_emitidos_finais.join(' · ')}
            </div>
          )}
          {o.incidente && (
            <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 4, fontSize: 11, color: 'var(--text-dim)', borderLeft: '3px solid #f59e0b' }}>
              ⚠ <strong style={{ color: '#f59e0b' }}>Incidente resolvido:</strong> {o.incidente.causa} <em>Fix:</em> {o.incidente.fix_aplicado}
            </div>
          )}
        </>
      )
      break
    }
    case 'Conferir conta corrente pós-emissão': {
      const n = o.n_emitidos ?? o.n_validados ?? o.n_emitidos_hoje ?? 0
      const total = o.total_emitido ?? null
      summary = (
        <>
          <div style={{ color: o.ok !== false ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
            {o.ok !== false ? '✓ Auditoria OK' : '⚠ Divergências'}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>{n}</strong> documentos lançados {o.data_emissao && <>em <strong>{o.data_emissao}</strong></>}, contas correntes individuais conferidas {total != null && <>· total <strong style={{ color: '#10b981' }}>€{Number(total).toFixed(2)}</strong></>}
          </div>
          {o.resumo && <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{o.resumo}</div>}
          {Array.isArray(o.documentos_validados) && o.documentos_validados.length > 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 4, lineHeight: 1.4 }}>
              Docs: {o.documentos_validados.slice(0, 8).join(' · ')}{o.documentos_validados.length > 8 ? ` · +${o.documentos_validados.length - 8}` : ''}
            </div>
          )}
        </>
      )
      break
    }
    case 'Aprovar ingest em V2 produção':
    case 'Ingerir leituras em V2': {
      const n = o.datas_a_inserir ?? o.inserted ?? o.leituras_inseridas ?? null
      if (n != null) {
        summary = (
          <>
            <div><strong>{n}</strong> leituras inseridas em V2 produção</div>
            {o.fonte_xlsx && <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 2 }}>Fonte: {o.fonte_xlsx}</div>}
          </>
        )
      }
      break
    }
    // ── Recipe Emissão de Avisos Mensais (resumo legível por passo) ──
    case 'Conferir se mes ja emitido':
      summary = (
        <div style={{ color: o.ja_emitido ? '#f59e0b' : '#10b981' }}>{o.resumo}</div>
      ); break
    case 'Conferir orcamento do ano':
      summary = (
        <>
          <div>{o.resumo}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>Receitas €{Number(o.receitas_mensal ?? 0).toFixed(2)}/mês · Despesas €{Number(o.despesas_anual ?? 0).toFixed(2)}/ano</div>
        </>
      ); break
    case 'Conferir orcamento por fracao':
      summary = (
        <>
          <div><strong>{o.n_fracoes ?? '?'}</strong> frações · total <strong>€{Number(o.total ?? 0).toFixed(2)}</strong> (quota €{Number(o.quota ?? 0).toFixed(2)} + FCR €{Number(o.fcr ?? 0).toFixed(2)})</div>
          <div style={{ color: (o.anomalias?.length ? '#f59e0b' : 'var(--text-dim)'), fontSize: 11, marginTop: 2 }}>
            {o.anomalias?.length ? `⚠️ ${o.anomalias.length} com variação >10% vs ${o.mes_anterior}` : `Variações normais vs ${o.mes_anterior}`}
          </div>
        </>
      ); break
    case 'Emitir avisos mensais':
      summary = (
        <>
          <div><strong>{o.emitidos ?? 0}</strong> avisos emitidos · total <strong style={{ color: '#10b981' }}>€{Number(o.total ?? 0).toFixed(2)}</strong></div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{o.periodo} · emissão {o.data_emissao} · nº {o.numero_de}–{o.numero_ate}</div>
        </>
      ); break
    case 'Auditar avisos emitidos':
      summary = (
        <>
          <div style={{ color: o.ok ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{o.ok ? '✓ Auditoria OK' : '⚠ Sem avisos'}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{o.resumo}</div>
        </>
      ); break
    default:
      break
  }

  if (!summary) return null
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 6,
      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
      fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginTop: 4,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Resumo</div>
      {summary}
    </div>
  )
}

function CollapsibleExecField({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          padding: '6px 0',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{
          fontSize: 9, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: 'JetBrains Mono, monospace',
        }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
          {open ? 'hide' : 'show'}
        </span>
      </button>
      {open && children}
    </div>
  )
}
