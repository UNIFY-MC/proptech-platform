import React, { useState, useEffect, useCallback } from 'react'
import { supa } from '../supa.js'
import { useAuth } from '../lib/AuthContext.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', gold:'#D4A72C', greenLt:'#52B788' }

function Stars({ n }) {
  return <span style={{ color:'#F59E0B', fontSize:14 }}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</span>
}

export default function AvaliacoesScreen({ onBack }) {
  const { pessoa_id } = useAuth()
  const [tabAtivo, setTab]     = useState('dei')
  const [dadas,    setDadas]   = useState([])
  const [loading,  setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supa
      .from('avaliacoes')
      .select('id, rating, texto, criado_em, servico_nome, prestadores(nome)')
      .eq('cliente_id', pessoa_id)
      .order('criado_em', { ascending: false })
    setDadas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const avaliacoes = tabAtivo === 'dei' ? dadas : []

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.slate, fontSize:13 }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>HISTÓRICO</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>As minhas avaliações</div>
      </div>

      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, display:'flex', padding:'0 16px' }}>
        {[{id:'dei',l:'Que dei'},{id:'recebi',l:'Que recebi'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'10px 4px', background:'none', border:'none', cursor:'pointer',
            fontSize:13, fontWeight: tabAtivo===t.id ? 700 : 500,
            color: tabAtivo===t.id ? G : C.slate,
            borderBottom: tabAtivo===t.id ? `2.5px solid ${G}` : '2.5px solid transparent',
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding:'14px 16px' }}>
        {avaliacoes.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⭐</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>
              {tabAtivo === 'recebi' ? 'Sem avaliações recebidas' : 'Sem avaliações'}
            </div>
            <div style={{ fontSize:12, color:C.slate, marginTop:4 }}>
              {tabAtivo === 'recebi' ? 'Avaliações de prestadores aparecem aqui' : 'As tuas avaliações aos técnicos aparecem aqui'}
            </div>
          </div>
        ) : avaliacoes.map(av => {
          const nomeP = av.prestadores?.nome || 'Técnico'
          const ini   = nomeP.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase()
          return (
            <div key={av.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:10 }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:10 }}>
                <div style={{
                  width:42, height:42, borderRadius:'50%', background:`linear-gradient(135deg,${G},${C.greenLt})`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:800, color:'#fff', flexShrink:0,
                }}>{ini}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>{nomeP}</div>
                  {av.servico_nome && <div style={{ fontSize:11, color:C.slate }}>{av.servico_nome}</div>}
                  <div style={{ marginTop:4 }}><Stars n={av.rating}/></div>
                </div>
                <div style={{ fontSize:11, color:C.slate, flexShrink:0 }}>
                  {new Date(av.criado_em).toLocaleDateString('pt-PT', { day:'2-digit', month:'short' })}
                </div>
              </div>
              {av.texto && (
                <div style={{ fontSize:13, color:C.ink, lineHeight:1.5, padding:'10px 12px', background:C.bg, borderRadius:9, marginBottom:10 }}>
                  "{av.texto}"
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => alert('Editar avaliação — disponível Fase 4')} style={{
                  flex:1, padding:'8px', borderRadius:8, background:C.bg,
                  border:`1px solid ${C.border}`, fontSize:12, fontWeight:600, color:C.slate, cursor:'pointer',
                }}>Editar</button>
                <button onClick={() => alert('Ver pedido — disponível em Pedidos')} style={{
                  flex:1, padding:'8px', borderRadius:8, background:C.bg,
                  border:`1px solid ${C.border}`, fontSize:12, fontWeight:600, color:C.slate, cursor:'pointer',
                }}>Ver pedido →</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
