import { useState } from 'react'
import { useApprovals } from '../hooks/useSupabase'
import { useVerticalStore } from '../store'
import { useApprovalActions } from '../hooks/useApprovalActions'
import { useDrawer } from '../context/DrawerContext'
import ApprovalCard from '../components/approvals/ApprovalCard'
import ApprovalDrawer from '../components/approvals/ApprovalDrawer'

const ACTION_LABEL = {
  whatsapp_send: 'WhatsApp',
  email_send: 'Email',
  db_insert: 'DB Insert',
  db_update: 'DB Update',
  deploy: 'Deploy',
  api_call: 'API',
}

const FILTERS = [
  { key: 'pending',  label: 'Pending' },
  { key: 'all',      label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'dismissed',label: 'Rejected' },
]

export default function ApprovalsView() {
  const { activeVertical } = useVerticalStore()
  const { approvals, loading, error } = useApprovals(activeVertical, null)
  const { approveItem, rejectItem, editAndApprove } = useApprovalActions()
  const { openDrawer, closeDrawer } = useDrawer()
  const [filter, setFilter] = useState('pending')

  const pendingCount = approvals.filter(a => a.status === 'pending').length

  const filtered = (() => {
    const base = filter === 'all' ? approvals : approvals.filter(a => a.status === filter)
    return [...base].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
  })()

  function openEditDrawer(item) {
    openDrawer(
      ACTION_LABEL[item.action_type] ?? item.action_type,
      `${item.source_agent} · ${item.target_vertical ?? 'global'}`,
      <ApprovalDrawer
        item={item}
        onSaveAndApprove={editAndApprove}
        onClose={closeDrawer}
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1>Approvals</h1>
        {pendingCount > 0 && (
          <span style={{
            background: 'var(--info)',
            color: '#fff',
            borderRadius: 99,
            padding: '2px 8px',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
          }}>
            {pendingCount} pendentes
          </span>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? 'rgba(83,74,183,0.2)' : 'var(--bg-elevated)',
              color: filter === f.key ? 'var(--primary)' : 'var(--text-dim)',
              border: `1px solid ${filter === f.key ? 'rgba(83,74,183,0.4)' : 'var(--border)'}`,
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 90,
              background: 'var(--bg-card)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              marginBottom: 10,
              opacity: 0.5,
            }} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: 16,
          color: 'var(--danger)',
          fontSize: 13,
        }}>
          Erro ao carregar approvals: {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#10003;</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {filter === 'pending' ? 'Sem approvals pendentes.' : 'Nenhum item neste filtro.'}
          </div>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div>
          {filtered.map(item => (
            <ApprovalCard
              key={item.id}
              item={item}
              onApprove={approveItem}
              onReject={rejectItem}
              onEdit={openEditDrawer}
            />
          ))}
        </div>
      )}
    </div>
  )
}
