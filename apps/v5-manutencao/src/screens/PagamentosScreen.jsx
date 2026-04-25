import React, { useState } from 'react'
import { MOCK } from '../data/mock.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', amber:'#854F0B', amberLt:'#FAEEDA', red:'#A32D2D', redSoft:'#FFEAEA' }

export default function PagamentosScreen({ onBack }) {
  const [metodos, setMetodos] = useState(MOCK.metodos_pagamento)

  function tornarPrincipal(id) {
    setMetodos(prev => prev.map(m => ({ ...m, principal: m.id === id })))
    // TODO(mario): actualizar em BD (Fase 3.3.9)
  }

  function apagar(id) {
    if (!confirm('Apagar método de pagamento?')) return
    setMetodos(prev => prev.filter(m => m.id !== id))
    // TODO(mario): DELETE em BD (Fase 3.3.9)
  }

  function labelMetodo(m) {
    if (m.tipo === 'cartao') return `💳 ${m.marca} •••• ${m.last4} · ${m.validade}`
    if (m.tipo === 'mbway')  return `📱 MB WAY · ${m.telefone}`
    return m.tipo
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>CONTA</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Métodos de pagamento</div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>
        {metodos.map(m => (
          <div key={m.id} style={{
            background:C.white, border: m.principal ? `2px solid ${GL}` : `1px solid ${C.border}`,
            borderRadius:14, padding:'14px 16px', marginBottom:10,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: m.principal ? 8 : 12 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>{labelMetodo(m)}</div>
              {m.principal && (
                <span style={{ fontSize:9, background:C.greenXl, color:G, padding:'2px 8px', borderRadius:4, fontWeight:700 }}>PRINCIPAL</span>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {!m.principal && (
                <button onClick={() => tornarPrincipal(m.id)} style={{
                  flex:1, padding:'8px', borderRadius:8, background:C.greenXl,
                  border:`1px solid ${GL}`, fontSize:12, fontWeight:600, color:G, cursor:'pointer',
                }}>Tornar principal</button>
              )}
              <button onClick={() => apagar(m.id)} style={{
                padding:'8px 14px', borderRadius:8, background:C.redSoft,
                border:'none', fontSize:12, fontWeight:600, color:C.red, cursor:'pointer',
              }}>Apagar</button>
            </div>
          </div>
        ))}

        {/* Adicionar */}
        <button
          onClick={() => alert('Pagamentos reais activos na Fase 5 com Stripe.')}
          style={{
            width:'100%', padding:12, borderRadius:10, background:G, color:'#fff',
            border:'none', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:16,
          }}
        >+ Adicionar método</button>

        {/* Footer info */}
        <div style={{ background:C.amberLt, border:`1px solid #F0CC5A`, borderRadius:12, padding:'12px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:16 }}>🔒</span>
          <div style={{ fontSize:11, color:C.amber, lineHeight:1.45 }}>
            <b>Pagamentos seguros via Stripe.</b> Os teus dados financeiros nunca são armazenados nos nossos servidores. Disponível na Fase 5.
          </div>
        </div>
      </div>
    </div>
  )
}
