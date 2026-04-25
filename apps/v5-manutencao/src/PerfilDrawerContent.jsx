import React from 'react'
import { MOCK } from './data/mock.js'

const V = {
  green:    '#1B4332',
  greenLt:  '#52B788',
  ink:      '#0f172a',
  stone:    '#6B7685',
  line:     '#E5E7EB',
  gold:     '#D4A72C',
  goldSoft: '#FEF9C3',
}

const NIVEL_EMOJI = { Bronze:'🥉', Prata:'🥈', Ouro:'🥇', Platina:'💎', Diamante:'💠' }

const GRUPOS = [
  {
    label: 'NAVEGAÇÃO RÁPIDA',
    items: [
      { id:'inicio',   emoji:'🏠', label:'Início',           type:'tab', tab:'inicio'   },
      { id:'servicos', emoji:'🛠', label:'Serviços',         type:'tab', tab:'servicos' },
      { id:'casa',     emoji:'🏡', label:'A minha casa',     type:'tab', tab:'casa'     },
      { id:'pedidos',  emoji:'📋', label:'Os meus pedidos',  type:'tab', tab:'pedidos'  },
    ],
  },
  {
    label: 'A MINHA CASA',
    items: [
      { id:'imoveis',    emoji:'🏘', label:'Os meus imóveis',     type:'ecra' },
      { id:'wishlist',   emoji:'📝', label:'A minha lista',       type:'ecra' },
      { id:'subscricao', emoji:'💎', label:'A minha subscrição',  type:'ecra' },
    ],
  },
  {
    label: 'HISTÓRICO & DADOS',
    items: [
      { id:'historico_pontos', emoji:'📊', label:'Histórico de pontos',   type:'ecra' },
      { id:'avaliacoes',       emoji:'⭐', label:'As minhas avaliações',  type:'ecra' },
      { id:'pagamentos',       emoji:'💳', label:'Métodos de pagamento',  type:'ecra' },
    ],
  },
  {
    label: 'APP',
    items: [
      { id:'owners_club',  emoji:'🏆', label:'Owners Club',     type:'ecra' },
      { id:'notificacoes', emoji:'🔔', label:'Notificações',    type:'ecra' },
      { id:'definicoes',   emoji:'⚙️', label:'Definições',      type:'ecra' },
      { id:'ajuda',        emoji:'❓', label:'Ajuda & Suporte', type:'ecra' },
    ],
  },
]

export default function PerfilDrawerContent({ authUser, onNavigate, onSwitchTab }) {
  const p       = MOCK.pessoa
  const iniciais = p.nome.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const emoji    = NIVEL_EMOJI[p.nivel] || '🥉'

  function handleItem(item) {
    if (item.type === 'tab') onSwitchTab?.(item.tab)
    else                     onNavigate?.(item.id)
  }

  return (
    <div>
      {/* Cabeçalho compacto */}
      <div style={{ padding:'20px 16px 14px', borderBottom:`1px solid ${V.line}` }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{
            width:40, height:40, borderRadius:'50%',
            background:`linear-gradient(135deg,${V.green},${V.greenLt})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:15, fontWeight:800, color:'#fff', flexShrink:0,
          }}>{iniciais}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:V.ink, marginBottom:3 }}>{p.nome}</div>
            <span style={{
              background:V.goldSoft, color:V.gold, fontWeight:700,
              fontSize:10, padding:'1px 8px', borderRadius:14, border:`1px solid ${V.gold}44`,
            }}>{emoji} {p.nivel}</span>
          </div>
        </div>
      </div>

      {/* Grupos */}
      <div style={{ padding:'4px 0 24px' }}>
        {GRUPOS.map((grupo, gi) => (
          <div key={grupo.label}>
            <div style={{
              padding:'10px 16px 4px', fontSize:9, fontWeight:700,
              letterSpacing:'0.08em', color:V.stone, textTransform:'uppercase',
              borderTop: gi > 0 ? `1px solid ${V.line}` : 'none',
              marginTop: gi > 0 ? 4 : 0,
            }}>{grupo.label}</div>
            {grupo.items.map(item => (
              <button
                key={item.id}
                onClick={() => handleItem(item)}
                style={{
                  width:'100%', padding:'10px 16px',
                  display:'flex', alignItems:'center', gap:12,
                  background:'none', border:'none', cursor:'pointer', textAlign:'left',
                }}
              >
                <span style={{ fontSize:17, width:22, textAlign:'center', flexShrink:0 }}>{item.emoji}</span>
                <span style={{ flex:1, fontSize:13, fontWeight:500, color:V.ink }}>{item.label}</span>
                {item.type === 'ecra' && <span style={{ fontSize:14, color:V.stone }}>›</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
