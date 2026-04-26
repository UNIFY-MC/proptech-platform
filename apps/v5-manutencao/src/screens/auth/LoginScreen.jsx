import { useState } from 'react'
import { supa } from '../../supa'

const G = '#0B3D2E'
const G2 = '#164E3A'
const EM = '#10B981'

export default function LoginScreen({ onNavigate, onDemoLogin, onDemoAuth }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState(null)

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (loading) return
    setErro(null)
    setLoading(true)

    const { error } = await supa.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErro('Email ou password incorrectos')
      } else if (error.message.includes('Email not confirmed')) {
        setErro('Confirma primeiro o teu email · verifica a tua caixa')
      } else {
        setErro(error.message)
      }
    }
    // Sucesso: AuthContext detecta via onAuthStateChange → App redireciona
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg,${G},${G2})`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Outfit',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 38, marginBottom: 6 }}>🏠</div>
        <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', fontFamily: "'Fraunces',Georgia,serif" }}>
          ServiçoPRO
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 3 }}>
          Bem-vindo de volta
        </div>
      </div>

      <form onSubmit={handleLogin} style={{
        width: '100%', maxWidth: 340,
        background: '#fff', borderRadius: 16, padding: '24px 20px',
        boxShadow: '0 4px 24px rgba(0,0,0,.18)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, fontFamily: "'Fraunces',Georgia,serif" }}>
          Entrar
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

        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 10, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Password
          </label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1.5px solid #ddd', borderRadius: 9, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div
          onClick={() => onNavigate('recover_password')}
          style={{ fontSize: 11, color: G, textAlign: 'right', marginBottom: 16, cursor: 'pointer', fontWeight: 600 }}
        >
          Esqueceste-te da password?
        </div>

        {erro && (
          <div style={{ padding: '9px 11px', background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            ⚠ {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          style={{
            width: '100%', padding: '12px 14px',
            background: (loading || !email || !password) ? '#ccc' : G,
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 12, fontFamily: 'inherit',
          }}
        >
          {loading ? 'A entrar...' : 'Entrar →'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#666' }}>
          Ainda não tens conta?{' '}
          <span
            onClick={() => onNavigate('signup')}
            style={{ color: G, fontWeight: 700, cursor: 'pointer' }}
          >
            Criar conta
          </span>
        </div>
      </form>

      {onDemoLogin && (
        <div style={{
          width: '100%', maxWidth: 340, marginTop: 14,
          background: 'rgba(255,255,255,.07)', borderRadius: 14,
          padding: '12px 16px', border: '1px solid rgba(255,255,255,.12)',
        }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', textAlign: 'center', marginBottom: 9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            🔧 Acesso rápido de teste
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            {[{r:'cliente',l:'👤 Cliente demo'},{r:'prestador',l:'👷 Prestador demo'}].map(({r,l}) => (
              <button key={r} onClick={() => onDemoLogin(r)}
                style={{ padding: '10px 8px', background: 'rgba(16,185,129,.18)', border: '1px solid rgba(16,185,129,.4)', borderRadius: 10, color: '#6ee7b7', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => onDemoLogin('admin')}
            style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, color: 'rgba(255,255,255,.45)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            ⚙️ Painel Admin
          </button>
        </div>
      )}

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 14, textAlign: 'center' }}>
        Ao continuar, aceitas os termos e política de privacidade
      </div>
    </div>
  )
}
