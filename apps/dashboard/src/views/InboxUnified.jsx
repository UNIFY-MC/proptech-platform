// InboxUnified — /inbox em estilo CookAI v2
// Layout: greeting + stats · Daily Roundup card destacado · feed agrupado por dia · AskAnythingBar bottom
//
// Replica fielmente CookAI:
//   - "Welcome back, {primeiro_nome}" + "X messages to see, Y missions complete"
//   - Daily Roundup card highlighted no topo com check-list de action items
//   - "All ⌄" filter dropdown + "Configure Feed" button
//   - Feed: "Today {count}" header + items com author avatar + badge type + age
//   - Bottom: AskAnythingBar (já existe)

import { useState, useMemo } from 'react'
import { Sparkles, Lightbulb, Sliders, X, ChevronDown, History } from 'lucide-react'
import { useInboxItems, useApprovals } from '../hooks/useSupabase'
import { useInboxReads } from '../hooks/useInboxReads'
import { useVerticalStore } from '../store'
import { useApprovalActions } from '../hooks/useApprovalActions'
import { useUserContext } from '../hooks/useUserContext.js'
import { useWatcherProfiles } from '../hooks/useWatcherProfiles.js'
import { useDrawer } from '../context/DrawerContext'
import InboxItemDrawer from '../components/inbox/InboxItemDrawer'
import AskAnythingBar from '../components/inbox/AskAnythingBar.jsx'
import ExpandableInboxRow from '../components/inbox/ExpandableInboxRow.jsx'
import ConfigureFeedDrawerInner from '../components/inbox/ConfigureFeedDrawer.jsx'
import CreateTaskFromInboxModal from '../components/inbox/CreateTaskFromInboxModal.jsx'
import { useTasks } from '../hooks/useTasks.js'
import { useNavigate } from 'react-router-dom'

const FILTER_OPTIONS = [
  { id: 'all',       label: 'All' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'insights',  label: 'Insights' },
  { id: 'missions',  label: 'Missions' },
  { id: 'social',    label: 'Social' },
]

// Source → cor + abreviatura para avatar
const SOURCE_META = {
  bia:            { color: '#534AB7', initials: 'B',  label: 'Bia' },
  watcher:        { color: '#3b82f6', initials: 'W',  label: 'Watcher' },
  agent:          { color: '#10b981', initials: 'AG', label: 'Agent' },
  manual:         { color: '#6b7280', initials: 'M',  label: 'Manual' },
  system:         { color: '#6b7280', initials: 'SY', label: 'System' },
  casa_advisor:   { color: '#06b6d4', initials: 'CA', label: 'Casa Advisor' },
  image_inspector:{ color: '#a855f7', initials: 'IM', label: 'Image' },
}

const TYPE_BADGE = {
  daily_roundup: { bg: '#10b98122', color: '#10b981', label: 'ROUNDUP' },
  alert:         { bg: '#ef444422', color: '#ef4444', label: 'ALERT' },
  escalation:    { bg: '#f59e0b22', color: '#f59e0b', label: 'ESCALATION' },
  new_pedido:    { bg: '#3b82f622', color: '#3b82f6', label: 'PEDIDO' },
  audit_report:  { bg: '#a855f722', color: '#a855f7', label: 'AUDIT' },
  insight:       { bg: '#fde04722', color: '#fde047', label: 'INSIGHT' },
  social_digest: { bg: '#a855f722', color: '#a855f7', label: 'SOCIAL' },
  system:        { bg: '#6b728022', color: '#9ca3af', label: 'SYSTEM' },
}

