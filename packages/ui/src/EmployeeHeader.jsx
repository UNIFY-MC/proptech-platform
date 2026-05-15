import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// localStorage override storage para o utilizador renomear agents só visualmente
// (não altera os .meta.json — só persiste local). Chave: 'employee_name_overrides'
function getOverride(id) {
  try {
    const raw = localStorage.getItem('employee_name_overrides')
    if (!raw) return null
    const map = JSON.parse(raw)
    return map[id] || null
  } catch { return null }
}

function setOverride(id, newName) {
  try {
    const raw = localStorage.getItem('employee_name_overrides')
    const map = raw ? JSON.parse(raw) : {}
    if (newName && newName.trim()) {
      map[id] = newName.trim()
    } else {
      delete map[id]
    }
    localStorage.setItem('employee_name_overrides', JSON.stringify(map))
    // Dispara evento global para outros componentes recarregarem
    window.dispatchEvent(new CustomEvent('employee-name-override', { detail: { id, name: map[id] || null } }))
  } catch {}
}

export default function EmployeeHeader({ emp }) {
  const navigate = useNavigate()
  const modelShort = emp.model?.replace('claude-', '').replace('-20251001', '') || '—'

  const [editing, setEditing] = useState(false)
  const [override, setOverrideState] = useState(() => getOverride(emp.id))
  const [draft, setDraft] = useState(override || emp.name || '')

  useEffect(() => {
    setOverrideState(getOverride(emp.id))
    setDraft(getOverride(emp.id) || emp.name || '')
  }, [emp.id, emp.name])

  const displayName = override || emp.name

  function save() {
    const trimmed = draft.trim()
    if (trimmed === emp.name || !trimmed) {
      setOverride(emp.id, null)
      setOverrideState(null)
    } else {
      setOverride(emp.id, trimmed)
      setOverrideState(trimmed)
    }
    setEditing(false)
  }
  function cancel() {
    setDraft(override || emp.name || '')
    setEditing(false)
  }
  function reset() {
    setOverride(emp.id, null)
    setOverrideState(null)
    setDraft(emp.name || '')
    setEditing(false)
  }

  return (
    <div style={{
      background: 'var(--bg-card-soft)',
      border: '1px solid var(--border-soft)',
      borderRadius: 10, padding: '14px 18px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-dim)', padding: '0 4px', flexShrink: 0, lineHeight: 1 }}
        title="Voltar"
      >←</button>

      <div style={{
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.2rem', fontWeight: 700, color: '#fff',
      }}>
        {emp.avatarInitial || displayName?.[0]?.toUpperCase() || '?'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') cancel()
              }}
              style={{
                fontSize: 20, fontWeight: 600, color: 'var(--text)',
                background: 'var(--bg-card-elevated)', border: '1px solid var(--primary)',
                borderRadius: 4, padding: '2px 8px', minWidth: 200,
              }}
            />
            <button
              onClick={save}
              style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
              title="Guardar (Enter)"
            >✓</button>
            <button
              onClick={cancel}
              style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
              title="Cancelar (Esc)"
            >✕</button>
            {override && (
              <button
                onClick={reset}
                style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}
                title={`Reset to "${emp.name}"`}
              >↺</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
              {displayName}
            </div>
            <button
              onClick={() => setEditing(true)}
              style={{
                background: 'transparent', border: '1px solid var(--border-soft)',
                borderRadius: 4, padding: '2px 6px', fontSize: 10,
                color: 'var(--text-dim)', cursor: 'pointer',
              }}
              title="Editar nome (só local)"
            >✎</button>
            {override && (
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 3,
                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              }} title={`Nome original: ${emp.name}`}>RENAMED</span>
            )}
          </div>
        )}
        <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 2 }}>
          {emp.role} · {emp.vertical}
        </div>
        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-dim)', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span>Model: {modelShort}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Replies: pt-pt</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>v{emp.version || '1.0'}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Last check: —</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600, fontFamily: 'monospace',
          background: emp.status === 'active' ? 'rgba(16,185,129,0.15)' : 'var(--bg-card-elevated)',
          color: emp.status === 'active' ? 'var(--success)' : 'var(--text-dim)',
        }}>{emp.status || 'draft'}</span>
      </div>
    </div>
  )
}
