// EmployeeStats — 4 KPIs CookAI-style
// KPI 1: Messages 7d
// KPI 2: Tokens 7d
// KPI 3: Approval Rate (%)
// KPI 4: Tool Spend 30d (€/$)
// Mostra '--' quando dados ainda não existem (não '0' para não enganar)

function StatCell({ label, value, sub, loading }) {
  const display = loading ? null : (value != null ? value : '—')

  return (
    <div className="bia-stat-cell">
      <div className="bia-stat-label">{label}</div>
      {loading
        ? <div className="bia-stat-skeleton" />
        : <div className="bia-stat-value">{display}</div>
      }
      {sub && !loading && <div className="bia-stat-sub">{sub}</div>}
    </div>
  )
}

function fmtTokens(n) {
  if (n == null) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export default function EmployeeStats({ stats, loading, dimmed }) {
  const rateDisplay  = stats.approvalRate != null ? `${stats.approvalRate}%` : null
  const costDisplay  = stats.toolSpend30d != null ? `$${stats.toolSpend30d}` : null
  const tokensDisplay = fmtTokens(stats.tokens7d)

  return (
    <div className={`bia-stats-grid${dimmed ? ' dimmed' : ''}`}>
      <StatCell
        label="Messages 7d"
        value={stats.messages7d}
        sub="pedidos processados"
        loading={loading}
      />
      <StatCell
        label="Tokens 7d"
        value={tokensDisplay}
        sub="tokens consumidos"
        loading={loading}
      />
      <StatCell
        label="Approval Rate"
        value={rateDisplay}
        sub="últimos 30d"
        loading={loading}
      />
      <StatCell
        label="Tool Spend 30d"
        value={costDisplay}
        sub="USD estimado"
        loading={loading}
      />
    </div>
  )
}
