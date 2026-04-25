import React from 'react'

const C = {
  ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
  green:'#1B4332', greenMid:'#2D6A4F', greenLt:'#52B788', greenXl:'#D8F3DC',
}

const TIMELINE = [
  { ic:'✅', t:'Pedido registado',          s:'Agora · distribuído a técnicos',        now: true  },
  { ic:'⚡', t:'Primeiras videochamadas',    s:'~2h · 3-5 orçamentos instantâneos',     now: false },
  { ic:'📅', t:'Confirma vistorias agendadas', s:'~24h · escolhe data',                now: false },
  { ic:'🎯', t:'Compara e escolhe',          s:'48-72h · todos recebidos',              now: false },
]

export default function OrcamentoConfirmadoScreen({ onVerPedidos, onVoltarInicio }) {
  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      {/* Hero verde */}
      <div style={{ background: `linear-gradient(135deg,${C.green},${C.greenMid})`, padding: '14px 14px 24px', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 54, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', marginBottom: 4 }}>Pedido enviado!</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>Até 8 técnicos vão responder-te nas próximas horas</div>
      </div>

      {/* Timeline */}
      <div style={{ margin: '-16px 12px 0', background: C.white, borderRadius: 14, padding: '14px', boxShadow: '0 4px 12px rgba(0,0,0,.06)', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.slate, textTransform: 'uppercase', letterSpacing: .4, fontWeight: 700, marginBottom: 10 }}>O que se segue</div>
        {TIMELINE.map((s, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 11, marginBottom: i < arr.length - 1 ? 10 : 0, opacity: s.now ? 1 : .55 }}>
            <div style={{ fontSize: 20, flexShrink: 0, width: 24 }}>{s.ic}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{s.t}</div>
              <div style={{ fontSize: 10, color: C.slate, marginTop: 1 }}>{s.s}</div>
            </div>
            {s.now && <div style={{ fontSize: 9, background: C.greenXl, color: C.green, padding: '2px 7px', borderRadius: 5, fontWeight: 700, height: 'fit-content' }}>AGORA</div>}
          </div>
        ))}
      </div>

      {/* Acções */}
      <div style={{ padding: '14px 12px 4px' }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, marginBottom: 10 }}>O que podes fazer entretanto</div>
          {[
            { l: 'Adicionar mais fotos', ic: '📷' },
            { l: 'Editar descrição', ic: '✏️' },
          ].map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 12 }}>{a.ic} {a.l}</span>
              <span style={{ color: C.slate, fontSize: 14 }}>›</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: '#EF4444' }}>🗑️ Cancelar pedido</span>
            <span style={{ color: C.slate, fontSize: 14 }}>›</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 12px 24px' }}>
        <button onClick={onVerPedidos}
          style={{ width: '100%', padding: 13, borderRadius: 12, background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          Ver pedido em "Pedidos"
        </button>
        <button onClick={onVoltarInicio}
          style={{ width: '100%', padding: 13, borderRadius: 12, background: C.bg, color: C.ink, fontSize: 14, fontWeight: 600, marginTop: 7, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
          Voltar ao Início
        </button>
      </div>
    </div>
  )
}
