import React, { useState } from 'react'

const COUNTRIES = [
  { code: '+351', flag: '🇵🇹', label: 'Portugal' },
  { code: '+34',  flag: '🇪🇸', label: 'Espanha'  },
  { code: '+33',  flag: '🇫🇷', label: 'França'   },
  { code: '+49',  flag: '🇩🇪', label: 'Alemanha' },
  { code: '+44',  flag: '🇬🇧', label: 'Reino Unido' },
  { code: '+55',  flag: '🇧🇷', label: 'Brasil'   },
  { code: '+1',   flag: '🇺🇸', label: 'EUA'      },
]

// Reutilizável em ProfileSettings (3.4D)
export default function PhoneInput({ value, indicativo, onChange, hasError, placeholder }) {
  const [open, setOpen] = useState(false)
  const [isCustom, setIsCustom] = useState(
    !!indicativo && !COUNTRIES.find(c => c.code === indicativo)
  )

  const current     = COUNTRIES.find(c => c.code === indicativo)
  const borderColor = hasError ? '#dc2626' : '#e2e8f0'

  function selectCountry(code) {
    setIsCustom(false)
    setOpen(false)
    onChange(value, code)
  }

  function selectCustom() {
    setIsCustom(true)
    setOpen(false)
    onChange(value, '')
  }

  const autoPlaceholder = indicativo === '+351' ? '912 345 678' : '...'

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex' }}>
        {/* Selector de indicativo */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            padding: '10px 10px',
            border: `1.5px solid ${borderColor}`,
            borderRight: 'none',
            borderRadius: '9px 0 0 9px',
            background: '#f8fafc',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit',
            flexShrink: 0,
            minWidth: 82,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 16 }}>{current?.flag ?? '🌍'}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
            {isCustom ? (indicativo || '+') : (current?.code ?? '+?')}
          </span>
          <span style={{ fontSize: 9, color: '#64748b', marginLeft: 1 }}>▼</span>
        </button>

        {/* Input numérico */}
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value, indicativo)}
          placeholder={placeholder ?? autoPlaceholder}
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: 14,
            border: `1.5px solid ${borderColor}`,
            borderLeft: `1px solid #e2e8f0`,
            borderRadius: '0 9px 9px 0',
            outline: 'none',
            fontFamily: 'inherit',
            background: '#fff',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Input manual para indicativo personalizado */}
      {isCustom && (
        <input
          type="text"
          value={indicativo}
          onChange={e => onChange(value, e.target.value)}
          placeholder="+xxx"
          maxLength={5}
          style={{
            marginTop: 6,
            width: 82,
            padding: '6px 10px',
            fontSize: 13,
            border: `1.5px solid ${borderColor}`,
            borderRadius: 8,
            outline: 'none',
            fontFamily: 'inherit',
            background: '#fff',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Dropdown */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 999,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,.12)',
            marginTop: 4,
            minWidth: 190,
            overflow: 'hidden',
          }}>
            {COUNTRIES.map(c => {
              const active = !isCustom && c.code === indicativo
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c.code)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: active ? '#f0fdf4' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{c.flag}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', flexShrink: 0 }}>{c.code}</span>
                  <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>{c.label}</span>
                  {active && <span style={{ color: '#10B981', fontWeight: 700, fontSize: 14 }}>✓</span>}
                </button>
              )
            })}
            <div style={{ borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={selectCustom}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: isCustom ? '#f0fdf4' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>🌍</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>Outro...</span>
                {isCustom && <span style={{ color: '#10B981', fontWeight: 700, fontSize: 14 }}>✓</span>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
