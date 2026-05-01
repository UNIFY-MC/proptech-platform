import React, { useState } from 'react'

const F = '#0B3D2E'
const EM = '#10B981'

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

function formatNIF(nif) {
  if (!nif || nif.length !== 9) return nif
  return `${nif.slice(0, 3)} ${nif.slice(3, 6)} ${nif.slice(6)}`
}

function formatData(ds) {
  if (!ds) return '—'
  return new Date(ds + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatValor(v) {
  if (v == null) return '—'
  return `€ ${Number(v).toFixed(2).replace('.', ',')}`
}

export default function PrestadorStep3({ data, linkInfo, onChange, onSubmit, onBack }) {
  const [confirmed, setConfirmed] = useState(false)

  const tipoServico = linkInfo?.tipo_servico || '—'
  const valor = linkInfo?.valor_eur
  const dataServico = formatData(linkInfo?.data_servico)
  const valorStr = formatValor(valor)

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: F, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>
          Passo 3 de 3 — Confirmar recibo
        </div>
      </div>

      <div style={{ padding: 20, flex: 1 }}>
        <ProgressBar step={3} />

        {/* Summary box */}
        <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '14px 16px', marginBottom: 20, border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6B7685', fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
            Resumo do recibo
          </div>
          {[
            ['Serviço', tipoServico],
            ['Prestador', data.nome_completo || '—'],
            ['NIF', formatNIF(data.nif) || '—'],
            ['Data', dataServico],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#6B7685' }}>{k}</span>
              <span style={{ fontFamily: k === 'NIF' ? "'JetBrains Mono', monospace" : 'Outfit, sans-serif', fontWeight: 600, color: '#0A1620', fontSize: k === 'NIF' ? 11 : 13 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #BBF7D0', fontSize: 14, fontWeight: 700 }}>
            <span style={{ color: '#0A1620' }}>Total</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: EM, fontSize: 17 }}>{valorStr}</span>
          </div>
        </div>

        {/* RGPD checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
          <input
            type="checkbox"
            id="confirm-receipt"
            checked={confirmed}
            onChange={e => {
              setConfirmed(e.target.checked)
              onChange(prev => ({ ...prev, confirmacao_valor: e.target.checked }))
            }}
            style={{ width: 18, height: 18, accentColor: F, cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
          />
          <label htmlFor="confirm-receipt" style={{ fontSize: 13, color: '#0A1620', lineHeight: 1.5, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
            Confirmo que recebi o valor de <strong>{valorStr}</strong> relativo a este serviço. Aceito que os meus dados (nome, NIF, telefone) sejam guardados para emissão do recibo.
          </label>
        </div>

        <button
          onClick={confirmed ? onSubmit : undefined}
          disabled={!confirmed}
          style={{ width: '100%', background: confirmed ? EM : '#E5E7EB', color: confirmed ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: confirmed ? 'pointer' : 'not-allowed', fontFamily: 'Outfit, sans-serif' }}
        >
          Confirmar e emitir recibo ✓
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
