import { useState } from 'react'
import { supa } from '../../supa'

const G = '#0B3D2E'

export default function RecoverPasswordScreen({ onNavigate }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro,    setErro]    = useState(null)

  const handleRecover = async (e) => {
    e?.preventDefault()
    if (loading) return
    setErro(null)
    setLoading(true)

    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)

    if (error) { setErro(error.message); return }
    setEnviado(true)
  }

  if (enviado) return (
    <div style={{
      minHeight: '100vh', background: `linear-gradient(135deg,${G},#164E3A)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
      fontFamily: "'Outfit',system-ui,sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 340, background: '#fff',
        borderRadius: 16, padding: '32px 24px',
        boxShadow: '0 4px 24px rgba(0,0,0,.18)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "'Fraunces',Georgia,serif" }}>
          Email enviado!
        </div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
          Enviámos instruções de recuperação para <b>{email}</b>.
          Verifica a tua caixa (e o spam).
        </div>
        <button
          onClick={() => onNavigate('login')}
          style={{ width: '100%', padding: '11px 14px', background: G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Voltar ao login
        </button>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: `linear-gradient(135deg,${G},#164E3A)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
      fontFamily: "'Outfit',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>🔑</div>
        <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', fontFamily: "'Fraunces',Georgia,serif" }}>
          Recuperar password
        </div>
      </div>

      <form onSubmit={handleRecover} style={{
        width: '100%', maxWidth: 340,
        background: '#fff', borderRadius: 16, padding: '24px 20px',
        boxShadow: '0 4px 24px rgba(0,0,0,.18)',
      }}>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.5 }}>
          Introduz o teu email e enviamos um link para criares uma nova password.
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Email
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="o.teu@email.com" required autoComplete="email"
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1.5px solid #ddd', borderRadius: 9, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {erro && (
          <div style={{ padding: '9px 11px', background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            ⚠ {erro}
          </div>
        )}

        <button
          type="submit" disabled={loading || !email}
          style={{
            width: '100%', padding: '12px 14px',
            background: (loading || !email) ? '#ccc' : G,
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 12, fontFamily: 'inherit',
          }}
        >
          {loading ? 'A enviar...' : 'Enviar link de recuperação →'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#666' }}>
          <span onClick={() => onNavigate('login')} style={{ color: G, fontWeight: 700, cursor: 'pointer' }}>
            Voltar ao login
          </span>
        </div>
      </form>
    </div>
  )
}
