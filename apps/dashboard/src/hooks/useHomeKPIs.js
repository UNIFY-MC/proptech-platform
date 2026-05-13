// useHomeKPIs — KPIs live para a página inicial do dashboard
// Faz count queries leves em core.*, growth.*, system.* (V1 Core Hub)
// Devolve estado: { kpis, loading, error }

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const EMPTY = {
  pessoas: null,
  subscricoesActivas: null,
  faturasPendentes: null,
  faturasPendentesEUR: null,
  leadsMes: null,
  oportunidadesPipelineEUR: null,
  approvalsPendentes: null,
  inboxUnread: null,
}

export function useHomeKPIs() {
  const [kpis, setKpis] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setError('Supabase client não inicializado')
      return
    }
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const [
          pessoasRes,
          subsRes,
          faturasRes,
          leadsRes,
          oportRes,
          approvalsRes,
        ] = await Promise.allSettled([
          supabase.schema('core').from('pessoas')
            .select('id', { count: 'exact', head: true }),
          supabase.schema('core').from('subscricoes')
            .select('id', { count: 'exact', head: true })
            .eq('estado', 'activa'),
          supabase.schema('core').from('faturas')
            .select('valor_total', { count: 'exact' })
            .in('estado', ['emitida', 'pendente', 'vencida']),
          supabase.schema('growth').from('leads')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', since30d),
          supabase.schema('growth').from('oportunidades')
            .select('valor_estimado, probabilidade')
            .in('estado', ['qualificado', 'proposta', 'negociacao']),
          supabase.schema('system').from('approvals_queue')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
        ])

        if (cancelled) return

        const next = { ...EMPTY }

        if (pessoasRes.status === 'fulfilled') next.pessoas = pessoasRes.value.count ?? 0

        if (subsRes.status === 'fulfilled') next.subscricoesActivas = subsRes.value.count ?? 0

        if (faturasRes.status === 'fulfilled') {
          next.faturasPendentes = faturasRes.value.count ?? 0
          next.faturasPendentesEUR = (faturasRes.value.data || [])
            .reduce((acc, f) => acc + Number(f.valor_total || 0), 0)
        }

        if (leadsRes.status === 'fulfilled') next.leadsMes = leadsRes.value.count ?? 0

        if (oportRes.status === 'fulfilled') {
          next.oportunidadesPipelineEUR = (oportRes.value.data || [])
            .reduce((acc, o) => acc + Number(o.valor_estimado || 0), 0)
        }

        if (approvalsRes.status === 'fulfilled') next.approvalsPendentes = approvalsRes.value.count ?? 0

        setKpis(next)
        setLastSync(new Date().toISOString())
      } catch (err) {
        if (!cancelled) setError(err.message || String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    const t = setInterval(fetchAll, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  return { kpis, loading, error, lastSync }
}
