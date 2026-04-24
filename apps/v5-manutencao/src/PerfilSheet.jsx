import React, { useState, useEffect, useRef } from 'react'
import { supa, supaCore } from './supa.js'
import { DEMO_PESSOA_ID } from './lib/demo.js'
import { calcularNivel } from './lib/gamification.js'

const V = {
  forest:     '#1B4332',
  forestDeep: '#072819',
  emerald:    '#52B788',
  pale:       '#D8F3DC',
  paleDeep:   '#ECFDF5',
  ink:        '#0A1620',
  stone:      '#6B7685',
  line:       '#E5E7EB',
  gold:       '#D4A72C',
  goldSoft:   '#FEF9C3',
  red:        '#DC2626',
  redSoft:    '#FEE2E2',
  white:      '#FFFFFF',
}

const NIVEL_LABELS  = { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', platinum: 'Platina', diamond: 'Diamante' }
const NIVEL_EMOJIS  = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '💠' }
const NIVEL_NEXT_PT = { bronze: 500, silver: 1500, gold: 3500, platinum: 7500, diamond: null }

function NivelBadge({ nivel, pontos }) {
  const label = NIVEL_LABELS[nivel] || 'Bronze'
  const emoji = NIVEL_EMOJIS[nivel] || '🥉'
  const proxLimite = NIVEL_NEXT_PT[nivel]
  const faltam = proxLimite ? proxLimite - pontos : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        background: V.goldSoft, color: V.gold, fontWeight: 800,
        fontSize: 11, padding: '2px 10px', borderRadius: 20,
        border: `1px solid ${V.gold}44`,
      }}>
        {emoji} {label} · {pontos} pts
      </span>
      {faltam && (
        <span style={{ fontSize: 10, color: V.stone }}>
          {faltam} pts para {NIVEL_LABELS[Object.keys(NIVEL_NEXT_PT)[Object.keys(NIVEL_NEXT_PT).indexOf(nivel) + 1]] || ''}
        </span>
      )}
    </div>
  )
}

const NAV_ITEMS = [
  { id: 'subscricao', emoji: '💎', label: 'A minha subscrição',   chevron: true  },
  { id: 'imoveis',    emoji: '🏠', label: 'Os meus imóveis',      chevron: true  },
  { id: 'historico',  emoji: '📋', label: 'Histórico de pontos',  chevron: false, expand: true },
  { id: 'ownersclub', emoji: '🏆', label: 'Owners Club',          chevron: true  },
  { id: 'fiscal',     emoji: '👤', label: 'Perfis fiscais',       chevron: true  },
  { id: 'notif',      emoji: '🔔', label: 'Notificações',         chevron: true  },
  { id: 'settings',   emoji: '⚙️', label: 'Definições',           chevron: true  },
]

