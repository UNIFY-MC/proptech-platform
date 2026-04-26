import React from 'react'

const G = '#1B4332'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', red:'#DC2626', redLt:'#FEF2F2', redBd:'#FECACA',
            amber:'#D97706', amberLt:'#FFFBEB', amberBd:'#FDE68A' }

const TIPOS = [
  {
    id: 'inundacao',
    emoji: '💧',
    titulo: 'Inundação / Fuga de água',
    sub: 'Canalização · urgência máxima',
    tempo: '~30 min',
    cor: '#1D4ED8', corLt: '#EFF6FF', corBd: '#BFDBFE',
  },
  {
    id: 'caldeira',
    emoji: '🔥',
    titulo: 'Caldeira avariada',
    sub: 'Sem aquecimento ou água quente',
    tempo: '~45 min',
    cor: '#D97706', corLt: '#FFFBEB', corBd: '#FDE68A',
  },
  {
    id: 'eletrica',
    emoji: '⚡',
    titulo: 'Avaria eléctrica',
    sub: 'Sem luz · quadro disparado · cheiro a queimado',
    tempo: '~30 min',
    cor: '#7C3AED', corLt: '#F5F3FF', corBd: '#DDD6FE',
  },
]

export default function EmergenciaScreen({ onBack, onPedirEmergencia }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

      {/* Header urgência */}
      <div style={{ background:`linear-gradient(145deg,${C.red},#B91C1C)`, padding:'14px 16px 24px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>🚨</span>
          <div>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:'Georgia,serif' }}>Emergência</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', marginTop:2 }}>Resposta prioritária · técnico em trânsito em minutos</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>

        {/* Aviso 112 */}
        <div style={{ background:C.redLt, border:`1px solid ${C.redBd}`, borderRadius:12, padding:'12px 14px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
          <div style={{ fontSize:12, color:C.red, lineHeight:1.55 }}>
            <b>Risco de vida ou fogo?</b> Liga imediatamente para o <b>112</b>.<br/>
            Esta funcionalidade é para urgências técnicas, não para emergências com risco pessoal.
          </div>
        </div>

        {/* Tipos de emergência */}
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>
          Selecciona o tipo de emergência
        </div>

        {TIPOS.map(t => (
          <div
            key={t.id}
            onClick={() => onPedirEmergencia ? onPedirEmergencia(t) : alert(`Emergência "${t.titulo}" — serviço a construir`)}
            style={{
              background:C.white, border:`1px solid ${C.border}`, borderRadius:14,
              padding:'16px', marginBottom:10, cursor:'pointer',
              display:'flex', alignItems:'center', gap:14,
            }}
          >
            <div style={{
              width:48, height:48, borderRadius:12, flexShrink:0,
              background:t.corLt, border:`1px solid ${t.corBd}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
            }}>
              {t.emoji}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>{t.titulo}</div>
              <div style={{ fontSize:11, color:C.stone, marginTop:2 }}>{t.sub}</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:10, color:C.stone }}>est.</div>
              <div style={{ fontSize:13, fontWeight:700, color:t.cor }}>{t.tempo}</div>
            </div>
          </div>
        ))}

        {/* Nota preços */}
        <div style={{ background:C.amberLt, border:`1px solid ${C.amberBd}`, borderRadius:10, padding:'10px 14px', marginTop:4, fontSize:11.5, color:C.amber, lineHeight:1.5 }}>
          💰 <b>Tarifa de urgência</b> aplicada fora de horário normal (20h–8h e fins de semana). Preço confirmado antes da deslocação.
        </div>

      </div>
    </div>
  )
}
