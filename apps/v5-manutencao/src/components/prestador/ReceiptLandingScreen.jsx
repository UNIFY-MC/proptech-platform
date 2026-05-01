import React from 'react'

const F = '#0B3D2E'

export default function ReceiptLandingScreen({ linkInfo, onAccept }) {
  const tipoServico = linkInfo?.tipo_servico || '—'
  const valorEur = linkInfo?.valor_eur != null
    ? `€ ${Number(linkInfo.valor_eur).toFixed(2).replace('.', ',')}`
    : '—'
  const dataServico = linkInfo?.data_servico
    ? new Date(linkInfo.data_servico + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const ownerNome = linkInfo?.owner_nome

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: F, padding: '28px 20px 24px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
          prataowners.pt
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 6, fontFamily: 'Fraunces, serif' }}>
          {ownerNome ? `${ownerNome} quer enviar‑lhe um recibo digital` : 'Recibo digital pendente'}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
          Preencha os seus dados (3 min) e o recibo fica arquivado automaticamente.
        </div>

        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '12px 14px', marginTop: 14 }}>
          {[
            ['Serviço', tipoServico],
            ['Valor', valorEur],
            ['Data', dataServico],
          ].map(([k, v], idx, arr) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: idx < arr.length - 1 ? 6 : 0 }}>
              <span style={{ fontSize: 10, opacity: .7, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.06em', color: '#fff' }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#fff' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 20, flex: 1 }}>
        <p style={{ fontSize: 13, color: '#6B7685', lineHeight: 1.6, marginBottom: 20 }}>
          Ao aceitar, os seus dados ficam registados de forma segura e utilizados apenas para emissão deste recibo. Pode solicitar a eliminação a qualquer momento.
        </p>
        <button
          onClick={onAccept}
          style={{ width: '100%', background: F, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
        >
          Aceitar e preencher dados →
        </button>
        <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          Sem instalação · Gratuito para prestadores · RGPD compliant
        </p>
      </div>
    </div>
  )
}
