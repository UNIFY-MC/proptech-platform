// RecordDetailsPanel — painel lateral direito "All record details"
// Sprint C2: custom fields editor + edição inline por type
// Props: record (objecto), recordType, onRecordUpdate (opcional callback)

import { useState, useCallback } from 'react'
import CustomFieldEditor from './CustomFieldEditor.jsx'
import CustomFieldInput from './CustomFieldInput.jsx'
import { useCustomFields } from '../../hooks/useCustomFields.js'

// Mapa de tabela por record type (para guardar custom_fields)
const TYPE_TABLE = {
  pessoa:       'pessoas',
  empresa:      'empresas',
  imovel:       'imoveis',
  condominio:   'condominios',
  oportunidade: 'oportunidades',
}

// Campos canónicos por tipo de record
const CANONICAL_FIELDS = {
  pessoa: [
    { key: 'nome',      label: 'Nome completo' },
    { key: 'email',     label: 'Email' },
    { key: 'telemovel', label: 'Telemóvel' },
    { key: 'nif',       label: 'NIF' },
    { key: 'morada',    label: 'Morada' },
    { key: 'workspace_id', label: 'Workspace' },
  ],
  empresa: [
    { key: 'nome',    label: 'Nome' },
    { key: 'nipc',    label: 'NIPC' },
    { key: 'email',   label: 'Email' },
    { key: 'website', label: 'Website' },
    { key: 'morada',  label: 'Morada' },
    { key: 'kind',    label: 'Tipo' },
  ],
  imovel: [
    { key: 'descricao',    label: 'Descrição' },
    { key: 'morada',       label: 'Morada' },
    { key: 'tipo',         label: 'Tipo' },
    { key: 'area_m2',      label: 'Área m²' },
    { key: 'valor_eur',    label: 'Valor (€)' },
    { key: 'condominio_id',label: 'Condomínio' },
  ],
  condominio: [
    { key: 'nome',         label: 'Nome' },
    { key: 'morada',       label: 'Morada' },
    { key: 'num_fracoes',  label: 'Fracções' },
    { key: 'gestor_nome',  label: 'Gestor' },
  ],
  oportunidade: [
    { key: 'titulo',              label: 'Título' },
    { key: 'stage',               label: 'Estado' },
    { key: 'valor_eur',           label: 'Valor (€)' },
    { key: 'probability_pct',     label: 'Probabilidade' },
    { key: 'expected_close_date', label: 'Data prevista' },
  ],
}

function SectionHeader({ title, action }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 6,
    }}>
      <div style={{
        fontSize: 9,
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.04em',
        fontWeight: 600,
      }}>
        {title}
      </div>
      {action}
    </div>
  )
}

function FieldRow({ label, value }) {
  const isEmpty = value === null || value === undefined || value === ''
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '5px 0',
      fontSize: 11,
      gap: 8,
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-dim)', flexShrink: 0, minWidth: 80 }}>{label}</span>
      <span style={{
        color: isEmpty ? 'var(--text-dim)' : 'var(--text)',
        textAlign: 'right',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      }}>
        {isEmpty ? '—' : String(value)}
      </span>
    </div>
  )
}

