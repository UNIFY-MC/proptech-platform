import { useEffect, useState } from 'react'
import { supa } from '../../supa'
import PasswordInput from '../../components/PasswordInput.jsx'

const G = '#0B3D2E'

export default function ResetPasswordScreen({ onNavigate }) {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState(null)
  const [pronto,    setPronto]    = useState(false)
  const [temSession, setTemSession] = useState(false)

  useEffect(() => {
    // detectSessionInUrl processa o token da URL automaticamente
    // e dispara PASSWORD_RECOVERY
    const { data: { subscription } } = supa.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setTemSession(true)
    })
    // Verificar sessão já activa (caso reload)
    supa.auth.getSession().then(({ data: { session } }) => {
      if (session) setTemSession(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e) => {
    e?.preventDefault()
    if (password !== confirm) { setErro('As passwords não coincidem'); return }
    if (password.length < 8) { setErro('Password mínimo 8 caracteres'); return }
    setErro(null)
    setLoading(true)

    const { error } = await supa.auth.updateUser({ password })
    setLoading(false)

    if (error) { setErro(error.message); return }
    setPronto(true)
    // App detecta sessão activa e redireciona para home
  }

  if (!temSession) return (
    <div style={{
      minHeight: '100vh', background: `linear-gradient(135deg,${G},#164E3A)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14 }}>A verificar link...</div>
      </div>
    </div>
  )

  if (pronto) return (
    <div style={{
      minHeight: '100vh', background: `linear-gradient(135deg,${G},#164E3A)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Password actualizada · a entrar...</div>
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
        <div style={{ fontSize: 36, marginBottom: 6 }}>🔒</div>
        <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', fontFamily: "'Fraunces',Georgia,serif" }}>
          Nova password
        </div>
      </div>

      <form onSubmit={handleReset} style={{
        width: '100%', maxWidth: 340, background: '#fff',
        borderRadius: 16, padding: '24px 20px',
        boxShadow: '0 4px 24px rgba(0,0,0,.18)',
      }}>
        {[
          { label: 'NOVA PASSWORD', val: password, set: setPassword, auto: 'new-password' },
          { label: 'CONFIRMAR PASSWORD', val: confirm, set: setConfirm, auto: 'new-password' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {f.label}
            </label>
            <PasswordInput
              value={f.val} onChange={e => f.set(e.target.value)}
              placeholder="mín. 8 caracteres" required autoComplete={f.auto}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1.5px solid #ddd', borderRadius: 9, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        ))}

        {erro && (
          <div style={{ padding: '9px 11px', background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            ⚠ {erro}
          </div>
        )}

        <button
          type="submit" disabled={loading || !password || !confirm}
          style={{
            width: '100%', padding: '12px 14px',
            background: (loading || !password || !confirm) ? '#ccc' : G,
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'A guardar...' : 'Guardar e entrar →'}
        </button>
      </form>
    </div>
  )
}
