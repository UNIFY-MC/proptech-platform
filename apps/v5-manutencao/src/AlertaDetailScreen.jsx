import React, { useState } from 'react'
import { MOCK_ALERTAS_ENRIQUECIDOS } from './data/mock.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = {
  ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
  greenLt:'#52B788', greenXl:'#D8F3DC',
}

export default function AlertaDetailScreen({ alerta, onBack, onPedirTecnico, onNavigateOrcamento }) {
  const [alertas, setAlertas] = useState(MOCK_ALERTAS_ENRIQUECIDOS)

  function handleAcao(a, acao) {
    switch (acao.action) {
      case 'pedir_servico':
        onNavigateOrcamento ? onNavigateOrcamento() : onPedirTecnico?.()
        break
      case 'marcar_verificado':
        setAlertas(prev => prev.filter(x => x.id !== a.id))
        break
      case 'ai_expert':
        // TODO(mario 3.3.14): abrir chat IA com contexto do alerta
        alert('Chat IA disponível em breve')
        break
      case 'tutorial':
        // TODO(mario 3.3.14): abrir tutorial inline
        alert('Tutorial disponível em breve')
        break
      case 'ver_equipamento':
        // TODO(mario 3.3.14): navegar para detalhe do equipamento
        alert('Detalhe de equipamento disponível em breve')
        break
      default:
        break
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>

      {/* ── Header gradiente verde ── */}
      <div style={{ background:`linear-gradient(135deg,${G},${GM})`, padding:'12px 14px 18px', color:'#fff' }}>
        <div style={{ fontSize:10, opacity:.7, cursor:'pointer', marginBottom:10 }} onClick={onBack}>← Casa</div>
        <div style={{ fontSize:10, color:C.greenLt, fontWeight:700, letterSpacing:.6, marginBottom:4 }}>
          🔔 ALERTAS INTELIGENTES · {alertas.length} ACTIVOS
        </div>
        <div style={{ fontSize:19, fontWeight:700, fontFamily:'Georgia,serif', lineHeight:1.2 }}>
          A tua casa tem coisas a dizer-te
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.75)', marginTop:4 }}>
          Alertas em linguagem simples · acção com 1 toque
        </div>
      </div>

      {/* ── Cards de alertas ── */}
      <div style={{ padding:'12px 12px 0' }}>
        {alertas.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>Tudo em ordem!</div>
            <div style={{ fontSize:12, color:C.slate, marginTop:4 }}>Sem alertas activos neste momento.</div>
          </div>
        ) : alertas.map(a => (
          <div key={a.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`4px solid ${a.cor}`, borderRadius:12, padding:'13px 14px', marginBottom:9 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ fontSize:20 }}>{a.emoji}</div>
              <div style={{ fontSize:9, padding:'3px 8px', borderRadius:5, background:a.cor_bg, color:a.cor, fontWeight:700, letterSpacing:.3 }}>{a.nivel}</div>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:5, lineHeight:1.3 }}>{a.titulo}</div>
            <div style={{ fontSize:11, color:C.slate, lineHeight:1.6, marginBottom:10 }}>{a.descricao}</div>
            <div style={{ display:'flex', gap:7 }}>
              {a.acoes.map((acao, j) => (
                <button
                  key={j}
                  onClick={() => handleAcao(a, acao)}
                  style={{
                    flex:1, padding:'8px 10px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
                    border: j === 0 ? 'none' : `1px solid ${C.border}`,
                    background: j === 0 ? a.cor : C.white,
                    color: j === 0 ? '#fff' : C.ink,
                  }}
                >
                  {acao.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer IA ── */}
      <div style={{ margin:'4px 12px 14px', background:C.bg, borderRadius:11, padding:'10px 12px', display:'flex', gap:8, alignItems:'center' }}>
        <div style={{ fontSize:18 }}>🤖</div>
        <div style={{ fontSize:10.5, color:C.slate, lineHeight:1.4, flex:1 }}>A IA monitoriza a tua casa 24/7 e só te avisa quando vale a pena. Sem ruído.</div>
      </div>

    </div>
  )
}
