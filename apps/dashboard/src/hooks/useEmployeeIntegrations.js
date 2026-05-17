// useEmployeeIntegrations — fetch integrations de qualquer agentId
// Versão generalizada de useBiaIntegrations.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useEmployeeIntegrations(agentId) {
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading]           = useState(true)

  const load = useCallback(async () => {
    if (!agentId || !supabase) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .schema('system')
        .from('agent_integrations')
        .select(`
          integration_id,
          enabled,
          integration:integration_id (
            id, slug, name, description, icon, brand_color, status, kind, category
          )
        `)
        .eq('agent_id', agentId)
      if (error) throw error
      const rows = (data || []).map(r => ({
        id:          r.integration?.id,
        slug:        r.integration?.slug,
        name:        r.integration?.name,
        description: r.integration?.description,
        icon:        r.integration?.icon,
        brand_color: r.integration?.brand_color,
        status:      r.integration?.status,
        category:    r.integration?.category,
        enabled:     r.enabled,
      })).filter(r => r.id)
      setIntegrations(rows)
    } catch (err) {
      console.error('[useEmployeeIntegrations]', agentId, err)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  const toggle = useCallback(async (integration_id) => {
    const current = integrations.find(i => i.id === integration_id)
    if (!current) return
    const newEnabled = !current.enabled
    setIntegrations(prev => prev.map(i =>
      i.id === integration_id ? { ...i, enabled: newEnabled } : i
    ))
    try {
      const { error } = await supabase
        .schema('system')
        .from('agent_integrations')
        .update({ enabled: newEnabled })
        .eq('agent_id', agentId)
        .eq('integration_id', integration_id)
      if (error) throw error
    } catch (err) {
      console.error('[useEmployeeIntegrations] toggle', err)
      setIntegrations(prev => prev.map(i =>
        i.id === integration_id ? { ...i, enabled: !newEnabled } : i
      ))
    }
  }, [agentId, integrations])

  return { integrations, loading, toggle, reload: load }
}
