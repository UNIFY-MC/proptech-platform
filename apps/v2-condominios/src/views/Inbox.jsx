import { useEffect, useState } from 'react'
import { InboxItemCard } from '@proptech/ui'
import { systemClient } from '../lib/clients.js'

export default function Inbox() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await systemClient
        .from('inbox_items')
        .select('*')
        .eq('status', 'active')
        .or('vertical.eq.v2,vertical.is.null')
        .order('created_at', { ascending: false })
        .limit(100)
      if (!active) return
      if (error) setError(error.message)
      else setItems(data ?? [])
    }
    load()

    const channel = systemClient
      .channel('inbox_v2')
      .on('postgres_changes', { event: '*', schema: 'system', table: 'inbox_items' }, load)
      .subscribe()

    return () => {
      active = false
      systemClient.removeChannel(channel)
    }
  }, [])

  return (
    <div>
      <h1>Inbox</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Eventos gerados por agentes V2 + eventos globais. Realtime via Supabase channels.
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
          <div style={{ fontSize: 14, marginBottom: 6 }}>Inbox vazia</div>
          <div style={{ fontSize: 12 }}>
            Quando agentes condo gerarem alertas, roundups ou novos pedidos, aparecem aqui.
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {items.map(it => (
            <InboxItemCard key={it.id} item={it} isRead={false} onClick={() => {}} />
          ))}
        </div>
      )}
    </div>
  )
}
