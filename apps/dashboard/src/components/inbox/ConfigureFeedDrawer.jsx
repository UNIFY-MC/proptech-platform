// ConfigureFeedDrawer — drawer lateral do /inbox
// 3 tabs:
//   1. Sugeridos  — curated list de system.suggested_influencers
//                   (PropTech PT — concorrentes, VCs, news, etc)
//   2. A seguir   — watcher_sources active=true (toggle on/off)
//   3. Filtros    — placeholder para mute por vertical, source type
//
// Sugerido com botão "Seguir" → INSERT em watcher_sources
// Active = highlight ✓ ao lado

import { useState } from 'react'
import {
  X, Plus, Check, Instagram, Linkedin, Twitter, Globe, Rss, Youtube,
  Music, MessageSquare, Sparkles, Shield, Building2, Briefcase, TrendingUp,
} from 'lucide-react'
import { useSuggestedInfluencers } from '../../hooks/useSuggestedInfluencers.js'
import { useWatcherSources } from '../../hooks/useWatcherSources.js'

const PLATFORM_META = {
  instagram: { icon: Instagram,    color: '#ec4899', label: 'Instagram' },
  linkedin:  { icon: Linkedin,     color: '#0a66c2', label: 'LinkedIn'  },
  x:         { icon: Twitter,      color: '#1d9bf0', label: 'X / Twitter' },
  tiktok:    { icon: Music,        color: '#ff0050', label: 'TikTok'    },
  youtube:   { icon: Youtube,      color: '#ff0000', label: 'YouTube'   },
  web:       { icon: Globe,        color: '#10b981', label: 'Web'       },
  rss:       { icon: Rss,          color: '#f59e0b', label: 'RSS'       },
  reddit:    { icon: MessageSquare,color: '#ff4500', label: 'Reddit'    },
}

const CATEGORY_ICON = {
  'Concorrente directo V2':   Building2,
  'Concorrente directo V4':   TrendingUp,
  'Marketplace imobiliário':  Building2,
  'VC PropTech PT':           Briefcase,
  'VC tech PT':               Briefcase,
  'Real estate luxury PT':    Sparkles,
  'Imprensa imobiliário PT':  Rss,
}

const TABS = [
  { id: 'suggested', label: 'Sugeridos' },
  { id: 'following', label: 'A seguir' },
  { id: 'filters',   label: 'Filtros' },
]

