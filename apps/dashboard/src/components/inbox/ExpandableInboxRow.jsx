// ExpandableInboxRow — substitui FeedRow com expansão DROPDOWN inline abaixo
// Estilo CookAI/Cook.ai: row clica → expande card grande com:
//   1. External embed (image/tweet preview + likes/replies/copy)
//   2. "Why it matters" — análise IA do conteúdo
//   3. "From <author>" — atribuição
//   4. "SUGGESTED MISSION" — sugestão de task
//   5. Botões "Create task" (primário grande) + "Dismiss"

import { useState, useMemo } from 'react'
import { Sparkles, Lightbulb, ChevronDown, ChevronUp, ExternalLink, Heart, MessageCircle, Link as LinkIcon } from 'lucide-react'

const SOURCE_META = {
  bia:             { color: '#534AB7', initials: 'B',  label: 'Bia' },
  watcher:         { color: '#3b82f6', initials: 'W',  label: 'Watcher' },
  agent:           { color: '#10b981', initials: 'AG', label: 'Agent' },
  manual:          { color: '#6b7280', initials: 'M',  label: 'Manual' },
  system:          { color: '#6b7280', initials: 'SY', label: 'System' },
}

const KIND_BADGE = {
  roundup:    { bg: '#10b98122', color: '#10b981', label: 'ROUNDUP' },
  news:       { bg: '#3b82f622', color: '#3b82f6', label: 'NEWS' },
  instagram:  { bg: '#ec489922', color: '#ec4899', label: 'INSTAGRAM' },
  competitor: { bg: '#ef444422', color: '#ef4444', label: 'COMP' },
  op:         { bg: '#6b728022', color: '#9ca3af', label: 'OP' },
  alert:      { bg: '#ef444422', color: '#ef4444', label: 'ALERT' },
  task:       { bg: '#8b5cf622', color: '#8b5cf6', label: 'TASK' },
  mention:    { bg: '#f59e0b22', color: '#f59e0b', label: 'MENTION' },
  insight:    { bg: '#fde04722', color: '#fde047', label: 'INSIGHT' },
}

