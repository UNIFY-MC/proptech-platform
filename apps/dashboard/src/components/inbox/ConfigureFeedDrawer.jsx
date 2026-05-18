// ConfigureFeedDrawer — Sprint A2 refactor
// Sources PT em 7 categorias + toggle Watch + botão Synthesize
// Usa useInboxSources (system.inbox_sources com fallback para seed JSON)

import { useState } from 'react'
import {
  X, Search, Sparkles, Eye, EyeOff, Globe, Rss,
  Plus, Check,
} from 'lucide-react'
import { useInboxSources } from '../../hooks/useInboxSources.js'
import { useWatcherSources } from '../../hooks/useWatcherSources.js'
import { useSuggestedInfluencers } from '../../hooks/useSuggestedInfluencers.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

async function callSynthesize(sinceHours = 24) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/feed-synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ trigger: 'manual', since_hours: sinceHours }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

// Categorias PT — 7 + all
const CATEGORIES = [
  { id: 'all',          label: 'Todas' },
  { id: 'real_estate',  label: 'Real Estate' },
  { id: 'property_mgmt', label: 'Gestão Imóveis' },
  { id: 'construcao',   label: 'Construção' },
  { id: 'seguros',      label: 'Seguros' },
  { id: 'energia',      label: 'Energia' },
  { id: 'fiscal_legal', label: 'Fiscal & Legal' },
  { id: 'bancos',       label: 'Banca' },
]

const METHOD_ICON = {
  rss:  <Rss size={11} color="#f59e0b" />,
  web:  <Globe size={11} color="#10b981" />,
}

