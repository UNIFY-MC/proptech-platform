export function SprintProgress({ day, totalDays, startDate, endDate }) {
  const pct = Math.min(100, Math.max(0, (day / totalDays) * 100))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
          {day}
          <span style={{ fontSize: '1rem', color: 'var(--text-dim)', fontWeight: 400 }}>/{totalDays}</span>
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {startDate} → {endDate}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
