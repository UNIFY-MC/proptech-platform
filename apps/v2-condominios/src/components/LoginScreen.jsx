// LoginScreen — cópia LITERAL do login de prataowners.pt LIVE (extraído 2026-05-24)
// Source: docs/v2-migration/legacy-source/login/ (HTML+CSS+screenshot+logo)
// NÃO INVENTAR. Estrutura DOM idêntica + 3 fluxos auth (magic-link email / Staff / Token).
// Se quiseres alterar layout/texto/cores, edita aqui ou em LoginScreen.css.
import { useState } from 'react'
import { v2Client } from '../lib/clients.js'
import './LoginScreen.css'

const LOGO_URL = 'https://eozklslwfaqujaijvdnl.supabase.co/storage/v1/object/public/documentos/logos/logo_condominio_1775177295282.png'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function LoginScreen({ mainClient }) {
  // 3 modes do legacy: 'magic' (default email magic-link), 'staff' (alias+pwd), 'token' (UUID condómino)
  const [mode, setMode] = useState('magic')
  const [lang, setLang] = useState('pt')

  return (
    <div id="scLogin" role="main" aria-label="Ecrã de autenticação">
      {/* Lado esquerdo — imagem hero + branding (literal de prataowners.pt) */}
      <div className="login-photo-content" aria-hidden="true">
        <div>
          <div className="login-photo-logo-top">
            <div className="login-photo-logo-top-wrap">
              <img src={LOGO_URL} alt="Prata Owners" onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling.style.display = 'block'
              }} />
              <span className="login-photo-logo-top-fallback">Prata Owners</span>
            </div>
          </div>
          <div className="login-photo-title">Prata Owners</div>
          <div className="login-photo-sub">
            Condomínio Prata Lote 2A<br />
            Prata Riverside Village · Lisboa
          </div>
          <div className="login-photo-tag">Portal de Condóminos</div>
        </div>
      </div>

      {/* Lado direito — painel branco */}
      <div className="login-panel">
        <div className="login-panel-logo">
          <img src={LOGO_URL} alt="Prata Owners" style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }}
               onError={(e) => {
                 e.currentTarget.style.display = 'none'
                 e.currentTarget.nextElementSibling.style.display = 'flex'
               }} />
          <div style={{ display: 'none', alignItems: 'center', gap: 8 }}>
            <div className="login-panel-logo-mark">P</div>
            <div className="login-panel-logo-text">Prata Owners</div>
          </div>
        </div>

        <div className="login-panel-header">
          <div className="login-panel-title">Bem-vindo</div>
          <div className="login-panel-sub">Condomínio Prata Lote 2A</div>
        </div>

        <div className="login-box">
          {/* Lang PT / EN */}
          <div className="login-lang-row">
            <button type="button" className={'login-lang-btn' + (lang === 'pt' ? ' active' : '')} onClick={() => setLang('pt')}>
              🇵🇹 PT
            </button>
            <button type="button" className={'login-lang-btn' + (lang === 'en' ? ' active' : '')} onClick={() => setLang('en')}>
              🇬🇧 EN
            </button>
          </div>

          {/* Form principal — varia por mode */}
          {mode === 'magic' && <FormMagic mainClient={mainClient} lang={lang} onSwitchStaff={() => setMode('staff')} onSwitchToken={() => setMode('token')} />}
          {mode === 'staff' && <FormStaff mainClient={mainClient} lang={lang} onBack={() => setMode('magic')} />}
          {mode === 'token' && <FormToken lang={lang} onBack={() => setMode('magic')} />}
        </div>

        <div className="login-footer">
          Prata Lote 2A · NIF 902266535 · Marvila, Lisboa
        </div>
      </div>
    </div>
  )
}

