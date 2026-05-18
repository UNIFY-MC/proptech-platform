// CustomFieldInput — renderiza o input correcto consoante o type do campo
// Props:
//   field   — { slug, label, type, options?, required?, description? }
//   value   — valor actual
//   onChange — (newValue) => void
//   compact — (bool) usa versão inline/compacta para edição in-place no painel

const INPUT_BASE = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 11,
  color: 'var(--text)',
  fontFamily: "'Inter', sans-serif",
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

const MONO = { ...INPUT_BASE, fontFamily: "'JetBrains Mono', monospace" }

export default function CustomFieldInput({ field, value, onChange, compact = false }) {
  if (!field) return null

  const { type, options = [] } = field
  const h = compact ? 26 : 32
  const style = { ...INPUT_BASE, height: h }

  switch (type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return (
        <input
          type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : type === 'url' ? 'url' : 'text'}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={style}
          placeholder={field.description || ''}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(e.target.valueAsNumber || null)}
          style={{ ...MONO, height: h }}
          placeholder="0"
        />
      )

    case 'currency':
      return (
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: 'var(--text-dim)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>€</span>
          <input
            type="number"
            value={value ?? ''}
            onChange={e => onChange(e.target.valueAsNumber || null)}
            style={{ ...MONO, height: h, paddingLeft: 20 }}
            placeholder="0,00"
            step="0.01"
          />
        </div>
      )

    case 'date':
      return (
        <input
          type="date"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={{ ...MONO, height: h }}
        />
      )

    case 'status':
      // status usa um select de opções predefinidas (ou default)
      return (
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={style}
        >
          <option value="">— sem estado —</option>
          {(options.length > 0 ? options : ['Activo', 'Inactivo', 'Pendente']).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )

    case 'select':
      return (
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={style}
        >
          <option value="">— seleccionar —</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )

    case 'relation':
      // Placeholder: mostra UUID editável até existir picker de records
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={style}
          placeholder="UUID do registo relacionado"
        />
      )

    case 'formula':
      // Read-only — fórmulas são calculadas server-side
      return (
        <div style={{
          ...MONO, height: 'auto',
          padding: '4px 8px',
          color: 'var(--text-dim)',
          fontSize: 10,
          cursor: 'not-allowed',
          opacity: 0.7,
        }}>
          {value ?? '(calculado)'}
        </div>
      )

    case 'json':
      return (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
          onChange={e => {
            try { onChange(JSON.parse(e.target.value)) }
            catch { onChange(e.target.value) }
          }}
          style={{
            ...MONO,
            height: compact ? 60 : 100,
            resize: 'vertical',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
          }}
          placeholder="{}"
          spellCheck={false}
        />
      )

    default:
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          style={style}
        />
      )
  }
}
