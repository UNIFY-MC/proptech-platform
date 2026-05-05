import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useBiaStats() {
  const [stats, setStats] = useState({ inbox7d: null, approvalsPending: null, approvalRate: null, cost30d: 5 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    async function load() {
      setLoading(true)
      try {
        const now = new Date()
        const since7d  = new Date(now - 7  * 86400_000).toISOString()
        const since30d = new Date(now - 30 * 86400_000).toISOString()

        // Inbox last 7d — TODO: confirm vertical value matches seeded data ('v5' vs 'V5')
        const { count: inbox7d } = await supabase
          .schema('system')
          .from('inbox_items')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', since7d)

        // Approvals pending
        const { count: approvalsPending } = await supabase
          .schema('system')
          .from('approvals_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        // Approval rate last 30d
        const { data: decisions } = await supabase
          .schema('system')
          .from('approvals_queue')
          .select('status')
          .in('status', ['approved', 'edited_approved', 'dismissed'])
          .gte('created_at', since30d)

        const decided  = decisions?.length ?? 0
        const approved = decisions?.filter(d => d.status === 'approved' || d.status === 'edited_approved').length ?? 0
        const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : null

        setStats({ inbox7d, approvalsPending, approvalRate, cost30d: 5 })
      } catch (err) {
        console.error('[useBiaStats]', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { stats, loading }
}
