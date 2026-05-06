import { useEffect } from 'react'
import { useNotificationsStore } from '../store'

const TOAST_STYLE = {
  success: {
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    color: 'var(--success)',
    icon: '✓',
  },
  error: {
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    color: 'var(--danger)',
    icon: '✕',
  },
  info: {
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
    color: 'var(--info)',
    icon: 'i',
  },
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const s = TOAST_STYLE[toast.type] ?? TOAST_STYLE.info

  return (
    <div
      onClick={onDismiss}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        color: s.color,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        minWidth: 200,
        maxWidth: 340,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        animation: 'toast-in 0.2s ease',
      }}
    >
      <span style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `1.5px solid ${s.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {s.icon}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotificationsStore()

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <Toast toast={t} onDismiss={() => dismissToast(t.id)} />
        </div>
      ))}
    </div>
  )
}
