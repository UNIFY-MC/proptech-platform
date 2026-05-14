import { useEffect, useState } from 'react'
import { ApprovalCard } from '@proptech/ui'
import { systemClient } from '../lib/clients.js'

export default function Approvals() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState({})

  async function load() {
    const { data, error } = await systemClient
      .from('approvals_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('target_vertical', 'v2')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setItems(data ?? [])
  }

  useEffect(() => {
    load()
    const channel = systemClient
      .channel('approvals_v2')
      .on('postgres_changes', { event: '*', schema: 'system', table: 'approvals_queue' }, load)
      .subscribe()
    return () => systemClient.removeChannel(channel)
  }, [])

  async function setStatus(id, status) {
    setBusy(b => ({ ...b, [id]: true }))
    await systemClient.from('approvals_queue').update({ status }).eq('id', id)
    setBusy(b => ({ ...b, [id]: false }))
    load()
  }

  return (
    <div>
      <h1>Approvals</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Acções pendentes que precisam da tua aprovação. Comunicações vão para <code className="mono">comunicacao-condo</code> executar após aprovar.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          Erro: {error}
        </div>
      )}

      {items === null && !error && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>}

      {items && items.length === 0 && !error && (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)',
          background: 'var(--bg-card-soft)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem aprovações pendentes</div>
          <div style={{ fontSize: 12 }}>Os agentes podem actuar autonomamente até precisarem de ti.</div>
        </div>
      )}

      {items && items.length > 0 && (
        <div>
          {items.map(it => (
            <ApprovalCard
              key={it.id}
              item={it}
              onApprove={(id) => setStatus(id, 'approved')}
              onReject={(id)  => setStatus(id, 'dismissed')}
              onEdit={() => { /* drawer TODO */ }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
