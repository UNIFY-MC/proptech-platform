import React, { useState, useEffect, useCallback } from 'react'
import { supaPublic } from '../supa.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', gold:'#D4A72C', goldLt:'#FFF4D6', greenXl:'#D8F3DC' }

const medalha = { 1:'🥇', 2:'🥈', 3:'🥉' }

const CAT_EMOJI = {
  limpeza:'✨', manutencao:'🔧', canalizacao:'💧', eletrica:'⚡',
  pintura:'🖌️', jardim:'🌿', piscina:'🏊', pos_obra:'🏗️',
}

function precoFmt(preco) {
  if (!preco) return '—'
  return `${Number(preco).toFixed(0)}€`
}

export default function MaisContratadosScreen({ onBack, onNavigateServico }) {
  const [servicos, setServicos] = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supaPublic
      .from('servicos')
      .select('id, nome, preco_base, duracao_tipica, popular, categoria_id')
      .eq('activo', true)
      .is('servico_pai_id', null)
      .order('popular', { ascending: false })
      .order('ordem', { ascending: true })
      .limit(20)
    setServicos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.slate, fontSize:13 }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>CATÁLOGO</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>⭐ Mais contratados</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>Top {servicos.length} · baseado em popularidade</div>
      </div>

      <div style={{ padding:'12px 16px' }}>
        {servicos.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center' }}>
            <div style={{ fontSize:13, color:C.slate }}>Sem serviços disponíveis</div>
          </div>
        ) : servicos.map((s, idx) => {
          const rank  = idx + 1
          const emoji = CAT_EMOJI[s.categoria_id] || '🔧'
          return (
            <div
              key={s.id}
              onClick={() => onNavigateServico?.(s)}
              style={{
                background:C.white, border:`1px solid ${C.border}`, borderRadius:12,
                padding:'12px 14px', marginBottom:8, cursor:'pointer',
                display:'flex', alignItems:'center', gap:12,
              }}
            >
              <div style={{ width:30, textAlign:'center', flexShrink:0 }}>
                {medalha[rank]
                  ? <span style={{ fontSize:18 }}>{medalha[rank]}</span>
                  : <span style={{ fontSize:14, fontWeight:800, color:C.slate }}>#{rank}</span>
                }
              </div>
              <span style={{ fontSize:22, flexShrink:0 }}>{emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.ink, lineHeight:1.3 }}>{s.nome}</div>
                <div style={{ display:'flex', gap:8, fontSize:10, color:C.slate, marginTop:3 }}>
                  {s.duracao_tipica && <span>⏱ {s.duracao_tipica}</span>}
                  {s.popular && <span style={{ color:G, fontWeight:700 }}>⭐ Popular</span>}
                  {s.urgent  && <span style={{ color:'#E76F51', fontWeight:700 }}>⚡ Urgente</span>}
                </div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:G, flexShrink:0 }}>{precoFmt(s.preco_base)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
