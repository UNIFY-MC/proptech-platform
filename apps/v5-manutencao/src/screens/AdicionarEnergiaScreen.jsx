import React, { useState } from 'react'

const G = '#1B4332'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', amber:'#D97706', amberLt:'#FFFBEB', amberBd:'#FDE68A' }

const TIPOS_EQUIP = [
  { id:'caldeira',   emoji:'🔥', label:'Caldeira / Esquentador' },
  { id:'ac',         emoji:'❄️', label:'Ar condicionado / AVAC' },
  { id:'frigorifico',emoji:'🧊', label:'Frigorífico / Congelador' },
  { id:'maquina',    emoji:'🫧', label:'Máquina lavar / secar' },
  { id:'painel',     emoji:'☀️', label:'Painel solar' },
  { id:'outro',      emoji:'⚡', label:'Outro equipamento' },
]

export default function AdicionarEnergiaScreen({ onBack }) {
  const [tipoSel, setTipoSel] = useState(null)
  const [nome, setNome]       = useState('')
  const [marca, setMarca]     = useState('')
  const [ano, setAno]         = useState('')

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

      <div style={{ background:`linear-gradient(145deg,${C.amber},#B45309)`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>⚡</span>
          <div>
            <div style={{ fontSize:20, fontWeight:700 }}>Adicionar equipamento</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', marginTop:2 }}>Regista para acompanhar revisões e consumos</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        <div style={{ fontSize:10, fontWeight:700, color:C.stone, textTransform:'uppercase', letterSpacing:.6, marginBottom:12 }}>
          Tipo de equipamento
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
          {TIPOS_EQUIP.map(t => (
            <button
              key={t.id}
              onClick={() => setTipoSel(t.id)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                background: tipoSel === t.id ? C.amberLt : C.white,
                border:`1.5px solid ${tipoSel === t.id ? C.amber : C.border}`,
                borderRadius:12, padding:'12px 14px',
                cursor:'pointer', textAlign:'left',
              }}
            >
              <span style={{ fontSize:20 }}>{t.emoji}</span>
              <span style={{ fontSize:12, fontWeight:600, color: tipoSel === t.id ? C.amber : C.ink, lineHeight:1.3 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {tipoSel && (
          <>
            <div style={{ fontSize:10, fontWeight:700, color:C.stone, textTransform:'uppercase', letterSpacing:.6, marginBottom:10 }}>Detalhes</div>
            {[
              { label:'Nome / modelo', val:nome, set:setNome, ph:'Ex: Roca 20i Condens' },
              { label:'Marca', val:marca, set:setMarca, ph:'Ex: Roca, Daikin, Bosch…' },
              { label:'Ano de instalação', val:ano, set:setAno, ph:'Ex: 2018', type:'number' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:C.stone, marginBottom:4 }}>{f.label}</div>
                <input
                  type={f.type || 'text'}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                  style={{
                    width:'100%', background:C.white, border:`1px solid ${C.border}`,
                    borderRadius:10, padding:'10px 12px', fontSize:13, outline:'none', color:C.ink,
                  }}
                />
              </div>
            ))}
          </>
        )}

        <div style={{ background:C.amberLt, border:`1px solid ${C.amberBd}`, borderRadius:10, padding:'10px 14px', marginTop:4, fontSize:11.5, color:C.amber, lineHeight:1.5 }}>
          📊 Com equipamentos registados, a IA pode calcular o Home Score e alertar para revisões em atraso.
        </div>

        <button
          onClick={() => tipoSel ? alert('Guardar equipamento — a implementar na Fase Casa 3.4 (equipamentos BD)') : null}
          disabled={!tipoSel}
          style={{
            marginTop:16, width:'100%', padding:13, borderRadius:10,
            background: tipoSel ? C.amber : C.line,
            border:'none', fontSize:14, fontWeight:700,
            color: tipoSel ? '#fff' : C.slate,
            cursor: tipoSel ? 'pointer' : 'default',
          }}
        >
          Guardar equipamento →
        </button>
      </div>
    </div>
  )
}
