import { useApprovals } from '../hooks/useSupabase'
import { useVerticalStore } from '../store'
import { useStaffStatus } from '../hooks/useStaffStatus'

export default function ApprovalsView() {
  const { activeVertical } = useVerticalStore()
  const { approvals, loading, error } = useApprovals(activeVertical)
  const { isStaff, loading: staffLoading } = useStaffStatus()

  if (!staffLoading && !isStaff) {
    return (
      <div>
        <h1 style={{ marginBottom: 16 }}>Approvals</h1>
        <div
          style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8,
            padding: 16,
            color: '#f59e0b',
          }}
        >
          Estás autenticado mas não és staff. Contacta admin para te adicionar a core.staff_roles.
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Approvals</h1>
      <p>Vertical: {activeVertical} | Pendentes: {approvals.length}</p>
      {loading && <p>A carregar…</p>}
      {error && <p style={{ color: 'var(--danger)' }}>Erro: {error}</p>}
      <pre
        style={{
          marginTop: 16,
          fontSize: 12,
          background: 'var(--bg-card)',
          padding: 16,
          borderRadius: 8,
          overflow: 'auto',
        }}
      >
        {JSON.stringify(approvals, null, 2)}
      </pre>
      <p style={{ marginTop: 16, color: 'var(--text-dim)' }}>UI completa em Prompt 6</p>
    </div>
  )
}
