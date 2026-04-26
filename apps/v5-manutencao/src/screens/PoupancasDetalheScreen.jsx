import React, { useState } from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = {
  ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
  line:'#E5E7EB', stone:'#6B7685', gold:'#D4A72C', goldLt:'#FFF4D6',
  greenXl:'#D8F3DC', greenLt:'#52B788', amber:'#D97706', amberLt:'#FFFBEB',
}

// TODO(mario Fase 5): query real → fn_calc_poupancas(pessoa_id)
//   SELECT SUM(preco_normal - preco_pago) FROM ordens_trabalho
//   WHERE pessoa_id=X AND EXTRACT(YEAR FROM criado_em)=2026

export default function PoupancasDetalheScreen({ onBack, onNavigateCombo }) {
  const [dados] = useState(null)

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 24px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>POUPANÇAS 2026</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>💰 Poupanças este ano</div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        {dados === null ? (
          <div style={{ textAlign:'center', padding:'40px 16px' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🌱</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.ink, marginBottom:10 }}>
              Ainda sem poupanças registadas
            </div>
            <div style={{ fontSize:13, color:C.slate, lineHeight:1.6, marginBottom:28, maxWidth:280, margin:'0 auto 28px' }}>
              As tuas poupanças vão aparecer aqui assim que começares a usar a plataforma. Cada serviço contratado conta.
            </div>
            <button
              onClick={() => onNavigateCombo?.({})}
              style={{
                background:G, color:'#fff', border:'none', borderRadius:12,
                padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer',
              }}
            >
              Ver pacotes →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
