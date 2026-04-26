import { useState, useEffect } from 'react'
import { supa } from './supa.js'
import { useAuth } from './lib/AuthContext.jsx'
import { useImovelAtivo } from './lib/ImovelAtivoContext.jsx'

const V = {
  green:'#1B4332', greenMid:'#2D6A4F', greenLt:'#52B788', greenXl:'#D8F3DC',
  amber:'#854F0B', amberLt:'#FAEEDA', red:'#A32D2D', redLt:'#FCEBEB',
  border:'#e5e5e3', bg:'#f5f5f3', text:'#111', slate:'#555', muted:'#999',
  gold:'#D4A72C', goldLt:'#FFF4D6', coral:'#E76F51', coralLt:'#FDE4DC',
}

const NIVEL_ORDEM  = ['bronze','silver','gold','platinum','diamond']
const NIVEL_LABELS = { bronze:'Bronze', silver:'Prata', gold:'Ouro', platinum:'Platina', diamond:'Diamante' }
const NIVEL_THRESH = { bronze:0, silver:500, gold:1500, platinum:3500, diamond:7500 }
const NIVEL_DISPLAY = [['🏚️','Precário'],['🔨','Em cuidados'],['🌱','Saudável'],['🏆','Premium'],['💎','Excelência']]

const SISTEMAS = [
  { ic:'❄️', nome:'Climatização & AVAC',   field:'score_avac',      nota:'Filtros mudados há 2 meses · Excelente' },
  { ic:'💧', nome:'Canalização',            field:'score_canaliz',   nota:'Caleiras por verificar · Chuva prevista' },
  { ic:'⚡', nome:'Instalação Elétrica',    field:'score_eletrica',  nota:'Quadro revisto em Jan · Bom' },
  { ic:'🏠', nome:'Estrutura & Isolamento', field:'score_estrutura', nota:'Janelas com folga · Agendar revisão' },
  { ic:'🧼', nome:'Limpeza & Higiene',      field:'score_agua',      nota:'Última limpeza há 3 semanas · Agendar' },
]

const PREMIOS = [
  { ic:'🛡️', t:'Escudo Casa',            sub:'15% off no seguro multirriscos',    custo:800  },
  { ic:'🎁', t:'Pack Premium 1 mês',     sub:'AI Expert + relatórios ilimitados', custo:1500 },
  { ic:'⚡', t:'Revisão elétrica grátis',sub:'Técnico certificado em casa',       custo:2500 },
]

