import { useApprovals } from '../hooks/useSupabase'
import { useVerticalStore } from '../store'

export default function ApprovalsView() {
  const { activeVertical } = useVerticalStore()
  const { approvals, loading, error } = useApprovals(activeVertical)

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
