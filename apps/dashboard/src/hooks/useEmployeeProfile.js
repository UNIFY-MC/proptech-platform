// useEmployeeProfile — fetch system.agent_profile WHERE agent_id = agentId
// Versão generalizada de useBiaProfile. Aceita qualquer agent_id.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useEmployeeProfile(agentId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const load = useCallback(async () => {
    if (!agentId || !supabase) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .schema('system')
        .from('agent_profile')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle()
      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('[useEmployeeProfile]', agentId, err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  return { profile, loading, error, reload: load }
}
