import React from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', gold:'#D4A72C', goldLt:'#FFF4D6',
            greenXl:'#D8F3DC', greenLt:'#52B788', coral:'#E76F51' }

// TODO(mario Fase 5): missões reais via BD (tabela missoes_utilizador + tipos de missão configuráveis)
const MISSOES_SEMANA = [
  { id:1, emoji:'⚡', titulo:'Adiciona 1 fatura de energia',      sub:'Liga um documento de energia à tua casa', recompensa:50,  concluida:false, action:'adicionar_energia' },
  { id:2, emoji:'📸', titulo:'Tira foto à tua caldeira',          sub:'Regista o estado actual do equipamento',   recompensa:30,  concluida:false, action:'adicionar_camara' },
  { id:3, emoji:'🏠', titulo:'Completa a ficha de 1 imóvel',      sub:'Preenche área, tipologia e ano',           recompensa:100, concluida:true,  action:'moradas' },
  { id:4, emoji:'🔧', titulo:'Agenda uma revisão de caldeira',    sub:'Recomendação para o teu equipamento',      recompensa:80,  concluida:false, action:'servico_caldeira' },
  { id:5, emoji:'📄', titulo:'Faz upload do seguro multirriscos', sub:'Mantém os teus documentos actualizados',   recompensa:60,  concluida:false, action:'adicionar_doc' },
]

const concluidas = MISSOES_SEMANA.filter(m => m.concluida).length
const totalPts   = MISSOES_SEMANA.filter(m => !m.concluida).reduce((s, m) => s + m.recompensa, 0)

export default function MissoesScreen({ onBack, onNavigateAction }) {
  function handleAction(action) {
    if (onNavigateAction) onNavigateAction(action)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 24px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>GAMIFICAÇÃO</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>🎯 Missões da semana</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>Ganha pontos · sobe de nível · desbloqueia recompensas</div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>

        {/* Progress */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{concluidas}/{MISSOES_SEMANA.length} concluídas</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.gold }}>+{totalPts} pts disponíveis</div>
          </div>
          <div style={{ height:6, background:C.greenXl, borderRadius:3, overflow:'hidden' }}>
            <div style={{ width:`${(concluidas/MISSOES_SEMANA.length)*100}%`, height:6, background:`linear-gradient(90deg,${C.greenLt},${G})`, borderRadius:3, transition:'width 0.4s ease' }}/>
          </div>
          <div style={{ fontSize:10, color:C.slate, marginTop:6 }}>
            Próximo nível em {Math.max(0, 500 - concluidas * 70)} pts · esta semana termina domingo
          </div>
        </div>

        {/* Lista missões */}
        {MISSOES_SEMANA.map(m => (
          <div
            key={m.id}
            onClick={() => !m.concluida && handleAction(m.action)}
            style={{
              background:C.white, border:`1px solid ${m.concluida ? C.greenXl : C.border}`,
              borderRadius:12, padding:'12px 14px', marginBottom:8,
              display:'flex', alignItems:'center', gap:12,
              cursor: m.concluida ? 'default' : 'pointer',
              opacity: m.concluida ? 0.7 : 1,
            }}
          >
            <div style={{
              width:44, height:44, borderRadius:12, flexShrink:0, fontSize:22,
              background: m.concluida ? C.greenXl : C.bg,
              border:`1px solid ${m.concluida ? C.greenLt : C.border}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {m.concluida ? '✅' : m.emoji}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color: m.concluida ? C.slate : C.ink }}>{m.titulo}</div>
              <div style={{ fontSize:10, color:C.slate, marginTop:2 }}>{m.sub}</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              {m.concluida
                ? <div style={{ fontSize:11, color:C.greenLt, fontWeight:700 }}>✓ Feito</div>
                : <div style={{ fontSize:12, fontWeight:700, color:C.gold, background:C.goldLt, padding:'4px 9px', borderRadius:8 }}>+{m.recompensa}</div>
              }
            </div>
          </div>
        ))}

        {/* Rodapé info */}
        <div style={{ background:C.goldLt, border:`1px solid ${C.gold}44`, borderRadius:12, padding:'12px 14px', marginTop:8, fontSize:11.5, color:'#8C6508', lineHeight:1.55 }}>
          🏆 Ao completar todas as missões ganhas um <b>bónus de 100 pts</b> e um desconto especial na próxima semana.
        </div>

      </div>
    </div>
  )
}
