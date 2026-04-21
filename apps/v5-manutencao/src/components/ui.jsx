// src/components/ui.jsx — v5-manutencao 2026.0420 2141
import { C } from '../constants'

export function Av({ ini, size = 44, green = true }) {
  const bg = green
    ? `linear-gradient(135deg,${C.g},${C.gm})`
    : `linear-gradient(135deg,${C.copper},${C.copperL})`
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:bg, display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*.34, fontWeight:800, color:'#fff',
      boxShadow:'0 2px 8px rgba(0,0,0,0.2)',
    }}>{ini}</div>
  )
}

export function Stars({ v, s = 12 }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i<=Math.round(v) ? C.amber : C.border, fontSize:s }}>★</span>
      ))}
    </span>
  )
}

export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:C.white, borderRadius:16,
      border:`1px solid ${C.border}`,
      boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function Pill({ text, bg, col }) {
  return (
    <span style={{
      fontSize:10, fontWeight:800, background:bg, color:col,
      padding:'2px 8px', borderRadius:20,
      textTransform:'uppercase', letterSpacing:'0.04em',
    }}>{text}</span>
  )
}

export function EstBadge({ st }) {
  const m = {
    pendente:  {l:'Pendente',  bg:'#fef3c7', c:'#92400e'},
    atribuida: {l:'Atribuída', bg:'#eff6ff', c:'#1d4ed8'},
    em_curso:  {l:'Em curso',  bg:C.gl,      c:C.gd},
    concluida: {l:'Concluída', bg:C.mist,    c:C.slate},
  }
  const s = m[st] || m.pendente
  return (
    <span style={{
      fontSize:11, fontWeight:700, background:s.bg, color:s.c,
      padding:'3px 10px', borderRadius:20,
    }}>{s.l}</span>
  )
}

export function Btn({ children, onClick, v = 'navy', full, sm, dis }) {
  const bg  = {navy:C.navy, green:C.g, ghost:C.white, copper:C.copper, red:C.red}[v] || C.navy
  const col = v === 'ghost' ? C.navy : '#fff'
  return (
    <button
      onClick={dis ? null : onClick}
      style={{
        background: dis ? C.border : bg,
        color: dis ? C.slate : col,
        border: v === 'ghost' ? `1.5px solid ${C.border}` : 'none',
        borderRadius:12, fontWeight:700, cursor: dis ? 'not-allowed' : 'pointer',
        padding: sm ? '8px 14px' : '13px 20px',
        fontSize: sm ? 12 : 14,
        width: full ? '100%' : 'auto',
        opacity: dis ? 0.7 : 1,
      }}
    >{children}</button>
  )
}

export function Header({ title, sub, onBack, right }) {
  return (
    <div style={{
      background:C.navy, padding:'14px 16px',
      position:'sticky', top:0, zIndex:20,
      display:'flex', alignItems:'center', gap:10,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          background:'none', border:'none', color:'#fff',
          fontSize:22, cursor:'pointer', padding:0, flexShrink:0,
        }}>←</button>
      )}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'#8FA8BB' }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function FixedBottom({ children }) {
  return (
    <div style={{
      position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:430,
      background:C.white, padding:'12px 16px 20px',
      borderTop:`1px solid ${C.border}`, zIndex:30,
    }}>{children}</div>
  )
}

export function SectTitle({ t, action, onAction }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'16px 0 10px' }}>
      <h2 style={{ fontSize:14, fontWeight:800, color:C.navy }}>{t}</h2>
      {action && (
        <button onClick={onAction} style={{ fontSize:11, color:C.g, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}
