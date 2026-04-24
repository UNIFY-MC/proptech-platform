import React, { useState, useEffect } from 'react'
import { supaPublic } from './supa.js'

/* Paleta V5 — cópia local para isolar módulo do App.jsx */
const V5 = {
  green:    '#1B4332',
  greenMid: '#2D6A4F',
  greenLt:  '#52B788',
  greenXl:  '#D8F3DC',
  ink:      '#0f172a',
  slate:    '#64748b',
  border:   '#e2e8f0',
  bg:       '#f8fafc',
  white:    '#fff',
  purple:   '#534AB7',
  purpleLt: '#ECEEFA',
}

// TODO(mario): pos_obra services accessible only via RFQ flow when phase 3.6 lands
const CATS_GRID = [
  { id: 'limpeza',     l: 'Limpeza',     ic: '🧹', cor: '#16a34a', bg: '#f0fdf4' },
  { id: 'manutencao',  l: 'Manutenção',  ic: '🔧', cor: '#0ea5e9', bg: '#f0f9ff' },
  { id: 'jardim',      l: 'Jardim',      ic: '🌿', cor: '#22c55e', bg: '#f0fdf4' },
  { id: 'piscina',     l: 'Piscina',     ic: '🏊', cor: '#06b6d4', bg: '#ecfeff' },
  { id: 'pintura',     l: 'Pintura',     ic: '🎨', cor: '#f97316', bg: '#fff7ed' },
  { id: 'eletrica',    l: 'Eléctrica',   ic: '⚡', cor: '#eab308', bg: '#fefce8' },
  { id: 'canalizacao', l: 'Canalização', ic: '🚿', cor: '#8b5cf6', bg: '#faf5ff' },
]

function Skel({ h = 72 }) {
  return (
    <div style={{
      height: h, borderRadius: 14, marginBottom: 8,
      background: 'linear-gradient(90deg,rgba(27,67,50,0.06) 25%,rgba(27,67,50,0.12) 50%,rgba(27,67,50,0.06) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skel-sweep 1.4s ease-in-out infinite',
    }} />
  )
}

function BadgePill({ text, green }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
      background: green ? V5.greenXl : '#e0e7ff',
      color:      green ? V5.green   : '#4338ca',
      padding: '2px 7px', borderRadius: 20, flexShrink: 0,
    }}>{text}</span>
  )
}