export default function PerfilSheet({ open, onClose, authUser, onNavigate }) {
  const [pessoa,    setPessoa]    = useState(null)
  const [subscricao,setSubscricao]= useState(null)
  const [pontos,    setPontos]    = useState([])
  const [loading,   setLoading]   = useState(false)
  const [histOpen,  setHistOpen]  = useState(false)

  // Swipe-down to close
  const touchStartY = useRef(null)
  const sheetRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const pid = DEMO_PESSOA_ID

    Promise.all([
      supaCore.from('pessoas').select('id, nome, email').eq('id', pid).maybeSingle(),
      supa.from('subscricoes').select('id, plano, preco_mensal, estado, pontos_total, nivel').eq('pessoa_id', pid).eq('estado', 'ativo').maybeSingle(),
      supa.from('pontos_historico').select('id, pontos, motivo, data').eq('pessoa_id', pid).order('data', { ascending: false }).limit(10),
    ]).then(([rP, rS, rH]) => {
      setPessoa(rP.data || null)
      setSubscricao(rS.data || null)
      setPontos(rH.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [open])

  const nome   = pessoa?.nome  || authUser?.nome  || 'Utilizador'
  const email  = pessoa?.email || authUser?.user?.email || '—'
  const iniciais = nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const pontosTotal = subscricao?.pontos_total ?? 0
  const nivel = subscricao?.nivel || calcularNivel(pontosTotal)

  function handleItem(item) {
    if (item.id === 'subscricao') {
      onNavigate?.('subscricao')
      return
    }
    if (item.expand) {
      setHistOpen(v => !v)
      return
    }
    const MSGS = {
      imoveis:    'Lista de imóveis em fase futura.',
      ownersclub: 'V10 Owners Club em fase futura.',
      fiscal:     'Perfis fiscais em fase futura.',
      notif:      'Definições de notificações em fase futura.',
      settings:   'Definições em fase futura.',
    }
    alert(MSGS[item.id] || 'Em breve.')
  }

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
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          animation: 'fadeInBackdrop 200ms ease-out',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          maxWidth: 600, margin: '0 auto',
          background: V.white, borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
          maxHeight: '88vh', overflowY: 'auto',
          animation: 'slideUpSheet 300ms ease-out',
        }}
      >
        <style>{`
          @keyframes fadeInBackdrop { from { opacity:0 } to { opacity:1 } }
          @keyframes slideUpSheet   { from { transform:translateY(100%) } to { transform:translateY(0) } }
        `}</style>

        {/* Drag indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: V.line }} />
        </div>

        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute', top: 14, right: 16,
            width: 28, height: 28, borderRadius: '50%',
            background: V.line, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: V.stone,
          }}
        >✕</button>

        {/* Cabeçalho */}
        <div style={{ padding: '16px 20px 20px', borderBottom: `1px solid ${V.line}` }}>
          {loading ? (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: V.pale }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: '55%', borderRadius: 6, background: V.pale, marginBottom: 8 }} />
                <div style={{ height: 11, width: '70%', borderRadius: 6, background: V.pale, marginBottom: 8 }} />
                <div style={{ height: 20, width: '50%', borderRadius: 10, background: V.pale }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `linear-gradient(135deg,${V.forest},${V.emerald})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: V.white,
                flexShrink: 0, boxShadow: '0 2px 10px rgba(27,67,50,0.25)',
              }}>{iniciais}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: V.ink, marginBottom: 3 }}>{nome}</div>
                <div style={{ fontSize: 12, color: V.stone, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
                <NivelBadge nivel={nivel} pontos={pontosTotal} />
              </div>
            </div>
          )}
        </div>

        {/* Lista de navegação */}
        <div style={{ padding: '8px 0' }}>
          {NAV_ITEMS.map(item => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => handleItem(item)}
                style={{
                  width: '100%', padding: '13px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: V.ink }}>{item.label}</span>
                {item.expand ? (
                  <span style={{ fontSize: 12, color: V.stone, transform: histOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }}>›</span>
                ) : item.chevron ? (
                  <span style={{ fontSize: 16, color: V.stone }}>›</span>
                ) : null}
              </button>

              {/* Histórico de pontos expandível */}
              {item.expand && histOpen && (
                <div style={{ margin: '0 20px 8px', borderRadius: 12, background: V.paleDeep, padding: '10px 14px', border: `1px solid ${V.pale}` }}>
                  {pontos.length === 0 ? (
                    <div style={{ fontSize: 12, color: V.stone, textAlign: 'center', padding: '8px 0' }}>
                      Sem pontos registados ainda.
                    </div>
                  ) : pontos.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${V.pale}` }}>
                      <span style={{ fontSize: 12, color: V.ink, flex: 1 }}>{formatMotivo(p.motivo)}</span>
                      <span style={{ fontSize: 11, color: V.stone, marginRight: 12 }}>{formatData(p.data)}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: V.gold }}>+{p.pontos}</span>
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Rodapé */}
        <div style={{ borderTop: `1px solid ${V.line}`, padding: '16px 20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: V.stone, letterSpacing: '0.04em' }}>v0.5.2 · build dev</span>
          <button
            onClick={() => alert('Logout em fase 4.')}
            style={{
              padding: '7px 16px', borderRadius: 8,
              background: V.redSoft, border: `1px solid ${V.red}33`,
              color: V.red, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >Sair</button>
        </div>
      </div>
    </>
  )
}

function formatMotivo(motivo) {
  if (!motivo) return '—'
  return motivo
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function formatData(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}
