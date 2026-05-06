// item_type badge colors — aligned with real schema check constraint values:
// daily_roundup | alert | escalation | new_pedido | audit_report | system

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const TYPE_STYLE = {
  alert: {
    background: 'rgba(239,68,68,0.15)',
    color: 'var(--danger)',
  },
  escalation: {
    background: 'rgba(245,158,11,0.15)',
    color: 'var(--warning)',
  },
  daily_roundup: {
    background: 'rgba(83,74,183,0.15)',
    color: 'var(--primary)',
  },
  audit_report: {
    background: 'rgba(59,130,246,0.15)',
    color: 'var(--info)',
  },
  new_pedido: {
    background: 'rgba(16,185,129,0.15)',
    color: 'var(--success)',
  },
  system: {
    background: 'rgba(107,114,128,0.15)',
    color: 'var(--text-dim)',
  },
}

function getTypeStyle(itemType) {
  return TYPE_STYLE[itemType] ?? TYPE_STYLE.system
}

export default function InboxItemCard({ item, isRead, onClick }) {
  const typeStyle = getTypeStyle(item.item_type)

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        background: 'transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {/* Unread dot */}
      <div style={{
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: isRead ? 'transparent' : 'var(--primary)',
        marginTop: 7,
        flexShrink: 0,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 3,
        }}>
          {/* Vertical badge */}
          {item.vertical && (
            <span style={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              background: 'var(--bg-elevated)',
              borderRadius: 3,
              padding: '1px 5px',
              flexShrink: 0,
            }}>
              {item.vertical}
            </span>
          )}

          {/* item_type badge */}
          <span style={{
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            textTransform: 'uppercase',
            borderRadius: 3,
            padding: '1px 6px',
            flexShrink: 0,
            ...typeStyle,
          }}>
            {item.item_type}
          </span>

          {/* Title */}
          <span style={{
            fontSize: 13,
            fontWeight: isRead ? 400 : 600,
            color: isRead ? 'var(--text-dim)' : 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.title}
          </span>

          {/* Timestamp */}
          <span style={{
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-dim)',
            flexShrink: 0,
            marginLeft: 8,
          }}>
            {timeAgo(item.created_at)}
          </span>
        </div>

        {/* Body preview */}
        {item.body && (
          <div style={{
            fontSize: 12,
            color: 'var(--text-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingLeft: 0,
          }}>
            {item.body}
          </div>
        )}
      </div>
    </div>
  )
}
