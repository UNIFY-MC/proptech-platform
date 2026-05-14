// TaskCard — card visual para cada task_type da Bia
// Usado no BiaTaskLauncher na página /employees/bia

const ACCENT = {
  outreach_compose: 'var(--info)',
  pedido_triagem:   'var(--warning)',
  daily_roundup:    'var(--success)',
}

export default function TaskCard({ taskType, title, desc, icon, badge, onClick, disabled }) {
  const accent = ACCENT[taskType] || 'var(--text-dim)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: 'left',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        padding: 16,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s, transform 0.12s',
        opacity: disabled ? 0.55 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 132,
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={e => {
        if (disabled) return
        e.currentTarget.style.background = 'var(--bg-card)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: accent,
            marginBottom: 3,
          }}>{badge}</div>
          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>{title}</div>
        </div>
      </div>
      <div style={{
        fontSize: '0.72rem',
        color: 'var(--text-dim)',
        lineHeight: 1.5,
      }}>{desc}</div>
    </button>
  )
}
