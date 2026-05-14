// useSchedules — CRUD para system.schedules + run manual

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

export function useSchedules() {
  const { activeVertical } = useVerticalStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('system_schedules').select('*')
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Realtime
  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel('schedules')
      .on('postgres_changes', { event: '*', schema: 'system', table: 'schedules' }, () => fetch())
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [fetch])

  const filtered = useMemo(() => {
    if (!activeVertical || activeVertical === 'all') return items
    const v = activeVertical.toLowerCase()
    return items.filter((s) => {
      const verts = s.verticals || []
      return verts.includes('*') || verts.includes(v)
    })
  }, [items, activeVertical])

  const create = useCallback(async (input) => {
    if (!supabase) return null
    const { data, error } = await supabase.schema('system').from('schedules').insert({
      name:        input.name,
      description: input.description || '',
      recipe_id:   input.recipe_id || null,
      prompt:      input.prompt || null,
      bot_id:      input.bot_id,
      cron_expr:   input.cron_expr,
      cron_label:  input.cron_label || null,
      connectors:  input.connectors || [],
      permissions: input.permissions || { writes_allowed: true, requires_approval: false },
      verticals:   input.verticals || ['*'],
      active:      input.active !== false,
    }).select('*').single()
    if (error) { console.warn('[useSchedules] create failed', error); return null }
    await fetch()
    return data
  }, [fetch])

  const update = useCallback(async (id, patch) => {
    if (!supabase) return
    await supabase.schema('system').from('schedules').update(patch).eq('id', id)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id) => {
    if (!supabase) return
    await supabase.schema('system').from('schedules').delete().eq('id', id)
    await fetch()
  }, [fetch])

  const runNow = useCallback(async (id) => {
    const res = await window.fetch(`${SUPABASE_URL}/functions/v1/schedule-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
      body: JSON.stringify({ schedule_id: id }),
    })
    return await res.json()
  }, [])

  return { items: filtered, all: items, loading, refresh: fetch, create, update, remove, runNow }
}