function ageLabel(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Checkbox interactivo persistido em localStorage por itemId+lineIdx
function InteractiveCheckbox({ itemId, lineIdx, defaultChecked, label }) {
  const storageKey = `roundup-check:${itemId}:${lineIdx}`
  const initial = (() => {
    try { return localStorage.getItem(storageKey) === '1' || defaultChecked } catch { return defaultChecked }
  })()
  const [checked, setChecked] = useState(initial)
  function toggle() {
    const next = !checked
    setChecked(next)
    try { localStorage.setItem(storageKey, next ? '1' : '0') } catch {}
  }
  return (
    <label style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '6px 8px',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: '0.82rem',
      color: checked ? 'var(--text-dim)' : 'var(--text)',
      textDecoration: checked ? 'line-through' : 'none',
      lineHeight: 1.5,
      transition: 'background 0.1s',
    }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
       onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <span style={{
        width: 16, height: 16, borderRadius: 4,
        border: '1.5px solid ' + (checked ? '#10b981' : 'var(--text-dim)'),
        background: checked ? '#10b981' : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2,
        transition: 'all 0.15s',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={toggle} style={{ display: 'none' }} />
      <span dangerouslySetInnerHTML={{ __html: label.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
    </label>
  )
}

function renderMd(md, itemId) {
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
    // Checkbox interactivo: - [ ] ou - [x]
    const cb = t.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/)
    if (cb) {
      out.push(<InteractiveCheckbox key={key} itemId={itemId} lineIdx={key} defaultChecked={cb[1].toLowerCase() === 'x'} label={cb[2]} />)
      key++
      continue
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

  const kind = item.raw?.kind
  const isNewKind = kind && KIND_BADGE[kind]
  const expandable = item.raw?.expandable === true || isNewKind

  if (!expandable) {
    return <LegacyRow item={item} onClick={() => onClickLegacy(item)} />
  }

  const src = SOURCE_META[item.source] || SOURCE_META.system
  const badge = KIND_BADGE[kind] || KIND_BADGE.op
  const payload = item.raw?.payload || {}
  const watcher = item.watcher
  const authorName = payload.author || watcher?.name || payload.source || src.label
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
          background: open ? 'transparent' : 'transparent',
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
            : kind === 'news' || kind === 'instagram' || kind === 'insight'
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
              {(payload.author || '').slice(0, 1).toUpperCase() || src.initials}
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
        <ExpandedCard
          item={item}
          payload={payload}
          kind={kind}
          authorName={authorName}
          onArchive={() => onArchive?.(item.raw.id)}
          onCreateTask={onCreateTask}
        />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// ExpandedCard — replica layout CookAI screenshot:
//   1) External embed (image/tweet) com interactions
//   2) "Why it matters" panel
//   3) "From <author>" line
//   4) "SUGGESTED MISSION" + create task button
// ───────────────────────────────────────────────────────────────
function ExpandedCard({ item, payload, kind, authorName, onArchive, onCreateTask }) {
  const imageUrl = payload.image_url || payload.image
  const summary = payload.summary_md || payload.content_md || item.body || ''
  const whyItMatters = payload.why_it_matters || payload.analysis || null
  const suggestedMission = payload.suggested_mission || (kind === 'instagram' || kind === 'news' ? deriveSuggestion(payload, kind) : null)
  const stats = payload.stats
  const engagement = payload.engagement  // { likes, replies, replies_url }
  const isPostLike = kind === 'instagram' || kind === 'news' || kind === 'competitor'

  const Md = useMemo(() => renderMd(summary), [summary])

  return (
    <div style={{
      padding: '4px 14px 18px',
      background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 720, margin: '0 auto',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* 1. External post embed (image / tweet card) */}
        {(imageUrl || isPostLike) && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {imageUrl && (
              <img
                src={imageUrl}
                alt={payload.title || authorName}
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
                style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }}
              />
            )}
            {(payload.caption || payload.title) && (
              <div style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5 }}>
                {payload.caption || payload.title}
              </div>
            )}

            {/* Footer com timestamp + engagement */}
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
            }}>
              {payload.published_at && (
                <span>{new Date(payload.published_at).toLocaleString('pt-PT', {
                  hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric',
                })}</span>
              )}
              <div style={{ flex: 1 }} />
              {engagement?.likes != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Heart size={11} color="#ec4899" fill="#ec4899" /> {formatCount(engagement.likes)}
                </span>
              )}
              {engagement?.replies != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MessageCircle size={11} /> {formatCount(engagement.replies)}
                </span>
              )}
              {item.raw?.source_url && (
                <a href={item.raw.source_url} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--info)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <LinkIcon size={11} /> Copy link
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stats grid se for roundup */}
        {kind === 'roundup' && stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 8,
          }}>
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} style={{
                padding: '10px 12px',
                background: 'var(--bg-card)',
                borderRadius: 6,
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                  {k.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
                  {typeof v === 'number' ? v.toLocaleString('pt-PT') : String(v)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Markdown body se não é post-like (roundup, op, alert) */}
        {!isPostLike && Md && <div>{Md}</div>}

        {/* 2. Why it matters — análise */}
        {whyItMatters && (
          <div style={{
            background: 'var(--bg-card)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '0 8px 8px 0',
            padding: '12px 16px',
          }}>
            <div style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              color: '#f59e0b',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}>Why it matters</div>
            <p style={{
              margin: 0,
              fontSize: '0.82rem',
              color: 'var(--text)',
              lineHeight: 1.55,
            }}>{whyItMatters}</p>
          </div>
        )}

        {/* 3. From author */}
        {authorName && isPostLike && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text)',
              fontSize: '0.55rem', fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
            }}>{authorName.slice(0, 1).toUpperCase()}</div>
            <span>From <strong style={{ color: 'var(--text)' }}>{authorName}</strong></span>
          </div>
        )}

        {/* 4. Suggested mission + CTA */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {suggestedMission && (
            <>
              <div style={{
                fontSize: '0.6rem', fontWeight: 700,
                color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Suggested mission</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
                {suggestedMission}
              </div>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: suggestedMission ? 4 : 0 }}>
            <button
              onClick={() => onCreateTask?.({ kind: 'employee', item, suggestion: suggestedMission })}
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >Create task</button>
            <button
              onClick={() => onCreateTask?.({ kind: 'idea', item, suggestion: suggestedMission })}
              style={{
                background: 'transparent',
                color: 'var(--text-dim)',
                border: '1px solid var(--border)',
                padding: '8px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.74rem',
                fontWeight: 500,
              }}
            >+ Ideia</button>
            <div style={{ flex: 1 }} />
            <button
              onClick={onArchive}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.72rem',
              }}
            >Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCount(n) {
  if (n == null) return ''
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K'
  return n.toString()
}

// Sugere uma mission a partir do payload (para news/instagram sem suggested_mission no payload)
function deriveSuggestion(payload, kind) {
  if (kind === 'instagram') return 'Analisar post + adaptar para conteúdo nosso'
  if (kind === 'news')      return 'Avaliar impacto + position statement'
  if (kind === 'competitor')return 'Diff vs concorrente + plano de resposta'
  return null
}

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
