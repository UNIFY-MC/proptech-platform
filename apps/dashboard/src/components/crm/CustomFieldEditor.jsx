// CustomFieldEditor — modal para adicionar / editar um custom field num record type
// Props:
//   recordType  — 'pessoa' | 'empresa' | 'imovel' | 'condominio' | 'oportunidade'
//   existingField — (opcional) field a editar; null = novo
//   onSave      — async (fieldDef) => { ok, error }
//   onClose     — () => void

import { useState, useEffect } from 'react'

const FIELD_TYPES = [
  { value: 'text',     label: 'Texto' },
  { value: 'number',   label: 'Número' },
  { value: 'currency', label: 'Moeda (€)' },
  { value: 'date',     label: 'Data' },
  { value: 'status',   label: 'Estado' },
  { value: 'select',   label: 'Selecção' },
  { value: 'email',    label: 'Email' },
  { value: 'phone',    label: 'Telefone' },
  { value: 'url',      label: 'URL' },
  { value: 'formula',  label: 'Fórmula' },
  { value: 'relation', label: 'Relação' },
  { value: 'json',     label: 'JSON' },
]

const RELATION_TYPES = [
  { value: 'pessoa',       label: 'Pessoa' },
  { value: 'empresa',      label: 'Empresa' },
  { value: 'imovel',       label: 'Imóvel' },
  { value: 'condominio',   label: 'Condomínio' },
  { value: 'oportunidade', label: 'Oportunidade' },
]

// Converte label para slug snake_case
function toSlug(str) {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function InputStyle({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '6px 10px',
        fontSize: 12,
        color: 'var(--text)',
        fontFamily: "'Inter', sans-serif",
        width: '100%',
        boxSizing: 'border-box',
        outline: 'none',
        ...style,
      }}
    />
  )
}

function SelectStyle({ children, ...props }) {
  return (
    <select
      {...props}
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '6px 10px',
        fontSize: 12,
        color: 'var(--text)',
        fontFamily: "'Inter', sans-serif",
        width: '100%',
        boxSizing: 'border-box',
        outline: 'none',
      }}
    >
      {children}
    </select>
  )
}

function Label({ children, tooltip }) {
  return (
    <label style={{
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      color: 'var(--text-dim)',
      display: 'block',
      marginBottom: 4,
      fontWeight: 600,
    }} title={tooltip}>
      {children}
      {tooltip && <span style={{ marginLeft: 4, color: 'var(--blue)', cursor: 'help' }}>?</span>}
    </label>
  )
}

function FormRow({ children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {children}
    </div>
  )
}

