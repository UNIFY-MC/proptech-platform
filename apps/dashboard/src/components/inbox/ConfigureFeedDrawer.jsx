// ConfigureFeedDrawer — controlo total dos feeds: sugeridos + a seguir
// + edit/run/delete inline + adicionar custom com qualquer plataforma/actor Apify

import { useState, useMemo } from 'react'
import {
  X, Plus, Check, Sparkles, Eye, EyeOff, Edit2, Trash2, Play, Settings,
  Instagram, Linkedin, Twitter, Globe, Rss, Youtube, Music, MessageSquare,
} from 'lucide-react'
import { useSuggestedInfluencers } from '../../hooks/useSuggestedInfluencers.js'
import { useWatcherSources } from '../../hooks/useWatcherSources.js'
import { supabase } from '../../lib/supabase.js'

const SECTORS = [
  { id: 'all',          label: 'All' },
  { id: 'following',    label: 'A seguir' },
  { id: 'real_estate',  label: 'Real Estate' },
  { id: 'proptech',     label: 'PropTech' },
  { id: 'concorrentes', label: 'Concorrentes' },
  { id: 'venture',      label: 'VC' },
  { id: 'news',         label: 'News' },
  { id: 'own',          label: 'Marca' },
]

const PLATFORM_META = {
  instagram: { icon: Instagram,    color: '#ec4899', label: 'Instagram' },
  linkedin:  { icon: Linkedin,     color: '#0a66c2', label: 'LinkedIn' },
  x:         { icon: Twitter,      color: '#1d9bf0', label: 'X' },
  tiktok:    { icon: Music,        color: '#ff0050', label: 'TikTok' },
  youtube:   { icon: Youtube,      color: '#ff0000', label: 'YouTube' },
  web:       { icon: Globe,        color: '#10b981', label: 'Web' },
  rss:       { icon: Rss,          color: '#f59e0b', label: 'RSS' },
  reddit:    { icon: MessageSquare,color: '#ff4500', label: 'Reddit' },
}

const APIFY_ACTORS = [
  { id: 'apify/instagram-scraper',         platform: 'instagram', mapper: 'instagram_post', label: 'Instagram (apify)',       cost: '$0.02' },
  { id: 'clockworks/free-tiktok-scraper',  platform: 'tiktok',    mapper: 'instagram_post', label: 'TikTok (free)',           cost: 'FREE'  },
  { id: 'apidojo/twitter-scraper',         platform: 'x',         mapper: 'twitter_post',   label: 'X / Twitter (apify)',     cost: '$0.02' },
  { id: 'apify/linkedin-profile-scraper',  platform: 'linkedin',  mapper: 'linkedin_post',  label: 'LinkedIn',                cost: '$0.10' },
  { id: 'apify/youtube-scraper',           platform: 'youtube',   mapper: 'page_content',   label: 'YouTube',                 cost: '$0.04' },
  { id: 'trudax/reddit-scraper-lite',      platform: 'reddit',    mapper: 'page_content',   label: 'Reddit (free)',           cost: 'FREE'  },
  { id: 'apify/web-scraper',               platform: 'web',       mapper: 'page_content',   label: 'Web genérico',            cost: '$0.01' },
]

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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

async function runApifySource(sourceId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/apify-run-actor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify({ source_id: sourceId }),
  })
  return await res.json()
}

async function synthesize(sinceHours = 24, vertical = null) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/feed-synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify({ since_hours: sinceHours, vertical }),
  })
  return await res.json()
}

