import React, { useState, useEffect } from 'react'
import { supa } from '../supa.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff', coral:'#E76F51', greenLt:'#52B788' }


function adaptCombo(c) {
  const p = parseFloat(c.preco_combo)
  const o = parseFloat(c.preco_normal)
  const poupanca = (o - p).toFixed(0)
  return {
    id:            c.id,
    titulo:        c.nome,
    sub:           c.sub,
    emoji:         c.emoji || '🏠',
    preco:         `€${p.toFixed(0)}`,
    precoOrig:     `€${o.toFixed(0)}`,
    precoOriginal: `€${o.toFixed(0)}`,
    desc:          c.desconto_pct || Math.round((1 - p / o) * 100),
    desconto:      c.desconto_pct || Math.round((1 - p / o) * 100),
    bg:            c.cor_hex || '#E6F1FB',
    cor_texto:     c.cor_texto || '#1B4332',
    poupanca:      `${poupanca}€`,
    descricao:     c.descricao_longa,
    servicos:      c.servicos_ids || [],
    imagem_url:    c.imagem_url || null,
    _raw:          c,
  }
}

export default function CombosScreen({ onBack, onNavigateCombo }) {
  const [combos, setCombos] = useState([])

  useEffect(() => {
    supa.from('combos').select('*').eq('ativo', true).order('ordem')
      .then(({ data, error }) => {
        if (error) { console.warn('[Combos] query error:', error.message); return }
        if (data?.length) setCombos(data.map(adaptCombo))
      })
      .catch(e => console.warn('[Combos] fetch failed:', e))
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>CATÁLOGO</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>🔥 Combos populares</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>Poupa comprando vários serviços juntos · {combos.length} packs</div>
      </div>

      <div style={{ padding:'14px 16px' }}>
        {combos.map(cb => (
          <div
            key={cb.id}
            onClick={() => onNavigateCombo?.(cb)}
            style={{
              background: cb.bg, border:`1px solid ${C.border}`, borderRadius:16,
              padding:'16px', marginBottom:12, cursor:'pointer', position:'relative', overflow:'hidden',
            }}
          >
            <div style={{ position:'absolute', right:-8, bottom:-8, fontSize:80, opacity:.12, lineHeight:1 }}>{cb.emoji}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:9, color:C.coral, fontWeight:700, letterSpacing:.5, marginBottom:4 }}>-{cb.desc}% · POUPA {cb.poupanca}</div>
                <div style={{ fontSize:18, fontWeight:700, color:cb.cor_texto || C.ink, fontFamily:'Georgia,serif', marginBottom:4 }}>{cb.titulo}</div>
                <div style={{ fontSize:12, color:C.slate }}>{cb.sub}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                {cb.imagem_url && (
                  <img src={cb.imagem_url} alt={cb.titulo}
                       style={{ width:60, height:60, borderRadius:12, objectFit:'cover', display:'block', marginLeft:'auto', marginBottom:8 }} />
                )}
                <div style={{ fontSize:11, color:C.slate, textDecoration:'line-through' }}>{cb.precoOrig}</div>
                <div style={{ fontSize:20, fontWeight:800, color:G }}>{cb.preco}</div>
                <div style={{ fontSize:10, color:C.slate }}>+ IVA</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
