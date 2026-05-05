import { useInboxItems } from '../hooks/useSupabase'
import { useVerticalStore } from '../store'

export default function InboxView() {
  const { activeVertical } = useVerticalStore()
  const { items, loading, error } = useInboxItems(activeVertical)

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Inbox</h1>
      <p>Vertical: {activeVertical} | Items: {items.length}</p>
      {loading && <p>A carregar…</p>}
      {error && <p style={{ color: 'var(--danger)' }}>Erro: {error}</p>}
      <pre style={{ marginTop: 16, fontSize: 12, background: 'var(--bg-card)', padding: 16, borderRadius: 8, overflow: 'auto' }}>
        {JSON.stringify(items, null, 2)}
      </pre>
      <p style={{ marginTop: 16, color: 'var(--text-dim)' }}>UI completa em Prompt 5</p>
    </div>
  )
}
