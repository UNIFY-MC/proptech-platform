import React, { useState, useEffect, useCallback } from 'react'
import { supa } from '../supa.js'
import { useAuth } from '../lib/AuthContext.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', amber:'#854F0B', amberLt:'#FAEEDA', red:'#A32D2D', redSoft:'#FFEAEA' }

function labelMetodo(m) {
  if (m.tipo === 'cartao') return `💳 ${m.marca || 'Cartão'} •••• ${m.last4} · ${m.validade}`
  if (m.tipo === 'mbway')  return `📱 MB WAY · ${m.telefone}`
  if (m.tipo === 'sepa')   return `🏦 SEPA •••• ${m.iban_last4}`
  return m.tipo
}

export default function PagamentosScreen({ onBack }) {
  const { pessoa_id } = useAuth()
  const [metodos,  setMetodos]  = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supa
      .from('metodos_pagamento')
      .select('*')
      .eq('pessoa_id', pessoa_id)
      .order('principal', { ascending: false })
    setMetodos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function tornarPrincipal(id) {
    setMetodos(prev => prev.map(m => ({ ...m, principal: m.id === id })))
    await supa.from('metodos_pagamento').update({ principal: false }).eq('pessoa_id', pessoa_id)
    await supa.from('metodos_pagamento').update({ principal: true }).eq('id', id)
  }

  async function apagar(id) {
    if (!confirm('Apagar método de pagamento?')) return
    setMetodos(prev => prev.filter(m => m.id !== id))
    await supa.from('metodos_pagamento').delete().eq('id', id)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.slate, fontSize:13 }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>CONTA</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Métodos de pagamento</div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>
        {metodos.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>💳</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>Sem métodos de pagamento</div>
            <div style={{ fontSize:12, color:C.slate, marginTop:4 }}>Adiciona um cartão ou MB WAY para pagar serviços</div>
          </div>
        ) : metodos.map(m => (
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

        <button
          onClick={() => alert('Pagamentos reais activos na Fase 5 com Stripe.')}
          style={{
            width:'100%', padding:12, borderRadius:10, background:G, color:'#fff',
            border:'none', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:16,
          }}
        >+ Adicionar método</button>

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
