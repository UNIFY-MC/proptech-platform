export default function BiaHeader({ meta }) {
  const name = meta.employee.charAt(0).toUpperCase() + meta.employee.slice(1)

  return (
    <header className="bia-header">
      {/* Avatar */}
      <div className="bia-avatar">{meta.avatar_initials}</div>

      {/* Centre: name + role + integrations row */}
      <div>
        <div className="bia-name">{name}</div>
        <div className="bia-role">{meta.role}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <div className="bia-integrations-row">
            {meta.integrations.map(int => (
              <div
                key={int.id}
                className={`bia-int-cell ${int.status}`}
                title={`${int.name} · ${int.status}`}
              >
                {int.icon}
              </div>
            ))}
          </div>
          <span className="bia-mono" style={{ fontSize: 10, color: 'var(--bia-text-dim)', letterSpacing: '0.05em' }}>
            {meta.integrations.length} integrations
          </span>
        </div>
      </div>

      {/* Right: version + model + status */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="bia-version-chip bia-mono">v{meta.version}</span>
          <span className="bia-model-chip bia-mono">{meta.model}</span>
        </div>
        <span className={`bia-status-pill ${meta.status}`}>{meta.status}</span>
      </div>
    </header>
  )
}
