// useRecord — detalhe de um record + summary via RPC core.get_record_summary
// Params: recordType, id
// Devolve: { record, summary, loading, error, refresh }

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useRecord(recordType, id) {
  const [record, setRecord]   = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!supabase || !id) { setLoading(false); return }
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase
        .schema('core')
        .rpc('get_record_summary', {
          p_record_type: recordType,
          p_record_id:   id,
        })

      if (rpcError) throw rpcError

      const result = Array.isArray(data) ? data[0] : data
      setRecord(result?.record ?? result)
      setSummary(result)
    } catch (e) {
      setError(e.message || 'Erro ao carregar registo')
    } finally {
      setLoading(false)
    }
  }, [recordType, id])

  useEffect(() => { fetch() }, [fetch])

  return { record, summary, loading, error, refresh: fetch }
}
