// useEmployeeChannels — fetch + update system.agent_channels para qualquer agentId
// Versão generalizada de useBiaChannels.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useEmployeeChannels(agentId) {
  const [channels, setChannels] = useState([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    if (!agentId || !supabase) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .schema('system')
        .from('agent_channels')
        .select('id, channel_type, active, display_name, channel_name, channel_id, listen_all_channels, voice_notes')
        .eq('agent_id', agentId)
      if (error) throw error
      setChannels((data || []).map(c => ({
        id:                  c.id,
        type:                c.channel_type,
        active:              c.active,
        display_name:        c.display_name || `${agentId} · ${c.channel_type}`,
        channel_name:        c.channel_name || '(canal por resolver)',
        channel_id:          c.channel_id,
        listen_all_channels: !!c.listen_all_channels,
        voice_notes:         !!c.voice_notes,
      })))
    } catch (err) {
      console.error('[useEmployeeChannels]', agentId, err)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  const updateChannelField = useCallback(async (channelDbId, field, value) => {
    setChannels(prev => prev.map(c => c.id === channelDbId ? { ...c, [field]: value } : c))
    try {
      const { error } = await supabase
        .schema('system').from('agent_channels')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', channelDbId)
      if (error) throw error
    } catch (err) {
      console.error('[useEmployeeChannels] update', field, err)
      setChannels(prev => prev.map(c => c.id === channelDbId ? { ...c, [field]: !value } : c))
      throw err
    }
  }, [])

  const attachChannel = useCallback(async (channel_id, channel_name, display_name) => {
    if (!supabase) return
    const { data, error } = await supabase.functions.invoke('discord-attach-channel', {
      body: { agent_id: agentId, channel_id, channel_name, display_name, action: 'attach' },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    await load()
    return data
  }, [agentId, load])

  const detachChannel = useCallback(async (channel_id) => {
    if (!supabase) return
    const { data, error } = await supabase.functions.invoke('discord-attach-channel', {
      body: { agent_id: agentId, channel_id, action: 'detach' },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    await load()
    return data
  }, [agentId, load])

  return { channels, loading, reload: load, updateChannelField, attachChannel, detachChannel }
}
