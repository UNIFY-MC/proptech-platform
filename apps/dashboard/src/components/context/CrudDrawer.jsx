// Drawer genérico de CRUD — usado pela ContextPage para
// criar/editar Skills, Recipes, Integrations, Context Docs

import { useEffect, useState } from 'react'

export default function CrudDrawer({ open, item, schema, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(item ?? schema.defaults ?? {})
  }, [open, item, schema.defaults])

  if (!open) return null

  const isNew = !item?.id

  async function handleSave() {
    setBusy(true)
    await onSave(form)
    setBusy(false)
    onClose()
  }

  async function handleDelete() {
    if (!confirm(`Eliminar ${form.name || form.title || 'item'}?`)) return
    setBusy(true)
    await onDelete(item.id)
    setBusy(false)
    onClose()
  }

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 'min(540px, 100vw)',
      background: 'var(--bg)', borderLeft: '1px solid var(--border)',
      boxShadow: '-8px 0 24px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem',
            color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>{schema.label}</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: 2 }}>
            {isNew ? `Novo ${schema.label}` : (form.name || form.title || form.slug || '—')}
          </div>
        </div>
        <button onClick={onClose} style={iconBtn}>×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {schema.fields.map(f => (
          <Field key={f.key} field={f} value={form[f.key]} onChange={v => set(f.key, v)} />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: 14, borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={busy} style={btnPrimary}>
            {busy ? 'A guardar…' : (isNew ? 'Criar' : 'Guardar')}
          </button>
          <button onClick={onClose} disabled={busy} style={btnGhost}>Cancelar</button>
        </div>
        {!isNew && onDelete && (
          <button onClick={handleDelete} disabled={busy} style={btnDanger}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: '0.65rem', fontWeight: 600,
        color: 'var(--text-dim)', marginBottom: 4,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {field.hint && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: 4, fontStyle: 'italic' }}>
          {field.hint}
        </div>
      )}
      {renderInput(field, value, onChange)}
    </div>
  )
}

function renderInput(field, value, onChange) {
  const v = value ?? (field.type === 'bool' ? false : '')
  if (field.type === 'textarea') {
    return <textarea
      value={v} onChange={e => onChange(e.target.value)}
      rows={field.rows || 5} style={inputStyle} placeholder={field.placeholder} />
  }
  if (field.type === 'select') {
    return (
      <select value={v} onChange={e => onChange(e.target.value)} style={inputStyle}>
        <option value="">—</option>
        {(field.options || []).map(opt => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
        ))}
      </select>
    )
  }
  if (field.type === 'bool') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!v} onChange={e => onChange(e.target.checked)} />
        <span style={{ fontSize: '0.78rem' }}>{field.boolLabel || 'Activo'}</span>
      </label>
    )
  }
  if (field.type === 'json') {
    return <textarea
      value={typeof v === 'object' ? JSON.stringify(v, null, 2) : v}
      onChange={e => {
        try { onChange(JSON.parse(e.target.value)) }
        catch { onChange(e.target.value) }
      }}
      rows={field.rows || 4} style={{ ...inputStyle, fontFamily: 'monospace' }}
      placeholder='{}' />
  }
  return <input
    type={field.type || 'text'}
    value={v} onChange={e => onChange(e.target.value)}
    style={inputStyle} placeholder={field.placeholder} />
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-dim)', fontSize: '1.4rem', padding: '0 4px',
}
const btnBase = {
  padding: '8px 14px', borderRadius: 5, cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: 600, border: 'none',
}
const btnPrimary = { ...btnBase, background: 'var(--primary)', color: '#fff' }
const btnGhost = { ...btnBase, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }
const btnDanger = { ...btnBase, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '7px 10px',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 5, fontSize: '0.78rem', color: 'var(--text)',
  fontFamily: 'inherit', outline: 'none',
}
