// InfluencersPage — /influencers
// Página focada em pessoas/contas a seguir como fonte de conteúdo.
// Distinta da /connections (que é tudo: news+rss+sites+instagram).
// Aqui: handles individuais (IG, X, LinkedIn, YouTube) cuja activity
// vai parar à Inbox como cards "Why it matters" + "Suggested mission".
//
// Cada influencer:
//   - handle/url
//   - platform (instagram | x | linkedin | youtube | substack)
//   - category (livre — Marketing, Tech, Real Estate, Finance, ...)
//   - active toggle
//   - notes
//
// Backend usa system.watcher_sources com kind='instagram_user' (já existe)
// + adicionamos suporte para kinds 'x_user', 'linkedin_user', 'youtube_channel'
// no campo config.

import { useState } from 'react'
import { Plus, Instagram, Twitter, Linkedin, Youtube, Rss, X, Trash2, Check, ExternalLink } from 'lucide-react'
import { useWatcherSources } from '../hooks/useWatcherSources.js'

const PLATFORMS = [
  { id: 'instagram_user',   label: 'Instagram', icon: Instagram, color: '#ec4899', placeholder: '@handle' },
  { id: 'x_search',         label: 'X / Twitter', icon: Twitter, color: '#1d9bf0', placeholder: '@handle ou query' },
  { id: 'linkedin_user',    label: 'LinkedIn',  icon: Linkedin, color: '#0a66c2', placeholder: 'linkedin.com/in/...' },
  { id: 'youtube_channel',  label: 'YouTube',   icon: Youtube,  color: '#ff0000', placeholder: 'youtube.com/@...' },
  { id: 'rss',              label: 'Substack/RSS', icon: Rss,   color: '#f59e0b', placeholder: 'https://feed.xml' },
]

const PLATFORM_BY_ID = Object.fromEntries(PLATFORMS.map(p => [p.id, p]))

function isInfluencerKind(kind) {
  return ['instagram_user', 'x_search', 'linkedin_user', 'youtube_channel', 'rss'].includes(kind)
}

