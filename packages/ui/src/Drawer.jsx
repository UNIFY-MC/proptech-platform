import { useEffect, useState } from 'react'

export function DrawerSection({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: '0.65rem',
        fontWeight: 600,
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 6
      }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  )
}

export default function Drawer({ title, subtitle, content, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    return () => setVisible(false)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: 'min(480px, 100vw)',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          padding: '24px',
          zIndex: 101,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: 4,
              flexShrink: 0,
              marginLeft: 12,
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div>
          {content}
        </div>
      </div>
    </>
  )
}
