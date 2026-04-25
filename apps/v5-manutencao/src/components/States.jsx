import React from 'react'

const C = { slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff' }

export function Loading({ msg = 'A carregar...' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, color:C.slate, fontSize:13 }}>
      {msg}
    </div>
  )
}

export function Empty({ msg = 'Sem dados', sub }) {
  return (
    <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center' }}>
      <div style={{ fontSize:13, color:C.slate }}>{msg}</div>
      {sub && <div style={{ fontSize:12, color:C.slate, marginTop:4, opacity:.7 }}>{sub}</div>}
    </div>
  )
}

export function ErrorMsg({ msg = 'Erro ao carregar dados.' }) {
  return (
    <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'16px', textAlign:'center' }}>
      <div style={{ fontSize:13, color:'#B91C1C' }}>{msg}</div>
    </div>
  )
}