export default function ConfigureFeedDrawer({ onClose }) {
  const [tab, setTab] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editingSource, setEditingSource] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const { suggestions, follow } = useSuggestedInfluencers()
  const { sources, toggle, remove, create, refresh } = useWatcherSources()

  const counts = useMemo(() => {
    // Following = TODAS as sources (active OU não), para podermos ver/gerir
    const c = { all: suggestions.length, following: sources.length }
    for (const s of suggestions) c[s.sector] = (c[s.sector] || 0) + 1
    return c
  }, [suggestions, sources])

  const visible = useMemo(() => {
    if (tab === 'following') return sources  // todas (active+inactive)
    if (tab === 'all') return suggestions
    return suggestions.filter(s => s.sector === tab)
  }, [tab, suggestions, sources])

  const totalActive = sources.filter(s => s.active).length
  const totalFollowing = sources.length

  // Determina se Watch All ou Unwatch All deve aparecer (todos da tab actual já seguidos?)
  const tabSuggestions = tab === 'all' || tab === 'following' ? suggestions : suggestions.filter(s => s.sector === tab)
  const allFollowed = tabSuggestions.length > 0 && tabSuggestions.every(s => s.already_following)
  const toFollowCount = tabSuggestions.filter(s => !s.already_following).length

  async function handleRun(sourceId) {
    setRunResult({ source_id: sourceId, loading: true })
    try {
      const res = await runApifySource(sourceId)
      setRunResult({ source_id: sourceId, result: res })
      await refresh()
    } catch (e) {
      setRunResult({ source_id: sourceId, error: String(e) })
    }
  }

  async function handleFollowAll() {
    const toFollow = suggestions.filter(s => !s.already_following && (tab === 'all' || s.sector === tab))
    for (const s of toFollow) await follow(s)
    await refresh()
  }

  async function handleUnwatchAll() {
    if (!confirm(`Desactivar TODAS as ${totalActive} sources activas?\nNão apaga — só pausa. Podes reactivar a qualquer altura.`)) return
    if (!supabase) return
    // Desactiva todas as sources active
    for (const s of sources.filter(x => x.active)) {
      // eslint-disable-next-line no-await-in-loop
      await toggle(s.id, false)
    }
    await refresh()
  }

  async function handleSynthesize() {
    setRunResult({ source_id: 'synthesize', loading: true })
    try {
      const res = await synthesize(24, tab !== 'all' && tab !== 'following' ? tab : null)
      setRunResult({ source_id: 'synthesize', result: res })
    } catch (e) {
      setRunResult({ source_id: 'synthesize', error: String(e) })
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, paddingTop: 60, paddingBottom: 40, overflowY: 'auto',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, width: 'min(1080px, 96vw)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        padding: '20px 28px 24px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>Feed Configuration</h2>
          <span style={{
            background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 99,
            fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{totalActive} sources</span>
          <button onClick={() => setAddOpen(true)} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text)',
          }}>
            <Plus size={12} /> Add custom
          </button>
          <button onClick={handleSynthesize} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text)',
          }} title="Meta-resumo IA das últimas 24h">
            <Sparkles size={12} /> Synthesize
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
          }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {SECTORS.map(s => {
            const active = tab === s.id
            const n = counts[s.id] || 0
            return (
              <button key={s.id} onClick={() => setTab(s.id)} style={{
                padding: '6px 14px', borderRadius: 99,
                background: active ? 'var(--text)' : 'var(--bg-elevated)',
                color: active ? 'var(--bg)' : 'var(--text-dim)',
                border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
                cursor: 'pointer', fontSize: '0.72rem',
                fontWeight: active ? 700 : 500,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {s.label}
                {n > 0 && <span style={{ opacity: 0.7, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem' }}>{n}</span>}
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          {/* Watch All — sempre visível em tabs de sugestões quando há items por seguir */}
          {tab !== 'following' && toFollowCount > 0 && (
            <button onClick={handleFollowAll} style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
              padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
              fontSize: '0.72rem', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Eye size={12} /> Watch All ({toFollowCount})
            </button>
          )}
          {/* Unwatch All — sempre visível quando há sources active */}
          {totalActive > 0 && (
            <button onClick={handleUnwatchAll} style={{
              background: 'transparent', color: 'var(--danger)',
              border: '1px solid var(--danger)',
              padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
              fontSize: '0.72rem', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <EyeOff size={12} /> Unwatch All ({totalActive})
            </button>
          )}
          {/* Reactivate inactive — quando há sources mas todas off */}
          {totalActive === 0 && totalFollowing > 0 && (
            <button onClick={async () => {
              for (const s of sources.filter(x => !x.active)) await toggle(s.id, true)
              await refresh()
            }} style={{
              background: '#10b981', color: '#fff', border: 'none',
              padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
              fontSize: '0.72rem', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Eye size={12} /> Re-activar todas ({totalFollowing})
            </button>
          )}
        </div>

        {/* Result do run inline */}
        {runResult && (
          <div style={{
            padding: 8, fontSize: '0.65rem', color: 'var(--text-dim)',
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--bg-elevated)', borderRadius: 6,
          }}>
            {runResult.loading
              ? '⏳ Apify actor a arrancar…'
              : JSON.stringify(runResult.result || runResult.error).slice(0, 320)}
            <button onClick={() => setRunResult(null)} style={{
              float: 'right', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
            }}><X size={11} /></button>
          </div>
        )}

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 10,
        }}>
          {tab === 'following'
            ? visible.map(src => (
                <FollowingCard key={src.id} src={src}
                  onToggle={() => toggle(src.id, !src.active)}
                  onEdit={() => setEditingSource(src)}
                  onRun={() => handleRun(src.id)}
                  onRemove={() => { if (confirm(`Apagar "${src.label}"?`)) remove(src.id) }} />
              ))
            : visible.map(s => (
                <SuggestionCard key={s.id} sugg={s} onFollow={() => follow(s).then(refresh)} />
              ))
          }
          {visible.length === 0 && (
            <div style={{
              gridColumn: '1 / -1', padding: 30, textAlign: 'center',
              color: 'var(--text-dim)', fontSize: '0.78rem',
              background: 'var(--bg-elevated)', borderRadius: 8,
            }}>
              {tab === 'following' ? 'Ainda não segues nada. Vai a "All" e clica Watch All ou em cada card.' : 'Sem sugestões neste sector.'}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {addOpen && <AddCustomModal onClose={() => setAddOpen(false)} onSubmit={async (input) => {
        await create(input); await refresh(); setAddOpen(false)
      }} />}
      {editingSource && <EditSourceModal source={editingSource} onClose={() => setEditingSource(null)} onSaved={refresh} />}
    </div>
  )
}

function SuggestionCard({ sugg, onFollow }) {
  const isFollowing = sugg.already_following
  const displayLabel = sugg.display_name || sugg.handle
  const platformMeta = PLATFORM_META[sugg.platform] || PLATFORM_META.web
  const PlatformIcon = platformMeta.icon
  const handleLabel = sugg.handle?.startsWith('http')
    ? new URL(sugg.handle).hostname
    : (sugg.handle?.startsWith('@') ? sugg.handle : `@${sugg.handle}`)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 8, opacity: isFollowing ? 0.85 : 1,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: avatarGradient(displayLabel),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '0.7rem', fontWeight: 700,
        fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
        position: 'relative',
      }}>
        {avatarLetters(displayLabel)}
        {/* Platform badge no canto */}
        <span style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--bg-card)',
          border: `1.5px solid ${platformMeta.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PlatformIcon size={8} color={platformMeta.color} />
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.82rem', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {displayLabel}
          {sugg.is_competitor && (
            <span style={{
              fontSize: '0.5rem', padding: '1px 4px', borderRadius: 3,
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
            }}>COMP</span>
          )}
        </div>
        <div style={{
          fontSize: '0.6rem', color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {platformMeta.label} · {handleLabel}{sugg.vertical ? ` · ${sugg.vertical}` : ''}
        </div>
      </div>
      <button onClick={onFollow} disabled={isFollowing}
        title={isFollowing ? 'A seguir' : 'Seguir'}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          background: isFollowing ? 'rgba(16,185,129,0.18)' : 'var(--bg-card)',
          border: '1px solid ' + (isFollowing ? '#10b981' : 'var(--border)'),
          color: isFollowing ? '#10b981' : 'var(--text-dim)',
          cursor: isFollowing ? 'default' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{isFollowing ? <Check size={13} /> : <Plus size={13} />}</button>
    </div>
  )
}

function FollowingCard({ src, onToggle, onEdit, onRun, onRemove }) {
  const platform = src.config?.platform
    || (src.kind === 'instagram_user' ? 'instagram'
      : src.kind === 'x_search' ? 'x'
      : src.kind === 'linkedin_user' ? 'linkedin'
      : src.kind === 'rss' ? 'rss'
      : src.kind === 'competitor_site' ? 'web'
      : src.kind === 'apify_actor' ? (src.config?.platform || 'web')
      : 'web')
  const meta = PLATFORM_META[platform] || PLATFORM_META.web
  const Icon = meta.icon
  const handle = src.config?.handle || src.config?.url || src.label
  const actorId = src.config?.actor_id
  const isApify = src.kind === 'apify_actor'
  const lastRun = src.last_run_at

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '12px 14px',
      background: 'var(--bg-elevated)',
      border: '1px solid ' + (src.active ? 'var(--border)' : 'var(--border)'),
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 8, opacity: src.active ? 1 : 0.55,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={14} color={meta.color} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {src.label}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.label}{src.vertical ? ` · ${src.vertical.toUpperCase()}` : ''}{actorId ? ` · ${actorId}` : ''}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
        {typeof handle === 'string' ? handle.slice(0, 70) : ''}
      </div>
      <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
        {lastRun ? `Última: ${new Date(lastRun).toLocaleString('pt-PT')}` : 'Nunca correu'}
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button onClick={onToggle} style={miniBtn(src.active ? meta.color : null)}>
          {src.active ? 'On' : 'Off'}
        </button>
        {isApify && (
          <button onClick={onRun} style={miniBtn('var(--primary)')} title="Run agora">
            <Play size={9} />
          </button>
        )}
        <button onClick={onEdit} style={miniBtn()} title="Editar">
          <Edit2 size={9} />
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onRemove} style={miniBtn('#ef4444')} title="Apagar">
          <Trash2 size={9} />
        </button>
      </div>
    </div>
  )
}

const miniBtn = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 3,
  padding: '4px 8px', borderRadius: 4,
  background: color ? `${color}22` : 'var(--bg-card)',
  border: `1px solid ${color || 'var(--border)'}`,
  color: color || 'var(--text-dim)',
  cursor: 'pointer', fontSize: '0.6rem', fontWeight: 600,
})

// ─── Modal: adicionar custom source ───────────────────────────
function AddCustomModal({ onClose, onSubmit }) {
  const [mode, setMode] = useState('apify')  // 'apify' | 'simple'
  const [actor, setActor] = useState(APIFY_ACTORS[0])
  const [label, setLabel] = useState('')
  const [vertical, setVertical] = useState('')
  const [inputJson, setInputJson] = useState(JSON.stringify({ username: ['handle'], resultsLimit: 5 }, null, 2))
  const [simpleKind, setSimpleKind] = useState('competitor_site')
  const [simpleHandle, setSimpleHandle] = useState('')

  function submit(e) {
    e?.preventDefault?.()
    if (mode === 'apify') {
      let input
      try { input = JSON.parse(inputJson) } catch { alert('Input JSON inválido'); return }
      if (!label.trim()) return
      onSubmit({
        kind: 'apify_actor',
        label: label.trim(),
        vertical: vertical || null,
        active: true,
        config: { actor_id: actor.id, platform: actor.platform, output_mapper: actor.mapper, input },
      })
    } else {
      if (!simpleHandle.trim()) return
      const cfg = simpleKind === 'competitor_site' ? { url: simpleHandle }
                : simpleKind === 'rss'             ? { feed_url: simpleHandle }
                : simpleKind === 'news_query'      ? { query: simpleHandle, language: 'pt', country: 'pt' }
                : { handle: simpleHandle.replace(/^@/, '') }
      onSubmit({
        kind: simpleKind,
        label: label.trim() || simpleHandle.trim(),
        vertical: vertical || null,
        active: true,
        config: cfg,
      })
    }
  }

  // Update input template quando actor muda
  function pickActor(a) {
    setActor(a)
    const tpl = a.id === 'apify/instagram-scraper' ? { username: ['handle'], resultsLimit: 5 }
              : a.id === 'clockworks/free-tiktok-scraper' ? { profiles: ['handle'], resultsPerPage: 5 }
              : a.id === 'apidojo/twitter-scraper' ? { handle: 'handle', tweetsDesired: 10 }
              : a.id === 'apify/linkedin-profile-scraper' ? { profileUrls: ['https://linkedin.com/in/exemplo'] }
              : a.id === 'apify/youtube-scraper' ? { startUrls: [{ url: 'https://youtube.com/@channel' }], maxResults: 10 }
              : a.id === 'trudax/reddit-scraper-lite' ? { searches: ['condomínio Portugal'], maxItems: 10 }
              : { startUrls: [{ url: 'https://exemplo.pt' }] }
    setInputJson(JSON.stringify(tpl, null, 2))
  }

  return (
    <div onClick={onClose} style={modalOverlay}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        ...modalCard, width: 560,
      }}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Adicionar source</h3>
          <button type="button" onClick={onClose} style={modalClose}><X size={16} /></button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-elevated)', borderRadius: 6 }}>
          {[
            { id: 'apify',  label: 'Apify (recomendado)' },
            { id: 'simple', label: 'Simple (web/rss/news)' },
          ].map(m => (
            <button key={m.id} type="button" onClick={() => setMode(m.id)} style={{
              flex: 1, padding: '6px 10px', borderRadius: 4,
              background: mode === m.id ? 'var(--bg-card)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: mode === m.id ? 'var(--text)' : 'var(--text-dim)',
              fontSize: '0.72rem', fontWeight: mode === m.id ? 600 : 500,
            }}>{m.label}</button>
          ))}
        </div>

        <div style={{
          fontSize: '0.65rem', color: 'var(--text-dim)',
          background: 'var(--bg-elevated)',
          padding: '8px 12px', borderRadius: 6,
          lineHeight: 1.5,
        }}>
          {mode === 'apify' ? (
            <>
              <strong style={{ color: 'var(--text)' }}>Apify recomendado para IG / X / LinkedIn / TikTok.</strong>{' '}
              Para seguir um Instagram específico: escolhe <code>apify/instagram-scraper</code>, no JSON input põe{' '}
              <code>{`{"username": ["handle_do_alvo"], "resultsLimit": 5}`}</code> (sem @, só o handle).
            </>
          ) : (
            <>
              <strong style={{ color: 'var(--text)' }}>Simple = sem Apify.</strong>{' '}
              Web/RSS funciona sem custo. Instagram via Graph API só funciona com a tua própria página
              (precisa <code>IG_GRAPH_TOKEN</code>). Para concorrentes, usa Apify (modo acima).
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'apify' && (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {APIFY_ACTORS.map(a => {
                  const m = PLATFORM_META[a.platform]
                  const Icon = m?.icon || Globe
                  const active = actor.id === a.id
                  return (
                    <button key={a.id} type="button" onClick={() => pickActor(a)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 99,
                      background: active ? `${m.color}22` : 'var(--bg-elevated)',
                      border: `1px solid ${active ? m.color : 'var(--border)'}`,
                      color: active ? m.color : 'var(--text-dim)',
                      cursor: 'pointer', fontSize: '0.65rem',
                      fontWeight: active ? 600 : 500,
                    }}>
                      <Icon size={11} /> {a.label}
                      <span style={{ opacity: 0.6 }}>{a.cost}</span>
                    </button>
                  )
                })}
              </div>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (ex: IG concorrente)" required style={inputStyle} />
              <select value={vertical} onChange={e => setVertical(e.target.value)} style={inputStyle}>
                <option value="">Sem vertical</option>
                <option value="v2">V2 Condomínios</option><option value="v3">V3 Seguros</option>
                <option value="v4">V4 Energia</option><option value="v5">V5 Manutenção</option>
                <option value="v7">V7 Real Estate</option><option value="v10">V10 Owners</option>
              </select>
              <div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Actor input (JSON)
                </div>
                <textarea value={inputJson} onChange={e => setInputJson(e.target.value)} rows={6}
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', resize: 'vertical' }} />
              </div>
            </>
          )}

          {mode === 'simple' && (
            <>
              <select value={simpleKind} onChange={e => setSimpleKind(e.target.value)} style={inputStyle}>
                <option value="competitor_site">Web — site concorrente (scrape diff)</option>
                <option value="rss">RSS — feed XML</option>
                <option value="news_query">News query (NewsAPI)</option>
                <option value="instagram_user">Instagram handle (Graph API direct)</option>
                <option value="x_search">X — via RSS bridge</option>
              </select>
              <input value={simpleHandle} onChange={e => setSimpleHandle(e.target.value)}
                placeholder={simpleKind === 'competitor_site' ? 'https://exemplo.pt' : simpleKind === 'rss' ? 'https://feed.xml' : simpleKind === 'news_query' ? 'tarifa eléctrica Portugal' : 'handle'}
                required style={inputStyle} />
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (opcional)" style={inputStyle} />
              <select value={vertical} onChange={e => setVertical(e.target.value)} style={inputStyle}>
                <option value="">Sem vertical</option>
                <option value="v2">V2 Condomínios</option><option value="v3">V3 Seguros</option>
                <option value="v4">V4 Energia</option><option value="v5">V5 Manutenção</option>
                <option value="v7">V7 Real Estate</option><option value="v10">V10 Owners</option>
              </select>
            </>
          )}

          <button type="submit" style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            padding: '9px 16px', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
          }}>Adicionar</button>
        </div>
      </form>
    </div>
  )
}

// ─── Modal: editar source existente ────────────────────────────
function EditSourceModal({ source, onClose, onSaved }) {
  const [label, setLabel] = useState(source.label)
  const [vertical, setVertical] = useState(source.vertical || '')
  const [configJson, setConfigJson] = useState(JSON.stringify(source.config || {}, null, 2))

  async function save(e) {
    e?.preventDefault?.()
    let config
    try { config = JSON.parse(configJson) } catch { alert('Config JSON inválido'); return }
    if (!supabase) return
    await supabase.schema('system').from('watcher_sources')
      .update({ label, vertical: vertical || null, config })
      .eq('id', source.id)
    await onSaved()
    onClose()
  }

  return (
    <div onClick={onClose} style={modalOverlay}>
      <form onSubmit={save} onClick={e => e.stopPropagation()} style={{ ...modalCard, width: 560 }}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Editar source</h3>
          <button type="button" onClick={onClose} style={modalClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={label} onChange={e => setLabel(e.target.value)} required style={inputStyle} />
          <select value={vertical} onChange={e => setVertical(e.target.value)} style={inputStyle}>
            <option value="">Sem vertical</option>
            <option value="v2">V2 Condomínios</option><option value="v3">V3 Seguros</option>
            <option value="v4">V4 Energia</option><option value="v5">V5 Manutenção</option>
            <option value="v7">V7 Real Estate</option><option value="v10">V10 Owners</option>
          </select>
          <div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Config (JSON)
            </div>
            <textarea value={configJson} onChange={e => setConfigJson(e.target.value)} rows={10}
              style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', resize: 'vertical' }} />
            <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Kind: <code>{source.kind}</code>{source.kind === 'apify_actor' && ` · ${source.config?.actor_id}`}
            </div>
          </div>
          <button type="submit" style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            padding: '9px 16px', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
          }}>Guardar</button>
        </div>
      </form>
    </div>
  )
}

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
  padding: 20,
}
const modalCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 22,
  maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: 14,
}
const modalHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}
const modalClose = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '8px 11px', borderRadius: 6,
  fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
}
