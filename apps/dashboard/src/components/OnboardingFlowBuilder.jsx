// OnboardingFlowBuilder — Sprint Q3
// Visual builder com drag-to-reorder + edit panel lateral.
// Não usa reactflow puro porque precisamos de ordenação linear + drag handle,
// não DAG. Usa drag-and-drop nativo HTML5 + lista vertical.

import { useState } from 'react'
import { GripVertical, Trash2, Plus, Save, X } from 'lucide-react'

const STEP_TYPES = [
  { id: 'welcome',  label: 'Welcome',         color: '#a855f7', emoji: '👋' },
  { id: 'form',     label: 'Form',            color: '#3b82f6', emoji: '📝' },
  { id: 'connect',  label: 'Connect tools',   color: '#10b981', emoji: '🔌' },
  { id: 'watch',    label: 'Watch video',     color: '#f59e0b', emoji: '▶️' },
  { id: 'chat',     label: 'Chat with agent', color: '#ec4899', emoji: '💬' },
  { id: 'done',     label: 'Done',            color: '#84cc16', emoji: '✓' },
  { id: 'custom',   label: 'Custom',          color: '#6b7280', emoji: '◯' },
]

const typeMeta = (id) => STEP_TYPES.find(t => t.id === id) || STEP_TYPES[STEP_TYPES.length - 1]

export default function OnboardingFlowBuilder({ steps, onUpdate, onAdd, onRemove, onReorder }) {
  const [draggingId, setDraggingId] = useState(null)
  const [editingStep, setEditingStep] = useState(null)

  function handleDragStart(e, id) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, targetId) {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) return
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, targetId) {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      return
    }
    const ids = steps.map(s => s.id)
    const fromIdx = ids.indexOf(draggingId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const newOrder = [...ids]
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    onReorder(newOrder)
    setDraggingId(null)
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Lista de steps */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.length === 0 && (
          <div style={{
            padding: 30, textAlign: 'center', color: 'var(--text-dim)',
            background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8,
          }}>
            Sem passos. Aplica um template ou adiciona um passo custom.
          </div>
        )}
        {steps.map((step) => {
          const meta = typeMeta(step.type)
          const dragging = draggingId === step.id
          return (
            <div
              key={step.id}
              draggable
              onDragStart={(e) => handleDragStart(e, step.id)}
              onDragOver={(e) => handleDragOver(e, step.id)}
              onDrop={(e) => handleDrop(e, step.id)}
              onClick={() => setEditingStep(step)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: dragging ? 'var(--bg-elevated)' : 'var(--bg-card)',
                border: `1px solid ${editingStep?.id === step.id ? meta.color : 'var(--border)'}`,
                borderLeft: `3px solid ${meta.color}`,
                borderRadius: 6, cursor: 'grab',
                opacity: dragging ? 0.5 : 1,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <GripVertical size={14} color="var(--text-dim)" style={{ cursor: 'grab', flexShrink: 0 }} />
              <span style={{ fontSize: '1rem' }}>{meta.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: meta.color, fontFamily: 'JetBrains Mono, monospace' }}>
                    {String(step.step_index).padStart(2, '0')}
                  </span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{step.label}</strong>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>
                    {meta.label}
                  </span>
                </div>
                {step.status && step.status !== 'pending' && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    Status: <span style={{ color: step.status === 'done' ? 'var(--success)' : 'var(--info)' }}>{step.status}</span>
                  </div>
                )}
              </div>
              {!step.required && (
                <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: 3 }}>
                  optional
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(step.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
                title="Remover step"
              ><Trash2 size={13} /></button>
            </div>
          )
        })}

        <button
          onClick={() => onAdd({ type: 'custom', label: 'Novo passo' })}
          style={{
            padding: '10px 14px', marginTop: 4,
            background: 'transparent', border: '1px dashed var(--border)',
            borderRadius: 6, cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: '0.78rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        ><Plus size={13} /> Adicionar step</button>
      </div>

      {/* Side panel — edita o step seleccionado */}
      {editingStep && (
        <StepEditPanel
          step={editingStep}
          onSave={(patch) => { onUpdate(editingStep.id, patch); setEditingStep({ ...editingStep, ...patch }) }}
          onClose={() => setEditingStep(null)}
        />
      )}
    </div>
  )
}

function StepEditPanel({ step, onSave, onClose }) {
  const [label, setLabel] = useState(step.label)
  const [type, setType] = useState(step.type)
  const [required, setRequired] = useState(step.required)
  const [configText, setConfigText] = useState(JSON.stringify(step.config || {}, null, 2))
  const [configError, setConfigError] = useState(null)

  function handleSave() {
    let config
    try { config = JSON.parse(configText) } catch (e) {
      setConfigError(`JSON inválido: ${e.message}`)
      return
    }
    setConfigError(null)
    onSave({ label, type, required, config })
  }

  return (
    <div style={{
      width: 340, flexShrink: 0,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 16,
      position: 'sticky', top: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong style={{ fontSize: '0.85rem' }}>Editar step #{step.step_index}</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={14} /></button>
      </div>

      <label style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Label</label>
      <input value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} />

      <label style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 10, display: 'block' }}>Tipo</label>
      <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
        {STEP_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
      </select>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: '0.72rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
        <span style={{ color: 'var(--text)' }}>Obrigatório</span>
      </label>

      <label style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 12, display: 'block' }}>Config (JSON)</label>
      <textarea
        value={configText}
        onChange={e => setConfigText(e.target.value)}
        rows={8}
        style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', resize: 'vertical' }}
      />
      {configError && <div style={{ fontSize: '0.65rem', color: 'var(--danger)', marginTop: 4 }}>{configError}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
        <button onClick={handleSave} style={{
          background: 'var(--text)', color: 'var(--bg)', border: 'none',
          borderRadius: 5, padding: '7px 14px', cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}><Save size={13} /> Save step</button>
      </div>
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '6px 10px', borderRadius: 5,
  fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit',
  width: '100%', marginTop: 4,
}