// Linha de custom field com edição inline
function CustomFieldRow({ field, value, onSave, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(field.slug, localVal)
    setSaving(false)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && field.type !== 'json') handleSave()
    if (e.key === 'Escape') { setLocalVal(value); setEditing(false) }
  }

  return (
    <div style={{
      padding: '5px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        marginBottom: editing ? 4 : 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0, minWidth: 80 }}>
          {field.label}
          {field.required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {!editing && (
            <span
              style={{
                color: (value === null || value === undefined || value === '') ? 'var(--text-dim)' : 'var(--text)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                cursor: 'pointer',
                textDecoration: 'underline dotted',
              }}
              onClick={() => setEditing(true)}
            >
              {(value === null || value === undefined || value === '') ? '—' : String(value)}
            </span>
          )}
          <button
            onClick={() => onEdit(field)}
            title="Editar definição do campo"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: 11, padding: '0 2px',
              opacity: 0.5,
            }}
          >⚙</button>
          <button
            onClick={() => onRemove(field.slug)}
            title="Remover campo"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: 11, padding: '0 2px',
              opacity: 0.5,
            }}
          >×</button>
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 4 }} onKeyDown={handleKeyDown}>
          <CustomFieldInput
            field={field}
            value={localVal}
            onChange={setLocalVal}
            compact
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: 'var(--purple)', color: '#fff',
                border: 'none', borderRadius: 4,
                padding: '3px 10px', fontSize: 10, cursor: 'pointer',
              }}
            >
              {saving ? '…' : 'Guardar'}
            </button>
            <button
              onClick={() => { setLocalVal(value); setEditing(false) }}
              style={{
                background: 'var(--surface2)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 4,
                padding: '3px 10px', fontSize: 10, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecordDetailsPanel({ record, recordType, onRecordUpdate }) {
  const [showAll, setShowAll] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [saveMsg, setSaveMsg] = useState(null)

  const fields = CANONICAL_FIELDS[recordType] ?? []
  const { fields: customFields, upsertField, removeField, saveFieldValue } = useCustomFields(recordType)
  const table = TYPE_TABLE[recordType] ?? recordType + 's'

  const visibleFields = showAll ? fields : fields.slice(0, 4)

  const handleCustomFieldSave = useCallback(async (fieldDef) => {
    const result = await upsertField(fieldDef)
    if (result?.ok) {
      setSaveMsg('Campo guardado.')
      setTimeout(() => setSaveMsg(null), 2000)
    }
    return result
  }, [upsertField])

  const handleValueSave = useCallback(async (slug, value) => {
    if (!record?.id) return
    await saveFieldValue(table, record.id, slug, value)
    onRecordUpdate?.()
  }, [record, table, saveFieldValue, onRecordUpdate])

  const handleRemoveField = useCallback(async (slug) => {
    if (!window.confirm(`Remover campo "${slug}"? Os dados guardados permanecem no JSON.`)) return
    await removeField(slug)
  }, [removeField])

  const openEditor = useCallback((field = null) => {
    setEditingField(field)
    setShowEditor(true)
  }, [])

  if (!record) return null

  return (
    <div>
      {/* Campos canónicos */}
      <SectionHeader title="Detalhes do registo" />
      {visibleFields.map(f => (
        <FieldRow key={f.key} label={f.label} value={record[f.key]} />
      ))}
      {fields.length > 4 && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            background: 'none', border: 'none',
            color: 'var(--blue)', fontSize: 10,
            cursor: 'pointer', padding: '6px 0',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {showAll ? '▲ Mostrar menos' : `▼ Mostrar todos (${fields.length})`}
        </button>
      )}

      {/* Campos personalizados */}
      <SectionHeader
        title="Campos personalizados"
        action={
          <button
            onClick={() => openEditor(null)}
            style={{
              background: 'var(--purple)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}
          >
            + Add field
          </button>
        }
      />

      {saveMsg && (
        <div style={{
          background: 'rgba(45,106,79,0.12)',
          border: '1px solid var(--green)',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 10,
          color: 'var(--green)',
          marginBottom: 6,
        }}>
          {saveMsg}
        </div>
      )}

      {customFields.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '6px 0' }}>
          Sem campos personalizados.{' '}
          <span
            onClick={() => openEditor(null)}
            style={{ color: 'var(--purple)', cursor: 'pointer' }}
          >
            Adicionar o primeiro
          </span>
        </div>
      ) : (
        customFields.map(f => (
          <CustomFieldRow
            key={f.slug}
            field={f}
            value={record?.custom_fields?.[f.slug]}
            onSave={handleValueSave}
            onEdit={openEditor}
            onRemove={handleRemoveField}
          />
        ))
      )}

      {/* Related records */}
      {record.related && record.related.length > 0 && (
        <>
          <SectionHeader title="Registos relacionados" />
          {record.related.map((r, i) => (
            <div key={i} style={{
              fontSize: 11, color: 'var(--blue)',
              padding: '4px 0', cursor: 'pointer',
              borderBottom: '1px solid var(--border)',
            }}>
              {r.type}: {r.nome || r.name || r.id}
            </div>
          ))}
        </>
      )}

      {/* In lists */}
      {record.lists && record.lists.length > 0 && (
        <>
          <SectionHeader title={`Em listas (${record.lists.length})`} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {record.lists.map((l, i) => (
              <span key={i} style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '2px 8px',
                fontSize: 10,
                color: 'var(--text)',
              }}>
                {l.nome || l.name}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Agentes atribuídos */}
      <SectionHeader title="Agentes associados" />
      <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '4px 0' }}>
        <span style={{ fontSize: 10 }}>(Associação automática via system.agent_triggers — Sprint C4)</span>
      </div>

      {/* Metadata */}
      <SectionHeader title="Sistema" />
      <FieldRow label="ID" value={record.id ? String(record.id).slice(0, 8) + '…' : '—'} />
      <FieldRow label="Criado" value={record.created_at ? new Date(record.created_at).toLocaleDateString('pt-PT') : '—'} />
      <FieldRow label="Actualizado" value={record.updated_at ? new Date(record.updated_at).toLocaleDateString('pt-PT') : '—'} />

      {/* Modal editor de custom fields */}
      {showEditor && (
        <CustomFieldEditor
          recordType={recordType}
          existingField={editingField}
          onSave={handleCustomFieldSave}
          onClose={() => { setShowEditor(false); setEditingField(null) }}
        />
      )}
    </div>
  )
}
