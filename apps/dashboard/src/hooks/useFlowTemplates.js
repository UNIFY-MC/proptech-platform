// useFlowTemplates — lista + CRUD de system.flow_templates
// Sprint Q3

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useFlowTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase.from('system_flow_templates')
      .select('*')
      .eq('active', true)
      .order('vertical', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
    setTemplates(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (template) => {
    if (!template?.slug) return null
    const { id, created_at, updated_at, step_count, ...rest } = template
    if (id) {
      const { error } = await supabase.from('system_flow_templates').update(rest).eq('id', id)
      if (error) return null
    } else {
      const { error } = await supabase.from('system_flow_templates').insert(rest)
      if (error) return null
    }
    await fetch()
    return true
  }, [fetch])

  const remove = useCallback(async (id) => {
    const { error } = await supabase.from('system_flow_templates').update({ active: false }).eq('id', id)
    if (!error) await fetch()
    return !error
  }, [fetch])

  return { templates, loading, refresh: fetch, save, remove }
}
