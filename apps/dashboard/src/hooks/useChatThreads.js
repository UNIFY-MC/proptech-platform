// useChatThreads — lista threads de chat do agent activo
// Source: public.system_chat_threads (view com bucket today/yesterday/week/month/older)
// Sprint Q1.5

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useChatThreads(employeeId, { includeArchived = false } = {}) {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !employeeId) { setLoading(false); setThreads([]); return }
    setLoading(true)
    let q = supabase.from('system_chat_threads').select('*')
      .eq('employee_id', employeeId)
      .order('last_message_at', { ascending: false })
    if (!includeArchived) q = q.is('archived_at', null)
    const { data } = await q
    setThreads(data || [])
    setLoading(false)
  }, [employeeId, includeArchived])

  useEffect(() => { fetch() }, [fetch])

  const archive = useCallback(async (threadId) => {
    if (!supabase) return false
    const { error } = await supabase.schema('system').rpc('chat_thread_archive', { p_thread_id: threadId })
    if (error) return false
    await fetch()
    return true
  }, [fetch])

  // Agrupa por bucket
  const grouped = threads.reduce((acc, t) => {
    const b = t.bucket || 'older'
    if (!acc[b]) acc[b] = []
    acc[b].push(t)
    return acc
  }, {})

  return { threads, grouped, loading, refresh: fetch, archive }
}
