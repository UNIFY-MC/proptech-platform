import React, { useRef } from 'react'
import { useImovelAtivo } from '../lib/ImovelAtivoContext'
import { categoriaEmoji, moradaCurta } from '../lib/labels'

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

export default function EscolherImovelSheet({ open, onClose, onSelect, titulo = 'Para qual imóvel?', motivo, excluirIds = [], onAdicionarImovel }) {
  const { imoveis } = useImovelAtivo()
  const touchStartY = useRef(null)

  function onTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (touchStartY.current === null) return
    if (e.changedTouches[0].clientY - touchStartY.current > 60) onClose()
    touchStartY.current = null
  }

  if (!open) return null

  const disponiveis = imoveis.filter(im => !excluirIds.includes(im.id))

  return (
    <>
      <style>{`@keyframes slideUpEsc{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      }}/>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
          maxWidth: 600, margin: '0 auto',
          background: V.white, borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
          animation: 'slideUpEsc 300ms ease-out',
          paddingBottom: 28,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: V.line }}/>
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 14px', borderBottom: `1px solid ${V.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Georgia,serif', color: V.ink }}>{titulo}</div>
            {motivo && <div style={{ fontSize: 11, color: V.stone, marginTop: 2 }}>{motivo}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: V.stone, padding: '0 4px' }}>✕</button>
        </div>

        {/* Lista de imóveis */}
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {disponiveis.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: V.stone, fontSize: 13 }}>
              Sem imóveis disponíveis
            </div>
          ) : disponiveis.map(im => {
            const isReadOnly = im.origem === 'v2_sync'
            return (
              <button
                key={im.id}
                onClick={() => { if (!isReadOnly) { onSelect(im); onClose() } }}
                style={{
                  width: '100%', padding: '12px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'none', border: 'none',
                  cursor: isReadOnly ? 'default' : 'pointer',
                  textAlign: 'left', opacity: isReadOnly ? 0.55 : 1,
                  borderBottom: `1px solid ${V.line}`,
                }}
              >
                <span style={{ fontSize: 26, flexShrink: 0 }}>{categoriaEmoji(im)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: V.ink }}>{im.nome}</span>
                    {isReadOnly && (
                      <span style={{ fontSize: 9, background: '#EDE9FE', color: '#534AB7', padding: '2px 6px', borderRadius: 5, fontWeight: 700, flexShrink: 0 }}>
                        🔗 Gerido externamente
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: V.stone, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {moradaCurta(im)}
                  </div>
                  {im.tipologia && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: V.bg, color: V.stone, border: `1px solid ${V.border}`, marginTop: 4, display: 'inline-block' }}>
                      {im.tipologia}
                    </span>
                  )}
                </div>
                {!isReadOnly && <span style={{ fontSize: 18, color: '#D1D5DB', flexShrink: 0 }}>›</span>}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 0', borderTop: `1px solid ${V.line}` }}>
          <button
            onClick={() => { onClose(); onAdicionarImovel?.() }}
            style={{
              width: '100%', padding: '11px', borderRadius: 10,
              background: V.bg, border: `1px dashed ${V.border}`,
              fontSize: 13, fontWeight: 600, color: V.stone, cursor: 'pointer',
            }}
          >
            + Adicionar imóvel
          </button>
        </div>
      </div>
    </>
  )
}
