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
  red:      '#A32D2D',
  redSoft:  '#FFEAEA',
}

const NIVEL_EMOJI = { Bronze:'🥉', Prata:'🥈', Ouro:'🥇', Platina:'💎', Diamante:'💠' }

const GRUPOS = [
  {
    label: 'A MINHA CONTA',
    items: [
      { id:'sobre_mim',          emoji:'👤', label:'Sobre mim' },
      { id:'dados_pessoais',     emoji:'📝', label:'Dados pessoais & NIF' },
      { id:'login_seguranca',    emoji:'🔒', label:'Login & segurança' },
      { id:'moradas',            emoji:'📍', label:'Moradas / endereços' },
    ],
  },
  {
    label: 'REWARDS',
    items: [
      { id:'codigo_promocional', emoji:'🎁', label:'Código promocional' },
      { id:'referral',           emoji:'👥', label:'Convida os teus amigos' },
    ],
  },
]

export default function PerfilSheetContent({ authUser, onNavigate, onLogout }) {
  const p       = MOCK.pessoa
  const iniciais = p.nome.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const emoji    = NIVEL_EMOJI[p.nivel] || '🥉'

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ padding:'16px 20px 20px', borderBottom:`1px solid ${V.line}` }}>
        <div style={{ display:'flex', gap:14, alignItems:'center' }}>
          <div style={{
            width:56, height:56, borderRadius:'50%',
            background:`linear-gradient(135deg,${V.green},${V.greenLt})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:800, color:'#fff', flexShrink:0,
            boxShadow:'0 2px 10px rgba(27,67,50,0.25)',
          }}>{iniciais}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:16, color:V.ink, marginBottom:3 }}>{p.nome}</div>
            <div style={{ fontSize:12, color:V.stone, marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.email}</div>
            <span style={{
              background:V.goldSoft, color:V.gold, fontWeight:800,
              fontSize:11, padding:'2px 10px', borderRadius:20,
              border:`1px solid ${V.gold}44`,
            }}>{emoji} {p.nivel} · {p.pontos_total.toLocaleString('pt-PT')} pts</span>
          </div>
        </div>
      </div>

      {/* Grupos */}
      <div style={{ padding:'4px 0' }}>
        {GRUPOS.map((grupo, gi) => (
          <div key={grupo.label}>
            <div style={{
              padding:'10px 20px 4px', fontSize:9, fontWeight:700,
              letterSpacing:'0.08em', color:V.stone, textTransform:'uppercase',
              borderTop: gi > 0 ? `1px solid ${V.line}` : 'none',
              marginTop: gi > 0 ? 4 : 0,
            }}>{grupo.label}</div>
            {grupo.items.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                style={{
                  width:'100%', padding:'12px 20px',
                  display:'flex', alignItems:'center', gap:14,
                  background:'none', border:'none', cursor:'pointer', textAlign:'left',
                }}
              >
                <span style={{ fontSize:18, width:24, textAlign:'center', flexShrink:0 }}>{item.emoji}</span>
                <span style={{ flex:1, fontSize:14, fontWeight:500, color:V.ink }}>{item.label}</span>
                <span style={{ fontSize:16, color:V.stone }}>›</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div style={{ borderTop:`1px solid ${V.line}`, padding:'16px 20px 32px' }}>
        <button
          onClick={onLogout}
          style={{
            width:'100%', padding:12, borderRadius:10, border:'none', cursor:'pointer',
            background:V.redSoft, color:V.red, fontSize:14, fontWeight:700,
          }}
        >Sair</button>
        <div style={{ fontSize:10, color:V.stone, letterSpacing:'0.04em', textAlign:'center', marginTop:10 }}>
          v0.5.3 · build dev
        </div>
      </div>
    </div>
  )
}
