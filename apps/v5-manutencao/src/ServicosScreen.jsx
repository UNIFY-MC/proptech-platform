import React, { useState, useEffect } from 'react'
import { supaPublic } from './supa.js'
import HeroHeader from './HeroHeader.jsx'

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
  coral:    '#E76F51',
  coralLt:  '#FDE4DC',
}

const CATS_GRID = [
  { id: 'limpeza',     l: 'Limpeza',     ic: '✨', bg: '#E8F5D8' },
  { id: 'manutencao',  l: 'Manutenção',  ic: '🔧', bg: '#E0ECF8' },
  { id: 'jardim',      l: 'Jardim',      ic: '🌿', bg: '#E0F2E0' },
  { id: 'piscina',     l: 'Piscina',     ic: '🌊', bg: '#E0F2F7' },
  { id: 'pintura',     l: 'Pintura',     ic: '🖌️', bg: '#F7E0F0' },
  { id: 'eletrica',    l: 'Eléctrica',   ic: '⚡', bg: '#FAEEDA' },
  { id: 'canalizacao', l: 'Canalização', ic: '💧', bg: '#E0E8FA' },
]

const PROMOS = [
  {
    tag: '🌸 RESET DE PRIMAVERA',
    titleBefore: 'Até ', titleHighlight: '-50%', titleAfter: ' em limpezas profundas',
    sub: 'Válido até 31 Maio · 8 serviços',
    bg: 'linear-gradient(135deg,#FCEBEB,#FDE4DC)',
    tagColor: V5.coral, highlightColor: V5.coral, btnBg: V5.coral,
  },
  {
    tag: '❄️ PACK INVERNO',
    titleBefore: '', titleHighlight: '-19%', titleAfter: ' caldeira + caleiras + cobertura',
    sub: 'Pack completo · economize 44€',
    bg: 'linear-gradient(135deg,#E6F1FB,#EEF5FD)',
    tagColor: '#185FA5', highlightColor: '#185FA5', btnBg: '#185FA5',
  },
  {
    tag: '💧 URGÊNCIA HOJE',
    titleBefore: 'Canalização em ', titleHighlight: '2h', titleAfter: ' garantidas',
    sub: 'Disponível 24/7 · sem custo extra',
    bg: 'linear-gradient(135deg,#E0E8FA,#EDF1FC)',
    tagColor: '#534AB7', highlightColor: '#534AB7', btnBg: '#534AB7',
  },
]

const COMBOS = [
  { t:'Pack Inverno',       s:'Caldeira + caleiras + cobertura', p:185, o:229, bg:'#E6F1FB' },
  { t:'Reset Primavera',    s:'Limpeza profunda + jardim',       p:129, o:175, bg:'#FCEBEB' },
  { t:'Pré-venda casa',     s:'Tudo em 48h',                    p:399, o:520, bg:V5.greenXl },
]

const MAIS_CONTRATADOS = [
  { ic:'🧹', t:'Limpeza manutenção apartamento', cat:'Limpeza · 2h',           p:'42€', de:'48€' },
  { ic:'💧', t:'Desentupimento canalização',     cat:'Canalização · urgência', p:'65€', de:null  },
  { ic:'🔧', t:'Revisão anual caldeira',          cat:'Manutenção · 90min',    p:'75€', de:null  },
]

/* ── Helpers ─────────────────────────────────────────────────────── */

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

