import { useState } from 'react'
import { supa } from '../../supa'

const G = '#0B3D2E'

export default function ConfirmEmailPendingScreen({ onNavigate, params = {} }) {
  const email = params.email || ''
  const [reenviado, setReenviado] = useState(false)
  const [loading,   setLoading]   = useState(false)

  const handleResend = async () => {
    if (reenviado || loading) return
    setLoading(true)
    await supa.auth.resend({ type: 'signup', email })
    setLoading(false)
    setReenviado(true)
    setTimeout(() => setReenviado(false), 60000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg,${G},#164E3A)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Outfit',system-ui,sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 340,
        background: '#fff', borderRadius: 16, padding: '32px 24px',
        boxShadow: '0 4px 24px rgba(0,0,0,.18)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Fraunces',Georgia,serif" }}>
          Email enviado!
        </div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 6 }}>
          Enviámos um link de confirmação para
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: G, marginBottom: 20, wordBreak: 'break-all' }}>
          {email}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 24, lineHeight: 1.5 }}>
          Verifica a tua caixa de entrada (e o spam). Clica no link para activar a conta.
        </div>

        <button
          onClick={handleResend}
          disabled={reenviado || loading}
          style={{
            width: '100%', padding: '11px 14px',
            background: (reenviado || loading) ? '#e5e7eb' : '#f0fdf4',
            color: (reenviado || loading) ? '#9ca3af' : G,
            border: `1.5px solid ${(reenviado || loading) ? '#e5e7eb' : '#bbf7d0'}`,
            borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: (reenviado || loading) ? 'not-allowed' : 'pointer',
            marginBottom: 10, fontFamily: 'inherit',
          }}
        >
          {loading ? 'A reenviar...' : reenviado ? '✓ Email reenviado · aguarda 60s' : 'Reenviar email'}
        </button>

        <button
          onClick={() => onNavigate('login')}
          style={{
            width: '100%', padding: '11px 14px',
            background: G, color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', marginBottom: 14, fontFamily: 'inherit',
          }}
        >
          Já confirmei · entrar →
        </button>

        <div
          onClick={() => onNavigate('signup')}
          style={{ fontSize: 11, color: '#999', cursor: 'pointer' }}
        >
          Mudei de email? Voltar ao registo
        </div>
      </div>
    </div>
  )
}
