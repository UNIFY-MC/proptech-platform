// useProjects — CRUD system.projects + filtro vertical

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

export function useProjects() {
  const { activeVertical } = useVerticalStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('system_projects').select('*')
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel('projects')
      .on('postgres_changes', { event: '*', schema: 'system', table: 'projects' }, () => fetch())
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [fetch])

  const filtered = useMemo(() => {
    if (!activeVertical || activeVertical === 'all') return items
    const v = activeVertical.toLowerCase()
    return items.filter((p) =>
      (p.verticals || []).includes('*') ||
      (p.verticals || []).includes(v) ||
      p.vertical === v
    )
  }, [items, activeVertical])

  const create = useCallback(async (input) => {
    if (!supabase) return null
    const { data, error } = await supabase.schema('system').from('projects').insert({
      name:        input.name,
      description: input.description || '',
      status:      input.status || 'planned',
      priority:    input.priority || 'medium',
      vertical:    input.vertical || null,
      verticals:   input.verticals || ['*'],
      icon:        input.icon || 'Folder',
      brand_color: input.brand_color || '#3b82f6',
      due_at:      input.due_at || null,
      goals:       input.goals || [],
    }).select('*').single()
    if (error) { console.warn('[useProjects] create failed', error); return null }
    await fetch()
    return data
  }, [fetch])

  const update = useCallback(async (id, patch) => {
    if (!supabase) return
    await supabase.schema('system').from('projects').update(patch).eq('id', id)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id) => {
    if (!supabase) return
    await supabase.schema('system').from('projects').delete().eq('id', id)
    await fetch()
  }, [fetch])

  return { items: filtered, all: items, loading, refresh: fetch, create, update, remove }
}
