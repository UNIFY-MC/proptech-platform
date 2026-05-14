// useRecipes — catálogo recipes + CRUD básico + filtro por vertical

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useVerticalStore } from '../store/index.js'

export function useRecipes() {
  const { activeVertical } = useVerticalStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('system_recipes')
      .select('*')
      .order('display_order', { ascending: true })
    if (!error) setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Filtra por vertical activa (multi-tenant)
  const filtered = useMemo(() => {
    if (!activeVertical || activeVertical === 'all') return items
    const v = activeVertical.toLowerCase()
    return items.filter((r) => {
      const verts = r.verticals || []
      return verts.includes('*') || verts.includes(v)
    })
  }, [items, activeVertical])

  const create = useCallback(async (input) => {
    if (!supabase) return null
    const slug = (input.name || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50) +
                 '-' + Math.random().toString(36).slice(2, 6)
    const { data, error } = await supabase.schema('system').from('recipes').insert({
      slug,
      name:        input.name,
      description: input.description || '',
      category:    input.category || 'general',
      icon:        input.icon || 'Sparkles',
      brand_color: input.brand_color || '#6b4fa0',
      author_name: input.author_name || 'Mário Carvalho',
      verticals:   input.verticals || ['*'],
      steps:       input.steps || [],
      trigger:     input.trigger || 'manual',
      status:      'active',
      active:      true,
    }).select('*').single()
    if (error) { console.warn('[useRecipes] create failed', error); return null }
    await fetch()
    return data
  }, [fetch])

  const update = useCallback(async (id, patch) => {
    if (!supabase) return
    await supabase.schema('system').from('recipes').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id) => {
    if (!supabase) return
    await supabase.schema('system').from('recipes').delete().eq('id', id)
    await fetch()
  }, [fetch])

  return { items: filtered, all: items, loading, refresh: fetch, create, update, remove }
}
