import React, { useState, useEffect } from 'react'
import { supa } from './supa.js'
import { DEMO_LOCALIZACAO_ID } from './lib/demo.js'
import HeroHeader from './HeroHeader.jsx'
import { useImovelAtivo } from './lib/ImovelAtivoContext.jsx'
import { moradaCurta } from './lib/labels.js'

/* Paleta CASA — duplicada aqui para isolar o módulo do App.jsx */
const CASA = {
  green:   '#1B4332', greenMid: '#2D6A4F', greenLt: '#52B788', greenXl: '#D8F3DC',
  amber:   '#854F0B', amberLt:  '#FAEEDA', red:     '#A32D2D', redLt:   '#FCEBEB',
  border:  '#e5e5e3', bg:       '#f5f5f3',
}

const CASA_CAT_LABELS = {
  aquecimento:    'Aquecimento',
  climatizacao:   'Climatização',
  aguas_quentes:  'Águas Quentes',
  canalizacao:    'Canalização',
  eletrica:       'Eléctrica',
  cobertura:      'Cobertura',
  estrutura:      'Estrutura',
  piscina:        'Piscina',
  solar:          'Solar',
  elevador:       'Elevador',
  gerador:        'Gerador',
  eletrodomestico:'Eletrodoméstico',
  outros:         'Outros',
}

// TODO(mario): rever emojis de categoria se algum parecer estranha
const CASA_CAT_EMOJI = {
  aquecimento:    '🔥',
  climatizacao:   '❄️',
  aguas_quentes:  '💧',
  solar:          '☀️',
  eletrodomestico:'🧊',
  canalizacao:    '🚿',
  eletrica:       '⚡',
  cobertura:      '🏚️',
  estrutura:      '🏗️',
  piscina:        '🏊',
  elevador:       '🛗',
  gerador:        '🔌',
  outros:         '🔧',
}

const IPMA_LOCALS = {
  'Coimbra':1060300, 'Lisboa':1110600, 'Porto':1131200, 'Braga':1030300, 'Aveiro':1010500,
  'Faro':1080500, 'Leiria':1100900, 'Setúbal':1151200, 'Évora':1070500, 'Viseu':1182300,
  'Caldas da Rainha':1101000, 'Cascais':1110700, 'Sintra':1111400, 'Almada':1151500,
  'Vila Nova de Gaia':1131700,
}

// IPMA — já implementado antes do planeado (3.5), preservado na extracção
// MASTER.md será actualizado para reflectir isto
async function fetchPrevisaoIPMA(concelho) {
  const id = IPMA_LOCALS[concelho]
  if (!id) return null
  try {
    const r = await fetch(`https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/${id}.json`)
    if (!r.ok) return null
    const j = await r.json()
    return Array.isArray(j?.data) ? j.data : null
  } catch { return null }
}

function gerarAlertasMeteoManutencao(previsao) {
  if (!Array.isArray(previsao)) return []
  const out = []
  previsao.slice(0, 3).forEach((d, i) => {
    const t    = d.tMax != null ? Number(d.tMax) : null
    const tMin = d.tMin != null ? Number(d.tMin) : null
    const vento = Number(d.classWindSpeed || 0)
    const chuva = Number(d.classPrecInt   || 0)
    const ref = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : `em ${i + 1} dias`
    if (chuva >= 2)
      out.push({ nivel: chuva >= 3 ? 'laranja' : 'amarelo', tipo: 'chuva_intensa',
        ic: '🌧️', titulo: `Chuva ${chuva >= 3 ? 'forte' : 'moderada'} ${ref}`,
        desc: 'Verificar caleiras, terraço e escoamento.' })
    if (t != null && t >= 33)
      out.push({ nivel: t >= 35 ? 'laranja' : 'amarelo', tipo: 'calor',
        ic: '☀️', titulo: `Calor ${t >= 35 ? 'extremo' : 'intenso'} ${ref} (${t.toFixed(0)}°C)`,
        desc: 'Verificar AC, filtros e isolamento de cobertura.' })
    if (tMin != null && tMin <= 3)
      out.push({ nivel: tMin <= 0 ? 'laranja' : 'amarelo', tipo: 'frio',
        ic: '❄️', titulo: `Frio intenso ${ref} (mín ${tMin.toFixed(0)}°C)`,
        desc: 'Verificar caldeira e canalização exterior.' })
    if (vento >= 3)
      out.push({ nivel: 'amarelo', tipo: 'vento',
        ic: '💨', titulo: `Vento forte ${ref}`,
        desc: 'Fixar antenas, toldos e elementos exteriores soltos.' })
  })
  return out.slice(0, 3)
}

