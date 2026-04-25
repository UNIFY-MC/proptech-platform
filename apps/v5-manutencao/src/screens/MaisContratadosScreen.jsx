import React from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', gold:'#D4A72C', goldLt:'#FFF4D6', greenXl:'#D8F3DC' }

const TOP20 = [
  { rank:1,  emoji:'✨', nome:'Limpeza manutenção apartamento T2',   duracao:'3h',   preco:'42€', n:1247 },
  { rank:2,  emoji:'🔧', nome:'Revisão anual caldeira a gás',        duracao:'2h',   preco:'75€', n:983  },
  { rank:3,  emoji:'💧', nome:'Desentupimento — urgência',           duracao:'1.5h', preco:'65€', n:876  },
  { rank:4,  emoji:'🌿', nome:'Manutenção jardim mensal',            duracao:'2h',   preco:'35€', n:754  },
  { rank:5,  emoji:'🖌️', nome:'Pintura sala 20m²',                   duracao:'6h',   preco:'180€',n:632  },
  { rank:6,  emoji:'✨', nome:'Limpeza profunda T3',                  duracao:'4.5h', preco:'58€', n:601  },
  { rank:7,  emoji:'⚡', nome:'Quadro eléctrico — revisão',           duracao:'1.5h', preco:'85€', n:589  },
  { rank:8,  emoji:'🔧', nome:'Manutenção preventiva anual',         duracao:'4h',   preco:'120€',n:543  },
  { rank:9,  emoji:'🏊', nome:'Manutenção piscina — mensal',         duracao:'2h',   preco:'90€', n:498  },
  { rank:10, emoji:'🌿', nome:'Poda árvores e arbustos',             duracao:'3h',   preco:'65€', n:467  },
  { rank:11, emoji:'✨', nome:'Limpeza janelas exteriores',           duracao:'2h',   preco:'45€', n:423  },
  { rank:12, emoji:'🔧', nome:'Montagem móveis IKEA',                duracao:'3h',   preco:'55€', n:398  },
  { rank:13, emoji:'💧', nome:'Substituição torneira / misturadora', duracao:'1h',   preco:'45€', n:376  },
  { rank:14, emoji:'⚡', nome:'Tomadas e interruptores',             duracao:'1h',   preco:'50€', n:354  },
  { rank:15, emoji:'✨', nome:'Limpeza pós-mudança',                 duracao:'5h',   preco:'95€', n:332  },
  { rank:16, emoji:'🖌️', nome:'Pintura quarto',                      duracao:'4h',   preco:'95€', n:310  },
  { rank:17, emoji:'🔧', nome:'Pequenas reparações (handyman 2h)',   duracao:'2h',   preco:'50€', n:298  },
  { rank:18, emoji:'🌿', nome:'Corte relva e jardim pequeno',        duracao:'1.5h', preco:'30€', n:276  },
  { rank:19, emoji:'💧', nome:'Limpeza sifões e ralos',              duracao:'1h',   preco:'35€', n:254  },
  { rank:20, emoji:'🔧', nome:'Lubrificação portões e dobradiças',   duracao:'45min',preco:'30€', n:231  },
]

const medalha = { 1:'🥇', 2:'🥈', 3:'🥉' }

export default function MaisContratadosScreen({ onBack, onNavigateServico }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>CATÁLOGO</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>⭐ Mais contratados</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>Top 20 · baseado nos últimos 90 dias</div>
      </div>

      <div style={{ padding:'12px 16px' }}>
        {TOP20.map(s => (
          <div
            key={s.rank}
            onClick={() => onNavigateServico?.(s)}
            style={{
              background:C.white, border:`1px solid ${C.border}`, borderRadius:12,
              padding:'12px 14px', marginBottom:8, cursor:'pointer',
              display:'flex', alignItems:'center', gap:12,
            }}
          >
            <div style={{ width:30, textAlign:'center', flexShrink:0 }}>
              {medalha[s.rank]
                ? <span style={{ fontSize:18 }}>{medalha[s.rank]}</span>
                : <span style={{ fontSize:14, fontWeight:800, color:C.slate }}>#{s.rank}</span>
              }
            </div>
            <span style={{ fontSize:22, flexShrink:0 }}>{s.emoji}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.ink, lineHeight:1.3 }}>{s.nome}</div>
              <div style={{ display:'flex', gap:8, fontSize:10, color:C.slate, marginTop:3 }}>
                <span>⏱ {s.duracao}</span>
                <span>·</span>
                <span>{s.n.toLocaleString('pt-PT')} pedidos</span>
              </div>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:G, flexShrink:0 }}>{s.preco}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