export default function ConfigureFeedDrawer({ onClose }) {
  const [tab, setTab] = useState('suggested')
  const [platformFilter, setPlatformFilter] = useState('all')
  const { suggestions, follow } = useSuggestedInfluencers()
  const { sources, toggle, remove, refresh } = useWatcherSources()

  // Sugeridos: filter por plataforma
  const visibleSuggestions = platformFilter === 'all'
    ? suggestions
    : suggestions.filter(s => s.platform === platformFilter)

  // A seguir = watcher_sources com active=true
  const followingSources = sources.filter(s => s.active)

  // Counts por plataforma para pills
  const counts = suggestions.reduce((acc, s) => {
    acc[s.platform] = (acc[s.platform] || 0) + 1
    return acc
  }, { all: suggestions.length })

  async function handleFollow(sugg) {
    await follow(sugg)
    await refresh()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 'min(520px, 100vw)',
      background: 'var(--bg)', borderLeft: '1px solid var(--border)',
      boxShadow: '-8px 0 24px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Configurar feed</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>
            Sugestões curated para Property007 + sources activas
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', padding: '0 4px',
        }}><X size={18} /></button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 12px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t.id ? 'var(--primary)' : 'var(--text-dim)',
            fontSize: '0.74rem',
            fontWeight: tab === t.id ? 600 : 500,
            borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
          }}>
            {t.label}
            {t.id === 'following' && followingSources.length > 0 && (
              <span style={{
                marginLeft: 5,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.6rem',
                opacity: 0.7,
              }}>{followingSources.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

        {tab === 'suggested' && (
          <>
            {/* Platform pills filter */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
              <PillBtn active={platformFilter === 'all'} onClick={() => setPlatformFilter('all')}>
                Todas <span style={{ opacity: 0.6 }}>{counts.all}</span>
              </PillBtn>
              {Object.entries(PLATFORM_META).map(([id, meta]) => {
                if (!counts[id]) return null
                const Icon = meta.icon
                const active = platformFilter === id
                return (
                  <PillBtn key={id}
                    active={active}
                    color={meta.color}
                    onClick={() => setPlatformFilter(id)}>
                    <Icon size={10} /> {meta.label} <span style={{ opacity: 0.6 }}>{counts[id]}</span>
                  </PillBtn>
                )
              })}
            </div>

            {/* Suggestions list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleSuggestions.map(s => (
                <SuggestionRow key={s.id} sugg={s} onFollow={() => handleFollow(s)} />
              ))}
            </div>
            {visibleSuggestions.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                Sem sugestões nesta plataforma.
              </div>
            )}
          </>
        )}

        {tab === 'following' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {followingSources.length === 0 && (
              <div style={{
                padding: 24, textAlign: 'center',
                color: 'var(--text-dim)', fontSize: '0.78rem',
                background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 6,
              }}>
                Ainda não segues ninguém. Vai a "Sugeridos" para adicionar.
              </div>
            )}
            {followingSources.map(s => (
              <FollowingRow key={s.id} source={s}
                onToggle={() => toggle(s.id, !s.active)}
                onRemove={() => { if (confirm(`Deixar de seguir "${s.label}"?`)) remove(s.id) }} />
            ))}
          </div>
        )}

        {tab === 'filters' && (
          <div style={{ padding: 12, fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 10px', color: 'var(--text)' }}>Filtros do feed</p>
            <p style={{ margin: 0 }}>
              Mute por vertical · frequência digest · tipos de cards (news/instagram/competitor/roundup).
            </p>
            <p style={{ marginTop: 12, fontStyle: 'italic' }}>
              Sprint próximo: implementação por toggle.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function PillBtn({ active, color = 'var(--primary)', onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 9px', borderRadius: 99,
      background: active ? `${color}22` : 'var(--bg-elevated)',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      color: active ? color : 'var(--text-dim)',
      fontSize: '0.65rem', fontWeight: active ? 600 : 500,
      cursor: 'pointer',
    }}>{children}</button>
  )
}

function SuggestionRow({ sugg, onFollow }) {
  const meta = PLATFORM_META[sugg.platform] || PLATFORM_META.web
  const Icon = meta.icon
  const CatIcon = CATEGORY_ICON[sugg.category]
  const isFollowing = sugg.already_following

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${sugg.is_competitor ? '#ef4444' : meta.color}`,
      borderRadius: 6,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      opacity: isFollowing ? 0.6 : 1,
    }}>
      <Icon size={15} color={meta.color} style={{ flexShrink: 0, marginTop: 2 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
            {sugg.display_name || sugg.handle}
          </span>
          {sugg.is_competitor && (
            <span style={{
              fontSize: '0.5rem',
              padding: '1px 5px',
              borderRadius: 3,
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
            }}>COMP</span>
          )}
          {sugg.vertical && (
            <span style={{
              fontSize: '0.55rem',
              padding: '1px 5px',
              borderRadius: 3,
              background: 'var(--bg-elevated)',
              color: 'var(--text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>{sugg.vertical.toUpperCase()}</span>
          )}
        </div>

        {sugg.category && (
          <div style={{
            fontSize: '0.62rem', color: 'var(--text-dim)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginBottom: 4,
          }}>
            {CatIcon && <CatIcon size={9} />}
            {sugg.category}
          </div>
        )}

        {sugg.why_suggest && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.4 }}>
            {sugg.why_suggest}
          </div>
        )}

        {sugg.apify_actor && (
          <div style={{
            fontSize: '0.55rem', color: 'var(--text-dim)',
            fontFamily: 'JetBrains Mono, monospace', marginTop: 4,
          }}>via {sugg.apify_actor}</div>
        )}
      </div>

      <button
        disabled={isFollowing}
        onClick={onFollow}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', borderRadius: 5,
          background: isFollowing ? 'var(--bg-elevated)' : 'var(--text)',
          color: isFollowing ? 'var(--text-dim)' : 'var(--bg)',
          border: 'none',
          fontSize: '0.65rem', fontWeight: 600,
          cursor: isFollowing ? 'not-allowed' : 'pointer',
          flexShrink: 0,
        }}
      >
        {isFollowing ? <><Check size={11} /> A seguir</> : <><Plus size={11} /> Seguir</>}
      </button>
    </div>
  )
}

function FollowingRow({ source, onToggle, onRemove }) {
  const platform = source.config?.platform
                || (source.kind === 'instagram_user' ? 'instagram'
                  : source.kind === 'x_search' ? 'x'
                  : source.kind === 'linkedin_user' ? 'linkedin'
                  : source.kind === 'rss' ? 'rss'
                  : source.kind === 'competitor_site' ? 'web'
                  : source.kind === 'apify_actor' ? (source.config?.platform || 'web')
                  : 'web')
  const meta = PLATFORM_META[platform] || PLATFORM_META.web
  const Icon = meta.icon
  const handle = source.config?.handle || source.config?.url

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 6,
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      opacity: source.active ? 1 : 0.5,
    }}>
      <Icon size={13} color={meta.color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {source.label}
        </div>
        {handle && (
          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            {handle}
          </div>
        )}
      </div>
      <button onClick={onToggle} style={{
        padding: '3px 8px', borderRadius: 4,
        background: source.active ? `${meta.color}22` : 'var(--bg-elevated)',
        color: source.active ? meta.color : 'var(--text-dim)',
        border: 'none', cursor: 'pointer',
        fontSize: '0.62rem', fontWeight: 600,
      }}>{source.active ? 'On' : 'Off'}</button>
      <button onClick={onRemove} style={{
        padding: 4, borderRadius: 3,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-dim)', display: 'inline-flex',
      }} title="Remover"><X size={11} /></button>
    </div>
  )
}
