import React, { useState, useEffect, useCallback } from 'react'
import { supa } from '../supa.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC' }

const CAT_EMOJI = {
  limpeza:'✨', manutencao:'🔧', canalizacao:'💧', eletrica:'⚡',
  pintura:'🖌️', jardim:'🌿', piscina:'🏊', pos_obra:'🏗️',
}

function Stars({ rating }) {
  const n = Math.round(rating || 0)
  return <span style={{ color:'#F59E0B', fontSize:13 }}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</span>
}

function precoFmt(v) {
  if (!v) return '—'
  if (typeof v === 'string') return v.includes('€') ? v : `${v}€`
  return `${Number(v).toFixed(0)}€`
}

export default function ServicoDetailScreen({ servico, onBack, onPedir, onAdicionarLista }) {
  const [detalhe,    setDetalhe]    = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])

  // If servico comes from BD (has numeric preco), fetch full detail with inclui/faq
  const servId = servico?.id

  const fetchDetalhe = useCallback(async () => {
    if (!servId) return
    const { data } = await supa
      .from('servicos')
      .select('id, nome, preco, preco_original, duracao_tipica, garantia_dias, inclui, nao_inclui, descricao_curta, tagline, icon, categoria_id')
      .eq('id', servId)
      .single()
    if (data) setDetalhe(data)
  }, [servId])

  useEffect(() => { fetchDetalhe() }, [fetchDetalhe])

  // Build display object: prefer BD detalhe, fallback to passed servico prop
  const src    = detalhe || servico || {}
  const emoji  = src.icon || src.emoji || CAT_EMOJI[src.categoria_id] || '🔧'
  const nome   = src.nome || 'Serviço'
  const cat    = src.categoria || src.categoria_id || 'Serviço'
  const duracao= src.duracao_tipica || src.duracao || '—'
  const rating = src.rating ?? 4.8
  const garantia = src.garantia_dias ? `${src.garantia_dias} dias` : (src.garantia || '90 dias')
  const preco  = precoFmt(src.preco)
  const descricao = src.descricao_curta || src.tagline || src.descricao || ''

  // inclui: JSONB array from BD or legacy array
  let inclui = []
  if (src.inclui) {
    inclui = Array.isArray(src.inclui) ? src.inclui : []
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:110 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 28px', color:'#fff', textAlign:'center' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:16, textAlign:'left' }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:48, marginBottom:10 }}>{emoji}</div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:6 }}>{String(cat).toUpperCase()}</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif', lineHeight:1.25, marginBottom:12 }}>{nome}</div>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          {[`⏱ ${duracao}`, `⭐ ${rating}`, `🛡 ${garantia}`].map(chip => (
            <span key={chip} style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:'rgba(255,255,255,.15)', fontWeight:600 }}>{chip}</span>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {descricao ? (
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:8 }}>Descrição</div>
            <div style={{ fontSize:13, color:C.ink, lineHeight:1.6 }}>{descricao}</div>
          </div>
        ) : null}

        {inclui.length > 0 && (
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>O que está incluído</div>
            {inclui.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:7 }}>
                <span style={{ color:GL, fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>
                <span style={{ fontSize:13, color:C.ink, lineHeight:1.4 }}>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
              </div>
            ))}
          </div>
        )}

        {avaliacoes.length > 0 && (
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>Avaliações</div>
            {avaliacoes.map((av, i) => (
              <div key={i} style={{ borderBottom: i < avaliacoes.length-1 ? `1px solid ${C.line}` : 'none', paddingBottom:10, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.ink }}>Cliente</span>
                  <span style={{ fontSize:11, color:C.slate }}>{new Date(av.criado_em).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}</span>
                </div>
                <div style={{ marginBottom:4 }}><Stars rating={av.rating}/></div>
                {av.texto && <div style={{ fontSize:12, color:C.slate }}>{av.texto}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto',
        padding:'12px 16px 24px', background:C.white, borderTop:`1px solid ${C.border}`,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <span style={{ fontSize:24, fontWeight:800, color:G }}>{preco}</span>
            <span style={{ fontSize:12, color:C.slate }}> + IVA</span>
          </div>
          <span style={{ fontSize:11, color:C.slate }}>⏱ {duracao}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { onAdicionarLista?.(src); alert(`"${nome}" adicionado à lista!`) }} style={{
            flex:1, padding:12, borderRadius:10, background:C.bg,
            border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, color:C.slate, cursor:'pointer',
          }}>Adicionar à lista</button>
          <button onClick={() => { onPedir?.(src) || alert('A redirigir para o pedido...') }} style={{
            flex:2, padding:12, borderRadius:10, background:G,
            border:'none', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer',
          }}>Pedir agora →</button>
        </div>
      </div>
    </div>
  )
}
