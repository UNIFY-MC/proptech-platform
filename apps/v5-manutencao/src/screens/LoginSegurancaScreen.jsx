import React, { useState } from 'react'
import { MOCK } from '../data/mock.js'

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

function Row({ label, value, onAction, actionLabel='Mudar →', danger }) {
  return (
    <div style={{ padding:'13px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${C.line}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color: danger ? C.red : C.ink }}>{label}</div>
        {value && <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{value}</div>}
      </div>
      <button onClick={onAction} style={{
        background: danger ? C.redSoft : C.bg, color: danger ? C.red : C.slate,
        border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px',
        fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0,
      }}>{actionLabel}</button>
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
      <div
        onClick={() => onChange(!value)}
        style={{
          width:44, height:24, borderRadius:12, cursor:'pointer', flexShrink:0,
          background: value ? G : C.border, position:'relative', transition:'background .2s',
        }}
      >
        <div style={{
          position:'absolute', top:2, left: value ? 22 : 2, width:20, height:20,
          borderRadius:'50%', background:'#fff', transition:'left .2s',
          boxShadow:'0 1px 4px rgba(0,0,0,.2)',
        }}/>
      </div>
    </div>
  )
}

const SESSOES = [
  { dispositivo:'iPhone Safari', local:'Coimbra', estado:'Activa agora',  ic:'📱' },
  { dispositivo:'Chrome Windows', local:'Lisboa', estado:'há 3 dias',     ic:'💻' },
  { dispositivo:'Firefox macOS',  local:'Porto',  estado:'há 12 dias',    ic:'🖥️' },
]

export default function LoginSegurancaScreen({ onBack }) {
  const p = MOCK.pessoa
  const [twoFA, setTwoFA] = useState(false)

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>SEGURANÇA</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Login & segurança</div>
      </div>

      <div style={{ height:16 }}/>

      <Section label="Email">
        <Row label="Endereço de email" value={p.email} onAction={() => alert('Alterar email — disponível Fase 3.3.9')} />
      </Section>

      <Section label="Telemóvel">
        <Row label="Número de telemóvel" value={p.telefone} onAction={() => alert('Alterar telemóvel — disponível Fase 3.3.9')} />
      </Section>

      <Section label="Password">
        <Row label="Palavra-passe" value="Última alteração: nunca" onAction={() => alert('Email de redefinição enviado (mock).')} actionLabel="Alterar →" />
      </Section>

      <Section label="Autenticação 2 Factores">
        <Toggle
          label="Verificação em 2 passos"
          sub="Recebe um código por SMS em cada login"
          value={twoFA}
          onChange={setTwoFA}
        />
      </Section>

      <Section label="Sessões activas">
        {SESSOES.map((s, i) => (
          <div key={i} style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, borderBottom: i < SESSOES.length-1 ? `1px solid ${C.line}` : 'none' }}>
            <span style={{ fontSize:22 }}>{s.ic}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{s.dispositivo}</div>
              <div style={{ fontSize:11, color:C.slate, marginTop:1 }}>{s.local} · {s.estado}</div>
            </div>
            {s.estado !== 'Activa agora' && (
              <button onClick={() => alert('Sessão terminada (mock).')} style={{
                background:C.bg, border:`1px solid ${C.border}`, borderRadius:8,
                padding:'5px 10px', fontSize:11, fontWeight:600, color:C.slate, cursor:'pointer',
              }}>Terminar</button>
            )}
            {s.estado === 'Activa agora' && (
              <span style={{ fontSize:10, background:'#D8F3DC', color:G, padding:'2px 8px', borderRadius:5, fontWeight:700 }}>ESTA</span>
            )}
          </div>
        ))}
      </Section>

      <Section label="Zona perigosa">
        <div style={{ padding:'4px 0 4px' }}>
          <Row label="Eliminar conta permanentemente" danger onAction={() => alert('Para eliminar a tua conta contacta suporte@oscar.app.')} actionLabel="Eliminar" />
        </div>
      </Section>
    </div>
  )
}
