import React from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', gold:'#D4A72C', goldLt:'#FFF4D6', coral:'#E76F51' }

const COMBO_FALLBACK = {
  titulo:'Pack Inverno',
  sub:'Caldeira + caleiras + cobertura',
  emoji:'❄️',
  preco:'185€',
  precoOriginal:'229€',
  desconto:19,
  bg:'linear-gradient(135deg,#0C447C,#185FA5)',
  servicos:[
    { emoji:'🔥', nome:'Revisão anual caldeira a gás', duracao:'2h',   preco:'75€'  },
    { emoji:'🌊', nome:'Limpeza de caleiras',          duracao:'1.5h', preco:'55€'  },
    { emoji:'🏠', nome:'Inspecção cobertura',          duracao:'1h',   preco:'99€'  },
  ],
  poupanca:44,
}

export default function ComboDetailScreen({ combo, onBack, onPedir }) {
  const cb = combo || COMBO_FALLBACK

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:110 }}>
      {/* Hero */}
      <div style={{ background: cb.bg || 'linear-gradient(145deg,#1B4332,#2D6A4F)', padding:'14px 16px 28px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:16 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:6 }}>COMBO</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif', marginBottom:4 }}>{cb.titulo}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.75)' }}>{cb.sub}</div>
          </div>
          <div style={{
            background:'rgba(255,255,255,.2)', borderRadius:12, padding:'8px 14px', textAlign:'center', flexShrink:0,
          }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.7)', marginBottom:2 }}>POUPA</div>
            <div style={{ fontSize:22, fontWeight:800 }}>-{cb.desconto}%</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {/* Inclui */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:12 }}>
            Inclui {cb.servicos?.length || 0} serviços
          </div>
          {(cb.servicos || []).map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < cb.servicos.length-1 ? `1px solid ${C.line}` : 'none' }}>
              <span style={{ fontSize:24, flexShrink:0 }}>{s.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{s.nome}</div>
                <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>⏱ {s.duracao}</div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:G }}>{s.preco}</div>
            </div>
          ))}
        </div>

        {/* Poupança */}
        <div style={{ background:C.goldLt, border:`1px solid ${C.gold}44`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <span style={{ fontSize:28 }}>💰</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>Poupas {cb.poupanca}€ vs comprar separadamente</div>
              <div style={{ fontSize:11, color:C.slate, marginTop:3 }}>
                Preço individual: <span style={{ textDecoration:'line-through' }}>{cb.precoOriginal}</span>
                {' '} · Combo: <b style={{ color:G }}>{cb.preco}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA fixo */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto',
        padding:'12px 16px 24px', background:C.white, borderTop:`1px solid ${C.border}`,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <span style={{ fontSize:13, color:C.slate, textDecoration:'line-through', marginRight:8 }}>{cb.precoOriginal}</span>
            <span style={{ fontSize:26, fontWeight:800, color:G }}>{cb.preco}</span>
            <span style={{ fontSize:12, color:C.slate }}> + IVA</span>
          </div>
          <span style={{ fontSize:11, background:C.goldLt, color:C.gold, padding:'3px 10px', borderRadius:5, fontWeight:700 }}>-{cb.desconto}%</span>
        </div>
        <button onClick={() => onPedir?.(cb) || alert('Combo adicionado! Vai a Serviços para confirmar.')} style={{
          width:'100%', padding:13, borderRadius:10, background:G,
          border:'none', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer',
        }}>Pedir combo →</button>
      </div>
    </div>
  )
}