function ageLabel(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function isToday(iso) {
  const d = new Date(iso); const now = new Date()
  return d.toDateString() === now.toDateString()
}

export default function InboxUnified() {
  const [filter, setFilter] = useState('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showConfigureFeed, setShowConfigureFeed] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [dismissedRoundupIds, setDismissedRoundupIds] = useState(() =>
    new Set(JSON.parse(localStorage.getItem('cc:dismissed-roundups') ?? '[]'))
  )

  const { activeVertical } = useVerticalStore()
  // No Inbox vemos tudo (cross-vertical) — filtro por vertical fica na app de cada vertical
  const inboxFilter = activeVertical === 'all' ? null : null
  const { items: inboxItems } = useInboxItems(inboxFilter)
  const { approvals } = useApprovals(inboxFilter)
  const { readSet, markAsRead } = useInboxReads()
  const { approveItem, rejectItem } = useApprovalActions()
  const { openDrawer, closeDrawer } = useDrawer()
  const { primeiroNome, stats } = useUserContext()
  const { bySlug: watcherBySlug } = useWatcherProfiles()
  const navigate = useNavigate()
  const [taskModalState, setTaskModalState] = useState(null)  // { kind, item, suggestion }

  function handleCreateTask({ kind, item, suggestion }) {
    setTaskModalState({ kind, item, suggestion })
  }

  // Daily Roundup mais recente (não dismissed)
  const todayRoundup = useMemo(() => {
    return inboxItems
      .filter(i => i.item_type === 'daily_roundup'
                && isToday(i.created_at)
                && !dismissedRoundupIds.has(i.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  }, [inboxItems, dismissedRoundupIds])

  function dismissRoundup(id) {
    const next = new Set([...dismissedRoundupIds, id])
    setDismissedRoundupIds(next)
    localStorage.setItem('cc:dismissed-roundups', JSON.stringify([...next]))
  }

  // Items unificados (excluindo o roundup destacado para não duplicar)
  const allItems = useMemo(() => {
    const out = []
    for (const it of inboxItems) {
      if (todayRoundup && it.id === todayRoundup.id) continue
      const watcherSlug = it.payload?.watcher_slug
      const watcher = watcherSlug ? watcherBySlug[watcherSlug] : null
      out.push({
        kind: 'inbox', id: 'i_' + it.id,
        source: it.source, vertical: it.vertical, type: it.item_type,
        title: it.title, body: it.body, created_at: it.created_at,
        raw: it, isRead: readSet.has(it.id),
        severity: it.payload?.severity ?? 'info',
        watcher,    // { name, role, photo_url } ou null
      })
    }
    for (const ap of approvals) {
      const watcher = watcherBySlug[`${ap.source_agent}-prata`] || watcherBySlug[ap.source_agent] || null
      out.push({
        kind: 'approval', id: 'a_' + ap.id,
        source: ap.source_agent, vertical: ap.target_vertical, type: ap.action_type,
        title: `${ap.source_agent} · ${ap.action_type}`,
        body: ap.edited_message || ap.draft_message,
        created_at: ap.created_at, raw: ap,
        isRead: ap.status !== 'pending', severity: 'warning',
        watcher,
      })
    }
    out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return out
  }, [inboxItems, approvals, readSet, todayRoundup, watcherBySlug])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'all':       return allItems
      case 'approvals': return allItems.filter(i => i.kind === 'approval')
      case 'insights':  return allItems.filter(i => i.kind === 'inbox' && ['watcher','agent'].includes(i.source))
      case 'missions':  return allItems.filter(i => i.kind === 'inbox' && ['daily_roundup','audit_report'].includes(i.type))
      case 'social':    return allItems.filter(i => i.kind === 'inbox' && i.type === 'social_digest')
      default: return allItems
    }
  }, [allItems, filter])

  // Group by day section
  const groups = useMemo(() => {
    const today = []
    const earlier = []
    for (const item of filtered) {
      if (isToday(item.created_at)) today.push(item)
      else earlier.push(item)
    }
    return { today, earlier }
  }, [filtered])

  const unread = allItems.filter(i => !i.isRead).length

  function openItem(item) {
    if (item.kind === 'inbox') {
      openDrawer(item.title, `${item.vertical ?? 'global'} · ${item.type} · ${item.source}`,
        <InboxItemDrawer item={item.raw} isRead={item.isRead}
          onMarkRead={async () => { await markAsRead(item.raw.id); closeDrawer() }}
          onMarkUnread={() => {}} onClose={closeDrawer} />)
    } else {
      openDrawer(item.title, `${item.vertical ?? 'global'} · approval ${item.raw.status}`, (
        <ApprovalQuickDrawer
          approval={item.raw}
          onApprove={() => approveItem(item.raw.id).then(closeDrawer)}
          onReject={() => rejectItem(item.raw.id).then(closeDrawer)}
        />
      ))
    }
  }

  const activeFilterLabel = FILTER_OPTIONS.find(o => o.id === filter)?.label ?? 'All'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 40px)',
      maxWidth: 920, margin: '0 auto',
      paddingBottom: 20,
    }}>
      {/* Header — greeting + stats + actions */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, padding: '14px 0 24px', flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)',
          }}>
            Bem-vindo{primeiroNome ? `, ${primeiroNome}` : ''}
          </h1>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            {unread} {unread === 1 ? 'mensagem por ler' : 'mensagens por ler'},{' '}
            {stats.missionsComplete} {stats.missionsComplete === 1 ? 'missão completa' : 'missões completas'} (24h)
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Filter dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowFilterMenu(s => !s)} style={pillBtn}>
              {activeFilterLabel}
              <ChevronDown size={13} style={{ color: 'var(--text-dim)' }} />
            </button>
            {showFilterMenu && (
              <div style={dropdownStyle}>
                {FILTER_OPTIONS.map(o => (
                  <button key={o.id} onClick={() => { setFilter(o.id); setShowFilterMenu(false) }}
                    style={{
                      ...dropdownItem,
                      background: o.id === filter ? 'var(--bg-elevated)' : 'transparent',
                      fontWeight: o.id === filter ? 600 : 400,
                    }}>{o.label}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowHistory(true)} style={pillBtn} title="Roundups anteriores">
            <History size={12} />
            <span>Histórico</span>
          </button>
          <button onClick={() => setShowConfigureFeed(s => !s)} style={pillBtnDark}>
            <Sliders size={12} />
            <span>Configure Feed</span>
          </button>
        </div>
      </div>

      {/* Daily Roundup card destacado */}
      {todayRoundup && (
        <DailyRoundupCard
          item={todayRoundup}
          onDismiss={() => dismissRoundup(todayRoundup.id)}
        />
      )}

      {/* Feed by day section */}
      <div style={{ flex: 1, marginTop: 24 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            color: 'var(--text-dim)', fontSize: '0.85rem',
          }}>
            {filter === 'social'
              ? 'Sem digests sociais. Watcher Meta/X virá Sprint próximo.'
              : 'Sem items nesta vista.'}
          </div>
        )}

        {groups.today.length > 0 && (
          <DaySection label="Hoje" count={groups.today.length}>
            {groups.today.map(item => (
              <ExpandableInboxRow
                key={item.id}
                item={item}
                onClickLegacy={openItem}
                onMarkRead={async (id) => { await markAsRead(id) }}
                onArchive={() => { /* refresh via realtime */ }}
                onCreateTask={handleCreateTask}
              />
            ))}
          </DaySection>
        )}
        {groups.earlier.length > 0 && (
          <DaySection label="Anterior" count={groups.earlier.length}>
            {groups.earlier.map(item => (
              <ExpandableInboxRow
                key={item.id}
                item={item}
                onClickLegacy={openItem}
                onMarkRead={async (id) => { await markAsRead(id) }}
                onArchive={() => {}}
                onCreateTask={handleCreateTask}
              />
            ))}
          </DaySection>
        )}
      </div>

      {/* Bottom AskAnythingBar */}
      <AskAnythingBar />

      {/* Configure Feed drawer (placeholder) */}
      {showConfigureFeed && (
        <ConfigureFeedDrawer onClose={() => setShowConfigureFeed(false)} />
      )}

      {/* Histórico de roundups */}
      {showHistory && (
        <RoundupHistoryDrawer
          roundups={inboxItems.filter(i => i.kind === 'roundup' || i.item_type === 'daily_roundup')}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Modal criar task — substitui window.prompt antigo */}
      {taskModalState && (
        <CreateTaskFromInboxModal
          item={taskModalState.item}
          suggestion={taskModalState.suggestion}
          kind={taskModalState.kind}
          onClose={() => setTaskModalState(null)}
          onCreated={(taskId) => {
            setTaskModalState(null)
            // Toast: task criada com link para /tasks
            if (window.confirm('Task criada. Ir para /tasks?')) navigate('/tasks')
          }}
        />
      )}
    </div>
  )
}

// ─── Roundup History Drawer ──────────────────────────────────────────────────
function RoundupHistoryDrawer({ roundups, onClose }) {
  const sorted = useMemo(
    () => [...roundups].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [roundups]
  )
  const [selected, setSelected] = useState(sorted[0]?.id || null)
  const sel = sorted.find(r => r.id === selected) || sorted[0]

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 0,
        width: 'min(960px, 96vw)',
        height: 'min(640px, 88vh)',
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Lista lateral */}
        <div style={{
          width: 260, borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: '0.85rem', fontWeight: 700,
          }}>
            <History size={14} /> Roundups anteriores
            <span style={{
              marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 600,
              color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace',
            }}>{sorted.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sorted.map(r => {
              const date = new Date(r.created_at)
              const label = date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' })
              const isActive = r.id === sel?.id
              return (
                <button key={r.id} onClick={() => setSelected(r.id)} style={{
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '10px 14px', width: '100%',
                  background: isActive ? 'rgba(83,74,183,0.1)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.04))',
                  cursor: 'pointer', textAlign: 'left',
                  color: isActive ? 'var(--primary)' : 'var(--text)',
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                    {r.vertical ? r.vertical.toUpperCase() : 'Global'}
                  </div>
                </button>
              )
            })}
            {sorted.length === 0 && (
              <div style={{ padding: 20, color: 'var(--text-dim)', fontSize: '0.75rem', textAlign: 'center' }}>
                Sem roundups arquivados ainda. Voltar amanhã.
              </div>
            )}
          </div>
        </div>

        {/* Detalhe */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', position: 'relative' }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
          }}><X size={16} /></button>
          {sel ? <DailyRoundupCard item={sel} onDismiss={() => {}} /> : (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: 20 }}>
              Sem roundup seleccionado.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Roundup action item (checkbox persistido em localStorage) ──────────────
function RoundupAction({ itemId, idx, label }) {
  const storageKey = `roundup-check:${itemId}:${idx}`
  const initial = (() => { try { return localStorage.getItem(storageKey) === '1' } catch { return false } })()
  const [checked, setChecked] = useState(initial)
  function toggle() {
    const next = !checked
    setChecked(next)
    try { localStorage.setItem(storageKey, next ? '1' : '0') } catch {}
  }
  return (
    <label onClick={toggle} style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
      fontSize: '0.85rem',
      color: checked ? 'var(--text-dim)' : 'var(--text)',
      textDecoration: checked ? 'line-through' : 'none',
      lineHeight: 1.5, transition: 'background 0.1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <span style={{
        width: 16, height: 16, borderRadius: 4,
        border: '1.5px solid ' + (checked ? '#10b981' : 'var(--text-dim)'),
        background: checked ? '#10b981' : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2, transition: 'all 0.15s',
      }}>{checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}</span>
      <span>{label}</span>
    </label>
  )
}

