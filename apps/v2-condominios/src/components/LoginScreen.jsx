import { useState } from 'react'
import { v2Client } from '../lib/clients.js'

const MODES = [
  { id: 'condomino', label: 'Condómino', sub: 'Link UUID privado' },
  { id: 'staff',     label: 'Equipa',    sub: 'Utilizador + password' },
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function LoginScreen({ mainClient }) {
  const [mode, setMode] = useState('staff')

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      color: 'var(--tx)',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Lado esquerdo — branding */}
      <aside style={{
        flex: '1 1 50%',
        padding: '48px 56px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, var(--sf) 0%, var(--sf2) 100%)',
        borderRight: '1px solid var(--bd)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--go)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 26, fontWeight: 700,
            color: '#0d1117',
          }}>P</div>
          <div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, lineHeight: 1.1 }}>
              Prata Owners
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--mu)', letterSpacing: 1, textTransform: 'uppercase' }}>
              V2 · Condomínios
            </div>
          </div>
        </div>

        <div>
          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 44, lineHeight: 1.1, fontWeight: 500,
            marginBottom: 14, color: 'var(--tx)',
          }}>
            Gestão moderna<br />de condomínios.
          </h1>
          <p style={{ color: 'var(--mu)', fontSize: 14, maxWidth: 420, lineHeight: 1.6 }}>
            Plataforma viva com AI integrada. Contas, frações, mora, OCR de facturas e
            energia EV — tudo num único lugar, com rasto completo de actividade.
          </p>
        </div>

        <div className="mono" style={{ fontSize: 10, color: 'var(--mu)', letterSpacing: 1 }}>
          © {new Date().getFullYear()} Property 007, Lda · prataowners.pt
        </div>
      </aside>

      {/* Lado direito — formulário */}
      <main style={{
        flex: '1 1 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 26, marginBottom: 6, color: 'var(--tx)',
          }}>
            Entrar
          </h2>
          <p className="dim" style={{ fontSize: 13, marginBottom: 24 }}>
            Escolhe o tipo de acesso.
          </p>

          {/* Toggle de modo */}
          <div style={{
            display: 'flex',
            background: 'var(--sf)',
            border: '1px solid var(--bd)',
            borderRadius: 8,
            padding: 4,
            marginBottom: 22,
          }}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  background: mode === m.id ? 'var(--sf2)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: mode === m.id ? 'var(--tx)' : 'var(--mu)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--mu)', marginTop: 2, letterSpacing: 0.4 }}>
                  {m.sub}
                </div>
              </button>
            ))}
          </div>

          {mode === 'condomino' && <FormCondomino />}
          {mode === 'staff'     && <FormStaff mainClient={mainClient} />}

          <div className="dim mono" style={{ fontSize: 10, textAlign: 'center', marginTop: 28, lineHeight: 1.6 }}>
            Acesso registado em <code>activity_logs</code>.<br />
            Problemas? Contacta <a href="mailto:mario@prataowners.pt" style={{ color: 'var(--bl)' }}>mario@prataowners.pt</a>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ─────────────── Formulário Condómino (UUID) ─────────────── */

function FormCondomino() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setSuccess(null)
    const clean = token.trim().toLowerCase()
    if (!UUID_RE.test(clean)) {
      setError('UUID inválido. Formato: 00000000-0000-0000-0000-000000000000')
      return
    }
    setLoading(true)
    const { data, error: rpcErr } = await v2Client.rpc('portal_token_login', { p_token: clean })
    setLoading(false)
    if (rpcErr) { setError(rpcErr.message); return }
    if (!data || data.ok !== true) {
      const map = {
        token_not_found_or_inactive: 'Token não reconhecido ou inactivo.',
      }
      setError(map[data?.error] || data?.error || 'Erro desconhecido.')
      return
    }
    setSuccess(`Bem-vindo, ${data.nome ?? 'condómino'}. A redireccionar…`)
    // Marker no localStorage — modo preview read-only ligado a PortalCondomino.
    localStorage.setItem('v2_portal_token', clean)
    localStorage.setItem('v2_portal_fracao_id', data.fracao_id ?? '')
    localStorage.setItem('v2_portal_condomino_id', data.condomino_id ?? '')
    localStorage.setItem('v2_portal_nome', data.nome ?? '')
    localStorage.setItem('v2_portal_email', data.email ?? '')
    setTimeout(() => { window.location.href = '/portal-condomino' }, 900)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Token de acesso (UUID)">
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          required
          autoFocus
          style={inputStyle}
        />
      </Field>

      <p className="dim" style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 14 }}>
        O link UUID foi-te enviado por email. Cada acesso é registado.
      </p>

      {error   && <div className="error-banner">{error}</div>}
      {success && <div style={successStyle}>{success}</div>}

      <button type="submit" disabled={loading} style={primaryBtn}>
        {loading ? 'A validar…' : 'Entrar no portal'}
      </button>
    </form>
  )
}

/* ─────────────── Formulário Staff (alias + password) ─────────────── */

function FormStaff({ mainClient }) {
  const [alias, setAlias] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Resolve alias → email via RPC v2_condominios.staff_login_lookup.
    // Se utilizador já escreveu email completo, salta o lookup.
    let email = alias.trim()
    if (!email.includes('@')) {
      const { data, error: rpcErr } = await v2Client.rpc('staff_login_lookup', { p_alias: email.toLowerCase() })
      if (rpcErr || !data || data.ok !== true || !data.email) {
        setLoading(false)
        setError('Alias não encontrado. Tenta o email completo.')
        return
      }
      email = data.email
    }

    const { error: authErr } = await mainClient.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authErr) setError(authErr.message)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Utilizador ou email">
        <input
          type="text"
          value={alias}
          onChange={e => setAlias(e.target.value)}
          placeholder="mario"
          autoComplete="username"
          required
          autoFocus
          style={inputStyle}
        />
      </Field>

      <Field label="Password">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={inputStyle}
        />
      </Field>

      {error && <div className="error-banner">{error}</div>}

      <button type="submit" disabled={loading} style={primaryBtn}>
        {loading ? 'A entrar…' : 'Entrar'}
      </button>
    </form>
  )
}

/* ─────────────── Helpers visuais ─────────────── */

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span className="mono" style={{
        display: 'block',
        fontSize: 9, color: 'var(--mu)',
        textTransform: 'uppercase', letterSpacing: 1,
        marginBottom: 5,
      }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle = {
  width: '100%',
  padding: '9px 11px',
  background: 'var(--sf)',
  border: '1px solid var(--bd)',
  borderRadius: 6,
  fontSize: 13,
  color: 'var(--tx)',
  fontFamily: 'DM Mono, monospace',
  boxSizing: 'border-box',
  outline: 'none',
}

const primaryBtn = {
  width: '100%',
  padding: '11px',
  background: 'var(--go)',
  color: '#0d1117',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  letterSpacing: 0.3,
  transition: 'opacity 0.12s',
}

const successStyle = {
  padding: '10px 14px',
  background: 'rgba(63,185,80,0.10)',
  color: 'var(--gr)',
  border: '1px solid rgba(63,185,80,0.30)',
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 14,
}