export default function ScoreDetailScreen({ onBack, onNavigateServicos }) {
  const { pessoa_id }    = useAuth()
  const { imovelAtivoId } = useImovelAtivo()

  const [loading, setLoading]           = useState(true)
  const [score, setScore]               = useState(null) // null = sem dados
  const [nivel, setNivel]               = useState('bronze')
  const [pontosTotal, setPontosTotal]   = useState(0)
  const [pontosSemana, setPontosSemana] = useState(0)
  const [streakDias, setStreakDias]     = useState(0)
  const [recordeStreak, setRecorde]     = useState(0)
  const [sistemasScores, setSistemas]   = useState({})

  useEffect(() => {
    let active = true
    async function load() {
      // Reset ao mudar de imóvel
      setScore(null)
      setSistemas({})
      setLoading(true)

      try {
        // Subscrição e pontos (filtrados por pessoa_id via RLS)
        const [subRes, ptsRes] = await Promise.all([
          supa.from('subscricoes')
            .select('pontos_total,nivel,streak_atual,streak_dias,streak_recorde,preco_mensal')
            .eq('pessoa_id', pessoa_id).eq('estado','ativo').maybeSingle(),
          supa.from('pontos_historico')
            .select('pontos').eq('pessoa_id', pessoa_id)
            .gte('data', new Date(Date.now() - 7 * 86400000).toISOString()),
        ])

        if (subRes.data && active) {
          const d = subRes.data
          setPontosTotal(Number(d.pontos_total || 0))
          setNivel(d.nivel || 'bronze')
          setStreakDias(Number(d.streak_dias || d.streak_atual || 0))
          setRecorde(Number(d.streak_recorde || 0))
        }
        if (active) {
          setPontosSemana((ptsRes.data || []).reduce((s, r) => s + Math.max(0, Number(r.pontos || 0)), 0))
        }

        // Score do imóvel activo — só carrega se existir imóvel
        if (imovelAtivoId) {
          const { data: loc } = await supa
            .from('localizacoes')
            .select('home_score,score_avac,score_canaliz,score_eletrica,score_estrutura,score_agua')
            .eq('id', imovelAtivoId)
            .maybeSingle()

          if (loc && active) {
            // home_score pode ser 0 (válido) — só null/undefined → sem dados
            const s = loc.home_score
            setScore(s != null ? Number(s) : null)
            setSistemas({
              score_avac:      loc.score_avac      != null ? Number(loc.score_avac)      : null,
              score_canaliz:   loc.score_canaliz   != null ? Number(loc.score_canaliz)   : null,
              score_eletrica:  loc.score_eletrica  != null ? Number(loc.score_eletrica)  : null,
              score_estrutura: loc.score_estrutura != null ? Number(loc.score_estrutura) : null,
              score_agua:      loc.score_agua      != null ? Number(loc.score_agua)      : null,
            })
          }
        }
      } catch (_) {
        /* mantém estado null — empty state mostra */
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [imovelAtivoId, pessoa_id])

  /* nível derivado */
  const nivelIdx      = NIVEL_ORDEM.indexOf(nivel)
  const nivelSafe     = nivelIdx === -1 ? 0 : nivelIdx
  const proximoIdx    = Math.min(nivelSafe + 1, NIVEL_ORDEM.length - 1)
  const proximoNivel  = NIVEL_LABELS[NIVEL_ORDEM[proximoIdx]]
  const threshAtual   = NIVEL_THRESH[NIVEL_ORDEM[nivelSafe]]
  const threshProximo = NIVEL_THRESH[NIVEL_ORDEM[proximoIdx]]
  const faltam        = Math.max(0, threshProximo - pontosTotal)
  const progressoPct  = threshProximo > threshAtual
    ? Math.min(100, Math.round(((pontosTotal - threshAtual) / (threshProximo - threshAtual)) * 100))
    : 100

  function scoreColor(s) {
    if (s > 70) return V.green
    if (s >= 50) return V.amber
    return V.red
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:V.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:13, color:V.muted }}>A carregar…</div>
      </div>
    )
  }

  // Empty state — sem imóvel activo OU sem score calculado ainda
  if (score === null) {
    return (
      <div style={{ minHeight:'100vh', background:V.bg }}>
        <div style={{ background:`linear-gradient(145deg,${V.green},${V.greenMid})`, padding:'12px 16px 22px' }}>
          <div style={{ fontSize:10, opacity:.7, cursor:'pointer', color:'#fff', marginBottom:10 }} onClick={onBack}>
            ← Início
          </div>
          <div style={{ fontSize:10, color:V.greenLt, fontWeight:700, letterSpacing:.8 }}>A MINHA CASA SAUDÁVEL</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'48px 24px' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🏠</div>
          <div style={{ fontSize:17, fontWeight:700, color:V.text, marginBottom:10, fontFamily:'Georgia,serif' }}>
            Ainda sem dados da tua casa
          </div>
          <div style={{ fontSize:13, color:V.slate, lineHeight:1.7, marginBottom:28, maxWidth:280 }}>
            Ainda não temos dados suficientes da tua casa.
            Começa a registar serviços e o score aparece aqui.
          </div>
          <button
            onClick={onNavigateServicos || onBack}
            style={{
              background:`linear-gradient(135deg,${V.green},${V.greenMid})`,
              color:'#fff', border:'none', borderRadius:12,
              padding:'13px 24px', fontSize:14, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
            }}
          >
            Adicionar primeiro serviço
          </button>
        </div>
      </div>
    )
  }

  /* score real — renderizar UI completo */
  const dashOffset = Math.round(239 * (1 - score / 100))

  return (
    <div style={{ minHeight:'100vh', background:V.bg, paddingBottom:40, overflowY:'auto' }}>

      {/* Section 1 — Hero verde */}
      <div style={{ background:`linear-gradient(145deg,${V.green},${V.greenMid})`, padding:'12px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, opacity:.7, cursor:'pointer', marginBottom:10 }} onClick={onBack}>← Início</div>
        <div style={{ fontSize:10, color:V.greenLt, fontWeight:700, letterSpacing:.8, marginBottom:12 }}>A MINHA CASA SAUDÁVEL</div>

        {/* Score central */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14 }}>
          <div style={{ position:'relative', width:90, height:90 }}>
            <svg width="90" height="90" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="45" cy="45" r="38" stroke="rgba(255,255,255,.15)" strokeWidth="6" fill="none"/>
              <circle cx="45" cy="45" r="38" stroke={V.greenLt} strokeWidth="6" fill="none"
                strokeDasharray="239" strokeDashoffset={dashOffset} strokeLinecap="round"/>
            </svg>
            <div style={{ position:'absolute', top:0, left:0, width:90, height:90, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontSize:30, fontWeight:700, lineHeight:1 }}>{score}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.6)' }}>/100</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.7)' }}>Nível atual</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>{NIVEL_DISPLAY[nivelSafe][0]} {NIVEL_LABELS[nivel] || nivel}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.65)', marginTop:2 }}>{faltam} pts p/ {proximoNivel} 🏆</div>
          </div>
        </div>

        {/* Evolução */}
        <div style={{ background:'rgba(0,0,0,.2)', borderRadius:12, padding:'10px 12px' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.6)', fontWeight:700, letterSpacing:.5, marginBottom:8 }}>A TUA EVOLUÇÃO</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative' }}>
            <div style={{ position:'absolute', top:10, left:'10%', right:'10%', height:2, background:'rgba(255,255,255,.15)' }}/>
            <div style={{ position:'absolute', top:10, left:'10%', width:`${nivelSafe * 25}%`, height:2, background:V.greenLt }}/>
            {NIVEL_DISPLAY.map(([ic, l], i) => (
              <div key={l} style={{ display:'flex', flexDirection:'column', alignItems:'center', zIndex:1, flex:1 }}>
                <div style={{ fontSize:20, marginBottom:3, opacity:i <= nivelSafe ? 1 : .4 }}>{ic}</div>
                <div style={{ fontSize:8, color:i === nivelSafe ? V.greenLt : 'rgba(255,255,255,.5)', fontWeight:i === nivelSafe ? 700 : 400 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'rgba(255,255,255,.1)', borderRadius:4, height:6, marginTop:10, overflow:'hidden' }}>
            <div style={{ width:`${progressoPct}%`, height:6, background:V.greenLt }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:9, color:'rgba(255,255,255,.6)' }}>
            <span>{pontosTotal.toLocaleString('pt-PT')} / {threshProximo.toLocaleString('pt-PT')} pts</span>
            <span>{NIVEL_LABELS[nivel] || nivel}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:'10px 12px 0' }}>
        <div style={{ background:'#fff', border:`1px solid ${V.border}`, borderRadius:12, padding:'10px 12px' }}>
          <div style={{ fontSize:9, color:V.muted, textTransform:'uppercase', letterSpacing:.3, marginBottom:3 }}>Pontos total</div>
          <div style={{ fontSize:22, fontWeight:700, color:V.gold }}>⭐ {pontosTotal.toLocaleString('pt-PT')}</div>
          <div style={{ fontSize:10, color:V.slate, marginTop:2 }}>+{pontosSemana} esta semana</div>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${V.border}`, borderRadius:12, padding:'10px 12px' }}>
          <div style={{ fontSize:9, color:V.muted, textTransform:'uppercase', letterSpacing:.3, marginBottom:3 }}>Sequência</div>
          <div style={{ fontSize:22, fontWeight:700, color:V.coral }}>🔥 {streakDias} dias</div>
          <div style={{ fontSize:10, color:V.slate, marginTop:2 }}>Recorde: {recordeStreak} dias</div>
        </div>
      </div>

      {/* Detalhe por sistema */}
      <div style={{ padding:'14px 12px 4px', fontSize:9, color:V.muted, textTransform:'uppercase', letterSpacing:.4, fontWeight:700 }}>Detalhe por sistema da casa</div>
      <div style={{ padding:'0 12px' }}>
        {SISTEMAS.map((s) => {
          const val = sistemasScores[s.field] ?? 0
          const col = scoreColor(val)
          return (
            <div key={s.field} style={{ background:'#fff', border:`1px solid ${V.border}`, borderRadius:12, padding:'11px 13px', marginBottom:7, cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <div style={{ fontSize:22 }}>{s.ic}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700 }}>{s.nome}</div>
                  <div style={{ fontSize:10, color:V.slate, marginTop:2 }}>{s.nota}</div>
                </div>
                <div style={{ fontSize:22, fontWeight:700, color:col }}>{val || '—'}</div>
              </div>
              <div style={{ height:4, background:V.border, borderRadius:2, overflow:'hidden' }}>
                <div style={{ width:`${val}%`, height:4, background:col }}/>
              </div>
            </div>
          )
        })}
      </div>

      {/* Prémios */}
      <div style={{ padding:'14px 12px 4px', fontSize:9, color:V.muted, textTransform:'uppercase', letterSpacing:.4, fontWeight:700 }}>Prémios disponíveis</div>
      <div style={{ padding:'0 12px 14px' }}>
        {PREMIOS.map((p, i) => {
          const locked = pontosTotal < p.custo
          return (
            <div key={i}
              style={{ background:locked ? V.bg : '#fff', border:`1px solid ${locked ? V.border : V.gold}`, borderRadius:12, padding:'11px 13px', marginBottom:7, display:'flex', alignItems:'center', gap:11, opacity:locked ? .6 : 1, cursor:locked ? 'default' : 'pointer' }}
              onClick={locked ? undefined : () => window.alert(`Trocar ${p.custo} pontos por ${p.t}?`)}
            >
              <div style={{ fontSize:28 }}>{p.ic}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{p.t}</div>
                <div style={{ fontSize:10, color:V.slate, marginTop:1 }}>{p.sub}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:12, fontWeight:700, color:V.gold }}>⭐ {p.custo}</div>
                <div style={{ fontSize:9, color:locked ? V.muted : V.greenLt, fontWeight:600, marginTop:2 }}>{locked ? 'Bloqueado' : 'Resgatar'}</div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
