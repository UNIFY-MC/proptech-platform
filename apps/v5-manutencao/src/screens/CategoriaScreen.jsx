import React, { useState, useEffect, useCallback } from 'react'
import { supa } from '../supa.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC' }

const FILTROS = ['Tudo','Mais populares','Preço ↓','Preço ↑']

const CAT_EMOJI = {
  limpeza:'✨', manutencao:'🔧', canalizacao:'💧', eletrica:'⚡',
  pintura:'🖌️', jardim:'🌿', piscina:'🏊', pos_obra:'🏗️',
}

function precoFmt(preco) {
  if (!preco) return '—'
  return `${Number(preco).toFixed(0)}€`
}

export default function CategoriaScreen({ categoria, onBack, onNavigateServico }) {
  const [servicos, setServicos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState('Tudo')

  const cat = categoria || { id:'', nome:'Serviços', emoji:'🔧' }

  const fetchData = useCallback(async () => {
    if (!cat.id) { setLoading(false); return }
    setLoading(true)
    // Try subcategoria first, then categoria
    let { data } = await supa
      .from('servicos')
      .select('id, nome, preco, duracao_tipica, popular, icon, categoria_id, subcategoria_id')
      .eq('activo', true)
      .is('servico_pai_id', null)
      .eq('subcategoria_id', cat.id)
      .order('popular', { ascending: false })
      .order('ordem', { ascending: true })
    if (!data || data.length === 0) {
      const res = await supa
        .from('servicos')
        .select('id, nome, preco, duracao_tipica, popular, icon, categoria_id, subcategoria_id')
        .eq('activo', true)
        .is('servico_pai_id', null)
        .eq('categoria_id', cat.id)
        .order('popular', { ascending: false })
        .order('ordem', { ascending: true })
      data = res.data
    }
    setServicos(data || [])
    setLoading(false)
  }, [cat.id])

  useEffect(() => { fetchData() }, [fetchData])

  const sorted = [...servicos].sort((a, b) => {
    if (filtro === 'Mais populares') return (b.popular ? 1 : 0) - (a.popular ? 1 : 0)
    if (filtro === 'Preço ↓') return (a.preco || 0) - (b.preco || 0)
    if (filtro === 'Preço ↑') return (b.preco || 0) - (a.preco || 0)
    return 0
  })

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:36 }}>{cat.emoji || CAT_EMOJI[cat.id] || '🔧'}</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>{(cat.id || '').toUpperCase()}</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>{cat.nome}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:3 }}>
              {loading ? '...' : `${sorted.length} serviços disponíveis`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'12px 16px 0', display:'flex', gap:7, overflowX:'auto', scrollbarWidth:'none' }}>
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            flexShrink:0, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            background: filtro===f ? G : C.white, color: filtro===f ? '#fff' : C.slate,
            border:`1px solid ${filtro===f ? G : C.border}`,
          }}>{f}</button>
        ))}
      </div>

      <div style={{ padding:'12px 16px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:32, color:C.slate, fontSize:13 }}>A carregar...</div>
        ) : sorted.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center' }}>
            <div style={{ fontSize:13, color:C.slate }}>Sem serviços nesta categoria</div>
          </div>
        ) : sorted.map(s => {
          const emoji = s.icon || CAT_EMOJI[s.categoria_id] || '🔧'
          return (
            <div
              key={s.id}
              onClick={() => onNavigateServico?.(s)}
              style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:10, cursor:'pointer', display:'flex', gap:12 }}
            >
              <span style={{ fontSize:28, flexShrink:0 }}>{emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>{s.nome}</div>
                <div style={{ display:'flex', gap:10, fontSize:11, color:C.slate }}>
                  {s.duracao_tipica && <span>⏱ {s.duracao_tipica}</span>}
                  {s.popular && <span style={{ color:G, fontWeight:700 }}>⭐</span>}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:16, fontWeight:700, color:G }}>{precoFmt(s.preco)}</div>
                <div style={{ fontSize:10, color:C.slate, marginTop:2 }}>+ IVA</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
