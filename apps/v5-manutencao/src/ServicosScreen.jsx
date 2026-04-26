import React, { useState, useEffect, useRef } from 'react'
import HeroHeader from './HeroHeader.jsx'
import { supa, supaPublic } from './supa.js'

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
  { id: 'orcamentos',  l: 'À medida',    ic: '📋', bg: '#EEEDFE', nova: true },
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

const MAIS_FALLBACK = [
  { id:'fb1', nome:'Limpeza doméstica',     categoria_id:'limpeza',     sub_grupo:'Limpeza regular', preco:'42', duracao_tipica:'2h' },
  { id:'fb2', nome:'Desentupimento urgente',categoria_id:'canalizacao', sub_grupo:'Fugas e diagnósticos', preco:'65', duracao_tipica:null },
  { id:'fb3', nome:'Manutenção ar condicionado',categoria_id:'manutencao',sub_grupo:'Climatização', preco:'79', duracao_tipica:'90min' },
]

// Adapters BD → componente
function adaptCombo(c) {
  return {
    id:    c.id,
    t:     c.nome,
    s:     c.sub,
    p:     parseFloat(c.preco_combo),
    o:     parseFloat(c.preco_normal),
    bg:    c.cor_hex || '#E6F1FB',
    emoji: c.emoji || '🏠',
    desc:  c.desconto_pct || Math.round((1 - parseFloat(c.preco_combo) / parseFloat(c.preco_normal)) * 100),
    _raw:  c,
  }
}

function adaptComboForDetail(c) {
  const poupanca = (parseFloat(c.preco_normal) - parseFloat(c.preco_combo)).toFixed(0)
  return {
    id:            c.id,
    titulo:        c.nome,
    sub:           c.sub,
    emoji:         c.emoji || '🏠',
    preco:         `€${parseFloat(c.preco_combo).toFixed(0)}`,
    precoOriginal: `€${parseFloat(c.preco_normal).toFixed(0)}`,
    desconto:      c.desconto_pct || Math.round((1 - parseFloat(c.preco_combo) / parseFloat(c.preco_normal)) * 100),
    bg:            c.cor_hex || '#E6F1FB',
    cor_texto:     c.cor_texto || '#1B4332',
    servicos:      c.servicos_ids || [],
    poupanca:      `${poupanca}€`,
    descricao:     c.descricao_longa,
    imagem_url:    c.imagem_url || null,
  }
}

const CAT_EMOJI = { limpeza:'✨', manutencao:'🔧', jardim:'🌿', piscina:'🌊', pintura:'🖌️', eletrica:'⚡', canalizacao:'💧', pos_obra:'🏗️' }

/* ── Helpers ─────────────────────────────────────────────────────── */

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

