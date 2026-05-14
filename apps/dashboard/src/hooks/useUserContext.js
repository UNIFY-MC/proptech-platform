// useUserContext — greeting + stats reais para o header do Inbox
// Lê:
//   - core.pessoas (primeiro_nome) via current_pessoa_id RPC
//   - system.inbox_reads + system.inbox_items (unread count)
//   - core.agent_audit_log (missions complete últimas 24h)

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Default fallback para single-operator deployments (override via localStorage 'cc:user-name')
const DEFAULT_NAME = (() => {
  try { return localStorage.getItem('cc:user-name') || 'Mário' } catch { return 'Mário' }
})()

export function useUserContext() {
  const [primeiroNome, setPrimeiroNome] = useState(DEFAULT_NAME)
  const [stats, setStats] = useState({ unread: 0, missionsComplete: 0, loading: true })

  // 1. Fetch primeiro_nome do user logado (sobrepõe DEFAULT_NAME se houver)
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return  // Anon — mantém DEFAULT_NAME
        const { data: pessoaId } = await supabase.rpc('current_pessoa_id')
        if (!pessoaId) {
          const fromEmail = user.email?.split('@')[0]?.split('+')[0]
          if (!cancelled && fromEmail) setPrimeiroNome(fromEmail)
          return
        }
        const { data } = await supabase.schema('core').from('pessoas')
          .select('primeiro_nome').eq('id', pessoaId).maybeSingle()
        if (!cancelled && data?.primeiro_nome) setPrimeiroNome(data.primeiro_nome)
      } catch (e) {
        console.warn('[useUserContext] load failed', e)
      }
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
