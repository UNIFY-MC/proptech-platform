// IntegrationsPage — /integrations · "Connect your tools" CookAI-style
//
// Grid de cards 5-col com logo + nome + descrição + botão Connect / badge CONNECTED.
// Filtra pelo activeVertical do dropdown topo (useVerticalStore).
// 'all' mostra todas; v2/v3/v4/... mostra globais (*) + específicas dessa vertical.

import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { ExternalLink, Search, Check, Loader2, Sparkles, Settings, Activity, X, RefreshCw } from 'lucide-react'
import { useIntegrations } from '../hooks/useIntegrations.js'
import { useVerticalStore, useNotificationsStore } from '../store/index.js'
import { getIntegrationLogo, getIntegrationLogoFallback, NEEDS_DARK_INVERT } from '../lib/integration-logos.js'
import IntegrationDetailModal from '../components/IntegrationDetailModal.jsx'
import { supabase } from '../lib/supabase.js'

// Mapa de integrações com config UI já implementada → rota da page
// Ao clicar Connect, em vez de toggle silencioso, navega para a config form.
const CONFIG_ROUTES = {
  // Discord (qualquer slug que contenha 'discord')
  'discord':           '/connections/discord',
  'discord-webhook':   '/connections/discord',
  'discord-notif':     '/connections/discord',
  // Gmail (existe edge fn gmail-inbound/gmail-send) → futura page
  // 'gmail':              '/connections/gmail',
}

function getConfigRoute(integ) {
  if (!integ?.slug) return null
  const slug = integ.slug.toLowerCase()
  if (CONFIG_ROUTES[slug]) return CONFIG_ROUTES[slug]
  // Fallback: match parcial (ex: 'discord-webhook-notif' → discord)
  for (const key of Object.keys(CONFIG_ROUTES)) {
    if (slug.includes(key)) return CONFIG_ROUTES[key]
  }
  return null
}

const VERTICAL_LABEL = {
  all: 'todas verticais', v1: 'V1 Core', v2: 'V2 Condomínios', v3: 'V3 Seguros',
  v4: 'V4 Energia', v5: 'V5 Manutenção', v6: 'V6 Reabilitação', v7: 'V7 Real Estate',
  v8: 'V8 Rentals', v9: 'V9 BaaS', v10: 'V10 Owners Club',
}

const STATUS_META = {
  connected:     { label: 'CONNECTED',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)' },
  not_connected: { label: 'Connect',    color: 'var(--text)', bg: 'transparent',         border: 'var(--border)' },
  coming_soon:   { label: 'Coming Soon', color: 'var(--text-dim)', bg: 'transparent',    border: 'transparent' },
  disabled:      { label: 'Disabled',   color: 'var(--text-dim)', bg: 'transparent',     border: 'var(--border)' },
}

function BrandLogo({ integ }) {
  const kind = integ.kind || 'external'

  // Internal: ícone Database/Server cinzento sem brand
  if (kind === 'internal') {
    return (
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(107,79,160,0.10)',
        border: '1px dashed rgba(107,79,160,0.30)',
        color: '#a78bfa', marginBottom: 10,
      }}>
        <Lucide.Database size={20} strokeWidth={2} />
      </div>
    )
  }

  // MCP: ícone Cpu com label distintiva
  if (kind === 'mcp') {
    return (
      <div style={{
        width: 38, height: 38, borderRadius: 8, position: 'relative',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(59,130,246,0.10)',
        border: '1px solid rgba(59,130,246,0.30)',
        color: '#60a5fa', marginBottom: 10,
      }}>
        <Lucide.Cpu size={20} strokeWidth={2} />
        <span style={{
          position: 'absolute', bottom: -5, right: -5,
          background: '#60a5fa', color: '#0d1117',
          padding: '0px 4px', borderRadius: 3,
          fontSize: 7, fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
        }}>MCP</span>
      </div>
    )
  }

  // External: cascade Clearbit (multi-color) → Simple Icons → Lucide
  const primaryUrl = getIntegrationLogo(integ)
  const fallbackUrl = getIntegrationLogoFallback(integ)
  const needsInvert = NEEDS_DARK_INVERT.has(integ.slug)
  const Fallback = (integ.icon && Lucide[integ.icon]) || Lucide.Plug
  const isDark = typeof document !== 'undefined' && document.body?.getAttribute('data-theme') === 'dark'

  return (
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent',
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      {primaryUrl ? (
        <img
          src={primaryUrl}
          alt={integ.name}
          style={{
            width: 34, height: 34, objectFit: 'contain',
            filter: needsInvert && isDark ? 'invert(1) brightness(1.5)' : 'none',
          }}
          data-fallback={fallbackUrl || ''}
          onError={(e) => {
            const fb = e.currentTarget.dataset.fallback
            if (fb && e.currentTarget.src !== fb) {
              // 1ª falha → tenta fallback (Simple Icons colorido)
              e.currentTarget.src = fb
              e.currentTarget.dataset.fallback = ''  // evita loop
            } else {
              // 2ª falha → mostra ícone Lucide
              e.currentTarget.style.display = 'none'
              const lucide = e.currentTarget.nextElementSibling
              if (lucide) lucide.style.display = 'inline-flex'
            }
          }}
        />
      ) : null}
      <span style={{
        display: primaryUrl ? 'none' : 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34,
        color: integ.brand_color || 'var(--text)',
      }}>
        <Fallback size={22} strokeWidth={2} />
      </span>
    </div>
  )
}

