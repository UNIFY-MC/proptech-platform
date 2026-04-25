import React, { useState, useEffect } from 'react'
import { supaCore } from '../supa.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', red:'#A32D2D', redSoft:'#FFEAEA' }

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

export default function LoginSegurancaScreen({ onBack }) {
  const [pessoa, setPessoa] = useState(null)
  const [twoFA, setTwoFA]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supaCore.from('pessoas').select('email, telemovel, metadata').eq('id', DEMO_PESSOA_ID).single()
      .then(({ data, error }) => {
        if (!active) return
        if (!error && data) {
          setPessoa(data)
          setTwoFA(data.metadata?.dois_fatores ?? false)
        }
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function toggle2FA(val) {
    setTwoFA(val)
    const metaAtual = pessoa?.metadata || {}
    await supaCore.from('pessoas').update({ metadata: { ...metaAtual, dois_fatores: val } }).eq('id', DEMO_PESSOA_ID)
  }

  const emailDisplay  = loading ? '...' : (pessoa?.email  || '—')
  const telDisplay    = loading ? '...' : (pessoa?.telemovel || '—')

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>SEGURANÇA</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Login & segurança</div>
      </div>

      <div style={{ height:16 }}/>

      <Section label="Email">
        <Row label="Endereço de email" value={emailDisplay} onAction={() => alert('Alterar email disponível na Fase 4 com auth real.\n// TODO(mario): re-verify')} />
      </Section>

      <Section label="Telemóvel">
        <Row label="Número de telemóvel" value={telDisplay} onAction={() => alert('Alterar telemóvel disponível na Fase 4 com auth real.\n// TODO(mario): re-verify')} />
      </Section>

      <Section label="Password">
        <Row label="Palavra-passe" value="Última alteração: nunca" onAction={() => alert('Redefinição de password disponível na Fase 4 com auth real.\n// TODO(mario)')} actionLabel="Alterar →" />
      </Section>

      <Section label="Autenticação 2 Factores">
        <Toggle
          label="Verificação em 2 passos"
          sub="Recebe um código por SMS em cada login"
          value={twoFA}
          onChange={toggle2FA}
        />
      </Section>

      {/* TODO(mario): tabela sessoes — implementar Fase 4 com auth real */}
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
          <div style={{ fontSize:11, color:C.slate }}>Histórico de sessões disponível na Fase 4 com autenticação real.</div>
        </div>
      </Section>

      <Section label="Zona perigosa">
        <div style={{ padding:'4px 0 4px' }}>
          <Row label="Eliminar conta permanentemente" danger onAction={() => alert('Para eliminar a tua conta contacta suporte@exemplo.pt.\n// TODO(mario): email real Fase 4')} actionLabel="Eliminar" />
        </div>
      </Section>
    </div>
  )
}
