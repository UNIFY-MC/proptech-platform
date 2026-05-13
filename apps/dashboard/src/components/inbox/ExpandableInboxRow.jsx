// ExpandableInboxRow — substitui FeedRow com expansão inline abaixo
// Quando item.raw.expandable=true OU item.raw.kind ∈ {roundup,news,instagram,competitor}
// click expande inline o conteúdo (markdown + imagem + actions).
// Items legacy (sem expandable) continuam a abrir drawer via onClickLegacy.

import { useState, useMemo } from 'react'
import { Sparkles, Lightbulb, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import InboxItemActions from './InboxItemActions.jsx'

const SOURCE_META = {
  bia:             { color: '#534AB7', initials: 'B',  label: 'Bia' },
  watcher:         { color: '#3b82f6', initials: 'W',  label: 'Watcher' },
  agent:           { color: '#10b981', initials: 'AG', label: 'Agent' },
  manual:          { color: '#6b7280', initials: 'M',  label: 'Manual' },
  system:          { color: '#6b7280', initials: 'SY', label: 'System' },
}

// kind → badge meta
const KIND_BADGE = {
  roundup:    { bg: '#10b98122', color: '#10b981', label: 'ROUNDUP' },
  news:       { bg: '#3b82f622', color: '#3b82f6', label: 'NEWS' },
  instagram:  { bg: '#ec489922', color: '#ec4899', label: 'INSTAGRAM' },
  competitor: { bg: '#ef444422', color: '#ef4444', label: 'COMP' },
  op:         { bg: '#6b728022', color: '#9ca3af', label: 'OP' },
  alert:      { bg: '#ef444422', color: '#ef4444', label: 'ALERT' },
  task:       { bg: '#8b5cf622', color: '#8b5cf6', label: 'TASK' },
  mention:    { bg: '#f59e0b22', color: '#f59e0b', label: 'MENTION' },
}

function ageLabel(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Markdown muito simples (h2/h3, listas, **bold**, links). Para resumos do
// daily-roundup. Sem deps externas.
function renderMd(md) {
  if (!md) return null
  const lines = md.split('\n')
  const out = []
  let key = 0
  for (const ln of lines) {
    const t = ln.trim()
    if (!t) { out.push(<div key={key++} style={{ height: 6 }} />); continue }
    if (t.startsWith('## ')) {
      out.push(<h3 key={key++} style={{ fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 4px', color: 'var(--text)' }}>{t.slice(3)}</h3>); continue
    }
    if (t.startsWith('### ')) {
      out.push(<h4 key={key++} style={{ fontSize: '0.82rem', fontWeight: 600, margin: '6px 0 3px', color: 'var(--text)' }}>{t.slice(4)}</h4>); continue
    }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      out.push(
        <div key={key++} style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5, padding: '2px 0' }}>
          <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: t.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )
      continue
    }
    if (t.startsWith('_') && t.endsWith('_')) {
      out.push(<div key={key++} style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 8 }}>{t.slice(1, -1)}</div>); continue
    }
    out.push(
      <p key={key++} style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5, margin: '4px 0' }}
        dangerouslySetInnerHTML={{ __html: t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
    )
  }
  return out
}

