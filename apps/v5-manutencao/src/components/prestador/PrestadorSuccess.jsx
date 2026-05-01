import React from 'react'

const F = '#0B3D2E'
const EM = '#10B981'

export default function PrestadorSuccess({ reciboId, prestadorNome }) {
  const firstName = prestadorNome ? prestadorNome.split(' ')[0] : 'Prestador'

  const handleCTA = () => {
    console.log({ event: 'cta_create_account_clicked', recibo_id: reciboId })
  }

  const handleDismiss = () => {
    try { window.close() } catch (_) {}
    window.location.href = '/'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: F, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>
          prataowners.pt
        </div>
      </div>

      <div style={{ padding: '40px 20px 20px', textAlign: 'center', flex: 1 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: F, marginBottom: 8, fontFamily: 'Fraunces, serif', lineHeight: 1.3 }}>
          Recibo emitido com sucesso
        </div>
        <div style={{ fontSize: 14, color: '#6B7685', lineHeight: 1.6, marginBottom: 32 }}>
          {firstName}, o seu recibo está arquivado e o proprietário foi notificado.
        </div>

        {/* Soft CTA — Camada 2 funnel (Sprint 1E) */}
        <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '16px 18px', textAlign: 'left', border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1620', marginBottom: 6, fontFamily: 'Outfit, sans-serif' }}>
            Quer organizar todos os seus trabalhos aqui?
          </div>
          <div style={{ fontSize: 12, color: '#6B7685', lineHeight: 1.5, marginBottom: 14 }}>
            • Receba clientes via WhatsApp / Email<br />
            • Emita recibos profissionais<br />
            • Veja agenda e histórico de clientes
          </div>
          <a
            href="#"
            onClick={e => { e.preventDefault(); handleCTA() }}
            style={{ display: 'block', width: '100%', background: F, color: '#fff', border: 'none', borderRadius: 9, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}
          >
            Criar conta gratuita →
          </a>
        </div>

        <button
          onClick={handleDismiss}
          style={{ width: '100%', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', marginTop: 16, fontFamily: 'Outfit, sans-serif' }}
        >
          Agora não
        </button>
      </div>
    </div>
  )
}
