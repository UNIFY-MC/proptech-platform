// useRecords — lista paginada de records via RPC core.list_records
// Params: recordType, { search, filters, sort, limit, offset }
// Devolve: { records, total, loading, error, refresh }

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DEFAULT_LIMIT = 50

export function useRecords(recordType, {
  search  = '',
  filters = {},
  sort    = 'last_activity_desc',
  limit   = DEFAULT_LIMIT,
  offset  = 0,
} = {}) {
  const [records, setRecords]   = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase
        .schema('core')
        .rpc('list_records', {
          p_record_type: recordType,
          p_search:      search || null,
          p_filters:     filters,
          p_sort:        sort,
          p_limit:       limit,
          p_offset:      offset,
        })

      if (rpcError) throw rpcError

      // RPC devolve array de records — se contém total_count no primeiro elemento usamos
      if (Array.isArray(data) && data.length > 0 && data[0]?.total_count !== undefined) {
        setTotal(data[0].total_count)
        setRecords(data)
      } else {
        setRecords(data ?? [])
        setTotal(data?.length ?? 0)
      }
    } catch (e) {
      setError(e.message || 'Erro ao carregar registos')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [recordType, search, sort, limit, offset, JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  return { records, total, loading, error, refresh: fetch }
}
