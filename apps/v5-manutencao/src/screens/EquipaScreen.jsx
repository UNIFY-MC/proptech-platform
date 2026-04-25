import React, { useState } from 'react'
import { MOCK } from '../data/mock.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', gold:'#D4A72C', goldLt:'#FFF4D6' }

const CATS_FILTER = ['Todos','Canalização','Eléctrica','Limpeza','Manutenção','Pintura','Obras']

function Stars({ rating }) {
  return <span style={{ color:'#F59E0B', fontSize:12 }}>{'★'.repeat(Math.round(rating))}{'☆'.repeat(5-Math.round(rating))}</span>
}

export default function EquipaScreen({ onBack, onNavigatePrestador }) {
  const [filtro, setFiltro] = useState('Todos')
  const lista = MOCK.prestadores_favoritos.filter(p =>
    filtro === 'Todos' || p.categorias.some(c => c === filtro)
  )
  const totalVisitas = MOCK.prestadores_favoritos.reduce((a,p) => a + p.total_visitas, 0)

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>OS MEUS TÉCNICOS</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>A minha equipa</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>
          {MOCK.prestadores_favoritos.length} prestadores · {totalVisitas} visitas completas
        </div>
      </div>

      {/* Filtros */}
      <div style={{ padding:'12px 16px 0', display:'flex', gap:7, overflowX:'auto', scrollbarWidth:'none' }}>
        {CATS_FILTER.map(cat => (
          <button
            key={cat}
            onClick={() => setFiltro(cat)}
            style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
              background: filtro === cat ? G : C.white,
              color: filtro === cat ? '#fff' : C.slate,
              border: `1px solid ${filtro === cat ? G : C.border}`,
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {lista.length === 0 ? (
          <div style={{ gridColumn:'1/-1', background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'28px 16px', textAlign:'center' }}>
            <div style={{ fontSize:13, color:C.slate }}>Sem prestadores nesta categoria</div>
          </div>
        ) : lista.map(p => (
          <div
            key={p.id}
            onClick={() => onNavigatePrestador?.(p)}
            style={{
              background:C.white, border:`1px solid ${C.border}`, borderRadius:14,
              padding:'14px 12px', cursor:'pointer', textAlign:'center',
              boxShadow:'0 1px 4px rgba(0,0,0,.06)',
            }}
          >
            {p.principal && (
              <div style={{ fontSize:9, background:C.goldLt, color:C.gold, fontWeight:700, padding:'1px 6px', borderRadius:4, marginBottom:8, display:'inline-block' }}>🏆 FAVORITO</div>
            )}
            <div style={{
              width:50, height:50, borderRadius:'50%', margin:'0 auto 10px',
              background:`linear-gradient(135deg,${G},${GL})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, fontWeight:800, color:'#fff',
            }}>{p.iniciais}</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>{p.nome}</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'center', marginBottom:8 }}>
              {p.categorias.map(cat => (
                <span key={cat} style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:C.greenXl, color:G, fontWeight:600 }}>{cat}</span>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:8, fontSize:11 }}>
              <span><Stars rating={p.rating}/> {p.rating}</span>
              <span style={{ color:C.slate }}>· {p.total_visitas} visitas</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
