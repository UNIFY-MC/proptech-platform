// useEmployeeAutomations — fetch recipes + count fires para qualquer agentId
// Versão generalizada de useBiaAutomations.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useEmployeeAutomations(agentId) {
  const [automations, setAutomations] = useState([])
  const [loading, setLoading]         = useState(true)

  const load = useCallback(async () => {
    if (!agentId || !supabase) { setLoading(false); return }
    setLoading(true)
    try {
      const { data: recipes, error: rErr } = await supabase
        .schema('system')
        .from('agent_recipes')
        .select('recipe_id, name, trigger_type, trigger_label, description, enabled')
        .eq('agent_id', agentId)
      if (rErr) throw rErr

      const since30d = new Date(Date.now() - 30 * 86400_000).toISOString()
      const result   = []
      for (const r of recipes || []) {
        let fires_30d = 0
        try {
          const { count } = await supabase
            .schema('system')
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('owner_agent_id', agentId)
            .gte('created_at', since30d)
          fires_30d = count ?? 0
        } catch (_) { /* tasks pode ainda não ter dados */ }
        result.push({ ...r, fires_30d })
      }
      setAutomations(result)
    } catch (err) {
      console.error('[useEmployeeAutomations]', agentId, err)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  const toggle = useCallback(async (recipe_id) => {
    const current = automations.find(a => a.recipe_id === recipe_id)
    if (!current) return
    const newEnabled = !current.enabled
    setAutomations(prev => prev.map(a =>
      a.recipe_id === recipe_id ? { ...a, enabled: newEnabled } : a
    ))
    try {
      const { error } = await supabase
        .schema('system')
        .from('agent_recipes')
        .update({ enabled: newEnabled })
        .eq('agent_id', agentId)
        .eq('recipe_id', recipe_id)
      if (error) throw error
    } catch (err) {
      console.error('[useEmployeeAutomations] toggle', err)
      setAutomations(prev => prev.map(a =>
        a.recipe_id === recipe_id ? { ...a, enabled: !newEnabled } : a
      ))
    }
  }, [agentId, automations])

  return { automations, loading, toggle, reload: load }
}
