import React from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', coral:'#E76F51', coralLt:'#FDE4DC', greenXl:'#D8F3DC' }

const PROMO_FALLBACK = {
  tag:'🌸 RESET DE PRIMAVERA',
  titulo:'Até 50% OFF em limpezas profundas',
  emoji:'🌸',
  bg:'linear-gradient(135deg,#FCEBEB,#FDE4DC)',
  bgHero:'linear-gradient(145deg,#8B2635,#C0392B)',
  sub:'Válido até 31 Maio · 8 serviços',
  diasRestantes:36,
  servicos:[
    { emoji:'✨', nome:'Limpeza profunda T2',   preco:'42€', precoOrig:'65€', desc:35 },
    { emoji:'✨', nome:'Limpeza profunda T3',   preco:'58€', precoOrig:'85€', desc:32 },
    { emoji:'✨', nome:'Limpeza pós-obras',     preco:'99€', precoOrig:'150€',desc:34 },
    { emoji:'✨', nome:'Limpeza tapetes',       preco:'25€', precoOrig:'40€', desc:38 },
  ],
}

export default function PromocaoDetailScreen({ promo, onBack, onNavigateServico }) {
  const pr = promo || PROMO_FALLBACK

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      {/* Hero */}
      <div style={{ background: pr.bgHero || 'linear-gradient(145deg,#1B4332,#2D6A4F)', padding:'14px 16px 28px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:16 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:60, textAlign:'center', marginBottom:10 }}>{pr.emoji}</div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:6, textAlign:'center' }}>{pr.tag}</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif', lineHeight:1.25, textAlign:'center', marginBottom:6 }}>{pr.titulo}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', textAlign:'center' }}>{pr.sub}</div>
      </div>

      {/* Countdown */}
      <div style={{ margin:'14px 16px 0', background:C.coralLt, border:`1px solid ${C.coral}44`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:24 }}>⏰</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.coral }}>Termina em {pr.diasRestantes} dias</div>
          <div style={{ fontSize:11, color:C.slate }}>Aproveita antes que acabe</div>
        </div>
      </div>

      {/* Serviços */}
      <div style={{ padding:'14px 16px 0' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>
          Serviços com desconto
        </div>
        {pr.servicos?.map((s, i) => (
          <div
            key={i}
            onClick={() => onNavigateServico?.(s)}
            style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:10, cursor:'pointer', display:'flex', gap:12 }}
          >
            <span style={{ fontSize:26, flexShrink:0 }}>{s.emoji}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>{s.nome}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, color:C.slate, textDecoration:'line-through' }}>{s.precoOrig}</span>
                <span style={{ fontSize:16, fontWeight:800, color:G }}>{s.preco}</span>
                <span style={{ fontSize:9, background:C.coralLt, color:C.coral, padding:'2px 7px', borderRadius:5, fontWeight:700 }}>-{s.desc}%</span>
              </div>
            </div>
          </div>
        ))}

        <button onClick={() => alert('A mostrar todos os serviços desta promoção')} style={{
          width:'100%', padding:12, borderRadius:10, background:G, color:'#fff',
          border:'none', fontSize:13, fontWeight:700, cursor:'pointer', marginTop:4,
        }}>Ver todos os serviços →</button>
      </div>
    </div>
  )
}
