import React, { useRef } from 'react'
import { useImovelAtivo } from './lib/ImovelAtivoContext'
import { categoriaEmoji, moradaCurta } from './lib/labels'

const V = {
  green:   '#1B4332',
  greenLt: '#52B788',
  greenXl: '#D8F3DC',
  greenMd: '#95D5B2',
  ink:     '#0f172a',
  stone:   '#6B7685',
  border:  '#e2e8f0',
  line:    '#E5E7EB',
  white:   '#fff',
  bg:      '#f8fafc',
}

function tipoLabel(tipo) {
  const m = {
    individual:         'Individual',
    empresa_comercial:  'Empresa',
    condominio:         'Condomínio',
    prestador:          'Prestador',
    gestor_imoveis:     'Gestor de imóveis',
  }
  return m[tipo] || tipo || ''
}

function tipoEmoji(tipo) {
  const m = {
    individual:        '👤',
    empresa_comercial: '🏢',
    condominio:        '🏘️',
    prestador:         '🔧',
    gestor_imoveis:    '🗂️',
  }
  return m[tipo] || '🏠'
}

function scoreColor(s) {
  if (s >= 70) return { bg: '#D8F3DC', c: V.green }
  if (s >= 50) return { bg: '#FEF9C3', c: '#854F0B' }
  return { bg: '#FDE4DC', c: '#C0392B' }
}

export default function OrgLocBottomSheet({ open, onClose, onGerirImoveis }) {
  const {
    imoveis, imovelAtivoId, isGlobal, setImovelAtivoId, setViewModeGlobal,
    organizations, organizationId, setActiveOrg,
  } = useImovelAtivo()

  const touchStartY = useRef(null)

  function onTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (touchStartY.current === null) return
    if (e.changedTouches[0].clientY - touchStartY.current > 60) onClose()
    touchStartY.current = null
  }

  if (!open) return null

  const multiOrg = organizations.length > 1

  return (
    <>
      <style>{`@keyframes slideUpOrgLoc{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
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
          animation: 'slideUpOrgLoc 300ms ease-out',
          paddingBottom: 28, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB' }}/>
        </div>

        {/* Título */}
        <div style={{
          padding: '4px 20px 14px', borderBottom: `1px solid ${V.line}`,
          fontSize: 16, fontWeight: 700, fontFamily: 'Georgia,serif', color: V.ink,
        }}>
          {multiOrg ? 'Entidade & Imóvel' : 'Onde queres focar?'}
        </div>

        {/* ── Secção de Organizações (só se >1 org) ── */}
        {multiOrg && (
          <>
            <div style={{ padding: '12px 20px 6px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: V.stone, textTransform: 'uppercase' }}>
                Entidade activa
              </div>
            </div>
            <div style={{ padding: '0 16px 4px' }}>
              {organizations.map(org => {
                const ativa = org.id === organizationId
                return (
                  <button
                    key={org.id}
                    onClick={async () => { await setActiveOrg(org.id) }}
                    style={{
                      width: '100%', padding: '12px 14px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: ativa ? 'linear-gradient(135deg, #B7E4C7, #95D5B2)' : V.bg,
                      border: ativa ? `2px solid ${V.greenLt}` : `1px solid ${V.border}`,
                      borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{tipoEmoji(org.tipo)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: ativa ? V.green : V.ink }}>
                        {org.nome}
                      </div>
                      <div style={{ fontSize: 11, color: ativa ? '#2D6A4F' : V.stone, marginTop: 2 }}>
                        {tipoLabel(org.tipo)}
                      </div>
                    </div>
                    {ativa && <span style={{ fontSize: 16, color: V.greenLt, fontWeight: 700 }}>✓</span>}
                  </button>
                )
              })}
            </div>
            <div style={{ margin: '4px 16px 0', borderTop: `1px solid ${V.line}` }}/>
            <div style={{ padding: '10px 20px 6px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: V.stone, textTransform: 'uppercase' }}>
                Imóvel
              </div>
            </div>
          </>
        )}

        {/* ── Vista Global ── */}
        <div style={{ padding: multiOrg ? '0 16px 4px' : '12px 16px 4px' }}>
          <div
            onClick={() => { setViewModeGlobal(); onClose() }}
            style={{
              background: isGlobal
                ? 'linear-gradient(135deg, #B7E4C7, #95D5B2)'
                : 'linear-gradient(135deg, #D8F3DC, #B7E4C7)',
              borderRadius: 12,
              border: isGlobal ? `2px solid ${V.greenLt}` : `1px solid ${V.greenMd}`,
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>🌐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: V.green }}>Todos os imóveis</div>
              <div style={{ fontSize: 11, color: '#2D6A4F', marginTop: 2 }}>
                Vista agregada · {imoveis.length} imóvel{imoveis.length !== 1 ? 's' : ''}
              </div>
            </div>
            {isGlobal && <span style={{ fontSize: 16, color: V.greenLt, fontWeight: 700 }}>✓</span>}
          </div>
        </div>

        {/* Separador */}
        <div style={{ margin: '10px 16px 0', borderTop: `1px solid ${V.line}` }}/>

        {/* ── Lista imóveis individuais ── */}
        <div style={{ padding: '4px 0' }}>
          {(imoveis || []).map(im => {
            const ativo = !isGlobal && im.id === imovelAtivoId
            const sc    = scoreColor(im.home_score)
            const isV2  = im.origem === 'v2_sync'
            return (
              <button
                key={im.id}
                onClick={() => { setImovelAtivoId(im.id); onClose() }}
                style={{
                  width: '100%', padding: '12px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: ativo ? V.greenXl : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderLeft: ativo ? `3px solid ${V.greenLt}` : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>
                  {categoriaEmoji(im)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: V.ink }}>{im.nome}</div>
                  <div style={{ fontSize: 11, color: V.stone, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {moradaCurta(im)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {im.tipologia && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: V.bg, color: V.stone, border: `1px solid ${V.border}` }}>
                        {im.tipologia}
                      </span>
                    )}
                    {isV2 && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: '#EDE9FE', color: '#534AB7' }}>
                        V2
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                    background: sc.bg, color: sc.c,
                  }}>{im.home_score}</span>
                  {ativo && <span style={{ fontSize: 16, color: V.greenLt }}>✓</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 20px 0', borderTop: `1px solid ${V.line}` }}>
          <button
            onClick={() => { onClose(); onGerirImoveis?.() }}
            style={{
              width: '100%', padding: '11px', borderRadius: 10,
              background: V.bg, border: `1px solid ${V.border}`,
              fontSize: 13, fontWeight: 600, color: V.stone, cursor: 'pointer',
            }}
          >
            Gerir imóveis →
          </button>
        </div>
      </div>
    </>
  )
}
