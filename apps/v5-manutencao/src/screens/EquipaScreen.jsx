import React, { useState, useEffect, useCallback } from 'react'
import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', gold:'#D4A72C', goldLt:'#FFF4D6' }

const CATS_FILTER = ['Todos','Canalização','Eléctrica','Limpeza','Manutenção','Pintura','Obras']

function Stars({ rating }) {
  const n = Math.round(rating || 0)
  return <span style={{ color:'#F59E0B', fontSize:12 }}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</span>
}

function iniciais(nome) {
  return (nome || '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function EquipaScreen({ onBack, onNavigatePrestador }) {
  const [favs,    setFavs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState('Todos')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supa
      .from('prestadores_favoritos')
      .select('id, total_visitas, total_gasto, rating_medio, is_principal, prestadores(id, nome, iniciais, categorias, rating_medio, num_servicos)')
      .eq('pessoa_id', DEMO_PESSOA_ID)
      .order('is_principal', { ascending: false })
    setFavs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const prestadores = favs.map(fav => ({
    _favId:       fav.id,
    id:           fav.prestadores?.id,
    nome:         fav.prestadores?.nome || 'Técnico',
    iniciais:     fav.prestadores?.iniciais || iniciais(fav.prestadores?.nome),
    categorias:   fav.prestadores?.categorias || [],
    rating:       fav.prestadores?.rating_medio ?? fav.rating_medio ?? 5.0,
    total_visitas:fav.total_visitas || 0,
    is_principal: fav.is_principal || false,
  }))

  const lista = prestadores.filter(p =>
    filtro === 'Todos' || p.categorias.includes(filtro)
  )
  const totalVisitas = prestadores.reduce((a, p) => a + p.total_visitas, 0)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.slate, fontSize:13 }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>OS MEUS TÉCNICOS</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>A minha equipa</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>
          {prestadores.length} prestadores · {totalVisitas} visitas completas
        </div>
      </div>

      <div style={{ padding:'12px 16px 0', display:'flex', gap:7, overflowX:'auto', scrollbarWidth:'none' }}>
        {CATS_FILTER.map(cat => (
          <button key={cat} onClick={() => setFiltro(cat)} style={{
            flexShrink:0, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            background: filtro === cat ? G : C.white,
            color: filtro === cat ? '#fff' : C.slate,
            border: `1px solid ${filtro === cat ? G : C.border}`,
          }}>{cat}</button>
        ))}
      </div>

      <div style={{ padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {lista.length === 0 ? (
          <div style={{ gridColumn:'1/-1', background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>
              {prestadores.length === 0 ? 'Ainda sem técnicos favoritos' : 'Sem prestadores nesta categoria'}
            </div>
            <div style={{ fontSize:12, color:C.slate, marginTop:4 }}>
              {prestadores.length === 0 ? 'Completa pedidos para construir a tua equipa' : ''}
            </div>
          </div>
        ) : lista.map(p => (
          <div key={p._favId} onClick={() => onNavigatePrestador?.(p)} style={{
            background:C.white, border:`1px solid ${C.border}`, borderRadius:14,
            padding:'14px 12px', cursor:'pointer', textAlign:'center',
            boxShadow:'0 1px 4px rgba(0,0,0,.06)',
          }}>
            {p.is_principal && (
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
              {(p.categorias || []).slice(0, 3).map(cat => (
                <span key={cat} style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:C.greenXl, color:G, fontWeight:600 }}>{cat}</span>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:8, fontSize:11 }}>
              <span><Stars rating={p.rating}/> {(p.rating || 0).toFixed(1)}</span>
              <span style={{ color:C.slate }}>· {p.total_visitas} visitas</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
