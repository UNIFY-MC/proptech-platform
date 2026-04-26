import { useState } from 'react'
import { supa } from '../../supa'
import PasswordInput from '../../components/PasswordInput.jsx'

const G = '#0B3D2E'
const G2 = '#164E3A'

function forcaPassword(p) {
  if (!p) return { pct: 0, label: '', cor: '#ddd' }
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  const map = [
    { pct: 0,   label: '',       cor: '#ddd' },
    { pct: 25,  label: 'Fraca',  cor: '#ef4444' },
    { pct: 50,  label: 'Razoável', cor: '#f59e0b' },
    { pct: 75,  label: 'Boa',    cor: '#3b82f6' },
    { pct: 100, label: 'Forte',  cor: '#10B981' },
  ]
  return map[score]
}

export default function SignupScreen({ onNavigate }) {
  const [nome,            setNome]            = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [erro,            setErro]            = useState(null)

  const forca = forcaPassword(password)

  const handleSignup = async (e) => {
    e?.preventDefault()
    const nomeTrimmed = nome.trim()
    if (nomeTrimmed.split(' ').filter(Boolean).length < 2) {
      setErro('Insere o nome completo (pelo menos 2 palavras)')
      return
    }
    if (password !== passwordConfirm) {
      setErro('As passwords não coincidem')
      return
    }
    if (password.length < 8) {
      setErro('Password com mínimo 8 caracteres')
      return
    }

    setErro(null)
    setLoading(true)

    const { error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: { nome_completo: nomeTrimmed },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })
    setLoading(false)

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setErro('Este email já está registado · faz login')
      } else {
        setErro(error.message)
      }
      return
    }

    onNavigate('confirm_email_pending', { email })
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
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 38, marginBottom: 6 }}>🏠</div>
        {/* TODO(mario fix-ux): rever brand pública (V5/Property7/outra?) */}
        <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', fontFamily: "'Fraunces',Georgia,serif" }}>
          V5 Manutenção
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 3 }}>
          Cria a tua conta
        </div>
      </div>

      <form onSubmit={handleSignup} style={{
        width: '100%', maxWidth: 340,
        background: '#fff', borderRadius: 16, padding: '24px 20px',
        boxShadow: '0 4px 24px rgba(0,0,0,.18)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, fontFamily: "'Fraunces',Georgia,serif" }}>
          Criar conta
        </div>

        {[
          { label: 'NOME COMPLETO', type: 'text', val: nome, set: setNome, placeholder: 'Maria Santos', auto: 'name' },
          { label: 'EMAIL', type: 'email', val: email, set: setEmail, placeholder: 'o.teu@email.com', auto: 'email' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {f.label}
            </label>
            <input
              type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder} required autoComplete={f.auto}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1.5px solid #ddd', borderRadius: 9, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 10, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            PASSWORD
          </label>
          <PasswordInput
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="mín. 8 caracteres" required autoComplete="new-password"
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1.5px solid #ddd', borderRadius: 9, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
        {password && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 3, background: '#eee', borderRadius: 2, marginBottom: 3 }}>
              <div style={{ height: '100%', width: `${forca.pct}%`, background: forca.cor, borderRadius: 2, transition: 'width .3s,background .3s' }} />
            </div>
            <div style={{ fontSize: 10, color: forca.cor, fontWeight: 600 }}>{forca.label}</div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            CONFIRMAR PASSWORD
          </label>
          <PasswordInput
            value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
            placeholder="••••••••" required autoComplete="new-password"
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              border: `1.5px solid ${passwordConfirm && passwordConfirm !== password ? '#ef4444' : '#ddd'}`,
              borderRadius: 9, boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>

        {erro && (
          <div style={{ padding: '9px 11px', background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            ⚠ {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !nome || !email || !password || !passwordConfirm}
          style={{
            width: '100%', padding: '12px 14px',
            background: (loading || !nome || !email || !password || !passwordConfirm) ? '#ccc' : G,
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 12, fontFamily: 'inherit',
          }}
        >
          {loading ? 'A criar conta...' : 'Criar conta →'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#666' }}>
          Já tens conta?{' '}
          <span
            onClick={() => onNavigate('login')}
            style={{ color: G, fontWeight: 700, cursor: 'pointer' }}
          >
            Entrar
          </span>
        </div>
      </form>
    </div>
  )
}
