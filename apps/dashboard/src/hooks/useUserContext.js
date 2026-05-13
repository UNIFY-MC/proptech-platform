// useUserContext — greeting + stats reais para o header do Inbox
// Lê:
//   - core.pessoas (primeiro_nome) via current_pessoa_id RPC
//   - system.inbox_reads + system.inbox_items (unread count)
//   - core.agent_audit_log (missions complete últimas 24h)

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useUserContext() {
  const [primeiroNome, setPrimeiroNome] = useState(null)
  const [stats, setStats] = useState({ unread: 0, missionsComplete: 0, loading: true })

  // 1. Fetch primeiro_nome do user logado
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Anon — usa email default ou nada
        if (!cancelled) setPrimeiroNome(null)
        return
      }
      // current_pessoa_id RPC → core.pessoas
      const { data: pessoaId } = await supabase.rpc('current_pessoa_id')
      if (!pessoaId) {
        if (!cancelled) setPrimeiroNome(user.email?.split('@')[0]?.split('+')[0] ?? null)
        return
      }
      const { data } = await supabase.schema('core').from('pessoas')
        .select('primeiro_nome').eq('id', pessoaId).maybeSingle()
      if (!cancelled) setPrimeiroNome(data?.primeiro_nome ?? user.email?.split('@')[0] ?? null)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // 2. Stats — missions complete últimas 24h via agent_audit_log
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    async function loadStats() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase.schema('core').from('agent_audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('stop_reason', 'end_turn')
        .gte('created_at', since)
      if (!cancelled) {
        setStats(s => ({ ...s, missionsComplete: count ?? 0, loading: false }))
      }
    }
    loadStats()
    return () => { cancelled = true }
  }, [])

  return { primeiroNome, stats, setUnreadCount: (n) => setStats(s => ({ ...s, unread: n })) }
}
