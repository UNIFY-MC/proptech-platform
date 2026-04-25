import React, { useRef } from 'react'
import PerfilSheetContent from './PerfilSheetContent.jsx'

export default function PerfilSheet({ open, onClose, authUser, onNavigate, onLogout }) {
  const touchStartY = useRef(null)
  const sheetRef    = useRef(null)

  function onTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (touchStartY.current === null) return
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 60) onClose()
    touchStartY.current = null
  }

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes slideUpSheet   { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, zIndex:200,
          background:'rgba(0,0,0,0.45)',
          backdropFilter:'blur(3px)',
          animation:'fadeInBackdrop 200ms ease-out',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:201,
          maxWidth:600, margin:'0 auto',
          background:'#fff', borderRadius:'20px 20px 0 0',
          boxShadow:'0 -4px 32px rgba(0,0,0,0.18)',
          maxHeight:'88vh', overflowY:'auto',
          animation:'slideUpSheet 300ms ease-out',
        }}
      >
        {/* Drag indicator */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:4 }}>
          <div style={{ width:40, height:4, borderRadius:2, background:'#E5E7EB' }}/>
        </div>

        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position:'absolute', top:14, right:16,
            width:28, height:28, borderRadius:'50%',
            background:'#E5E7EB', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:14, color:'#6B7685',
          }}
        >✕</button>

        <PerfilSheetContent
          authUser={authUser}
          onNavigate={(target) => { onClose(); onNavigate?.(target) }}
          onLogout={() => { onClose(); onLogout?.() }}
        />
      </div>
    </>
  )
}
