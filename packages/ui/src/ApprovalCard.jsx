function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const STATUS_STYLE = {
  pending:         { bg: 'rgba(59,130,246,0.15)', color: 'var(--info)' },
  approved:        { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)' },
  edited_approved: { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)' },
  dismissed:       { bg: 'rgba(239,68,68,0.15)',  color: 'var(--danger)' },
}

const STATUS_LABEL = {
  pending: 'pending',
  approved: 'aprovado',
  edited_approved: 'editado',
  dismissed: 'rejeitado',
}

const ACTION_LABEL = {
  whatsapp_send: 'WhatsApp',
  email_send: 'Email',
  db_insert: 'DB Insert',
  db_update: 'DB Update',
  deploy: 'Deploy',
  api_call: 'API',
}

const ACTION_STYLE = {
  whatsapp_send: { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)' },
  email_send:    { bg: 'rgba(59,130,246,0.15)', color: 'var(--info)' },
  db_insert:     { bg: 'rgba(83,74,183,0.15)',  color: 'var(--primary)' },
  db_update:     { bg: 'rgba(83,74,183,0.15)',  color: 'var(--primary)' },
  deploy:        { bg: 'rgba(245,158,11,0.15)', color: 'var(--warning)' },
  api_call:      { bg: 'rgba(59,130,246,0.15)', color: 'var(--info)' },
}

const BADGE_BASE = {
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderRadius: 3,
  padding: '1px 6px',
  flexShrink: 0,
}

function Btn({ onClick, variant, disabled, children }) {
  const colors = {
    approve: { color: 'var(--success)',  border: 'rgba(16,185,129,0.4)', hoverBg: 'rgba(16,185,129,0.1)' },
    reject:  { color: 'var(--danger)',   border: 'rgba(239,68,68,0.4)',  hoverBg: 'rgba(239,68,68,0.1)' },
    edit:    { color: 'var(--text-dim)', border: 'var(--border)',        hoverBg: 'var(--bg-elevated)' },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: `1px solid ${colors.border}`,
        color: colors.color,
        borderRadius: 5,
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = colors.hoverBg }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

export default function ApprovalCard({ item, onApprove, onReject, onEdit }) {
  const isPending = item.status === 'pending'
  const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE.dismissed
  const actionStyle = ACTION_STYLE[item.action_type] ?? ACTION_STYLE.api_call
  const draft = item.edited_message ?? item.draft_message

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 10,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = isPending ? 'rgba(83,74,183,0.4)' : 'var(--border)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {item.target_vertical && (
          <span style={{
            ...BADGE_BASE,
            background: 'var(--bg-elevated)',
            color: 'var(--text-dim)',
          }}>
            {item.target_vertical}
          </span>
        )}

        <span style={{ ...BADGE_BASE, ...actionStyle }}>
          {ACTION_LABEL[item.action_type] ?? item.action_type}
        </span>

        <span style={{ ...BADGE_BASE, ...statusStyle }}>
          {STATUS_LABEL[item.status] ?? item.status}
        </span>

        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-dim)',
        }}>
          {timeAgo(item.created_at)}
        </span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        via <span style={{ color: 'var(--text)', fontWeight: 500 }}>{item.source_agent}</span>
      </div>

      <div style={{
        fontSize: 13,
        color: 'var(--text)',
        lineHeight: 1.55,
        background: 'var(--bg-elevated)',
        borderRadius: 5,
        padding: '8px 10px',
        marginBottom: isPending ? 12 : 0,
        borderLeft: `3px solid ${isPending ? 'var(--info)' : statusStyle.color}`,
      }}>
        {draft}
      </div>

      {isPending && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="approve" onClick={() => onApprove(item.id)}>Aprovar</Btn>
          <Btn variant="edit"    onClick={() => onEdit(item)}>Editar</Btn>
          <Btn variant="reject"  onClick={() => onReject(item.id)}>Rejeitar</Btn>
        </div>
      )}
    </div>
  )
}
