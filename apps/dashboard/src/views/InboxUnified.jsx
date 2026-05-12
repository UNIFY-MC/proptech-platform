// InboxUnified — /inbox revisitado em estilo CookAI (Sprint B Fase B3)
// Tabs: All | Approvals | Insights | Missions | Social + AskAnythingBar bottom

import { useState, useMemo } from 'react'
import { useInboxItems, useApprovals } from '../hooks/useSupabase'
import { useInboxReads } from '../hooks/useInboxReads'
import { useVerticalStore } from '../store'
import { useApprovalActions } from '../hooks/useApprovalActions'
import { useDrawer } from '../context/DrawerContext'
import InboxItemDrawer from '../components/inbox/InboxItemDrawer'
import AskAnythingBar from '../components/inbox/AskAnythingBar.jsx'

const TABS = [
  { id: 'all',       label: 'All',       accent: 'var(--text)' },
  { id: 'approvals', label: 'Approvals', accent: 'var(--warning)' },
  { id: 'insights',  label: 'Insights',  accent: 'var(--info)' },
  { id: 'missions',  label: 'Missions',  accent: 'var(--success)' },
  { id: 'social',    label: 'Social',    accent: 'var(--purple)' },
]

function ageLabel(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function InboxUnified() {
  const [tab, setTab] = useState('all')
  const { activeVertical } = useVerticalStore()
  const { items: inboxItems } = useInboxItems(activeVertical)
  const { approvals } = useApprovals(activeVertical)
  const { readSet, markAsRead } = useInboxReads()
  const { approveItem, rejectItem } = useApprovalActions()
  const { openDrawer, closeDrawer } = useDrawer()

  const allItems = useMemo(() => {
    const out = []
    for (const it of inboxItems) {
      out.push({
        kind: 'inbox', id: 'i_' + it.id,
        source: it.source, vertical: it.vertical, type: it.item_type,
        title: it.title, body: it.body, created_at: it.created_at,
        raw: it, isRead: readSet.has(it.id),
        severity: it.payload?.severity ?? 'info',
      })
    }
    for (const ap of approvals) {
      out.push({
        kind: 'approval', id: 'a_' + ap.id,
        source: ap.source_agent, vertical: ap.target_vertical, type: ap.action_type,
        title: `${ap.source_agent} · ${ap.action_type}`,
        body: ap.edited_message || ap.draft_message,
        created_at: ap.created_at, raw: ap,
        isRead: ap.status !== 'pending', severity: 'warning',
      })
    }
    out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return out
  }, [inboxItems, approvals, readSet])

  const filtered = useMemo(() => {
    switch (tab) {
      case 'all':       return allItems
      case 'approvals': return allItems.filter(i => i.kind === 'approval')
      case 'insights':  return allItems.filter(i => i.kind === 'inbox' && ['watcher','agent'].includes(i.source))
      case 'missions':  return allItems.filter(i => i.kind === 'inbox' && ['daily_roundup','audit_report'].includes(i.type))
      case 'social':    return allItems.filter(i => i.kind === 'inbox' && i.type === 'social_digest')
      default: return allItems
    }
  }, [allItems, tab])

  const counts = useMemo(() => ({
    all:       allItems.length,
    approvals: allItems.filter(i => i.kind === 'approval').length,
    insights:  allItems.filter(i => i.kind === 'inbox' && ['watcher','agent'].includes(i.source)).length,
    missions:  allItems.filter(i => i.kind === 'inbox' && ['daily_roundup','audit_report'].includes(i.type)).length,
    social:    allItems.filter(i => i.kind === 'inbox' && i.type === 'social_digest').length,
  }), [allItems])

  const unreadCount = allItems.filter(i => !i.isRead).length

  function openItem(item) {
    if (item.kind === 'inbox') {
      openDrawer(item.title, `${item.vertical ?? 'global'} · ${item.type} · ${item.source}`,
        <InboxItemDrawer item={item.raw} isRead={item.isRead}
          onMarkRead={async () => { await markAsRead(item.raw.id); closeDrawer() }}
          onMarkUnread={() => {}} onClose={closeDrawer} />)
    } else {
      openDrawer(item.title, `${item.vertical ?? 'global'} · approval ${item.raw.status}`, (
        <div style={{ padding: 16 }}>
          <div style={{
            fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', padding: 12,
            background: 'var(--bg-card)', borderRadius: 6,
            border: '1px solid var(--border)', marginBottom: 14,
          }}>{item.body || '(sem mensagem)'}</div>
          {item.raw.classification && Object.keys(item.raw.classification).length > 0 && (
            <pre style={{
              fontSize: '0.7rem', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 4, padding: 8,
              whiteSpace: 'pre-wrap', color: 'var(--text-dim)', marginBottom: 14,
            }}>{JSON.stringify(item.raw.classification, null, 2)}</pre>
          )}
          {item.raw.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => approveItem(item.raw.id).then(closeDrawer)} style={btnPrimary}>Aprovar</button>
              <button onClick={() => rejectItem(item.raw.id).then(closeDrawer)} style={btnDanger}>Rejeitar</button>
            </div>
          )}
        </div>
      ))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Inbox</h1>
        {unreadCount > 0 && (
          <span style={{
            background: 'var(--primary)', color: '#fff',
            borderRadius: 99, padding: '2px 8px',
            fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
          }}>{unreadCount} novos</span>
        )}
        <span style={{ color: 'var(--text-dim)', fontSize: 13, marginLeft: 'auto' }}>
          {filtered.length} de {allItems.length}
        </span>
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        borderBottom: '1px solid var(--border)', overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600,
              color: tab === t.id ? t.accent : 'var(--text-dim)',
              borderBottom: tab === t.id ? `2px solid ${t.accent}` : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap',
            }}>
            {t.label}
            <span style={{
              marginLeft: 6, fontSize: '0.62rem',
              color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace',
            }}>{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            color: 'var(--text-dim)', fontSize: '0.78rem',
          }}>
            {tab === 'social' ? 'Sem digests sociais. Watcher Meta/X virá Sprint C.' : 'Sem items nesta tab.'}
          </div>
        )}

        {filtered.map(item => (
          <div key={item.id} onClick={() => openItem(item)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${tabAccentFor(item)}`,
              borderRadius: 6, marginBottom: 6,
              cursor: 'pointer', opacity: item.isRead ? 0.65 : 1,
            }}>
            <span style={{
              fontSize: '0.55rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: item.kind === 'approval' ? 'var(--warning)' : 'var(--info)',
              padding: '2px 6px', borderRadius: 3,
              background: 'var(--bg-elevated)',
              textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
            }}>{item.kind === 'approval' ? 'APPROVAL' : item.source}</span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{item.title}</div>
              {item.body && (
                <div style={{
                  fontSize: '0.68rem', color: 'var(--text-dim)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginTop: 2,
                }}>{item.body.slice(0, 120)}</div>
              )}
            </div>

            <span style={{
              fontSize: '0.55rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: severityColor(item.severity),
              padding: '2px 6px', borderRadius: 3,
              background: 'var(--bg-elevated)', flexShrink: 0,
            }}>{(item.type || '').toUpperCase().slice(0, 12)}</span>

            <span style={{
              fontSize: '0.62rem', color: 'var(--text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
              width: 32, textAlign: 'right', flexShrink: 0,
            }}>{ageLabel(item.created_at)}</span>
          </div>
        ))}
      </div>

      <AskAnythingBar />
    </div>
  )
}

function tabAccentFor(item) {
  if (item.kind === 'approval') return 'var(--warning)'
  if (item.severity === 'critical') return 'var(--danger)'
  if (['watcher','agent'].includes(item.source)) return 'var(--info)'
  if (['daily_roundup','audit_report'].includes(item.type)) return 'var(--success)'
  return 'var(--text-dim)'
}

function severityColor(sev) {
  if (sev === 'critical') return 'var(--danger)'
  if (sev === 'warning') return 'var(--warning)'
  return 'var(--text-dim)'
}

const btnBase = {
  padding: '7px 14px', borderRadius: 5,
  fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', border: 'none',
}
const btnPrimary = { ...btnBase, background: 'var(--primary)', color: '#fff' }
const btnDanger = { ...btnBase, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }
