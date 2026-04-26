import React, { useState, useEffect } from 'react'
import { supaCore, supa, SUPABASE_URL, SUPABASE_ANON_KEY } from '../supa.js'
import { useAuth } from '../lib/AuthContext.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = {
  ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
  line:'#E5E7EB', stone:'#6B7685', red:'#A32D2D', redSoft:'#FFEAEA',
  greenBg:'#D1FAE5', greenDk:'#065F46',
}

function Section({ label, children }) {
  return (
    <div style={{ margin:'0 16px 14px', background:C.white, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', fontSize:9, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', background:C.bg, borderBottom:`1px solid ${C.border}` }}>{label}</div>
      <div style={{ padding:'4px 0' }}>{children}</div>
    </div>
  )
}

function Row({ label, value, onAction, actionLabel = 'Mudar →', danger }) {
  return (
    <div style={{ padding:'13px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${C.line}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color: danger ? C.red : C.ink }}>{label}</div>
        {value && <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{value}</div>}
      </div>
      <button onClick={onAction} style={{ background: danger ? C.redSoft : C.bg, color: danger ? C.red : C.slate, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
        {actionLabel}
      </button>
    </div>
  )
}

function Toggle({ label, sub, value, onChange }) {
  return (
    <div style={{ padding:'13px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${C.line}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{sub}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{ width:44, height:24, borderRadius:12, cursor:'pointer', flexShrink:0, background: value ? G : C.border, position:'relative', transition:'background .2s' }}>
        <div style={{ position:'absolute', top:2, left: value ? 22 : 2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}/>
      </div>
    </div>
  )
}

function InputField({ label, type = 'text', value, onChange, placeholder, error }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:600, color:C.slate, marginBottom:5 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', boxSizing:'border-box',
          padding:'10px 12px', borderRadius:10, fontSize:14,
          border:`1.5px solid ${error ? C.red : C.border}`,
          background:C.bg, color:C.ink, outline:'none',
        }}
      />
      {error && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>{error}</div>}
    </div>
  )
}

function BottomModal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end' }}>
      <div style={{ width:'100%', background:C.white, borderRadius:'20px 20px 0 0', maxHeight:'90vh', overflow:'auto', paddingBottom:32 }}>
        <div style={{ padding:'20px 16px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, lineHeight:1, color:C.slate, cursor:'pointer', padding:'0 4px' }}>×</button>
        </div>
        <div style={{ padding:'16px 16px 0' }}>{children}</div>
      </div>
    </div>
  )
}

function EmailModal({ emailAtual, onClose, onPending }) {
  const [novoEmail, setNovoEmail] = useState('')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')
  const [done, setDone]           = useState(false)

  async function handleSubmit() {
    setErr('')
    const em = novoEmail.trim().toLowerCase()
    if (!em || !em.includes('@') || !em.includes('.')) { setErr('Email inválido.'); return }
    if (em === emailAtual?.toLowerCase()) { setErr('É o mesmo email actual.'); return }
    setSaving(true)
    const { error } = await supa.auth.updateUser({ email: em })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setDone(true)
    setTimeout(() => { onPending(em); onClose() }, 2000)
  }

  return (
    <BottomModal title="Alterar email" onClose={onClose}>
      {done ? (
        <div style={{ textAlign:'center', padding:'24px 0 16px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📧</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:8 }}>Confirmação enviada</div>
          <div style={{ fontSize:13, color:C.slate, lineHeight:1.5 }}>
            Abre o email que enviámos para <strong>{novoEmail.trim()}</strong> e clica no link para completar a alteração.
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize:12, color:C.slate, marginBottom:16 }}>
            Email actual: <strong>{emailAtual || '—'}</strong>
          </div>
          <InputField label="Novo email" type="email" value={novoEmail} onChange={setNovoEmail} placeholder="novo@email.com" error={err} />
          <button
            onClick={handleSubmit}
            disabled={saving || !novoEmail.trim()}
            style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              cursor: saving || !novoEmail.trim() ? 'not-allowed' : 'pointer',
              background: saving || !novoEmail.trim() ? C.border : G,
              color: saving || !novoEmail.trim() ? C.slate : '#fff',
              fontSize:15, fontWeight:700, marginTop:4,
            }}
          >{saving ? 'A enviar...' : 'Enviar confirmação'}</button>
        </>
      )}
    </BottomModal>
  )
}

function PasswordModal({ onClose }) {
  const [novaPass, setNovaPass]   = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')
  const [done, setDone]           = useState(false)

  async function handleSubmit() {
    setErr('')
    if (novaPass.length < 8) { setErr('A password deve ter pelo menos 8 caracteres.'); return }
    if (novaPass !== confirmar) { setErr('As passwords não coincidem.'); return }
    setSaving(true)
    const { error } = await supa.auth.updateUser({ password: novaPass })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setDone(true)
    setTimeout(onClose, 2000)
  }

  return (
    <BottomModal title="Alterar palavra-passe" onClose={onClose}>
      {done ? (
        <div style={{ textAlign:'center', padding:'24px 0 16px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>Palavra-passe alterada com sucesso</div>
        </div>
      ) : (
        <>
          <InputField label="Nova palavra-passe" type="password" value={novaPass} onChange={setNovaPass} placeholder="Mínimo 8 caracteres" />
          <InputField label="Confirmar palavra-passe" type="password" value={confirmar} onChange={setConfirmar} placeholder="Repetir nova palavra-passe" error={err} />
          <button
            onClick={handleSubmit}
            disabled={saving || !novaPass || !confirmar}
            style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              cursor: saving || !novaPass || !confirmar ? 'not-allowed' : 'pointer',
              background: saving || !novaPass || !confirmar ? C.border : G,
              color: saving || !novaPass || !confirmar ? C.slate : '#fff',
              fontSize:15, fontWeight:700, marginTop:4,
            }}
          >{saving ? 'A guardar...' : 'Guardar nova password'}</button>
        </>
      )}
    </BottomModal>
  )
}

export default function LoginSegurancaScreen({ onBack }) {
  const { pessoa_id } = useAuth()
  const [pessoa, setPessoa]               = useState(null)
  const [twoFA, setTwoFA]                 = useState(false)
  const [loading, setLoading]             = useState(true)
  const [showEmailModal, setShowEmailModal]       = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal]     = useState(false)
  const [emailPendente, setEmailPendente] = useState(null)

  useEffect(() => {
    let active = true
    supaCore.from('pessoas').select('email, telemovel, metadata').eq('id', pessoa_id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (!error && data) {
          setPessoa(data)
          setTwoFA(data.metadata?.dois_fatores ?? false)
          if (data.metadata?.email_pendente) setEmailPendente(data.metadata.email_pendente)
        }
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function toggle2FA(val) {
    setTwoFA(val)
    const metaAtual = pessoa?.metadata || {}
    await supaCore.from('pessoas').update({ metadata: { ...metaAtual, dois_fatores: val } }).eq('id', pessoa_id)
  }

  async function handleEmailPending(novoEmail) {
    setEmailPendente(novoEmail)
    const metaAtual = pessoa?.metadata || {}
    await supaCore.from('pessoas').update({ metadata: { ...metaAtual, email_pendente: novoEmail } }).eq('id', pessoa_id)
  }

  const emailDisplay = loading ? '...' : (pessoa?.email || '—')
  const telDisplay   = loading ? '...' : (pessoa?.telemovel || '—')

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>SEGURANÇA</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Login & segurança</div>
      </div>

      {emailPendente && (
        <div style={{ margin:'16px 16px 0', background:C.greenBg, border:'1px solid #A7F3D0', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.greenDk }}>📧 Confirmação pendente</div>
          <div style={{ fontSize:11, color:C.greenDk, marginTop:3, lineHeight:1.5 }}>
            Enviámos confirmação para <strong>{emailPendente}</strong>. Clica no link para completar.
          </div>
        </div>
      )}

      <div style={{ height:16 }}/>

      <Section label="Email">
        <Row label="Endereço de email" value={emailDisplay} onAction={() => setShowEmailModal(true)} />
      </Section>

      <Section label="Telemóvel">
        <Row label="Número de telemóvel" value={telDisplay} onAction={() => alert('Alteração de telemóvel via SMS disponível em breve.')} />
      </Section>

      <Section label="Password">
        <Row label="Palavra-passe" value="••••••••" onAction={() => setShowPasswordModal(true)} actionLabel="Alterar →" />
      </Section>

      <Section label="Autenticação 2 Factores">
        <Toggle
          label="Verificação em 2 passos"
          sub="Recebe um código por SMS em cada login"
          value={twoFA}
          onChange={toggle2FA}
        />
      </Section>

      <Section label="Sessões activas">
        <div style={{ padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>📱</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>Este dispositivo</div>
            <div style={{ fontSize:11, color:C.slate, marginTop:1 }}>Sessão actual</div>
          </div>
          <span style={{ fontSize:10, background:'#D8F3DC', color:G, padding:'2px 8px', borderRadius:5, fontWeight:700 }}>ESTA</span>
        </div>
        <div style={{ padding:'8px 16px 12px' }}>
          <div style={{ fontSize:11, color:C.slate }}>Histórico de sessões disponível em breve.</div>
        </div>
      </Section>

      <Section label="Zona perigosa">
        <div style={{ padding:'4px 0 4px' }}>
          <Row
            label="Eliminar conta permanentemente"
            danger
            onAction={() => setShowDeleteModal(true)}
            actionLabel="Eliminar"
          />
        </div>
      </Section>

      {showEmailModal && (
        <EmailModal
          emailAtual={pessoa?.email || ''}
          onClose={() => setShowEmailModal(false)}
          onPending={handleEmailPending}
        />
      )}

      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  )
}

function DeleteAccountModal({ onClose }) {
  const { signOut } = useAuth()
  const [confirmado, setConfirmado] = useState(false)
  const [password,   setPassword]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState('')
  const [done,       setDone]       = useState(false)

  async function handleDelete() {
    setErr('')
    if (!confirmado) { setErr('Confirma que compreendes a acção.'); return }
    if (!password)   { setErr('Introduz a tua palavra-passe para confirmar.'); return }
    setSaving(true)
    try {
      const { data: { session } } = await supa.auth.getSession()
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ password }),
        }
      )
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setErr(json.error || 'Erro desconhecido. Tenta novamente.')
        setSaving(false)
        return
      }
      setDone(true)
      setTimeout(async () => {
        await signOut()
      }, 2500)
    } catch {
      setErr('Erro de rede. Tenta novamente.')
      setSaving(false)
    }
  }

  return (
    <BottomModal title="Eliminar conta" onClose={done ? undefined : onClose}>
      {done ? (
        <div style={{ textAlign:'center', padding:'24px 0 16px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👋</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:8 }}>Conta eliminada</div>
          <div style={{ fontSize:13, color:C.slate }}>Os teus dados foram anonimizados. A redirecionar…</div>
        </div>
      ) : (
        <>
          <div style={{ background:C.redSoft, border:`1px solid ${C.red}33`, borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.red, marginBottom:4 }}>⚠️ Acção irreversível</div>
            <div style={{ fontSize:12, color:C.red, lineHeight:1.5 }}>
              Os teus dados pessoais serão anonimizados. As tuas ordens de trabalho são preservadas por obrigação fiscal (AT, 10 anos).
            </div>
          </div>

          <label style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16, cursor:'pointer' }}>
            <input
              type="checkbox"
              checked={confirmado}
              onChange={e => setConfirmado(e.target.checked)}
              style={{ marginTop:2, width:16, height:16, flexShrink:0 }}
            />
            <span style={{ fontSize:13, color:C.ink, lineHeight:1.4 }}>
              Compreendo que esta acção é irreversível e que os meus dados serão apagados permanentemente.
            </span>
          </label>

          <InputField
            label="Confirma com a tua palavra-passe"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="A tua palavra-passe actual"
            error={err}
          />

          <button
            onClick={handleDelete}
            disabled={saving || !confirmado || !password}
            style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              cursor: saving || !confirmado || !password ? 'not-allowed' : 'pointer',
              background: saving || !confirmado || !password ? C.border : C.red,
              color: saving || !confirmado || !password ? C.slate : '#fff',
              fontSize:15, fontWeight:700, marginTop:4,
            }}
          >{saving ? 'A eliminar...' : 'Eliminar conta definitivamente'}</button>
        </>
      )}
    </BottomModal>
  )
}
