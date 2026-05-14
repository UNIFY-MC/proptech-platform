// SchedulesPage — /schedules · "Run on Autopilot" CookAI-style
//
// Recipes recorrentes que correm via cron. Cada schedule pode usar uma recipe
// composta (steps) OU um prompt directo. Executor: pg_cron */5min → edge fn
// schedule-run cria task + dispara task-execute.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { Clock, Bot, CheckCircle2, Plus, X, Play, Trash2, Edit2, Loader2, Power, PowerOff } from 'lucide-react'
import { useSchedules } from '../hooks/useSchedules.js'
import { useRecipes } from '../hooks/useRecipes.js'
import { useData } from '../hooks/useData.js'
import { useVerticalStore } from '../store/index.js'

// Cron presets human-readable
const CRON_PRESETS = [
  { label: 'Diário às 8h',      expr: '0 8 * * *' },
  { label: 'Diário às 18h',     expr: '0 18 * * *' },
  { label: 'Seg às 9h',         expr: '0 9 * * 1' },
  { label: 'Sex às 17h',        expr: '0 17 * * 5' },
  { label: 'Cada hora',         expr: '0 * * * *' },
  { label: 'Cada 15 min',       expr: '*/15 * * * *' },
  { label: '1º dia mês 9h',     expr: '0 9 1 * *' },
]

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
function timeUntil(iso) {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'agora'
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── EmptyState ───────────────────────────────────────────────────────────
function EmptyState({ onCreate }) {
  return (
    <div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center', padding: 20 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
        Run on autopilot
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 40px' }}>
        Cria trabalho recorrente que corre num cron — relatórios de leads, performance de ads,<br />
        insights semanais entregues à inbox automaticamente.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, marginBottom: 30,
      }}>
        <IconStep icon={Clock} label="CLOCK" color="#10b981" filled />
        <Lucide.ArrowRight size={16} color="var(--text-dim)" />
        <IconStep icon={Bot} label="BOT" color="var(--text-dim)" />
        <Lucide.ArrowRight size={16} color="var(--text-dim)" />
        <IconStep icon={CheckCircle2} label="DONE" color="var(--text-dim)" />
      </div>

      <h3 style={{ fontSize: 16, color: 'var(--text)', margin: '0 0 8px' }}>Set it and forget it</h3>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 30px', lineHeight: 1.6 }}>
        Diz a um bot para fazer algo num cron. Tipo "todas as Segundas às 9h, publica o recap semanal".<br />
        Depois sai — corre para sempre.
      </p>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '16px 20px', textAlign: 'left',
        margin: '0 auto 24px', maxWidth: 500,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: 'JetBrains Mono, monospace', marginBottom: 12,
        }}>How it works</div>
        {[
          { n: 1, t: 'Escolhe um bot.', d: 'O teammate que faz o trabalho.' },
          { n: 2, t: 'Escolhe a frequência.', d: 'Diário, semanal, ou quando quiseres.' },
          { n: 3, t: 'Diz o que fazer.', d: 'Em PT-PT. O bot trata do resto.' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, color: 'var(--text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>{s.n}</span>
            <div>
              <strong style={{ fontSize: 13, color: 'var(--text)' }}>{s.t}</strong>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 6 }}>{s.d}</span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onCreate} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 18px', borderRadius: 6,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
      }}>
        <Plus size={14} /> Cria o teu primeiro schedule
      </button>
    </div>
  )
}

