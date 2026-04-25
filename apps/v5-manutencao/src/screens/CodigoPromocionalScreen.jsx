import React, { useState } from 'react'
import { MOCK, codigoReferral } from '../data/mock.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            gold:'#D4A72C', goldLt:'#FFF4D6', line:'#E5E7EB', stone:'#6B7685',
            greenXl:'#D8F3DC', greenLt:'#52B788' }

export default function CodigoPromocionalScreen({ onBack }) {
  const p    = MOCK.pessoa
  const code = codigoReferral(p)
  const [input,    setInput]    = useState('')
  const [feedback, setFeedback] = useState(null)

  function aplicarCodigo() {
    if (!input.trim()) return
    if (input.trim().toUpperCase() === 'TESTE25') {
      setFeedback({ ok:true, msg:'✓ +25€ crédito aplicado ao próximo serviço!' })
    } else {
      setFeedback({ ok:false, msg:'Código inválido ou já utilizado.' })
    }
    // TODO(mario): validar código em BD (Fase 3.3.9)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>REWARDS</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Código promocional</div>
      </div>

      {/* Card código */}
      <div style={{ margin:'16px 16px 0', background:C.goldLt, border:`1px solid ${C.gold}44`, borderRadius:16, padding:'20px 16px', textAlign:'center' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:C.gold, marginBottom:8 }}>O TEU CÓDIGO PROMOCIONAL</div>
        <div style={{ fontSize:30, fontWeight:800, color:C.ink, letterSpacing:2, fontFamily:'Georgia,serif', marginBottom:16 }}>{code}</div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button
            onClick={() => { navigator.clipboard?.writeText(code); alert('Código copiado!') }}
            style={{ padding:'9px 18px', borderRadius:9, background:G, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}
          >📋 Copiar</button>
          <button
            onClick={() => { if (navigator.share) navigator.share({ title:'Código OSCAR', text:code }); else alert('Partilha não suportada neste browser.') }}
            style={{ padding:'9px 18px', borderRadius:9, background:C.white, color:G, border:`1px solid ${C.gold}`, fontSize:13, fontWeight:700, cursor:'pointer' }}
          >📤 Partilhar</button>
        </div>
      </div>

      {/* Introduzir código */}
      <div style={{ margin:'14px 16px 0', background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:10 }}>Introduzir código de amigo</div>
        <div style={{ display:'flex', gap:9 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Tens um código? Cola aqui..."
            style={{ flex:1, padding:'10px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }}
          />
          <button onClick={aplicarCodigo} style={{
            padding:'10px 16px', borderRadius:9, background:G, color:'#fff',
            border:'none', fontSize:13, fontWeight:700, cursor:'pointer',
          }}>Aplicar</button>
        </div>
        {feedback && (
          <div style={{
            marginTop:10, padding:'9px 12px', borderRadius:9, fontSize:12, fontWeight:600,
            background: feedback.ok ? C.greenXl : '#FFEAEA',
            color: feedback.ok ? G : '#A32D2D',
          }}>{feedback.msg}</div>
        )}
      </div>

      {/* Regras */}
      <div style={{ margin:'14px 16px 0', background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:10 }}>📋 Regras</div>
        {[
          'Ganha 25€ quando o teu amigo completa o primeiro serviço',
          'Sem limite de convites · acumula sem máximo',
          'Crédito aplicado automaticamente no próximo pedido',
          'Código válido até 31 Dezembro 2026',
        ].map((r,i) => (
          <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8 }}>
            <span style={{ color:C.greenLt, fontWeight:700, marginTop:1, flexShrink:0 }}>✓</span>
            <span style={{ fontSize:12, color:C.slate, lineHeight:1.45 }}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
