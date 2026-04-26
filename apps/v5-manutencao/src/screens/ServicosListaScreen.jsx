import React, { useState, useEffect } from 'react'
import { supaPublic } from '../supa.js'
import ImagemServico from '../components/ImagemServico.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff' }

const SUBTITULOS = {
  populares: 'Top contratados pelos nossos clientes',
  recentes:  'Recém adicionados ao catálogo',
  todos:     'Catálogo completo de serviços',
}

export default function ServicosListaScreen({ filtro = 'populares', titulo = 'Mais contratados', onBack, onNavigateServico }) {
  const [servicos, setServicos] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        let q = supaPublic.from('servicos').select('id,nome,preco,categoria_id,sub_grupo,tagline,duracao_tipica,imagem_url').eq('activo', true)
        if (filtro === 'populares') q = q.eq('popular', true).order('preco', { ascending: false }).limit(50)
        else if (filtro === 'recentes') q = q.order('created_at', { ascending: false }).limit(40)
        else q = q.order('nome', { ascending: true })
        const { data, error } = await q
        if (cancelled) return
        if (error) { console.warn('[ServicosLista] query error:', error.message); setServicos([]); }
        else setServicos(data || [])
      } catch (e) {
        if (!cancelled) { console.warn('[ServicosLista] fetch failed:', e); setServicos([]) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [filtro])

  const sub = SUBTITULOS[filtro] || titulo

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>
      <div style={{ background:`linear-gradient(135deg,${G},${GM})`, padding:'14px 14px 18px', color:'#fff' }}>
        <div onClick={onBack} style={{ fontSize:11, opacity:.8, cursor:'pointer', marginBottom:8 }}>← Voltar</div>
        <div style={{ fontSize:9, color:'rgba(255,255,255,.7)', fontWeight:700, letterSpacing:.6, marginBottom:4 }}>CATÁLOGO</div>
        <div style={{ fontSize:21, fontWeight:700, fontFamily:'Georgia,serif', marginBottom:5 }}>⭐ {titulo}</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.8)' }}>
          {sub}{!loading && ` · ${servicos.length} serviços`}
        </div>
      </div>

      {loading && (
        <div style={{ padding:'40px 14px', textAlign:'center', fontSize:12, color:'#999' }}>
          A carregar...
        </div>
      )}

      {!loading && servicos.length === 0 && (
        <div style={{ padding:'40px 20px', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:10, opacity:.4 }}>📭</div>
          <div style={{ fontSize:13, color:'#666', marginBottom:14 }}>A actualizar o catálogo · volta em breve</div>
          <button onClick={onBack} style={{
            padding:'10px 18px', background:G, color:'#fff',
            border:'none', borderRadius:9, fontSize:11.5, fontWeight:700, cursor:'pointer',
          }}>← Voltar</button>
        </div>
      )}

      {!loading && servicos.length > 0 && (
        <div style={{ padding:'14px 12px' }}>
          {servicos.map(s => (
            <div
              key={s.id}
              onClick={() => onNavigateServico?.(s)}
              style={{
                background: C.white, border:`1px solid ${C.border}`, borderRadius:11,
                padding:'10px 12px', marginBottom:8, display:'flex', alignItems:'center',
                gap:11, cursor:'pointer',
              }}
            >
              <ImagemServico servico={s} height={60} style={{ width:60, borderRadius:8, flex:'0 0 auto' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:C.ink, marginBottom:2 }}>{s.nome}</div>
                {s.tagline && (
                  <div style={{ fontSize:10.5, color:C.slate, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{s.tagline}</div>
                )}
                <div style={{ fontSize:10, color:'#bbb', marginTop:2 }}>
                  {s.categoria_id}{s.duracao_tipica && ` · ⏱ ${s.duracao_tipica}`}
                </div>
              </div>
              <div style={{ fontSize:15, fontWeight:800, color:G, flex:'0 0 auto' }}>
                €{Number(s.preco).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
