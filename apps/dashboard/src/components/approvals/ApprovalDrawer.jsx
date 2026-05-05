import { useState } from 'react'

function fdt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function MetaRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
      <span style={{
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        width: 84,
        flexShrink: 0,
        paddingTop: 1,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

const SECTION_LABEL = {
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-dim)',
  marginBottom: 8,
}

export default function ApprovalDrawer({ item, onSaveAndApprove, onClose }) {
  const [draft, setDraft] = useState(item.edited_message ?? item.draft_message)
  const [saving, setSaving] = useState(false)
  const isEmpty = !draft.trim()

  async function handleSave() {
    if (isEmpty) return
    setSaving(true)
    await onSaveAndApprove(item.id, draft.trim())
    setSaving(false)
    onClose()
  }

  return (
    <div>
      {/* Meta */}
      <div style={{
        marginBottom: 20,
        padding: '12px 14px',
        background: 'var(--bg-elevated)',
        borderRadius: 6,
        border: '1px solid var(--border)',
      }}>
        {item.target_vertical && <MetaRow label="Vertical" value={item.target_vertical} />}
        <MetaRow label="Tipo"   value={item.action_type} />
        <MetaRow label="Agente" value={item.source_agent} />
        <MetaRow label="Data"   value={fdt(item.created_at)} />
      </div>

      {/* action_payload */}
      {item.action_payload && Object.keys(item.action_payload).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={SECTION_LABEL}>Payload</div>
          <pre style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '10px 12px',
            color: 'var(--text)',
            overflow: 'auto',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {JSON.stringify(item.action_payload, null, 2)}
          </pre>
        </div>
      )}

      {/* Editable draft */}
      <div style={{ marginBottom: 20 }}>
        <div style={SECTION_LABEL}>Mensagem</div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={6}
          style={{
            width: '100%',
            background: 'var(--bg-elevated)',
            border: `1px solid ${isEmpty ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: 6,
            color: 'var(--text)',
            fontSize: 13,
            lineHeight: 1.6,
            padding: '10px 12px',
            resize: 'vertical',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { if (!isEmpty) e.target.style.borderColor = 'var(--primary)' }}
          onBlur={e => { e.target.style.borderColor = isEmpty ? 'var(--danger)' : 'var(--border)' }}
        />
        {isEmpty && (
          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
            A mensagem não pode ficar vazia.
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: 8,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
      }}>
        <button
          onClick={handleSave}
          disabled={isEmpty || saving}
          style={{
            flex: 1,
            background: isEmpty || saving ? 'var(--bg-elevated)' : 'var(--success)',
            color: isEmpty || saving ? 'var(--text-dim)' : '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: isEmpty || saving ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { if (!isEmpty && !saving) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          {saving ? 'A guardar…' : 'Save & Approve'}
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            color: 'var(--text-dim)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '9px 16px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