function AddInfluencerModal({ onClose, onCreate }) {
  const [platform, setPlatform] = useState('instagram_user')
  const [handle, setHandle] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!handle.trim()) return
    const cleanHandle = handle.trim().replace(/^@/, '')
    const label = `${PLATFORM_BY_ID[platform].label}: ${cleanHandle}`
    const config = { handle: cleanHandle, category: category.trim() || null, notes: notes.trim() || null }
    onCreate({ kind: platform, label, config, active: true })
    onClose()
  }

  const plat = PLATFORM_BY_ID[platform]
  const Icon = plat.icon

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 22, width: 480, maxWidth: '92vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Seguir influencer</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={18} /></button>
        </div>

        {/* Platform picker pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => {
            const PI = p.icon
            const active = p.id === platform
            return (
              <button key={p.id} type="button" onClick={() => setPlatform(p.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px',
                background: active ? `${p.color}22` : 'var(--bg-elevated)',
                border: `1px solid ${active ? p.color : 'var(--border)'}`,
                borderRadius: 99,
                cursor: 'pointer',
                color: active ? p.color : 'var(--text-dim)',
                fontSize: '0.72rem',
                fontWeight: active ? 600 : 500,
              }}>
                <PI size={12} />
                {p.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: `${plat.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={16} color={plat.color} />
            </div>
            <input
              value={handle} onChange={e => setHandle(e.target.value)}
              placeholder={plat.placeholder} autoFocus required
              style={inputStyle}
            />
          </div>
          <input value={category} onChange={e => setCategory(e.target.value)}
            placeholder="Categoria (ex: Marketing, Tech, Real Estate)"
            style={inputStyle} />
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notas (opcional — porque seguir, o que vigiar)"
            rows={2} style={{ ...inputStyle, resize: 'vertical' }} />

          <button type="submit" style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            padding: '9px 16px', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, marginTop: 4,
          }}>Seguir</button>
        </div>
      </form>
    </div>
  )
}

const inputStyle = {
  flex: 1,
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '8px 11px',
  borderRadius: 6,
  fontSize: '0.82rem',
  outline: 'none',
  fontFamily: 'inherit',
}

export default function InfluencersPage() {
  const { sources, create, toggle, remove } = useWatcherSources()
  const [createOpen, setCreateOpen] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState('all')

  const influencers = sources.filter(s => isInfluencerKind(s.kind))
  const visible = filterPlatform === 'all'
    ? influencers
    : influencers.filter(s => s.kind === filterPlatform)

  const counts = PLATFORMS.reduce((acc, p) => {
    acc[p.id] = influencers.filter(s => s.kind === p.id).length
    return acc
  }, { all: influencers.length })

  return (
    <div style={{ padding: '4px 4px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '4px 8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>Influencers</h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {influencers.length} fontes seguidas — actividade aparece automaticamente na Inbox com análise "Why it matters"
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setCreateOpen(true)} style={{
          background: 'var(--text)', color: 'var(--bg)', border: 'none',
          padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}><Plus size={13} /> Seguir</button>
      </div>

      {/* Platform filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, padding: '0 8px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterPlatform('all')} style={filterPill(filterPlatform === 'all')}>
          Todos <span style={{ opacity: 0.7 }}>{counts.all}</span>
        </button>
        {PLATFORMS.map(p => {
          const Icon = p.icon
          const active = filterPlatform === p.id
          return (
            <button key={p.id} onClick={() => setFilterPlatform(p.id)} style={{
              ...filterPill(active),
              color: active ? p.color : 'var(--text-dim)',
              borderColor: active ? p.color : 'var(--border)',
              background: active ? `${p.color}15` : 'var(--bg-elevated)',
            }}>
              <Icon size={11} /> {p.label} <span style={{ opacity: 0.7 }}>{counts[p.id]}</span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 10, color: 'var(--text-dim)', fontSize: '0.82rem',
        }}>
          <Instagram size={24} color="var(--text-dim)" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>Sem influencers seguidos.</div>
          <div style={{ marginTop: 6, fontSize: '0.72rem' }}>
            Adiciona handles de Instagram, X, LinkedIn, YouTube ou feeds Substack.
            Os posts deles aparecem na tua Inbox com análise.
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {visible.map(inf => {
            const plat = PLATFORM_BY_ID[inf.kind]
            const Icon = plat?.icon || Rss
            const color = plat?.color || '#6b7280'
            const handle = inf.config?.handle || '—'
            const category = inf.config?.category
            const notes = inf.config?.notes
            return (
              <div key={inf.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderTop: `3px solid ${color}`,
                borderRadius: 8,
                padding: 14,
                opacity: inf.active ? 1 : 0.55,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Icon size={16} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{handle.startsWith('@') ? handle : `@${handle}`}</div>
                    <div style={{
                      fontSize: '0.6rem', color: 'var(--text-dim)',
                      fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
                    }}>{plat?.label || inf.kind}</div>
                  </div>
                </div>

                {category && (
                  <div style={{
                    fontSize: '0.62rem', color: color,
                    background: `${color}15`,
                    padding: '2px 7px', borderRadius: 3,
                    alignSelf: 'flex-start',
                    fontWeight: 600,
                  }}>{category}</div>
                )}

                {notes && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                    {notes}
                  </div>
                )}

                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 4 }}>
                  {inf.last_run_at
                    ? `Última fetch: ${new Date(inf.last_run_at).toLocaleString('pt-PT')}`
                    : 'Sem fetches ainda'}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button onClick={() => toggle(inf.id, !inf.active)} style={{
                    ...rowBtn,
                    color: inf.active ? 'var(--success)' : 'var(--text-dim)',
                  }}>
                    {inf.active ? <><Check size={11} /> Activo</> : 'Inactivo'}
                  </button>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => {
                    if (confirm(`Deixar de seguir ${handle}?`)) remove(inf.id)
                  }} style={rowBtn} title="Remover">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{
        marginTop: 28, padding: 14,
        background: 'var(--bg-card)', border: '1px dashed var(--border)',
        borderRadius: 8, fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5,
      }}>
        <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>Como funciona:</div>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>Adicionas um handle aqui (ou em <code>/connections</code>).</li>
          <li>Edge fn periódica (watcher-instagram cron 30min, watcher-news horário) puxa actividade.</li>
          <li>Cada post novo cria um inbox_item kind='instagram'/'news' com payload.</li>
          <li>Click no card no <code>/inbox</code> expande inline com embed + "Why it matters" + "Suggested mission" + botão Create task.</li>
        </ol>
        <div style={{ marginTop: 8 }}>
          <strong style={{ color: 'var(--text)' }}>Secrets necessários:</strong>{' '}
          <code>IG_GRAPH_TOKEN</code> (Instagram), <code>NEWS_API_KEY</code> (NewsAPI),{' '}
          futuramente <code>X_API_KEY</code>, <code>LINKEDIN_TOKEN</code>, <code>YT_API_KEY</code>.
        </div>
      </div>

      {createOpen && <AddInfluencerModal onClose={() => setCreateOpen(false)} onCreate={create} />}
    </div>
  )
}

const rowBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
  fontSize: '0.65rem', color: 'var(--text-dim)',
}

function filterPill(active) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
    background: active ? 'var(--bg-card)' : 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: active ? 'var(--text)' : 'var(--text-dim)',
    fontSize: '0.7rem', fontWeight: active ? 600 : 500,
  }
}
