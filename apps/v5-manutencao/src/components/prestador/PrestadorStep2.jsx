import React, { useState } from 'react'
import { validarEmail } from '../../lib/validation'

const F = '#0B3D2E'

function ProgressBar({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? F : '#E5E7EB' }} />
      ))}
      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#6B7685', whiteSpace: 'nowrap' }}>{step} de 3</span>
    </div>
  )
}

function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#6B7685', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 5 }}>
        {label}
      </label>
      {children}
      {error
        ? <div style={{ fontSize: 10, color: '#DC2626', marginTop: 4 }}>{error}</div>
        : hint && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{hint}</div>
      }
    </div>
  )
}

const baseInp = { width: '100%', padding: '11px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, color: '#0A1620', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'Outfit, sans-serif' }

export default function PrestadorStep2({ data, onChange, onNext, onSkip, onBack }) {
  const [touched, setTouched] = useState({ email: false })

  const emailOk = validarEmail(data.email)
  const emailErr = touched.email && data.email.length > 0 && !emailOk

  const set = field => e => onChange(prev => ({ ...prev, [field]: e.target.value }))
  const touch = field => () => setTouched(prev => ({ ...prev, [field]: true }))

  const handleNext = () => {
    if (!emailOk) { setTouched({ email: true }); return }
    onNext()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: F, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>
          Passo 2 de 3 — Dados opcionais
        </div>
      </div>

      <div style={{ padding: 20, flex: 1 }}>
        <ProgressBar step={2} />

        <Field
          label={<>Morada <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(opcional)</span></>}
          hint="Necessária para recibo completo."
        >
          <input
            type="text"
            value={data.morada}
            onChange={set('morada')}
            placeholder="Rua das Flores, 12, Lisboa"
            autoComplete="street-address"
            style={baseInp}
          />
        </Field>

        <Field
          label={<>Email <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(opcional)</span></>}
          hint="Enviamos-lhe uma cópia do recibo."
          error={emailErr ? 'Endereço de email inválido' : null}
        >
          <input
            type="email"
            value={data.email}
            onChange={set('email')}
            onBlur={touch('email')}
            placeholder="nome@email.pt"
            autoComplete="email"
            style={{ ...baseInp, border: `1.5px solid ${emailErr ? '#DC2626' : '#E5E7EB'}` }}
          />
        </Field>

        <button
          onClick={handleNext}
          style={{ width: '100%', background: F, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', marginTop: 8 }}
        >
          Continuar →
        </button>

        <button
          onClick={onSkip}
          style={{ width: '100%', background: 'transparent', color: '#6B7685', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', marginTop: 8 }}
        >
          Saltar estes dados
        </button>

        <button
          onClick={onBack}
          style={{ width: '100%', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', marginTop: 12, fontFamily: 'Outfit, sans-serif' }}
        >
          ← Voltar
        </button>
      </div>
    </div>
  )
}
