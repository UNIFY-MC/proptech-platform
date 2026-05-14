// useWatcherSources — CRUD para system.watcher_sources via PostgREST view

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useWatcherSources() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('system_watcher_sources')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setSources(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = useCallback(async (input) => {
    if (!supabase) return null
    const { data, error } = await supabase.schema('system').from('watcher_sources').insert({
      kind:     input.kind,
      label:    input.label,
      config:   input.config || {},
      vertical: input.vertical || null,
      active:   input.active !== false,
    }).select('*').single()
    if (error) { console.warn('[useWatcherSources] create failed', error); return null }
    await fetch()
    return data
  }, [fetch])

  const toggle = useCallback(async (id, active) => {
    if (!supabase) return
    await supabase.schema('system').from('watcher_sources').update({ active }).eq('id', id)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id) => {
    if (!supabase) return
    await supabase.schema('system').from('watcher_sources').delete().eq('id', id)
    await fetch()
  }, [fetch])

  return { sources, loading, error, create, toggle, remove, refresh: fetch }
}
