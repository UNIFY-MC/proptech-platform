// KPI card — visual compacto para a página inicial
// Uso: <KPI label="Clientes" value={143} sub="+12 este mês" icon={Users} accent="var(--success)" />

export default function KPI({ label, value, sub, icon: Icon, accent = 'var(--primary)', loading, to }) {
  const content = (
    <div className="kpi-card" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${accent}`,
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minHeight: 92,
      cursor: to ? 'pointer' : 'default',
      transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => to && (e.currentTarget.style.background = 'var(--bg-elevated)')}
    onMouseLeave={(e) => to && (e.currentTarget.style.background = 'var(--bg-card)')}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
        }}>
          {label}
        </span>
        {Icon && <Icon size={14} style={{ color: accent, opacity: 0.8 }} />}
      </div>
      <div style={{
        fontSize: '1.6rem',
        fontWeight: 700,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--text)',
        lineHeight: 1.1,
        minHeight: 30,
      }}>
        {loading ? <span style={{ opacity: 0.3 }}>—</span> : value}
      </div>
      {sub && (
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-dim)',
        }}>
          {sub}
        </div>
      )}
    </div>
  )

  if (to) {
    return <a href={to} style={{ textDecoration: 'none' }}>{content}</a>
  }
  return content
}
