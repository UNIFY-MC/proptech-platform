import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

// UUID fixo para utilizador interno (sem auth real — app protegida por Vercel password)
const INTERNAL_USER_ID = '00000000-0000-0000-0000-000000000001'

export function useInboxReads() {
  const [readSet, setReadSet] = useState(new Set())

  useEffect(() => {
    if (!supabase) return

    async function fetchReads() {
      const { data } = await supabase
        .schema('system')
        .from('inbox_reads')
        .select('inbox_item_id')
        .eq('user_id', INTERNAL_USER_ID)
      if (data) setReadSet(new Set(data.map(r => r.inbox_item_id)))
    }

    fetchReads()

    const channel = supabase
      .channel(`inbox_reads_changes-${crypto.randomUUID()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'system',
        table: 'inbox_reads',
        filter: `user_id=eq.${INTERNAL_USER_ID}`,
      }, () => fetchReads())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const markAsRead = useCallback(async (itemId) => {
    if (!supabase) return
    await supabase
      .schema('system')
      .from('inbox_reads')
      .upsert({ inbox_item_id: itemId, user_id: INTERNAL_USER_ID }, { onConflict: 'inbox_item_id,user_id' })
    setReadSet(prev => new Set([...prev, itemId]))
  }, [])

  const markAsUnread = useCallback(async (itemId) => {
    if (!supabase) return
    await supabase
      .schema('system')
      .from('inbox_reads')
      .delete()
      .eq('inbox_item_id', itemId)
      .eq('user_id', INTERNAL_USER_ID)
    setReadSet(prev => { const s = new Set(prev); s.delete(itemId); return s })
  }, [])

  return { readSet, markAsRead, markAsUnread }
}
