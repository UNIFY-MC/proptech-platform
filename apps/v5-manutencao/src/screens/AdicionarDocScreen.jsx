import React, { useState } from 'react'

const G = '#1B4332'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', violet:'#7C3AED', violetLt:'#F5F3FF', violetBd:'#DDD6FE' }

const TIPOS_DOC = [
  { id:'garantia',    emoji:'📜', label:'Garantia de equipamento' },
  { id:'manual',      emoji:'📗', label:'Manual de instruções' },
  { id:'fatura',      emoji:'🧾', label:'Factura de obra / serviço' },
  { id:'inspecao',    emoji:'🔍', label:'Relatório de inspecção' },
  { id:'seguro',      emoji:'🛡️', label:'Apólice de seguro' },
  { id:'outro',       emoji:'📄', label:'Outro documento' },
]

export default function AdicionarDocScreen({ onBack }) {
  const [tipoSel, setTipoSel] = useState(null)

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

      <div style={{ background:`linear-gradient(145deg,${C.violet},#5B21B6)`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>📄</span>
          <div>
            <div style={{ fontSize:20, fontWeight:700 }}>Adicionar documento</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>Guarda garantias, manuais e facturas da casa</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        <div style={{ fontSize:10, fontWeight:700, color:C.stone, textTransform:'uppercase', letterSpacing:.6, marginBottom:12 }}>
          Tipo de documento
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {TIPOS_DOC.map(t => (
            <button
              key={t.id}
              onClick={() => setTipoSel(t.id)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                background: tipoSel === t.id ? C.violetLt : C.white,
                border:`1.5px solid ${tipoSel === t.id ? C.violet : C.border}`,
                borderRadius:12, padding:'12px 14px',
                cursor:'pointer', textAlign:'left',
              }}
            >
              <span style={{ fontSize:20 }}>{t.emoji}</span>
              <span style={{ fontSize:12, fontWeight:600, color: tipoSel === t.id ? C.violet : C.ink, lineHeight:1.3 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Zona de upload */}
        <div style={{
          background:C.white, border:`2px dashed ${tipoSel ? C.violetBd : C.border}`, borderRadius:16,
          padding:'28px 16px', textAlign:'center', cursor:'pointer',
          opacity: tipoSel ? 1 : 0.5,
        }}
          onClick={() => tipoSel ? alert('Upload documento — a implementar com Supabase Storage (Fase 2d)') : null}
        >
          <div style={{ fontSize:36, marginBottom:8 }}>📎</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>
            {tipoSel ? 'Escolher ficheiro' : 'Selecciona o tipo primeiro'}
          </div>
          <div style={{ fontSize:11, color:C.slate }}>PDF, JPG, PNG até 20MB</div>
        </div>

        <div style={{ background:C.violetLt, border:`1px solid ${C.violetBd}`, borderRadius:10, padding:'10px 14px', marginTop:14, fontSize:11.5, color:C.violet, lineHeight:1.5 }}>
          🔒 Os documentos ficam associados ao teu imóvel. Só tu e os técnicos autorizados os podem consultar.
        </div>

      </div>
    </div>
  )
}
