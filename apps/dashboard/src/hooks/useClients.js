// useClients — CRUD system.clients

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

export function useClients() {
  const { activeVertical } = useVerticalStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('system_clients').select('*')
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel('clients')
      .on('postgres_changes', { event: '*', schema: 'system', table: 'clients' }, () => fetch())
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [fetch])

  const filtered = useMemo(() => {
    if (!activeVertical || activeVertical === 'all') return items
    return items.filter((c) => c.vertical === activeVertical.toLowerCase())
  }, [items, activeVertical])

  const create = useCallback(async (input) => {
    if (!supabase) return null
    const slug = (input.company_name || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50) +
                 '-' + Math.random().toString(36).slice(2, 5)
    const { data, error } = await supabase.schema('system').from('clients').insert({
      slug,
      company_name:  input.company_name,
      contact_email: input.contact_email,
      contact_name:  input.contact_name || null,
      niche:         input.niche || null,
      vertical:      input.vertical || null,
      status:        'pending',
      owner_staff:   input.owner_staff || 'Mário',
      invited_at:    new Date().toISOString(),
    }).select('*').single()
    if (error) { console.warn('[useClients] create failed', error); return null }
    await fetch()
    return data
  }, [fetch])

  const update = useCallback(async (id, patch) => {
    if (!supabase) return
    await supabase.schema('system').from('clients').update(patch).eq('id', id)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id) => {
    if (!supabase) return
    await supabase.schema('system').from('clients').delete().eq('id', id)
    await fetch()
  }, [fetch])

  return { items: filtered, all: items, loading, refresh: fetch, create, update, remove }
}
