import React, { useState, useEffect } from 'react'
import { supa, supaCore } from './supa.js'
import { useAuth } from './lib/AuthContext.jsx'
import { calcularNivel } from './lib/gamification.js'

const V = {
  forest:   '#1B4332',
  emerald:  '#52B788',
  pale:     '#D8F3DC',
  paleDeep: '#ECFDF5',
  ink:      '#0A1620',
  stone:    '#6B7685',
  line:     '#E5E7EB',
  gold:     '#D4A72C',
  goldSoft: '#FEF9C3',
  red:      '#A32D2D',
  redSoft:  '#FFEAEA',
  white:    '#FFFFFF',
}

const NIVEL_LABELS = { bronze:'Bronze', silver:'Prata', gold:'Ouro', platinum:'Platina', diamond:'Diamante' }
const NIVEL_EMOJIS = { bronze:'🥉', silver:'🥈', gold:'🥇', platinum:'💎', diamond:'💠' }
const NIVEL_ORDER  = ['bronze','silver','gold','platinum','diamond']
const NIVEL_THRESH = { bronze:0, silver:500, gold:1500, platinum:3500, diamond:7500 }

const GRUPOS = [
  {
    label: 'A MINHA CASA',
    items: [
      { id:'subscricao', emoji:'💎', label:'A minha subscrição',   chevron:true },
      { id:'imoveis',    emoji:'🏠', label:'Os meus imóveis',      chevron:true },
      { id:'wishlist',   emoji:'📝', label:'A minha lista',        chevron:true },
      { id:'moradas',    emoji:'📍', label:'As minhas moradas',    chevron:true },
    ],
  },
  {
    label: 'SERVIÇOS',
    items: [
      { id:'avaliacoes', emoji:'⭐', label:'As minhas avaliações', chevron:true },
      { id:'pagamentos', emoji:'💳', label:'Métodos de pagamento', chevron:true },
      { id:'fiscal',     emoji:'🧾', label:'Perfis fiscais',       chevron:true },
    ],
  },
  {
    label: 'FIDELIZAÇÃO',
    items: [
      { id:'ownersclub', emoji:'🏆', label:'Owners Club',          chevron:true },
      { id:'historico',  emoji:'📊', label:'Histórico de pontos',  expand:true },
      { id:'referencia', emoji:'🎁', label:'Código de referência', chevron:true },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { id:'perfil',   emoji:'👤', label:'Os meus dados',  chevron:true },
      { id:'notif',    emoji:'🔔', label:'Notificações',   chevron:true },
      { id:'settings', emoji:'⚙️', label:'Definições',     chevron:true },
      { id:'ajuda',    emoji:'❓', label:'Ajuda & Suporte', chevron:true },
    ],
  },
]

function formatMotivo(m) {
  if (!m) return '—'
  return m.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
}
function formatData(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-PT', { day:'2-digit', month:'short' })
}

