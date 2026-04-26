import { useEffect, useState } from 'react'
import { supa } from '../../supa'

const G = '#0B3D2E'

export default function ConfirmEmailScreen({ onNavigate }) {
  const [estado, setEstado] = useState('loading') // 'loading' | 'ok' | 'erro'
  const [email,  setEmail]  = useState('')

  useEffect(() => {
    // detectSessionInUrl: true no supa.js faz auto-detect do token na URL.
    // Ouvimos o evento EMAIL_CONFIRMED / SIGNED_IN que Supabase dispara.
    const { data: { subscription } } = supa.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'EMAIL_CONFIRMED') {
        setEstado('ok')
        // App.jsx vai detectar authenticated=true e redirecionar
      }
    })

    // Timeout de segurança: se em 5s não confirmar, mostra erro
    const t = setTimeout(() => {
      setEstado(prev => prev === 'loading' ? 'erro' : prev)
    }, 5000)

    return () => { subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  const handleResend = async () => {
    if (!email) { onNavigate('login'); return }
    await supa.auth.resend({ type: 'signup', email })
    onNavigate('confirm_email_pending', { email })
  }

  if (estado === 'loading') return (
    <div style={{
      minHeight: '100vh', background: `linear-gradient(135deg,${G},#164E3A)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>A confirmar email...</div>
      </div>
    </div>
  )

  if (estado === 'ok') return (
    <div style={{
      minHeight: '100vh', background: `linear-gradient(135deg,${G},#164E3A)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Email confirmado · a entrar...</div>
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
      <div style={{
        width: '100%', maxWidth: 340, background: '#fff',
        borderRadius: 16, padding: '32px 24px',
        boxShadow: '0 4px 24px rgba(0,0,0,.18)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "'Fraunces',Georgia,serif" }}>
          Link inválido ou expirado
        </div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
          O link de confirmação pode ter expirado. Pede um novo.
        </div>
        <input
          type="email" placeholder="o.teu@email.com" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1.5px solid #ddd', borderRadius: 9, boxSizing: 'border-box', outline: 'none', marginBottom: 10 }}
        />
        <button
          onClick={handleResend}
          style={{ width: '100%', padding: '11px 14px', background: G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}
        >
          Reenviar link
        </button>
        <button
          onClick={() => onNavigate('login')}
          style={{ width: '100%', padding: '11px 14px', background: 'transparent', color: G, border: `1.5px solid ${G}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Voltar ao login
        </button>
      </div>
    </div>
  )
}
