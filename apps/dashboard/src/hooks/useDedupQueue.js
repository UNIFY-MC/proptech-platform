// useDedupQueue — lê core.dedup_candidates e fornece acções merge/distinct/skip
// Tenta subscrição Realtime se possível.

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const sb = supabase

/**
 * Devolve a lista de candidatos dedup com status 'pending'.
 * Inclui dados expandidos do primary e do duplicate record.
 */
export function useDedupQueue() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const channelRef = useRef(null)

  const loadWithRecords = useCallback(async () => {
    if (!sb) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data: raw, error: err } = await sb
        .schema('core')
        .from('dedup_candidates')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100)

      if (err) throw err
      if (!raw || raw.length === 0) {
        setCandidates([])
        setLoading(false)
        return
      }

      // Enrich com dados das pessoas
      const personIds = [
        ...new Set([
          ...raw.map(r => r.primary_id).filter(Boolean),
          ...raw.map(r => r.duplicate_id).filter(Boolean),
        ])
      ]

      let personMap = {}
      if (personIds.length > 0) {
        const { data: pessoas } = await sb
          .schema('core')
          .from('pessoas')
          .select('id, nome, email, telemovel, nif, morada, created_at')
          .in('id', personIds)

        if (pessoas) {
          personMap = Object.fromEntries(pessoas.map(p => [p.id, p]))
        }
      }

      const enriched = raw.map(c => ({
        ...c,
        primary_record:   personMap[c.primary_id]   ?? null,
        duplicate_record: personMap[c.duplicate_id] ?? null,
      }))

      setCandidates(enriched)
    } catch (e) {
      setError(e.message)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWithRecords()

    // Subscrição Realtime em core.dedup_candidates
    if (sb) {
      try {
        channelRef.current = sb
          .channel('dedup-candidates-changes')
          .on('postgres_changes',
            { event: '*', schema: 'core', table: 'dedup_candidates' },
            () => loadWithRecords()
          )
          .subscribe()
      } catch (_e) {
        // Realtime pode não estar disponível — funciona sem
      }
    }

    return () => {
      if (channelRef.current && sb) {
        sb.removeChannel(channelRef.current)
      }
    }
  }, [loadWithRecords])

  // Acção: fazer merge (marca merged)
  // TODO: quando RPC core.merge_pessoa existir, chamar em vez do UPDATE directo.
  const merge = useCallback(async (candidateId, _primaryId, _duplicateId) => {
    if (!sb) return { error: 'Supabase não iniciado' }
    const { data: authData } = await sb.auth.getUser()
    const userId = authData?.user?.id ?? null

    const { error: err } = await sb
      .schema('core')
      .from('dedup_candidates')
      .update({
        status: 'merged',
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
      })
      .eq('id', candidateId)

    if (err) return { error: err.message }
    setCandidates(prev => prev.filter(c => c.id !== candidateId))
    return { ok: true }
  }, [])

  // Acção: marcar como distintos (não é duplicado)
  const markDistinct = useCallback(async (candidateId) => {
    if (!sb) return { error: 'Supabase não iniciado' }
    const { data: authData } = await sb.auth.getUser()
    const userId = authData?.user?.id ?? null

    const { error: err } = await sb
      .schema('core')
      .from('dedup_candidates')
      .update({
        status: 'distinct',
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
      })
      .eq('id', candidateId)

    if (err) return { error: err.message }
    setCandidates(prev => prev.filter(c => c.id !== candidateId))
    return { ok: true }
  }, [])

  // Acção: skip (move para o fim da lista local, não altera BD)
  const skip = useCallback(async (candidateId) => {
    setCandidates(prev => {
      const idx = prev.findIndex(c => c.id === candidateId)
      if (idx < 0) return prev
      const item = prev[idx]
      const rest = prev.filter(c => c.id !== candidateId)
      return [...rest, item]
    })
    return { ok: true }
  }, [])

  return {
    candidates,
    loading,
    error,
    merge,
    markDistinct,
    skip,
    reload: loadWithRecords,
  }
}

/**
 * Devolve apenas o count de candidatos pending — usado na sidebar badge.
 */
export function useDedupCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!sb) return
    sb.schema('core')
      .from('dedup_candidates')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count: c }) => setCount(c ?? 0))
      .catch(() => setCount(0))
  }, [])

  return { count }
}