// ─── Daily Roundup card ──────────────────────────────────────────────────────
function DailyRoundupCard({ item, onDismiss }) {
  // Payload novo (daily-roundup v2): executive_summary + top_actions[] + stats
  // Fallback: parse markdown legacy se payload incompleto
  const payload = item.payload || {}
  const execSummary = payload.executive_summary
  const topActions  = Array.isArray(payload.top_actions) ? payload.top_actions : []
  const summaryMd   = payload.summary_md || ''
  const generatedAt = payload.generated_at || item.created_at

  // Bullets legacy (markdown - [ ] ou - )
  const legacyBullets = useMemo(() => {
    if (topActions.length > 0) return []
    const lines = (item.body ?? summaryMd ?? '').split('\n')
    return lines
      .map(l => l.trim())
      .filter(l => l.match(/^[-*]\s+\[[ x]\]\s+/) || l.startsWith('- ') || l.startsWith('* '))
      .map(l => l.replace(/^[-*]\s+\[[ x]\]\s+/, '').replace(/^[-*]\s*/, ''))
      .slice(0, 5)
  }, [item.body, summaryMd, topActions.length])

  const bodyText = execSummary
    || ((item.body ?? '').split('\n').filter(l => {
        const t = l.trim()
        return t && !t.startsWith('-') && !t.startsWith('*') && !t.startsWith('#') && !t.startsWith('_')
      }).join(' '))

  const actions = topActions.length > 0 ? topActions : legacyBullets
  const stats = payload.stats || {}
  const itemId = item.id

  const dateLabel = new Date(generatedAt).toLocaleDateString('pt-PT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div style={{
      background: 'rgba(83, 74, 183, 0.05)',
      border: '1px solid rgba(83, 74, 183, 0.25)',
      borderRadius: 12, padding: '20px 24px',
      position: 'relative',
    }}>
      <button onClick={onDismiss} style={{
        position: 'absolute', top: 12, right: 12,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-dim)', padding: 4,
        display: 'flex', alignItems: 'center',
      }}>
        <X size={14} />
      </button>

      {/* Header com data */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 4,
      }}>
        <Sparkles size={16} color="var(--primary)" />
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
          Daily Roundup
        </span>
      </div>
      <div style={{
        fontSize: '0.7rem', color: 'var(--text-dim)',
        marginBottom: 14, paddingLeft: 24,
        textTransform: 'capitalize',
      }}>{dateLabel}</div>

      {/* Executive summary — texto completo, line-height generoso */}
      {bodyText && (
        <p style={{
          fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.65,
          margin: '0 0 18px',
        }}>{bodyText}</p>
      )}

      {/* Stats inline */}
      {Object.keys(stats).length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          marginBottom: 18,
        }}>
          {Object.entries(stats)
            .filter(([, v]) => Number(v) > 0)
            .slice(0, 6)
            .map(([k, v]) => (
              <span key={k} style={{
                fontSize: '0.65rem',
                fontFamily: 'JetBrains Mono, monospace',
                padding: '3px 8px',
                background: 'var(--bg-elevated)',
                color: 'var(--text)',
                borderRadius: 4,
                fontWeight: 600,
              }}>
                <span style={{ opacity: 0.6 }}>{k.replace(/_/g, ' ')}</span>{' '}
                <span style={{ color: 'var(--primary)' }}>{typeof v === 'number' ? v : String(v)}</span>
              </span>
            ))}
        </div>
      )}

      {/* Top actions / checklist */}
      {actions.length > 0 && (
        <div>
          <div style={{
            fontSize: '0.6rem', fontWeight: 700,
            color: 'var(--text-dim)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 10,
          }}>Top acções</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {actions.map((b, i) => <RoundupAction key={i} itemId={itemId} idx={i} label={b} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Day section ─────────────────────────────────────────────────────────────
function DaySection({ label, count, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        fontSize: '0.72rem', color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        padding: '6px 0 10px',
      }}>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Feed row ────────────────────────────────────────────────────────────────
function FeedRow({ item, onClick }) {
  const src = SOURCE_META[item.source] || SOURCE_META.system
  const isApproval = item.kind === 'approval'
  const badgeType = isApproval ? null : (TYPE_BADGE[item.type] || TYPE_BADGE.system)
  const watcher = item.watcher
  const authorName = watcher?.name || src.label
  const authorPhoto = watcher?.photo_url || null

  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', width: '100%',
        background: 'transparent', border: 'none',
        borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.05))',
        cursor: 'pointer', textAlign: 'left',
        font: 'inherit', color: 'inherit',
        opacity: item.isRead ? 0.55 : 1,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>

      {/* Indicador icon (lightbulb se insight, sparkle se daily) */}
      <div style={{ flexShrink: 0, width: 16, display: 'flex', justifyContent: 'center' }}>
        {item.type === 'daily_roundup'
          ? <Sparkles size={13} color="var(--primary)" />
          : item.source === 'watcher'
            ? <Lightbulb size={13} color="#fde047" />
            : null}
      </div>

      {/* Title — primary */}
      <div style={{
        flex: '0 1 280px', minWidth: 0,
        fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{item.title}</div>

      {/* Author avatar (real photo se watcher tem) + name */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flex: '0 0 auto', maxWidth: 200,
      }}>
        {authorPhoto ? (
          <img src={authorPhoto} alt={authorName}
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              border: '1px solid var(--border)',
            }} />
        ) : (
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: src.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.55rem', fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
          }}>{src.initials}</div>
        )}
        <span style={{
          fontSize: '0.72rem', color: 'var(--text-dim)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{authorName}</span>
      </div>

      {/* Body snippet */}
      <div style={{
        flex: 1, minWidth: 0,
        fontSize: '0.72rem', color: 'var(--text-dim)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{item.body?.slice(0, 80) ?? ''}</div>

      {/* Badge type */}
      {badgeType && (
        <span style={{
          flexShrink: 0,
          padding: '2px 7px', borderRadius: 3,
          fontSize: '0.52rem', fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          background: badgeType.bg, color: badgeType.color,
          letterSpacing: '0.06em',
        }}>{badgeType.label}</span>
      )}

      {isApproval && (
        <span style={{
          flexShrink: 0,
          padding: '2px 7px', borderRadius: 3,
          fontSize: '0.52rem', fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          background: '#f59e0b22', color: '#f59e0b',
          letterSpacing: '0.06em',
        }}>APPROVAL</span>
      )}

      {/* Age */}
      <span style={{
        flexShrink: 0, minWidth: 60, textAlign: 'right',
        fontSize: '0.65rem', color: 'var(--text-dim)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>{ageLabel(item.created_at)}</span>
    </button>
  )
}

// ─── Approval quick drawer ───────────────────────────────────────────────────
function ApprovalQuickDrawer({ approval, onApprove, onReject }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{
        fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.6,
        whiteSpace: 'pre-wrap', padding: 12,
        background: 'var(--bg-card)', borderRadius: 6,
        border: '1px solid var(--border)', marginBottom: 14,
      }}>{approval.edited_message || approval.draft_message || '(sem mensagem)'}</div>
      {approval.classification && Object.keys(approval.classification).length > 0 && (
        <pre style={{
          fontSize: '0.7rem', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 4, padding: 8,
          whiteSpace: 'pre-wrap', color: 'var(--text-dim)', marginBottom: 14,
        }}>{JSON.stringify(approval.classification, null, 2)}</pre>
      )}
      {approval.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onApprove} style={btnPrimary}>Aprovar</button>
          <button onClick={onReject} style={btnDanger}>Rejeitar</button>
        </div>
      )}
    </div>
  )
}

