export default function Permissoes() {
  return (
    <div>
      <h1>Permissões</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Gestão de papéis e acessos (developer view).
      </p>
      <div className="empty-state">
        <div style={{ fontSize: 14, marginBottom: 4 }}>Por construir</div>
        <div style={{ fontSize: 12 }}>
          UI sobre <code className="mono">core.staff_roles</code> + <code className="mono">core.memberships</code> + RLS policy inspection.
        </div>
      </div>
    </div>
  )
}
