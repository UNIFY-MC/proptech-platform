import React, { useState } from 'react'
import { useImovelAtivo } from '../lib/ImovelAtivoContext.jsx'
import { ganharPontos } from '../lib/gamification.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', gold:'#D4A72C', goldLt:'#FFF4D6' }

const PERGUNTAS = [
  {
    titulo: 'Que tipo de habitação tens?',
    sub: 'Ajuda-nos a calibrar as recomendações',
    opcoes: [
      { label:'🏠 Moradia', val:'moradia' },
      { label:'🏢 Apartamento', val:'apartamento' },
      { label:'🏘 Geminada', val:'geminada' },
      { label:'🏡 Quinta / Herdade', val:'quinta' },
    ],
  },
  {
    titulo: 'Qual a idade aproximada da casa?',
    sub: 'Casas mais antigas têm necessidades diferentes',
    opcoes: [
      { label:'< 5 anos',    val:'0-5' },
      { label:'5 – 15 anos', val:'5-15' },
      { label:'15 – 30 anos',val:'15-30' },
      { label:'> 30 anos',   val:'30+' },
    ],
  },
  {
    titulo: 'Que equipamentos AVAC tens?',
    sub: 'Selecciona os que existem na tua casa',
    multi: true,
    opcoes: [
      { label:'🔥 Caldeira a gás', val:'caldeira' },
      { label:'❄️ Ar condicionado', val:'ac' },
      { label:'🌀 Bomba de calor',  val:'bomba' },
      { label:'♨️ Aquecimento central', val:'central' },
    ],
  },
]

const N = PERGUNTAS.length

export default function HomeAssessmentScreen({ onBack, onConcluido }) {
  const { imovelAtivo, refetch } = useImovelAtivo()
  const [step,     setStep]   = useState(0)
  const [respostas,setR]      = useState({})
  const [done,     setDone]   = useState(false)
  const [saving,   setSaving] = useState(false)
  const [novoScore,setNovoScore] = useState(null)

  const q   = PERGUNTAS[step]
  const sel = respostas[step] || (q?.multi ? [] : null)

  function toggleOpc(val) {
    if (!q.multi) {
      setR(prev => ({ ...prev, [step]: val }))
    } else {
      setR(prev => {
        const arr = prev[step] || []
        return { ...prev, [step]: arr.includes(val) ? arr.filter(v=>v!==val) : [...arr, val] }
      })
    }
  }

  async function avancar() {
    if (step < N - 1) { setStep(s => s + 1); return }
    // Last question answered — save + award points
    setSaving(true)
    await ganharPontos(DEMO_PESSOA_ID, 300, 'Avaliação da casa concluída')
    await refetch()
    const score = imovelAtivo?.home_score ?? null
    setNovoScore(score)
    setSaving(false)
    setDone(true)
  }

  const pct = Math.round(((step + 1) / N) * 100)
  const temResposta = q?.multi ? (sel || []).length > 0 : sel !== null

  if (done) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:20 }}>🏠</div>
        <div style={{ fontSize:24, fontWeight:700, fontFamily:'Georgia,serif', color:C.ink, marginBottom:8 }}>Avaliação concluída!</div>
        <div style={{ fontSize:14, color:C.slate, marginBottom:16, lineHeight:1.6 }}>
          O teu Home Score foi actualizado.<br/>Ganhaste <b style={{ color:C.gold }}>+300 pts</b>!
        </div>
        {novoScore != null && (
          <div style={{ background:C.goldLt, border:`1px solid ${C.gold}44`, borderRadius:14, padding:'16px 24px', marginBottom:24 }}>
            <div style={{ fontSize:32, fontWeight:800, color:G }}>{novoScore}</div>
            <div style={{ fontSize:12, color:C.slate }}>HOME SCORE</div>
          </div>
        )}
        <button onClick={onConcluido || onBack} style={{
          padding:'13px 32px', borderRadius:10, background:G, color:'#fff',
          border:'none', fontSize:14, fontWeight:700, cursor:'pointer',
        }}>Ver Home Score →</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:100 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 20px', color:'#fff' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <div onClick={onBack} style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer' }}>← Sair</div>
          <div style={{ flex:1, fontSize:12, fontWeight:600, textAlign:'center' }}>
            Pergunta {step + 1} de {N}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.7)' }}>+300 pts</div>
        </div>
        <div style={{ height:5, background:'rgba(255,255,255,.2)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#FFD166,#FFA94D)', borderRadius:3, transition:'width .4s' }}/>
        </div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ fontSize:20, fontWeight:700, fontFamily:'Georgia,serif', color:C.ink, marginBottom:6, lineHeight:1.3 }}>{q.titulo}</div>
        <div style={{ fontSize:13, color:C.slate, marginBottom:20 }}>{q.sub}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {q.opcoes.map(opc => {
            const activo = q.multi ? (sel||[]).includes(opc.val) : sel === opc.val
            return (
              <button
                key={opc.val}
                onClick={() => toggleOpc(opc.val)}
                style={{
                  width:'100%', padding:'14px 16px', borderRadius:12,
                  background: activo ? C.greenXl : C.white,
                  border: `2px solid ${activo ? GL : C.border}`,
                  fontSize:15, fontWeight: activo ? 700 : 500, color:C.ink,
                  cursor:'pointer', textAlign:'left', transition:'all .15s',
                }}
              >{opc.label}</button>
            )
          })}
        </div>
      </div>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto',
        padding:'12px 16px 24px', background:C.white, borderTop:`1px solid ${C.border}`,
        display:'flex', gap:8,
      }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s-1)} style={{
            padding:'12px 20px', borderRadius:10, background:C.bg, border:`1px solid ${C.border}`,
            fontSize:13, fontWeight:600, color:C.slate, cursor:'pointer',
          }}>← Voltar</button>
        )}
        <button
          onClick={avancar}
          disabled={!temResposta || saving}
          style={{
            flex:1, padding:13, borderRadius:10,
            background: temResposta && !saving ? G : C.border,
            border:'none', fontSize:14, fontWeight:700, color:'#fff',
            cursor: temResposta && !saving ? 'pointer' : 'default',
            transition:'background .15s',
          }}
        >
          {saving ? 'A guardar...' : step < N - 1 ? 'Continuar →' : 'Concluir →'}
        </button>
      </div>
    </div>
  )
}
