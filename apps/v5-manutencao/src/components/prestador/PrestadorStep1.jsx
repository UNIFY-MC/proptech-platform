import React, { useState, useRef, useEffect } from 'react'
import { validarNIF, validarTelefonePT } from '../../lib/validation'

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

const baseInp = { width: '100%', padding: '11px 12px', borderRadius: 8, fontSize: 14, color: '#0A1620', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'Outfit, sans-serif' }

export default function PrestadorStep1({ data, onChange, onNext }) {
  const nomeRef = useRef(null)
  const [touched, setTouched] = useState({ nome: false, nif: false, telefone: false })

  useEffect(() => { nomeRef.current?.focus() }, [])

  const nifOk = validarNIF(data.nif)
  const nifLabel = nifOk ? (parseInt(data.nif[0]) < 5 ? 'pessoa singular' : 'empresa / colectiva') : null
  const telOk = validarTelefonePT(data.telefone)
  const nomeOk = data.nome_completo.trim().length >= 3
  const canGo = nomeOk && nifOk && telOk

  const set = field => e => onChange(prev => ({ ...prev, [field]: e.target.value }))
  const touch = field => () => setTouched(prev => ({ ...prev, [field]: true }))
  const handleNext = () => {
    if (canGo) { onNext(); return }
    setTouched({ nome: true, nif: true, telefone: true })
  }

  const nifErr = touched.nif && data.nif.length > 0 && !nifOk
  const telErr = touched.telefone && data.telefone.length > 0 && !telOk
  const nomeErr = touched.nome && !nomeOk

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: F, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>
          Passo 1 de 3 — Dados pessoais
        </div>
      </div>

      <div style={{ padding: 20, flex: 1 }}>
        <ProgressBar step={1} />

        <Field label="Nome completo" error={nomeErr ? 'Mínimo 3 caracteres' : null}>
          <input
            ref={nomeRef}
            type="text"
            value={data.nome_completo}
            onChange={set('nome_completo')}
            onBlur={touch('nome')}
            autoComplete="name"
            style={{ ...baseInp, border: `1.5px solid ${nomeErr ? '#DC2626' : '#E5E7EB'}` }}
          />
        </Field>

        <Field label="NIF" hint="9 dígitos · Validação automática" error={nifErr ? 'NIF inválido — verifica o dígito de controlo' : null}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={9}
            value={data.nif}
            onChange={set('nif')}
            onBlur={touch('nif')}
            autoComplete="off"
            style={{
              ...baseInp,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              letterSpacing: '.08em',
              border: `1.5px solid ${nifErr ? '#DC2626' : nifOk ? '#10B981' : '#E5E7EB'}`,
            }}
          />
          {nifOk && (
            <div style={{ fontSize: 10, color: '#10B981', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, marginTop: 4 }}>
              ✓ NIF válido ({nifLabel})
            </div>
          )}
        </Field>

        <Field label="Telefone" error={telErr ? 'Formato inválido (ex: 912 345 678)' : null}>
          <input
            type="tel"
            value={data.telefone}
            onChange={set('telefone')}
            onBlur={touch('telefone')}
            placeholder="912 345 678"
            autoComplete="tel"
            style={{ ...baseInp, fontFamily: "'JetBrains Mono', monospace", border: `1.5px solid ${telErr ? '#DC2626' : '#E5E7EB'}` }}
          />
        </Field>

        <button
          onClick={handleNext}
          style={{ width: '100%', background: canGo ? F : '#E5E7EB', color: canGo ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: canGo ? 'pointer' : 'default', fontFamily: 'Outfit, sans-serif', marginTop: 8 }}
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}
