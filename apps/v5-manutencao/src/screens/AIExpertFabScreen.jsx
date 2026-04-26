import React, { useState, useRef, useEffect } from 'react'

const G = '#1B4332'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', indigo:'#4F46E5', indigoLt:'#EEF2FF', indigoBd:'#C7D2FE' }

const CHIPS = [
  'Caldeira a fazer barulho',
  'Quando devo pintar o exterior?',
  'Cheiro a humidade na casa de banho',
  'Radiador não aquece',
  'Tomada com faíscas',
  'Jardim amarelo no verão',
]

const RESPOSTAS_MOCK = {
  'caldeira': 'Barulho na caldeira pode indicar ar no circuito, bomba desgastada ou depósitos de calcário. Recomendo revisão anual preventiva — um técnico de manutenção pode fazer o diagnóstico em ~45 min.',
  'pintar': 'Fachadas exteriores resistem em média 8–12 anos com tinta de qualidade. Os sinais de necessidade de repintura são: fissuras, descascamento ou manchas de humidade visíveis. Faço-te um orçamento?',
  'humidade': 'Cheiro a humidade em WC pode ser condensação (ventilação insuficiente) ou infiltração. O primeiro passo é verificar a extracção de ar e as juntas do duche/banheira. Serviço de diagnóstico disponível.',
  'radiador': 'Radiador frio normalmente precisa de purga de ar. É uma operação simples (10 min) que qualquer técnico de canalização executa. Quer agendar?',
  'faíscas': 'Tomada com faíscas é risco eléctrico — deve ser inspeccionada com urgência. Até lá, não uses essa tomada. Posso enviar um electricista hoje.',
  'jardim': 'Jardim amarelo no verão geralmente indica rega insuficiente ou solo demasiado compactado. Um técnico de jardim pode avaliar o sistema de rega e recomendar melhorias.',
  'default': 'Obrigado pela tua pergunta. Baseado no que descreves, recomendo uma visita de diagnóstico para avaliar melhor a situação. Queres que te sugira o serviço mais adequado?',
}

function getMockResposta(texto) {
  const t = texto.toLowerCase()
  if (t.includes('caldeira') || t.includes('barulho')) return RESPOSTAS_MOCK.caldeira
  if (t.includes('pint')) return RESPOSTAS_MOCK.pintar
  if (t.includes('humidade') || t.includes('cheiro')) return RESPOSTAS_MOCK.humidade
  if (t.includes('radiador') || t.includes('aquece')) return RESPOSTAS_MOCK.radiador
  if (t.includes('faísc') || t.includes('tomada') || t.includes('eléctric')) return RESPOSTAS_MOCK.faíscas
  if (t.includes('jardim') || t.includes('amarelo')) return RESPOSTAS_MOCK.jardim
  return RESPOSTAS_MOCK.default
}

export default function AIExpertFabScreen({ onBack }) {
  const [msgs, setMsgs] = useState([
    { de:'ai', t:'Olá! Sou o AI Expert da tua casa. Descreve o que está a acontecer e dou-te uma recomendação concreta.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [msgs])

  function enviar(texto) {
    const txt = (texto || input).trim()
    if (!txt) return
    setInput('')
    setMsgs(m => [...m, { de:'user', t:txt }])
    setLoading(true)
    setTimeout(() => {
      setMsgs(m => [...m, { de:'ai', t:getMockResposta(txt) }])
      setLoading(false)
    }, 900)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(145deg,${C.indigo},#3730A3)`, padding:'14px 16px 18px', color:'#fff', flexShrink:0 }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🤖</div>
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>AI Expert</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:1 }}>Responde sobre a tua casa · MVP demo</div>
          </div>
        </div>
      </div>

      {/* Chips sugestão */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:'10px 12px', display:'flex', gap:6, overflowX:'auto', flexShrink:0 }}>
        {CHIPS.map(ch => (
          <button key={ch} onClick={() => enviar(ch)} style={{
            background:C.indigoLt, border:`1px solid ${C.indigoBd}`, borderRadius:20,
            padding:'5px 12px', fontSize:11, color:C.indigo, fontWeight:600,
            cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
          }}>{ch}</button>
        ))}
      </div>

      {/* Mensagens */}
      <div style={{ flex:1, padding:'14px 14px 0', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.map((m, i) => {
          const isAI = m.de === 'ai'
          return (
            <div key={i} style={{ display:'flex', justifyContent: isAI ? 'flex-start' : 'flex-end', gap:8 }}>
              {isAI && (
                <div style={{ width:28, height:28, borderRadius:8, background:C.indigo, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🤖</div>
              )}
              <div style={{
                maxWidth:'78%', borderRadius: isAI ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                background: isAI ? C.white : C.indigo,
                border: isAI ? `1px solid ${C.border}` : 'none',
                color: isAI ? C.ink : '#fff',
                padding:'10px 13px', fontSize:13, lineHeight:1.55,
              }}>
                {m.t}
              </div>
            </div>
          )
        })}
        {loading && (
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:C.indigo, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🤖</div>
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:'4px 14px 14px 14px', padding:'10px 14px' }}>
              <div style={{ display:'flex', gap:4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:C.slate, animation:'blink 1.2s infinite', animationDelay:`${i*0.2}s` }}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ background:C.white, borderTop:`1px solid ${C.border}`, padding:'10px 12px 24px', flexShrink:0, display:'flex', gap:8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enviar()}
          placeholder="Descreve o problema da casa…"
          style={{
            flex:1, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px',
            fontSize:13, outline:'none', color:C.ink, background:'#f8fafc',
          }}
        />
        <button
          onClick={() => enviar()}
          disabled={!input.trim()}
          style={{
            width:40, height:40, borderRadius:10, flexShrink:0,
            background: input.trim() ? C.indigo : C.line,
            border:'none', cursor: input.trim() ? 'pointer' : 'default',
            color:'#fff', fontSize:18,
          }}
        >→</button>
      </div>

    </div>
  )
}
