// useCompetitorReports — lista latest report por concorrente + ability to trigger new
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

export function useCompetitorReports(vertical = null) {
  const [reports, setReports] = useState([])
  const [allReports, setAllReports] = useState([])  // history para selected
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    let q = supabase.from('competitor_reports_latest').select('*').order('generated_at', { ascending: false })
    if (vertical) q = q.eq('vertical', vertical)
    const { data } = await q
    setReports(data || [])
    setLoading(false)
  }, [vertical])

  useEffect(() => { fetch() }, [fetch])

  const fetchHistory = useCallback(async (competitorName) => {
    if (!supabase) return
    const { data } = await supabase.from('competitor_reports')
      .select('*').eq('competitor_name', competitorName)
      .order('generated_at', { ascending: false })
    setAllReports(data || [])
  }, [])

  const generate = useCallback(async ({ competitor_url, competitor_name, vertical: v, pages, source_id }) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/competitor-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ competitor_url, competitor_name, vertical: v, pages, source_id }),
    })
    const data = await res.json()
    await fetch()
    return data
  }, [fetch])

  return { reports, allReports, loading, generate, refresh: fetch, fetchHistory }
}
