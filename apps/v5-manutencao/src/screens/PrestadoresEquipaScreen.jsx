import React, { useState, useEffect } from 'react'
import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', gold:'#D4A72C', goldLt:'#FFF4D6' }

const CAT_LABEL = {
  limpeza:'Limpeza', manutencao:'Manutenção', canalizacao:'Canalização',
  eletrica:'Elétrica', pintura:'Pintura', jardim:'Jardim', piscina:'Piscina',
  obra:'Obra', pos_obra:'Pós-obra',
}

function Stars({ v }) {
  const n = Math.round(v || 0)
  return <span style={{ color:'#F59E0B', fontSize:12 }}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</span>
}

export default function PrestadoresEquipaScreen({ onBack, onNavigatePrestador }) {
  const [equipa,   setEquipa]   = useState(null)
  const [filtro,   setFiltro]   = useState('todos')

  useEffect(() => {
    supa.from('prestadores_equipa_cliente')
      .select('num_servicos_partilhados, favorito, ultima_interaccao, prestador:prestador_id(*)')
      .eq('pessoa_id', DEMO_PESSOA_ID)
      .order('num_servicos_partilhados', { ascending: false })
      .then(({ data }) => {
        setEquipa(data?.map(e => ({
          ...e.prestador,
          num_servicos_partilhados: e.num_servicos_partilhados,
          favorito: e.favorito,
          ultima_interaccao: e.ultima_interaccao,
        })) || [])
      })
  }, [])

  const lista = equipa === null ? [] : equipa.filter(p => {
    if (filtro === 'favoritos') return p.favorito
    return true
  })

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 24px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>A MINHA EQUIPA</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>👥 Os teus profissionais</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>
          {equipa === null ? '…' : `${equipa.length} prestadores que já trabalharam contigo`}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:'10px 14px', display:'flex', gap:8 }}>
        {['todos','favoritos'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding:'5px 14px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer',
            background: filtro === f ? G : C.bg,
            color: filtro === f ? '#fff' : C.stone,
            border: filtro === f ? 'none' : `1px solid ${C.border}`,
          }}>
            {f === 'todos' ? 'Todos' : '⭐ Favoritos'}
          </button>
        ))}
      </div>

      <div style={{ padding:'12px 14px 0' }}>

        {equipa === null ? (
          [0,1,2].map(i => (
            <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:10, height:100 }}/>
          ))
        ) : lista.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:C.slate }}>
            <div style={{ fontSize:36, marginBottom:10 }}>👥</div>
            <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>Nenhum prestador aqui</div>
            <div style={{ fontSize:12, marginTop:4 }}>Os técnicos que trabalham contigo aparecem aqui após o primeiro serviço.</div>
          </div>
        ) : lista.map(p => (
          <div
            key={p.id}
            onClick={() => onNavigatePrestador?.(p)}
            style={{
              background:C.white, border:`1px solid ${C.border}`, borderRadius:14,
              padding:'14px 16px', marginBottom:10, cursor:'pointer',
              display:'flex', alignItems:'center', gap:14,
            }}
          >
            {/* Avatar */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{
                width:52, height:52, borderRadius:'50%',
                background:`linear-gradient(135deg,${GL},${G})`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18, fontWeight:700, color:'#fff',
              }}>{p.iniciais}</div>
              {p.favorito && (
                <div style={{ position:'absolute', top:-4, right:-4, fontSize:14 }}>⭐</div>
              )}
              {p.verificado && (
                <div style={{ position:'absolute', bottom:-4, right:-4, width:18, height:18, borderRadius:'50%', background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', border:`2px solid ${C.white}` }}>✓</div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>{p.nome}</div>
              </div>
              <div style={{ fontSize:10, color:C.slate, marginBottom:4 }}>
                {(p.categorias || []).map(c => CAT_LABEL[c] || c).join(' · ')}
                {p.localizacao && ` · ${p.localizacao}`}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Stars v={p.rating_medio} />
                <span style={{ fontSize:10, color:C.slate }}>{p.rating_medio}</span>
                <span style={{ fontSize:10, color:C.slate }}>· {p.num_servicos_partilhados} contigo</span>
              </div>
              {p.especialidades?.length > 0 && (
                <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                  {p.especialidades.slice(0,2).map(e => (
                    <span key={e} style={{ fontSize:9, background:C.greenXl, color:G, padding:'2px 7px', borderRadius:8, fontWeight:600 }}>{e}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize:18, color:C.stone, flexShrink:0 }}>›</div>
          </div>
        ))}

        {/* Descobrir mais */}
        <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:14, padding:'20px 16px', textAlign:'center', marginTop:8 }}>
          <div style={{ fontSize:24, marginBottom:8 }}>🔍</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>Descobrir mais profissionais</div>
          <div style={{ fontSize:11, color:C.slate, marginBottom:12 }}>Catálogo de prestadores certificados</div>
          <button
            onClick={() => alert('Catálogo público — a implementar na Fase 5')}
            style={{ padding:'8px 18px', borderRadius:10, background:G, color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}
          >Ver catálogo →</button>
        </div>

      </div>
    </div>
  )
}
