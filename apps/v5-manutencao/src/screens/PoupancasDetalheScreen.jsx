import React from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', gold:'#D4A72C', goldLt:'#FFF4D6',
            greenXl:'#D8F3DC', greenLt:'#52B788', amber:'#D97706', amberLt:'#FFFBEB' }

// TODO(mario Fase 5): calcular real:
//   SELECT SUM(preco_normal - preco_pago) FROM ordens_trabalho
//   WHERE pessoa_id=X AND EXTRACT(YEAR FROM criado_em)=2026
const TOTAL_POUPADO   = 229
const TOTAL_PREV_ANO  = 194
const PCT_VARIACAO    = Math.round(((TOTAL_POUPADO - TOTAL_PREV_ANO) / TOTAL_PREV_ANO) * 100)

const BREAKDOWN = [
  {
    id:'servicos', emoji:'🔧', titulo:'Serviços', total:147, cor:G, corLt:C.greenXl,
    items:[
      { label:'Plano Home+ desconto 5%',    valor:89 },
      { label:'Combos vs avulso',           valor:38 },
      { label:'Promoções sazonais',         valor:20 },
    ],
  },
  {
    id:'energia', emoji:'⚡', titulo:'Energia', total:82, cor:C.amber, corLt:C.amberLt,
    items:[
      { label:'Mudança tarifário (IA recomendou)', valor:64 },
      { label:'Filtros AC limpos (consumo -8%)',   valor:18 },
    ],
  },
]

const SUGESTOES = [
  { emoji:'🖌️', titulo:'Pack pintura interior · 3 divisões', poupanca:'poupa até 45€', action:'combo' },
  { emoji:'🔥', titulo:'Substituir caldeira antiga',          poupanca:'-180€/ano estimados', action:'simulador' },
]

function BreakdownCard({ b }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:22 }}>{b.emoji}</span>
        <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>{b.titulo}</div>
        <div style={{ marginLeft:'auto', fontSize:18, fontWeight:800, color:b.cor }}>
          {b.total}€
        </div>
      </div>
      {b.items.map((it, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:8, marginBottom: i < b.items.length-1 ? 8 : 0, borderBottom: i < b.items.length-1 ? `1px solid ${C.line}` : 'none' }}>
          <div style={{ fontSize:12, color:C.slate, flex:1, paddingRight:8 }}>{it.label}</div>
          <div style={{ fontSize:13, fontWeight:700, color:b.cor, flexShrink:0 }}>+{it.valor}€</div>
        </div>
      ))}
      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.line}`, display:'flex', justifyContent:'space-between' }}>
        <div style={{ fontSize:10, color:C.stone, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Subtotal</div>
        <div style={{ fontSize:14, fontWeight:800, color:b.cor }}>{b.total}€</div>
      </div>
    </div>
  )
}

export default function PoupancasDetalheScreen({ onBack, onNavigateCombo }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 24px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>POUPANÇAS 2026</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>💰 Poupanças este ano</div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>

        {/* Hero total */}
        <div style={{ background:`linear-gradient(135deg,${C.goldLt},#FEF9EE)`, border:`1px solid ${C.gold}44`, borderRadius:16, padding:'20px 16px', marginBottom:14, textAlign:'center' }}>
          <div style={{ fontSize:11, color:C.stone, textTransform:'uppercase', letterSpacing:.7, marginBottom:6 }}>Total poupado em 2026</div>
          <div style={{ fontSize:44, fontWeight:800, color:G, lineHeight:1 }}>{TOTAL_POUPADO}€</div>
          <div style={{ fontSize:12, color:C.slate, marginTop:8 }}>
            <span style={{ color: PCT_VARIACAO >= 0 ? G : C.amber, fontWeight:700 }}>
              {PCT_VARIACAO >= 0 ? '↑' : '↓'} {Math.abs(PCT_VARIACAO)}%
            </span>
            {' vs '}2025 ({TOTAL_PREV_ANO}€)
          </div>
        </div>

        {/* De onde vem */}
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>De onde vem</div>
        {BREAKDOWN.map(b => <BreakdownCard key={b.id} b={b} />)}

        {/* Sugestões */}
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.7, color:C.stone, textTransform:'uppercase', margin:'14px 0 10px' }}>Poupar ainda mais</div>
        {SUGESTOES.map((s, i) => (
          <div
            key={i}
            onClick={() => s.action === 'combo' ? onNavigateCombo?.({}) : alert('Simulador — Fase 5')}
            style={{
              background:C.white, border:`1px solid ${C.border}`, borderRadius:12,
              padding:'12px 14px', marginBottom:8, cursor:'pointer',
              display:'flex', alignItems:'center', gap:12,
            }}
          >
            <span style={{ fontSize:22, flexShrink:0 }}>{s.emoji}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{s.titulo}</div>
              <div style={{ fontSize:11, color:C.greenLt, fontWeight:600, marginTop:2 }}>{s.poupanca}</div>
            </div>
            <div style={{ fontSize:16, color:C.stone }}>›</div>
          </div>
        ))}

        {/* Nota metodologia */}
        <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', marginTop:8, fontSize:10.5, color:C.stone, lineHeight:1.6 }}>
          ℹ️ Cálculo baseado na comparação com preços de mercado externos. Não inclui poupanças não-quantificáveis como tempo e conforto.
        </div>

      </div>
    </div>
  )
}
