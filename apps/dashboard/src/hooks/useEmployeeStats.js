// useEmployeeStats — 4 KPIs CookAI-style para qualquer agentId
// KPI 1: Messages 7d   — count system.inbox_items WHERE assigned_agent_id = agentId (7d)
// KPI 2: Tokens 7d     — sum system.agent_runs.tokens_used (7d) se tabela existir
// KPI 3: Approval Rate — % approvals_queue items aprovados (30d)
// KPI 4: Tool Spend 30d— sum system.agent_runs.cost_usd (30d)
// Se dados inexistentes → valor null (UI mostra '--')

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useEmployeeStats(agentId) {
  const [stats, setStats]   = useState({
    messages7d:     null,
    tokens7d:        null,
    approvalRate:    null,
    toolSpend30d:    null,
    approvalsPending: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agentId || !supabase) { setLoading(false); return }
    let active = true

    async function load() {
      setLoading(true)
      try {
        const now         = new Date()
        const since7d     = new Date(now - 7 * 86400_000).toISOString()
        const since30d    = new Date(now - 30 * 86400_000).toISOString()

        // KPI 1 — Messages 7d: inbox_items assigned a este agente nos últimos 7 dias
        const { count: msg7d } = await supabase
          .schema('system')
          .from('inbox_items')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', agentId)
          .gte('created_at', since7d)

        // KPI 3 — Approval Rate (30d): approved / (approved + rejected)
        let approvalRate = null
        let approvalsPending = null
        try {
          const { data: appData } = await supabase
            .schema('system')
            .from('approvals_queue')
            .select('status')
            .eq('agent_id', agentId)
            .gte('created_at', since30d)

          if (appData) {
            const approved  = appData.filter(r => r.status === 'approved').length
            const rejected  = appData.filter(r => r.status === 'rejected').length
            const pending   = appData.filter(r => r.status === 'pending').length
            const total     = approved + rejected
            approvalRate    = total > 0 ? Math.round((approved / total) * 100) : null
            approvalsPending = pending
          }
        } catch (_) { /* tabela pode não existir ainda */ }

        // KPI 2 + 4 — Tokens 7d + Tool Spend 30d via agent_runs (se existir)
        let tokens7d     = null
        let toolSpend30d = null
        try {
          const { data: runs7d } = await supabase
            .schema('system')
            .from('agent_runs')
            .select('tokens_used')
            .eq('agent_id', agentId)
            .gte('created_at', since7d)

          const { data: runs30d } = await supabase
            .schema('system')
            .from('agent_runs')
            .select('cost_usd')
            .eq('agent_id', agentId)
            .gte('created_at', since30d)

          if (runs7d) {
            tokens7d = runs7d.reduce((s, r) => s + (r.tokens_used || 0), 0)
            if (tokens7d === 0) tokens7d = null
          }
          if (runs30d) {
            const raw = runs30d.reduce((s, r) => s + (r.cost_usd || 0), 0)
            toolSpend30d = raw > 0 ? raw.toFixed(2) : null
          }
        } catch (_) { /* agent_runs pode não existir */ }

        if (!active) return
        setStats({
          messages7d:     msg7d ?? null,
          tokens7d,
          approvalRate,
          toolSpend30d,
          approvalsPending,
        })
      } catch (err) {
        console.error('[useEmployeeStats]', agentId, err)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [agentId])

  return { stats, loading }
}
