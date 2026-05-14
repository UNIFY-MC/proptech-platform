import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

// Nota: tabelas inbox_items e approvals_queue estão no schema `system`.
// Usamos supabase.schema('system').from('tabela') para aceder ao schema correcto.
// O Realtime channel filtra por schema: 'system' nas postgres_changes.

export function useInboxItems(vertical = null) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    async function fetchItems() {
      setLoading(true)
      let query = supabase
        .schema('system')
        .from('inbox_items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (vertical) query = query.eq('vertical', vertical)

      const { data, error } = await query
      if (error) setError(error.message)
      else setItems(data ?? [])
      setLoading(false)
    }

    fetchItems()

    // Channel name único por mount (StrictMode + múltiplos consumers do mesmo hook
    // causam "cannot add callbacks after subscribe" se reutilizarmos o mesmo nome).
    const channelName = `inbox_items_changes_${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'system',
        table: 'inbox_items',
      }, () => fetchItems())
      .subscribe()

    return () => {
      try { supabase.removeChannel(channel) } catch (_) { /* noop */ }
    }
  }, [vertical])

  return { items, loading, error }
}

export function useApprovals(vertical = null) {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    async function fetchApprovals() {
      setLoading(true)
      let query = supabase
        .schema('system')
        .from('approvals_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (vertical) query = query.eq('target_vertical', vertical)

      const { data, error } = await query
      if (error) setError(error.message)
      else setApprovals(data ?? [])
      setLoading(false)
    }

    fetchApprovals()

    const channelName = `approvals_changes_${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'system',
        table: 'approvals_queue',
      }, () => fetchApprovals())
      .subscribe()

    return () => {
      try { supabase.removeChannel(channel) } catch (_) { /* noop */ }
    }
  }, [vertical])

  return { approvals, loading, error }
}