export default function ExpandableInboxRow({ item, onClickLegacy, onMarkRead, onArchive, onCreateTask }) {
  const [open, setOpen] = useState(false)

  // kind novo (post-migration) OU raw.expandable
  const kind = item.raw?.kind
  const isNewKind = kind && KIND_BADGE[kind]
  const expandable = item.raw?.expandable === true || isNewKind

  if (!expandable) {
    // Comportamento legacy: click abre drawer
    return <LegacyRow item={item} onClick={() => onClickLegacy(item)} />
  }

  const src = SOURCE_META[item.source] || SOURCE_META.system
  const badge = KIND_BADGE[kind] || KIND_BADGE.op
  const payload = item.raw?.payload || {}
  const watcher = item.watcher
  const authorName = watcher?.name || src.label
  const authorPhoto = watcher?.photo_url || null

  function toggle() {
    setOpen(o => !o)
    if (!open && !item.isRead) onMarkRead?.(item.raw.id)
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.05))',
      opacity: item.isRead && !open ? 0.65 : 1,
    }}>
      <button
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', width: '100%',
          background: open ? 'var(--bg-card)' : 'transparent',
          border: 'none',
          cursor: 'pointer', textAlign: 'left',
          font: 'inherit', color: 'inherit',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg-card)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ flexShrink: 0, width: 16, display: 'flex', justifyContent: 'center' }}>
          {kind === 'roundup'
            ? <Sparkles size={13} color="var(--primary)" />
            : kind === 'news' || kind === 'instagram'
              ? <Lightbulb size={13} color="#fde047" />
              : null}
        </div>

        <div style={{ flex: '0 1 280px', minWidth: 0, fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', maxWidth: 200 }}>
          {authorPhoto ? (
            <img src={authorPhoto} alt={authorName} referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
          ) : (
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: src.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.55rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
              {src.initials}
            </div>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {authorName}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0, fontSize: '0.72rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {payload.summary_md?.split('\n')[0]?.slice(0, 80) || item.body?.slice(0, 80) || payload.title || ''}
        </div>

        <span style={{
          flexShrink: 0,
          padding: '2px 7px', borderRadius: 3,
          fontSize: '0.52rem', fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          background: badge.bg, color: badge.color,
          letterSpacing: '0.06em',
        }}>{badge.label}</span>

        <span style={{ flexShrink: 0, minWidth: 50, textAlign: 'right', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          {ageLabel(item.created_at)}
        </span>

        <span style={{ flexShrink: 0, color: 'var(--text-dim)' }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
        }}>
          <ExpandedBody payload={payload} kind={kind} body={item.body} sourceUrl={item.raw?.source_url} sourceName={item.raw?.source_name} />
          <InboxItemActions
            item={item}
            onMarkRead={onMarkRead}
            onArchive={onArchive}
            onCreateTask={onCreateTask}
          />
        </div>
      )}
    </div>
  )
}

function ExpandedBody({ payload, kind, body, sourceUrl, sourceName }) {
  // Imagem (news, instagram, competitor)
  const imageUrl = payload.image_url || payload.image
  const summary = payload.summary_md || payload.content_md || body || ''

  const Md = useMemo(() => renderMd(summary), [summary])

  return (
    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={payload.title || ''}
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{
            width: '100%',
            maxHeight: 360,
            objectFit: 'cover',
            borderRadius: 6,
            border: '1px solid var(--border)',
          }}
        />
      )}

      {payload.title && payload.title !== body && (
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          {payload.title}
        </h3>
      )}

      {/* Caption do post se for instagram */}
      {kind === 'instagram' && payload.caption && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
          {payload.caption}
        </p>
      )}

      {/* Stats grid se for roundup */}
      {kind === 'roundup' && payload.stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 8,
          padding: '10px 0',
        }}>
          {Object.entries(payload.stats).map(([k, v]) => (
            <div key={k} style={{
              padding: '8px 10px',
              background: 'var(--bg-elevated)',
              borderRadius: 5,
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                {k.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
                {typeof v === 'number' ? v.toLocaleString('pt-PT') : String(v)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Markdown content */}
      {Md && <div>{Md}</div>}

      {/* Footer: fonte externa */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.72rem',
            color: 'var(--info)',
            textDecoration: 'none',
            marginTop: 4,
          }}
        >
          <ExternalLink size={11} />
          {sourceName || 'Abrir fonte original'}
        </a>
      )}
    </div>
  )
}

// LegacyRow — fallback para items sem campos novos (mantém comportamento drawer)
function LegacyRow({ item, onClick }) {
  const src = SOURCE_META[item.source] || SOURCE_META.system
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', width: '100%',
        background: 'transparent', border: 'none',
        borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.05))',
        cursor: 'pointer', textAlign: 'left', font: 'inherit',
        opacity: item.isRead ? 0.55 : 1,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ flex: '0 1 280px', minWidth: 0, fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.title}
      </div>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: src.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.55rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
        {src.initials}
      </div>
      <div style={{ flex: 1, fontSize: '0.72rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.body?.slice(0, 80) || ''}
      </div>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
        {ageLabel(item.created_at)}
      </span>
    </button>
  )
}
