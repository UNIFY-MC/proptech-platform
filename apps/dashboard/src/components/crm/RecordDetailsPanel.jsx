// RecordDetailsPanel — painel lateral direito "All record details"
// Props: record (objecto), recordType ('pessoa'|'empresa'|'imovel'|'condominio')
// Sections: campos canónicos, custom fields, related records, listas, agentes

import { useState } from 'react'

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
}

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 9,
      textTransform: 'uppercase',
      color: 'var(--text-dim)',
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.04em',
      fontWeight: 600,
      marginBottom: 6,
      marginTop: 16,
    }}>
      {title}
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

export default function RecordDetailsPanel({ record, recordType }) {
  const [showAll, setShowAll] = useState(false)
  const fields = CANONICAL_FIELDS[recordType] ?? []

  if (!record) return null

  const visibleFields = showAll ? fields : fields.slice(0, 4)

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

      {/* Custom fields placeholder */}
      <SectionHeader title="Campos personalizados" />
      <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '4px 0' }}>
        Campos adicionais configuráveis via <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--purple)' }}>core.records_metadata</span>
        <br />
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>(Em construção — Sprint C2)</span>
      </div>

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
    </div>
  )
}
