// useUsefulTools — catálogo de tools "discover / integrate later"
// CRUD + filtro por activeVertical do dropdown topo

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

export function useUsefulTools() {
  const { activeVertical } = useVerticalStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('system_useful_tools')
      .select('*')
      .order('display_order', { ascending: true })
    if (!error) setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const filtered = useMemo(() => {
    if (!activeVertical || activeVertical === 'all') return items
    const v = activeVertical.toLowerCase()
    return items.filter((i) => {
      const verts = i.verticals || []
      return verts.includes('*') || verts.includes(v)
    })
  }, [items, activeVertical])

  const create = useCallback(async (input) => {
    if (!supabase) return null
    const slug = (input.slug || input.name || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60)
    const { data, error } = await supabase.schema('system').from('useful_tools').insert({
      slug: slug + '-' + Math.random().toString(36).slice(2, 6),
      name:        input.name,
      description: input.description || '',
      category:    input.category || 'general',
      url:         input.url,
      domain:      input.domain || (input.url || '').replace(/^https?:\/\//, '').split('/')[0],
      brand_color: input.brand_color || null,
      verticals:   input.verticals || ['*'],
      status:      input.status || 'discover',
      notes:       input.notes || null,
      source:      input.source || null,
      added_by:    input.added_by || null,
    }).select('*').single()
    if (error) { console.warn('[useUsefulTools] create failed', error); return null }
    await fetch()
    return data
  }, [fetch])

  const update = useCallback(async (id, patch) => {
    if (!supabase) return
    const { error } = await supabase.schema('system').from('useful_tools')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) console.warn('[useUsefulTools] update failed', error)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id) => {
    if (!supabase) return
    await supabase.schema('system').from('useful_tools').delete().eq('id', id)
    await fetch()
  }, [fetch])

  return { items: filtered, all: items, loading, refresh: fetch, create, update, remove }
}
