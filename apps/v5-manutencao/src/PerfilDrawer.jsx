import React, { useRef, useEffect } from 'react'
import PerfilDrawerContent from './PerfilDrawerContent.jsx'

export default function PerfilDrawer({ open, onClose, authUser, onNavigate, onSwitchTab, onLogout }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <style>{`
        @keyframes fadeInBackdropD { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, zIndex:200,
          background:'rgba(0,0,0,0.45)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition:'opacity 0.25s ease',
        }}
      />

      {/* Drawer lateral */}
      <div
        ref={ref}
        style={{
          position:'fixed', top:0, bottom:0, left:0, zIndex:201,
          width: Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.85 : 320),
          background:'#fff',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflowY:'auto',
          boxShadow:'4px 0 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          style={{
            position:'absolute', top:14, right:14, zIndex:1,
            width:28, height:28, borderRadius:'50%',
            background:'#E5E7EB', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:14, color:'#6B7685',
          }}
        >✕</button>

        <div style={{ paddingTop:16 }}>
          <PerfilDrawerContent
            authUser={authUser}
            onNavigate={(target) => { onClose(); onNavigate?.(target) }}
            onSwitchTab={(tab) => { onClose(); onSwitchTab?.(tab) }}
          />
        </div>
      </div>
    </>
  )
}