/* ── Vista marketplace (ecrã principal de serviços) ──────────────── */
function MarketplaceView({
  onNavigateCategoria, onHamburguer, onAvatarClick, authUser,
  notifCount, onNavigateNotificacoes, onNavigateChatSuporte,
  onOpenImovelSelector, onNavigateOrcamentos, onNavigateReferral,
  onNavigateCombo, onNavigateServico, onNavigatePacksLista,
  onNavigateMaisContratados, onNavigateOrcamentoPersonalizado,
  onNavigatePlanoHome,
}) {
  const [combos,         setCombos]         = useState([])
  const [maisContratados,setMaisContratados] = useState(MAIS_FALLBACK)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [searchLoading,  setSearchLoading]  = useState(false)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const debounceRef = useRef(null)

  // Carregar combos da BD
  useEffect(() => {
    supa.from('combos').select('*').eq('ativo', true).eq('popular', true).order('ordem').limit(4)
      .then(({ data }) => { if (data && data.length) setCombos(data) })
  }, [])

  // Carregar mais contratados da BD
  useEffect(() => {
    supaPublic.from('servicos')
      .select('id,nome,preco,preco_original,categoria_id,sub_grupo,tagline,duracao_tipica')
      .eq('activo', true).eq('popular', true).limit(8)
      .then(({ data }) => { if (data && data.length) setMaisContratados(data) })
  }, [])

  // Pesquisa com debounce 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      const { data } = await supaPublic.from('servicos')
        .select('id,nome,preco,categoria_id,sub_grupo,tagline,duracao_tipica')
        .eq('activo', true)
        .ilike('nome', `%${searchQuery}%`)
        .limit(6)
      setSearchResults(data || [])
      setShowDropdown(true)
      setSearchLoading(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  const displayCombos = combos.map(adaptCombo)
  const queryTrunc = searchQuery.length > 25 ? searchQuery.substring(0, 25) + '…' : searchQuery

  return (
    <div style={{ minHeight: '100vh', background: V5.bg, paddingBottom: 90 }}>
      {/* Placeholder CSS para input search */}
      <style>{'.v5-srch::placeholder{color:rgba(255,255,255,0.5)}'}</style>

      {/* Hero verde — sticky */}
      <div style={{
        background: `linear-gradient(145deg,${V5.green},${V5.greenMid})`,
        padding: '14px 14px 16px', color: '#fff',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <HeroHeader
          onHamburguer={onHamburguer}
          onAvatarClick={onAvatarClick}
          onImovelClick={onOpenImovelSelector}
          authUser={authUser}
          notifCount={notifCount}
          onNotifClick={onNavigateNotificacoes}
          onChatClick={onNavigateChatSuporte}
        />
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.65)', fontWeight: 700, letterSpacing: .6, marginBottom: 2 }}>SERVIÇOS · 199 DISPONÍVEIS</div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>O que precisa hoje?</div>

        {/* Barra de pesquisa */}
        <div style={{ position: 'relative' }}>
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: showDropdown && searchQuery ? '10px 10px 0 0' : 10,
            padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 9,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>🔍</span>
            <input
              className="v5-srch"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Procurar serviço..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, color: '#fff',
              }}
            />
            {searchQuery && (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setSearchQuery(''); setShowDropdown(false) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>
                ×
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {showDropdown && searchQuery.trim() && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#fff', borderRadius: '0 0 12px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              maxHeight: 310, overflowY: 'auto',
            }}>
              {searchLoading && (
                <div style={{ padding: '12px 14px', fontSize: 12, color: V5.slate }}>A procurar...</div>
              )}
              {!searchLoading && searchResults.map((s, i) => (
                <div
                  key={s.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { onNavigateServico?.(s); setSearchQuery(''); setShowDropdown(false) }}
                  style={{
                    padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: i < searchResults.length - 1 ? `1px solid ${V5.border}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{CAT_EMOJI[s.categoria_id] || '🔧'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: V5.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</div>
                    <div style={{ fontSize: 11, color: V5.slate }}>{s.sub_grupo || ''}</div>
                  </div>
                  {s.preco != null && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: V5.green, flexShrink: 0 }}>€{Number(s.preco).toFixed(0)}</div>
                  )}
                </div>
              ))}
              {!searchLoading && searchResults.length === 0 && (
                <div style={{ padding: '10px 14px', fontSize: 12, color: V5.slate }}>Sem resultados exactos para "{queryTrunc}"</div>
              )}
              {/* Cartão orçamento personalizado — sempre visível */}
              <div
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onNavigateOrcamentoPersonalizado?.(searchQuery); setSearchQuery(''); setShowDropdown(false) }}
                style={{
                  margin: '6px 10px 10px', background: '#FCEBEB',
                  borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                  display: 'flex', gap: 10, alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>📋</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8B2E2E' }}>Orçamento personalizado</div>
                  <div style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>
                    Descrever "{queryTrunc}" e receber propostas
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 0 28px' }}>
        {/* Banner referral */}
        <div
          onClick={onNavigateReferral}
          style={{ margin:'12px 14px 0', background:'linear-gradient(90deg,#FAEEDA,#FFF4D6)', border:`1px solid #D4A72C`, borderRadius:12, padding:'10px 13px', display:'flex', gap:9, alignItems:'center', cursor:'pointer' }}
        >
          <div style={{ fontSize:22 }}>🎁</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#B45309' }}>Convida amigos · ganha 15€ por cada um</div>
            <div style={{ fontSize:10, color:'#B45309', marginTop:1 }}>Até 300€ em créditos · partilha o teu código</div>
          </div>
          <div style={{ background:'#D97706', color:'#fff', padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, flexShrink:0 }}>Partilhar</div>
        </div>

        {/* Banner Home+ */}
        <div
          onClick={onNavigatePlanoHome}
          style={{
            margin: '8px 14px 0',
            background: V5.greenXl, border: `1px solid ${V5.greenLt}`,
            borderRadius: 12, padding: '11px 14px',
            display: 'flex', gap: 10, alignItems: 'center',
            cursor: onNavigatePlanoHome ? 'pointer' : 'default',
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>🏠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: V5.green }}>Plano Home+ · 10% crédito em tudo</div>
            <div style={{ fontSize: 10, color: V5.greenMid, marginTop: 1 }}>6,90€/mês · crédito automático por serviço</div>
          </div>
          {onNavigatePlanoHome && <span style={{ fontSize: 14, color: V5.greenLt }}>›</span>}
        </div>

        {/* Carrossel de promos */}
        <div style={{ padding: '12px 12px 0', display: 'flex', gap: 9, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {PROMOS.map((promo, i) => {
            const handlePromo = () => {
              if (i === 0) onNavigateCategoria?.({ id:'limpeza',     nome:'Limpeza',     emoji:'✨' })
              else if (i === 1) onNavigatePacksLista?.()
              else if (i === 2) onNavigateCategoria?.({ id:'canalizacao', nome:'Canalização', emoji:'💧' })
            }
            return (
              <div key={i} onClick={handlePromo} style={{
                minWidth: '85%', borderRadius: 13, padding: '12px 14px',
                background: promo.bg, cursor: 'pointer', flexShrink: 0,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: promo.tagColor, marginBottom: 4 }}>{promo.tag}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: V5.ink, lineHeight: 1.15, fontFamily: 'Georgia,serif', marginBottom: 3 }}>
                  {promo.titleBefore}
                  <span style={{ color: promo.highlightColor }}>{promo.titleHighlight}</span>
                  {promo.titleAfter}
                </div>
                <div style={{ fontSize: 10, color: V5.slate, marginTop: 3 }}>{promo.sub}</div>
                <button onClick={e => { e.stopPropagation(); handlePromo() }} style={{ background: promo.btnBg, color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 9 }}>
                  Explorar →
                </button>
              </div>
            )
          })}
        </div>

        {/* Categorias — grid */}
        <div style={{ padding: '16px 14px 6px', fontSize: 14, fontWeight: 700, color: V5.ink }}>Categorias</div>
        <div style={{ padding: '0 14px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {CATS_GRID.map(cat => (
            <button key={cat.id}
              onClick={() => {
                if (cat.id === 'orcamentos') onNavigateOrcamentos?.()
                else if (cat.id === 'packs') onNavigatePacksLista?.()
                else onNavigateCategoria?.({ id: cat.id, nome: cat.l, emoji: cat.ic })
              }}
              style={{
                background: V5.white, border: `1px solid ${cat.nova ? V5.purple : V5.border}`,
                borderRadius: 12, padding: '9px 4px', cursor: 'pointer', textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                position: 'relative',
              }}>
              {cat.nova && (
                <div style={{ position:'absolute', top:-5, right:-3, background:V5.purple, color:'#fff', fontSize:7, padding:'2px 5px', borderRadius:5, fontWeight:700, letterSpacing:.3 }}>NOVO</div>
              )}
              <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {cat.ic}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: cat.nova ? V5.purple : V5.slate, lineHeight: 1.2 }}>
                {cat.l}
              </span>
            </button>
          ))}
        </div>

        {/* Orçamentos à medida — card roxo */}
        <div style={{ padding: '14px 14px 0' }}>
          <button
            onClick={onNavigateOrcamentos}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'linear-gradient(135deg,#26215C,#534AB7)',
              border: 'none', borderRadius: 14, padding: '14px 16px',
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 4px 14px rgba(83,74,183,0.35)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Orçamentos à medida</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, lineHeight: 1.4 }}>
                Descreve o teu projecto e recebe propostas de profissionais
              </div>
            </div>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>›</span>
          </button>
        </div>

        {/* Banner Packs */}
        <div
          onClick={onNavigatePacksLista}
          style={{
            margin: '12px 14px 0',
            background: 'linear-gradient(90deg, #FFF4D6, #FAEEDA)',
            border: '1px solid #D4A72C',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 24 }}>🎁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#854F0B', fontFamily: 'Georgia,serif' }}>
              Packs · poupa até 25%
            </div>
            <div style={{ fontSize: 10.5, color: '#854F0B', marginTop: 2 }}>
              Combos sazonais com desconto · 1 visita · 1 fatura
            </div>
          </div>
          <div style={{ fontSize: 18, color: '#854F0B' }}>›</div>
        </div>

        {/* Combos populares */}
        <div style={{ padding: '16px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: V5.ink }}>🔥 Combos populares</div>
          <div style={{ fontSize: 10, color: V5.greenLt, fontWeight: 700, cursor: 'pointer' }} onClick={onNavigatePacksLista}>Ver todos →</div>
        </div>
        <div style={{ padding: '0 0 0 14px', display: 'flex', gap: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingRight: 14 }}>
          {displayCombos.map((b, i) => (
            <div
              key={b.id || i}
              onClick={() => onNavigateCombo?.(adaptComboForDetail(b._raw))}
              style={{ minWidth: 155, background: b.bg, borderRadius: 12, padding: '11px 12px', cursor: 'pointer', flexShrink: 0 }}
            >
              <div style={{ fontSize: 9, color: V5.coral, fontWeight: 700, marginBottom: 4 }}>-{b.desc}%</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: V5.ink }}>{b.t}</div>
              <div style={{ fontSize: 10, color: V5.slate, marginTop: 3, minHeight: 28, lineHeight: 1.35 }}>{b.s}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: V5.green }}>{b.p}€</span>
                <span style={{ fontSize: 9, color: V5.slate, textDecoration: 'line-through' }}>{b.o}€</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mais contratados */}
        <div style={{ padding: '16px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: V5.ink }}>⭐ Mais contratados</div>
          <div style={{ fontSize: 10, color: V5.greenLt, fontWeight: 700, cursor: 'pointer' }} onClick={onNavigateMaisContratados}>Ver todos →</div>
        </div>
        <div style={{ padding: '0 14px' }}>
          {maisContratados.map((s, i) => (
            <div
              key={s.id || i}
              onClick={() => onNavigateServico?.(s)}
              style={{
                background: V5.white, border: `1px solid ${V5.border}`,
                borderRadius: 12, padding: '11px 13px', marginBottom: 8,
                display: 'flex', gap: 12, alignItems: 'center',
                cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }}>{CAT_EMOJI[s.categoria_id] || '🔧'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: V5.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</div>
                <div style={{ fontSize: 10, color: V5.slate, marginTop: 2 }}>{s.sub_grupo}{s.duracao_tipica ? ` · ${s.duracao_tipica}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {s.preco_original && Number(s.preco_original) > Number(s.preco) && (
                  <div style={{ fontSize: 9, color: V5.slate, textDecoration: 'line-through' }}>€{Number(s.preco_original).toFixed(0)}</div>
                )}
                {s.preco != null && (
                  <div style={{ fontSize: 14, fontWeight: 800, color: V5.green }}>€{Number(s.preco).toFixed(0)}</div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

/* ── Ecrã principal ──────────────────────────────────────────────── */
export default function ServicosScreen({
  authUser, onHamburguer, onAvatarClick,
  onNavigateNotificacoes, onNavigateChatSuporte, notifCount = 0,
  onOpenImovelSelector, onNavigateOrcamentos, onNavigateReferral,
  onNavigateCategoria, onNavigateCombo, onNavigateServico,
  onNavigatePacksLista, onNavigateMaisContratados, onNavigateOrcamentoPersonalizado,
  onNavigatePlanoHome,
}) {
  return (
    <MarketplaceView
      onNavigateCategoria={onNavigateCategoria}
      onHamburguer={onHamburguer}
      onAvatarClick={onAvatarClick}
      authUser={authUser}
      notifCount={notifCount}
      onNavigateNotificacoes={onNavigateNotificacoes}
      onNavigateChatSuporte={onNavigateChatSuporte}
      onOpenImovelSelector={onOpenImovelSelector}
      onNavigateOrcamentos={onNavigateOrcamentos}
      onNavigateReferral={onNavigateReferral}
      onNavigateCombo={onNavigateCombo}
      onNavigateServico={onNavigateServico}
      onNavigatePacksLista={onNavigatePacksLista}
      onNavigateMaisContratados={onNavigateMaisContratados}
      onNavigateOrcamentoPersonalizado={onNavigateOrcamentoPersonalizado}
      onNavigatePlanoHome={onNavigatePlanoHome}
    />
  )
}
