// Conteúdo do drawer para um inbox item.
// Não é um drawer autónomo — é o JSX passado como `content` ao openDrawer().

function fdt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MetaRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
      <span style={{
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        width: 80,
        flexShrink: 0,
        paddingTop: 1,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

export default function InboxItemDrawer({ item, isRead, onMarkRead, onMarkUnread, onClose }) {
  const hasPayload = item.payload && Object.keys(item.payload).length > 0

  return (
    <div>
      {/* Metadados */}
      <div style={{
        marginBottom: 20,
        padding: '12px 14px',
        background: 'var(--bg-elevated)',
        borderRadius: 6,
        border: '1px solid var(--border)',
      }}>
        {item.vertical && <MetaRow label="Vertical" value={item.vertical} />}
        <MetaRow label="Tipo" value={item.item_type} />
        <MetaRow label="Fonte" value={item.source} />
        <MetaRow label="Data" value={fdt(item.created_at)} />
      </div>

      {/* Body completo */}
      {item.body && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            marginBottom: 8,
            letterSpacing: '0.08em',
          }}>
            Mensagem
          </div>
          <p style={{
            fontSize: 14,
            color: 'var(--text)',
            lineHeight: 1.65,
            margin: 0,
          }}>
            {item.body}
          </p>
        </div>
      )}

      {/* Payload (se tiver chaves) */}
      {hasPayload && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            marginBottom: 8,
            letterSpacing: '0.08em',
          }}>
            Payload
          </div>
          <pre style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '12px 14px',
            color: 'var(--text)',
            overflow: 'auto',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {JSON.stringify(item.payload, null, 2)}
          </pre>
        </div>
      )}

      {/* Acções */}
      <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        {!isRead ? (
          <button
            onClick={onMarkRead}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Marcar como lido
          </button>
        ) : (
          <button
            onClick={onMarkUnread}
            style={{
              background: 'transparent',
              color: 'var(--text-dim)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Marcar como não lido
          </button>
        )}
      </div>
    </div>
  )
}
