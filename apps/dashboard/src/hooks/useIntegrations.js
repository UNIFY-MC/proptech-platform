// useIntegrations — lista de integrações filtradas por vertical activa
// Fallback para empregados/data.json caso supabase em falta

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

export function useIntegrations() {
  const { activeVertical } = useVerticalStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('system_integrations')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) setError(error.message)
    else setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Filtra pela vertical activa. 'all' mostra tudo. Caso contrário, mostra
  // só integrações com verticals[]='{*}' (global) ou que contêm a vertical.
  const filtered = useMemo(() => {
    if (!activeVertical || activeVertical === 'all') return items
    const v = activeVertical.toLowerCase()
    return items.filter((i) => {
      const verts = i.verticals || []
      return verts.includes('*') || verts.includes(v)
    })
  }, [items, activeVertical])

  const updateStatus = useCallback(async (id, status) => {
    if (!supabase) return
    const { error } = await supabase.schema('system').from('integrations')
      .update({ status }).eq('id', id)
    if (error) console.warn('[useIntegrations] update_status failed', error)
    await fetch()
  }, [fetch])

  return { items: filtered, all: items, loading, error, refresh: fetch, updateStatus }
}