export default function PerfilMenuContent({ open, authUser, onNavigate, onLogout }) {
  const { pessoa_id } = useAuth()
  const [pessoa,     setPessoa]     = useState(null)
  const [subscricao, setSubscricao] = useState(null)
  const [pontos,     setPontos]     = useState([])
  const [loading,    setLoading]    = useState(false)
  const [histOpen,   setHistOpen]   = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      supaCore.from('pessoas').select('id,nome,email').eq('id', pessoa_id).maybeSingle(),
      supa.from('subscricoes').select('id,plano,preco_mensal,estado,pontos_total,nivel').eq('pessoa_id', pessoa_id).eq('estado','ativo').maybeSingle(),
      supa.from('pontos_historico').select('id,pontos,motivo,data').eq('pessoa_id', pessoa_id).order('data',{ascending:false}).limit(10),
    ]).then(([rP,rS,rH]) => {
      setPessoa(rP.data || null)
      setSubscricao(rS.data || null)
      setPontos(rH.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [open])

  const nome        = pessoa?.nome  || authUser?.nome  || 'Utilizador'
  const email       = pessoa?.email || authUser?.user?.email || '—'
  const iniciais    = nome.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
  const pontosTotal = subscricao?.pontos_total ?? 0
  const nivel       = subscricao?.nivel || calcularNivel(pontosTotal)
  const nivelIdx    = NIVEL_ORDER.indexOf(nivel)
  const nextNivel   = nivelIdx >= 0 && nivelIdx < 4 ? NIVEL_ORDER[nivelIdx+1] : null
  const faltam      = nextNivel ? Math.max(0, NIVEL_THRESH[nextNivel] - pontosTotal) : null

  function handleItem(item) {
    if (item.expand)               { setHistOpen(v => !v); return }
    if (item.id === 'subscricao')  { onNavigate?.('subscricao'); return }
    if (item.id === 'wishlist')    { onNavigate?.('wishlist');   return }
    if (item.id === 'moradas')     { onNavigate?.('moradas');    return }
    if (item.id === 'perfil')      { onNavigate?.('perfil');     return }
    if (item.id === 'ownersclub')  { onNavigate?.('ownersclub'); return }
    alert(`"${item.label}" disponível numa fase futura.`)
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ padding:'16px 20px 20px', borderBottom:`1px solid ${V.line}` }}>
        {loading ? (
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:V.pale }}/>
            <div style={{ flex:1 }}>
              <div style={{ height:14, width:'55%', borderRadius:6, background:V.pale, marginBottom:8 }}/>
              <div style={{ height:11, width:'70%', borderRadius:6, background:V.pale, marginBottom:8 }}/>
              <div style={{ height:20, width:'50%', borderRadius:10, background:V.pale }}/>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div style={{
              width:56, height:56, borderRadius:'50%',
              background:`linear-gradient(135deg,${V.forest},${V.emerald})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, fontWeight:800, color:V.white,
              flexShrink:0, boxShadow:'0 2px 10px rgba(27,67,50,0.25)',
            }}>{iniciais}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:16, color:V.ink, marginBottom:3 }}>{nome}</div>
              <div style={{ fontSize:12, color:V.stone, marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                <span style={{
                  background:V.goldSoft, color:V.gold, fontWeight:800,
                  fontSize:11, padding:'2px 10px', borderRadius:20,
                  border:`1px solid ${V.gold}44`,
                }}>
                  {NIVEL_EMOJIS[nivel]||'🥉'} {NIVEL_LABELS[nivel]||'Bronze'} · {pontosTotal} pts
                </span>
                {faltam != null && nextNivel && (
                  <span style={{ fontSize:10, color:V.stone }}>{faltam} pts para {NIVEL_LABELS[nextNivel]}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grupos */}
      <div style={{ padding:'4px 0' }}>
        {GRUPOS.map((grupo, gi) => (
          <div key={grupo.label}>
            <div style={{
              padding:'10px 20px 4px',
              fontSize:9, fontWeight:700, letterSpacing:'0.08em',
              color:V.stone, textTransform:'uppercase',
              borderTop: gi > 0 ? `1px solid ${V.line}` : 'none',
              marginTop: gi > 0 ? 4 : 0,
            }}>{grupo.label}</div>
            {grupo.items.map(item => (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => handleItem(item)}
                  style={{
                    width:'100%', padding:'12px 20px',
                    display:'flex', alignItems:'center', gap:14,
                    background:'none', border:'none', cursor:'pointer',
                    textAlign:'left',
                  }}
                >
                  <span style={{ fontSize:18, width:24, textAlign:'center', flexShrink:0 }}>{item.emoji}</span>
                  <span style={{ flex:1, fontSize:14, fontWeight:500, color:V.ink }}>{item.label}</span>
                  {item.expand ? (
                    <span style={{
                      fontSize:12, color:V.stone, display:'inline-block',
                      transform: histOpen ? 'rotate(90deg)' : 'none',
                      transition:'transform 200ms',
                    }}>›</span>
                  ) : item.chevron ? (
                    <span style={{ fontSize:16, color:V.stone }}>›</span>
                  ) : null}
                </button>
                {item.expand && histOpen && (
                  <div style={{
                    margin:'0 20px 8px', borderRadius:12,
                    background:V.paleDeep, padding:'10px 14px',
                    border:`1px solid ${V.pale}`,
                  }}>
                    {pontos.length === 0 ? (
                      <div style={{ fontSize:12, color:V.stone, textAlign:'center', padding:'8px 0' }}>Sem pontos registados ainda.</div>
                    ) : pontos.map(p => (
                      <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:`1px solid ${V.pale}` }}>
                        <span style={{ fontSize:12, color:V.ink, flex:1 }}>{formatMotivo(p.motivo)}</span>
                        <span style={{ fontSize:11, color:V.stone, marginRight:12 }}>{formatData(p.data)}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:V.gold }}>+{p.pontos}</span>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>

      {/* Rodapé — Sair */}
      <div style={{ borderTop:`1px solid ${V.line}`, padding:'16px 20px 32px' }}>
        <button
          onClick={onLogout}
          style={{
            width:'100%', padding:12, borderRadius:10,
            border:'none', cursor:'pointer',
            background:V.redSoft, color:V.red,
            fontSize:14, fontWeight:700,
          }}
        >Sair</button>
        <div style={{ fontSize:10, color:V.stone, letterSpacing:'0.04em', textAlign:'center', marginTop:10 }}>v0.5.2 · build dev</div>
      </div>
    </div>
  )
}
