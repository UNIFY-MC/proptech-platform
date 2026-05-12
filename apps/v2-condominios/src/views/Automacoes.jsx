export default function Automacoes() {
  return (
    <div>
      <h1>Automações</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Cron schedules e triggers dos AI employees. Configurável pelo Mário.
      </p>
      <div className="empty-state">
        <div style={{ fontSize: 14, marginBottom: 4 }}>Por construir</div>
        <div style={{ fontSize: 12 }}>
          UI sobre <code className="mono">pg_cron</code> + <code className="mono">core.agent_policies</code>. 9 schedules planeados em ADR-condo-001.
        </div>
      </div>
    </div>
  )
}
