// CompetitorsPage — /competitors
// Tabs por vertical + cards de concorrentes (latest report) + drill-in com SWOT estruturado
// "Gerar relatório" para qualquer concorrente seguido / custom

import { useState, useMemo } from 'react'
import {
  Swords, Plus, RefreshCw, ExternalLink, X,
  TrendingUp, TrendingDown, Target, AlertTriangle, DollarSign, Check, Clock,
} from 'lucide-react'
import { useCompetitorReports } from '../hooks/useCompetitorReports.js'
import { useSuggestedInfluencers } from '../hooks/useSuggestedInfluencers.js'

const VERTICALS = [
  { id: 'all', label: 'All' },
  { id: 'v2',  label: 'V2 Condomínios' },
  { id: 'v3',  label: 'V3 Seguros' },
  { id: 'v4',  label: 'V4 Energia' },
  { id: 'v5',  label: 'V5 Manutenção' },
  { id: 'v6',  label: 'V6 Reabilitação' },
  { id: 'v7',  label: 'V7 Real Estate' },
  { id: 'v8',  label: 'V8 Rentals' },
  { id: 'v10', label: 'V10 Owners' },
]

const POSITION_META = {
  leader:     { color: '#ef4444', label: 'LEADER' },
  challenger: { color: '#f59e0b', label: 'CHALLENGER' },
  niche:      { color: '#3b82f6', label: 'NICHE' },
  declining:  { color: '#6b7280', label: 'DECLINING' },
}