/* ─── Form Magic Link (email — default) ─── */
function FormMagic({ mainClient, lang, onSwitchStaff, onSwitchToken }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [sent, setSent] = useState(false)

  const t = lang === 'en' ? {
    subtitle: <>Enter your email to receive a<br />secure access link.</>,
    label: 'Email',
    placeholder: 'your@email.com',
    btn: '✉ Send access link',
    staff: 'Staff →',
    token: 'Token',
    sent: 'Link sent. Check your inbox.',
  } : {
    subtitle: <>Introduza o seu email para receber um link<br />de acesso seguro.</>,
    label: 'Email',
    placeholder: 'o.seu@email.com',
    btn: '✉ Enviar link de acesso',
    staff: 'Staff →',
    token: 'Token',
    sent: 'Link enviado. Verifique a sua caixa de entrada.',
  }

  async function submit(e) {
    e.preventDefault()
    setErr(null); setLoading(true)
    const { error } = await mainClient.auth.signInWithOtp({ email: email.trim().toLowerCase() })
    setLoading(false)
    if (error) setErr(error.message); else setSent(true)
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✉</div>
        <div style={{ color: 'rgb(24,22,15)', fontSize: 14 }}>{t.sent}</div>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <div className="login-subtitle">{t.subtitle}</div>
      <label htmlFor="magicEmail" className="login-label">{t.label}</label>
      <input
        id="magicEmail"
        type="email"
        className="login-input"
        placeholder={t.placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      {err && <div className="login-err">{err}</div>}
      <button type="submit" className="login-btn" disabled={loading}>
        {loading ? '…' : t.btn}
      </button>
      <div className="login-secondary-row">
        <button type="button" className="login-secondary-btn" onClick={onSwitchStaff}>{t.staff}</button>
        <button type="button" className="login-secondary-btn" onClick={onSwitchToken}>{t.token}</button>
      </div>
      <div className="login-hint">
        Acesso registado em <code>activity_logs</code>.<br />
        Problemas? Contacta <a href="mailto:mario@prataowners.pt">mario@prataowners.pt</a>
      </div>
    </form>
  )
}

/* ─── Form Staff (alias/email + password) ─── */
function FormStaff({ mainClient, lang, onBack }) {
  const [alias, setAlias] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const t = lang === 'en' ? {
    subtitle: 'Staff access — username or email + password.',
    user: 'Username or email',
    pwd: 'Password',
    btn: 'Sign in',
    back: '← Back',
  } : {
    subtitle: 'Acesso staff — utilizador ou email + password.',
    user: 'Utilizador ou email',
    pwd: 'Password',
    btn: 'Entrar',
    back: '← Voltar',
  }

  async function submit(e) {
    e.preventDefault()
    setErr(null); setLoading(true)
    let email = alias.trim()
    if (!email.includes('@')) {
      const { data, error: rpcErr } = await v2Client.rpc('staff_login_lookup', { p_alias: email.toLowerCase() })
      if (rpcErr || !data || data.ok !== true || !data.email) {
        setLoading(false); setErr('Alias não encontrado. Tenta o email completo.'); return
      }
      email = data.email
    }
    const { error: authErr } = await mainClient.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authErr) setErr(authErr.message)
  }

  return (
    <form onSubmit={submit}>
      <div className="login-subtitle">{t.subtitle}</div>
      <label className="login-label">{t.user}</label>
      <input
        type="text"
        className="login-input"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="mario"
        autoComplete="username"
        required
        autoFocus
      />
      <label className="login-label">{t.pwd}</label>
      <input
        type="password"
        className="login-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      {err && <div className="login-err">{err}</div>}
      <button type="submit" className="login-btn" disabled={loading}>
        {loading ? '…' : t.btn}
      </button>
      <div className="login-secondary-row">
        <button type="button" className="login-secondary-btn" onClick={onBack}>{t.back}</button>
      </div>
    </form>
  )
}

/* ─── Form Token (UUID condómino) ─── */
function FormToken({ lang, onBack }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [success, setSuccess] = useState(null)

  const t = lang === 'en' ? {
    subtitle: <>Enter the UUID token sent to you<br />by email.</>,
    label: 'Access token (UUID)',
    placeholder: '00000000-0000-0000-0000-000000000000',
    btn: 'Enter portal',
    back: '← Back',
  } : {
    subtitle: <>Introduza o token UUID que recebeu<br />por email.</>,
    label: 'Token de acesso (UUID)',
    placeholder: '00000000-0000-0000-0000-000000000000',
    btn: 'Entrar no portal',
    back: '← Voltar',
  }

  async function submit(e) {
    e.preventDefault()
    setErr(null); setSuccess(null)
    const clean = token.trim().toLowerCase()
    if (!UUID_RE.test(clean)) { setErr('UUID inválido. Formato: 00000000-0000-0000-0000-000000000000'); return }
    setLoading(true)
    const { data, error: rpcErr } = await v2Client.rpc('portal_token_login', { p_token: clean })
    setLoading(false)
    if (rpcErr) { setErr(rpcErr.message); return }
    if (!data || data.ok !== true) {
      const map = { token_not_found_or_inactive: 'Token não reconhecido ou inactivo.' }
      setErr(map[data?.error] || data?.error || 'Erro desconhecido.'); return
    }
    setSuccess(`Bem-vindo, ${data.nome ?? 'condómino'}. A redireccionar…`)
    localStorage.setItem('v2_portal_token', clean)
    localStorage.setItem('v2_portal_fracao_id', data.fracao_id ?? '')
    localStorage.setItem('v2_portal_condomino_id', data.condomino_id ?? '')
    localStorage.setItem('v2_portal_nome', data.nome ?? '')
    localStorage.setItem('v2_portal_email', data.email ?? '')
    setTimeout(() => { window.location.href = '/portal-condomino' }, 900)
  }

  return (
    <form onSubmit={submit}>
      <div className="login-subtitle">{t.subtitle}</div>
      <label className="login-label">{t.label}</label>
      <input
        type="text"
        className="login-input"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder={t.placeholder}
        required
        autoFocus
        style={{ fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}
      />
      {err && <div className="login-err">{err}</div>}
      {success && <div style={{
        padding: '10px 14px',
        background: 'rgba(63,185,80,0.10)',
        color: 'rgb(63,185,80)',
        border: '1px solid rgba(63,185,80,0.30)',
        borderRadius: 8,
        fontSize: 13,
        marginBottom: 14,
      }}>{success}</div>}
      <button type="submit" className="login-btn" disabled={loading}>
        {loading ? '…' : t.btn}
      </button>
      <div className="login-secondary-row">
        <button type="button" className="login-secondary-btn" onClick={onBack}>{t.back}</button>
      </div>
    </form>
  )
}
