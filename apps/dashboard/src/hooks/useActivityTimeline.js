// useActivityTimeline — timeline de actividade por record via RPC core.get_activity_timeline
// Consume a view materializada core.activity_unified (84 rows, pg_cron 1min refresh)
// Params: { recordType, recordId, since, limit }

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DEFAULT_SINCE_DAYS = 30
const DEFAULT_LIMIT = 50

export function useActivityTimeline({
  recordType = null,
  recordId   = null,
  sinceDays  = DEFAULT_SINCE_DAYS,
  limit      = DEFAULT_LIMIT,
} = {}) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase
        .schema('core')
        .rpc('get_activity_timeline', {
          p_record_id:   recordId,
          p_record_type: recordType,
          p_since:       since,
          p_limit:       limit,
        })

      if (rpcError) throw rpcError
      setEntries(data ?? [])
    } catch (e) {
      setError(e.message || 'Erro ao carregar actividade')
    } finally {
      setLoading(false)
    }
  }, [recordId, recordType, since, limit])

  useEffect(() => { fetch() }, [fetch])

  return { entries, loading, error, refresh: fetch }
}
