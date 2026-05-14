// useTriggers — CRUD system.triggers

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

export function useTriggers() {
  const { activeVertical } = useVerticalStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('system_triggers').select('*')
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel('triggers')
      .on('postgres_changes', { event: '*', schema: 'system', table: 'triggers' }, () => fetch())
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [fetch])

  const filtered = useMemo(() => {
    if (!activeVertical || activeVertical === 'all') return items
    const v = activeVertical.toLowerCase()
    return items.filter((t) => (t.verticals || []).includes('*') || (t.verticals || []).includes(v))
  }, [items, activeVertical])

  const create = useCallback(async (input) => {
    if (!supabase) return null
    const { data, error } = await supabase.schema('system').from('triggers').insert({
      name:         input.name,
      description:  input.description || '',
      bot_id:       input.bot_id,
      event_kind:   input.event_kind,
      event_filter: input.event_filter || {},
      recipe_id:    input.recipe_id || null,
      prompt:       input.prompt || null,
      mode:         input.mode || 'agentic',
      connectors:   input.connectors || [],
      permissions:  input.permissions || { writes_allowed: true, requires_approval: false },
      verticals:    input.verticals || ['*'],
      active:       input.active !== false,
    }).select('*').single()
    if (error) { console.warn('[useTriggers] create failed', error); return null }
    await fetch()
    return data
  }, [fetch])

  const update = useCallback(async (id, patch) => {
    if (!supabase) return
    await supabase.schema('system').from('triggers').update(patch).eq('id', id)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id) => {
    if (!supabase) return
    await supabase.schema('system').from('triggers').delete().eq('id', id)
    await fetch()
  }, [fetch])

  return { items: filtered, all: items, loading, refresh: fetch, create, update, remove }
}