function scoreHeroColor(s) {
  if (s <= 40) return '#D32F2F'
  if (s <= 60) return '#F57C00'
  if (s <= 80) return '#52B788'
  return '#1B4332'
}

function nextLabel(eq) {
  if (eq.health_score != null && eq.health_score < 50) return 'inspecionar'
  if (eq.data_proxima_revisao) {
    const d = new Date(eq.data_proxima_revisao)
    const days = Math.round((d - new Date()) / 86400000)
    if (days < 0)  return 'revisão vencida'
    if (days < 30) return `revisão em ${days}d`
  }
  if (eq.data_garantia_fim) {
    const d = new Date(eq.data_garantia_fim)
    if (d < new Date()) return 'garantia expirada'
  }
  return 'em dia'
}

/* ══════════════════════════════════
   CasaScreen — ecrã principal do módulo Casa.
   Props mantidos da versão inline em App.jsx.
   Fases 3.3–3.5 substituirão os alerts placeholder por ecrãs reais.
══════════════════════════════════ */
export default function CasaScreen({ equipamentos, authUser, onNavigate, onHamburguer, onAvatarClick, onNavigateScore, onNavigateNotificacoes, onNavigateChatSuporte, notifCount = 0 }) {
  const { imovelAtivo, imoveis, loading: ctxLoading } = useImovelAtivo()
  const loc   = imovelAtivo
  const nLocs = imoveis.length
  const eqs   = Array.isArray(equipamentos)
    ? equipamentos.filter(e => !loc || e.localizacao_id === loc.id)
    : []
  const loading = ctxLoading || equipamentos === null

  const [alertasMeteo, setAlertasMeteo] = useState([])
  const [faturas, setFaturas]           = useState(null)

  // IPMA — preservado da versão inline; MASTER.md a actualizar (3.5 → já implementado)
  useEffect(() => {
    if (!loc?.concelho) return
    let active = true
    fetchPrevisaoIPMA(loc.concelho).then(prev => {
      if (!active) return
      setAlertasMeteo(gerarAlertasMeteoManutencao(prev))
    })
    return () => { active = false }
  }, [loc?.concelho])

  // Histórico faturas OCR — energia já implementada (3.4 → já implementado)
  // TODO(mario): substituir DEMO_LOCALIZACAO_ID por loc.id quando auth real (Fase 4)
  useEffect(() => {
    const locId = loc?.id || DEMO_LOCALIZACAO_ID
    setFaturas(null)
    let active = true
    supa.from('documentos')
      .select('dados_ocr, created_at')
      .eq('localizacao_id', locId)
      .eq('tipo', 'fatura')
      .not('dados_ocr', 'is', null)
      .order('created_at', { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (active) setFaturas(data || [])
      })
    return () => { active = false }
  }, [loc?.id])

  const scores = loc ? [
    ['🔥', 'AVAC',      loc.score_avac      ?? 0],
    ['🚿', 'Canaliz.',  loc.score_canaliz   ?? 0],
    ['⚡', 'Elétrica',  loc.score_eletrica  ?? 0],
    ['🏗️', 'Estrutura', loc.score_estrutura ?? 0],
    ['💧', 'Água',      loc.score_agua      ?? 0],
  ] : []

  const consumoResumo = (() => {
    if (!faturas || faturas.length === 0) return null
    const valid = faturas.map(f => f.dados_ocr).filter(o => o && (o.consumo_kwh || o.custo_total_eur))
    if (valid.length === 0) return null
    const totalKwh = valid.reduce((s, o) => s + Number(o.consumo_kwh    || 0), 0)
    const totalEur = valid.reduce((s, o) => s + Number(o.custo_total_eur || 0), 0)
    return { n: valid.length, totalKwh, totalEur, mediaKwh: totalKwh / valid.length, mediaEur: totalEur / valid.length }
  })()

  const heroColor = scoreHeroColor(loc?.home_score ?? 0)

  return (
    <div style={{ minHeight: '100vh', background: CASA.bg, paddingBottom: 88 }}>

      {/* HEADER + HERO */}
      <div style={{ background: CASA.green, padding: '14px 16px 22px' }}>
        <HeroHeader
          onHamburguer={onHamburguer}
          onAvatarClick={onAvatarClick}
          locationLabel={loc ? (moradaCurta(loc) || loc.nome) : 'A MINHA CASA'}
          authUser={authUser}
          notifCount={notifCount}
          onNotifClick={onNavigateNotificacoes}
          onChatClick={onNavigateChatSuporte}
        />
        {nLocs > 1 && (
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => onNavigate?.('locais')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              +{nLocs - 1} outra{nLocs - 1 > 1 ? 's' : ''} ⌄
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ height: 110, background: 'rgba(255,255,255,0.1)', borderRadius: 12 }} />
        ) : !loc ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', padding: '20px 0' }}>
            Nenhuma localização registada. Adicione a primeira para começar.
          </div>
        ) : (
          /* HERO compact — número esquerda, mini-barras direita */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <button onClick={onNavigateScore} style={{ background: 'none', border: 'none', cursor: onNavigateScore ? 'pointer' : 'default', textAlign: 'left', padding: 0 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                {moradaCurta(loc) || loc.nome}
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, marginTop: 4, color: '#fff' }}>
                {loc.home_score ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                Home Score · {
                  (loc.home_score ?? 0) >= 80 ? '🌟 Excelente' :
                  (loc.home_score ?? 0) >= 60 ? '🌱 Saudável'  :
                  (loc.home_score ?? 0) >= 40 ? '⚠️ A Cuidar'  : '🔧 A Melhorar'
                }
              </div>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 10 }}>
              {scores.map(([, label, val]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', width: 52, textAlign: 'right' }}>
                    {label}
                  </span>
                  <div style={{ width: 44, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${val}%`, height: 4,
                      background: val >= 85 ? CASA.greenLt : val >= 70 ? '#FAC775' : '#F9BABA',
                    }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', width: 18 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 7, padding: '10px 12px 0' }}>
        {[
          ['📷', 'Câmara',  'camera'],
          ['🏠', 'Locais',  'locais'],
          ['📄', 'Docs',    'docs'],
          ['⚡', 'Energia', 'energia'],
        ].map(([ic, l, target]) => (
          <button key={l} onClick={() => onNavigate?.(target)} style={{
            background: '#fff', border: `1px solid ${CASA.border}`, borderRadius: 10,
            padding: '9px 4px', textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 19, marginBottom: 3 }}>{ic}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#555' }}>{l}</div>
          </button>
        ))}
      </div>

      {/* AI EXPERT CARD */}
      <div style={{ margin: '10px 12px 0' }}>
        <button
          onClick={() => onNavigate?.('aiexpert')}
          style={{
            width: '100%', background: 'linear-gradient(135deg,#26215C,#534AB7)',
            border: 'none', borderRadius: 12, padding: '12px 14px',
            cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 11,
          }}
        >
          <span style={{ fontSize: 26, flexShrink: 0 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              AI Expert
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)' }}>
              Conhece a tua casa · pergunta tudo
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: 7,
            padding: '4px 9px', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>Chat →</div>
        </button>
      </div>

      {/* ALERTAS METEO IPMA */}
      {alertasMeteo.map((a, i) => {
        const laranja = a.nivel === 'laranja'
        return (
          <div key={i} style={{
            margin: i === 0 ? '10px 12px 0' : '6px 12px 0',
            background: laranja ? '#FFE9CE' : CASA.amberLt,
            borderRadius: 11, padding: '10px 12px',
            border: `1px solid ${laranja ? '#E8871D' : '#EF9F27'}`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{a.ic}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: CASA.amber }}>{a.titulo}</div>
              <div style={{ fontSize: 11, color: CASA.amber, marginTop: 2, lineHeight: 1.45 }}>
                IPMA · {loc?.concelho} · {a.desc}
              </div>
              <button
                onClick={() => onNavigate?.('aiexpert', { context: a })}
                style={{ background: 'none', border: 'none', padding: 0, marginTop: 6, color: '#185FA5', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                Perguntar à AI →
              </button>
            </div>
          </div>
        )
      })}

      {/* CONSUMOS HISTÓRICOS DE ELETRICIDADE — preservado da extracção */}
      {loc && (
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Consumos de eletricidade</div>
            <button onClick={() => onNavigate?.('energia')} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: CASA.greenLt, cursor: 'pointer', fontWeight: 600 }}>
              Abrir →
            </button>
          </div>

          {faturas === null && (
            <div style={{ height: 70, background: '#e8e8e6', borderRadius: 11 }} />
          )}
          {faturas && faturas.length === 0 && (
            <div style={{ background: '#fff', border: `1px dashed ${CASA.border}`, borderRadius: 11, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', marginBottom: 3 }}>
                  Adicione faturas para ver um resumo
                </div>
                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5, marginBottom: 8 }}>
                  Carregue 3–6 faturas recentes — IA lê fornecedor, consumo e tarifa para montar o histórico.
                </div>
                <button onClick={() => onNavigate?.('energia')} style={{ background: CASA.greenLt, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                  + Adicionar fatura
                </button>
              </div>
            </div>
          )}
          {faturas && faturas.length > 0 && consumoResumo && (
            <div style={{ background: '#fff', border: `1px solid ${CASA.border}`, borderRadius: 11, padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.3 }}>Média / mês</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginTop: 2 }}>{consumoResumo.mediaKwh.toFixed(0)} kWh</div>
                  <div style={{ fontSize: 11, color: CASA.greenLt, fontWeight: 700 }}>€{consumoResumo.mediaEur.toFixed(2).replace('.', ',')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.3 }}>Total</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginTop: 2 }}>{consumoResumo.totalKwh.toFixed(0)} kWh</div>
                  <div style={{ fontSize: 11, color: '#555' }}>€{consumoResumo.totalEur.toFixed(2).replace('.', ',')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.3 }}>Faturas</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginTop: 2 }}>{consumoResumo.n}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>OCR lidas</div>
                </div>
              </div>
              {/* Sparkline das últimas faturas */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, padding: '0 2px' }}>
                {(() => {
                  const vals = faturas.map(f => Number(f.dados_ocr?.consumo_kwh || 0)).filter(v => v > 0).slice(0, 12).reverse()
                  const max  = Math.max(...vals, 1)
                  return vals.map((v, i) => (
                    <div key={i} title={`${v} kWh`} style={{
                      flex: 1, height: `${Math.max(6, (v / max) * 36)}px`,
                      background: v > max * 0.8 ? '#EF4444' : v > max * 0.6 ? '#F59E0B' : CASA.greenLt,
                      borderRadius: 2,
                    }} />
                  ))
                })()}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => onNavigate?.('energia')} style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${CASA.greenLt}`, background: CASA.greenXl, color: CASA.green, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  + Fatura histórica
                </button>
                <button onClick={() => onNavigate?.('energia')} style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${CASA.border}`, background: '#fff', color: '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Ver detalhe
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EQUIPAMENTOS — lista completa com emoji + health */}
      <div style={{ padding: '12px 12px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Equipamentos</div>

        {loading && <div style={{ height: 54, background: '#e8e8e6', borderRadius: 11, marginBottom: 7 }} />}
        {!loading && eqs.length === 0 && (
          <div style={{ padding: '20px 14px', textAlign: 'center', background: '#fff', border: `1px dashed ${CASA.border}`, borderRadius: 11, fontSize: 12, color: '#666' }}>
            Ainda sem equipamentos. Adicione via câmara IA ou formulário.
          </div>
        )}

        {eqs.map(eq => {
          const hasIssue = eq.health_score != null && eq.health_score < 60
          const stColor  = eq.health_score != null
            ? (eq.health_score >= 75 ? CASA.greenLt : eq.health_score >= 50 ? '#F59E0B' : '#EF4444')
            : '#ccc'
          return (
            <button key={eq.id} onClick={() => onNavigate?.('ficha', eq)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: hasIssue ? '#FFFBF0' : '#fff',
              border: `1px solid ${hasIssue ? '#F5C842' : CASA.border}`,
              borderRadius: 11, padding: '10px 12px', marginBottom: 7,
              cursor: 'pointer', width: '100%', textAlign: 'left',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>
                {CASA_CAT_EMOJI[eq.categoria] || '🔧'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {hasIssue && <span style={{ marginRight: 4 }}>⚠️</span>}
                  {eq.nome}
                </div>
                <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>
                  {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                  {' · '}{CASA_CAT_LABELS[eq.categoria] || eq.categoria}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: hasIssue ? '#F57C00' : '#333' }}>
                  {eq.health_score ?? '—'}
                </div>
                <div style={{ fontSize: 10, color: '#999' }}>{nextLabel(eq)}</div>
              </div>
            </button>
          )
        })}

        <button
          onClick={() => alert('Adicionar equipamento: câmara IA em 3.5 · formulário manual em 3.3')}
          style={{
            width: '100%', background: '#fff',
            border: `1.5px dashed ${CASA.greenLt}`,
            borderRadius: 11, padding: '10px', marginBottom: 8,
            cursor: 'pointer', fontSize: 12, color: CASA.greenLt, fontWeight: 600,
          }}
        >
          + Adicionar equipamento
        </button>
      </div>

      {/* POUPANÇAS MOCK — preservado da extracção (será dinâmico em 3.3) */}
      {!loading && eqs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
          <button onClick={() => onNavigate?.('energia')} style={{ border: `1px solid ${CASA.greenLt}`, borderRadius: 11, padding: 10, background: CASA.greenXl, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: 9, background: CASA.greenLt, color: '#fff', padding: '2px 7px', borderRadius: 8, display: 'inline-block', marginBottom: 4, fontWeight: 600 }}>Troca rentável</div>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>Caldeira Junkers</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: CASA.green }}>-28%</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>~10€/mês poupança</div>
          </button>
          <button onClick={() => onNavigate?.('energia')} style={{ border: `1px solid ${CASA.border}`, borderRadius: 11, padding: 10, cursor: 'pointer', textAlign: 'left', background: '#fff' }}>
            <div style={{ fontSize: 9, background: '#FAC775', color: '#412402', padding: '2px 7px', borderRadius: 8, display: 'inline-block', marginBottom: 4, fontWeight: 600 }}>Revisão urgente</div>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>AC Daikin sala</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>-15%</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Limpeza filtros imediata</div>
          </button>
        </div>
      )}

      {/* HOME ASSESSMENT PENDENTE — só aparece se !assessment_completo */}
      {loc && !loc.assessment_completo && (
        <div style={{ margin: '0 12px 16px', background: '#fff', border: `1px solid ${CASA.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1B4332', marginBottom: 4 }}>
                📋 Home Assessment pendente
              </div>
              <div style={{ fontSize: 11.5, color: '#555', lineHeight: 1.5, marginBottom: 10 }}>
                Responde a 12 perguntas rápidas sobre a tua casa e recebe o teu Home Score detalhado.
              </div>
              <button
                onClick={() => alert('Form assessment em 3.5')}
                style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Completar agora →
              </button>
            </div>
            <div style={{ background: '#D4A72C', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              +300 pts
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
