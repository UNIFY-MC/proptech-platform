// useInboxSources — carrega system.inbox_sources com fallback para seed local
// Se a tabela system.inbox_sources não existir ainda, usa o seed JSON estático.
// Toggle watch persiste em system.inbox_sources.watched (array de workspace_ids, simplificado
// para bool por workspace default enquanto multi-workspace não está implementado).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import SEED from '../data/inbox_sources_seed.json'

const WORKSPACE_ID = 'default'  // single-workspace phase

export function useInboxSources() {
  const [dbSources, setDbSources] = useState(null)   // null = ainda não tentou
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [searchQ, setSearchQ]     = useState('')
  const [category, setCategory]   = useState('all')

  // localWatched: fallback quando BD não disponível {id: bool}
  const [localWatched, setLocalWatched] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cc:inbox-sources-watched') || '{}') } catch { return {} }
  })

  const fetchFromDb = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .schema('system')
        .from('inbox_sources')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (err) {
        // Tabela pode não existir — usa seed com aviso silencioso
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          setDbSources(null)   // indica "usa seed"
        } else {
          setError(err.message)
        }
      } else {
        setDbSources(data || [])
      }
    } catch (e) {
      setDbSources(null)
    }
    setLoading(false)
  }, [])

  // Seed para BD se vazia (one-shot)
  const seedIfEmpty = useCallback(async (data) => {
    if (!supabase || data.length > 0) return
    try {
      await supabase.schema('system').from('inbox_sources').insert(
        SEED.map(s => ({
          id: s.id,
          name: s.name,
          url: s.url,
          category: s.category,
          language: s.language,
          fetch_method: s.fetch_method,
          refresh_hours: s.refresh_hours,
          watched: s.watch_default,
        }))
      )
      await fetchFromDb()
    } catch {
      // falha silenciosa — BD pode não ter a tabela ainda
    }
  }, [fetchFromDb])

  useEffect(() => {
    fetchFromDb()
  }, [fetchFromDb])

  useEffect(() => {
    if (Array.isArray(dbSources) && dbSources.length === 0) {
      seedIfEmpty(dbSources)
    }
  }, [dbSources, seedIfEmpty])

  // Sources resolvidas: BD se disponível, senão seed com watched local
  const rawSources = useMemo(() => {
    if (Array.isArray(dbSources) && dbSources.length > 0) return dbSources
    // Fallback: seed com estado local
    return SEED.map(s => ({
      ...s,
      watched: localWatched[s.id] !== undefined ? localWatched[s.id] : s.watch_default,
    }))
  }, [dbSources, localWatched])

  // Contagens por categoria
  const counts = useMemo(() => {
    const c = { all: rawSources.length }
    for (const s of rawSources) {
      c[s.category] = (c[s.category] || 0) + 1
    }
    return c
  }, [rawSources])

  // Sources filtradas por categoria + search
  const sources = useMemo(() => {
    let list = rawSources
    if (category !== 'all') list = list.filter(s => s.category === category)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [rawSources, category, searchQ])

  const watchedCount = rawSources.filter(s => s.watched).length

  // Toggle watch num source
  const toggleWatch = useCallback(async (id, currentVal) => {
    const next = !currentVal

    if (Array.isArray(dbSources)) {
      // Tenta persistir na BD
      if (supabase) {
        const { error: err } = await supabase
          .schema('system')
          .from('inbox_sources')
          .update({ watched: next })
          .eq('id', id)
        if (!err) {
          setDbSources(prev => prev.map(s => s.id === id ? { ...s, watched: next } : s))
          return
        }
      }
    }
    // Fallback: localStorage
    setLocalWatched(prev => {
      const next2 = { ...prev, [id]: next }
      localStorage.setItem('cc:inbox-sources-watched', JSON.stringify(next2))
      return next2
    })
  }, [dbSources])

  return {
    sources,
    counts,
    watchedCount,
    loading,
    error,
    searchQ,
    setSearchQ,
    category,
    setCategory,
    toggleWatch,
    refresh: fetchFromDb,
  }
}