export default function CustomFieldEditor({ recordType, existingField, onSave, onClose }) {
  const isEdit = !!existingField

  const [label, setLabel]           = useState(existingField?.label ?? '')
  const [slug, setSlug]             = useState(existingField?.slug ?? '')
  const [slugManual, setSlugManual] = useState(isEdit)
  const [type, setType]             = useState(existingField?.type ?? 'text')
  const [defaultVal, setDefaultVal] = useState(existingField?.default_value ?? '')
  const [required, setRequired]     = useState(existingField?.required ?? false)
  const [description, setDescription] = useState(existingField?.description ?? '')
  const [options, setOptions]       = useState(existingField?.options ?? [])
  const [newOption, setNewOption]   = useState('')
  const [relationType, setRelationType] = useState(existingField?.relation_type ?? 'pessoa')
  const [formulaExpr, setFormulaExpr]  = useState(existingField?.formula_expr ?? '')
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)

  // Auto-gerar slug a partir do label (enquanto não foi editado manualmente)
  useEffect(() => {
    if (!slugManual && label) {
      setSlug(toSlug(label))
    }
  }, [label, slugManual])

  const handleSave = async () => {
    if (!slug || !label || !type) {
      setSaveError('Nome, slug e tipo são obrigatórios.')
      return
    }
    setSaving(true)
    setSaveError(null)

    const fieldDef = {
      slug,
      label,
      type,
      default_value: defaultVal || null,
      required,
      description: description || null,
    }

    if (type === 'select' || type === 'status') {
      fieldDef.options = options
    }
    if (type === 'relation') {
      fieldDef.relation_type = relationType
    }
    if (type === 'formula') {
      fieldDef.formula_expr = formulaExpr
    }

    const result = await onSave(fieldDef)
    setSaving(false)
    if (result?.error) {
      setSaveError(result.error)
    } else {
      onClose()
    }
  }

  const handleAddOption = () => {
    const opt = newOption.trim()
    if (opt && !options.includes(opt)) {
      setOptions(prev => [...prev, opt])
    }
    setNewOption('')
  }

  const handleRemoveOption = (opt) => {
    setOptions(prev => prev.filter(o => o !== opt))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        width: 480,
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {isEdit ? 'Editar campo' : 'Novo campo personalizado'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Record type: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--purple)' }}>{recordType}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: 18, lineHeight: 1,
            padding: '2px 6px',
          }}>×</button>
        </div>

        {/* Corpo */}
        <div style={{ padding: '20px' }}>

          <FormRow>
            <Label tooltip="Texto visível na interface para este campo">Nome do campo (label)</Label>
            <InputStyle
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: LTV, Data de contrato, Gestor atribuído"
              autoFocus
            />
          </FormRow>

          <FormRow>
            <Label tooltip="Identificador interno único. Gerado automaticamente, pode editar.">
              Slug (identificador)
            </Label>
            <InputStyle
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
              placeholder="ex: ltv_eur"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
            />
            {slug && (
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                Guardado como: <code style={{ color: 'var(--purple)' }}>{slug}</code>
              </div>
            )}
          </FormRow>

          <FormRow>
            <Label>Tipo de campo</Label>
            <SelectStyle value={type} onChange={e => setType(e.target.value)}>
              {FIELD_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </SelectStyle>
          </FormRow>

          {/* Opções para select/status */}
          {(type === 'select' || type === 'status') && (
            <FormRow>
              <Label>Opções disponíveis</Label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <InputStyle
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddOption()}
                  placeholder="Nova opção"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleAddOption}
                  style={{
                    background: 'var(--blue)', color: '#fff',
                    border: 'none', borderRadius: 4,
                    padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Adicionar
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {options.map(opt => (
                  <span key={opt} style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '2px 8px',
                    fontSize: 11,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {opt}
                    <button
                      onClick={() => handleRemoveOption(opt)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-dim)', fontSize: 12, padding: 0, lineHeight: 1,
                      }}
                    >×</button>
                  </span>
                ))}
                {options.length === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    Sem opções definidas
                  </span>
                )}
              </div>
            </FormRow>
          )}

          {/* Tipo de relação */}
          {type === 'relation' && (
            <FormRow>
              <Label>Record type de destino</Label>
              <SelectStyle value={relationType} onChange={e => setRelationType(e.target.value)}>
                {RELATION_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </SelectStyle>
            </FormRow>
          )}

          {/* Expressão de fórmula */}
          {type === 'formula' && (
            <FormRow>
              <Label tooltip="Expressão SQL-like calculada server-side. Usar nomes de campos como variáveis.">
                Expressão de fórmula
              </Label>
              <textarea
                value={formulaExpr}
                onChange={e => setFormulaExpr(e.target.value)}
                placeholder="Ex: valor_eur * 0.05&#10;COALESCE(custom_fields->>'ltv', '0')"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: 11,
                  color: 'var(--text)',
                  fontFamily: "'JetBrains Mono', monospace",
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 80,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </FormRow>
          )}

          {/* Valor por defeito */}
          {type !== 'formula' && (
            <FormRow>
              <Label>Valor por defeito (opcional)</Label>
              <InputStyle
                value={defaultVal}
                onChange={e => setDefaultVal(e.target.value)}
                placeholder="Vazio = sem valor por defeito"
              />
            </FormRow>
          )}

          <FormRow>
            <Label tooltip="Campo aparece marcado como obrigatório na ficha do record">Descrição / tooltip (opcional)</Label>
            <InputStyle
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Texto de ajuda que aparece ao pairar sobre o campo"
            />
          </FormRow>

          <FormRow>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={required}
                onChange={e => setRequired(e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text)' }}>Campo obrigatório</span>
            </label>
          </FormRow>

          {saveError && (
            <div style={{
              background: 'rgba(139,26,26,0.1)',
              border: '1px solid var(--red)',
              borderRadius: 4,
              padding: '8px 12px',
              fontSize: 11,
              color: 'var(--red)',
              marginBottom: 14,
            }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 12,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !slug || !label}
              style={{
                background: 'var(--purple)',
                border: 'none',
                borderRadius: 6,
                padding: '8px 20px',
                fontSize: 12,
                color: '#fff',
                cursor: saving ? 'wait' : 'pointer',
                opacity: (!slug || !label) ? 0.5 : 1,
                fontWeight: 600,
              }}
            >
              {saving ? 'A guardar…' : isEdit ? 'Actualizar campo' : 'Adicionar campo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