function sourceInitials(name) {
  const words = name.split(/[\s&-]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function sourceColor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const palette = ['#534AB7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899']
  return palette[h % palette.length]
}

export default function ConfigureFeedDrawer({ onClose }) {
  const {
    sources, counts, watchedCount, loading,
    searchQ, setSearchQ,
    category, setCategory,
    toggleWatch,
    refresh,
  } = useInboxSources()

  // Tab: 'pt_sources' (as 100+ sources PT) | 'social' (watcher_sources legado)
  const [tab, setTab] = useState('pt_sources')

  // Synthesize state
  const [synthState, setSynthState] = useState(null)  // null | 'loading' | {result} | {error}

  // Social feed (legado)
  const { sources: socialSources, toggle: socialToggle } = useWatcherSources()
  const { suggestions, follow, unfollow } = useSuggestedInfluencers()

  async function handleSynthesize() {
    setSynthState('loading')
    try {
      const res = await callSynthesize(24)
      setSynthState({ result: res })
    } catch (e) {
      setSynthState({ error: String(e) })
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1000, paddingTop: 60, paddingBottom: 40, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, width: 'min(1080px, 96vw)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          padding: '20px 28px 24px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, flex: 1 }}>
            Feed Configuration
          </h2>

          <span style={{
            background: 'rgba(63,185,80,0.1)', color: '#3fb950',
            border: '1px solid rgba(63,185,80,0.3)',
            padding: '3px 10px', borderRadius: 99,
            fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
          }}>
            {watchedCount} a monitorizar
          </span>

          <button onClick={handleSynthesize} disabled={synthState === 'loading'} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: synthState === 'loading' ? 'var(--bg-elevated)' : 'var(--primary)',
            color: synthState === 'loading' ? 'var(--text-dim)' : '#fff',
            border: 'none', padding: '7px 16px', borderRadius: 99,
            cursor: synthState === 'loading' ? 'not-allowed' : 'pointer',
            fontSize: '0.74rem', fontWeight: 600,
            transition: 'all 0.15s',
          }}>
            <Sparkles size={13} />
            {synthState === 'loading' ? 'A sintetizar…' : 'Synthesize now'}
          </button>

          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', display: 'flex', padding: 4,
          }}><X size={18} /></button>
        </div>

        {/* Synthesize result */}
        {synthState && synthState !== 'loading' && (
          <div style={{
            padding: '8px 12px', borderRadius: 6,
            background: synthState.error ? 'rgba(239,68,68,0.08)' : 'rgba(63,185,80,0.08)',
            border: `1px solid ${synthState.error ? 'rgba(239,68,68,0.2)' : 'rgba(63,185,80,0.2)'}`,
            fontSize: '0.72rem', color: 'var(--text)', display: 'flex', gap: 10, alignItems: 'center',
          }}>
            {synthState.error ? (
              <span style={{ color: '#ef4444' }}>Erro: {synthState.error}</span>
            ) : (
              <span>
                <span style={{ color: '#3fb950', fontWeight: 600 }}>Synthesis completa.</span>{' '}
                {synthState.result?.items_processed != null && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {synthState.result.items_processed} items processados
                  </span>
                )}
                {synthState.result?.message && (
                  <span style={{ color: 'var(--text-dim)' }}> · {synthState.result.message}</span>
                )}
              </span>
            )}
            <button onClick={() => setSynthState(null)} style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-dim)', display: 'flex',
            }}><X size={12} /></button>
          </div>
        )}

        {/* Tabs: PT Sources | Social */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
          {[
            { id: 'pt_sources', label: 'Sources PT', count: counts.all },
            { id: 'social',     label: 'Social / Influencers', count: socialSources.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '6px 14px', borderRadius: '6px 6px 0 0',
              background: tab === t.id ? 'var(--primary)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text-dim)',
              border: 'none', cursor: 'pointer',
              fontSize: '0.74rem', fontWeight: tab === t.id ? 600 : 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              <span style={{
                background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
                padding: '1px 6px', borderRadius: 8,
                fontSize: '0.6rem', fontFamily: 'JetBrains Mono, monospace',
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'pt_sources' && (
          <PtSourcesPanel
            sources={sources}
            counts={counts}
            category={category}
            setCategory={setCategory}
            searchQ={searchQ}
            setSearchQ={setSearchQ}
            loading={loading}
            onToggle={toggleWatch}
          />
        )}

        {tab === 'social' && (
          <SocialPanel
            sources={socialSources}
            suggestions={suggestions}
            onToggle={socialToggle}
            onFollow={follow}
            onUnfollow={unfollow}
            refresh={refresh}
          />
        )}
      </div>
    </div>
  )
}

// ─── PT Sources Panel ─────────────────────────────────────────────────────────
function PtSourcesPanel({ sources, counts, category, setCategory, searchQ, setSearchQ, loading, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search + categoria pills */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px', flex: '0 1 260px',
        }}>
          <Search size={13} color="var(--text-dim)" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Pesquisar sources…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontSize: '0.78rem', color: 'var(--text)',
              fontFamily: 'inherit', width: '100%',
            }}
          />
          {searchQ && (
            <button onClick={() => setSearchQ('')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', display: 'flex', padding: 0,
            }}><X size={12} /></button>
          )}
        </div>

        {/* Categoria pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const active = category === cat.id
            const n = cat.id === 'all' ? counts.all : (counts[cat.id] || 0)
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                padding: '5px 12px', borderRadius: 99,
                background: active ? 'var(--text)' : 'var(--bg-elevated)',
                color: active ? 'var(--bg)' : 'var(--text-dim)',
                border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
                cursor: 'pointer', fontSize: '0.7rem',
                fontWeight: active ? 700 : 500,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {cat.label}
                {n > 0 && (
                  <span style={{
                    opacity: 0.7, fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.58rem',
                  }}>{n}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de source cards */}
      {loading ? (
        <div style={{
          padding: 32, textAlign: 'center',
          color: 'var(--text-dim)', fontSize: '0.78rem',
        }}>A carregar sources…</div>
      ) : sources.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center',
          color: 'var(--text-dim)', fontSize: '0.78rem',
          background: 'var(--bg-elevated)', borderRadius: 8,
        }}>
          {searchQ ? 'Sem resultados para essa pesquisa.' : 'Sem sources nesta categoria.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: 8,
          maxHeight: '60vh', overflowY: 'auto',
          paddingRight: 4,
        }}>
          {sources.map(src => (
            <SourceCard key={src.id} source={src} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Source Card ──────────────────────────────────────────────────────────────
function SourceCard({ source, onToggle }) {
  const [pending, setPending] = useState(false)
  const color = sourceColor(source.id)
  const initials = sourceInitials(source.name)
  const isWatched = source.watched

  async function handleToggle() {
    if (pending) return
    setPending(true)
    await onToggle(source.id, isWatched)
    setPending(false)
  }

  const urlShort = (() => {
    try { return new URL(source.url).hostname.replace(/^www\./, '') } catch { return source.url }
  })()

  const lastFetched = source.last_fetched_at
    ? new Date(source.last_fetched_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
    : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderLeft: isWatched ? `3px solid ${color}` : '3px solid transparent',
      borderRadius: 8, opacity: pending ? 0.6 : 1,
      transition: 'all 0.15s',
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: color + '22', border: `1.5px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color, fontSize: '0.6rem', fontWeight: 700,
        fontFamily: 'JetBrains Mono, monospace',
      }}>{initials}</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{source.name}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.6rem', color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
        }}>
          {METHOD_ICON[source.fetch_method] || METHOD_ICON.web}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
            {urlShort}
          </span>
          {lastFetched && (
            <span style={{
              marginLeft: 'auto', background: 'var(--bg-card)',
              padding: '1px 5px', borderRadius: 3, flexShrink: 0,
              fontSize: '0.55rem',
            }}>{lastFetched}</span>
          )}
        </div>
      </div>

      {/* Watch toggle */}
      <button
        onClick={handleToggle}
        disabled={pending}
        title={isWatched ? 'A monitorizar — clique para pausar' : 'Iniciar monitorização'}
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: isWatched ? `${color}22` : 'var(--bg-card)',
          border: `1.5px solid ${isWatched ? color : 'var(--border)'}`,
          color: isWatched ? color : 'var(--text-dim)',
          cursor: pending ? 'not-allowed' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          if (!pending && isWatched) {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
            e.currentTarget.style.borderColor = '#ef4444'
            e.currentTarget.style.color = '#ef4444'
          }
        }}
        onMouseLeave={e => {
          if (isWatched) {
            e.currentTarget.style.background = `${color}22`
            e.currentTarget.style.borderColor = color
            e.currentTarget.style.color = color
          }
        }}
      >
        {isWatched ? <Check size={13} /> : <Eye size={12} />}
      </button>
    </div>
  )
}

// ─── Social Panel (legado watcher_sources) ────────────────────────────────────
function SocialPanel({ sources, suggestions, onToggle, onFollow, onUnfollow, refresh }) {
  const active = sources.filter(s => s.active)
  const inactive = sources.filter(s => !s.active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.6,
        padding: '8px 12px', background: 'var(--bg-elevated)',
        borderRadius: 6, border: '1px solid var(--border)',
      }}>
        Social sources (Instagram, X, LinkedIn, YouTube, TikTok) — monitorização de influencers e concorrentes via Apify.
        {active.length > 0 && (
          <span style={{ color: '#3fb950', fontWeight: 600 }}> {active.length} activas.</span>
        )}
      </div>

      {suggestions.length === 0 && sources.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center',
          color: 'var(--text-dim)', fontSize: '0.78rem',
        }}>Sem sugestões de social sources disponíveis.</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: 8,
          maxHeight: '55vh', overflowY: 'auto',
        }}>
          {suggestions.map(s => (
            <SuggestionCard
              key={s.id} sugg={s}
              onFollow={() => onFollow(s).then(refresh)}
              onUnfollow={() => onUnfollow(s).then(refresh)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionCard({ sugg, onFollow, onUnfollow }) {
  const isFollowing = sugg.already_following
  const label = sugg.display_name || sugg.handle || '?'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-dim)', fontSize: '0.62rem', fontWeight: 700,
        fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
      }}>
        {label.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.8rem', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</div>
        <div style={{
          fontSize: '0.6rem', color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>{sugg.platform} · {sugg.sector}</div>
      </div>
      <button onClick={isFollowing ? onUnfollow : onFollow} style={{
        width: 28, height: 28, borderRadius: '50%',
        background: isFollowing ? 'rgba(16,185,129,0.15)' : 'var(--bg-card)',
        border: `1.5px solid ${isFollowing ? '#10b981' : 'var(--border)'}`,
        color: isFollowing ? '#10b981' : 'var(--text-dim)',
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isFollowing ? <Check size={13} /> : <Plus size={13} />}
      </button>
    </div>
  )
}
