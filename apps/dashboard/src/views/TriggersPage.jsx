// TriggersPage — /triggers · "React in Real Time" CookAI-style
//
// Event-driven workflows: quando X acontece (novo inbox item, task fails, …)
// dispara recipe ou prompt directo. Mode basic (deterministic) ou agentic (bot
// reasons over data).

import { useState } from 'react'
import * as Lucide from 'lucide-react'
import { Plug, Bot, Zap, Plus, X, Edit2, Trash2, Power, PowerOff, Loader2 } from 'lucide-react'
import { useTriggers } from '../hooks/useTriggers.js'
import { useRecipes } from '../hooks/useRecipes.js'
import { useData } from '../hooks/useData.js'

const EVENT_KINDS = [
  { id: 'inbox_item_added',    label: 'Novo item na Inbox',     description: 'Quando chega item novo na inbox (roundup, lead, alerta)' },
  { id: 'task_status_changed', label: 'Status de task muda',    description: 'Quando uma task transita de status (ex: para needs_human)' },
  { id: 'apify_run_done',      label: 'Apify scraper termina',  description: 'Quando um actor Apify completa execução' },
  { id: 'integration_event',   label: 'Evento de integração',   description: 'Webhook ou push de uma integração (Gmail, Meta, …)' },
  { id: 'webhook',             label: 'Webhook custom',         description: 'POST externo na URL pública do trigger' },
  { id: 'manual',              label: 'Manual (test only)',     description: 'Disparado manualmente — útil para testes' },
]

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function EmptyState({ employees, onCreate }) {
  const defaultBot = employees[0]?.name || 'Jordan'
  return (
    <div style={{ maxWidth: 760, margin: '40px auto', textAlign: 'center', padding: 20 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
        React in real time
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 40px' }}>
        Dispara os teus bots quando algo acontece — novos leads, sinais frescos, mensagens<br />
        de clientes processadas no momento em que chegam.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, marginBottom: 30,
      }}>
        <IconStep icon={Plug} label="EVENT" color="var(--text-dim)" />
        <Lucide.ArrowRight size={16} color="var(--text-dim)" />
        <IconStep icon={Bot} label="BOT" color="#10b981" filled />
        <Lucide.ArrowRight size={16} color="var(--text-dim)" />
        <IconStep icon={Zap} label="ACTION" color="var(--text-dim)" />
      </div>

      <h3 style={{ fontSize: 16, color: 'var(--text)', margin: '0 0 8px' }}>Quando X acontece, faz Y</h3>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 30px', lineHeight: 1.6 }}>
        Um trigger deixa o bot observar as tuas tools. Quando algo acontece — novo email,<br />
        novo lead, menção no Slack — o bot reage.
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
        }}>Exemplo</div>
        {[
          { n: 1, t: 'Novo lead capturado', d: '(o event)' },
          { n: 2, t: 'Bot lê e decide o que fazer', d: '' },
          { n: 3, t: 'Bot escreve email de follow-up', d: '(o action)' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{s.n}</span>
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
        <Plus size={14} /> Adiciona o teu primeiro trigger
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

function TriggerCard({ trigger, employees, onEdit, onDelete, onToggle }) {
  const bot = employees.find(e => e.id === trigger.bot_id)
  const eventMeta = EVENT_KINDS.find(e => e.id === trigger.event_kind) || EVENT_KINDS[0]
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${trigger.active ? '#3b82f6' : 'var(--text-dim)'}`,
      borderRadius: 8, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 8,
      opacity: trigger.active ? 1 : 0.6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Zap size={18} color={trigger.active ? '#3b82f6' : 'var(--text-dim)'} style={{ marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{trigger.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
            {eventMeta.label} · {bot?.name || trigger.bot_id} · {trigger.mode}
            {trigger.recipe_name && ` · recipe: ${trigger.recipe_name}`}
          </div>
        </div>
        <button onClick={() => onToggle(trigger)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: trigger.active ? '#3b82f6' : 'var(--text-dim)', padding: 4 }}>
          {trigger.active ? <Power size={13} /> : <PowerOff size={13} />}
        </button>
      </div>

      {trigger.description && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{trigger.description}</div>
      )}

      {Object.keys(trigger.event_filter || {}).length > 0 && (
        <div style={{
          fontSize: 10, color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
          background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 4,
        }}>
          filter: {JSON.stringify(trigger.event_filter)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          Last: {timeAgo(trigger.last_fired_at)}
        </span>
        {trigger.fire_count > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            {trigger.fire_count}× fires
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => onEdit(trigger)} style={miniBtn}><Edit2 size={10} /></button>
        <button onClick={() => onDelete(trigger)} style={miniBtn}><Trash2 size={10} /></button>
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

function TriggerFormModal({ trigger, employees, recipes, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name:         trigger?.name || '',
    description:  trigger?.description || '',
    bot_id:       trigger?.bot_id || '',
    event_kind:   trigger?.event_kind || 'inbox_item_added',
    event_filter: trigger?.event_filter ? JSON.stringify(trigger.event_filter) : '{}',
    recipe_id:    trigger?.recipe_id || '',
    prompt:       trigger?.prompt || '',
    mode:         trigger?.mode || 'agentic',
    verticals:    trigger?.verticals || ['*'],
    active:       trigger?.active !== false,
  })
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.bot_id) return
    let filter = {}
    try { filter = JSON.parse(form.event_filter || '{}') } catch { /* ignore */ }
    setBusy(true)
    await onSubmit({
      ...form,
      event_filter: filter,
      recipe_id: form.recipe_id || null,
    })
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
        borderRadius: 10, padding: 24, width: 540, maxWidth: '100%',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{trigger ? 'Editar trigger' : 'Novo trigger'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nome *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: Novo lead V4 — follow up" style={input} />
          </Field>

          <Field label="Bot *">
            <select required value={form.bot_id} onChange={(e) => setForm({ ...form, bot_id: e.target.value })} style={input}>
              <option value="">— escolhe —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>

          <Field label="Event kind">
            <select value={form.event_kind} onChange={(e) => setForm({ ...form, event_kind: e.target.value })} style={input}>
              {EVENT_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              {EVENT_KINDS.find(k => k.id === form.event_kind)?.description}
            </span>
          </Field>

          <Field label="Event filter (JSON — vazio = qualquer)">
            <input
              value={form.event_filter}
              onChange={(e) => setForm({ ...form, event_filter: e.target.value })}
              placeholder='{"vertical":"v2","kind":"lead"}'
              style={{ ...input, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
            />
          </Field>

          <Field label="Recipe (opcional)">
            <select value={form.recipe_id} onChange={(e) => setForm({ ...form, recipe_id: e.target.value })} style={input}>
              <option value="">No recipe — use prompt</option>
              {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>

          {!form.recipe_id && (
            <Field label="Prompt">
              <textarea rows={3} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="O bot recebe o event_data — diz-lhe o que fazer com ele…" style={{ ...input, fontFamily: 'inherit', resize: 'vertical' }} />
            </Field>
          )}

          <Field label="Mode">
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setForm({ ...form, mode: 'basic' })} style={{
                flex: 1, padding: '8px 12px', borderRadius: 5,
                background: form.mode === 'basic' ? 'var(--primary)' : 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: form.mode === 'basic' ? '#fff' : 'var(--text-dim)',
                fontSize: 12, cursor: 'pointer',
              }}>Basic <span style={{ fontSize: 9 }}>deterministic</span></button>
              <button type="button" onClick={() => setForm({ ...form, mode: 'agentic' })} style={{
                flex: 1, padding: '8px 12px', borderRadius: 5,
                background: form.mode === 'agentic' ? 'var(--primary)' : 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: form.mode === 'agentic' ? '#fff' : 'var(--text-dim)',
                fontSize: 12, cursor: 'pointer',
              }}>Agentic <span style={{ fontSize: 9 }}>bot reasons over data</span></button>
            </div>
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
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Activo
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancelar</button>
            <button type="submit" disabled={busy || !form.name || !form.bot_id} style={btnSubmit}>
              {busy && <Loader2 size={12} className="spin" />} {trigger ? 'Guardar' : 'Criar'}
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

export default function TriggersPage() {
  const { items, loading, create, update, remove } = useTriggers()
  const { all: recipes } = useRecipes()
  const { data } = useData()
  const employees = data?.employees || []
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleSubmit = async (form) => {
    if (editing) await update(editing.id, form)
    else await create(form)
    setEditing(null)
  }
  const handleToggle = async (t) => await update(t.id, { active: !t.active })
  const handleDelete = async (t) => { if (confirm(`Eliminar "${t.name}"?`)) await remove(t.id) }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}><Loader2 className="spin" size={18} /></div>

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      {(createOpen || editing) && (
        <TriggerFormModal
          trigger={editing}
          employees={employees}
          recipes={recipes}
          onClose={() => { setCreateOpen(false); setEditing(null) }}
          onSubmit={handleSubmit}
        />
      )}

      {items.length === 0 ? (
        <EmptyState employees={employees} onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 18, flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Triggers</h1>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                {items.length} triggers · {items.filter(t => t.active).length} activos · event-driven workflows
              </p>
            </div>
            <button onClick={() => setCreateOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6,
              background: 'var(--primary)', color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={14} /> Add Trigger
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 10,
          }}>
            {items.map(t => (
              <TriggerCard
                key={t.id} trigger={t} employees={employees}
                onEdit={setEditing} onDelete={handleDelete} onToggle={handleToggle}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
