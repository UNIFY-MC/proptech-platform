import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const sb = createClient(SUPABASE_URL, ANON_KEY, { db: { schema: 'growth' } })

const STAGES = [
  { id: 'qualificado', label: 'Qualificado', color: '#58a6ff' },
  { id: 'proposta',    label: 'Proposta',    color: '#e3b341' },
  { id: 'negociacao',  label: 'Negociação',  color: '#d2a8ff' },
  { id: 'ganha',       label: 'Ganha',       color: '#3fb950' },
  { id: 'perdida',     label: 'Perdida',     color: '#ff7b72' },
]

function eur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
function fdate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function GrowthOportunidades() {
  const [oports, setOports] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [filterVertical, setFilterVertical] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await sb
      .from('oportunidades')
      .select('id, vertical, origem, cross_sell_rule_id, valor_estimado, probabilidade, estado, data_fecho_prevista, data_fecho_real, motivo_perda, notas, created_at, pessoa_id, lead_id')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    else setOports(data || [])
  }

  const visible = useMemo(() => {
    if (!oports) return null
    if (!filterVertical) return oports
    return oports.filter(o => o.vertical === filterVertical)
  }, [oports, filterVertical])

  const grouped = useMemo(() => {
    const out = Object.fromEntries(STAGES.map(s => [s.id, []]))
    for (const o of (visible || [])) if (out[o.estado]) out[o.estado].push(o)
    return out
  }, [visible])

  const totals = useMemo(() => {
    if (!visible) return null
    const sumWeighted = visible
      .filter(o => o.estado !== 'perdida')
      .reduce((a, o) => a + (Number(o.valor_estimado ?? 0) * Number(o.probabilidade ?? 0) / 100), 0)
    const sumPipeline = visible
      .filter(o => o.estado !== 'perdida' && o.estado !== 'ganha')
      .reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0)
    const ganhas = visible.filter(o => o.estado === 'ganha').reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0)
    return { sumWeighted, sumPipeline, ganhas, count: visible.length }
  }, [visible])

  async function moveStage(id, newStage) {
    setBusy(id)
    const patch = { estado: newStage, updated_at: new Date().toISOString() }
    if (newStage === 'ganha' || newStage === 'perdida') patch.data_fecho_real = new Date().toISOString().slice(0, 10)
    const { error } = await sb.from('oportunidades').update(patch).eq('id', id)
    setBusy(null)
    if (!error) load()
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Growth · Pipeline de Oportunidades</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
        Vendas em curso cross-vertical. Schema <code style={{ fontFamily: 'monospace' }}>growth.oportunidades</code>. Origem: leads convertidos + cross-sell rules engine.
      </p>

      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <Kpi label="Total Oport." value={totals.count} sub="incluindo todos os estados" />
          <Kpi label="Pipeline" value={eur(totals.sumPipeline)} sub="valor em aberto" tone="blue" />
          <Kpi label="Forecast Weighted" value={eur(totals.sumWeighted)} sub="valor × probabilidade" tone="gold" />
          <Kpi label="Ganhas (LTD)" value={eur(totals.ganhas)} sub="receita confirmada" tone="green" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select
          value={filterVertical}
          onChange={e => setFilterVertical(e.target.value)}
          style={{ background: '#1c2840', border: '1px solid #35405a', color: '#e6edf3',
                   padding: '6px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}
        >
          <option value="">Todas as verticais</option>
          {['v2','v3','v4','v5','v10'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {error && <div style={{ padding: 12, background: 'rgba(255,123,114,0.1)', border: '1px solid rgba(255,123,114,0.3)', borderRadius: 6, color: '#ff7b72', fontSize: 13, marginBottom: 16 }}>Erro: {error}</div>}
      {oports === null && <div style={{ color: '#888' }}>A carregar…</div>}

      {oports && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 12 }}>
          {STAGES.map(stage => {
            const items = grouped[stage.id]
            const stageValue = items.reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0)
            return (
              <div key={stage.id} style={{ background: '#1c2840', border: '1px solid #35405a', borderRadius: 8, padding: 10 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: stage.color }}>● {stage.label}</span>
                    <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{items.length}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>
                    {eur(stageValue)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                  {items.map(o => (
                    <OportunidadeCard
                      key={o.id}
                      oport={o}
                      busy={busy === o.id}
                      currentStage={stage.id}
                      onMove={moveStage}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OportunidadeCard({ oport, busy, currentStage, onMove }) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div style={{
      background: '#233050', border: '1px solid #35405a', borderRadius: 6,
      padding: 10, fontSize: 12, opacity: busy ? 0.4 : 1, position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 3, fontFamily: 'monospace' }}>
          {oport.vertical}
        </span>
        <span style={{ fontSize: 9, padding: '1px 6px',
                       background: oport.origem === 'cross_sell' ? 'rgba(210,168,255,0.15)' : 'rgba(88,166,255,0.15)',
                       color: oport.origem === 'cross_sell' ? '#d2a8ff' : '#58a6ff',
                       borderRadius: 3, fontFamily: 'monospace' }}>
          {oport.origem}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', marginBottom: 2 }}>
        {eur(oport.valor_estimado)}
      </div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>
        {oport.probabilidade}% · {oport.data_fecho_prevista ? `fecho ${fdate(oport.data_fecho_prevista)}` : 'sem data'}
      </div>
      {oport.notas && <div style={{ fontSize: 10, color: '#bbb', marginBottom: 6, fontStyle: 'italic' }}>{oport.notas.slice(0, 80)}</div>}

      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={busy}
        style={{
          width: '100%', background: 'transparent', border: '1px solid #35405a',
          color: '#888', padding: '3px 6px', borderRadius: 3, fontSize: 9,
          fontFamily: 'monospace', cursor: 'pointer',
        }}
      >
        Mover ▾
      </button>
      {showMenu && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 2,
          background: '#1c2840', border: '1px solid #35405a', borderRadius: 4, padding: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {STAGES.filter(s => s.id !== currentStage).map(s => (
            <button
              key={s.id}
              onClick={() => { setShowMenu(false); onMove(oport.id, s.id) }}
              style={{ display: 'block', width: '100%', textAlign: 'left',
                       background: 'transparent', border: 'none', color: s.color,
                       padding: '4px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace' }}
            >
              → {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, tone }) {
  const accent = tone === 'green' ? '#3fb950' : tone === 'gold' ? '#e3b341' : tone === 'red' ? '#ff7b72' : '#58a6ff'
  return (
    <div style={{ background: '#1c2840', border: '1px solid #35405a', borderTop: `3px solid ${accent}`, borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: accent, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#888' }}>{sub}</div>
    </div>
  )
}
