import React from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff', coral:'#E76F51', greenLt:'#52B788' }

const COMBOS = [
  { id:'c1', titulo:'Pack Inverno',    sub:'Caldeira + caleiras + cobertura',   preco:'185€', precoOrig:'229€', desc:19, bg:'linear-gradient(135deg,#E6F1FB,#D4E8F8)', bgHero:'linear-gradient(145deg,#0C447C,#185FA5)', emoji:'❄️', poupanca:44, servicos:[] },
  { id:'c2', titulo:'Reset Primavera', sub:'Limpeza profunda + jardim',         preco:'129€', precoOrig:'175€', desc:26, bg:'linear-gradient(135deg,#FCEBEB,#FDE4DC)', bgHero:'linear-gradient(145deg,#8B2635,#C0392B)', emoji:'🌸', poupanca:46, servicos:[] },
  { id:'c3', titulo:'Pré-venda casa',  sub:'Tudo em 48h',                       preco:'399€', precoOrig:'520€', desc:23, bg:'linear-gradient(135deg,#D8F3DC,#C8ECCE)', bgHero:'linear-gradient(145deg,#1B4332,#2D6A4F)', emoji:'🏡', poupanca:121, servicos:[] },
  { id:'c4', titulo:'Pack Verão',      sub:'Piscina + jardim + AC + exteriores',preco:'245€', precoOrig:'310€', desc:21, bg:'linear-gradient(135deg,#E0ECF8,#D4E8F8)', bgHero:'linear-gradient(145deg,#185FA5,#2980B9)', emoji:'☀️', poupanca:65, servicos:[] },
]

export default function CombosScreen({ onBack, onNavigateCombo }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>CATÁLOGO</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>🔥 Combos populares</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>Poupa comprando vários serviços juntos</div>
      </div>

      <div style={{ padding:'14px 16px' }}>
        {COMBOS.map(cb => (
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
                <div style={{ fontSize:9, color:C.coral, fontWeight:700, letterSpacing:.5, marginBottom:4 }}>-{cb.desc}% · POUPA {cb.poupanca}€</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.ink, fontFamily:'Georgia,serif', marginBottom:4 }}>{cb.titulo}</div>
                <div style={{ fontSize:12, color:C.slate }}>{cb.sub}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
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
