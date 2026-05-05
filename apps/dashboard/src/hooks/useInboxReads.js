import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store'

export function useInboxReads() {
  const { user } = useAuthStore()
  const [readSet, setReadSet] = useState(new Set())

  useEffect(() => {
    if (!supabase || !user) return

    async function fetchReads() {
      const { data } = await supabase
        .schema('system')
        .from('inbox_reads')
        .select('inbox_item_id')
        .eq('user_id', user.id)
      if (data) setReadSet(new Set(data.map(r => r.inbox_item_id)))
    }

    fetchReads()

    const channel = supabase
      .channel(`inbox_reads_changes-${crypto.randomUUID()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'system',
        table: 'inbox_reads',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchReads())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const markAsRead = useCallback(async (itemId) => {
    if (!supabase || !user) return
    await supabase
      .schema('system')
      .from('inbox_reads')
      .upsert({ inbox_item_id: itemId, user_id: user.id }, { onConflict: 'inbox_item_id,user_id' })
    setReadSet(prev => new Set([...prev, itemId]))
  }, [user])

  const markAsUnread = useCallback(async (itemId) => {
    if (!supabase || !user) return
    await supabase
      .schema('system')
      .from('inbox_reads')
      .delete()
      .eq('inbox_item_id', itemId)
      .eq('user_id', user.id)
    setReadSet(prev => { const s = new Set(prev); s.delete(itemId); return s })
  }, [user])

  return { readSet, markAsRead, markAsUnread }
}
