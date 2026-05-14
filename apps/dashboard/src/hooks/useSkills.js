// useSkills — lista de skills com filtro por status/category e CRUD parcial

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useSkills() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('system_skills')
      .select('*')
      .order('usage_count', { ascending: false })
    if (!error) setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const counts = useMemo(() => {
    const c = { total: items.length, active: 0, pending_receipt: 0, draft: 0, deprecated: 0 }
    items.forEach((s) => { c[s.status] = (c[s.status] || 0) + 1 })
    return c
  }, [items])

  const updateStatus = useCallback(async (id, status) => {
    if (!supabase) return
    await supabase.schema('system').from('skills').update({ status }).eq('id', id)
    await fetch()
  }, [fetch])

  return { items, loading, counts, refresh: fetch, updateStatus }
}
