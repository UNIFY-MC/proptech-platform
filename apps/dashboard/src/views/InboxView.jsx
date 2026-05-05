import { useInboxItems } from '../hooks/useSupabase'
import { useInboxReads } from '../hooks/useInboxReads'
import { useVerticalStore } from '../store'
import { useDrawer } from '../context/DrawerContext'
import InboxItemCard from '../components/inbox/InboxItemCard'
import InboxItemDrawer from '../components/inbox/InboxItemDrawer'

export default function InboxView() {
  const { activeVertical } = useVerticalStore()
  const { items, loading, error } = useInboxItems(activeVertical)
  const { readSet, markAsRead, markAsUnread } = useInboxReads()
  const { openDrawer, closeDrawer } = useDrawer()

  // Sort: não lidos primeiro, depois por created_at DESC
  const sorted = [...items].sort((a, b) => {
    const aRead = readSet.has(a.id)
    const bRead = readSet.has(b.id)
    if (aRead !== bRead) return aRead ? 1 : -1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const unreadCount = items.filter(i => !readSet.has(i.id)).length

  function openItemDrawer(item) {
    const isRead = readSet.has(item.id)
    openDrawer(
      item.title,
      `${item.vertical ?? 'global'} · ${item.item_type} · ${item.source}`,
      <InboxItemDrawer
        item={item}
        isRead={isRead}
        onMarkRead={async () => { await markAsRead(item.id); closeDrawer() }}
        onMarkUnread={() => markAsUnread(item.id)}
        onClose={closeDrawer}
      />
    )
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1>Inbox</h1>
        {unreadCount > 0 && (
          <span style={{
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: 99,
            padding: '2px 8px',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
          }}>
            {unreadCount} não lidos
          </span>
        )}
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {items.length} total
        </span>
      </div>

      {/* Skeleton de carregamento */}
      {loading && (
        <div>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                height: 60,
                background: 'var(--bg-card)',
                borderRadius: 6,
                marginBottom: 8,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: 16,
          color: 'var(--danger)',
        }}>
          Erro ao carregar inbox: {error}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#128237;</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Sem items na inbox para esta vertical.</div>
          <div style={{ fontSize: 13 }}>Aparecem aqui notificações de watchers e agents.</div>
        </div>
      )}

      {/* Lista */}
      {!loading && sorted.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          {sorted.map(item => (
            <InboxItemCard
              key={item.id}
              item={item}
              isRead={readSet.has(item.id)}
              onClick={() => openItemDrawer(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