/* ── Vista marketplace (ecrã principal de serviços) ──────────────── */
function MarketplaceView({ onCatSel, onHamburguer, onAvatarClick, authUser }) {
  return (
    <div style={{ minHeight: '100vh', background: V5.bg, paddingBottom: 90 }}>
      {/* Hero verde */}
      <div style={{
        background: `linear-gradient(145deg,${V5.green},${V5.greenMid})`,
        padding: '14px 14px 16px', color: '#fff',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <HeroHeader
          onHamburguer={onHamburguer}
          onAvatarClick={onAvatarClick}
          locationLabel="A MINHA CASA"
          authUser={authUser}
          notifCount={notifCount}
          onNotifClick={onNavigateNotificacoes}
          onChatClick={onNavigateChatSuporte}
        />
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>O que precisa hoje?</div>
        {/* Barra de pesquisa */}
        <div style={{
          background: 'rgba(0,0,0,0.2)', borderRadius: 10,
          padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>🔍</span>
          <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            Procurar serviço...
          </span>
        </div>
      </div>

      <div style={{ padding: '0 0 28px' }}>
        {/* Banner Home+ */}
        <div style={{
          margin: '12px 14px 0',
          background: V5.greenXl, border: `1px solid ${V5.greenLt}`,
          borderRadius: 12, padding: '11px 14px',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🎁</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: V5.green }}>
              Plano Home+ · 5% off em tudo
            </div>
            <div style={{ fontSize: 10, color: V5.greenMid, marginTop: 1 }}>
              Aplicado automaticamente no checkout
            </div>
          </div>
        </div>

        {/* Carrossel de promos */}
        <div style={{
          padding: '12px 12px 0',
          display: 'flex', gap: 9,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {PROMOS.map((promo, i) => (
            <div key={i} style={{
              minWidth: '85%', borderRadius: 13,
              padding: '12px 14px', background: promo.bg,
              cursor: 'pointer', flexShrink: 0,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                color: promo.tagColor, marginBottom: 4,
              }}>{promo.tag}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: V5.ink, lineHeight: 1.15, fontFamily: 'Georgia,serif', marginBottom: 3 }}>
                {promo.titleBefore}
                <span style={{ color: promo.highlightColor }}>{promo.titleHighlight}</span>
                {promo.titleAfter}
              </div>
              <div style={{ fontSize: 10, color: V5.slate, marginTop: 3 }}>{promo.sub}</div>
              <button style={{
                background: promo.btnBg, color: '#fff',
                padding: '6px 12px', borderRadius: 8,
                fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                marginTop: 9,
              }}>
                Explorar →
              </button>
            </div>
          ))}
        </div>

        {/* Categorias — 4×2 grid */}
        <div style={{
          padding: '16px 14px 6px',
          fontSize: 14, fontWeight: 700, color: V5.ink,
        }}>
          Categorias
        </div>
        <div style={{
          padding: '0 14px',
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8,
        }}>
          {CATS_GRID.map(cat => (
            <button key={cat.id} onClick={() => onCatSel(cat)} style={{
              background: V5.white, border: `1px solid ${V5.border}`,
              borderRadius: 12, padding: '9px 4px',
              cursor: 'pointer', textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: cat.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                {cat.ic}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: V5.slate, lineHeight: 1.2 }}>
                {cat.l}
              </span>
            </button>
          ))}
        </div>

        {/* Orçamentos à medida — card roxo */}
        <div style={{ padding: '14px 14px 0' }}>
          <button
            onClick={() => alert('Fluxo Orçamentos à medida em fase 3.6')}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'linear-gradient(135deg,#26215C,#534AB7)',
              border: 'none', borderRadius: 14, padding: '14px 16px',
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 4px 14px rgba(83,74,183,0.35)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 11, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>📋</div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Orçamentos à medida</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, lineHeight: 1.4 }}>
                Descreve o teu projecto e recebe propostas de profissionais
              </div>
            </div>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>›</span>
          </button>
        </div>

        {/* Combos populares */}
        <div style={{
          padding: '16px 14px 8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: V5.ink }}>🔥 Combos populares</div>
          <div style={{ fontSize: 10, color: V5.greenLt, fontWeight: 700 }}>Ver →</div>
        </div>
        <div style={{
          padding: '0 0 0 14px',
          display: 'flex', gap: 10,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingRight: 14,
        }}>
          {COMBOS.map((b, i) => {
            const desc = Math.round((1 - b.p / b.o) * 100)
            return (
              <div key={i} style={{
                minWidth: 155, background: b.bg,
                borderRadius: 12, padding: '11px 12px',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <div style={{ fontSize: 9, color: V5.coral, fontWeight: 700, marginBottom: 4 }}>
                  -{desc}%
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: V5.ink }}>{b.t}</div>
                <div style={{ fontSize: 10, color: V5.slate, marginTop: 3, minHeight: 28, lineHeight: 1.35 }}>
                  {b.s}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: V5.green }}>
                    {b.p}€
                  </span>
                  <span style={{ fontSize: 9, color: V5.slate, textDecoration: 'line-through' }}>
                    {b.o}€
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mais contratados */}
        <div style={{
          padding: '16px 14px 8px',
          fontSize: 14, fontWeight: 700, color: V5.ink,
        }}>
          ⭐ Mais contratados
        </div>
        <div style={{ padding: '0 14px' }}>
          {MAIS_CONTRATADOS.map((s, i) => (
            <div key={i} onClick={() => alert(`"${s.t}" — detalhe e checkout disponível numa fase seguinte.`)} style={{
              background: V5.white, border: `1px solid ${V5.border}`,
              borderRadius: 12, padding: '11px 13px', marginBottom: 8,
              display: 'flex', gap: 12, alignItems: 'center',
              cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{s.ic}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: V5.ink,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{s.t}</div>
                <div style={{ fontSize: 10, color: V5.slate, marginTop: 2 }}>{s.cat}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {s.de && <div style={{ fontSize: 9, color: V5.slate, textDecoration: 'line-through' }}>{s.de}</div>}
                <div style={{ fontSize: 14, fontWeight: 800, color: V5.green }}>{s.p}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

/* ── Vista: lista de serviços da categoria ───────────────────────── */
function CategoriaView({ cat, onBack }) {
  const [servicos, setServicos] = useState(null)
  const [loadErr, setLoadErr]   = useState(false)

  useEffect(() => {
    let active = true
    setServicos(null)
    setLoadErr(false)

    async function load() {
      const { data, error } = await supaPublic
        .from('servicos')
        .select('id,nome,tagline,icon,preco,preco_original,unidade,duracao_tipica,popular,eco,urgent,ordem')
        .eq('categoria_id', cat.id)
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
  }, [cat.id])

  return (
    <div style={{ minHeight: '100vh', background: V5.bg, paddingBottom: 90 }}>
      <div style={{
        background: V5.white, padding: '14px 16px',
        borderBottom: `1px solid ${V5.border}`,
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: V5.ink, padding: 0, flexShrink: 0 }}
        >←</button>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{cat.ic}</span>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: V5.ink, margin: 0, flex: 1 }}>
          {cat.l}
        </h1>
      </div>

      <div style={{ padding: '14px 14px 28px' }}>
        {servicos === null && !loadErr && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[...Array(5)].map((_, i) => <Skel key={i} />)}
          </div>
        )}

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
              onClick={() => { setLoadErr(false); setServicos(null) }}
              style={{
                background: V5.green, color: '#fff', border: 'none', borderRadius: 10,
                padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Tentar de novo
            </button>
          </div>
        )}

        {servicos !== null && servicos.length === 0 && (
          <div style={{
            padding: '40px 24px', textAlign: 'center',
            background: V5.white, borderRadius: 14, border: `1px dashed ${V5.border}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{cat.ic}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: V5.ink, marginBottom: 6 }}>
              Sem serviços disponíveis
            </div>
            <div style={{ fontSize: 12, color: V5.slate }}>
              Nenhum serviço nesta categoria de momento.
            </div>
          </div>
        )}

        {servicos !== null && servicos.length > 0 &&
          servicos.map(s => <SvcCard key={s.id} s={s} />)
        }
      </div>
    </div>
  )
}

/* ── Ecrã principal ──────────────────────────────────────────────── */
export default function ServicosScreen({ authUser, onHamburguer, onAvatarClick, onNavigateNotificacoes, onNavigateChatSuporte, notifCount = 0 }) {
  const [catSel, setCatSel] = useState(null)

  if (catSel) {
    return (
      <CategoriaView
        cat={catSel}
        onBack={() => setCatSel(null)}
      />
    )
  }

  return (
    <MarketplaceView
      onCatSel={setCatSel}
      onHamburguer={onHamburguer}
      onAvatarClick={onAvatarClick}
      authUser={authUser}
    />
  )
}
