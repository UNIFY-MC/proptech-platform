// ConfigureFeedDrawer — Feed Configuration modal estilo CookAI
// Layout: 7 SOURCES counter + Synthesize button + Watch All + tabs por sector
// + grid 3-col (avatar + nome + @handle + botão add/checkmark)
// + section CUSTOM no fundo com pills coloridas (sources manuais)

import { useState, useMemo } from 'react'
import { X, Plus, Check, Sparkles, Eye } from 'lucide-react'
import { useSuggestedInfluencers } from '../../hooks/useSuggestedInfluencers.js'
import { useWatcherSources } from '../../hooks/useWatcherSources.js'

const SECTORS = [
  { id: 'all',          label: 'All' },
  { id: 'real_estate',  label: 'Real Estate' },
  { id: 'proptech',     label: 'PropTech' },
  { id: 'concorrentes', label: 'Concorrentes' },
  { id: 'venture',      label: 'VC' },
  { id: 'news',         label: 'News' },
  { id: 'own',          label: 'Marca' },
]

// Cor de pill custom — distingue por hash do label
const CUSTOM_COLORS = ['#ef4444', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
function customColor(label) {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0
  return CUSTOM_COLORS[h % CUSTOM_COLORS.length]
}

function avatarLetters(name) {
  if (!name) return '?'
  const parts = name.replace(/^@/, '').split(/[\s_.-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

function avatarGradient(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const palette = [
    ['#534AB7', '#8b5cf6'], ['#ec4899', '#f59e0b'], ['#10b981', '#06b6d4'],
    ['#3b82f6', '#0ea5e9'], ['#f59e0b', '#ef4444'], ['#84cc16', '#10b981'],
    ['#a855f7', '#ec4899'], ['#0a66c2', '#3b82f6'],
  ]
  const p = palette[h % palette.length]
  return `linear-gradient(135deg, ${p[0]}, ${p[1]})`
}

export default function ConfigureFeedDrawer({ onClose }) {
  const [tab, setTab] = useState('all')
  const { suggestions, follow } = useSuggestedInfluencers()
  const { sources, toggle, remove, create, refresh } = useWatcherSources()
  const [customInput, setCustomInput] = useState('')

  // Counts por sector
  const counts = useMemo(() => {
    const c = { all: suggestions.length }
    for (const s of suggestions) c[s.sector] = (c[s.sector] || 0) + 1
    return c
  }, [suggestions])

  const visible = tab === 'all' ? suggestions : suggestions.filter(s => s.sector === tab)

  // Custom sources = watcher_sources active com config.suggested_id === null (não vieram de uma sugestão)
  const customSources = sources.filter(s => s.active && !s.config?.suggested_id)

  // Total sources (a seguir)
  const totalActive = sources.filter(s => s.active).length

  async function handleAddCustom(e) {
    e?.preventDefault?.()
    if (!customInput.trim()) return
    const raw = customInput.trim()
    // Detecta tipo: @handle = instagram_user, url = competitor_site
    const isHandle = raw.startsWith('@')
    const isUrl = raw.includes('://') || raw.includes('.')
    if (isHandle) {
      await create({
        kind: 'instagram_user',
        label: raw,
        config: { handle: raw.slice(1) },
        active: true,
      })
    } else if (isUrl) {
      const url = raw.startsWith('http') ? raw : 'https://' + raw
      await create({
        kind: 'competitor_site',
        label: new URL(url).hostname,
        config: { url },
        active: true,
      })
    } else {
      // Default: trata como news query
      await create({
        kind: 'news_query',
        label: raw,
        config: { query: raw, language: 'pt', country: 'pt' },
        active: true,
      })
    }
    setCustomInput('')
    await refresh()
  }

  async function handleFollowAll() {
    const toFollow = suggestions.filter(s => !s.already_following && (tab === 'all' || s.sector === tab))
    for (const s of toFollow) {
      // eslint-disable-next-line no-await-in-loop
      await follow(s)
    }
    await refresh()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000,
      paddingTop: 60, paddingBottom: 40,
      overflowY: 'auto',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        width: 'min(1040px, 96vw)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        padding: '20px 28px 24px',
        display: 'flex', flexDirection: 'column',
        gap: 14,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)' }}>
            Feed Configuration
          </h2>
          <span style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
            padding: '4px 10px',
            borderRadius: 99,
            fontSize: '0.62rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {totalActive} sources
          </span>
          <button style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '6px 14px', borderRadius: 99,
            cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }} onClick={() => alert('Synthesize: agente lê todos os items 24h e gera meta-resumo (Sprint próximo)')}>
            <Sparkles size={12} /> Synthesize
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', padding: 4,
          }}><X size={18} /></button>
        </div>

        {/* Tabs + Watch All */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {SECTORS.map(s => {
            const active = tab === s.id
            const n = counts[s.id] || 0
            return (
              <button key={s.id} onClick={() => setTab(s.id)} style={{
                padding: '6px 14px',
                borderRadius: 99,
                background: active ? 'var(--text)' : 'var(--bg-elevated)',
                color: active ? 'var(--bg)' : 'var(--text-dim)',
                border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: active ? 700 : 500,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {s.label}
                {n > 0 && (
                  <span style={{
                    opacity: 0.7,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.6rem',
                  }}>{n}</span>
                )}
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <button onClick={handleFollowAll} style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <Eye size={12} /> Watch All
          </button>
        </div>

        {/* Grid 3-col */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {visible.map(s => (
            <SuggestionCard key={s.id} sugg={s} onFollow={() => follow(s).then(refresh)} />
          ))}
          {visible.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              padding: 30, textAlign: 'center',
              color: 'var(--text-dim)', fontSize: '0.78rem',
              background: 'var(--bg-elevated)', borderRadius: 8,
            }}>
              Sem sugestões neste sector.
            </div>
          )}
        </div>

        {/* CUSTOM section */}
        <div style={{ marginTop: 10 }}>
          <div style={{
            fontSize: '0.62rem', fontWeight: 700,
            color: 'var(--text-dim)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 8,
          }}>Custom</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {customSources.map(src => {
              const label = src.config?.handle ? `@${src.config.handle}` : (src.label || '?')
              const color = customColor(label)
              return (
                <span key={src.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px',
                  borderRadius: 99,
                  background: `${color}25`,
                  border: `1px solid ${color}55`,
                  color: color,
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                  {label}
                  <button onClick={() => { if (confirm(`Remover ${label}?`)) remove(src.id) }} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: color, padding: 0, display: 'inline-flex',
                  }}><X size={11} /></button>
                </span>
              )
            })}

            <form onSubmit={handleAddCustom} style={{ display: 'inline-flex', gap: 4 }}>
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="+ @handle / url / query"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 99,
                  padding: '5px 12px',
                  fontSize: '0.7rem',
                  color: 'var(--text)',
                  outline: 'none',
                  width: 200,
                }}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({ sugg, onFollow }) {
  const isFollowing = sugg.already_following
  const displayLabel = sugg.display_name || sugg.handle
  const handleLabel = sugg.handle?.startsWith('http')
    ? new URL(sugg.handle).hostname
    : (sugg.handle?.startsWith('@') ? sugg.handle : `@${sugg.handle}`)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      opacity: isFollowing ? 0.85 : 1,
    }}>
      {sugg.avatar_url ? (
        <img src={sugg.avatar_url} alt={displayLabel} referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: avatarGradient(displayLabel),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.7rem', fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          flexShrink: 0,
        }}>{avatarLetters(displayLabel)}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{displayLabel}</div>
        <div style={{
          fontSize: '0.62rem', color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{handleLabel}</div>
      </div>
      <button
        onClick={onFollow}
        disabled={isFollowing}
        title={isFollowing ? 'A seguir' : 'Seguir'}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          background: isFollowing ? 'rgba(16,185,129,0.18)' : 'var(--bg-card)',
          border: '1px solid ' + (isFollowing ? '#10b981' : 'var(--border)'),
          color: isFollowing ? '#10b981' : 'var(--text-dim)',
          cursor: isFollowing ? 'default' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isFollowing ? <Check size={13} /> : <Plus size={13} />}
      </button>
    </div>
  )
}
