function StatCell({ label, value, sub, loading }) {
  return (
    <div className="bia-stat-cell">
      <div className="bia-stat-label">{label}</div>
      {loading
        ? <div className="bia-stat-skeleton" />
        : <div className="bia-stat-value">{value ?? '—'}</div>
      }
      {sub && !loading && <div className="bia-stat-sub">{sub}</div>}
    </div>
  )
}

export default function BiaStats({ stats, loading, dimmed }) {
  const rateDisplay = stats.approvalRate != null ? `${stats.approvalRate}%` : null
  const costDisplay = stats.cost30d != null ? `$${stats.cost30d}` : null

  return (
    <div className={`bia-stats-grid${dimmed ? ' dimmed' : ''}`}>
      <StatCell label="Inbox 7d"           value={stats.inbox7d}         sub="pedidos recebidos"  loading={loading} />
      <StatCell label="Approvals pending"  value={stats.approvalsPending} sub="aguardam decisão"   loading={loading} />
      <StatCell label="Approval rate"      value={rateDisplay}            sub="últimos 30d"        loading={loading} />
      <StatCell label="Cost 30d"           value={costDisplay}            sub="USD · estimado"     loading={loading} />
    </div>
  )
}