function IconStep({ icon: Icon, label, color, filled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 10,
        background: filled ? `${color}22` : 'var(--bg-card)',
        border: `1px solid ${filled ? color : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color,
      }}>
        <Icon size={24} />
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontFamily: 'JetBrains Mono, monospace',
      }}>{label}</span>
    </div>
  )
}

// ─── ScheduleCard ─────────────────────────────────────────────────────────
function ScheduleCard({ schedule, employees, onEdit, onDelete, onRun, onToggle, busy }) {
  const bot = employees.find(e => e.id === schedule.bot_id)
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${schedule.active ? '#10b981' : 'var(--text-dim)'}`,
      borderRadius: 8, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 8,
      opacity: schedule.active ? 1 : 0.6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Clock size={18} color={schedule.active ? '#10b981' : 'var(--text-dim)'} style={{ marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{schedule.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
            {schedule.cron_label || schedule.cron_expr} · {bot?.name || schedule.bot_id}
            {schedule.recipe_name && ` · recipe: ${schedule.recipe_name}`}
          </div>
        </div>
        <button
          onClick={() => onToggle(schedule)}
          title={schedule.active ? 'Pausar' : 'Activar'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: schedule.active ? '#10b981' : 'var(--text-dim)', padding: 4 }}
        >
          {schedule.active ? <Power size={13} /> : <PowerOff size={13} />}
        </button>
      </div>

      {schedule.description && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{schedule.description}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          Last: {timeAgo(schedule.last_run_at)}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          Next: {timeUntil(schedule.next_run_at)}
        </span>
        {schedule.run_count > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            {schedule.run_count}× runs
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => onRun(schedule)} disabled={busy} style={miniBtnPrimary}>
          {busy ? <Loader2 size={10} className="spin" /> : <Play size={10} />} Run now
        </button>
        <button onClick={() => onEdit(schedule)} style={miniBtn}><Edit2 size={10} /></button>
        <button onClick={() => onDelete(schedule)} style={miniBtn}><Trash2 size={10} /></button>
      </div>
    </div>
  )
}

const miniBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 7px', borderRadius: 4,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer',
}
const miniBtnPrimary = {
  ...miniBtn,
  background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)',
}

// ─── ScheduleFormModal ────────────────────────────────────────────────────
function ScheduleFormModal({ schedule, employees, recipes, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name:        schedule?.name || '',
    description: schedule?.description || '',
    recipe_id:   schedule?.recipe_id || '',
    prompt:      schedule?.prompt || '',
    bot_id:      schedule?.bot_id || '',
    cron_expr:   schedule?.cron_expr || '0 9 * * 1',
    cron_label:  schedule?.cron_label || 'Seg às 9h',
    verticals:   schedule?.verticals || ['*'],
    active:      schedule?.active !== false,
  })
  const [tab, setTab] = useState('main')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.bot_id) return
    setBusy(true)
    await onSubmit({ ...form, recipe_id: form.recipe_id || null })
    setBusy(false)
    onClose()
  }

  const handleCron = (expr, label) => {
    setForm({ ...form, cron_expr: expr, cron_label: label })
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, width: 540, maxWidth: '100%',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{schedule ? 'Editar schedule' : 'Novo schedule'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Name *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: Daily code review" style={input} />
          </Field>

          <Field label="Recipe (opcional)">
            <select value={form.recipe_id} onChange={(e) => setForm({ ...form, recipe_id: e.target.value })} style={input}>
              <option value="">No recipe — use prompt</option>
              {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.category})</option>)}
            </select>
          </Field>

          {!form.recipe_id && (
            <Field label="Prompt (o que o bot deve fazer)">
              <textarea rows={3} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="Descreve o que o Cook deve fazer em cada sessão…" style={{ ...input, fontFamily: 'inherit', resize: 'vertical' }} />
            </Field>
          )}

          <Field label="Assign to bot *">
            <select required value={form.bot_id} onChange={(e) => setForm({ ...form, bot_id: e.target.value })} style={input}>
              <option value="">— escolhe —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role || 'agent'})</option>)}
            </select>
          </Field>

          <Field label="Schedule">
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.expr}
                  type="button"
                  onClick={() => handleCron(p.expr, p.label)}
                  style={{
                    padding: '4px 8px', borderRadius: 4,
                    background: form.cron_expr === p.expr ? 'var(--primary)' : 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: form.cron_expr === p.expr ? '#fff' : 'var(--text-dim)',
                    fontSize: 10, cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >{p.label}</button>
              ))}
            </div>
            <input
              value={form.cron_expr}
              onChange={(e) => setForm({ ...form, cron_expr: e.target.value, cron_label: 'Custom' })}
              placeholder="0 9 * * 1"
              style={{ ...input, fontFamily: 'JetBrains Mono, monospace' }}
            />
          </Field>

          <Field label="Verticais (separa vírgula — * = todas)">
            <input
              value={form.verticals.join(',')}
              onChange={(e) => setForm({ ...form, verticals: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="* ou v2,v5"
              style={input}
            />
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activo (corre no cron schedule)
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancelar</button>
            <button type="submit" disabled={busy || !form.name || !form.bot_id} style={btnSubmit}>
              {busy && <Loader2 size={12} className="spin" />} {schedule ? 'Guardar' : 'Criar'}
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

// ─── Main ─────────────────────────────────────────────────────────────────
export default function SchedulesPage() {
  const navigate = useNavigate()
  const { items, loading, create, update, remove, runNow } = useSchedules()
  const { all: recipes } = useRecipes()
  const { data } = useData()
  const employees = data?.employees || []
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const handleRun = async (s) => {
    setBusyId(s.id)
    await runNow(s.id)
    setBusyId(null)
  }
  const handleToggle = async (s) => {
    await update(s.id, { active: !s.active })
  }
  const handleDelete = async (s) => {
    if (confirm(`Eliminar schedule "${s.name}"?`)) await remove(s.id)
  }
  const handleSubmit = async (form) => {
    if (editing) await update(editing.id, form)
    else await create(form)
    setEditing(null)
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
        <Loader2 className="spin" size={18} /> A carregar…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      {(createOpen || editing) && (
        <ScheduleFormModal
          schedule={editing}
          employees={employees}
          recipes={recipes}
          onClose={() => { setCreateOpen(false); setEditing(null) }}
          onSubmit={handleSubmit}
        />
      )}

      {items.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 18, flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Schedules
              </h1>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                {items.length} schedules · {items.filter(s => s.active).length} activos · execução pg_cron */5min
              </p>
            </div>
            <button onClick={() => setCreateOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6,
              background: 'var(--primary)', color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={14} /> New schedule
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 10,
          }}>
            {items.map(s => (
              <ScheduleCard
                key={s.id} schedule={s} employees={employees}
                onEdit={setEditing} onDelete={handleDelete}
                onRun={handleRun} onToggle={handleToggle}
                busy={busyId === s.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
