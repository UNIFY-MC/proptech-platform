import React, { useState } from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC' }

const FILTROS = ['Tudo','Mais contratados','Mais recentes','Preço ↓']

const SERVICOS_MOCK = [
  { id:'s1', emoji:'✨', nome:'Limpeza manutenção apartamento T2',   duracao:'3h',   preco:'42€',  rating:4.8, contratacoes:234 },
  { id:'s2', emoji:'✨', nome:'Limpeza geral apartamento T3',         duracao:'4.5h', preco:'58€',  rating:4.9, contratacoes:189 },
  { id:'s3', emoji:'✨', nome:'Limpeza após obras',                   duracao:'6h',   preco:'120€', rating:4.7, contratacoes:97  },
  { id:'s4', emoji:'✨', nome:'Limpeza profunda casa',                duracao:'5h',   preco:'85€',  rating:4.9, contratacoes:312 },
  { id:'s5', emoji:'✨', nome:'Limpeza escritório (até 100m²)',       duracao:'4h',   preco:'75€',  rating:4.8, contratacoes:143 },
]

export default function CategoriaScreen({ categoria, onBack, onNavigateServico }) {
  const [filtro, setFiltro] = useState('Tudo')
  const cat = categoria || { emoji:'✨', nome:'Limpeza', id:'limpeza' }

  const lista = [...SERVICOS_MOCK].sort((a,b) => {
    if (filtro === 'Mais contratados') return b.contratacoes - a.contratacoes
    if (filtro === 'Preço ↓') return parseFloat(a.preco) - parseFloat(b.preco)
    return 0
  })

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:36 }}>{cat.emoji}</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>{(cat.id || '').toUpperCase()}</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>{cat.nome}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:3 }}>{lista.length} serviços disponíveis</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
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
        {lista.map(s => (
          <div
            key={s.id}
            onClick={() => onNavigateServico?.(s)}
            style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:10, cursor:'pointer', display:'flex', gap:12 }}
          >
            <span style={{ fontSize:28, flexShrink:0 }}>{s.emoji}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>{s.nome}</div>
              <div style={{ display:'flex', gap:10, fontSize:11, color:C.slate }}>
                <span>⏱ {s.duracao}</span>
                <span>⭐ {s.rating}</span>
                <span>{s.contratacoes} pedidos</span>
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:G }}>{s.preco}</div>
              <div style={{ fontSize:10, color:C.slate, marginTop:2 }}>+ IVA</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