// ─── Configure Feed drawer (placeholder) ────────────────────────────────────
function ConfigureFeedDrawer({ onClose }) {
  return <ConfigureFeedDrawerInner onClose={onClose} />
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const pillBtn = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 99, padding: '6px 12px',
  display: 'flex', alignItems: 'center', gap: 6,
  cursor: 'pointer', font: 'inherit',
  fontSize: '0.74rem', color: 'var(--text)',
}
const pillBtnDark = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 99, padding: '6px 14px',
  display: 'flex', alignItems: 'center', gap: 8,
  cursor: 'pointer', font: 'inherit',
  fontSize: '0.74rem', color: 'var(--text)',
  fontWeight: 500,
}
const dropdownStyle = {
  position: 'absolute', top: '110%', right: 0,
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: 4, minWidth: 140,
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  zIndex: 10, display: 'flex', flexDirection: 'column',
}
const dropdownItem = {
  textAlign: 'left', background: 'transparent', border: 'none',
  borderRadius: 5, padding: '7px 10px', cursor: 'pointer',
  font: 'inherit', color: 'var(--text)', fontSize: '0.74rem',
}
const btnBase = {
  padding: '7px 14px', borderRadius: 5, fontSize: '0.74rem',
  fontWeight: 600, cursor: 'pointer', border: 'none',
}
const btnPrimary = { ...btnBase, background: 'var(--primary)', color: '#fff' }
const btnDanger = { ...btnBase, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }
