import React, { useState } from 'react'
import { MOCK } from '../data/mock.js'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', greenLt:'#52B788' }

const TIPO_COLOR = {
  urgente: { border:'#E76F51', bg:'#FFF7F5' },
  info:    { border:'#3B82F6', bg:'#F0F7FF' },
  sucesso: { border:'#52B788', bg:'#F0FDF4' },
}

export default function NotificacoesScreen({ onBack }) {
  const [notifs, setNotifs] = useState(MOCK.notificacoes)
  const [tabAtivo, setTab] = useState('todas')

  const naoLidas = notifs.filter(n => !n.lido).length
  const lista    = tabAtivo === 'nao_lidas' ? notifs.filter(n => !n.lido) : notifs

  function marcarTodas() {
    setNotifs(prev => prev.map(n => ({ ...n, lido:true })))
    // TODO(mario): actualizar em BD (Fase 3.3.9)
  }

  function marcarLida(id) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lido:true } : n))
    // TODO(mario): actualizar em BD (Fase 3.3.9)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>APP</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Notificações</div>
          {naoLidas > 0 && (
            <button onClick={marcarTodas} style={{
              background:'rgba(255,255,255,.15)', color:'#fff', border:'none',
              borderRadius:8, padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer',
            }}>Marcar todas lidas</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, display:'flex', padding:'0 16px' }}>
        {[
          { id:'todas',      l:'Todas' },
          { id:'nao_lidas',  l:`Não lidas${naoLidas > 0 ? ` (${naoLidas})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'10px 4px', background:'none', border:'none', cursor:'pointer',
            fontSize:13, fontWeight: tabAtivo===t.id ? 700 : 500,
            color: tabAtivo===t.id ? G : C.slate,
            borderBottom: tabAtivo===t.id ? `2.5px solid ${G}` : '2.5px solid transparent',
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding:'10px 16px' }}>
        {lista.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center', marginTop:8 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔔</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>Tudo em dia</div>
            <div style={{ fontSize:12, color:C.slate, marginTop:4 }}>Sem notificações não lidas</div>
          </div>
        ) : lista.map(n => {
          const tc = TIPO_COLOR[n.tipo] || TIPO_COLOR.info
          return (
            <div
              key={n.id}
              onClick={() => marcarLida(n.id)}
              style={{
                background: n.lido ? C.white : tc.bg,
                border:`1px solid ${C.border}`,
                borderLeft:`4px solid ${tc.border}`,
                borderRadius:12, padding:'12px 14px', marginBottom:8,
                cursor:'pointer', display:'flex', gap:12, alignItems:'flex-start',
              }}
            >
              <span style={{ fontSize:20, flexShrink:0 }}>{n.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight: n.lido ? 600 : 700, color:C.ink }}>{n.titulo}</div>
                <div style={{ fontSize:11, color:C.slate, marginTop:2, lineHeight:1.4 }}>{n.sub}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                <div style={{ fontSize:10, color:C.slate }}>{n.tempo}</div>
                {!n.lido && <div style={{ width:8, height:8, borderRadius:'50%', background:'#3B82F6' }}/>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
