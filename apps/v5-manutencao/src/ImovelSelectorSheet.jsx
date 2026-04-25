import React, { useRef } from 'react'
import { useImovelAtivo } from './lib/ImovelAtivoContext'
import { tipoImovelEmoji, formatarMorada } from './lib/labels'

const V = {
  green:   '#1B4332',
  greenLt: '#52B788',
  greenXl: '#D8F3DC',
  ink:     '#0f172a',
  stone:   '#6B7685',
  border:  '#e2e8f0',
  line:    '#E5E7EB',
  white:   '#fff',
  bg:      '#f8fafc',
}

function scoreColor(s) {
  if (s >= 70) return { bg:'#D8F3DC', c:'#1B4332' }
  if (s >= 50) return { bg:'#FEF9C3', c:'#854F0B' }
  return { bg:'#FDE4DC', c:'#C0392B' }
}

export default function ImovelSelectorSheet({ open, onClose, onGerirImoveis }) {
  const { imoveis, imovelAtivoId, setImovelAtivoId } = useImovelAtivo()
  const touchStartY = useRef(null)

  function onTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (touchStartY.current === null) return
    if (e.changedTouches[0].clientY - touchStartY.current > 60) onClose()
    touchStartY.current = null
  }

  if (!open) return null

  return (
    <>
      <style>{`@keyframes slideUpSel{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:300,
        background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)',
      }}/>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:301,
          maxWidth:600, margin:'0 auto',
          background:V.white, borderRadius:'20px 20px 0 0',
          boxShadow:'0 -4px 32px rgba(0,0,0,0.18)',
          animation:'slideUpSel 300ms ease-out',
          paddingBottom:28,
        }}
      >
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12, marginBottom:4 }}>
          <div style={{ width:40, height:4, borderRadius:2, background:'#E5E7EB' }}/>
        </div>

        {/* Título */}
        <div style={{
          padding:'4px 20px 14px', borderBottom:`1px solid ${V.line}`,
          fontSize:16, fontWeight:700, fontFamily:'Georgia,serif', color:V.ink,
        }}>
          Mudar imóvel activo
        </div>

        {/* Lista imóveis */}
        <div style={{ padding:'8px 0' }}>
          {(imoveis || []).map(im => {
            const ativo = im.id === imovelAtivoId
            const sc    = scoreColor(im.home_score)
            return (
              <button
                key={im.id}
                onClick={() => { setImovelAtivoId(im.id); onClose() }}
                style={{
                  width:'100%', padding:'13px 20px',
                  display:'flex', alignItems:'center', gap:14,
                  background: ativo ? V.greenXl : 'none',
                  border:'none', cursor:'pointer', textAlign:'left',
                  borderLeft: ativo ? `3px solid ${V.greenLt}` : '3px solid transparent',
                }}
              >
                <span style={{ fontSize:26, flexShrink:0 }}>
                  {tipoImovelEmoji(im.tipo)}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:V.ink }}>{im.nome}</div>
                  <div style={{ fontSize:11, color:V.stone, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {formatarMorada(im)}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{
                    fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:8,
                    background:sc.bg, color:sc.c,
                  }}>{im.home_score}</span>
                  {ativo && <span style={{ fontSize:16, color:V.greenLt }}>✓</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:'8px 20px 0', borderTop:`1px solid ${V.line}` }}>
          <button
            onClick={() => { onClose(); onGerirImoveis?.() }}
            style={{
              width:'100%', padding:'11px', borderRadius:10,
              background:V.bg, border:`1px solid ${V.border}`,
              fontSize:13, fontWeight:600, color:V.stone, cursor:'pointer',
            }}
          >
            Gerir imóveis →
          </button>
        </div>
      </div>
    </>
  )
}