// Stack Usage Drawer — dados reais de public.integration_usage_latest
// (alimentado pelo edge fn stack-usage-fetch cron diário 6am)
const SLUG_LABEL = {
  supabase: 'Supabase',
  vercel:   'Vercel',
  github:   'GitHub Actions',
  resend:   'Resend',
}
const METRIC_LABEL = {
  db_size_gb:         'Database',
  storage_gb:         'Storage',
  bandwidth_gb:       'Bandwidth',
  edge_fn_invocations:'Edge Function invocations',
  fn_invocations:     'Function invocations',
  build_minutes:      'Build minutes',
  deployments_month:  'Deployments este mês',
  actions_minutes:    'Actions minutes',
  emails_sent_month:  'Emails enviados',
}

function StackUsageDrawer({ onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchUsage = async () => {
    if (!supabase) return setLoading(false)
    setLoading(true)
    const { data } = await supabase.from('integration_usage_latest').select('*').order('slug').order('metric')
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsage() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY
    await window.fetch(`${supabaseUrl}/functions/v1/stack-usage-fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
      body: JSON.stringify({}),
    })
    await fetchUsage()
    setRefreshing(false)
  }

  // Agrupar por slug
  const grouped = useMemo(() => {
    const g = {}
    rows.forEach(r => {
      if (!g[r.slug]) g[r.slug] = []
      g[r.slug].push(r)
    })
    return g
  }, [rows])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 1100,
    }}>
      <aside onClick={e => e.stopPropagation()} style={{
        width: 580, maxWidth: '96vw', height: '100vh',
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} style={{ color: 'var(--primary)' }} />
            <div>
              <strong style={{ fontSize: '1rem' }}>Stack Usage</strong>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                Dados reais · sync diário 6am UTC · usado / limite-free / falta
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleRefresh} disabled={refreshing} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 5, padding: '5px 10px', fontSize: 11, color: 'var(--text)',
              cursor: refreshing ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <RefreshCw size={11} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'A buscar…' : 'Refresh'}
            </button>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
            }}><X size={18} /></button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>A carregar…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
            Sem dados. Clica Refresh para correr stack-usage-fetch.
          </div>
        ) : Object.entries(grouped).map(([slug, items]) => (
          <div key={slug} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {SLUG_LABEL[slug] || slug}
              </span>
              <span style={{
                fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace',
              }}>{items[0]?.recorded_at ? `actualizado: ${new Date(items[0].recorded_at).toLocaleString('pt-PT')}` : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(m => {
                const pct = m.free_limit ? Math.min(100, (m.used / m.free_limit) * 100) : null
                const remaining = m.free_limit ? Math.max(0, m.free_limit - m.used) : null
                const color = pct == null ? '#6b7280'
                  : pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981'
                return (
                  <div key={m.metric}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text)' }}>
                        {METRIC_LABEL[m.metric] || m.metric}
                      </span>
                      <span style={{
                        fontSize: 11, color: 'var(--text-dim)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        <strong style={{ color: 'var(--text)' }}>
                          {Number(m.used).toLocaleString('pt-PT', { maximumFractionDigits: 3 })}
                        </strong>
                        {' / '}
                        {m.free_limit != null
                          ? `${Number(m.free_limit).toLocaleString('pt-PT', { maximumFractionDigits: 0 })} ${m.unit}`
                          : '—'}
                        {pct != null && (
                          <> · <span style={{ color, fontWeight: 700 }}>{pct.toFixed(1)}%</span></>
                        )}
                      </span>
                    </div>
                    {pct != null && (
                      <div style={{
                        width: '100%', height: 5, borderRadius: 3,
                        background: 'var(--bg-elevated)', overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s',
                        }} />
                      </div>
                    )}
                    {remaining != null && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                        falta {Number(remaining).toLocaleString('pt-PT', { maximumFractionDigits: 3 })} {m.unit}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{
          padding: '12px 18px', marginTop: 'auto', background: 'var(--bg-elevated)',
          fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--text)' }}>Não disponível:</strong>
          {' '}GitHub Actions (PAT precisa scope <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>admin:org</code>/<code>read:plan</code>),
          Anthropic Console (sem API pública para tokens). Vercel hobby plan só expõe deployments (não bandwidth/invocations).
        </div>
      </aside>
    </div>
  )
}

function IntegrationCard({ integ, onToggle, onConfig, busy }) {
  const status = integ.status || 'not_connected'
  const meta = STATUS_META[status]
  const isComing = status === 'coming_soon'
  const isConnected = status === 'connected'
  const hasConfigRoute = !!getConfigRoute(integ)

  return (
    <div
      onClick={() => !isComing && onConfig && onConfig(integ)}
      style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '14px 12px 10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      minHeight: 160,
      opacity: isComing ? 0.65 : 1,
      cursor: isComing ? 'default' : 'pointer',
      transition: 'border-color 0.15s, transform 0.1s',
    }}
    onMouseEnter={(e) => { if (!isComing) e.currentTarget.style.borderColor = 'var(--primary)' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <BrandLogo integ={integ} />
      <div style={{
        fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)',
        marginBottom: 4, lineHeight: 1.2,
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{integ.name}</div>
      <div style={{
        fontSize: '0.65rem', color: 'var(--text-dim)',
        lineHeight: 1.35, marginBottom: 10, flex: 1,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', minHeight: '1.7em',
      }}>{integ.description || '—'}</div>

      {isComing && (
        <div style={{
          fontSize: '0.6rem', color: 'var(--text-dim)',
          fontStyle: 'italic', padding: '4px 0',
        }}>Coming Soon</div>
      )}

      {isConnected && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 3,
            background: meta.bg,
            border: `1px solid ${meta.border}`,
            color: meta.color,
            fontSize: '0.55rem', fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
          }}>
            <Check size={9} /> {meta.label}
          </span>
          {/* Identidade ligada — email Google, server Discord, etc */}
          {integ.config?.connected_email && (
            <div style={{
              fontSize: '0.6rem', color: 'var(--text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={integ.config.connected_email}>
              {integ.config.connected_email}
            </div>
          )}
          {integ.config?.server_name && (
            <div style={{
              fontSize: '0.6rem', color: 'var(--text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
            }} title={`Server: ${integ.config.server_name}`}>
              #{integ.config.server_name}
              {integ.config.active_count != null && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  · {integ.config.active_count}/{integ.config.total_count || integ.config.active_count} ativos
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {status === 'not_connected' && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 5,
          background: hasConfigRoute ? 'var(--primary)' : 'var(--bg-elevated)',
          border: `1px solid ${hasConfigRoute ? 'var(--primary)' : 'var(--border)'}`,
          color: hasConfigRoute ? '#fff' : 'var(--text)',
          fontSize: '0.65rem', fontWeight: hasConfigRoute ? 600 : 400,
        }}>
          {hasConfigRoute ? <Settings size={10} /> : <ExternalLink size={10} />}
          {hasConfigRoute ? 'Setup' : 'Connect'}
        </span>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  const { activeVertical } = useVerticalStore()
  const { items, loading, updateStatus } = useIntegrations()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)

  const categories = useMemo(() => {
    const set = new Set()
    items.forEach((i) => i.category && set.add(i.category))
    return ['all', ...Array.from(set).sort()]
  }, [items])

  const filtered = useMemo(() => {
    let arr = items
    if (kindFilter !== 'all')     arr = arr.filter((i) => (i.kind || 'external') === kindFilter)
    if (categoryFilter !== 'all') arr = arr.filter((i) => i.category === categoryFilter)
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter((i) =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.slug?.toLowerCase().includes(q),
      )
    }
    // Ordenar: connected primeiro, depois not_connected (com display_order),
    // depois coming_soon. Dentro do mesmo grupo: display_order + name.
    const STATUS_RANK = { connected: 0, not_connected: 1, disabled: 2, coming_soon: 3 }
    return [...arr].sort((a, b) => {
      const sa = STATUS_RANK[a.status || 'not_connected'] ?? 9
      const sb = STATUS_RANK[b.status || 'not_connected'] ?? 9
      if (sa !== sb) return sa - sb
      const da = a.display_order ?? 999
      const db = b.display_order ?? 999
      if (da !== db) return da - db
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [items, kindFilter, categoryFilter, search])

  const kindCounts = useMemo(() => {
    const c = { external: 0, mcp: 0, internal: 0 }
    items.forEach((i) => { c[i.kind || 'external'] = (c[i.kind || 'external'] || 0) + 1 })
    return c
  }, [items])

  const [detailIntegration, setDetailIntegration] = useState(null)
  const [showStackDrawer, setShowStackDrawer] = useState(false)

  const handleToggle = async (integ, nextStatus) => {
    setBusyId(integ.id)
    await updateStatus(integ.id, nextStatus)
    setBusyId(null)
    // Refresh local detail state se aplicável
    if (detailIntegration?.id === integ.id) {
      setDetailIntegration({ ...integ, status: nextStatus })
    }
  }

  const handleConfig = (integ) => {
    setDetailIntegration(integ)
  }

  const connectedCount = items.filter((i) => i.status === 'connected').length
  const totalCount = items.length

  return (
    <div style={{ padding: '8px 0 40px', maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
      {/* Botões topo direito */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShowStackDrawer(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 13,
            fontWeight: 500, transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
        >
          <Activity size={14} />
          Stack Usage
        </button>
        <Link
          to="/useful-tools"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', textDecoration: 'none', fontSize: 13,
            fontWeight: 500, transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
        >
          <Sparkles size={14} />
          Useful Tools
        </Link>
      </div>

      {showStackDrawer && <StackUsageDrawer onClose={() => setShowStackDrawer(false)} />}

      {/* Header — title + subtitle CookAI-style */}
      <div style={{ textAlign: 'center', marginBottom: 28, paddingTop: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>
          Connect your tools
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
          Liga as apps que a tua equipa já usa. Bots e recipes puxam dados e<br />
          executam acções automaticamente.
        </p>
        <div style={{
          marginTop: 12, fontSize: 11, color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {VERTICAL_LABEL[activeVertical?.toLowerCase()] || activeVertical} ·
          <span style={{ color: '#10b981', marginLeft: 6 }}>{connectedCount} conectadas</span> /
          <span style={{ marginLeft: 6 }}>{totalCount} disponíveis</span>
        </div>
      </div>

      {/* Tab por kind */}
      <div style={{
        display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 18,
        padding: '0 8px',
      }}>
        {[
          { id: 'all',      label: 'Todas',    count: items.length },
          { id: 'external', label: 'Externas', count: kindCounts.external || 0, icon: Lucide.Plug },
          { id: 'mcp',      label: 'MCP',      count: kindCounts.mcp || 0,      icon: Lucide.Cpu },
          { id: 'internal', label: 'Internas', count: kindCounts.internal || 0, icon: Lucide.Database },
        ].map((t) => {
          const Icon = t.icon
          const active = kindFilter === t.id
          return (
            <button
              key={t.id}
              onClick={() => setKindFilter(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 6,
                background: active ? 'var(--bg-card)' : 'transparent',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                color: active ? 'var(--text)' : 'var(--text-dim)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}
            >
              {Icon && <Icon size={13} />}
              {t.label}
              <span style={{
                fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-dim)', padding: '1px 5px',
                background: 'var(--bg-elevated)', borderRadius: 3,
              }}>{t.count}</span>
            </button>
          )
        })}
      </div>

      {/* Toolbar — search + category pills */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24,
        flexWrap: 'wrap', padding: '0 8px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', flex: 1, minWidth: 260, maxWidth: 360,
        }}>
          <Search size={14} color="var(--text-dim)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar integrações…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13, flex: 1, fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              style={{
                padding: '5px 10px', borderRadius: 4,
                background: categoryFilter === c ? 'var(--primary)' : 'var(--bg-card)',
                color: categoryFilter === c ? '#fff' : 'var(--text-dim)',
                border: `1px solid ${categoryFilter === c ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >{c === 'all' ? 'Todas' : c}</button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <Loader2 size={18} className="spin" /> A carregar…
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 14,
          padding: '0 8px',
        }}>
          {filtered.map((integ) => (
            <IntegrationCard
              key={integ.id}
              integ={integ}
              onToggle={handleToggle}
              onConfig={handleConfig}
              busy={busyId === integ.id}
            />
          ))}
        </div>
      )}

      {detailIntegration && (
        <IntegrationDetailModal
          integ={detailIntegration}
          busy={busyId === detailIntegration.id}
          onToggle={handleToggle}
          onClose={() => setDetailIntegration(null)}
        />
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 14 }}>Sem integrações para esta vertical / categoria / pesquisa.</div>
          <button
            onClick={() => { setSearch(''); setCategoryFilter('all') }}
            style={{
              marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontSize: 12, textDecoration: 'underline',
            }}
          >Limpar filtros</button>
        </div>
      )}
    </div>
  )
}
