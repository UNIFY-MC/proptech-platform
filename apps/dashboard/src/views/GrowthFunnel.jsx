import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

// Schema growth cross-vertical (ADR-015) — KPIs do funil + Meta ads
// Esperado: useApiKey vem de import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const sb = createClient(SUPABASE_URL, ANON_KEY, { db: { schema: 'growth' } })

function eur(n) {
  if (n == null || n === '') return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}
function pct(n) {
  if (n == null) return '—'
  return Number(n).toFixed(1) + '%'
}

export default function GrowthFunnel() {
  const [funnel, setFunnel] = useState(null)
  const [rules, setRules] = useState(null)
  const [recentLeads, setRecentLeads] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const [f, r, l] = await Promise.all([
        sb.from('funnel_summary').select('*').order('leads_total', { ascending: false }).limit(50),
        sb.from('cross_sell_rules').select('id, nome, descricao, vertical_origem, vertical_alvo, active, priority, total_disparos, total_conversoes, ultima_execucao').order('priority'),
        sb.from('leads').select('id, vertical_alvo, nome, email, estado, utm_source, utm_campaign, lead_score, created_at').order('created_at', { ascending: false }).limit(20),
      ])
      if (!active) return
      if (f.error || r.error || l.error) {
        setError(f.error?.message || r.error?.message || l.error?.message)
        return
      }
      setFunnel(f.data || [])
      setRules(r.data || [])
      setRecentLeads(l.data || [])
    }
    load()
    return () => { active = false }
  }, [])

  const totals = useMemo(() => {
    if (!funnel) return null
    return {
      total: funnel.reduce((a, r) => a + Number(r.leads_total ?? 0), 0),
      qualificados: funnel.reduce((a, r) => a + Number(r.leads_qualificados ?? 0), 0),
      convertidos: funnel.reduce((a, r) => a + Number(r.leads_convertidos ?? 0), 0),
      spend: funnel.reduce((a, r) => a + Number(r.total_spend ?? 0), 0),
    }
  }, [funnel])

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Growth · Funil Cross-Vertical</h1>
      <p style={{ color: 'var(--mu, #888)', fontSize: 13, marginBottom: 20 }}>
        Funil unificado de leads (V2 + V3 + V4 + V5) com tracking Meta Ads, Google Ads e regras de cross-sell automáticas (ADR-015 · schema <code style={{ fontFamily: 'monospace' }}>growth.*</code>).
      </p>

      {error && <div style={{ padding: 12, background: 'rgba(255,123,114,0.1)', border: '1px solid rgba(255,123,114,0.3)', borderRadius: 6, color: '#ff7b72', fontSize: 13, marginBottom: 16 }}>Erro: {error}</div>}

      {/* Top KPIs */}
      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <Kpi label="Total Leads" value={totals.total} sub="todas as verticais" />
          <Kpi label="Qualificados" value={totals.qualificados} sub={`${totals.total > 0 ? ((totals.qualificados/totals.total)*100).toFixed(1) : 0}% taxa qualificação`} tone="green" />
          <Kpi label="Convertidos" value={totals.convertidos} sub={`${totals.total > 0 ? ((totals.convertidos/totals.total)*100).toFixed(1) : 0}% conversion rate`} tone="green" />
          <Kpi label="Ad Spend" value={eur(totals.spend)} sub={`CPL médio ${totals.total > 0 ? eur(totals.spend/totals.total) : '—'}`} tone="gold" />
        </div>
      )}

      {/* Funnel por (vertical, ad_source, campanha) */}
      <h3 style={{ marginBottom: 12, fontSize: 14 }}>Funil por Campanha</h3>
      <div style={{ background: '#1c2840', border: '1px solid #35405a', borderRadius: 8, padding: 1, marginBottom: 24, overflow: 'auto' }}>
        {funnel === null && <div style={{ padding: 12, color: '#888' }}>A carregar…</div>}
        {funnel && funnel.length === 0 && <div style={{ padding: 12, color: '#888' }}>Sem dados ainda. Quando começarem a chegar leads via Meta ou form, aparecem aqui.</div>}
        {funnel && funnel.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#233050', color: '#888' }}>
                <th style={th}>Vertical</th>
                <th style={th}>Origem</th>
                <th style={th}>Campanha</th>
                <th style={{ ...th, textAlign: 'right' }}>Total</th>
                <th style={{ ...th, textAlign: 'right' }}>Qualif.</th>
                <th style={{ ...th, textAlign: 'right' }}>Conv.</th>
                <th style={{ ...th, textAlign: 'right' }}>Rate</th>
                <th style={{ ...th, textAlign: 'right' }}>Spend</th>
                <th style={{ ...th, textAlign: 'right' }}>CPL</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid #35405a' }}>
                  <td style={td}><Badge text={row.vertical} colorFor={row.vertical} /></td>
                  <td style={td}><Badge text={row.ad_source} colorFor={row.ad_source} /></td>
                  <td style={{ ...td, fontSize: 11, color: '#bbb' }}>{row.campanha}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{row.leads_total}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{row.leads_qualificados}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: row.leads_convertidos > 0 ? '#3fb950' : '#888' }}>{row.leads_convertidos}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{pct(row.conversion_rate_pct)}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{eur(row.total_spend)}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#e3b341' }}>{eur(row.cpl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Cross-sell rules */}
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>Regras de Cross-Sell</h3>
          <div style={{ background: '#1c2840', border: '1px solid #35405a', borderRadius: 8 }}>
            {rules === null && <div style={{ padding: 12, color: '#888' }}>A carregar…</div>}
            {rules && rules.length === 0 && <div style={{ padding: 12, color: '#888' }}>Sem regras configuradas.</div>}
            {rules && rules.map(r => (
              <div key={r.id} style={{ padding: 12, borderBottom: '1px solid #35405a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.nome}</span>
                  <span style={{ fontSize: 10, color: r.active ? '#3fb950' : '#888' }}>
                    {r.active ? '● activa' : '○ pausada'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#888', margin: '4px 0 8px' }}>{r.descricao}</p>
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <Badge text={r.vertical_origem} colorFor={r.vertical_origem} />
                  <span style={{ color: '#888' }}>→</span>
                  <Badge text={r.vertical_alvo} colorFor={r.vertical_alvo} />
                  <span style={{ marginLeft: 'auto', color: '#888' }}>
                    {r.total_disparos} disparos · {r.total_conversoes} conv.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leads recentes */}
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>Leads Recentes</h3>
          <div style={{ background: '#1c2840', border: '1px solid #35405a', borderRadius: 8, maxHeight: 400, overflow: 'auto' }}>
            {recentLeads === null && <div style={{ padding: 12, color: '#888' }}>A carregar…</div>}
            {recentLeads && recentLeads.length === 0 && <div style={{ padding: 12, color: '#888' }}>Sem leads ainda.</div>}
            {recentLeads && recentLeads.map(l => (
              <div key={l.id} style={{ padding: 10, borderBottom: '1px solid #35405a', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>{l.nome || l.email || '—'}</span>
                  <Badge text={l.vertical_alvo} colorFor={l.vertical_alvo} />
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#888' }}>
                  <span>{l.email}</span>
                  <span>·</span>
                  <span>{l.utm_source || 'direct'}{l.utm_campaign ? ` · ${l.utm_campaign}` : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 3,
                    background: l.estado === 'convertido' ? 'rgba(63,185,80,0.2)'
                              : l.estado === 'qualificado' ? 'rgba(88,166,255,0.2)'
                              : l.estado === 'perdido' ? 'rgba(255,123,114,0.2)'
                              : 'rgba(255,255,255,0.05)',
                    color: l.estado === 'convertido' ? '#3fb950'
                         : l.estado === 'qualificado' ? '#58a6ff'
                         : l.estado === 'perdido' ? '#ff7b72'
                         : '#888',
                  }}>{l.estado}</span>
                  {l.lead_score != null && (
                    <span style={{ fontSize: 10, color: '#888' }}>score {l.lead_score}/100</span>
                  )}
                  <span style={{ fontSize: 10, color: '#888', marginLeft: 'auto' }}>
                    {new Date(l.created_at).toLocaleDateString('pt-PT')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
const td = { padding: '8px 12px' }

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

function Badge({ text, colorFor }) {
  const palette = {
    v2: '#58a6ff', v3: '#d2a8ff', v4: '#e3b341', v5: '#3fb950', v10: '#d2a8ff',
    meta: '#1877f2', google: '#4285f4', linkedin: '#0a66c2',
    organic: '#3fb950', referral: '#888', direct: '#888', email: '#e3b341',
    marketing: '#ff7b72', growth: '#ff7b72',
  }
  const color = palette[text] || '#888'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 3,
      background: 'rgba(255,255,255,0.05)', color, fontFamily: 'monospace',
      fontSize: 10, fontWeight: 600, textTransform: 'lowercase',
    }}>{text || '—'}</span>
  )
}