function SvcCard({ s }) {
  const badgeLabel = s.popular ? 'Popular' : s.urgent ? 'Urgente' : s.eco ? 'Eco' : null
  const isGreenBadge = s.popular || s.eco
  const precoBaixou = s.preco_original && Number(s.preco_original) > Number(s.preco)

  return (
    <div
      onClick={() => alert(`"${s.nome}" — detalhe e checkout disponível numa fase seguinte.`)}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        background: V5.white, borderRadius: 14,
        border: `1px solid ${V5.border}`,
        padding: '12px 14px', marginBottom: 8,
        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: '#f0fdf4',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        {s.icon || '🔧'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
          <span style={{
            flex: 1, fontSize: 13, fontWeight: 700, color: V5.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{s.nome}</span>
          {badgeLabel && <BadgePill text={badgeLabel} green={isGreenBadge} />}
        </div>
        {s.tagline && (
          <div style={{
            fontSize: 11, color: V5.slate, marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {s.tagline}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {s.duracao_tipica
            ? <span style={{ fontSize: 11, color: V5.slate }}>⏱ {s.duracao_tipica}</span>
            : <span />
          }
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            {precoBaixou && (
              <span style={{ fontSize: 11, color: V5.slate, textDecoration: 'line-through' }}>
                €{Number(s.preco_original).toFixed(0)}
              </span>
            )}
            {s.preco != null && (
              <span style={{ fontSize: 15, fontWeight: 800, color: V5.green }}>
                €{Number(s.preco).toFixed(2)}
                {s.unidade && (
                  <span style={{ fontSize: 10, fontWeight: 500, color: V5.slate }}> {s.unidade}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ServicosScreen({ authUser }) {
  const [catSel, setCatSel] = useState(null)   // null → grid, cat obj → lista
  const [servicos, setServicos] = useState(null) // null = a carregar
  const [loadErr, setLoadErr]   = useState(false)

  useEffect(() => {
    if (!catSel) return
    let active = true
    setServicos(null)
    setLoadErr(false)

    async function load() {
      const { data, error } = await supaPublic
        .from('servicos')
        .select('id,nome,tagline,icon,preco,preco_original,unidade,duracao_tipica,popular,eco,urgent,ordem')
        .eq('categoria_id', catSel.id)
        .eq('activo', true)
        .is('servico_pai_id', null)
        .neq('tipo', 'personalizado')
        .order('ordem', { ascending: true })

      if (!active) return
      if (error) { console.warn('[ServicosScreen]', error); setLoadErr(true); return }
      setServicos(data || [])
    }
    load()
    return () => { active = false }
  }, [catSel])

  /* ── Vista: grid de categorias ─────────────────────────────── */
  if (!catSel) {
    return (
      <div style={{ minHeight: '100vh', background: V5.bg, paddingBottom: 90 }}>
        <div style={{
          background: V5.white, padding: '18px 16px 14px',
          borderBottom: `1px solid ${V5.border}`,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: V5.ink, margin: 0 }}>Serviços</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: V5.slate }}>O que precisas hoje?</p>
        </div>

        <div style={{ padding: '16px 14px 28px' }}>
          {/* 7 categorias em grelha 2 colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {CATS_GRID.map(cat => (
              <button key={cat.id} onClick={() => setCatSel(cat)} style={{
                background: V5.white, border: `1px solid ${V5.border}`,
                borderRadius: 16, padding: '18px 12px 14px',
                cursor: 'pointer', textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, background: cat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>
                  {cat.ic}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: V5.ink, lineHeight: 1.2 }}>
                  {cat.l}
                </span>
              </button>
            ))}
          </div>

          {/* Orçamentos à medida — full-width, roxo exclusivo #534AB7 */}
          <button
            onClick={() => alert('Fluxo Orçamentos à medida em fase 3.6')}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: V5.purpleLt, border: `1.5px solid ${V5.purple}`,
              borderRadius: 16, padding: '16px 20px',
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 2px 8px rgba(83,74,183,0.12)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'rgba(83,74,183,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>
              📋
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: V5.purple }}>
                Orçamentos à medida
              </div>
              <div style={{ fontSize: 12, color: '#6B63B5', marginTop: 2, lineHeight: 1.4 }}>
                Descreve o teu projecto e recebe propostas de profissionais
              </div>
            </div>
            <span style={{ fontSize: 20, color: V5.purple, flexShrink: 0 }}>›</span>
          </button>
        </div>
      </div>
    )
  }

  /* ── Vista: lista de serviços da categoria ──────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: V5.bg, paddingBottom: 90 }}>
      <div style={{
        background: V5.white, padding: '14px 16px',
        borderBottom: `1px solid ${V5.border}`,
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={() => { setCatSel(null); setServicos(null) }}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: V5.ink, padding: 0, flexShrink: 0 }}
        >←</button>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{catSel.ic}</span>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: V5.ink, margin: 0, flex: 1 }}>
          {catSel.l}
        </h1>
      </div>

      <div style={{ padding: '14px 14px 28px' }}>
        {/* Loading */}
        {servicos === null && !loadErr && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[...Array(5)].map((_, i) => <Skel key={i} />)}
          </div>
        )}

        {/* Erro */}
        {loadErr && (
          <div style={{
            padding: '32px 24px', textAlign: 'center',
            background: V5.white, borderRadius: 14, border: `1px dashed ${V5.border}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: V5.ink, marginBottom: 8 }}>
              Não foi possível carregar os serviços
            </div>
            <button
              onClick={() => setCatSel({ ...catSel })}
              style={{
                background: V5.green, color: '#fff', border: 'none', borderRadius: 10,
                padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Tentar de novo
            </button>
          </div>
        )}

        {/* Empty state */}
        {servicos !== null && servicos.length === 0 && (
          <div style={{
            padding: '40px 24px', textAlign: 'center',
            background: V5.white, borderRadius: 14, border: `1px dashed ${V5.border}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{catSel.ic}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: V5.ink, marginBottom: 6 }}>
              Sem serviços disponíveis
            </div>
            <div style={{ fontSize: 12, color: V5.slate }}>
              Nenhum serviço nesta categoria de momento.
            </div>
          </div>
        )}

        {/* Lista */}
        {servicos !== null && servicos.length > 0 &&
          servicos.map(s => <SvcCard key={s.id} s={s} />)
        }
      </div>
    </div>
  )
}