export default function CompetitorsPage() {
  const [tab, setTab] = useState('all')
  const [selected, setSelected] = useState(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const verticalFilter = tab === 'all' ? null : tab
  const { reports, generate, refresh, fetchHistory, allReports } = useCompetitorReports(verticalFilter)
  const { suggestions } = useSuggestedInfluencers()

  // Concorrentes sugeridos sem report ainda (do mesmo vertical)
  const suggestedCompetitors = useMemo(() => {
    const reportedSet = new Set(reports.map(r => r.competitor_name))
    return suggestions
      .filter(s => s.is_competitor && (!verticalFilter || s.vertical === verticalFilter))
      .filter(s => !reportedSet.has(s.display_name))
      .slice(0, 6)
  }, [suggestions, reports, verticalFilter])

  async function handleGenerateFromSuggestion(sugg) {
    setBusy(true)
    try {
      await generate({
        competitor_url: sugg.url,
        competitor_name: sugg.display_name,
        vertical: sugg.vertical,
      })
    } finally { setBusy(false) }
  }

  function openDetail(report) {
    setSelected(report)
    fetchHistory(report.competitor_name)
  }

  return (
    <div style={{ padding: '4px 4px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '4px 8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
            Competitive Intelligence
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Relatórios estruturados por vertical · scrape + análise IA (Anthropic)
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={refresh} style={iconBtn} title="Refresh"><RefreshCw size={12} /></button>
        <button onClick={() => setGenerateOpen(true)} style={{
          background: 'var(--text)', color: 'var(--bg)', border: 'none',
          padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <Plus size={13} /> Gerar relatório
        </button>
      </div>

      {/* Tabs por vertical */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, padding: '0 8px' }}>
        {VERTICALS.map(v => {
          const n = v.id === 'all' ? reports.length : reports.filter(r => r.vertical === v.id).length
          const active = tab === v.id
          return (
            <button key={v.id} onClick={() => setTab(v.id)} style={{
              padding: '6px 12px', borderRadius: 99,
              background: active ? 'var(--text)' : 'var(--bg-elevated)',
              color: active ? 'var(--bg)' : 'var(--text-dim)',
              border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
              cursor: 'pointer', fontSize: '0.7rem', fontWeight: active ? 700 : 500,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              {v.label}
              {n > 0 && <span style={{ opacity: 0.7, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem' }}>{n}</span>}
            </button>
          )
        })}
      </div>

      {/* Grid de reports */}
      {reports.length === 0 ? (
        <div style={{
          padding: 30, textAlign: 'center',
          color: 'var(--text-dim)', fontSize: '0.82rem',
          background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <Swords size={24} color="var(--text-dim)" style={{ marginBottom: 8 }} />
          <div>Sem relatórios{verticalFilter ? ` para ${verticalFilter}` : ''}.</div>
          <div style={{ fontSize: '0.7rem', marginTop: 6 }}>
            Clica "Gerar relatório" ou usa um dos sugeridos abaixo.
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
          marginBottom: 24,
        }}>
          {reports.map(r => <CompetitorCard key={r.id} report={r} onOpen={() => openDetail(r)} />)}
        </div>
      )}

      {/* Sugeridos sem report */}
      {suggestedCompetitors.length > 0 && (
        <div style={{ marginTop: 16, padding: '0 8px' }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
          }}>
            Sugeridos · {verticalFilter ? verticalFilter.toUpperCase() : 'todas verticais'}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 8,
          }}>
            {suggestedCompetitors.map(s => (
              <button key={s.id} onClick={() => handleGenerateFromSuggestion(s)} disabled={busy} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', textAlign: 'left',
                background: 'var(--bg-card)', border: '1px dashed var(--border)',
                borderRadius: 6, cursor: busy ? 'wait' : 'pointer',
                color: 'var(--text)',
              }}>
                <Plus size={13} color="var(--text-dim)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.display_name}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                    {s.vertical?.toUpperCase()} · {s.category}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drill-in modal */}
      {selected && (
        <CompetitorDetail
          report={selected}
          history={allReports}
          onClose={() => setSelected(null)}
          onRegenerate={async () => {
            setBusy(true)
            try {
              await generate({
                competitor_url: selected.competitor_url,
                competitor_name: selected.competitor_name,
                vertical: selected.vertical,
                source_id: selected.source_id,
              })
              setSelected(null)
            } finally { setBusy(false) }
          }}
        />
      )}

      {/* Generate custom modal */}
      {generateOpen && (
        <GenerateModal
          onClose={() => setGenerateOpen(false)}
          onSubmit={async (input) => {
            setBusy(true)
            try {
              await generate(input)
              setGenerateOpen(false)
            } finally { setBusy(false) }
          }}
          busy={busy}
        />
      )}
    </div>
  )
}

function CompetitorCard({ report, onOpen }) {
  const pos = POSITION_META[report.market_position] || POSITION_META.niche
  const opps = report.opportunities || []
  const threats = report.threats || []

  return (
    <button onClick={onOpen} style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '12px 14px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${pos.color}`,
      borderRadius: 8,
      cursor: 'pointer', textAlign: 'left',
      color: 'var(--text)',
    }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
       onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {report.competitor_name}
        </span>
        <span style={{
          fontSize: '0.55rem', padding: '2px 6px', borderRadius: 3,
          background: `${pos.color}22`, color: pos.color,
          fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          flexShrink: 0,
        }}>{pos.label}</span>
      </div>
      {report.vertical && (
        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          {report.vertical.toUpperCase()}
        </div>
      )}
      <div style={{ fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.4 }}>
        {report.executive_summary?.slice(0, 180) || '—'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: '0.6rem', color: 'var(--text-dim)' }}>
        <span><TrendingUp size={9} color="#10b981" /> {opps.length}</span>
        <span><AlertTriangle size={9} color="#ef4444" /> {threats.length}</span>
        <span style={{ marginLeft: 'auto' }}>
          {new Date(report.generated_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
        </span>
      </div>
    </button>
  )
}

function CompetitorDetail({ report, history, onClose, onRegenerate }) {
  const pos = POSITION_META[report.market_position] || POSITION_META.niche

  return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 0,
        width: 'min(880px, 96vw)', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative',
      }}>
        {/* Header sticky */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
              {report.competitor_name}
            </h2>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                padding: '1px 6px', borderRadius: 3,
                background: `${pos.color}22`, color: pos.color,
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              }}>{pos.label}</span>
              {report.vertical && <span>{report.vertical.toUpperCase()}</span>}
              <a href={report.competitor_url} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                <ExternalLink size={10} /> {new URL(report.competitor_url).hostname}
              </a>
              <span style={{ marginLeft: 'auto' }}>
                <Clock size={10} /> {new Date(report.generated_at).toLocaleString('pt-PT')}
              </span>
            </div>
          </div>
          <button onClick={onRegenerate} style={iconBtn} title="Gerar novo relatório"><RefreshCw size={12} /></button>
          <button onClick={onClose} style={iconBtn}><X size={14} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Executive summary */}
          {report.executive_summary && (
            <Section title="Executive summary" color="#534AB7">
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text)' }}>
                {report.executive_summary}
              </p>
            </Section>
          )}

          {/* Pricing intel */}
          {report.pricing_intel && (
            <Section title="Pricing intel" color="#f59e0b" icon={<DollarSign size={12} />}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.78rem' }}>
                <Stat label="Min" value={report.pricing_intel.tier_min || '—'} />
                <Stat label="Max" value={report.pricing_intel.tier_max || '—'} />
                <Stat label="Modelo" value={report.pricing_intel.model || '—'} />
              </div>
              {report.pricing_intel.notes && (
                <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  {report.pricing_intel.notes}
                </p>
              )}
            </Section>
          )}

          {/* SWOT 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ListSection title="Strengths" items={report.strengths} color="#10b981" icon={<TrendingUp size={11} />} />
            <ListSection title="Weaknesses" items={report.weaknesses} color="#ef4444" icon={<TrendingDown size={11} />} />
            <ListSection title="Opportunities" items={report.opportunities} color="#3b82f6" icon={<Target size={11} />} />
            <ListSection title="Threats" items={report.threats} color="#f59e0b" icon={<AlertTriangle size={11} />} />
          </div>

          {/* Features */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ListSection title="Features observed" items={report.features_observed} color="#06b6d4" icon={<Check size={11} />} />
            <ListSection title="Feature gaps (oportunidade)" items={report.features_gaps} color="#8b5cf6" icon={<Target size={11} />} />
          </div>

          {/* Scraped pages */}
          {report.scraped_pages?.length > 0 && (
            <Section title="Páginas analisadas" color="#6b7280">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                {report.scraped_pages.map((u, i) => (
                  <li key={i}><a href={u} target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}>{u}</a></li>
                ))}
              </ul>
            </Section>
          )}

          {/* History */}
          {history && history.length > 1 && (
            <Section title={`Histórico (${history.length} reports)`} color="#6b7280">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {history.map(h => (
                  <div key={h.id} style={{
                    fontSize: '0.7rem', color: 'var(--text-dim)',
                    padding: '4px 8px', borderRadius: 4,
                    background: h.id === report.id ? 'rgba(83,74,183,0.1)' : 'transparent',
                  }}>
                    {new Date(h.generated_at).toLocaleString('pt-PT')}
                    {h.market_position && <span> · {h.market_position}</span>}
                    {h.id === report.id && <span style={{ marginLeft: 6, color: 'var(--primary)' }}>(actual)</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, color, icon, children }) {
  return (
    <div>
      <div style={{
        fontSize: '0.58rem', fontWeight: 700, color,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>{icon} {title}</div>
      <div>{children}</div>
    </div>
  )
}

function ListSection({ title, items, color, icon }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderLeft: `3px solid ${color}`,
      borderRadius: '0 6px 6px 0',
      padding: '10px 14px',
    }}>
      <div style={{
        fontSize: '0.58rem', fontWeight: 700, color,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>{icon} {title}</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.5 }}>
        {items.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
      </ul>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{
      padding: '6px 12px',
      background: 'var(--bg-elevated)',
      borderRadius: 5,
    }}>
      <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
    </div>
  )
}

function GenerateModal({ onClose, onSubmit, busy }) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [vertical, setVertical] = useState('')
  const [pages, setPages] = useState('')

  function submit(e) {
    e?.preventDefault?.()
    if (!url.trim()) return
    const extraPages = pages.split('\n').map(p => p.trim()).filter(Boolean)
    onSubmit({
      competitor_url: url.trim(),
      competitor_name: name.trim() || null,
      vertical: vertical || null,
      pages: extraPages,
    })
  }

  return (
    <div onClick={onClose} style={modalOverlay}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 22, width: 500, maxWidth: '92vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Gerar relatório de concorrente</h3>
          <button type="button" onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://www.concorrente.pt"
            required style={inputStyle} />
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Nome (opcional — auto-detect)"
            style={inputStyle} />
          <select value={vertical} onChange={e => setVertical(e.target.value)} style={inputStyle}>
            <option value="">Sem vertical</option>
            <option value="v2">V2 Condomínios</option>
            <option value="v3">V3 Seguros</option>
            <option value="v4">V4 Energia</option>
            <option value="v5">V5 Manutenção</option>
            <option value="v6">V6 Reabilitação</option>
            <option value="v7">V7 Real Estate</option>
            <option value="v8">V8 Rentals</option>
          </select>
          <textarea value={pages} onChange={e => setPages(e.target.value)}
            placeholder="URLs extras a analisar (1 por linha): pricing, features, blog…"
            rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }} />
          <button type="submit" disabled={busy} style={{
            background: busy ? 'var(--bg-elevated)' : 'var(--text)',
            color: busy ? 'var(--text-dim)' : 'var(--bg)',
            border: 'none', padding: '9px 16px', borderRadius: 6,
            cursor: busy ? 'wait' : 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
          }}>{busy ? 'A gerar (15-30s)…' : 'Gerar agora'}</button>
        </div>
      </form>
    </div>
  )
}

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
  padding: 20, overflowY: 'auto',
}
const iconBtn = {
  background: 'none', border: '1px solid var(--border)',
  padding: 6, borderRadius: 5, cursor: 'pointer',
  color: 'var(--text-dim)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '8px 11px', borderRadius: 6,
  fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
}
