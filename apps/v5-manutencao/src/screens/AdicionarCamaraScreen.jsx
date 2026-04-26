import React, { useState } from 'react'

const G = '#1B4332'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', teal:'#0F766E', tealLt:'#F0FDFA', tealBd:'#99F6E4' }

export default function AdicionarCamaraScreen({ onBack }) {
  const [foto, setFoto] = useState(null)
  const [nota, setNota] = useState('')

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:80 }}>

      <div style={{ background:`linear-gradient(145deg,${C.teal},#115E59)`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>📸</span>
          <div>
            <div style={{ fontSize:20, fontWeight:700 }}>Registar com câmara</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>Documenta avarias, obras ou estado de equipamentos</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* Zona de upload */}
        <div style={{
          background:C.white, border:`2px dashed ${C.tealBd}`, borderRadius:16,
          padding:'32px 16px', textAlign:'center', marginBottom:16, cursor:'pointer',
        }}
          onClick={() => alert('Câmara: funcionalidade a implementar na Fase 2d (auth real + Storage Supabase)')}
        >
          <div style={{ fontSize:40, marginBottom:10 }}>📷</div>
          <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:4 }}>Tirar foto ou escolher da galeria</div>
          <div style={{ fontSize:11, color:C.slate }}>JPG, PNG até 10MB</div>
        </div>

        {/* Nota */}
        <div style={{ fontSize:10, fontWeight:700, color:C.stone, textTransform:'uppercase', letterSpacing:.6, marginBottom:6 }}>Nota (opcional)</div>
        <textarea
          value={nota}
          onChange={e => setNota(e.target.value)}
          rows={3}
          placeholder="Ex: Fissura no tecto do WC, apareceu depois das chuvas de março."
          style={{
            width:'100%', background:C.white, border:`1px solid ${C.border}`,
            borderRadius:12, padding:12, fontSize:13, fontFamily:'inherit',
            color:C.ink, resize:'vertical', outline:'none',
          }}
        />

        <div style={{ background:C.tealLt, border:`1px solid ${C.tealBd}`, borderRadius:10, padding:'10px 14px', marginTop:16, fontSize:11.5, color:C.teal, lineHeight:1.5 }}>
          📁 As fotos ficam guardadas no teu imóvel e podem ser partilhadas com técnicos em pedidos futuros.
        </div>

        <button
          onClick={() => alert('Guardar foto — a implementar com Supabase Storage (Fase 2d)')}
          style={{
            marginTop:16, width:'100%', padding:13, borderRadius:10,
            background:C.teal, border:'none', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer',
          }}
        >
          Guardar registo →
        </button>
      </div>
    </div>
  )
}
